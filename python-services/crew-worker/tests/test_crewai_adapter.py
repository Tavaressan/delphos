import json
import pytest
from unittest.mock import MagicMock, patch, call


@pytest.fixture
def channel():
    ch = MagicMock()
    return ch


def _make_adapter(channel, agent_id=None, db_row=None, db_raises=None):
    with patch("runtime.crewai_adapter.LLM"), patch(
        "runtime.crewai_adapter.psycopg2"
    ) as mock_pg:

        if db_raises:
            mock_pg.connect.side_effect = db_raises
        else:
            mock_conn = MagicMock()
            mock_cur = MagicMock()
            mock_cur.fetchone.return_value = db_row
            mock_conn.cursor.return_value = mock_cur
            mock_pg.connect.return_value = mock_conn

        import os

        os.environ.setdefault("VERTEX_AI_API_KEY", "x" * 25)
        os.environ.setdefault("GCP_PROJECT_ID", "test-project")

        from runtime.crewai_adapter import CrewAiRuntimeAdapter

        adapter = CrewAiRuntimeAdapter(
            channel, "exec-001", "tenant-abc", "prompt text", agent_id=agent_id
        )
        return adapter, mock_pg


def test_no_agent_id_uses_hardcoded_fallback(channel):
    adapter, _ = _make_adapter(channel, agent_id=None)
    assert adapter._agent_role == "Elevator Specialist"
    channel.basic_publish.assert_not_called()


def test_valid_agent_id_sets_dynamic_fields(channel):
    instructions = (
        "---\nrole: HVAC Specialist\ngoal: Meu goal\nbackstory: Minha história\n---\n"
    )
    adapter, _ = _make_adapter(
        channel, agent_id="abc-123", db_row=("HVAC Specialist", instructions, None)
    )
    assert adapter._agent_role == "HVAC Specialist"
    assert adapter._agent_goal == "Meu goal"
    assert adapter._agent_backstory == "Minha história"


def test_invalid_agent_id_publishes_failed_and_raises(channel):
    with pytest.raises(Exception):
        _make_adapter(channel, agent_id="nao-existe", db_row=None)
    published = channel.basic_publish.call_args
    body = json.loads(published.kwargs["body"])
    assert body["eventType"] == "AgentExecutionFailed"


def test_db_connection_failure_publishes_failed_and_raises(channel):
    with pytest.raises(Exception):
        _make_adapter(channel, agent_id="abc-999", db_raises=Exception("conn refused"))
    published = channel.basic_publish.call_args
    body = json.loads(published.kwargs["body"])
    assert body["eventType"] == "AgentExecutionFailed"
