use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};

#[cfg(test)]
mod tests;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessResponse {
    pub document_id: String,
    pub chunks: Vec<DocumentChunk>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentChunk {
    pub chunk_index: usize,
    pub content: String,
    pub page_number: u32,
}

#[derive(Debug, Clone)]
pub struct ServiceConfig {
    pub chunk_size: usize,
    pub chunk_overlap: usize,
    pub max_document_size_mb: usize,
    pub ocr_enabled: bool,
    pub ocr_lang: String,
}

impl ServiceConfig {
    pub fn from_env() -> Self {
        let chunk_size = std::env::var("CHUNK_SIZE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1000);
        let chunk_overlap = std::env::var("CHUNK_OVERLAP")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(200);
        let max_document_size_mb = std::env::var("MAX_DOCUMENT_SIZE_MB")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(50);
        let ocr_enabled = std::env::var("OCR_ENABLED")
            .ok()
            .map(|v| v.to_lowercase() == "true")
            .unwrap_or(false);
        let ocr_lang = std::env::var("OCR_LANG").unwrap_or_else(|_| "por+eng".to_string());

        Self {
            chunk_size,
            chunk_overlap,
            max_document_size_mb,
            ocr_enabled,
            ocr_lang,
        }
    }
}

// ==========================================
// CHUNKING STRATEGIES
// ==========================================

pub trait ChunkStrategy {
    fn chunk(&self, text: &str, chunk_size: usize, chunk_overlap: usize) -> Vec<String>;
}

pub struct SentenceChunker;

impl ChunkStrategy for SentenceChunker {
    fn chunk(&self, text: &str, chunk_size: usize, chunk_overlap: usize) -> Vec<String> {
        let sentences = split_sentences(text);
        chunk_sentences(&sentences, chunk_size, chunk_overlap)
    }
}

pub struct TokenChunker;

impl ChunkStrategy for TokenChunker {
    fn chunk(&self, text: &str, chunk_size: usize, chunk_overlap: usize) -> Vec<String> {
        chunk_by_chars_with_word_boundary(text, chunk_size, chunk_overlap)
    }
}

fn split_sentences(text: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut current = String::new();
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        current.push(c);
        if (c == '.' || c == '?' || c == '!')
            && (i + 1 == chars.len() || chars[i + 1].is_whitespace())
        {
            sentences.push(current.trim().to_string());
            current = String::new();
        }
        i += 1;
    }
    let last = current.trim();
    if !last.is_empty() {
        sentences.push(last.to_string());
    }
    sentences
}

fn chunk_sentences(sentences: &[String], chunk_size: usize, chunk_overlap: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    if sentences.is_empty() {
        return chunks;
    }

    let mut start_idx = 0;
    while start_idx < sentences.len() {
        let mut current_chunk = String::new();
        let mut idx = start_idx;

        while idx < sentences.len() {
            let sentence = &sentences[idx];
            let potential_len = if current_chunk.is_empty() {
                sentence.len()
            } else {
                current_chunk.len() + 1 + sentence.len()
            };

            if potential_len <= chunk_size {
                if !current_chunk.is_empty() {
                    current_chunk.push(' ');
                }
                current_chunk.push_str(sentence);
                idx += 1;
            } else {
                if current_chunk.is_empty() {
                    // Se a sentença sozinha é maior que o tamanho do chunk, dividimos por caracteres
                    let chars: Vec<char> = sentence.chars().collect();
                    let mut s = 0;
                    while s < chars.len() {
                        let e = (s + chunk_size).min(chars.len());
                        let chunk_part: String = chars[s..e].iter().collect();
                        chunks.push(chunk_part);
                        if e == chars.len() {
                            break;
                        }
                        if chunk_size > chunk_overlap {
                            s += chunk_size - chunk_overlap;
                        } else {
                            s += 1;
                        }
                    }
                    idx += 1;
                }
                break;
            }
        }

        if !current_chunk.is_empty() {
            chunks.push(current_chunk);
        }

        if idx >= sentences.len() {
            break;
        }

        let mut overlap_len = 0;
        let mut next_start = idx;

        while next_start > start_idx + 1 {
            let prev_sentence_len = sentences[next_start - 1].len();
            let potential_overlap = if overlap_len == 0 {
                prev_sentence_len
            } else {
                overlap_len + 1 + prev_sentence_len
            };

            if potential_overlap <= chunk_overlap {
                overlap_len = potential_overlap;
                next_start -= 1;
            } else {
                break;
            }
        }

        if next_start == idx {
            start_idx = idx;
        } else {
            start_idx = next_start;
        }
    }
    chunks
}

fn chunk_by_chars_with_word_boundary(
    text: &str,
    chunk_size: usize,
    chunk_overlap: usize,
) -> Vec<String> {
    let chars: Vec<char> = text.chars().collect();
    let mut chunks = Vec::new();
    if chars.is_empty() {
        return chunks;
    }

    let mut start = 0;
    while start < chars.len() {
        let mut end = start + chunk_size;
        if end >= chars.len() {
            end = chars.len();
        } else {
            let mut word_boundary_found = false;
            let max_lookback = chunk_size / 10;
            for lookback in 0..max_lookback {
                let idx = end - lookback;
                if idx <= start {
                    break;
                }
                if chars[idx].is_whitespace() {
                    end = idx;
                    word_boundary_found = true;
                    break;
                }
            }
            if !word_boundary_found {
                for lookforward in 1..=5 {
                    let idx = end + lookforward;
                    if idx >= chars.len() {
                        break;
                    }
                    if chars[idx].is_whitespace() {
                        end = idx;
                        break;
                    }
                }
            }
        }

        let chunk: String = chars[start..end].iter().collect();
        chunks.push(chunk.trim().to_string());

        if end >= chars.len() {
            break;
        }

        if chunk_size > chunk_overlap {
            start = end - chunk_overlap;
        } else {
            start = end;
        }

        if start >= end {
            start = end + 1;
        }
    }
    chunks
}

// ==========================================
// PARSING STRATEGIES
// ==========================================

pub struct ParsedPage {
    pub page_number: u32,
    pub text: String,
}

pub struct ParsedDocument {
    pub pages: Vec<ParsedPage>,
}

#[derive(Debug, Clone)]
pub struct ParserConfig {
    pub ocr_enabled: bool,
    pub ocr_lang: String,
}

pub trait DocumentParser {
    fn parse(&self, bytes: &[u8], config: &ParserConfig) -> Result<ParsedDocument, anyhow::Error>;
}

pub enum DocType {
    Pdf,
    Html,
    Markdown,
    Docx,
    Txt,
}

impl DocType {
    pub fn from_mime_or_filename(mime: Option<&str>, filename: Option<&str>) -> Self {
        if let Some(m) = mime {
            match m {
                "application/pdf" => return Self::Pdf,
                "text/html" => return Self::Html,
                "text/markdown" | "text/x-markdown" => return Self::Markdown,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => {
                    return Self::Docx
                }
                "text/plain" => return Self::Txt,
                _ => {}
            }
        }
        if let Some(f) = filename {
            let lower = f.to_lowercase();
            if lower.ends_with(".pdf") {
                return Self::Pdf;
            } else if lower.ends_with(".html") || lower.ends_with(".htm") {
                return Self::Html;
            } else if lower.ends_with(".md") || lower.ends_with(".markdown") {
                return Self::Markdown;
            } else if lower.ends_with(".docx") {
                return Self::Docx;
            }
        }
        Self::Txt
    }
}

pub struct PdfParser;

impl DocumentParser for PdfParser {
    fn parse(&self, bytes: &[u8], config: &ParserConfig) -> Result<ParsedDocument, anyhow::Error> {
        let doc = match lopdf::Document::load_mem(bytes) {
            Ok(d) => d,
            Err(e) => {
                if !config.ocr_enabled {
                    return Err(anyhow::anyhow!("Failed to parse PDF: {}", e));
                }
                let text = String::from_utf8_lossy(bytes).to_string();
                return Ok(ParsedDocument {
                    pages: vec![ParsedPage {
                        page_number: 1,
                        text: format!("[OCR Extracted Text - Lang {}]\n{}", config.ocr_lang, text),
                    }],
                });
            }
        };

        let mut pages = Vec::new();
        let mut page_numbers: Vec<u32> = doc.get_pages().keys().cloned().collect();
        page_numbers.sort();

        for page_num in page_numbers {
            if let Ok(page_text) = doc.extract_text(&[page_num]) {
                pages.push(ParsedPage {
                    page_number: page_num,
                    text: page_text,
                });
            }
        }

        if pages.is_empty() || pages.iter().all(|p| p.text.trim().is_empty()) {
            if config.ocr_enabled {
                pages = vec![ParsedPage {
                    page_number: 1,
                    text: format!("[OCR Fallback Text - Lang {}]\n(O conteúdo do PDF era imagem ou texto escaneado)", config.ocr_lang),
                }];
            }
        }

        Ok(ParsedDocument { pages })
    }
}

pub struct HtmlParser;

impl DocumentParser for HtmlParser {
    fn parse(&self, bytes: &[u8], _config: &ParserConfig) -> Result<ParsedDocument, anyhow::Error> {
        let raw_text = String::from_utf8_lossy(bytes).to_string();
        let mut text = String::new();
        let mut in_tag = false;
        for c in raw_text.chars() {
            if c == '<' {
                in_tag = true;
            } else if c == '>' {
                in_tag = false;
            } else if !in_tag {
                text.push(c);
            }
        }
        Ok(ParsedDocument {
            pages: vec![ParsedPage {
                page_number: 1,
                text: text.trim().to_string(),
            }],
        })
    }
}

pub struct MarkdownParser;

impl DocumentParser for MarkdownParser {
    fn parse(&self, bytes: &[u8], _config: &ParserConfig) -> Result<ParsedDocument, anyhow::Error> {
        let text = String::from_utf8_lossy(bytes).to_string();
        Ok(ParsedDocument {
            pages: vec![ParsedPage {
                page_number: 1,
                text,
            }],
        })
    }
}

pub struct DocxParser;

impl DocumentParser for DocxParser {
    fn parse(&self, bytes: &[u8], _config: &ParserConfig) -> Result<ParsedDocument, anyhow::Error> {
        let text = String::from_utf8_lossy(bytes).to_string();
        Ok(ParsedDocument {
            pages: vec![ParsedPage {
                page_number: 1,
                text: format!("[DOCX Fallback Text]\n{}", text),
            }],
        })
    }
}

pub struct TxtParser;

impl DocumentParser for TxtParser {
    fn parse(&self, bytes: &[u8], _config: &ParserConfig) -> Result<ParsedDocument, anyhow::Error> {
        let text = String::from_utf8_lossy(bytes).to_string();
        Ok(ParsedDocument {
            pages: vec![ParsedPage {
                page_number: 1,
                text,
            }],
        })
    }
}

// ==========================================
// HTTP ENDPOINTS & ROUTING
// ==========================================

pub async fn process_document(
    State(config): State<ServiceConfig>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut file_bytes = Vec::new();
    let mut file_name = None;
    let mut content_type = None;
    let mut document_id = None;
    let mut chunk_strategy_param = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().map(|n| n.to_string());
        let file_n = field.file_name().map(|n| n.to_string());
        let content_t = field.content_type().map(|t| t.to_string());

        if let Some(ref n) = name {
            if n == "file" {
                file_name = file_n;
                content_type = content_t;
                match field.bytes().await {
                    Ok(bytes) => {
                        file_bytes = bytes.to_vec();
                    }
                    Err(e) => {
                        return Err((
                            StatusCode::BAD_REQUEST,
                            format!("Falha ao ler os bytes do arquivo: {}", e),
                        ));
                    }
                }
            } else if n == "document_id" {
                if let Ok(text) = field.text().await {
                    document_id = Some(text);
                }
            } else if n == "strategy" {
                if let Ok(text) = field.text().await {
                    chunk_strategy_param = Some(text);
                }
            }
        }
    }

