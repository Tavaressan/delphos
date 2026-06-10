import os
import time
import json
import uuid
import pika
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
        
        if api_key and "placeholder" not in api_key.lower() and len(api_key) > 20:
            print(f"[CrewAiRuntimeAdapter] Configuring real Vertex AI LLM (Gemini 1.5 Flash) for project '{project_id}'...")
            os.environ["VERTEX_API_KEY"] = api_key
            os.environ["VERTEX_PROJECT"] = project_id
            os.environ["VERTEX_LOCATION"] = region
            self.llm = LLM(
                model="vertex_ai/gemini-1.5-flash-002",
                temperature=0.2
            )
        else:
            print("[CrewAiRuntimeAdapter] Vertex API Key missing or placeholder. Using MockLLM.")
            self.llm = MockLLM(model="mock-model")

    def publish_event(self, event_type: str, payload: dict):
        event_body = {
            "eventId": str(uuid.uuid4()),
            "eventType": event_type,
            "executionId": self.execution_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "payload": payload
        }
        self.channel.basic_publish(
            exchange="agent.execution.exchange",
            routing_key="agent.execution.events",
            body=json.dumps(event_body),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2
            )
        )
        print(f"[CrewAiRuntimeAdapter] Published event: {event_type}")

    def execute(self) -> str:
        # 1. Publish AgentExecutionStarted
        self.publish_event("AgentExecutionStarted", {})
        time.sleep(1)

        # 2. Simulate RAG Retrieval (Pre-kickoff step or inside agent workflow)
        self.publish_event("RetrievalStarted", {})
        time.sleep(1.5)
        
        doc_id = str(uuid.uuid4())
        chunk_id = str(uuid.uuid4())
        retrieval_payload = {
            "documentId": doc_id,
            "chunkId": chunk_id,
            "similarityScore": 0.895,
            "retrievedContent": "Este é um trecho de especificação de segurança corporativa contendo regras de RBAC baseadas em JWT."
        }
        self.publish_event("RetrievalCompleted", retrieval_payload)
        time.sleep(1)

        # 3. Define the tool
        # We define a function inside, capturing the local reference to publish events during tool execution!
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
                    "values": values
                }
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
                "errorLog": None
            }
            self.publish_event("ToolCallFinished", tool_finish_payload)
            return response_payload

        # 4. Initialize CrewAI Agent
        print("[CrewAiRuntimeAdapter] Initializing CrewAI Agent...")
        agent = Agent(
            role="Audit Specialist",
            goal="Analyze security audits and verify sandbox quotas",
            backstory="Você é um especialista em conformidade e segurança com acesso a ferramentas de sandbox.",
            tools=[calculate_sandbox_quota],
            llm=self.llm,
            verbose=True,
            allow_delegation=False
        )

        # 5. Initialize CrewAI Task
        print("[CrewAiRuntimeAdapter] Initializing CrewAI Task...")
        task = Task(
            description=self.prompt,
            expected_output="Auditoria de segurança e cota de tokens validada com status OK.",
            agent=agent
        )

        # 6. Initialize CrewAI Crew
        print("[CrewAiRuntimeAdapter] Initializing CrewAI Crew...")
        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
            verbose=True
        )

        # 7. Kickoff the CrewAI execution
        print("[CrewAiRuntimeAdapter] Starting CrewAI Kickoff...")
        result = crew.kickoff()
        print(f"[CrewAiRuntimeAdapter] CrewAI execution result: {result}")

        # 8. Finish Agent Execution with completed outcome
        finish_payload = {
            "outputResult": f"Resultado do CrewAI: '{result}'. Execução concluída.",
            "tokensConsumed": 850
        }
        self.publish_event("AgentExecutionFinished", finish_payload)
        
        return str(result)
