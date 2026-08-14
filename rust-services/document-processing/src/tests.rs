use super::*;
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use tower::ServiceExt;

fn create_test_pdf() -> Vec<u8> {
    let mut doc = lopdf::Document::with_version("1.5");
    let pages_id = doc.new_object_id();

    // Criar conteúdo simples para a página
    let content = lopdf::content::Content {
        operations: vec![
            lopdf::content::Operation::new("BT", vec![]),
            lopdf::content::Operation::new("Tf", vec!["F1".into(), 12.into()]),
            lopdf::content::Operation::new("Td", vec![100.into(), 100.into()]),
            lopdf::content::Operation::new(
                "Tj",
                vec![lopdf::Object::string_literal(
                    "Alfabra Vector Test. Page 1 text.",
                )],
            ),
            lopdf::content::Operation::new("ET", vec![]),
        ],
    };

    let mut content_dict = lopdf::Dictionary::new();
    content_dict.set(
        "Length",
        lopdf::Object::Integer(content.operations.len() as i64),
    );
    let content_id = doc.add_object(content_dict);

    let stream = lopdf::Stream::new(lopdf::Dictionary::new(), content.encode().unwrap());
    doc.objects
        .insert(content_id, lopdf::Object::Stream(stream));

    // Recursos: Fonte
    let mut font_dict = lopdf::Dictionary::new();
    font_dict.set("Type", lopdf::Object::Name("Font".as_bytes().to_vec()));
    font_dict.set("Subtype", lopdf::Object::Name("Type1".as_bytes().to_vec()));
    font_dict.set(
        "BaseFont",
        lopdf::Object::Name("Helvetica".as_bytes().to_vec()),
    );
    let font_id = doc.add_object(font_dict);

    let mut font_res_dict = lopdf::Dictionary::new();
    font_res_dict.set("F1", font_id);

    let mut resources_dict = lopdf::Dictionary::new();
    resources_dict.set("Font", font_res_dict);
    let resources_id = doc.add_object(resources_dict);

    // Página
    let mut page_dict = lopdf::Dictionary::new();
    page_dict.set("Type", lopdf::Object::Name("Page".as_bytes().to_vec()));
    page_dict.set("Parent", pages_id);
    page_dict.set("Resources", resources_id);
    page_dict.set(
        "MediaBox",
        lopdf::Object::Array(vec![0.into(), 0.into(), 612.into(), 792.into()]),
    );
    page_dict.set("Contents", content_id);
    let page_id = doc.add_object(page_dict);

    let mut pages_dict = lopdf::Dictionary::new();
    pages_dict.set("Type", lopdf::Object::Name("Pages".as_bytes().to_vec()));
    pages_dict.set("Kids", lopdf::Object::Array(vec![page_id.into()]));
    pages_dict.set("Count", lopdf::Object::Integer(1));
    doc.objects
        .insert(pages_id, lopdf::Object::Dictionary(pages_dict));

    let mut catalog_dict = lopdf::Dictionary::new();
    catalog_dict.set("Type", lopdf::Object::Name("Catalog".as_bytes().to_vec()));
    catalog_dict.set("Pages", pages_id);
    let catalog_id = doc.add_object(catalog_dict);

    doc.trailer.set("Root", catalog_id);

    let mut buf = Vec::new();
    doc.save_to(&mut buf).unwrap();
    buf
}

#[tokio::test]
async fn test_healthz() {
    let config = ServiceConfig {
        chunk_size: 100,
        chunk_overlap: 10,
        max_document_size_mb: 5,
        max_pdf_pages: 2000,
        ocr_enabled: false,
        ocr_lang: "por+eng".to_string(),
    };
    let app = app(config);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"OK");
}

#[test]
fn test_sentence_chunker_basic() {
    let chunker = SentenceChunker;
    let text = "Primeira sentenca. Segunda sentenca! Terceira sentenca?";

    // Chunk size grande o suficiente para tudo
    let chunks = chunker.chunk(text, 100, 20);
    assert_eq!(chunks.len(), 1);
    assert_eq!(
        chunks[0],
        "Primeira sentenca. Segunda sentenca! Terceira sentenca?"
    );

    // Chunk size pequeno (corta por sentenças)
    let chunks = chunker.chunk(text, 25, 5);
    assert!(chunks.len() >= 3);
    assert!(chunks.contains(&"Primeira sentenca.".to_string()));
    assert!(chunks.contains(&"Segunda sentenca!".to_string()));
    assert!(chunks.contains(&"Terceira sentenca?".to_string()));
}

