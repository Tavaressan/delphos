"""Testes de sanidade estrutural para .github/workflows/ci.yml.

Cobrem as issues:
- #77: filtro de paths do job `changes` era auto-referente (cada modulo
  listava .github/workflows/ci.yml diretamente) e nao definia `base`
  explicito para eventos push.
- #87: pipeline nao possui fallback seguro quando dorny/paths-filter falha
  ou nao consegue calcular o diff -- os jobs devem rodar tudo por padrao,
  nunca pular silenciosamente.
- #86: falta job de build de imagens Docker no CI.

Nao executam o workflow (nao ha `act` disponivel no ambiente) -- validam a
estrutura do YAML, que e o que garante que as regras acima estao
codificadas corretamente.
"""
import pathlib

import yaml

WORKFLOW_PATH = (
    pathlib.Path(__file__).resolve().parents[2] / ".github" / "workflows" / "ci.yml"
)

MODULE_FILTERS = ("rust", "java", "frontend", "python")


def _load_workflow():
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _changes_job(workflow):
    return workflow["jobs"]["changes"]


def _filter_step(changes_job):
    for step in changes_job["steps"]:
        if step.get("uses", "").startswith("dorny/paths-filter"):
            return step
    raise AssertionError("Nenhum step usando dorny/paths-filter encontrado")


def _filters_yaml(changes_job):
    filter_step = _filter_step(changes_job)
    return yaml.safe_load(filter_step["with"]["filters"])


def test_workflow_is_valid_yaml():
    workflow = _load_workflow()
    assert "jobs" in workflow
    assert "changes" in workflow["jobs"]


def test_module_filters_are_not_self_referential():
    """Nenhum filtro de modulo deve listar o proprio ci.yml (issue #77)."""
    workflow = _load_workflow()
    filters = _filters_yaml(_changes_job(workflow))
    for name in MODULE_FILTERS:
        assert name in filters, f"filtro '{name}' ausente"
        paths = filters[name]
        assert not any(
            ".github/workflows/ci.yml" in p for p in paths
        ), f"filtro '{name}' ainda referencia ci.yml diretamente (auto-referente)"


def test_dedicated_ci_workflow_filter_exists():
    """Deve existir um filtro dedicado para mudancas no proprio workflow."""
    workflow = _load_workflow()
    filters = _filters_yaml(_changes_job(workflow))
    assert "ci_workflow" in filters
    assert any(".github/workflows/ci.yml" in p for p in filters["ci_workflow"])


def test_paths_filter_has_explicit_base_for_push():
    """dorny/paths-filter deve receber `base` explicito (issue #77)."""
    workflow = _load_workflow()
    filter_step = _filter_step(_changes_job(workflow))
    base = filter_step.get("with", {}).get("base")
    assert base, "step dorny/paths-filter precisa definir `base` explicitamente"


def test_paths_filter_step_is_fail_safe():
    """O step do paths-filter nao pode derrubar o job `changes` (issue #87).

    Se `dorny/paths-filter` falhar, o job `changes` deve continuar e um
    step de normalizacao deve assumir 'true' para todos os modulos, em vez
    de deixar os jobs dependentes serem pulados silenciosamente.
    """
    workflow = _load_workflow()
    changes_job = _changes_job(workflow)
    filter_step = _filter_step(changes_job)
    assert filter_step.get("continue-on-error") is True, (
        "step dorny/paths-filter deve ter continue-on-error: true para nao "
        "derrubar o job `changes` em caso de falha de calculo de diff"
    )

    normalize_step = None
    for step in changes_job["steps"]:
        if step.get("id") == "normalize":
            normalize_step = step
            break
    assert normalize_step is not None, (
        "job `changes` precisa de um step de normalizacao (id: normalize) "
        "que define os outputs finais"
    )
    assert normalize_step.get("if") == "always()", (
        "step de normalizacao precisa rodar sempre (if: always()), mesmo "
        "se o paths-filter falhar"
    )
    run_script = normalize_step.get("run", "")
    for name in MODULE_FILTERS:
        assert f"{name}=true" in run_script, (
            f"step de normalizacao precisa ter um caminho de fallback que "
            f"define {name}=true quando o filtro falha"
        )


