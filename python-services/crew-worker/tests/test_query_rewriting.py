import time
import pytest
from unittest.mock import MagicMock, patch


def _make_adapter(
    enabled=True, timeout="3", agent_id=None, prompt="prompt bruto do usuário"
):
    """Constrói um adapter com o LLM/psycopg2 mockados, controlando a flag de
    query rewriting (issue #149) via env antes da construção (a config é lida
    no __init__)."""
    channel = MagicMock()

    with patch("runtime.crewai_adapter.LLM"), patch(
        "runtime.crewai_adapter.psycopg2"
    ) as mock_pg:

        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchone.return_value = (
            "Agente A",
            "---\nrole: Agente A\n---\n",
            None,
        )
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        import os

        os.environ.setdefault("VERTEX_AI_API_KEY", "x" * 25)
        os.environ.setdefault("GCP_PROJECT_ID", "test-project")
        os.environ["CREW_QUERY_REWRITING_ENABLED"] = "true" if enabled else "false"
        os.environ["CREW_QUERY_REWRITING_TIMEOUT_SECONDS"] = timeout

        from runtime.crewai_adapter import CrewAiRuntimeAdapter

        adapter = CrewAiRuntimeAdapter(
            channel, "exec-149", "tenant-t", prompt, agent_id=agent_id
        )

    return adapter


# (a) Caminho feliz: o rewriting é aplicado e a query embeddada é a REESCRITA.
def test_rewrite_query_happy_path_uses_llm_output():
    adapter = _make_adapter(enabled=True)
    adapter.llm = MagicMock()
    adapter.llm.call.return_value = "  carga máxima cabine elevador especificação  "

    result = adapter._rewrite_query("Me diga por favor qual a carga da cabine")

    assert result == "carga máxima cabine elevador especificação"
    adapter.llm.call.assert_called_once()


def test_rewritten_query_is_the_one_embedded_and_searched():
    """Caminho feliz ponta-a-ponta em _search_db: a query passada ao
    embedding-service é a reescrita, e o filtro multi-tenant/agent na SQL
    permanece inalterado."""
    adapter = _make_adapter(enabled=True, agent_id="agent-a")
    adapter.llm = MagicMock()
    adapter.llm.call.return_value = "consulta enxuta de elevador"

    rewritten = adapter._rewrite_query("pergunta longa e verbosa do usuário")

    with patch("runtime.crewai_adapter.psycopg2") as mock_pg, patch(
        "runtime.crewai_adapter.requests"
    ) as mock_req:
        mock_req.post.return_value.status_code = 200
        mock_req.post.return_value.json.return_value = {
            "data": [{"embedding": [0.1] * 768}]
        }
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = []
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        adapter._search_db(rewritten)

        emb_call = mock_req.post.call_args
        _, params = mock_cur.execute.call_args[0]

    assert emb_call.kwargs["json"]["input"] == ["consulta enxuta de elevador"]
    # Filtro multi-tenant/agent inalterado.
    assert "tenant-t" in params
    assert "agent-a" in params


# (b) Fallback ao prompt original em falha do LLM.
def test_rewrite_query_falls_back_on_llm_error():
    adapter = _make_adapter(enabled=True)
    adapter.llm = MagicMock()
    adapter.llm.call.side_effect = RuntimeError("LLM indisponível")

    original = "prompt original do usuário"
    assert adapter._rewrite_query(original) == original


def test_rewrite_query_falls_back_on_empty_response():
    adapter = _make_adapter(enabled=True)
    adapter.llm = MagicMock()
    adapter.llm.call.return_value = "   "

    original = "prompt original"
    assert adapter._rewrite_query(original) == original


def test_rewrite_query_falls_back_on_timeout():
    adapter = _make_adapter(enabled=True, timeout="0.2")
    adapter.llm = MagicMock()

    def _slow(*args, **kwargs):
        time.sleep(1.0)
        return "reescrita que chega tarde demais"

    adapter.llm.call.side_effect = _slow

    original = "prompt original"
    start = time.monotonic()
    result = adapter._rewrite_query(original)
    elapsed = time.monotonic() - start

    assert result == original
    # O timeout curto limita a latência do passo (bem abaixo do sleep de 1s).
    assert elapsed < 0.9


def test_rewrite_query_disabled_returns_prompt_without_calling_llm():
    adapter = _make_adapter(enabled=False)
    adapter.llm = MagicMock()

    original = "prompt original"
    assert adapter._rewrite_query(original) == original
    adapter.llm.call.assert_not_called()


# (c) Filtro de tenant inalterado (também com o fallback, i.e. rewriting ligado
# porém falhando: a busca continua com o prompt original e o mesmo filtro).
def test_tenant_filter_unchanged_on_fallback_path():
    adapter = _make_adapter(enabled=True, agent_id="agent-a")
    adapter.llm = MagicMock()
    adapter.llm.call.side_effect = RuntimeError("LLM indisponível")

    search_query = adapter._rewrite_query("pergunta original")
    assert search_query == "pergunta original"

    with patch("runtime.crewai_adapter.psycopg2") as mock_pg, patch(
        "runtime.crewai_adapter.requests"
    ) as mock_req:
        mock_req.post.return_value.status_code = 200
        mock_req.post.return_value.json.return_value = {
            "data": [{"embedding": [0.1] * 768}]
        }
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = []
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        adapter._search_db(search_query)
        sql, params = mock_cur.execute.call_args[0]

    assert "dc.tenant_id = %s" in sql
    assert "(d.agent_id = %s OR d.agent_id IS NULL)" in sql
    assert "tenant-t" in params
    assert "agent-a" in params
