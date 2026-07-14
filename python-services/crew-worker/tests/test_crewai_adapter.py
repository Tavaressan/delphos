import json
import pytest
from unittest.mock import MagicMock, patch, call


@pytest.fixture
def channel():
    ch = MagicMock()
    return ch


def _make_adapter(
    channel, agent_id=None, db_row=None, db_raises=None, query_raises=None
):
    with patch("runtime.crewai_adapter.LLM"), patch(
        "runtime.crewai_adapter.psycopg2"
    ) as mock_pg:

        if db_raises:
            mock_pg.connect.side_effect = db_raises
        else:
            mock_conn = MagicMock()
            mock_cur = MagicMock()
            mock_cur.fetchone.return_value = db_row
            if query_raises:
                mock_cur.execute.side_effect = query_raises
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


def test_malformed_agent_id_publishes_failed_and_closes_connection(channel):
    """Issue #124: um agent_id malformado (não apenas inexistente) faz a query
    falhar (ex.: erro de sintaxe UUID no Postgres). O adapter deve tratar isso
    de forma explícita (evento AgentExecutionFailed com motivo claro) e nunca
    vazar a conexão com o banco, mesmo quando a falha ocorre no meio da query."""
    with patch("runtime.crewai_adapter.LLM"), patch(
        "runtime.crewai_adapter.psycopg2"
    ) as mock_pg:
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.execute.side_effect = Exception("invalid input syntax for type uuid")
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        import os

        os.environ.setdefault("VERTEX_AI_API_KEY", "x" * 25)
        os.environ.setdefault("GCP_PROJECT_ID", "test-project")

        from runtime.crewai_adapter import CrewAiRuntimeAdapter

        with pytest.raises(Exception):
            CrewAiRuntimeAdapter(
                channel, "exec-001", "tenant-abc", "prompt text", agent_id="not-a-uuid"
            )

        mock_cur.close.assert_called_once()
        mock_conn.close.assert_called_once()

    published = channel.basic_publish.call_args
    body = json.loads(published.kwargs["body"])
    assert body["eventType"] == "AgentExecutionFailed"


# Tests for calculate_sandbox_quota tool
def test_calculate_sandbox_quota_with_list_of_dicts(channel):
    """Test that calculate_sandbox_quota accepts and processes list of dicts correctly."""
    adapter, _ = _make_adapter(channel, agent_id=None)

    # Call the tool with structured values (list of dicts)
    values = [
        {"limit": 1000, "resource": "tokens"},
        {"limit": 50, "resource": "storage_gb"},
    ]

    result = adapter.calculate_sandbox_quota(
        tenant_id="tenant_ejemplo_01", action="add", values=values
    )

    # Verify result is valid JSON and contains expected fields
    result_json = json.loads(result)
    assert "quota_used" in result_json
    assert result_json["status"] == "OK"
    # Should sum the limit fields: 1000 + 50 = 1050
    assert result_json["quota_used"] == 1050


def test_calculate_sandbox_quota_with_empty_list(channel):
    """Test that calculate_sandbox_quota handles empty list correctly."""
    adapter, _ = _make_adapter(channel, agent_id=None)

    result = adapter.calculate_sandbox_quota(
        tenant_id="tenant_test", action="sum", values=[]
    )

    result_json = json.loads(result)
    assert result_json["quota_used"] == 0
    assert result_json["status"] == "OK"


def test_calculate_sandbox_quota_with_invalid_dict(channel):
    """Test that calculate_sandbox_quota raises proper error for malformed items."""
    adapter, _ = _make_adapter(channel, agent_id=None)

    # Item missing 'limit' field
    values = [
        {"resource": "tokens"},  # Missing 'limit'
    ]

    with pytest.raises((ValueError, TypeError)):
        adapter.calculate_sandbox_quota(
            tenant_id="tenant_test", action="add", values=values
        )
