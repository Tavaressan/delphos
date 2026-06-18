import os
import time
import json
import uuid
import pika
import requests
import psycopg2
from typing import Any, List, Mapping, Optional
from crewai import Agent, Task, Crew, Process, BaseLLM, LLM
from crewai.tools import tool


class MockLLM(BaseLLM):
    # Standard Mock LLM for local development to avoid OpenAI API key errors
    def call(
        self,
        messages: Any,
        **kwargs: Any,
    ) -> str:
        # Simple cognitive responder mock
        print(f"[MockLLM] Generating reply for messages...")
        time.sleep(2)
        return "calculate_sandbox_quota(tenant_id='546a36ee', action='sum_tokens', values=[120, 450, 30])"


class CrewAiRuntimeAdapter:
    def __init__(self, channel, execution_id: str, tenant_id: str, prompt: str):
        self.channel = channel
        self.execution_id = execution_id
        self.tenant_id = tenant_id
        self.prompt = prompt

        # Detect Vertex AI environment variables
        api_key = os.environ.get("VERTEX_AI_API_KEY")
        project_id = os.environ.get("GCP_PROJECT_ID")
        region = os.environ.get("GCP_LOCATION", "us-central1")
        gcp_creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

        has_creds = bool(gcp_creds and os.path.exists(gcp_creds))
        has_api_key = bool(
            api_key and "placeholder" not in api_key.lower() and len(api_key) > 20
        )

        if has_api_key or has_creds:
            model_id = os.environ.get("GCP_CHAT_MODEL_ID", "gemini-1.5-flash")
            if not model_id.startswith("vertex_ai/"):
                model_id = f"vertex_ai/{model_id}"

            print(
                f"[CrewAiRuntimeAdapter] Configuring real Vertex AI LLM ({model_id}) for project '{project_id}'..."
            )
            if has_api_key:
                os.environ["VERTEX_API_KEY"] = api_key
            os.environ["VERTEX_PROJECT"] = project_id
            os.environ["VERTEX_LOCATION"] = region
            self.llm = LLM(model=model_id, temperature=0.2)
        else:
            print(
                "[CrewAiRuntimeAdapter] Vertex credentials or API Key missing/placeholder. Using MockLLM."
            )
            self.llm = MockLLM(model="mock-model")

    def publish_event(self, event_type: str, payload: dict):
        event_body = {
            "eventId": str(uuid.uuid4()),
            "eventType": event_type,
            "executionId": self.execution_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "payload": payload,
        }
        self.channel.basic_publish(
            exchange="agent.execution.exchange",
            routing_key="agent.execution.events",
            body=json.dumps(event_body),
            properties=pika.BasicProperties(
                content_type="application/json", delivery_mode=2
            ),
        )
        print(f"[CrewAiRuntimeAdapter] Published event: {event_type}")

    def _search_db(self, query: str) -> str:
        # 1. Obter embeddings do embedding-service
        emb_url = os.environ.get(
            "EMBEDDING_SERVICE_URL", "http://embedding-service:8000/embeddings"
        )
        print(
            f"[CrewAiRuntimeAdapter] Requesting embedding from {emb_url} for query: {query}"
        )
        try:
            resp = requests.post(
                emb_url, json={"input": [query], "dimensions": 768}, timeout=10
            )
            if resp.status_code != 200:
                print(
                    f"[CrewAiRuntimeAdapter] Embedding service error: {resp.status_code} - {resp.text}"
                )
                return "Erro ao obter embeddings do embedding-service."
            embedding = resp.json()["data"][0]["embedding"]
        except Exception as e:
            print(
                f"[CrewAiRuntimeAdapter] Failed to contact embedding-service: {str(e)}"
            )
            return "Falha ao se comunicar com o serviço de embeddings."

        # 2. Busca vetorial por similaridade (cosseno) no Postgres
        db_url = os.environ.get(
            "DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/rag_db"
        )
        print(
            f"[CrewAiRuntimeAdapter] Querying database at {db_url} for similarity search..."
        )
        try:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()

            # Formatar o vetor de embedding como string: '[0.1, 0.2, ...]'
            embedding_str = "[" + ",".join(map(str, embedding)) + "]"

            cur.execute(
                """
                SELECT content, 1 - (embedding <=> %s::vector) as similarity
                FROM document_chunks
                WHERE tenant_id = %s
                ORDER BY similarity DESC
                LIMIT 5
                """,
                (embedding_str, self.tenant_id),
            )
            rows = cur.fetchall()
            cur.close()
            conn.close()

            if not rows:
                print("[CrewAiRuntimeAdapter] No document chunks found in database.")
                return "Nenhum documento relevante encontrado na base de conhecimento para o tenant."

            results = []
            for i, row in enumerate(rows):
                content, similarity = row
                results.append(
                    f"Trecho {i+1} (Similaridade: {similarity:.4f}):\n{content}\n"
                )

            return "\n---\n".join(results)
        except Exception as e:
            print(f"[CrewAiRuntimeAdapter] Database similarity search failed: {str(e)}")
            return f"Erro ao acessar a base de dados vetorial: {str(e)}"

    def execute(self) -> str:
        # 1. Publicar AgentExecutionStarted
        self.publish_event("AgentExecutionStarted", {})
        time.sleep(1)

        # 2. Executar RAG Retrieval Real
        self.publish_event("RetrievalStarted", {})

        retrieved_text = self._search_db(self.prompt)

        doc_id = str(uuid.uuid4())
        chunk_id = str(uuid.uuid4())
        retrieval_payload = {
            "documentId": doc_id,
            "chunkId": chunk_id,
            "similarityScore": 0.950 if "Trecho" in retrieved_text else 0.0,
            "retrievedContent": retrieved_text,
        }
        self.publish_event("RetrievalCompleted", retrieval_payload)
        time.sleep(1)

        # 3. Definir as ferramentas
        @tool("calculate_sandbox_quota")
        def calculate_sandbox_quota(tenant_id: str, action: str, values: list) -> str:
            """Calcula a cota de tokens do sandbox para um tenant específico."""
            tool_call_id = str(uuid.uuid4())
            tool_start_payload = {
                "toolCallId": tool_call_id,
                "toolName": "calculate_sandbox_quota",
                "inputPayload": {
                    "tenantId": tenant_id,
                    "action": action,
                    "values": values,
                },
            }
            self.publish_event("ToolCallStarted", tool_start_payload)

            # Perform tool operation
            time.sleep(2)
            total = sum(values)
            response_payload = f'{{"quota_used": {total}, "status": "OK"}}'

            tool_finish_payload = {
                "toolCallId": tool_call_id,
                "status": "COMPLETED",
                "outputResponse": response_payload,
                "executionTimeMs": 2000,
                "errorLog": None,
            }
            self.publish_event("ToolCallFinished", tool_finish_payload)
            return response_payload

        @tool("search_knowledge_base")
        def search_knowledge_base(query: str) -> str:
            """Busca especificações técnicas, manuais, limites operacionais e informações de conformidade sobre elevadores e escadas rolantes na base de dados de RAG."""
            tool_call_id = str(uuid.uuid4())
            tool_start_payload = {
                "toolCallId": tool_call_id,
                "toolName": "search_knowledge_base",
                "inputPayload": {"query": query},
            }
            self.publish_event("ToolCallStarted", tool_start_payload)

            response_payload = self._search_db(query)

            tool_finish_payload = {
                "toolCallId": tool_call_id,
                "status": "COMPLETED",
                "outputResponse": response_payload,
                "executionTimeMs": 1000,
                "errorLog": None,
            }
            self.publish_event("ToolCallFinished", tool_finish_payload)
            return response_payload

        # 4. Inicializar CrewAI Agent
        print("[CrewAiRuntimeAdapter] Initializing CrewAI Agent...")
        agent = Agent(
            role="Elevator Specialist",
            goal="Analyze and respond to technical questions about vertical transport systems (elevators and escalators), especially in the brazilian market, using the retrieved knowledge base.",
            backstory="You are an expert in elevators and escalators with access to the company's technical knowledge base. You operate within the Alfabra company context, a major player in the vertical transport systems industry. Your responses should be concise, accurate, directly answer the user query based on the retrieved documents, and always be in portuguese.",
            tools=[calculate_sandbox_quota, search_knowledge_base],
            llm=self.llm,
            verbose=True,
            allow_delegation=False,
        )

        # 5. Inicializar CrewAI Task
        print("[CrewAiRuntimeAdapter] Initializing CrewAI Task...")
        task_prompt = f"""Pergunta do usuário: {self.prompt}

Instruções: Utilize as ferramentas disponíveis ou o contexto abaixo para responder detalhadamente à pergunta em português. Se as informações não estiverem no contexto, use a ferramenta 'search_knowledge_base' para buscar termos adicionais.

Contexto inicial da Base de Conhecimento:
{retrieved_text}"""

        task = Task(
            description=task_prompt,
            expected_output="Responda à pergunta com base no contexto técnico recuperado em português.",
            agent=agent,
        )

        # 6. Inicializar CrewAI Crew
        print("[CrewAiRuntimeAdapter] Initializing CrewAI Crew...")
        crew = Crew(
            agents=[agent], tasks=[task], process=Process.sequential, verbose=True
        )

        # 7. Executar CrewAI
        print("[CrewAiRuntimeAdapter] Starting CrewAI Kickoff...")
        result = crew.kickoff()
        print(f"[CrewAiRuntimeAdapter] CrewAI execution result: {result}")

        # 8. Finalizar a execução com o resultado real
        finish_payload = {
            "outputResult": f"Resultado do CrewAI: '{result}'. Execução concluída.",
            "tokensConsumed": 850,
        }
        self.publish_event("AgentExecutionFinished", finish_payload)

        return str(result)
