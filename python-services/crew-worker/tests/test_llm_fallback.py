import os

import pytest
from unittest.mock import MagicMock, patch

from runtime.crewai_adapter import FallbackLLM


@pytest.fixture
def channel():
    return MagicMock()


def test_fallback_llm_uses_primary_when_it_succeeds():
    primary = MagicMock()
    primary.call.return_value = "resposta vertex"
    fallback = MagicMock()

    llm = FallbackLLM(
        primary=primary, fallback=fallback, model="vertex_ai/gemini-1.5-flash"
    )
    result = llm.call(messages=[{"role": "user", "content": "oi"}])

    assert result == "resposta vertex"
    fallback.call.assert_not_called()


def test_fallback_llm_falls_back_when_primary_raises():
    primary = MagicMock()
    primary.call.side_effect = Exception("Vertex AI indisponível")
    fallback = MagicMock()
    fallback.call.return_value = "resposta ai studio"

    llm = FallbackLLM(
        primary=primary, fallback=fallback, model="vertex_ai/gemini-1.5-flash"
    )
    result = llm.call(messages=[{"role": "user", "content": "oi"}])

    assert result == "resposta ai studio"
    fallback.call.assert_called_once()


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
        ):
            os.environ.pop(key, None)
        os.environ.update(env)

        from runtime.crewai_adapter import CrewAiRuntimeAdapter

        adapter = CrewAiRuntimeAdapter(
            channel, "exec-001", "tenant-abc", "prompt text", agent_id=None
        )
        return adapter, mock_llm_cls


def test_adapter_uses_fallback_llm_when_both_vertex_and_ai_studio_configured(channel):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "VERTEX_AI_API_KEY": "x" * 25,
            "GCP_PROJECT_ID": "test-project",
            "GOOGLE_AI_STUDIO_API_KEY": "y" * 25,
        },
    )

    assert isinstance(adapter.llm, FallbackLLM)
    # Uma chamada para o LLM da Vertex AI e outra para o LLM do AI Studio.
    assert mock_llm_cls.call_count == 2


def test_adapter_uses_ai_studio_directly_when_no_vertex_credentials(channel):
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "GOOGLE_AI_STUDIO_API_KEY": "y" * 25,
        },
    )

    assert not isinstance(adapter.llm, FallbackLLM)
    mock_llm_cls.assert_called_once()
    _, kwargs = mock_llm_cls.call_args
    assert kwargs["model"].startswith("gemini/")
    assert os.environ["GEMINI_API_KEY"] == "y" * 25


def test_adapter_raises_when_no_provider_configured(channel):
    with pytest.raises(RuntimeError, match="GOOGLE_AI_STUDIO_API_KEY"):
        _make_adapter_with_env(channel, {})
