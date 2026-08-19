"""Docker HEALTHCHECK do crew-worker (issue #391).

Lê o arquivo de status escrito por main.py a cada job processado e reporta unhealthy
quando o worker acumulou falhas consecutivas por StackDepthExceededError — sintoma do
event bus do CrewAI envenenado (pilha de escopos de evento saturada, ver
crewai.events.event_context). Isso não substitui o isolamento de contexto por job em
main.py (a correção de fundo); é defesa em profundidade e visibilidade operacional
(`docker compose ps` mostra o container como unhealthy) para qualquer vazamento não
coberto por ele. A recuperação de fato acontece via main.py::_process_job_impl, que se
encerra sozinho (os._exit) ao atingir o mesmo limiar, contando com `restart: on-failure`
para recriar o container — plain `docker compose`/`docker run` não recria containers
apenas por estarem unhealthy.

Ausência do arquivo de status (worker recém-iniciado, nenhum job processado ainda) é
tratada como saudável.
"""

import json
import os
import sys

HEALTH_FILE = os.environ.get("CREW_WORKER_HEALTH_FILE", "/tmp/crew_worker_health.json")
POISON_THRESHOLD = int(os.environ.get("CREW_WORKER_POISON_THRESHOLD", "3"))


def main() -> int:
    try:
        with open(HEALTH_FILE) as f:
            status = json.load(f)
    except FileNotFoundError:
        return 0
    except (OSError, json.JSONDecodeError) as e:
        print(f"[healthcheck] Failed to read {HEALTH_FILE}: {e}", file=sys.stderr)
        return 0

    consecutive = status.get("consecutive_stack_errors", 0)
    if consecutive >= POISON_THRESHOLD:
        print(
            f"[healthcheck] unhealthy: {consecutive} StackDepthExceededError "
            f"consecutivos (limiar {POISON_THRESHOLD}) — issue #391",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
