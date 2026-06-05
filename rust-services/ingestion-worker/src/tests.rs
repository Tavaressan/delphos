use super::*;

#[test]
fn test_chunk_text() {
    let text = "abcdefghij";
    let chunks = chunk_text(text, 3, 1);
    assert_eq!(chunks.len(), 5);
    assert_eq!(chunks[0], "abc");
    assert_eq!(chunks[1], "cde");
    assert_eq!(chunks[2], "efg");
    assert_eq!(chunks[3], "ghi");
    assert_eq!(chunks[4], "ij");
}

#[test]
fn test_generate_mock_embedding() {
    let text1 = "Qualidade e conformidade";
    let text2 = "Outro texto de teste";
    
    let emb1_a = generate_mock_embedding(text1, 1536);
    let emb1_b = generate_mock_embedding(text1, 1536);
    let emb2 = generate_mock_embedding(text2, 1536);
    
    assert_eq!(emb1_a, emb1_b);
    assert_ne!(emb1_a, emb2);
    assert_eq!(emb1_a.len(), 1536);
    
    let mut sum_sq = 0.0;
    for v in &emb1_a {
        sum_sq += v * v;
    }
    let diff = (sum_sq - 1.0).abs();
    assert!(diff < 0.001, "Magnitude: {}, diff: {}", sum_sq, diff);
}

#[test]
fn test_extract_text_from_pdf_with_fallback() {
    let mock_pdf_bytes = b"Alfabra Vector - Documento de Teste de Auditoria de TI.";
    let res = extract_text_from_pdf(mock_pdf_bytes);
    assert!(res.is_ok());
    let text = res.unwrap();
    assert!(text.contains("Alfabra Vector"));
}

#[tokio::test]
async fn test_download_file_fallback() {
    let res = download_file("arquivo_inexistente_123.pdf").await;
    assert!(res.is_ok());
    let bytes = res.unwrap();
    let text = String::from_utf8_lossy(&bytes);
    assert!(text.contains("Documento de Teste de Auditoria"));
}

#[tokio::test]
async fn test_get_embeddings_from_service_fallback() {
    std::env::set_var("EMBEDDING_PROVIDER", "mock");
    std::env::set_var("EMBEDDING_DIMENSIONS", "1536");
    
    let texts = vec!["teste de integração".to_string()];
    let res = get_embeddings_from_service(&texts).await;
    assert!(res.is_ok());
    let embs = res.unwrap();
    assert_eq!(embs.len(), 1);
    assert_eq!(embs[0].len(), 1536);
}

#[tokio::test]
async fn test_db_integration_ingestion() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/rag_db".to_string());
    
    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_millis(1500))
        .connect(&database_url)
        .await {
            Ok(p) => p,
            Err(_) => {
                println!("Banco de dados local indisponível no teste. Pulando teste de integração.");
                return;
            }
        };
    
    let test_doc_id = uuid::Uuid::new_v4();
    let test_tenant_id = uuid::Uuid::new_v4();
    
    let insert_res = sqlx::query(
        "INSERT INTO documents (id, name, file_path, file_size, file_type, tenant_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(test_doc_id)
    .bind("pdf_teste_integracao.pdf")
    .bind("pdf_teste_integracao.pdf")
    .bind(500 as i64)
    .bind("pdf")
    .bind(test_tenant_id)
    .bind("UPLOADING")
    .execute(&pool)
    .await;
    
    assert!(insert_res.is_ok(), "Falha ao inserir documento de teste de integração: {:?}", insert_res.err());

    let job = IngestionJob {
        document_id: test_doc_id,
        file_path: "pdf_teste_integracao.pdf".to_string(),
        tenant_id: test_tenant_id,
        file_type: "pdf".to_string(),
    };
    
    let process_res = execute_ingestion(&pool, &job).await;
    assert!(process_res.is_ok(), "Erro ao processar a ingestão no teste de integração: {:?}", process_res.err());

    let chunks_count: (i64,) = sqlx::query_as(
        "SELECT count(*) FROM document_chunks WHERE document_id = $1"
    )
    .bind(test_doc_id)
    .fetch_one(&pool)
    .await
    .unwrap_or((0,));
    
    assert!(chunks_count.0 > 0, "Nenhum chunk foi inserido no banco para o documento de teste.");

    let delete_res = sqlx::query("DELETE FROM documents WHERE id = $1")
        .bind(test_doc_id)
        .execute(&pool)
        .await;
    assert!(delete_res.is_ok());
}