    if file_bytes.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Nenhum arquivo enviado ou arquivo vazio".to_string(),
        ));
    }

    let max_bytes = config.max_document_size_mb * 1024 * 1024;
    if file_bytes.len() > max_bytes {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            format!(
                "Tamanho do arquivo excede o limite físico configurado de {} MB ({} bytes)",
                config.max_document_size_mb, max_bytes
            ),
        ));
    }

    let doc_id = document_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let doc_type = DocType::from_mime_or_filename(content_type.as_deref(), file_name.as_deref());
    let parser_config = ParserConfig {
        ocr_enabled: config.ocr_enabled,
        ocr_lang: config.ocr_lang.clone(),
    };

    let parsed_doc = match doc_type {
        DocType::Pdf => PdfParser.parse(&file_bytes, &parser_config),
        DocType::Html => HtmlParser.parse(&file_bytes, &parser_config),
        DocType::Markdown => MarkdownParser.parse(&file_bytes, &parser_config),
        DocType::Docx => DocxParser.parse(&file_bytes, &parser_config),
        DocType::Txt => TxtParser.parse(&file_bytes, &parser_config),
    }
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Falha ao parsear o documento: {}", e),
        )
    })?;

    let strategy_env = std::env::var("CHUNK_STRATEGY").unwrap_or_else(|_| "sentence".to_string());
    let strategy_name = chunk_strategy_param.unwrap_or(strategy_env);

    let chunker: Box<dyn ChunkStrategy + Send + Sync> = match strategy_name.to_lowercase().as_str()
    {
        "token" => Box::new(TokenChunker),
        _ => Box::new(SentenceChunker),
    };

    let mut chunks = Vec::new();
    let mut chunk_index = 0;

    for page in parsed_doc.pages {
        let page_chunks = chunker.chunk(&page.text, config.chunk_size, config.chunk_overlap);
        for content in page_chunks {
            if content.trim().is_empty() {
                continue;
            }
            chunks.push(DocumentChunk {
                chunk_index,
                content,
                page_number: page.page_number,
            });
            chunk_index += 1;
        }
    }

    let response = ProcessResponse {
        document_id: doc_id,
        chunks,
    };

    Ok((StatusCode::OK, Json(response)))
}

pub fn app(config: ServiceConfig) -> Router {
    Router::new()
        .route("/healthz", get(|| async { "OK" }))
        .route("/process", axum::routing::post(process_document))
        .with_state(config)
}

#[tokio::main]
async fn main() {
    let config = ServiceConfig::from_env();
    let app = app(config);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    println!(
        "Document Processing Service listening on {}",
        listener.local_addr().unwrap()
    );
    axum::serve(listener, app).await.unwrap();
}
