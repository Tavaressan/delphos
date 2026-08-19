"""Testes do provider Ollama (issue #358): terceiro elo da cadeia de fallback do LLM
(Vertex AI -> Google AI Studio -> Ollama) e do modo CREW_WORKER_MODE=ollama.

Arquivo dedicado (em vez de estender test_llm_fallback.py) para minimizar conflito de
rebase com o worker paralelo das issues #391/#389, que também altera crewai_adapter.py.
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
        ):
            os.environ.pop(key, None)
        os.environ.update(env)

        from runtime.crewai_adapter import CrewAiRuntimeAdapter

        adapter = CrewAiRuntimeAdapter(
            channel, "exec-001", "tenant-abc", "prompt text", agent_id=None
        )
        return adapter, mock_llm_cls


def test_adapter_uses_ollama_directly_in_ollama_mode(channel):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "CREW_WORKER_MODE": "ollama",
            "OLLAMA_CHAT_MODEL": "llama3.2",
        },
    )

    assert not isinstance(adapter.llm, FallbackLLM)
    mock_llm_cls.assert_called_once()
    _, kwargs = mock_llm_cls.call_args
    assert kwargs["model"] == "ollama/llama3.2"
    assert kwargs["base_url"] == "http://ollama:11434"


def test_adapter_ollama_mode_uses_custom_base_url(channel):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "CREW_WORKER_MODE": "ollama",
            "OLLAMA_CHAT_MODEL": "llama3.2",
            "OLLAMA_BASE_URL": "http://localhost:11434",
        },
    )

    _, kwargs = mock_llm_cls.call_args
    assert kwargs["base_url"] == "http://localhost:11434"


def test_adapter_ollama_mode_raises_without_chat_model(channel):
    with pytest.raises(RuntimeError, match="OLLAMA_CHAT_MODEL"):
        _make_adapter_with_env(channel, {"CREW_WORKER_MODE": "ollama"})


def test_adapter_uses_ollama_as_third_fallback_leg_when_all_configured(channel):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "VERTEX_AI_API_KEY": "x" * 25,
            "GCP_PROJECT_ID": "test-project",
            "GOOGLE_AI_STUDIO_API_KEY": "y" * 25,
            "OLLAMA_CHAT_MODEL": "llama3.2",
        },
    )

    assert isinstance(adapter.llm, FallbackLLM)
    assert isinstance(adapter.llm._fallback, FallbackLLM)
    # Vertex AI, AI Studio e Ollama: três LLMs construídos.
    assert mock_llm_cls.call_count == 3


def test_adapter_uses_ollama_fallback_when_only_vertex_and_ollama_configured(channel):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "VERTEX_AI_API_KEY": "x" * 25,
            "GCP_PROJECT_ID": "test-project",
            "OLLAMA_CHAT_MODEL": "llama3.2",
        },
    )

    assert isinstance(adapter.llm, FallbackLLM)
    assert not isinstance(adapter.llm._fallback, FallbackLLM)
    assert mock_llm_cls.call_count == 2


def test_adapter_uses_ollama_fallback_when_only_ai_studio_and_ollama_configured(
    channel,
):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "GOOGLE_AI_STUDIO_API_KEY": "y" * 25,
            "OLLAMA_CHAT_MODEL": "llama3.2",
        },
    )

    assert isinstance(adapter.llm, FallbackLLM)
    assert mock_llm_cls.call_count == 2


def test_adapter_uses_ollama_directly_when_no_google_provider_configured(channel):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "OLLAMA_CHAT_MODEL": "llama3.2",
        },
    )

    assert not isinstance(adapter.llm, FallbackLLM)
    mock_llm_cls.assert_called_once()
    _, kwargs = mock_llm_cls.call_args
    assert kwargs["model"] == "ollama/llama3.2"


def test_adapter_raises_when_no_provider_configured_at_all(channel):
    with pytest.raises(RuntimeError, match="OLLAMA_CHAT_MODEL"):
        _make_adapter_with_env(channel, {})


def test_fallback_chain_falls_through_to_ollama_when_vertex_and_ai_studio_fail():
    vertex = MagicMock()
    vertex.call.side_effect = Exception("Vertex AI indisponível")
    ai_studio = MagicMock()
    ai_studio.call.side_effect = Exception("AI Studio indisponível")
    ollama = MagicMock()
    ollama.call.return_value = "resposta ollama"

    llm = FallbackLLM(
        primary=vertex,
        fallback=FallbackLLM(primary=ai_studio, fallback=ollama, model="test-model"),
        model="test-model",
    )
    result = llm.call(messages=[{"role": "user", "content": "oi"}])

    assert result == "resposta ollama"
    vertex.call.assert_called_once()
    ai_studio.call.assert_called_once()
    ollama.call.assert_called_once()
