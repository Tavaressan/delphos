"""Regressão da issue #391: retry infinito no RabbitMQ envenena o worker com
`StackDepthExceededError` em cascata.

O event bus do CrewAI (crewai.events.event_context) guarda a pilha de escopos de
evento em `contextvars.ContextVar`s de módulo, com limite rígido de 100. Uma exceção
não tratada no meio de uma execução deixa escopos órfãos empilhados; como o worker
processa todos os jobs na mesma thread/contexto (o loop de consumo do pika), sem
isolamento esses órfãos se acumulam entre execuções até estourar o limite e derrubar
permanentemente todas as execuções seguintes — mesmo depois de a causa raiz das
falhas originais já ter sido corrigida. `docker restart` zera a pilha, confirmando
que o estado vazado é do processo, não dos dados.

Estes testes cobrem as duas defesas implementadas em src/main.py:
1. Isolamento por job via `contextvars.copy_context().run(...)` — a correção de
   fundo, que impede o vazamento na origem.
2. Rede de segurança — o processo se encerra (`os._exit`) após N falhas
   consecutivas por StackDepthExceededError, contando com `restart: on-failure`
   (docker-compose.yml) para recriar o container caso o vazamento ocorra por
   outro caminho não coberto pelo isolamento de contexto.
"""

import json
from unittest.mock import MagicMock, patch

import pytest

import main
from crewai.events import event_context
from crewai.events.event_context import StackDepthExceededError


def _make_method(delivery_tag=1):
    method = MagicMock()
    method.delivery_tag = delivery_tag
    return method


def _job_body(execution_id="exec-1"):
    return json.dumps(
        {
            "execution_id": execution_id,
            "tenant_id": "tenant-1",
            "prompt_final": "Oi",
            "agent_id": "agent-real",
        }
    ).encode()


@pytest.fixture(autouse=True)
def _reset_worker_state():
    """Cada teste começa com contador zerado e a pilha real do event bus limpa,
    para não vazar estado entre casos de teste (o próprio bug que estamos
    testando, aplicado ao ambiente de teste)."""
    main._consecutive_stack_errors = 0
    event_context.restore_event_scope(())
    yield
    main._consecutive_stack_errors = 0
    event_context.restore_event_scope(())


def test_process_job_isolates_leaked_event_scope_between_jobs(monkeypatch, tmp_path):
    """Um job cuja execução falha no meio (após empilhar um escopo de evento, sem
    o pop correspondente) não deve deixar esse escopo visível para o job seguinte
    processado na mesma thread."""
    monkeypatch.setattr(main, "HEALTH_FILE", str(tmp_path / "health.json"))

    def leaking_execute():
        # Reproduz o padrão real: crewai empilha o escopo (ex.: task_started) e
        # uma exceção não tratada interrompe o fluxo antes do "ending event"
        # correspondente, sem dar pop.
        event_context.push_event_scope("evt-leak", "task_started")
        raise RuntimeError("Simulated LLM failure mid-execution")

    ch = MagicMock()
    with patch("main.CrewAiRuntimeAdapter") as MockAdapter:
        MockAdapter.return_value.execute.side_effect = leaking_execute
        main.process_job(ch, _make_method(1), None, _job_body("exec-leak"))

    ch.basic_nack.assert_called_once_with(delivery_tag=1, requeue=False)

    # Sem isolamento de contexto, a pilha do contexto real (o mesmo usado pelo
    # próximo job) conteria o escopo órfão "evt-leak" aqui. Com
    # contextvars.copy_context().run() em main.process_job, a mutação ficou
    # confinada à cópia descartável do contexto e nunca chegou até aqui.
    assert event_context._event_id_stack.get() == ()


def test_repeated_leaking_failures_never_exhaust_the_real_stack(monkeypatch, tmp_path):
    """Mesmo com dezenas de execuções falhando e vazando escopos, o processo não
    deve acumular profundidade real na pilha do event bus — cada job começa do
    zero. Sem o isolamento por contexto, a 101ª falha deste tipo estouraria
    StackDepthExceededError (limite 100), exatamente como relatado na issue #391."""
    monkeypatch.setattr(main, "HEALTH_FILE", str(tmp_path / "health.json"))

    def leaking_execute():
        event_context.push_event_scope("evt-leak", "task_started")
        raise RuntimeError("Simulated LLM failure mid-execution")

    ch = MagicMock()
    with patch("main.CrewAiRuntimeAdapter") as MockAdapter:
        MockAdapter.return_value.execute.side_effect = leaking_execute
        for i in range(150):
            main.process_job(ch, _make_method(i), None, _job_body(f"exec-{i}"))

    assert event_context._event_id_stack.get() == ()
    assert ch.basic_nack.call_count == 150


