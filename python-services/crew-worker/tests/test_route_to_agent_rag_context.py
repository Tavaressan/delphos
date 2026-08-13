"""
Regressão da issue #273: `route_to_agent` (tool registrada em `execute()` para
agentes com tag "orquestrador") não desempacotava a tupla `(texto, sources)`
retornada por `_search_db`, embutindo a repr Python da tupla inteira no prompt
da tarefa delegada em vez de apenas o texto recuperado.
"""

import os
from unittest.mock import MagicMock, patch


def _make_adapter(channel):
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


def test_route_to_agent_prompt_contains_search_db_text_not_tuple_repr():
    channel = MagicMock()
    adapter = _make_adapter(channel)

    with patch("runtime.crewai_adapter.requests") as mock_requests, patch(
        "runtime.crewai_adapter.psycopg2"
    ) as mock_pg, patch("runtime.crewai_adapter.Agent") as mock_agent_cls, patch(
        "runtime.crewai_adapter.Task"
    ) as mock_task_cls, patch(
        "runtime.crewai_adapter.Crew"
    ) as mock_crew_cls, patch(
        "tools.custom_agent_tools.psycopg2"
    ) as mock_custom_tools_pg, patch(
        "runtime.crewai_adapter.CrewAiRuntimeAdapter._search_db"
    ) as mock_search_db:
        mock_requests.post.return_value = MagicMock(
            status_code=200, json=lambda: {"data": [{"embedding": [0.1] * 768}]}
        )

        mock_conn_for_execute = MagicMock()
        mock_cur_for_execute = MagicMock()
        mock_cur_for_execute.fetchall.return_value = []
        # route_to_agent também consulta a tabela `agents` via fetchone() para
        # localizar o agente delegado alvo.
        mock_cur_for_execute.fetchone.return_value = (
            "target-id",
            "Agente de Piso",
            "---\nrole: Agente de Piso\n---\n",
        )
        mock_conn_for_execute.cursor.return_value = mock_cur_for_execute
        mock_pg.connect.return_value = mock_conn_for_execute

        mock_custom_tools_conn = MagicMock()
        mock_custom_tools_cur = MagicMock()
        mock_custom_tools_cur.fetchall.return_value = []
        mock_custom_tools_conn.cursor.return_value = mock_custom_tools_cur
        mock_custom_tools_pg.connect.return_value = mock_custom_tools_conn

        mock_crew_instance = MagicMock()
        mock_crew_instance.kickoff.return_value = "resposta mock"
        mock_crew_cls.return_value = mock_crew_instance

        # _search_db sempre retorna a tupla (texto, sources), tanto na
        # recuperação inicial do execute() quanto na chamada interna do
        # route_to_agent para o agente delegado.
        mock_search_db.return_value = (
            "texto de teste",
            [{"documentId": "doc-1"}],
        )

        adapter.execute()

        _, agent_kwargs = mock_agent_cls.call_args
        tools = agent_kwargs["tools"]
        route_to_agent = next(t for t in tools if t.name == "route_to_agent")

        route_to_agent.run(agent_name="Agente de Piso", query="qual a carga máxima?")

    # A última chamada a Task(...) é a da tarefa delegada criada dentro de
    # route_to_agent — deve conter o texto puro, não a repr da tupla.
    _, task_kwargs = mock_task_cls.call_args
    description = task_kwargs["description"]
    assert "texto de teste" in description
    assert "('texto de teste'" not in description
    assert "[{'documentId'" not in description
