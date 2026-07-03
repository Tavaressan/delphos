"""
Issue #101 — Validação da capacidade de execução de scripts pelos agentes CrewAI.

Investigação (2026-07-03): não há, hoje, nenhuma tool de execução de script/código
(ex.: CodeInterpreterTool, subprocess, sandbox) conectada aos agentes definidos em
src/mock_agents/ (orquestrador, compliance, catalogo, piso). O único artefato de
código legado que menciona execução de script sandboxed é o
`_reversa_sdd/migration/tool_execution_contract.md`, que documenta um contrato de
segurança do sistema legado MaxKB4j (scripts Groovy) durante o levantamento de
migração — não há requisito de produto, feature em `_reversa_forward/` nem menção em
`domain.md` pedindo essa capacidade para o crew-worker atual.

Conclusão: execução de scripts NÃO é um requisito atual do produto. Este teste
documenta esse estado (ausência da capacidade) e valida que a ferramenta mais
próxima em nome — `calculate_sandbox_quota` ("sandbox" aqui refere-se a cota de
tokens, não a sandbox de execução de código, ver domain.md) — nunca executa código
arbitrário: ela apenas soma valores numéricos e falha de forma segura e previsível
(sem eval/exec) diante de payload malformado.
"""

import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

TOOLS_DIR = Path(__file__).parent.parent / "src" / "tools"


def test_no_script_execution_tool_registered_in_tools_dir():
    """Inventário: nenhum arquivo em src/tools/ implementa execução de script/código.

    Garante que, se algum dia alguém adicionar um CodeInterpreterTool/subprocess/
    sandbox sem passar pela validação de escopo desta issue, o teste falhe e force
    uma revisão explícita.
    """
    tool_files = [f.name for f in TOOLS_DIR.glob("*.py") if f.name != "__init__.py"]

    assert tool_files == ["delegated_search_tool.py"], (
        "Novo arquivo encontrado em src/tools/. Se ele implementa execução de "
        "script/código, revise o contrato de sandboxing em "
        "_reversa_sdd/migration/tool_execution_contract.md antes de prosseguir "
        f"(arquivos atuais: {tool_files})."
    )

    forbidden_terms = ("subprocess", "exec(", "eval(", "os.system", "ProcessBuilder")
    for f in TOOLS_DIR.glob("*.py"):
        content = f.read_text(encoding="utf-8")
        for term in forbidden_terms:
            assert term not in content, (
                f"Termo de execução de código '{term}' encontrado em {f.name}, "
                "fora do escopo validado por esta issue."
            )


def _make_adapter(channel, agent_id=None, db_row=None):
    """Instancia o adapter (usado para depois capturar os `tools` de execute())."""
    with patch("runtime.crewai_adapter.LLM"), patch(
        "runtime.crewai_adapter.psycopg2"
    ) as mock_pg:
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchone.return_value = db_row
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        os.environ.setdefault("VERTEX_AI_API_KEY", "x" * 25)
        os.environ.setdefault("GCP_PROJECT_ID", "test-project")

        from runtime.crewai_adapter import CrewAiRuntimeAdapter

        adapter = CrewAiRuntimeAdapter(
            channel, "exec-001", "tenant-abc", "prompt text", agent_id=agent_id
        )
        return adapter


def _execute_and_capture_tools(adapter):
    """Roda adapter.execute() com todos os efeitos colaterais mockados e retorna
    a lista de tools passada ao construtor Agent()."""
    with patch("runtime.crewai_adapter.requests") as mock_requests, patch(
        "runtime.crewai_adapter.psycopg2"
    ) as mock_pg, patch("runtime.crewai_adapter.Agent") as mock_agent_cls, patch(
        "runtime.crewai_adapter.Task"
    ), patch(
        "runtime.crewai_adapter.Crew"
    ) as mock_crew_cls:
        mock_requests.post.return_value = MagicMock(
            status_code=200, json=lambda: {"data": [{"embedding": [0.1] * 768}]}
        )
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = []
        mock_conn.cursor.return_value = mock_cur
        mock_pg.connect.return_value = mock_conn

        mock_crew_instance = MagicMock()
        mock_crew_instance.kickoff.return_value = "resposta mock"
        mock_crew_cls.return_value = mock_crew_instance

        adapter.execute()

    _, agent_kwargs = mock_agent_cls.call_args
    return agent_kwargs["tools"]


def test_execute_never_registers_a_code_execution_tool():
    """Nenhuma das tools registradas em execute() para o perfil default de agente
    expõe execução de script/código arbitrário."""
    channel = MagicMock()
    adapter = _make_adapter(channel, agent_id=None)
    registered_tools = _execute_and_capture_tools(adapter)

    forbidden_name_fragments = (
        "script",
        "code_interpreter",
        "exec",
        "shell",
        "run_python",
    )
    # Frases (não substrings soltas) para evitar falso positivo com palavras como
    # "description"/"descrição", que contêm a substring "script"/"scrip".
    forbidden_desc_phrases = (
        "executar script",
        "execução de script",
        "run script",
        "code interpreter",
        "execute code",
        "executar código",
        "subprocess",
        "shell command",
    )
    for t in registered_tools:
        tool_name = getattr(t, "name", str(t)).lower()
        tool_desc = getattr(t, "description", "").lower()
        for fragment in forbidden_name_fragments:
            assert fragment not in tool_name, (
                f"Tool '{tool_name}' parece expor execução de código/script "
                "(fora do escopo desta versão do crew-worker)."
            )
        for phrase in forbidden_desc_phrases:
            assert phrase not in tool_desc, (
                f"Descrição da tool '{tool_name}' menciona '{phrase}' — revisar "
                "se isso implica execução de script."
            )


def test_calculate_sandbox_quota_only_sums_numeric_values():
    """A tool mais próxima em nome de 'sandbox' (calculate_sandbox_quota) apenas
    soma uma lista de números — não interpreta nem executa código arbitrário."""
    channel = MagicMock()
    adapter = _make_adapter(channel, agent_id=None)
    registered_tools = _execute_and_capture_tools(adapter)
    quota_tool = next(
        t for t in registered_tools if t.name == "calculate_sandbox_quota"
    )

    # Caso de sucesso: valores numéricos são somados.
    result = quota_tool.run(
        tenant_id="tenant-abc", action="sum_tokens", values=[10, 20, 5]
    )
    assert '"quota_used": 35' in result
    assert '"status": "OK"' in result

    # Caso de falha (input malformado): a tool deve falhar de forma previsível
    # (TypeError ao tentar somar um payload não numérico), nunca executar o
    # conteúdo como código.
    malicious_payload = "__import__('os').system('echo pwned')"
    with pytest.raises(TypeError):
        quota_tool.run(
            tenant_id="tenant-abc", action="sum_tokens", values=[malicious_payload]
        )
