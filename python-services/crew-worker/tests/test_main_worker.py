import json
from unittest.mock import MagicMock, patch

import main


def _make_method(delivery_tag=1):
    method = MagicMock()
    method.delivery_tag = delivery_tag
    return method


def _job_body(agent_id="agent-does-not-exist"):
    return json.dumps(
        {
            "execution_id": "exec-1",
            "tenant_id": "tenant-1",
            "prompt_final": "Oi",
            "agent_id": agent_id,
        }
    ).encode()


def test_process_job_with_nonexistent_agent_id_nacks_without_crashing(capsys):
    """Issue #124: defesa em profundidade no crew-worker.

    Mesmo que um agent_id inexistente chegue até a fila (por exemplo, uma
    mensagem antiga publicada antes da correção da issue #100, ou qualquer
    outro produtor que não valide o agentId), o worker não deve travar o
    processo consumidor nem vazar um stack trace cru: deve capturar o erro,
    logar uma mensagem clara e enviar NACK (sem reenfileirar) para a
    mensagem, mantendo o consumo da fila saudável para a próxima mensagem.
    """
    ch = MagicMock()
    method = _make_method(delivery_tag=42)
    body = _job_body(agent_id="agent-does-not-exist")

    with patch("main.CrewAiRuntimeAdapter") as MockAdapter:
        # Reproduz o comportamento real de CrewAiRuntimeAdapter quando o
        # agent_id não existe na tabela `agents` (ValueError levantado no
        # __init__, ver runtime/crewai_adapter.py::_load_agent_config).
        MockAdapter.side_effect = ValueError("Agent 'agent-does-not-exist' not found")

        # Não deve propagar a exceção para fora de process_job.
        main.process_job(ch, method, None, body)

    ch.basic_nack.assert_called_once_with(delivery_tag=42, requeue=False)
    ch.basic_ack.assert_not_called()

    captured = capsys.readouterr()
    assert "Traceback" not in captured.out
    assert "not found" in captured.out


def test_process_job_with_valid_agent_id_executes_and_acks():
    ch = MagicMock()
    method = _make_method(delivery_tag=7)
    body = _job_body(agent_id="agent-real")

    with patch("main.CrewAiRuntimeAdapter") as MockAdapter:
        instance = MockAdapter.return_value
        instance.execute.return_value = "ok"

        main.process_job(ch, method, None, body)

    instance.execute.assert_called_once()
    ch.basic_ack.assert_called_once_with(delivery_tag=7)
    ch.basic_nack.assert_not_called()
