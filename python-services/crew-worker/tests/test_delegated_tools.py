import json
import pytest
from unittest.mock import MagicMock, patch, call
import sys
import os

# Ensure python can locate local packages
sys.path.append(os.path.join(os.path.dirname(__file__), "../src"))

from tools.delegated_search_tool import DelegatedSearchTool


@pytest.fixture
def mock_channel():
    ch = MagicMock()
    return ch


def test_delegated_search_success(mock_channel):
    # Arrange
    tool = DelegatedSearchTool(
        channel=mock_channel, execution_id="exec-001", tenant_id="tenant-abc"
    )

    # Simula resposta feliz de busca vetorial na fila de eventos
    mock_response_payload = {
        "execution_id": "exec-001",
        "status": "COMPLETED",
        "results": [
            {
                "chunk_id": "chunk-1",
                "text": "Texto relevante sobre elevadores Alfabra.",
                "score": 0.95,
            }
        ],
        "error_message": None,
    }

    # Mockando basic_consume e process_data_events para retornar a mensagem imediatamente
    def mock_consume(queue, on_message_callback, **kwargs):
        # Dispara o callback simulando o recebimento da resposta
        method = MagicMock()
        properties = MagicMock()
        properties.correlation_id = "exec-001"
        body = json.dumps(mock_response_payload).encode()
        on_message_callback(mock_channel, method, properties, body)
        return "consumer-tag-1"

    mock_channel.basic_consume.side_effect = mock_consume

    # Act
    result = tool._run(query="velocidade elevador")

    # Assert
    assert "Texto relevante sobre elevadores Alfabra" in result
    mock_channel.basic_publish.assert_called_once()
    publish_args = mock_channel.basic_publish.call_args
    assert publish_args.kwargs["routing_key"] == "agent.retrieval.delegated.requested"
    payload = json.loads(publish_args.kwargs["body"])
    assert payload["query"] == "velocidade elevador"
    assert payload["execution_id"] == "exec-001"


def test_delegated_search_retry_and_success_on_third_try(mock_channel):
    # Arrange
    tool = DelegatedSearchTool(
        channel=mock_channel, execution_id="exec-001", tenant_id="tenant-abc"
    )

    attempt_counter = 0

    def mock_consume(queue, on_message_callback, **kwargs):
        nonlocal attempt_counter
        attempt_counter += 1
        if attempt_counter == 3:
            # Responde apenas na 3a tentativa
            mock_response_payload = {
                "execution_id": "exec-001",
                "status": "COMPLETED",
                "results": [
                    {
                        "chunk_id": "chunk-1",
                        "text": "Resposta na terceira tentativa.",
                        "score": 0.85,
                    }
                ],
                "error_message": None,
            }
            method = MagicMock()
            properties = MagicMock()
            properties.correlation_id = "exec-001"
            body = json.dumps(mock_response_payload).encode()
            on_message_callback(mock_channel, method, properties, body)
        else:
            # Simula timeout nas duas primeiras tentativas lançando TimeoutError ou não disparando callback
            # No runtime, se o callback não for disparado, a ferramenta detecta timeout.
            pass
        return "consumer-tag"

    mock_channel.basic_consume.side_effect = mock_consume

    # Act
    with patch("time.sleep") as mock_sleep:  # evitar delay real nos testes
        result = tool._run(query="teste retry")

    # Assert
    assert "Resposta na terceira tentativa." in result
    assert attempt_counter == 3
    assert mock_channel.basic_publish.call_count == 3


def test_delegated_search_all_fails_triggers_fallback(mock_channel):
    # Arrange
    tool = DelegatedSearchTool(
        channel=mock_channel, execution_id="exec-001", tenant_id="tenant-abc"
    )

    # Simula nenhum callback sendo disparado (todas as 3 tentativas dão timeout)
    # mock_channel.basic_consume não dispara nada.

    # Act
    with patch("time.sleep") as mock_sleep:
        result = tool._run(query="teste falha total")

    # Assert
    # Deve retornar a mensagem suave de fallback silencioso
    assert "Ocorreu uma instabilidade na busca de conhecimentos" in result
    assert mock_channel.basic_publish.call_count == 3
