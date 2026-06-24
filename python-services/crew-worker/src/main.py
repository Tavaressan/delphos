import os
import sys
import time
import json
import uuid
import pika

# Ensure python can locate local packages
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from runtime.crewai_adapter import CrewAiRuntimeAdapter


def get_rabbitmq_connection():
    host = os.environ.get("RABBITMQ_HOST", "rabbitmq")
    port = int(os.environ.get("RABBITMQ_PORT", 5672))
    user = os.environ.get("RABBITMQ_USER", "guest")
    password = os.environ.get("RABBITMQ_PASS", "guest")

    print(f"Connecting to RabbitMQ at {host}:{port} as user '{user}'...")

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
        print(f"Received job: {body.decode()}")
        job_data = json.loads(body.decode())
        execution_id = job_data.get("execution_id")
        tenant_id = job_data.get("tenant_id", "default-tenant")
        prompt = job_data.get("prompt_final", "Default prompt")
        agent_id = job_data.get("agent_id")

        if not execution_id:
            print("Missing execution_id in job payload, acknowledging and dropping")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Instantiate and execute via the CrewAI Adapter
        adapter = CrewAiRuntimeAdapter(ch, execution_id, tenant_id, prompt, agent_id=agent_id)
        adapter.execute()

        # Manual Acknowledge (ACK) to remove message from queue
        ch.basic_ack(delivery_tag=method.delivery_tag)
        print(
            f"Successfully processed and acknowledged job {execution_id} via CrewAI runtime"
        )

    except Exception as e:
        print(f"Error processing job: {str(e)}")
        # In case of failure, send negative acknowledgement (NACK) without requeue
        try:
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            print("Job negative acknowledged (NACK), sent to retry/dlq channel")
        except Exception as nack_ex:
            print(f"Failed to NACK message: {str(nack_ex)}")


def main():
    print("Python Crew Worker starting with CrewAI Runtime...")
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

            # Pre-fetch limit
            channel.basic_qos(prefetch_count=1)

            print("Listening to 'agent.execution.jobs' queue...")
            channel.basic_consume(
                queue="agent.execution.jobs", on_message_callback=process_job
            )

            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as conn_err:
            print(
                f"RabbitMQ connection failed: {str(conn_err)}. Retrying in 5 seconds..."
            )
            time.sleep(5)
        except KeyboardInterrupt:
            print("Shutting down worker...")
            break
        except Exception as ex:
            print(f"Unexpected error: {str(ex)}. Restarting consumer in 5 seconds...")
            time.sleep(5)


if __name__ == "__main__":
    main()
