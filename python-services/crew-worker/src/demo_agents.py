"""
Demo dos 4 agentes mockados (compliance, piso, catálogo, orquestrador).

O que este script faz:
  1. Garante que os 4 agentes mockados existem e estão publicados,
     reaproveitando `seed_mock_agents.ensure_agents` (idempotente — pode ser
     executado repetidamente sem criar agentes duplicados).
  2. Envia, para cada um dos 4 agentes, uma pergunta de exemplo condizente
     com o conteúdo mockado do agente (ver EXAMPLE_QUESTIONS abaixo) através
     da mesma API de chat/execução usada pelo frontend:
         POST /api/executions {"prompt": ..., "tenantId": ..., "agentId": ...}
         -> {"executionId": ...}
         GET  /api/executions/{executionId}  (poll até status == COMPLETED)
         -> {"output": ...}
  3. Imprime pergunta e resposta de cada agente em formato legível, servindo
     como roteiro de demonstração da plataforma sem precisar usar
     curl/Postman manualmente.

Pré-requisitos:
  - Stack local rodando via docker compose (ver scripts/setup.sh ou
    scripts/dev.sh na raiz do repositório). O java-core deve estar acessível
    em --base-url (padrão http://localhost:8080).
  - Para obter respostas determinísticas sem precisar de credenciais reais
    do Vertex AI, configure o crew-worker com CREW_WORKER_MODE=mock (ver
    docker-compose.yml / .env.example). O script NÃO assume o modo mock:
    ele só consome a API pública de execução, então também funciona, sem
    nenhuma alteração, contra uma stack configurada com credenciais reais
    do Vertex AI/Gemini — nesse caso as respostas deixam de ser mockadas.

Uso:
    cd python-services/crew-worker
    python src/demo_agents.py [--base-url http://localhost:8080] \\
        [--tenant-id <uuid>] [--timeout <segundos>]

Ou, a partir da raiz do repo:
    ./scripts/demo-agents.sh
"""

import argparse
import sys
import time

import requests

import seed_mock_agents as seed

# Perguntas de exemplo por agente, escolhidas para exercitar conteúdo
# realmente presente nos arquivos mockados de cada agente:
#   - compliance: item explícito da NR-18 (velocidade máxima em obras).
#   - piso: usa a tabela de dimensões do ALF-C8 (catálogo) para exercitar a
#     calculate_floor_specs tool descrita em floor_calculator.py.
#   - catalogo: especificações e preço do ALF-C13 (catálogo).
#   - orquestrador: pergunta sobre compliance, para validar que o
#     orquestrador delega corretamente ao especialista certo
#     (route_to_agent -> "Agente de Compliance de Elevadores").
EXAMPLE_QUESTIONS = {
    "compliance": (
        "Qual é a velocidade máxima de operação permitida para elevadores "
        "de carga em obras, segundo a NR-18?"
    ),
    "piso": (
        "Preciso do piso para um elevador comercial modelo ALF-C8, com "
        "carga nominal de 630 kg e cabine de 1100 x 1400 mm. Qual material, "
        "espessura mínima e resistência à compressão devo usar?"
    ),
    "catalogo": (
        "Quais são as especificações técnicas e o preço de referência do "
        "elevador ALF-C13?"
    ),
    "orquestrador": (
        "Qual é a carga nominal mínima exigida pela ABNT NBR 7192 para "
        "elevadores de passageiros?"
    ),
}


def submit_execution(base_url: str, prompt: str, tenant_id: str, agent_id: str) -> str:
    """Cria uma execução de chat e retorna o executionId."""
    resp = requests.post(
        f"{base_url}/api/executions",
        json={"prompt": prompt, "tenantId": tenant_id, "agentId": agent_id},
        timeout=30,
    )
    resp.raise_for_status()
    payload = resp.json()
    execution_id = payload.get("executionId")
    if not execution_id:
        raise RuntimeError(f"Resposta de /api/executions sem executionId: {payload}")
    return execution_id


def poll_execution(base_url: str, execution_id: str, timeout_s: float, interval_s: float = 2.0) -> dict:
    """Faz polling em GET /api/executions/{id} até status terminal ou timeout."""
    deadline = time.monotonic() + timeout_s
    last_payload = {}
    while time.monotonic() < deadline:
        resp = requests.get(f"{base_url}/api/executions/{execution_id}", timeout=10)
        resp.raise_for_status()
        last_payload = resp.json()
        status = last_payload.get("status")

        if status == "COMPLETED":
            return last_payload
        if status in ("FAILED", "TIMEOUT"):
            raise RuntimeError(
                f"Execução {execution_id} terminou com status {status}: "
                f"{last_payload.get('errorMessage')}"
            )

        time.sleep(interval_s)

    raise TimeoutError(
        f"Execução {execution_id} não completou em {timeout_s}s "
        f"(último status observado: {last_payload.get('status')})"
    )


def ask_agent(base_url: str, tenant_id: str, agent_id: str, question: str, timeout_s: float) -> str:
    execution_id = submit_execution(base_url, question, tenant_id, agent_id)
    result = poll_execution(base_url, execution_id, timeout_s=timeout_s)
    return result.get("output") or "(sem conteúdo na resposta)"


def run_demo(base_url: str, tenant_id: str, timeout_s: float) -> list:
    print("=" * 70)
    print("Passo 1/2 - Garantindo que os 4 agentes mockados existem e estão publicados")
    print("=" * 70)
    agent_ids = seed.ensure_agents(base_url, tenant_id)

    print("\n" + "=" * 70)
    print("Passo 2/2 - Enviando perguntas de exemplo para cada agente")
    print("=" * 70)

    results = []
    for agent_def in seed.AGENTS:
        tag = agent_def["tag"]
        name = agent_def["name"]
        agent_id = agent_ids.get(tag)
        question = EXAMPLE_QUESTIONS[tag]

        print(f"\n--- {name} (tag={tag}) ---")
        print(f"Pergunta: {question}")

        if not agent_id:
            answer = "[ERRO] não foi possível resolver o ID do agente; pulando pergunta."
            print(answer)
            results.append({"tag": tag, "name": name, "question": question, "answer": answer})
            continue

        try:
            answer = ask_agent(base_url, tenant_id, agent_id, question, timeout_s)
        except Exception as e:  # noqa: BLE001 - queremos seguir para os próximos agentes
            answer = f"[ERRO ao consultar o agente: {e}]"

        print(f"Resposta: {answer}")
        results.append({"tag": tag, "name": name, "question": question, "answer": answer})

    print("\n" + "=" * 70)
    print("Demo concluída.")
    print("=" * 70)
    return results


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--base-url", default="http://localhost:8080", help="URL base do java-core.")
    parser.add_argument(
        "--tenant-id",
        default="00000000-0000-0000-0000-000000000000",
        help="Tenant usado para criar/consultar os agentes e enviar as perguntas.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=60.0,
        help="Timeout (segundos) de polling por execução aguardando status COMPLETED.",
    )
    args = parser.parse_args()

    try:
        run_demo(args.base_url, args.tenant_id, args.timeout)
    except requests.exceptions.ConnectionError as e:
        print(f"\nERRO: não foi possível conectar em {args.base_url}. A stack está no ar? ({e})", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
