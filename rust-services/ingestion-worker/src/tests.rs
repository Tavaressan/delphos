use super::*;
use chrono::{Duration as ChronoDuration, Utc};
use lapin::types::{AMQPValue, FieldTable, ShortString};

#[test]
fn test_should_route_to_dlq_after_max_retries() {
    let max_retries = 3;
    assert!(!should_route_to_dlq(0, max_retries));
    assert!(!should_route_to_dlq(2, max_retries));
    assert!(should_route_to_dlq(3, max_retries));
    assert!(should_route_to_dlq(10, max_retries));
}

#[test]
fn test_extract_retry_count_defaults_to_zero_without_header() {
    assert_eq!(extract_retry_count(None), 0);
    let headers = FieldTable::default();
    assert_eq!(extract_retry_count(Some(&headers)), 0);
}

#[test]
fn test_extract_retry_count_reads_existing_header() {
    let mut headers = FieldTable::default();
    headers.insert(
        ShortString::from(RETRY_COUNT_HEADER),
        AMQPValue::LongUInt(2),
    );
    assert_eq!(extract_retry_count(Some(&headers)), 2);
}

#[test]
fn test_is_processing_stale_detects_stuck_document() {
    // Documento parado em PROCESSING há mais tempo que o timeout configurado -> stale
    let heartbeat_timeout = ChronoDuration::minutes(10);
    let updated_at = Utc::now() - ChronoDuration::minutes(15);
    assert!(is_processing_stale(
        updated_at,
        Utc::now(),
        heartbeat_timeout
    ));
}

#[test]
fn test_is_processing_stale_recent_update_not_stale() {
    let heartbeat_timeout = ChronoDuration::minutes(10);
    let updated_at = Utc::now() - ChronoDuration::minutes(2);
    assert!(!is_processing_stale(
        updated_at,
        Utc::now(),
        heartbeat_timeout
    ));
}

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

    let emb1_a = generate_mock_embedding(text1, 768);
    let emb1_b = generate_mock_embedding(text1, 768);
    let emb2 = generate_mock_embedding(text2, 768);

    assert_eq!(emb1_a, emb1_b);
    assert_ne!(emb1_a, emb2);
    assert_eq!(emb1_a.len(), 768);

    let mut sum_sq = 0.0;
    for v in &emb1_a {
        sum_sq += v * v;
    }
    let diff = (sum_sq - 1.0).abs();
    assert!(diff < 0.001, "Magnitude: {}, diff: {}", sum_sq, diff);
}

// Regressão da issue #117: extract_text_from_pdf() não deve mais mascarar uma
// falha real de parsing do lopdf com base numa heurística de conteúdo textual
// ("Alfabra Vector"/"Documento"/"Auditoria"). Bytes inválidos de PDF devem
// sempre propagar erro, mesmo que "pareçam" com o antigo texto de fallback.
#[test]
fn test_extract_text_from_pdf_invalid_bytes_propagates_error() {
    let invalid_pdf_bytes = b"Alfabra Vector - Documento de Teste de Auditoria de TI.";
    let res = extract_text_from_pdf(invalid_pdf_bytes);
    assert!(
        res.is_err(),
        "Bytes inválidos de PDF não deveriam ser aceitos silenciosamente via heurística de texto"
    );
    let err_msg = format!("{:#}", res.unwrap_err());
    assert!(err_msg.to_lowercase().contains("pdf"));
}

// Regressão da issue #117: por padrão (sem INGESTION_DEV_FALLBACK=true) um
// arquivo ausente no MinIO e localmente deve propagar um erro real, e não
// retornar um texto mock de desenvolvimento silenciosamente.
#[tokio::test]
async fn test_download_file_missing_propagates_error_by_default() {
    let res = download_file_with_fallback("arquivo_inexistente_123.pdf", false).await;
    assert!(
        res.is_err(),
        "download_file() deveria falhar quando o arquivo não existe no MinIO nem localmente"
    );
    let err_msg = format!("{:#}", res.unwrap_err());
    assert!(err_msg.contains("arquivo_inexistente_123.pdf"));
}

// O fallback textual de desenvolvimento só deve ser usado quando explicitamente
// habilitado (opt-in), nunca como comportamento padrão/silencioso.
#[tokio::test]
async fn test_download_file_dev_fallback_is_opt_in_only() {
    let res = download_file_with_fallback("arquivo_inexistente_456.pdf", true).await;
    assert!(res.is_ok());
    let bytes = res.unwrap();
    let text = String::from_utf8_lossy(&bytes);
    assert!(text.contains("Documento de Teste de Auditoria"));
}

// Testa ambos os cenários (default e opt-in) numa única thread de teste para
// evitar condição de corrida com outros testes mutando a mesma env var global.
#[test]
fn test_dev_fallback_enabled_defaults_to_false_and_respects_opt_in() {
    std::env::remove_var("INGESTION_DEV_FALLBACK");
    assert!(!dev_fallback_enabled());

    std::env::set_var("INGESTION_DEV_FALLBACK", "true");
    assert!(dev_fallback_enabled());

    std::env::remove_var("INGESTION_DEV_FALLBACK");
    assert!(!dev_fallback_enabled());
}

