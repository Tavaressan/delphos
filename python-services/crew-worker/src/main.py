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

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


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
