"""
Carregamento e registro de tools Python customizadas empacotadas na pasta `tools/`
do ZIP de um agente (issue #129).

O `AgentService` (java-core) extrai cada arquivo `tools/<nome>.py` do ZIP do agente e
persiste seu conteúdo bruto associado ao `agent_id` (tabela `agent_custom_tools`, ver
migration `V17__agent_custom_tools.sql`). Este módulo:

1. Carrega essas linhas via `agent_id` (mesmo padrão de acesso a dados usado por
   `runtime.crewai_adapter.CrewAiRuntimeAdapter._load_agent_config`: `psycopg2` direto
   contra `DATABASE_URL`).
2. Valida estaticamente cada script **antes do registro** reaproveitando
   `tools.sandboxed_script_tool.validate_script` (mesma allowlist de imports/builtins/
   atributos dunder da `SandboxedScriptTool`, issue #111) — nenhuma lógica de validação
   é duplicada aqui.
3. Para cada script válido, registra uma tool CrewAI nomeada (`CustomScriptTool`) que,
   ao ser chamada pelo agente, executa o script através do mesmo sandbox de processo
   isolado (`SandboxedScriptTool`) usado pela tool genérica de scripts.

Um script que viola a allowlist faz `load_custom_tools` levantar `ScriptValidationError`
imediatamente — a tool nunca chega a ser registrada nem exposta ao agente, e a falha
não é adiada para o momento da execução.
"""

import os

import psycopg2
from crewai.tools import BaseTool
from pydantic import Field

from tools.sandboxed_script_tool import (
    ScriptValidationError,
    SandboxedScriptTool,
    validate_script,
)


class CustomScriptTool(BaseTool):
    """Tool CrewAI nomeada, dedicada a um script Python fixo fornecido pelo autor do
    agente (via `tools/<nome>.py` no ZIP), executado através do mesmo sandbox de
    processo isolado da `SandboxedScriptTool` (issue #111)."""

    name: str
    description: str = "Tool customizada do agente."
    script_content: str = Field(exclude=True)

    channel: any = Field(None, exclude=True)
    execution_id: str = Field(None)
    tenant_id: str = Field(None)

    def __init__(
        self,
        name: str,
        script_content: str,
        channel=None,
        execution_id=None,
        tenant_id=None,
        **kwargs,
    ):
        description = kwargs.pop(
            "description",
            f"Executa a tool customizada '{name}', um script Python empacotado pelo "
            f"autor do agente para automação/transformação de dados.",
        )
        super().__init__(
            name=name,
            description=description,
            script_content=script_content,
            **kwargs,
        )
        self.channel = channel
        self.execution_id = execution_id
        self.tenant_id = tenant_id

    def _run(self) -> str:
        # Reaproveita integralmente o sandbox de execução (validação + processo
        # isolado + timeout + limites de recurso) já implementado para scripts
        # escritos pelo próprio LLM em runtime (issue #111). Ver
        # sandboxed_script_tool.py para o desenho completo de contenção.
        sandbox = SandboxedScriptTool(
            channel=self.channel,
            execution_id=self.execution_id,
            tenant_id=self.tenant_id,
        )
        return sandbox._run(script=self.script_content)


def _load_custom_tool_rows(agent_id: str) -> list:
    """Carrega (tool_name, script_content) de `agent_custom_tools` para o agente,
    seguindo o mesmo padrão de acesso a dados de
    `CrewAiRuntimeAdapter._load_agent_config`."""
    db_url = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/rag_db"
    )
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT tool_name, script_content FROM agent_custom_tools WHERE agent_id = %s",
                (agent_id,),
            )
            rows = cur.fetchall()
        finally:
            cur.close()
        return rows
    finally:
        if conn is not None:
            conn.close()


def load_custom_tools(
    agent_id: str, channel=None, execution_id=None, tenant_id=None
) -> list:
    """Carrega e registra as tools customizadas de um agente (issue #129).

    Levanta `ScriptValidationError` se qualquer script violar a allowlist estática de
    `sandboxed_script_tool` — a tool não é registrada, e nenhuma execução é tentada.
    """
    tools = []
    for tool_name, script_content in _load_custom_tool_rows(agent_id):
        try:
            validate_script(script_content)
        except ScriptValidationError as e:
            raise ScriptValidationError(
                f"Tool customizada '{tool_name}' do agente {agent_id} rejeitada no "
                f"registro: {e}"
            ) from e

        tools.append(
            CustomScriptTool(
                name=tool_name,
                script_content=script_content,
                channel=channel,
                execution_id=execution_id,
                tenant_id=tenant_id,
            )
        )

    return tools
