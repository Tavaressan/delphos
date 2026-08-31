"""Testes do provider OpenRouter (issue #429): elo adicional na cadeia de fallback do
LLM usando modelos free-tier via litellm (`openrouter/<modelo>`, env
`OPENROUTER_API_KEY`). Vertex AI continua como último elo (mesma regra já documentada
para o Ollama, issue #358/#416).

Arquivo dedicado (em vez de estender test_llm_fallback.py / test_llm_fallback_ollama.py)
para minimizar conflito de rebase, seguindo o mesmo padrão adotado para o Ollama.
"""

import os
import time

import litellm.exceptions as litellm_exceptions
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


# Timeout ambíguo bem curto nestes testes: o objetivo é provar que erros com código
# claro (429/5xx/conexão) NÃO esperam esse timeout — eles precisam retornar bem
# abaixo dele, já que a exceção chega antes de qualquer espera.
_SHORT_AMBIGUOUS_TIMEOUT = 5
_FAST_FAIL_BUDGET_SECONDS = 2


def test_rate_limit_429_skips_to_next_link_without_waiting_full_timeout():
    """Issue #429 (follow-up): rate limit (HTTP 429) do free tier do OpenRouter deve
    pular IMEDIATAMENTE para o próximo elo, sem esperar o timeout ambíguo completo."""
    openrouter = MagicMock()
    openrouter.call.side_effect = litellm_exceptions.RateLimitError(
        "rate limit exceeded",
        llm_provider="openrouter",
        model="meta-llama/llama-3.3-8b-instruct:free",
    )
    vertex = MagicMock()
    vertex.call.return_value = "resposta vertex"

    llm = FallbackLLM(
        primary=openrouter,
        fallback=vertex,
        model="openrouter-primary+vertex-fallback",
        ambiguous_timeout_seconds=_SHORT_AMBIGUOUS_TIMEOUT,
    )

    start = time.monotonic()
    result = llm.call(messages=[{"role": "user", "content": "oi"}])
    elapsed = time.monotonic() - start

    assert result == "resposta vertex"
    assert elapsed < _FAST_FAIL_BUDGET_SECONDS
    openrouter.call.assert_called_once()
    vertex.call.assert_called_once()


def test_5xx_error_skips_to_next_link_without_waiting_full_timeout():
    """Qualquer 5xx (indisponibilidade do provedor) deve pular imediatamente para o
    próximo elo, sem esperar o timeout ambíguo completo."""
    openrouter = MagicMock()
    openrouter.call.side_effect = litellm_exceptions.InternalServerError(
        "internal server error",
        llm_provider="openrouter",
        model="meta-llama/llama-3.3-8b-instruct:free",
    )
    vertex = MagicMock()
    vertex.call.return_value = "resposta vertex"

    llm = FallbackLLM(
        primary=openrouter,
        fallback=vertex,
        model="openrouter-primary+vertex-fallback",
        ambiguous_timeout_seconds=_SHORT_AMBIGUOUS_TIMEOUT,
    )

    start = time.monotonic()
    result = llm.call(messages=[{"role": "user", "content": "oi"}])
    elapsed = time.monotonic() - start

    assert result == "resposta vertex"
    assert elapsed < _FAST_FAIL_BUDGET_SECONDS
    openrouter.call.assert_called_once()
    vertex.call.assert_called_once()


def test_connection_error_skips_to_next_link_without_waiting_full_timeout():
    """Erro de conexão/DNS (o provedor nunca chegou a responder) deve pular
    imediatamente para o próximo elo, sem esperar o timeout ambíguo completo."""
    openrouter = MagicMock()
    openrouter.call.side_effect = litellm_exceptions.APIConnectionError(
        "connection refused",
        llm_provider="openrouter",
        model="meta-llama/llama-3.3-8b-instruct:free",
    )
    vertex = MagicMock()
    vertex.call.return_value = "resposta vertex"

    llm = FallbackLLM(
        primary=openrouter,
        fallback=vertex,
        model="openrouter-primary+vertex-fallback",
        ambiguous_timeout_seconds=_SHORT_AMBIGUOUS_TIMEOUT,
    )

    start = time.monotonic()
    result = llm.call(messages=[{"role": "user", "content": "oi"}])
    elapsed = time.monotonic() - start

    assert result == "resposta vertex"
    assert elapsed < _FAST_FAIL_BUDGET_SECONDS
    openrouter.call.assert_called_once()
    vertex.call.assert_called_once()


def test_ambiguous_hang_falls_back_after_bounded_timeout():
    """Caso ambíguo: a chamada não retorna erro nem sucesso (ex.: read hang). O
    timeout curto delimita a espera antes de cair para o próximo elo — ao contrário
    dos casos com código de erro claro, aqui a espera é esperada (bounded)."""

    def _hang(messages, **kwargs):
        time.sleep(_SHORT_AMBIGUOUS_TIMEOUT + 5)
        return "nunca deveria chegar aqui"

    primary = MagicMock()
    primary.call.side_effect = _hang
    fallback = MagicMock()
    fallback.call.return_value = "resposta do próximo elo"

    llm = FallbackLLM(
        primary=primary,
        fallback=fallback,
        model="hang-primary+fallback",
        ambiguous_timeout_seconds=1,
    )

    start = time.monotonic()
    result = llm.call(messages=[{"role": "user", "content": "oi"}])
    elapsed = time.monotonic() - start

    assert result == "resposta do próximo elo"
    # Espera limitada ao timeout ambíguo configurado (com folga), não aos 5s extras
    # do hang simulado.
    assert elapsed < 3
    fallback.call.assert_called_once()


def test_provider_builders_disable_litellm_internal_retries(channel):
    """Issue #429 (follow-up): cada LLM da cadeia deve ser construído com
    num_retries=0, para que o litellm/SDK do provedor não faça retry-com-backoff
    internamente antes de propagar a exceção (o que introduziria espera artificial
    mesmo com um erro de código claro)."""
    adapter, mock_llm_cls = _make_adapter_with_env(
        channel,
        {
            "GOOGLE_AI_STUDIO_API_KEY": "y" * 25,
            "OPENROUTER_API_KEY": "z" * 25,
            "VERTEX_AI_API_KEY": "x" * 25,
            "GCP_PROJECT_ID": "test-project",
        },
    )

    assert mock_llm_cls.call_count == 3
    for call in mock_llm_cls.call_args_list:
        assert call.kwargs.get("num_retries") == 0