#[tokio::test]
async fn test_get_embeddings_from_service_fallback() {
    std::env::set_var("EMBEDDING_PROVIDER", "mock");
    std::env::set_var("EMBEDDING_DIMENSIONS", "768");

    let texts = vec!["teste de integração".to_string()];
    let res = get_embeddings_from_service(&texts).await;
    assert!(res.is_ok());
    let embs = res.unwrap();
    assert_eq!(embs.len(), 1);
    assert_eq!(embs[0].len(), 768);
}

#[tokio::test]
async fn test_db_integration_ingestion() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/rag_db".to_string());

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_millis(1500))
        .connect(&database_url)
        .await
    {
        Ok(p) => p,
        Err(_) => {
            println!("Banco de dados local indisponível no teste. Pulando teste de integração.");
            return;
        }
    };

    let test_doc_id = uuid::Uuid::new_v4();
    let test_tenant_id = uuid::Uuid::new_v4();

    // Desde a correção da issue #117, download_file() não mascara mais arquivos
    // ausentes com um texto mock. Para exercitar o pipeline de ingestão feliz
    // (chunking + embeddings + persistência) sem depender de MinIO, escrevemos
    // um arquivo real localmente — download_file() o encontra via fallback
    // legítimo de leitura local (std::fs::read), sem precisar de INGESTION_DEV_FALLBACK.
    let local_file_path = "txt_teste_integracao.txt";
    std::fs::write(
        local_file_path,
        "Texto de teste de integração para validar chunking e geração de embeddings.",
    )
    .expect("Falha ao escrever arquivo local de teste de integração");

    let insert_res = sqlx::query(
        "INSERT INTO documents (id, name, file_path, file_size, file_type, tenant_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(test_doc_id)
    .bind(local_file_path)
    .bind(local_file_path)
    .bind(500 as i64)
    .bind("txt")
    .bind(test_tenant_id)
    .bind("UPLOADING")
    .execute(&pool)
    .await;

    assert!(
        insert_res.is_ok(),
        "Falha ao inserir documento de teste de integração: {:?}",
        insert_res.err()
    );

    let job = IngestionJob {
        document_id: test_doc_id,
        file_path: local_file_path.to_string(),
        tenant_id: test_tenant_id,
        file_type: "txt".to_string(),
    };

    let process_res = execute_ingestion(&pool, &job).await;

    let _ = std::fs::remove_file(local_file_path);

    assert!(
        process_res.is_ok(),
        "Erro ao processar a ingestão no teste de integração: {:?}",
        process_res.err()
    );

    let chunks_count: (i64,) =
        sqlx::query_as("SELECT count(*) FROM document_chunks WHERE document_id = $1")
            .bind(test_doc_id)
            .fetch_one(&pool)
            .await
            .unwrap_or((0,));

    assert!(
        chunks_count.0 > 0,
        "Nenhum chunk foi inserido no banco para o documento de teste."
    );

    let delete_res = sqlx::query("DELETE FROM documents WHERE id = $1")
        .bind(test_doc_id)
        .execute(&pool)
        .await;
    assert!(delete_res.is_ok());
}

// Regressão da issue #117: quando o arquivo de um documento não existe no MinIO
// nem localmente, execute_ingestion() deve propagar o erro real (sem fallback
// textual mascarando a falha) e process_delivery() deve marcar o documento como
// FAILED com processing_error populado, refletindo a falha genuína.
#[tokio::test]
async fn test_db_integration_missing_file_marks_document_failed() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/rag_db".to_string());

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_millis(1500))
        .connect(&database_url)
        .await
    {
        Ok(p) => p,
        Err(_) => {
            println!("Banco de dados local indisponível no teste. Pulando teste de integração.");
            return;
        }
    };

    // Garante que o fallback de desenvolvimento está desligado (comportamento padrão),
    // para que a ausência do arquivo realmente propague como falha.
    std::env::remove_var("INGESTION_DEV_FALLBACK");

    let test_doc_id = uuid::Uuid::new_v4();
    let test_tenant_id = uuid::Uuid::new_v4();
    let missing_file_path = format!("arquivo_inexistente_{}.pdf", test_doc_id);

    let insert_res = sqlx::query(
        "INSERT INTO documents (id, name, file_path, file_size, file_type, tenant_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(test_doc_id)
    .bind(&missing_file_path)
    .bind(&missing_file_path)
    .bind(500 as i64)
    .bind("pdf")
    .bind(test_tenant_id)
    .bind("UPLOADING")
    .execute(&pool)
    .await;

    assert!(
        insert_res.is_ok(),
        "Falha ao inserir documento de teste de integração: {:?}",
        insert_res.err()
    );

    let body = serde_json::json!({
        "document_id": test_doc_id,
        "file_path": missing_file_path,
        "tenant_id": test_tenant_id,
        "file_type": "pdf",
    })
    .to_string();

    let process_res = process_delivery(&pool, &body).await;
    assert!(
        process_res.is_err(),
        "process_delivery() deveria propagar erro quando o arquivo do documento não existe"
    );

    let row: (String, Option<String>) =
        sqlx::query_as("SELECT status, processing_error FROM documents WHERE id = $1")
            .bind(test_doc_id)
            .fetch_one(&pool)
            .await
            .unwrap();

    assert_eq!(
        row.0, "FAILED",
        "Documento com arquivo ausente deveria transicionar para FAILED"
    );
    assert!(
        row.1.is_some() && !row.1.as_ref().unwrap().trim().is_empty(),
        "processing_error deveria estar populado para o documento com falha"
    );

    let delete_res = sqlx::query("DELETE FROM documents WHERE id = $1")
        .bind(test_doc_id)
        .execute(&pool)
        .await;
    assert!(delete_res.is_ok());
}

