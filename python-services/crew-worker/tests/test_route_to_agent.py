"""
Regressão da issue #124: `route_to_agent` (tool registrada em `execute()`) abria
uma conexão/cursor Postgres sem `try/finally` — se `cur.execute` lançasse exceção,
a conexão vazava. Corrigido junto com `_load_agent_config` e `_search_db`.
"""

import os
from unittest.mock import MagicMock, patch


def _make_adapter(channel):
    # route_to_agent só é registrada para agentes com tag "orquestrador"
    # (ver crewai_adapter.py: `elif self._agent_tag == "orquestrador"`).
    with patch("runtime.crewai_adapter.LLM"), patch(
        "runtime.crewai_adapter.psycopg2"
    ) as mock_pg:
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchone.return_value = (
            "Orquestrador",
            "---\nrole: Orquestrador\n---\n",
            "orquestrador",
        )
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        os.environ.setdefault("VERTEX_AI_API_KEY", "x" * 25)
        os.environ.setdefault("GCP_PROJECT_ID", "test-project")

        from runtime.crewai_adapter import CrewAiRuntimeAdapter

        return CrewAiRuntimeAdapter(
            channel, "exec-route", "tenant-abc", "prompt text", agent_id="agent-orq"
        )


def _get_route_to_agent_tool(adapter, mock_pg):
    """Roda adapter.execute() com efeitos colaterais mockados (exceto psycopg2,
    que fica sob controle do chamador) e retorna a tool route_to_agent registrada."""
    with patch("runtime.crewai_adapter.requests") as mock_requests, patch(
        "runtime.crewai_adapter.Agent"
    ) as mock_agent_cls, patch("runtime.crewai_adapter.Task"), patch(
        "runtime.crewai_adapter.Crew"
    ) as mock_crew_cls:
        mock_requests.post.return_value = MagicMock(
            status_code=200, json=lambda: {"data": [{"embedding": [0.1] * 768}]}
        )

        mock_crew_instance = MagicMock()
        mock_crew_instance.kickoff.return_value = "resposta mock"
        mock_crew_cls.return_value = mock_crew_instance

        adapter.execute()

    _, agent_kwargs = mock_agent_cls.call_args
    tools = agent_kwargs["tools"]
    return next(t for t in tools if t.name == "route_to_agent")


def test_route_to_agent_closes_connection_and_cursor_even_when_query_fails():
    channel = MagicMock()
    adapter = _make_adapter(channel)

    with patch("runtime.crewai_adapter.psycopg2") as mock_pg:
        # execute() em si não bate no banco de forma relevante para este teste;
        # _search_db interno usa fetchall, então mantemos um retorno vazio seguro.
        mock_conn_for_execute = MagicMock()
        mock_cur_for_execute = MagicMock()
        mock_cur_for_execute.fetchall.return_value = []
        mock_conn_for_execute.cursor.return_value = mock_cur_for_execute
        mock_pg.connect.return_value = mock_conn_for_execute

        route_to_agent = _get_route_to_agent_tool(adapter, mock_pg)

        # Agora simula a falha específica de route_to_agent: cur.execute lança.
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.execute.side_effect = Exception("db unavailable")
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        result = route_to_agent.run(agent_name="Agente de Piso", query="oi")

    assert "Erro ao buscar agente" in result
    mock_cur.close.assert_called_once()
    mock_conn.close.assert_called_once()
