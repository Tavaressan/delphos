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
    # Uma chamada para o LLM do AI Studio e outra para o LLM da Vertex AI.
    assert mock_llm_cls.call_count == 2


def test_adapter_puts_ai_studio_as_primary_and_vertex_as_last_fallback(channel):
    """Issue #389 (decisão de 2026-08-19): a cadeia foi invertida — Google AI Studio
    é o LLM primário e Vertex AI o último elo de fallback (não removido, só deixou
    de ser o primário porque seu free tier está expirado, ver #192/#193/#194).

    `FallbackLLM(primary=build_ai_studio_llm(), fallback=build_vertex_llm(), ...)`
    em crewai_adapter.py avalia os argumentos nomeados da esquerda para a direita:
    o primeiro `LLM(...)` construído é sempre o do primário. Este teste trava essa
    ordem via `call_args_list`, já que os dois mocks retornam o mesmo objeto e não
    dá para distingui-los por identidade.
    """
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "VERTEX_AI_API_KEY": "x" * 25,
            "GCP_PROJECT_ID": "test-project",
            "GOOGLE_AI_STUDIO_API_KEY": "y" * 25,
        },
    )

    assert isinstance(adapter.llm, FallbackLLM)
    first_call_kwargs = mock_llm_cls.call_args_list[0].kwargs
    second_call_kwargs = mock_llm_cls.call_args_list[1].kwargs
    assert first_call_kwargs["model"].startswith("gemini/")
    assert second_call_kwargs["model"].startswith("vertex_ai/")


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


def test_adapter_ignores_dev_null_adc_placeholder(channel, tmp_path):
    """Issue #389: docker-compose.yml monta ADC_PATH com default `:-/dev/null` para
    não quebrar `docker compose up` quando a var não está configurada (o volume spec
    `${ADC_PATH}:/gcloud/adc.json:ro` com ADC_PATH vazio é inválido e abortava a stack
    inteira). Esse placeholder "existe" no sentido de os.path.exists, mas não é uma
    credencial real — o adapter deve tratá-lo como ausente e usar Google AI Studio
    diretamente, não travar com GCP_PROJECT_ID ausente nem tentar autenticar no Vertex
    com um arquivo vazio."""
    empty_adc = tmp_path / "adc.json"
    empty_adc.touch()  # simula /dev/null: existe, mas tem 0 bytes

    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "GOOGLE_APPLICATION_CREDENTIALS": str(empty_adc),
            "GOOGLE_AI_STUDIO_API_KEY": "y" * 25,
        },
    )

    assert not isinstance(adapter.llm, FallbackLLM)
    _, kwargs = mock_llm_cls.call_args
    assert kwargs["model"].startswith("gemini/")
