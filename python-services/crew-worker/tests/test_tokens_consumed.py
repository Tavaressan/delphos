"""
Regressão da issue #269: `tokensConsumed` era enviado como constante `850` no
payload de `AgentExecutionFinished`, independentemente do uso real de LLM
reportado por `crew.usage_metrics`. Isso corrompia qualquer análise de
custo/uso baseada nesse campo.
"""

import json
import os
from unittest.mock import MagicMock, patch


def _make_adapter(channel):
    with patch("runtime.crewai_adapter.LLM"), patch(
        "runtime.crewai_adapter.psycopg2"
    ) as mock_pg:
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchone.return_value = None
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        os.environ.setdefault("VERTEX_AI_API_KEY", "x" * 25)
        os.environ.setdefault("GCP_PROJECT_ID", "test-project")

        from runtime.crewai_adapter import CrewAiRuntimeAdapter

        return CrewAiRuntimeAdapter(
            channel, "exec-tokens", "tenant-abc", "prompt text", agent_id=None
        )


def _run_execute_with_usage_metrics(adapter, total_tokens):
    """Executa adapter.execute() com efeitos colaterais mockados e o
    crew.usage_metrics.total_tokens configurado para o valor informado."""
    with patch("runtime.crewai_adapter.requests") as mock_requests, patch(
        "runtime.crewai_adapter.psycopg2"
    ) as mock_pg, patch("runtime.crewai_adapter.Agent"), patch(
        "runtime.crewai_adapter.Task"
    ), patch(
        "runtime.crewai_adapter.Crew"
    ) as mock_crew_cls, patch(
        "tools.custom_agent_tools.psycopg2"
    ) as mock_custom_tools_pg:
        mock_requests.post.return_value = MagicMock(
            status_code=200, json=lambda: {"data": [{"embedding": [0.1] * 768}]}
        )

        mock_conn_for_execute = MagicMock()
        mock_cur_for_execute = MagicMock()
        mock_cur_for_execute.fetchall.return_value = []
        mock_conn_for_execute.cursor.return_value = mock_cur_for_execute
        mock_pg.connect.return_value = mock_conn_for_execute

        mock_custom_tools_conn = MagicMock()
        mock_custom_tools_cur = MagicMock()
        mock_custom_tools_cur.fetchall.return_value = []
        mock_custom_tools_conn.cursor.return_value = mock_custom_tools_cur
        mock_custom_tools_pg.connect.return_value = mock_custom_tools_conn

        mock_crew_instance = MagicMock()
        mock_crew_instance.kickoff.return_value = "resposta mock"
        mock_crew_instance.usage_metrics = MagicMock(total_tokens=total_tokens)
        mock_crew_cls.return_value = mock_crew_instance

        adapter.execute()

    finished_calls = [
        c
        for c in adapter.channel.basic_publish.call_args_list
        if json.loads(c.kwargs["body"])["eventType"] == "AgentExecutionFinished"
    ]
    assert len(finished_calls) == 1
    return json.loads(finished_calls[0].kwargs["body"])["payload"]


def test_tokens_consumed_reflects_real_usage_metrics_not_hardcoded():
    channel = MagicMock()
    adapter = _make_adapter(channel)

    payload_small = _run_execute_with_usage_metrics(adapter, total_tokens=120)
    assert payload_small["tokensConsumed"] == 120
    assert payload_small["tokensConsumed"] != 850


def test_tokens_consumed_differs_for_different_usage_metrics():
    channel_a = MagicMock()
    adapter_a = _make_adapter(channel_a)
    payload_a = _run_execute_with_usage_metrics(adapter_a, total_tokens=90)

    channel_b = MagicMock()
    adapter_b = _make_adapter(channel_b)
    payload_b = _run_execute_with_usage_metrics(adapter_b, total_tokens=4321)

    assert payload_a["tokensConsumed"] == 90
    assert payload_b["tokensConsumed"] == 4321
    assert payload_a["tokensConsumed"] != payload_b["tokensConsumed"]
