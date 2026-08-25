import contextvars
import logging
import os
import sys
import time
import json
import uuid
import pika

# Ensure python can locate local packages
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from runtime.crewai_adapter import CrewAiRuntimeAdapter
from crewai.events.event_context import StackDepthExceededError

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

# Issue #391: o event bus do CrewAI guarda a pilha de escopos de evento em
# `contextvars.ContextVar`s de módulo (crewai.events.event_context). Uma exceção
# não tratada no meio de uma execução deixa escopos órfãos empilhados; como
# process_job roda sempre na mesma thread/contexto (o loop de consumo do pika),
# esses órfãos se acumulam entre jobs até estourar o limite rígido (100) e
# derrubar permanentemente todas as execuções seguintes com StackDepthExceededError,
# mesmo após a causa raiz das falhas originais já ter sido corrigida.
#
# HEALTH_FILE e POISON_THRESHOLD abaixo são a rede de segurança (issue #391,
# caminho 2): um healthcheck/monitor externo pode ler HEALTH_FILE para saber se
# o worker está degradado; e o próprio processo se encerra deliberadamente após
# POISON_THRESHOLD falhas consecutivas por StackDepthExceededError, contando com
# `restart: on-failure` (docker-compose.yml) para recriar o container e zerar o
# estado. Isso não substitui o isolamento de contexto abaixo — é defesa em
# profundidade para o caso de o event bus vazar por outro caminho não coberto.
HEALTH_FILE = os.environ.get("CREW_WORKER_HEALTH_FILE", "/tmp/crew_worker_health.json")
POISON_THRESHOLD = int(os.environ.get("CREW_WORKER_POISON_THRESHOLD", "3"))

_consecutive_stack_errors = 0


def _write_health_status(consecutive_stack_errors: int) -> None:
    try:
        with open(HEALTH_FILE, "w") as f:
            json.dump(
                {
                    "ts": time.time(),
                    "consecutive_stack_errors": consecutive_stack_errors,
                },
                f,
            )
    except OSError:
        logger.warning(
            "Failed to write health status file %s", HEALTH_FILE, exc_info=True
        )


def get_rabbitmq_connection():
    host = os.environ.get("RABBITMQ_HOST", "rabbitmq")
    port = int(os.environ.get("RABBITMQ_PORT", 5672))
    user = os.environ.get("RABBITMQ_USER", "guest")
    password = os.environ.get("RABBITMQ_PASS", "guest")

    logger.info("Connecting to RabbitMQ at %s:%s as user '%s'...", host, port, user)

    credentials = pika.PlainCredentials(user, password)
    parameters = pika.ConnectionParameters(
        host=host,
        port=port,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300,
    )
    return pika.BlockingConnection(parameters)


def process_job(ch, method, properties, body):
    """Ponto de entrada do callback do pika: roda o job em um `contextvars.Context`
    novo (issue #391) para que qualquer escopo de evento órfão deixado pelo CrewAI
    em caso de falha morra junto com esse contexto, em vez de vazar para o contexto
    do processo compartilhado entre todos os jobs desta thread."""
    contextvars.copy_context().run(_process_job_impl, ch, method, properties, body)


def _process_job_impl(ch, method, properties, body):
    global _consecutive_stack_errors
    try:
        logger.info("Received job: %s", body.decode())
        job_data = json.loads(body.decode())
        execution_id = job_data.get("execution_id")
        tenant_id = job_data.get("tenant_id", "default-tenant")
        prompt = job_data.get("prompt_final", "Default prompt")
        agent_id = job_data.get("agent_id")
        manifest_config = job_data.get("manifest_config")

        if not execution_id:
            logger.warning(
                "Missing execution_id in job payload, acknowledging and dropping"
            )
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Instantiate and execute via the CrewAI Adapter
        adapter = CrewAiRuntimeAdapter(
            ch,
            execution_id,
            tenant_id,
            prompt,
            agent_id=agent_id,
            manifest_config=manifest_config,
        )
        adapter.execute()

        # Manual Acknowledge (ACK) to remove message from queue
        ch.basic_ack(delivery_tag=method.delivery_tag)
        logger.info(
            "Successfully processed and acknowledged job %s via CrewAI runtime",
            execution_id,
        )
        _consecutive_stack_errors = 0
        _write_health_status(0)

    except Exception as e:
        # logger.exception preserva o stacktrace completo (exc_info), ao
        # contrário do print() anterior que descartava o traceback.
        logger.exception("Error processing job: %s", str(e))
        # In case of failure, send negative acknowledgement (NACK) without requeue
        try:
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            logger.warning(
                "Job negative acknowledged (NACK), sent to retry/dlq channel"
            )
        except Exception as nack_ex:
            logger.error("Failed to NACK message: %s", str(nack_ex))

        if isinstance(e, StackDepthExceededError):
            _consecutive_stack_errors += 1
            logger.error(
                "StackDepthExceededError consecutivo #%d (issue #391): o event bus "
                "do CrewAI pode estar com escopos órfãos acumulados.",
                _consecutive_stack_errors,
            )
        else:
            _consecutive_stack_errors = 0
        _write_health_status(_consecutive_stack_errors)

        if _consecutive_stack_errors >= POISON_THRESHOLD:
            logger.critical(
                "Limite de %d StackDepthExceededError consecutivos atingido — "
                "encerrando o processo para o Docker recriar o container "
                "(restart: on-failure) e zerar o event bus do CrewAI (issue #391).",
                POISON_THRESHOLD,
            )
            # os._exit em vez de sys.exit: encerramento imediato do processo,
            # sem depender de a SystemExit se propagar corretamente através do
            # loop de eventos do pika (BlockingConnection não é projetado para
            # ser interrompido a partir do callback de mensagem).
            os._exit(1)


def main():
    logger.info("Python Crew Worker starting with CrewAI Runtime...")
    while True:
        try:
            connection = get_rabbitmq_connection()
            channel = connection.channel()

            # Ensure exchange and queue are declared
            channel.exchange_declare(
                exchange="agent.execution.exchange",
                exchange_type="direct",
                durable=True,
            )
            channel.queue_declare(queue="agent.retrieval.delegated.jobs", durable=True)
            channel.queue_declare(
                queue="agent.retrieval.delegated.events", durable=True
            )
            channel.queue_bind(
                queue="agent.retrieval.delegated.jobs",
                exchange="agent.execution.exchange",
                routing_key="agent.retrieval.delegated.requested",
            )
            channel.queue_bind(
                queue="agent.retrieval.delegated.events",
                exchange="agent.execution.exchange",
                routing_key="agent.retrieval.delegated.finished",
            )

            # Pre-fetch limit
            channel.basic_qos(prefetch_count=1)

            logger.info("Listening to 'agent.execution.jobs' queue...")
            channel.basic_consume(
                queue="agent.execution.jobs", on_message_callback=process_job
            )

            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as conn_err:
            logger.error(
                "RabbitMQ connection failed: %s. Retrying in 5 seconds...",
                str(conn_err),
            )
            time.sleep(5)
        except KeyboardInterrupt:
            logger.info("Shutting down worker...")
            break
        except Exception as ex:
            logger.exception(
                "Unexpected error: %s. Restarting consumer in 5 seconds...", str(ex)
            )
            time.sleep(5)


if __name__ == "__main__":
    main()
