import json
import time
import uuid
from crewai.tools import BaseTool
from pydantic import Field


class DelegatedSearchTool(BaseTool):
    name: str = "search_knowledge_base"
    description: str = (
        "Busca especificações técnicas, manuais, limites operacionais e "
        "informações de conformidade sobre elevadores e escadas rolantes na base de dados de RAG."
    )

    channel: any = Field(None, exclude=True)
    execution_id: str = Field(None)
    tenant_id: str = Field(None)

    def __init__(self, channel, execution_id, tenant_id, **kwargs):
        super().__init__(**kwargs)
        self.channel = channel
        self.execution_id = execution_id
        self.tenant_id = tenant_id

    def _run(self, query: str) -> str:
        # Log de início da ferramenta no RabbitMQ (seção Auditoria)
        tool_call_id = str(uuid.uuid4())
        tool_start_payload = {
            "toolCallId": tool_call_id,
            "toolName": "search_knowledge_base",
            "inputPayload": {"query": query},
        }
        self._publish_event("ToolCallStarted", tool_start_payload)

        max_retries = 3
        backoff = 1.0
        response_data = None

        for attempt in range(1, max_retries + 1):
            try:
                # 1. Publicar a solicitação de delegação
                request_payload = {
                    "execution_id": self.execution_id,
                    "tenant_id": self.tenant_id,
                    "query": query,
                    "limit": 5,
                    "delegation_depth": 1,
                }

                print(
                    f"[DelegatedSearchTool] Publishing retrieval request for execution {self.execution_id} (Attempt {attempt})..."
                )
                self.channel.basic_publish(
                    exchange="agent.execution.exchange",
                    routing_key="agent.retrieval.delegated.requested",
                    properties=(
                        self.channel._connection.default_channel.connection.default_channel.BasicProperties(
                            correlation_id=self.execution_id,
                            reply_to="agent.retrieval.delegated.events",
                            content_type="application/json",
                        )
                        if hasattr(self.channel, "_connection")
                        else None
                    ),
                    body=json.dumps(request_payload),
                )

                # 2. Aguardar a resposta na fila de eventos
                start_time = time.time()
                timeout = 4.0
                attempt_response = None

                def on_response(ch, method, properties, body):
                    nonlocal attempt_response
                    try:
                        payload = json.loads(body.decode())
                        corr_id = getattr(
                            properties, "correlation_id", None
                        ) or payload.get("execution_id")
                        if corr_id == self.execution_id:
                            attempt_response = payload
                            ch.basic_ack(delivery_tag=method.delivery_tag)
                        else:
                            # Re-file para outros workers processarem
                            ch.basic_nack(
                                delivery_tag=method.delivery_tag, requeue=True
                            )
                    except Exception as ex:
                        print(f"[DelegatedSearchTool] Error in response callback: {ex}")

                consumer_tag = self.channel.basic_consume(
                    queue="agent.retrieval.delegated.events",
                    on_message_callback=on_response,
                    auto_ack=False,
                )

                try:
                    while (
                        attempt_response is None
                        and (time.time() - start_time) < timeout
                    ):
                        if hasattr(self.channel, "_connection") and hasattr(
                            self.channel._connection, "process_data_events"
                        ):
                            self.channel._connection.process_data_events(time_limit=0.1)
                        else:
                            # Fallback para execução de mock de teste
                            time.sleep(0.05)
                finally:
                    try:
                        self.channel.basic_cancel(consumer_tag)
                    except Exception:
                        pass

                if attempt_response is not None:
                    response_data = attempt_response
                    break

            except Exception as e:
                print(f"[DelegatedSearchTool] Attempt {attempt} error: {e}")

            if attempt < max_retries:
                time.sleep(backoff)
                backoff *= 2

        # 3. Fallback ou Processamento de Resultados
        if response_data is None or response_data.get("status") == "FAILED":
            response_payload = "Ocorreu uma instabilidade na busca de conhecimentos. Continuando a resposta de forma geral..."
            status_code = "FAILED"
            error_log = (
                response_data.get("error_message") if response_data else "Timeout"
            )
        else:
            results = response_data.get("results", [])
            if not results:
                response_payload = "Nenhum documento relevante encontrado na base de conhecimento para esta consulta."
            else:
                formatted_chunks = []
                for i, chunk in enumerate(results):
                    formatted_chunks.append(
                        f"Documento {i+1} (Score: {chunk.get('score', 0.0):.4f}):\n{chunk.get('text', '')}"
                    )
                response_payload = "\n\n".join(formatted_chunks)
            status_code = "COMPLETED"
            error_log = None

        # Log de conclusão da ferramenta no RabbitMQ (seção Auditoria)
        tool_finish_payload = {
            "toolCallId": tool_call_id,
            "status": status_code,
            "outputResponse": response_payload,
            "executionTimeMs": 1000,
            "errorLog": error_log,
        }
        self._publish_event("ToolCallFinished", tool_finish_payload)

        return response_payload

    def _publish_event(self, event_type: str, payload: dict):
        try:
            event_msg = {
                "eventType": event_type,
                "executionId": self.execution_id,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "payload": payload,
            }
            self.channel.basic_publish(
                exchange="agent.execution.exchange",
                routing_key="agent.execution.event",
                body=json.dumps(event_msg),
            )
        except Exception as e:
            print(f"[DelegatedSearchTool] Failed to publish event {event_type}: {e}")