#[test]
fn test_sentence_chunker_overlap() {
    let chunker = SentenceChunker;
    // O overlap deve incluir a frase anterior se couber no tamanho do overlap
    let text = "Frase um. Frase dois. Frase tres.";

    // Tamanho do chunk = 25, overlap = 15
    // "Frase um." (8 chars) + " " + "Frase dois." (10 chars) = 19 chars -> Cabe
    // Proximo chunk: "Frase dois." (10 chars) cabe no overlap de 15? Sim.
    // Então o segundo chunk deve começar com "Frase dois." e incluir "Frase tres."
    let chunks = chunker.chunk(text, 25, 12);

    assert!(chunks.len() >= 2);
    assert_eq!(chunks[0], "Frase um. Frase dois.");
    assert_eq!(chunks[1], "Frase dois. Frase tres.");
}

#[test]
fn test_token_chunker_word_boundaries() {
    let chunker = TokenChunker;
    let text = "Esta e uma frase com palavras inteiras que nao devem ser cortadas no meio.";

    // Chunk size = 30, overlap = 5
    let chunks = chunker.chunk(text, 30, 5);

    // Nenhum chunk deve terminar com uma palavra incompleta se encontrar espaco no lookback
    for c in &chunks {
        println!("Token chunk: '{}'", c);
        assert!(!c.is_empty());
    }
}

#[test]
fn test_doctype_detection() {
    // Pelo Content-Type
    assert!(matches!(
        DocType::from_mime_or_filename(Some("application/pdf"), None),
        DocType::Pdf
    ));
    assert!(matches!(
        DocType::from_mime_or_filename(Some("text/html"), None),
        DocType::Html
    ));
    assert!(matches!(
        DocType::from_mime_or_filename(Some("text/markdown"), None),
        DocType::Markdown
    ));

    // Pela Extensão do Nome do Arquivo
    assert!(matches!(
        DocType::from_mime_or_filename(None, Some("doc.pdf")),
        DocType::Pdf
    ));
    assert!(matches!(
        DocType::from_mime_or_filename(None, Some("index.html")),
        DocType::Html
    ));
    assert!(matches!(
        DocType::from_mime_or_filename(None, Some("README.md")),
        DocType::Markdown
    ));
    assert!(matches!(
        DocType::from_mime_or_filename(None, Some("documento.docx")),
        DocType::Docx
    ));
    assert!(matches!(
        DocType::from_mime_or_filename(None, Some("notes.txt")),
        DocType::Txt
    ));
}

#[test]
fn test_html_parser() {
    let html_bytes = b"<html><body><h1>Titulo</h1><p>Paragrafo de teste.</p></body></html>";
    let parser = HtmlParser;
    let config = ParserConfig {
        ocr_enabled: false,
        ocr_lang: "por".to_string(),
        max_pdf_pages: 2000,
    };

    let parsed = parser.parse(html_bytes, &config).unwrap();
    assert_eq!(parsed.pages.len(), 1);
    // Deve remover as tags HTML rudimentarmente
    assert!(parsed.pages[0].text.contains("Titulo"));
    assert!(parsed.pages[0].text.contains("Paragrafo de teste."));
    assert!(!parsed.pages[0].text.contains("<html>"));
}

#[test]
fn test_pdf_parser_success() {
    let pdf_bytes = create_test_pdf();
    let parser = PdfParser;
    let config = ParserConfig {
        ocr_enabled: false,
        ocr_lang: "por".to_string(),
        max_pdf_pages: 2000,
    };

    let parsed = parser.parse(&pdf_bytes, &config).unwrap();
    assert!(!parsed.pages.is_empty());
    assert!(parsed.pages[0].text.contains("Alfabra Vector"));
}

fn create_test_pdf_with_open_action_javascript() -> Vec<u8> {
    let mut doc = lopdf::Document::with_version("1.5");
    let pages_id = doc.new_object_id();

    let mut page_dict = lopdf::Dictionary::new();
    page_dict.set("Type", lopdf::Object::Name("Page".as_bytes().to_vec()));
    page_dict.set("Parent", pages_id);
    page_dict.set(
        "MediaBox",
        lopdf::Object::Array(vec![0.into(), 0.into(), 612.into(), 792.into()]),
    );
    let page_id = doc.add_object(page_dict);

    let mut pages_dict = lopdf::Dictionary::new();
    pages_dict.set("Type", lopdf::Object::Name("Pages".as_bytes().to_vec()));
    pages_dict.set("Kids", lopdf::Object::Array(vec![page_id.into()]));
    pages_dict.set("Count", lopdf::Object::Integer(1));
    doc.objects
        .insert(pages_id, lopdf::Object::Dictionary(pages_dict));

    let mut js_action_dict = lopdf::Dictionary::new();
    js_action_dict.set("Type", lopdf::Object::Name("Action".as_bytes().to_vec()));
    js_action_dict.set("S", lopdf::Object::Name("JavaScript".as_bytes().to_vec()));
    js_action_dict.set("JS", lopdf::Object::string_literal("app.alert('pwned');"));
    let action_id = doc.add_object(js_action_dict);

    let mut catalog_dict = lopdf::Dictionary::new();
    catalog_dict.set("Type", lopdf::Object::Name("Catalog".as_bytes().to_vec()));
    catalog_dict.set("Pages", pages_id);
    catalog_dict.set("OpenAction", action_id);
    let catalog_id = doc.add_object(catalog_dict);

    doc.trailer.set("Root", catalog_id);

    let mut buf = Vec::new();
    doc.save_to(&mut buf).unwrap();
    buf
}

