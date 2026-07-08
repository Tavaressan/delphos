"""
Testes de `tools/custom_agent_tools.py` (issue #129) — tools Python customizadas
empacotadas em `tools/*.py` no ZIP do agente, extraídas e persistidas pelo java-core
(`agent_custom_tools`) e carregadas/registradas aqui pelo `agent_id`.

Cobre os 3 cenários de aceite descritos na issue:
1. Script válido -> tool registrada e executável.
2. Script que viola a allowlist -> rejeitado no registro (não apenas na execução).
3. Agente sem tools customizadas -> lista vazia, comportamento atual preservado.
"""

import json
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, "src")

from tools.custom_agent_tools import CustomScriptTool, load_custom_tools  # noqa: E402
from tools.sandboxed_script_tool import ScriptValidationError  # noqa: E402


def _mock_psycopg2_with_rows(rows):
    mock_pg = MagicMock()
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_cur.fetchall.return_value = rows
    mock_conn.cursor.return_value = mock_cur
    mock_pg.connect.return_value = mock_conn
    return mock_pg, mock_conn, mock_cur


def test_valid_custom_tool_is_registered_and_executable():
    rows = [("sum_values", "print(1 + 2)")]
    mock_pg, mock_conn, mock_cur = _mock_psycopg2_with_rows(rows)

    with patch("tools.custom_agent_tools.psycopg2", mock_pg):
        tools = load_custom_tools("agent-123")

    assert len(tools) == 1
    tool = tools[0]
    assert isinstance(tool, CustomScriptTool)
    assert tool.name == "sum_values"

    result = json.loads(tool.run())
    assert result["status"] == "OK"
    assert result["stdout"] == "3\n"

    mock_cur.close.assert_called_once()
    mock_conn.close.assert_called_once()


def test_script_violating_allowlist_is_rejected_at_registration():
    rows = [("bad_tool", "import os\nprint(os.getcwd())")]
    mock_pg, _, _ = _mock_psycopg2_with_rows(rows)

    with patch("tools.custom_agent_tools.psycopg2", mock_pg):
        with pytest.raises(ScriptValidationError) as excinfo:
            load_custom_tools("agent-123")

    assert "bad_tool" in str(excinfo.value)
    assert "os" in str(excinfo.value)


def test_agent_without_custom_tools_returns_empty_list():
    mock_pg, _, _ = _mock_psycopg2_with_rows([])

    with patch("tools.custom_agent_tools.psycopg2", mock_pg):
        tools = load_custom_tools("agent-without-tools")

    assert tools == []


def test_multiple_tools_are_all_registered_with_derived_names():
    rows = [
        ("sum_values", "print(1 + 1)"),
        ("format_report", "print('report')"),
    ]
    mock_pg, _, _ = _mock_psycopg2_with_rows(rows)

    with patch("tools.custom_agent_tools.psycopg2", mock_pg):
        tools = load_custom_tools("agent-456")

    assert sorted(t.name for t in tools) == ["format_report", "sum_values"]
