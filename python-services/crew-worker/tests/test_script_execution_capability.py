"""
Issue #111 — Execução sandboxed de scripts pelos agentes CrewAI.

## Histórico

A **#101** investigou explicitamente se execução de scripts/código pelos agentes era
um requisito do produto. Conclusão registrada no **PR #107**: não era, na época. Este
arquivo continha dois testes que travavam a ausência dessa capacidade:
`test_no_script_execution_tool_registered_in_tools_dir` e
`test_execute_never_registers_a_code_execution_tool`.

A **#111** supera essa conclusão com base em um novo requisito de produto (automação/
transformação de dados sobre conteúdo de RAG). Os dois testes acima foram substituídos
pelos testes abaixo, que validam a nova capacidade **sandboxed** e opt-in
(`allow_script_execution` no manifest), preservando a garantia original de que
**qualquer outra tool** em `src/tools/` continua sem padrões de execução de código
arbitrário fora de contenção. Ver desenho completo em
`_reversa_sdd/decisions/2026-07-03-script-execution-sandbox.md`.

O teste `test_calculate_sandbox_quota_only_sums_numeric_values` (não relacionado à
execução de scripts) permanece inalterado.
"""

import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

TOOLS_DIR = Path(__file__).parent.parent / "src" / "tools"

# Único arquivo em src/tools/ autorizado a conter padrões de execução de
# código/processo — validado pelo desenho de sandbox de #111 (allowlist de AST,
# subprocess isolado, timeout, limites de recurso). Ver docstring do módulo
# `sandboxed_script_tool.py` para o desenho completo.
SANDBOXED_SCRIPT_TOOL_FILE = "sandboxed_script_tool.py"


def test_sandboxed_script_tool_is_the_only_file_allowed_to_reference_execution_terms():
    """Inventário: fora de `sandboxed_script_tool.py` (revisado e sandboxed pela
    #111), nenhum arquivo em src/tools/ implementa execução de script/código.

    Garante que, se algum dia alguém adicionar uma nova tool com
    subprocess/exec/eval sem passar pela validação de escopo desta issue, o teste
    falhe e force uma revisão explícita.
    """
    forbidden_terms = ("subprocess", "exec(", "eval(", "os.system", "ProcessBuilder")
    for f in TOOLS_DIR.glob("*.py"):
        if f.name in (SANDBOXED_SCRIPT_TOOL_FILE, "__init__.py"):
            continue
        content = f.read_text(encoding="utf-8")
        for term in forbidden_terms:
            assert term not in content, (
                f"Termo de execução de código '{term}' encontrado em {f.name}, "
                "fora do escopo validado por esta issue. Apenas "
                f"{SANDBOXED_SCRIPT_TOOL_FILE} (sandbox #111) pode conter esses "
                "termos."
            )


def test_sandboxed_script_tool_file_exists_and_is_registered_in_tools_dir():
    """A tool sandboxed introduzida pela #111 deve existir em src/tools/."""
    tool_files = [f.name for f in TOOLS_DIR.glob("*.py") if f.name != "__init__.py"]
    assert SANDBOXED_SCRIPT_TOOL_FILE in tool_files, (
        f"{SANDBOXED_SCRIPT_TOOL_FILE} não encontrado em src/tools/ "
        f"(arquivos atuais: {tool_files})."
    )


def _make_adapter(channel, agent_id=None, db_row=None, manifest_config=None):
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
            channel,
            "exec-001",
            "tenant-abc",
            "prompt text",
            agent_id=agent_id,
            manifest_config=manifest_config,
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


def test_execute_does_not_register_script_execution_tool_by_default():
    """Sem `allow_script_execution` no manifest, nenhuma tool registrada expõe
    execução de script/código arbitrário — a garantia original de #101/#107
    continua valendo por padrão (least privilege / opt-in)."""
    channel = MagicMock()
    adapter = _make_adapter(channel, agent_id=None, manifest_config=None)
    registered_tools = _execute_and_capture_tools(adapter)

    forbidden_name_fragments = (
        "script",
        "code_interpreter",
        "shell",
        "run_python",
    )
    forbidden_desc_phrases = (
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
                f"Tool '{tool_name}' parece expor execução de script sem "
                "'allow_script_execution' habilitado no manifest."
            )
        for phrase in forbidden_desc_phrases:
            assert phrase not in tool_desc, (
                f"Descrição da tool '{tool_name}' menciona '{phrase}' sem "
                "'allow_script_execution' habilitado no manifest."
            )


def test_execute_registers_sandboxed_script_tool_when_enabled_in_manifest():
    """Com `allow_script_execution: true` no manifest, a tool
    `execute_sandboxed_script` (SandboxedScriptTool, #111) é registrada e funciona
    dentro do sandbox esperado."""
    channel = MagicMock()
    manifest_config = "agent_settings:\n  allow_script_execution: true\n"
    adapter = _make_adapter(channel, agent_id=None, manifest_config=manifest_config)
    registered_tools = _execute_and_capture_tools(adapter)

    tool_names = [getattr(t, "name", str(t)) for t in registered_tools]
    assert "execute_sandboxed_script" in tool_names

    sandbox_tool = next(
        t
        for t in registered_tools
        if getattr(t, "name", None) == "execute_sandboxed_script"
    )
    result = sandbox_tool.run(script="print(1 + 1)")
    assert '"status": "OK"' in result
    assert '"stdout": "2\\n"' in result


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
