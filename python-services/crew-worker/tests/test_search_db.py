import pytest
from unittest.mock import MagicMock, patch, call


def _get_last_sql(mock_cur):
    args, _ = mock_cur.execute.call_args
    return args[0]


def _make_adapter_for_search(agent_id="agent-a"):
    channel = MagicMock()

    with patch("runtime.crewai_adapter.LLM"), \
         patch("runtime.crewai_adapter.psycopg2") as mock_pg:

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchone.return_value = ("Agente A", "---\nrole: Agente A\n---\n")
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        import os
        os.environ.setdefault("VERTEX_AI_API_KEY", "x" * 25)
        os.environ.setdefault("GCP_PROJECT_ID", "test-project")

        from runtime.crewai_adapter import CrewAiRuntimeAdapter
        adapter = CrewAiRuntimeAdapter(
            channel, "exec-search", "tenant-t", "query", agent_id=agent_id
        )

    return adapter


def test_search_db_sql_includes_join_documents():
    adapter = _make_adapter_for_search()

    with patch("runtime.crewai_adapter.psycopg2") as mock_pg, \
         patch("runtime.crewai_adapter.requests") as mock_req:

        mock_req.post.return_value.status_code = 200
        mock_req.post.return_value.json.return_value = {"data": [{"embedding": [0.1] * 768}]}

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = []
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        adapter._search_db("query test")
        sql = _get_last_sql(mock_cur)

    assert "JOIN documents" in sql or "join documents" in sql.lower()


def test_search_db_sql_filters_agent_id_or_null():
    adapter = _make_adapter_for_search()

    with patch("runtime.crewai_adapter.psycopg2") as mock_pg, \
         patch("runtime.crewai_adapter.requests") as mock_req:

        mock_req.post.return_value.status_code = 200
        mock_req.post.return_value.json.return_value = {"data": [{"embedding": [0.1] * 768}]}

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = []
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        adapter._search_db("query test")
        sql = _get_last_sql(mock_cur)

    assert "agent_id IS NULL" in sql or "agent_id is null" in sql.lower()


def test_search_db_uses_parameterized_agent_id():
    adapter = _make_adapter_for_search(agent_id="agent-a")

    with patch("runtime.crewai_adapter.psycopg2") as mock_pg, \
         patch("runtime.crewai_adapter.requests") as mock_req:

        mock_req.post.return_value.status_code = 200
        mock_req.post.return_value.json.return_value = {"data": [{"embedding": [0.1] * 768}]}

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = []
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        adapter._search_db("query test")
        _, params = mock_cur.execute.call_args[0]

    assert "agent-a" in params
