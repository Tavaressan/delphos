import json
import logging
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


def test_process_job_with_nonexistent_agent_id_nacks_without_crashing(caplog):
    """Issue #124: defesa em profundidade no crew-worker.

    Mesmo que um agent_id inexistente chegue até a fila (por exemplo, uma
    mensagem antiga publicada antes da correção da issue #100, ou qualquer
    outro produtor que não valide o agentId), o worker não deve travar o
    processo consumidor: deve capturar o erro, logar com nível ERROR
    preservando o stacktrace (Issue #244) e enviar NACK (sem reenfileirar)
    para a mensagem, mantendo o consumo da fila saudável para a próxima
    mensagem.
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
        with caplog.at_level(logging.ERROR, logger="main"):
            main.process_job(ch, method, None, body)

    ch.basic_nack.assert_called_once_with(delivery_tag=42, requeue=False)
    ch.basic_ack.assert_not_called()

    error_records = [r for r in caplog.records if r.levelno == logging.ERROR]
    assert error_records, "esperava um log de nível ERROR em process_job"
    assert "not found" in error_records[0].getMessage()
    # exc_info preservado: o stacktrace continua disponível para diagnóstico,
    # diferente do print() anterior que descartava a exceção.
    assert error_records[0].exc_info is not None


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
