"""
Regressão da issue #274: `crew.kickoff()` era chamado sem try/except. Se
lançasse exceção, ela propagava até `main.py:process_job`, que apenas faz
NACK sem publicar nenhum evento terminal — deixando a execução presa em
RUNNING no banco (o evento AgentExecutionStarted já havia sido publicado).
"""

import json
import os
from unittest.mock import MagicMock, patch

import pytest


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
            channel, "exec-kickoff-fail", "tenant-abc", "prompt text", agent_id=None
        )


def test_kickoff_exception_publishes_agent_execution_failed_before_propagating():
    channel = MagicMock()
    adapter = _make_adapter(channel)

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
        mock_crew_instance.kickoff.side_effect = Exception("LLM timeout")
        mock_crew_cls.return_value = mock_crew_instance

        with pytest.raises(Exception, match="LLM timeout"):
            adapter.execute()

    failed_calls = [
        c
        for c in channel.basic_publish.call_args_list
        if json.loads(c.kwargs["body"])["eventType"] == "AgentExecutionFailed"
    ]
    assert len(failed_calls) == 1
    payload = json.loads(failed_calls[0].kwargs["body"])["payload"]
    assert "LLM timeout" in payload.get("reason", "")

    finished_calls = [
        c
        for c in channel.basic_publish.call_args_list
        if json.loads(c.kwargs["body"])["eventType"] == "AgentExecutionFinished"
    ]
    assert finished_calls == []
