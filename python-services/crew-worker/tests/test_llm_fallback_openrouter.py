"""Testes do provider OpenRouter (issue #429): elo adicional na cadeia de fallback do
LLM usando modelos free-tier via litellm (`openrouter/<modelo>`, env
`OPENROUTER_API_KEY`). Vertex AI continua como último elo (mesma regra já documentada
para o Ollama, issue #358/#416).

Arquivo dedicado (em vez de estender test_llm_fallback.py / test_llm_fallback_ollama.py)
para minimizar conflito de rebase, seguindo o mesmo padrão adotado para o Ollama.
"""

import os

import pytest
from unittest.mock import MagicMock, patch

from runtime.crewai_adapter import FallbackLLM


@pytest.fixture
def channel():
    return MagicMock()


def _make_adapter_with_env(channel, env):
    with patch("runtime.crewai_adapter.LLM") as mock_llm_cls, patch(
        "runtime.crewai_adapter.psycopg2"
    ):
        for key in (
            "CREW_WORKER_MODE",
            "VERTEX_AI_API_KEY",
            "GCP_PROJECT_ID",
            "GOOGLE_APPLICATION_CREDENTIALS",
            "GOOGLE_AI_STUDIO_API_KEY",
            "OLLAMA_CHAT_MODEL",
            "OLLAMA_BASE_URL",
            "OPENROUTER_API_KEY",
            "OPENROUTER_CHAT_MODEL",
        ):
            os.environ.pop(key, None)
        os.environ.update(env)

        from runtime.crewai_adapter import CrewAiRuntimeAdapter

        adapter = CrewAiRuntimeAdapter(
            channel, "exec-001", "tenant-abc", "prompt text", agent_id=None
        )
        return adapter, mock_llm_cls


def test_adapter_uses_openrouter_directly_when_only_openrouter_configured(channel):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "OPENROUTER_API_KEY": "z" * 25,
        },
    )

    assert not isinstance(adapter.llm, FallbackLLM)
    mock_llm_cls.assert_called_once()
    _, kwargs = mock_llm_cls.call_args
    assert kwargs["model"].startswith("openrouter/")
    assert kwargs["model"].endswith(":free")


def test_adapter_uses_openrouter_custom_model_when_configured(channel):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "OPENROUTER_API_KEY": "z" * 25,
            "OPENROUTER_CHAT_MODEL": "mistralai/mistral-7b-instruct:free",
        },
    )

    _, kwargs = mock_llm_cls.call_args
    assert kwargs["model"] == "openrouter/mistralai/mistral-7b-instruct:free"


def test_adapter_chains_openrouter_before_vertex_as_last_fallback(channel):
    """Google AI Studio (primário) -> OpenRouter -> Vertex AI (último elo)."""
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "GOOGLE_AI_STUDIO_API_KEY": "y" * 25,
            "OPENROUTER_API_KEY": "z" * 25,
            "VERTEX_AI_API_KEY": "x" * 25,
            "GCP_PROJECT_ID": "test-project",
        },
    )

    assert isinstance(adapter.llm, FallbackLLM)
    assert isinstance(adapter.llm._fallback, FallbackLLM)
    # AI Studio, OpenRouter e Vertex: três LLMs construídos.
    assert mock_llm_cls.call_count == 3

    first_call_kwargs = mock_llm_cls.call_args_list[0].kwargs
    second_call_kwargs = mock_llm_cls.call_args_list[1].kwargs
    third_call_kwargs = mock_llm_cls.call_args_list[2].kwargs
    assert first_call_kwargs["model"].startswith("gemini/")
    assert second_call_kwargs["model"].startswith("openrouter/")
    assert third_call_kwargs["model"].startswith("vertex_ai/")


def test_adapter_openrouter_fallback_when_only_openrouter_and_vertex_configured(
    channel,
):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "OPENROUTER_API_KEY": "z" * 25,
            "VERTEX_AI_API_KEY": "x" * 25,
            "GCP_PROJECT_ID": "test-project",
        },
    )

    assert isinstance(adapter.llm, FallbackLLM)
    assert not isinstance(adapter.llm._fallback, FallbackLLM)
    assert mock_llm_cls.call_count == 2


def test_fallback_chain_falls_through_to_next_leg_when_openrouter_fails():
    """Simula o rate limit do free tier do OpenRouter: a chamada falha e a cadeia
    cai para o próximo elo sem quebrar a execução do agente CrewAI."""
    ai_studio = MagicMock()
    ai_studio.call.side_effect = Exception("AI Studio indisponível")
    openrouter = MagicMock()
    openrouter.call.side_effect = Exception(
        "OpenRouter rate limit exceeded (free tier)"
    )
    vertex = MagicMock()
    vertex.call.return_value = "resposta vertex"

    llm = FallbackLLM(
        primary=ai_studio,
        fallback=FallbackLLM(primary=openrouter, fallback=vertex, model="test-model"),
        model="test-model",
    )
    result = llm.call(messages=[{"role": "user", "content": "oi"}])

    assert result == "resposta vertex"
    ai_studio.call.assert_called_once()
    openrouter.call.assert_called_once()
    vertex.call.assert_called_once()
