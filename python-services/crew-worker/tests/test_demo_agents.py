import pytest
from unittest.mock import MagicMock, patch

import demo_agents


def _mock_response(json_data, status_code=200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        resp.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    return resp


def test_submit_execution_posts_prompt_tenant_and_agent_id():
    with patch("demo_agents.requests") as mock_requests:
        mock_requests.post.return_value = _mock_response({"executionId": "exec-1"})

        execution_id = demo_agents.submit_execution(
            "http://localhost:8080", "Qual a carga máxima?", "tenant-1", "agent-1"
        )

    assert execution_id == "exec-1"
    args, kwargs = mock_requests.post.call_args
    assert args[0] == "http://localhost:8080/api/executions"
    assert kwargs["json"] == {
        "prompt": "Qual a carga máxima?",
        "tenantId": "tenant-1",
        "agentId": "agent-1",
    }


def test_submit_execution_raises_when_execution_id_missing():
    with patch("demo_agents.requests") as mock_requests:
        mock_requests.post.return_value = _mock_response({"status": "QUEUED"})

        with pytest.raises(RuntimeError):
            demo_agents.submit_execution("http://localhost:8080", "prompt", "tenant-1", "agent-1")


def test_poll_execution_returns_payload_on_completed():
    with patch("demo_agents.requests") as mock_requests:
        mock_requests.get.return_value = _mock_response(
            {"status": "COMPLETED", "output": "resposta final"}
        )

        result = demo_agents.poll_execution("http://localhost:8080", "exec-1", timeout_s=5, interval_s=0)

    assert result["output"] == "resposta final"
    mock_requests.get.assert_called_with("http://localhost:8080/api/executions/exec-1", timeout=10)


def test_poll_execution_polls_until_completed():
    with patch("demo_agents.requests") as mock_requests, patch("demo_agents.time.sleep"):
        mock_requests.get.side_effect = [
            _mock_response({"status": "QUEUED"}),
            _mock_response({"status": "STARTED"}),
            _mock_response({"status": "COMPLETED", "output": "ok"}),
        ]

        result = demo_agents.poll_execution("http://localhost:8080", "exec-1", timeout_s=5, interval_s=0)

    assert result["output"] == "ok"
    assert mock_requests.get.call_count == 3


def test_poll_execution_raises_on_failed_status():
    with patch("demo_agents.requests") as mock_requests:
        mock_requests.get.return_value = _mock_response(
            {"status": "FAILED", "errorMessage": "boom"}
        )

        with pytest.raises(RuntimeError, match="boom"):
            demo_agents.poll_execution("http://localhost:8080", "exec-1", timeout_s=5, interval_s=0)


def test_poll_execution_raises_timeout_when_never_completes():
    with patch("demo_agents.requests") as mock_requests, patch("demo_agents.time.sleep"):
        mock_requests.get.return_value = _mock_response({"status": "QUEUED"})

        # time.monotonic() é chamado: 1x para o deadline, depois 1x por iteração
        # do while. Forçamos poucas iterações controlando o relógio manualmente.
        clock = iter([0, 0, 1, 2, 100])
        with patch("demo_agents.time.monotonic", side_effect=lambda: next(clock)):
            with pytest.raises(TimeoutError):
                demo_agents.poll_execution("http://localhost:8080", "exec-1", timeout_s=5, interval_s=0)


def test_ask_agent_combines_submit_and_poll():
    with patch("demo_agents.submit_execution", return_value="exec-42") as mock_submit, patch(
        "demo_agents.poll_execution", return_value={"output": "resposta"}
    ) as mock_poll:
        answer = demo_agents.ask_agent(
            "http://localhost:8080", "tenant-1", "agent-1", "pergunta?", timeout_s=30
        )

    assert answer == "resposta"
    mock_submit.assert_called_once_with("http://localhost:8080", "pergunta?", "tenant-1", "agent-1")
    mock_poll.assert_called_once_with("http://localhost:8080", "exec-42", timeout_s=30)


def test_ask_agent_defaults_to_placeholder_when_output_empty():
    with patch("demo_agents.submit_execution", return_value="exec-1"), patch(
        "demo_agents.poll_execution", return_value={"output": None}
    ):
        answer = demo_agents.ask_agent("http://localhost:8080", "tenant-1", "agent-1", "pergunta?", 30)

    assert answer == "(sem conteúdo na resposta)"


def test_run_demo_asks_every_agent_and_continues_after_error():
    fake_agent_ids = {"compliance": "id-compliance", "piso": "id-piso", "catalogo": "id-catalogo"}
    # "orquestrador" propositalmente ausente para exercitar o caminho de erro.

    with patch("demo_agents.seed.ensure_agents", return_value=fake_agent_ids), patch(
        "demo_agents.ask_agent", return_value="resposta mockada"
    ) as mock_ask:
        results = demo_agents.run_demo("http://localhost:8080", "tenant-1", timeout_s=30)

    tags = [r["tag"] for r in results]
    assert tags == ["compliance", "piso", "catalogo", "orquestrador"]

    orquestrador_result = next(r for r in results if r["tag"] == "orquestrador")
    assert "ERRO" in orquestrador_result["answer"]

    # As 3 perguntas com agent_id resolvido devem ter chamado ask_agent.
    assert mock_ask.call_count == 3
    for result in results:
        if result["tag"] != "orquestrador":
            assert result["answer"] == "resposta mockada"