def test_process_job_exits_after_consecutive_stack_depth_errors(monkeypatch, tmp_path):
    """Rede de segurança: se o job falhar repetidamente com StackDepthExceededError
    de verdade (o sintoma observado na issue, caso o vazamento ocorra por um
    caminho não coberto pelo isolamento de contexto), o worker deve se encerrar
    ao atingir o limiar configurado, para que `restart: on-failure` recrie o
    container e zere o event bus."""
    health_file = tmp_path / "health.json"
    monkeypatch.setattr(main, "HEALTH_FILE", str(health_file))
    monkeypatch.setattr(main, "POISON_THRESHOLD", 2)

    exit_codes = []

    def fake_exit(code):
        exit_codes.append(code)
        # Interrompe o teste como o os._exit real interromperia o processo,
        # sem deixar o restante de _process_job_impl continuar executando.
        raise SystemExit(code)

    monkeypatch.setattr(main.os, "_exit", fake_exit)

    ch = MagicMock()
    with patch("main.CrewAiRuntimeAdapter") as MockAdapter:
        MockAdapter.return_value.execute.side_effect = StackDepthExceededError(
            "Event stack depth limit (100) exceeded."
        )

        # 1ª falha consecutiva: abaixo do limiar (2), processo continua vivo.
        main.process_job(ch, _make_method(1), None, _job_body("exec-1"))
        assert exit_codes == []
        assert main._consecutive_stack_errors == 1
        assert json.loads(health_file.read_text())["consecutive_stack_errors"] == 1

        # 2ª falha consecutiva: atinge o limiar, processo se encerra.
        with pytest.raises(SystemExit):
            main.process_job(ch, _make_method(2), None, _job_body("exec-2"))

    assert exit_codes == [1]


def test_success_resets_consecutive_stack_error_counter(monkeypatch, tmp_path):
    """Uma execução bem-sucedida zera o contador de falhas consecutivas — o
    limiar da rede de segurança só deve disparar para uma rajada ininterrupta de
    StackDepthExceededError, não para ocorrências esparsas intercaladas com
    sucesso."""
    health_file = tmp_path / "health.json"
    monkeypatch.setattr(main, "HEALTH_FILE", str(health_file))
    main._consecutive_stack_errors = 3

    ch = MagicMock()
    with patch("main.CrewAiRuntimeAdapter") as MockAdapter:
        MockAdapter.return_value.execute.return_value = "ok"
        main.process_job(ch, _make_method(1), None, _job_body("exec-ok"))

    assert main._consecutive_stack_errors == 0
    assert json.loads(health_file.read_text())["consecutive_stack_errors"] == 0
    ch.basic_ack.assert_called_once_with(delivery_tag=1)


def test_non_stack_depth_failure_does_not_count_toward_poison_threshold(
    monkeypatch, tmp_path
):
    """Um erro comum (ex.: falha de LLM, agent_id inexistente) não deve contar
    para o limiar de auto-encerramento — só StackDepthExceededError indica o
    event bus envenenado."""
    health_file = tmp_path / "health.json"
    monkeypatch.setattr(main, "HEALTH_FILE", str(health_file))
    monkeypatch.setattr(main, "POISON_THRESHOLD", 1)

    exit_codes = []

    def fake_exit(code):
        exit_codes.append(code)
        raise SystemExit(code)

    monkeypatch.setattr(main.os, "_exit", fake_exit)

    ch = MagicMock()
    with patch("main.CrewAiRuntimeAdapter") as MockAdapter:
        MockAdapter.return_value.execute.side_effect = RuntimeError("LLM timeout")
        main.process_job(ch, _make_method(1), None, _job_body("exec-other"))

    assert exit_codes == []
    assert main._consecutive_stack_errors == 0
    assert json.loads(health_file.read_text())["consecutive_stack_errors"] == 0