def test_job_outputs_come_from_normalize_step():
    """Os outputs do job `changes` devem vir do step de normalizacao, nao
    diretamente do paths-filter -- caso contrario o fallback nao tem efeito."""
    workflow = _load_workflow()
    changes_job = _changes_job(workflow)
    outputs = changes_job.get("outputs", {})
    for name in MODULE_FILTERS:
        assert name in outputs
        assert "steps.normalize.outputs." in outputs[name], (
            f"output '{name}' do job changes deve vir de steps.normalize, "
            f"nao diretamente de steps.filter"
        )


def test_native_module_jobs_still_present():
    """Os jobs de build nativo existentes nao podem ser removidos (issue #86
    pede jobs adicionais de Docker, em paralelo, nao substitutos)."""
    workflow = _load_workflow()
    jobs = workflow["jobs"]
    for job_name in ("rust-check", "java-check", "frontend-check", "python-ci"):
        assert job_name in jobs, f"job nativo '{job_name}' nao deve ser removido"


def test_e2e_integration_job_exists_and_runs_with_mock_llm():
    """Deve existir um job que sobe o docker-compose completo e roda a suite
    E2E (tests/e2e/runner.test.js) usando providers mockados de LLM, para
    validar containers reais se comunicando entre si sem depender de
    credenciais da Vertex AI ou de rede externa."""
    workflow = _load_workflow()
    jobs = workflow["jobs"]
    assert "e2e-integration" in jobs, "job de integracao E2E via docker-compose nao encontrado"

    job = jobs["e2e-integration"]

    needs = job.get("needs")
    needs_set = {needs} if isinstance(needs, str) else set(needs or [])
    assert needs_set == {"changes"}, (
        "job 'e2e-integration' deve depender apenas de 'changes' (rodar em "
        "paralelo aos jobs nativos e de docker-build, nao apos eles)"
    )

    condition = job.get("if", "")
    for name in MODULE_FILTERS:
        assert f"needs.changes.outputs.{name}" in condition, (
            f"job 'e2e-integration' deve rodar quando o modulo '{name}' mudar"
        )

    run_steps = " ".join(step.get("run", "") for step in job["steps"])

    assert "-f docker-compose.yml" in run_steps, (
        "job 'e2e-integration' deve usar '-f docker-compose.yml' explicito "
        "para NAO mesclar o docker-compose.override.yml (que forca "
        "EMBEDDING_PROVIDER=real para desenvolvimento local)"
    )
    assert "EMBEDDING_PROVIDER=mock" in run_steps
    assert "LLM_PROVIDER=mock" in run_steps
    assert "CREW_WORKER_MODE=mock" in run_steps
    assert "npm run test:e2e" in run_steps

    teardown_steps = [s for s in job["steps"] if "down" in s.get("run", "")]
    assert teardown_steps, "job 'e2e-integration' deve derrubar a stack no final"
    assert any(s.get("if") == "always()" for s in teardown_steps), (
        "o teardown do docker-compose deve rodar com if: always(), mesmo se "
        "os testes E2E falharem"
    )


def test_docker_build_jobs_exist_and_run_in_parallel():
    """Issue #86: deve existir ao menos um job de build de imagem Docker,
    condicionado ao path-filter corrigido e rodando em paralelo aos jobs
    nativos (needs: changes, nao needs: <job-nativo>)."""
    workflow = _load_workflow()
    jobs = workflow["jobs"]
    docker_jobs = [
        name for name, job in jobs.items() if "docker" in name.lower()
    ]
    assert docker_jobs, "nenhum job de build de imagem Docker encontrado"

    native_job_names = {"rust-check", "java-check", "frontend-check", "python-ci"}
    for name in docker_jobs:
        job = jobs[name]
        needs = job.get("needs")
        needs_set = {needs} if isinstance(needs, str) else set(needs or [])
        assert "changes" in needs_set, f"job '{name}' deve depender de 'changes'"
        assert not (needs_set & native_job_names), (
            f"job '{name}' nao deve depender dos jobs nativos "
            f"(deve rodar em paralelo, nao apos eles)"
        )
        assert job.get("if"), f"job '{name}' deve ser condicionado ao path-filter"
