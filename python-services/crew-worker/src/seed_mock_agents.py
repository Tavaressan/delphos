"""
Seed dos 4 agentes mockados do MVP.

Pré-requisito: stack completa rodando (docker compose up -d).

Uso:
    cd python-services/crew-worker
    python src/seed_mock_agents.py [--base-url http://localhost:8080] [--tenant-id <uuid>]
"""

import argparse
import io
import json
import os
import sys
import zipfile

import requests

BASE_DIR = os.path.join(os.path.dirname(__file__), "mock_agents")

AGENTS = [
    {
        "name": "Agente de Compliance de Elevadores",
        "tag": "compliance",
        "subdir": "compliance",
        "files": [
            "instructions.md",
            "norma_abnt_nbr_7192.md",
            "norma_nr18_elevadores.md",
        ],
    },
    {
        "name": "Agente de Piso",
        "tag": "piso",
        "subdir": "piso",
        "files": [
            "instructions.md",
            "floor_calculator.py",
            "especificacoes_piso.md",
        ],
    },
    {
        "name": "Agente Catálogo Elevadores Alfabra",
        "tag": "catalogo",
        "subdir": "catalogo",
        "files": [
            "instructions.md",
            "catalogo_elevadores_alfabra.md",
        ],
    },
    {
        "name": "Agente Orquestrador",
        "tag": "orquestrador",
        "subdir": "orquestrador",
        "files": [
            "instructions.md",
        ],
    },
]


def build_zip(subdir: str, files: list) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for filename in files:
            path = os.path.join(BASE_DIR, subdir, filename)
            with open(path, "rb") as f:
                zf.writestr(filename, f.read())
    return buf.getvalue()


def create_agent(base_url: str, name: str, zip_bytes: bytes, tenant_id: str) -> dict:
    url = f"{base_url}/api/admin/agents"
    resp = requests.post(
        url,
        data={"name": name, "tenantId": tenant_id},
        files={"file": ("agent.zip", zip_bytes, "application/zip")},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def update_tag(base_url: str, agent_id: str, tag: str) -> None:
    url = f"{base_url}/api/admin/agents/{agent_id}"
    resp = requests.put(url, json={"tag": tag}, timeout=10)
    resp.raise_for_status()


def publish_agent(base_url: str, agent_id: str) -> None:
    url = f"{base_url}/api/admin/agents/{agent_id}/publish"
    resp = requests.patch(url, timeout=10)
    resp.raise_for_status()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument(
        "--tenant-id", default="00000000-0000-0000-0000-000000000000"
    )
    args = parser.parse_args()

    created = {}
    for agent_def in AGENTS:
        name = agent_def["name"]
        print(f"\n[seed] Criando: {name}")

        zip_bytes = build_zip(agent_def["subdir"], agent_def["files"])
        print(f"  ZIP: {len(zip_bytes)} bytes, {len(agent_def['files'])} arquivo(s)")

        try:
            agent = create_agent(args.base_url, name, zip_bytes, args.tenant_id)
        except requests.HTTPError as e:
            print(f"  ERRO ao criar agente: {e.response.status_code} {e.response.text}")
            sys.exit(1)

        agent_id = agent["id"]
        print(f"  Criado com ID: {agent_id}")

        update_tag(args.base_url, agent_id, agent_def["tag"])
        print(f"  Tag definida: {agent_def['tag']}")

        publish_agent(args.base_url, agent_id)
        print(f"  Publicado.")

        created[agent_def["tag"]] = agent_id

    print("\n" + "=" * 60)
    print("Agentes criados com sucesso:")
    for tag, agent_id in created.items():
        print(f"  {tag}: {agent_id}")
    print("=" * 60)
    print(json.dumps(created, indent=2))


if __name__ == "__main__":
    main()
