//! Lógica de negócio pura relacionada à busca vetorial (retrieval) via pgvector.
//!
//! Extraída de `rabbitmq.rs` para permitir cobertura de testes unitários
//! determinísticos, sem depender de conexão com RabbitMQ/Postgres/Vertex AI.

/// Escapa tags XML/HTML do conteúdo de um chunk recuperado do banco, para
/// evitar injeção indireta de tags no prompt enviado ao LLM.
pub fn escape_chunk_content(content: &str) -> String {
    content.replace('<', "&lt;").replace('>', "&gt;")
}

/// Formata uma entrada de contexto (um chunk recuperado) para inclusão no
/// prompt do sistema, no formato "Documento N (Similaridade: X.XXXX):\n<conteúdo>\n\n".
pub fn format_context_entry(index: usize, score: f32, content: &str) -> String {
    format!(
        "Documento {} (Similaridade: {:.4}):\n{}\n\n",
        index, score, content
    )
}

/// Constrói a string de contexto completa a partir de uma lista de pares
/// (score, content) já ordenados por similaridade.
pub fn build_context_str<'a, I>(chunks: I) -> String
where
    I: IntoIterator<Item = (f32, &'a str)>,
{
    let mut context_str = String::new();
    for (i, (score, content)) in chunks.into_iter().enumerate() {
        context_str.push_str(&format_context_entry(i + 1, score, content));
    }
    context_str
}

/// Retorna a query SQL de busca vetorial por similaridade de cosseno,
/// escopada por tenant e, opcionalmente, por agent_id.
///
/// Quando `has_agent_id` é `true`, a query também aceita chunks de
/// documentos sem agente associado (`d.agent_id IS NULL`), além dos do
/// agente informado. Quando `false`, apenas chunks sem agente associado.
///
/// DEPRECATED: Use `vector_search_query_with_limit` para configurar o LIMIT.
/// Mantida para compatibilidade com código externo que ainda a utiliza.
#[allow(dead_code)]
pub fn vector_search_query(has_agent_id: bool) -> &'static str {
    if has_agent_id {
        "SELECT dc.id, dc.content, 1 - (dc.embedding <=> $1::vector) as similarity \
         FROM document_chunks dc \
         JOIN documents d ON dc.document_id = d.id \
         WHERE dc.tenant_id = $2 AND (d.agent_id = $3 OR d.agent_id IS NULL) \
         ORDER BY similarity DESC \
         LIMIT 5"
    } else {
        "SELECT dc.id, dc.content, 1 - (dc.embedding <=> $1::vector) as similarity \
         FROM document_chunks dc \
         JOIN documents d ON dc.document_id = d.id \
         WHERE dc.tenant_id = $2 AND d.agent_id IS NULL \
         ORDER BY similarity DESC \
         LIMIT 5"
    }
}

/// Retorna a query SQL de busca vetorial com limit configurável.
/// Quando `has_agent_id` é `true`, a query também aceita chunks de
/// documentos sem agente associado (`d.agent_id IS NULL`), além dos do
/// agente informado. Quando `false`, apenas chunks sem agente associado.
pub fn vector_search_query_with_limit(has_agent_id: bool, limit: usize) -> String {
    if has_agent_id {
        format!(
            "SELECT dc.id, dc.content, 1 - (dc.embedding <=> $1::vector) as similarity \
             FROM document_chunks dc \
             JOIN documents d ON dc.document_id = d.id \
             WHERE dc.tenant_id = $2 AND (d.agent_id = $3 OR d.agent_id IS NULL) \
             ORDER BY similarity DESC \
             LIMIT {}",
            limit
        )
    } else {
        format!(
            "SELECT dc.id, dc.content, 1 - (dc.embedding <=> $1::vector) as similarity \
             FROM document_chunks dc \
             JOIN documents d ON dc.document_id = d.id \
             WHERE dc.tenant_id = $2 AND d.agent_id IS NULL \
             ORDER BY similarity DESC \
             LIMIT {}",
            limit
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escape_chunk_content_escapes_angle_brackets() {
        let content = "<script>alert('xss')</script> normal text";
        let escaped = escape_chunk_content(content);
        assert_eq!(
            escaped,
            "&lt;script&gt;alert('xss')&lt;/script&gt; normal text"
        );
        assert!(!escaped.contains('<'));
        assert!(!escaped.contains('>'));
    }

    #[test]
    fn test_escape_chunk_content_no_op_when_no_tags() {
        let content = "Texto normal sem tags, com acentuação e números 123.";
        assert_eq!(escape_chunk_content(content), content);
    }

    #[test]
    fn test_format_context_entry_includes_index_score_and_content() {
        let entry = format_context_entry(1, 0.8734, "Conteúdo do chunk.");
        assert_eq!(
            entry,
            "Documento 1 (Similaridade: 0.8734):\nConteúdo do chunk.\n\n"
        );
    }

    #[test]
    fn test_build_context_str_orders_and_indexes_chunks() {
        let chunks = vec![(0.95_f32, "Primeiro chunk"), (0.80_f32, "Segundo chunk")];
        let context = build_context_str(chunks);

        assert!(context.starts_with("Documento 1 (Similaridade: 0.9500):\nPrimeiro chunk\n\n"));
        assert!(context.contains("Documento 2 (Similaridade: 0.8000):\nSegundo chunk\n\n"));
    }

    #[test]
    fn test_build_context_str_empty_when_no_chunks() {
        let chunks: Vec<(f32, &str)> = vec![];
        assert_eq!(build_context_str(chunks), "");
    }

    #[test]
    fn test_vector_search_query_with_agent_id_includes_agent_filter() {
        let query = vector_search_query(true);
        assert!(query.contains("d.agent_id = $3 OR d.agent_id IS NULL"));
        assert!(query.contains("dc.tenant_id = $2"));
        assert!(query.contains("ORDER BY similarity DESC"));
    }

    #[test]
    fn test_vector_search_query_without_agent_id_filters_null_only() {
        let query = vector_search_query(false);
        assert!(query.contains("d.agent_id IS NULL"));
        assert!(!query.contains("$3"));
    }

    #[test]
    fn test_vector_search_query_with_limit_with_agent_id_custom_limit() {
        let query = vector_search_query_with_limit(true, 10);
        assert!(query.contains("LIMIT 10"));
        assert!(query.contains("d.agent_id = $3 OR d.agent_id IS NULL"));
        assert!(query.contains("ORDER BY similarity DESC"));
    }

    #[test]
    fn test_vector_search_query_with_limit_without_agent_id_custom_limit() {
        let query = vector_search_query_with_limit(false, 20);
        assert!(query.contains("LIMIT 20"));
        assert!(query.contains("d.agent_id IS NULL"));
        assert!(!query.contains("$3"));
    }

    #[test]
    fn test_vector_search_query_with_limit_respects_different_values() {
        let query_5 = vector_search_query_with_limit(true, 5);
        let query_50 = vector_search_query_with_limit(true, 50);

        // LIMIT é sempre o último token da query (sem sufixo), então
        // `ends_with` compara o valor exato em vez de substring — evita o
        // falso positivo de "LIMIT 50" conter "LIMIT 5".
        assert!(query_5.ends_with("LIMIT 5"));
        assert!(!query_5.ends_with("LIMIT 50"));

        assert!(query_50.ends_with("LIMIT 50"));
        assert!(!query_50.ends_with("LIMIT 5"));
    }
}
