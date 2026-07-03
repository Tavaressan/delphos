"""
Seed dos 4 agentes mockados do MVP.

Pré-requisito: stack completa rodando (docker compose up -d).

Uso:
    cd python-services/crew-worker
    python src/seed_mock_agents.py [--base-url http://localhost:8080] [--tenant-id <uuid>]

Idempotência: antes de criar um agente, o script consulta os agentes já
existentes do tenant (GET /api/agents) e casa por `tag`. Se um agente com a
mesma tag já existir, ele é reaproveitado (publicando-o caso ainda não esteja
PUBLISHED) em vez de criar um duplicado. Isso permite rodar o script (ou
`demo_agents.py`, que o reutiliza) várias vezes com segurança.
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


def list_agents(base_url: str, tenant_id: str) -> list:
    url = f"{base_url}/api/agents"
    resp = requests.get(url, params={"tenantId": tenant_id}, timeout=10)
    resp.raise_for_status()
    return resp.json()


def find_existing_agent(agents: list, tag: str, name: str) -> dict:
    """Casa um agente já existente pela tag e, como fallback, pelo nome.

    A tag é o identificador estável usado pelo demo/seed; o nome é um
    fallback para o caso raro de uma execução anterior ter sido
    interrompida entre a criação do agente e a definição da tag.
    """
    for agent in agents:
        if agent.get("tag") == tag:
            return agent
    for agent in agents:
        if agent.get("name") == name and not agent.get("tag"):
            return agent
    return None


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


def ensure_agents(base_url: str, tenant_id: str) -> dict:
    """Garante que os 4 agentes mockados existem e estão publicados.

    Idempotente: reaproveita agentes já cadastrados (casados por tag) em vez
    de criar duplicados a cada execução. Retorna um dict {tag: agent_id}.
    """
    try:
        existing_agents = list_agents(base_url, tenant_id)
    except requests.HTTPError as e:
        print(f"  AVISO: não foi possível listar agentes existentes ({e}). Prosseguindo como se não houvesse nenhum.")
        existing_agents = []

    created = {}
    for agent_def in AGENTS:
        name = agent_def["name"]
        tag = agent_def["tag"]

        match = find_existing_agent(existing_agents, tag, name)
        if match is not None:
            agent_id = match["id"]
            status = match.get("status")
            print(f"\n[seed] Agente já existe: {name} (tag={tag}, id={agent_id}, status={status})")
            if status != "PUBLISHED":
                publish_agent(base_url, agent_id)
                print("  Publicado agora (estava despublicado).")
            created[tag] = agent_id
            continue

        print(f"\n[seed] Criando: {name}")

        zip_bytes = build_zip(agent_def["subdir"], agent_def["files"])
        print(f"  ZIP: {len(zip_bytes)} bytes, {len(agent_def['files'])} arquivo(s)")

        try:
            agent = create_agent(base_url, name, zip_bytes, tenant_id)
        except requests.HTTPError as e:
            print(f"  ERRO ao criar agente: {e.response.status_code} {e.response.text}")
            sys.exit(1)

        agent_id = agent["id"]
        print(f"  Criado com ID: {agent_id}")

        update_tag(base_url, agent_id, tag)
        print(f"  Tag definida: {tag}")

        publish_agent(base_url, agent_id)
        print("  Publicado.")

        created[tag] = agent_id

    return created


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--tenant-id", default="00000000-0000-0000-0000-000000000000")
    args = parser.parse_args()

    created = ensure_agents(args.base_url, args.tenant_id)

    print("\n" + "=" * 60)
    print("Agentes prontos (criados ou já existentes) e publicados:")
    for tag, agent_id in created.items():
        print(f"  {tag}: {agent_id}")
    print("=" * 60)
    print(json.dumps(created, indent=2))


if __name__ == "__main__":
    main()