#[tokio::test]
async fn test_deterministic_failure_routes_message_to_dlq_after_retries() {
    let rabbitmq_url = std::env::var("RABBITMQ_URL")
        .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672".to_string());

    let conn =
        match lapin::Connection::connect(&rabbitmq_url, lapin::ConnectionProperties::default())
            .await
        {
            Ok(c) => c,
            Err(_) => {
                println!("RabbitMQ local indisponível no teste. Pulando teste de integração.");
                return;
            }
        };
    let channel = conn.create_channel().await.unwrap();

    channel
        .queue_declare(
            DLQ_QUEUE,
            lapin::options::QueueDeclareOptions {
                durable: true,
                ..Default::default()
            },
            FieldTable::default(),
        )
        .await
        .unwrap();

    // Esvazia a DLQ para garantir um cenário determinístico.
    channel
        .queue_purge(DLQ_QUEUE, lapin::options::QueuePurgeOptions::default())
        .await
        .unwrap();

    let max_retries: u32 = 3;
    let payload = br#"{"document_id":"00000000-0000-0000-0000-000000000001"}"#.to_vec();

    // Simula falhas determinísticas sucessivas de um job de ingestão até
    // esgotar as tentativas de retry configuradas.
    let mut retry_count = 0;
    while !should_route_to_dlq(retry_count, max_retries) {
        retry_count += 1;
    }
    publish_to_dlq(
        &channel,
        payload.clone(),
        retry_count,
        "falha determinística de teste",
    )
    .await
    .expect("publish_to_dlq não deveria falhar");

    let delivery = channel
        .basic_get(DLQ_QUEUE, lapin::options::BasicGetOptions::default())
        .await
        .expect("basic_get não deveria falhar")
        .expect("mensagem deveria estar presente na DLQ");

    assert_eq!(delivery.delivery.data, payload);
    delivery
        .delivery
        .ack(lapin::options::BasicAckOptions::default())
        .await
        .unwrap();
}

#[tokio::test]
async fn test_reap_stale_processing_documents_marks_failed() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/rag_db".to_string());

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_millis(1500))
        .connect(&database_url)
        .await
    {
        Ok(p) => p,
        Err(_) => {
            println!("Banco de dados local indisponível no teste. Pulando teste de integração.");
            return;
        }
    };

    let test_doc_id = uuid::Uuid::new_v4();
    let test_tenant_id = uuid::Uuid::new_v4();

    // Simula um worker que travou no meio do processamento: documento em PROCESSING
    // com updated_at bem antigo (sem heartbeat recente).
    let insert_res = sqlx::query(
        "INSERT INTO documents (id, name, file_path, file_size, file_type, tenant_id, status, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSING', NOW() - INTERVAL '30 minutes')",
    )
    .bind(test_doc_id)
    .bind("documento_travado.pdf")
    .bind("documento_travado.pdf")
    .bind(500_i64)
    .bind("pdf")
    .bind(test_tenant_id)
    .execute(&pool)
    .await;

    assert!(
        insert_res.is_ok(),
        "Falha ao inserir documento travado de teste: {:?}",
        insert_res.err()
    );

    let affected = reap_stale_processing_documents(&pool, chrono::Duration::minutes(10))
        .await
        .expect("reaper não deveria falhar");
    assert!(affected >= 1);

    let row: (String, Option<String>) =
        sqlx::query_as("SELECT status, processing_error FROM documents WHERE id = $1")
            .bind(test_doc_id)
            .fetch_one(&pool)
            .await
            .unwrap();

    assert_eq!(row.0, "FAILED");
    assert!(row.1.is_some());
    assert!(row.1.unwrap().to_lowercase().contains("heartbeat"));

    let delete_res = sqlx::query("DELETE FROM documents WHERE id = $1")
        .bind(test_doc_id)
        .execute(&pool)
        .await;
    assert!(delete_res.is_ok());
}