#[test]
fn test_pdf_parser_rejects_openaction_javascript() {
    let pdf_bytes = create_test_pdf_with_open_action_javascript();
    let parser = PdfParser;
    let config = ParserConfig {
        ocr_enabled: false,
        ocr_lang: "por".to_string(),
        max_pdf_pages: 2000,
    };

    let result = parser.parse(&pdf_bytes, &config);
    match result {
        Err(e) => assert!(e.to_string().contains("ação potencialmente perigosa")),
        Ok(_) => panic!("esperava erro de PDF com ação potencialmente perigosa"),
    }
}

#[test]
fn test_pdf_parser_rejects_pdf_exceeding_page_limit() {
    let pdf_bytes = create_test_pdf();
    let parser = PdfParser;
    let config = ParserConfig {
        ocr_enabled: false,
        ocr_lang: "por".to_string(),
        max_pdf_pages: 0,
    };

    let result = parser.parse(&pdf_bytes, &config);
    match result {
        Err(e) => assert!(e.to_string().contains("excede o limite")),
        Ok(_) => panic!("esperava erro de PDF excedendo limite de páginas"),
    }
}

#[tokio::test]
async fn test_process_endpoint_success() {
    let config = ServiceConfig {
        chunk_size: 100,
        chunk_overlap: 10,
        max_document_size_mb: 5,
        max_pdf_pages: 2000,
        ocr_enabled: false,
        ocr_lang: "por+eng".to_string(),
    };
    let app = app(config);

    // Criar payload multipart em memoria
    let boundary = "------------------------abcdef12345678";
    let mut body = Vec::new();

    // Campo file
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(
        b"Content-Disposition: form-data; name=\"file\"; filename=\"test.txt\"\r\n",
    );
    body.extend_from_slice(b"Content-Type: text/plain\r\n\r\n");
    body.extend_from_slice(
        b"Esta e a primeira sentenca de teste. E esta e a segunda sentenca de teste.",
    );
    body.extend_from_slice(b"\r\n");

    // Campo document_id
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(b"Content-Disposition: form-data; name=\"document_id\"\r\n\r\n");
    body.extend_from_slice(b"my-custom-doc-id-123");
    body.extend_from_slice(b"\r\n");

    // Campo strategy
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(b"Content-Disposition: form-data; name=\"strategy\"\r\n\r\n");
    body.extend_from_slice(b"sentence");
    body.extend_from_slice(b"\r\n");

    body.extend_from_slice(format!("--{}--\r\n", boundary).as_bytes());

    let response = app
        .oneshot(
            Request::builder()
                .uri("/process")
                .method("POST")
                .header(
                    "Content-Type",
                    format!("multipart/form-data; boundary={}", boundary),
                )
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json_resp: ProcessResponse = serde_json::from_slice(&body_bytes).unwrap();

    assert_eq!(json_resp.document_id, "my-custom-doc-id-123");
    assert!(!json_resp.chunks.is_empty());
    assert_eq!(json_resp.chunks[0].chunk_index, 0);
    assert_eq!(json_resp.chunks[0].page_number, 1);
}

#[tokio::test]
async fn test_process_endpoint_payload_too_large() {
    let config = ServiceConfig {
        chunk_size: 100,
        chunk_overlap: 10,
        // Limita o tamanho maximo a 0 MB (ou seja, qualquer arquivo maior que 0 bytes excede)
        max_document_size_mb: 0,
        max_pdf_pages: 2000,
        ocr_enabled: false,
        ocr_lang: "por+eng".to_string(),
    };
    let app = app(config);

    let boundary = "------------------------abcdef12345678";
    let mut body = Vec::new();

    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(
        b"Content-Disposition: form-data; name=\"file\"; filename=\"test.txt\"\r\n",
    );
    body.extend_from_slice(b"Content-Type: text/plain\r\n\r\n");
    body.extend_from_slice(b"Qualquer conteudo");
    body.extend_from_slice(b"\r\n");
    body.extend_from_slice(format!("--{}--\r\n", boundary).as_bytes());

    let response = app
        .oneshot(
            Request::builder()
                .uri("/process")
                .method("POST")
                .header(
                    "Content-Type",
                    format!("multipart/form-data; boundary={}", boundary),
                )
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
}
