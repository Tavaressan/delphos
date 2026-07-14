#!/usr/bin/env python3
"""Validação estática do workflow de CD (.github/workflows/cd.yml).

Não substitui `actionlint` (indisponível no sandbox local), mas garante que o
YAML é válido e que a issue #159 está coberta: trigger via workflow_run após
o CI, workflow_dispatch para dry-run manual, OIDC (id-token: write) e um job
de deploy por módulo com Dockerfile, escopado pelo mesmo path-filter do job
`changes` de ci.yml.
"""
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
CD_PATH = REPO_ROOT / ".github" / "workflows" / "cd.yml"

EXPECTED_MODULE_JOBS = {
    "deploy-java": "java",
    "deploy-rust": "rust",
    "deploy-python": "python",
}

EXPECTED_RUST_SERVICES = {
    "embedding-service",
    "ingestion-worker",
    "rag-worker",
    "workflow-worker",
    "document-processing",
}

FORBIDDEN_SNIPPETS = (
    "-----BEGIN PRIVATE KEY-----",
    "type: service_account",
)


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def main() -> None:
    if not CD_PATH.exists():
        fail(f"{CD_PATH} não existe")

    raw = CD_PATH.read_text()
    for snippet in FORBIDDEN_SNIPPETS:
        if snippet in raw:
            fail(f"credencial em texto plano encontrada no workflow ({snippet!r})")

    doc = yaml.safe_load(raw)
    if not isinstance(doc, dict):
        fail("cd.yml não é um mapeamento YAML válido")

    # PyYAML interpreta a chave `on:` como booleano True — normaliza.
    triggers = doc.get(True, doc.get("on"))
    if triggers is None:
        fail("workflow sem seção 'on'")

    if "workflow_run" not in triggers:
        fail("workflow deve disparar via workflow_run (após o CI passar)")
    if "workflow_dispatch" not in triggers:
        fail("workflow deve suportar workflow_dispatch (dry-run manual)")

    dispatch_inputs = (triggers.get("workflow_dispatch") or {}).get("inputs", {})
    if "dry_run" not in dispatch_inputs:
        fail("workflow_dispatch deve expor input 'dry_run' para validação em staging")

    permissions = doc.get("permissions", {})
    if permissions.get("id-token") != "write":
        fail("permissions.id-token deve ser 'write' (necessário para OIDC/WIF)")

    jobs = doc.get("jobs", {})
    if "changes" not in jobs:
        fail("workflow deve ter um job 'changes' (path-filter por módulo)")

    for job_name, module in EXPECTED_MODULE_JOBS.items():
        job = jobs.get(job_name)
        if job is None:
            fail(f"job '{job_name}' ausente")
        job_if = job.get("if", "")
        if f"needs.changes.outputs.{module}" not in job_if:
            fail(f"job '{job_name}' deve ser escopado por needs.changes.outputs.{module}")

    rust_job = jobs["deploy-rust"]
    matrix_services = set(
        rust_job.get("strategy", {}).get("matrix", {}).get("service", [])
    )
    if matrix_services != EXPECTED_RUST_SERVICES:
        fail(
            "matrix de deploy-rust deve cobrir exatamente os 5 serviços rust-services/*: "
            f"esperado {sorted(EXPECTED_RUST_SERVICES)}, obtido {sorted(matrix_services)}"
        )

    for job_name, job in jobs.items():
        steps = job.get("steps", [])
        for step in steps:
            uses = step.get("uses", "")
            if "auth" in uses and "google-github-actions/auth" not in uses:
                continue
            if step.get("with", {}).get("credentials_json"):
                fail(
                    f"job '{job_name}' usa credentials_json em texto plano — use "
                    "workload_identity_provider (OIDC)"
                )

    print("OK: cd.yml cobre trigger workflow_run+workflow_dispatch, OIDC e "
          f"jobs de deploy para {sorted(EXPECTED_MODULE_JOBS)}")


if __name__ == "__main__":
    main()
