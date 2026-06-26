import os
import requests
import psycopg2
import uuid


def seed():
    # 1. Prepare texts
    texts = [
        "O elevador modelo Alfabra XYZ é um sistema de alta performance projetado para edifícios comerciais. Ele possui capacidade para até 16 passageiros (1200 kg), velocidade nominal de 2.5 m/s, e utiliza uma máquina de tração sem engrenagem (gearless) de ímãs permanentes. A periodicidade de manutenção preventiva recomendada pelo fabricante para o modelo Alfabra XYZ é de 15 dias para limpeza de trilhos, mensal para os cabos de tração, sensores e freios, e semestral para a verificação do quadro de comando eletrônico.",
        "Especificações Técnicas Alfabra XYZ: Cabina com acabamento em aço inoxidável escovado, iluminação LED com desligamento automático, portas telescópicas de abertura lateral de 900mm. O sistema de controle de cabina gerencia a velocidade dinamicamente de acordo com a carga física. A lubrificação das guias da cabina deve ser realizada a cada 60 dias com lubrificante recomendado.",
    ]

    # 2. Get embeddings from embedding-service
    emb_url = "http://embedding-service:8000/embeddings"
    print(f"Requesting embeddings from {emb_url}...")

    embeddings = []
    for text in texts:
        resp = requests.post(
            emb_url, json={"input": [text], "dimensions": 768}, timeout=10
        )
        if resp.status_code != 200:
            raise Exception(
                f"Failed to get embeddings: {resp.status_code} - {resp.text}"
            )
        embeddings.append(resp.json()["data"][0]["embedding"])

    # 3. Connect to database
    db_url = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/rag_db"
    )
    print(f"Connecting to database at {db_url}...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Tenants to seed
    tenants = [
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",  # E2E test tenant
        "d3b07384-d113-4ec2-a5d6-c8a7b6cf9110",  # User tenant
    ]

    cur.execute("SELECT id FROM users WHERE username = 'admin' LIMIT 1")
    row = cur.fetchone()
    if not row:
        raise Exception("Usuário 'admin' não encontrado no banco. Execute a stack completa antes do seed.")
    user_id = str(row[0])

    for tenant in tenants:
        print(f"Seeding for tenant {tenant}...")

        # Insert document metadata
        doc_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO documents (id, name, file_path, file_size, file_type, created_by, status, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (
                doc_id,
                "manual_alfabra_xyz.pdf",
                "manual_alfabra_xyz.pdf",
                4096,
                "pdf",
                user_id,
                "INDEXED",
                tenant,
            ),
        )

        # Insert chunks
        for idx, (text, emb) in enumerate(zip(texts, embeddings)):
            chunk_id = str(uuid.uuid4())
            emb_str = "[" + ",".join(map(str, emb)) + "]"
            cur.execute(
                """
                INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding, page_number, tenant_id)
                VALUES (%s, %s, %s, %s, %s::vector, %s, %s)
                """,
                (chunk_id, doc_id, idx, text, emb_str, 1, tenant),
            )

    conn.commit()
    cur.close()
    conn.close()
    print("Seeding completed successfully!")


if __name__ == "__main__":
    seed()
