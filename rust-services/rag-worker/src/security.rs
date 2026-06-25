use regex::RegexSet;
use std::sync::OnceLock;

const PATTERNS: &[&str] = &[
    r"(?i)ignore\s+as\s+instruções",
    r"(?i)ignore\s+as\s+diretrizes",
    r"(?i)ignore\s+everything\s+above",
    r"(?i)daqui\s+em\s+diante",
    r"(?i)you\s+are\s+now",
    r"(?i)você\s+agora\s+é",
    r"(?i)system\s+bypass",
    r"(?i)override\s+rules",
    r"(?i)regras\s+de\s+sistema",
    r"(?i)ignore\s+todas\s+as\s+regras",
    r"(?i)ignore\s+toda\s+a\s+instrução",
    r"(?i)ignore\s+instruções\s+anteriores",
];

fn get_patterns() -> &'static RegexSet {
    static SET: OnceLock<RegexSet> = OnceLock::new();
    SET.get_or_init(|| RegexSet::new(PATTERNS).expect("Invalid regex patterns"))
}

fn clean_invisible_characters(text: &str) -> String {
    text.chars()
        .filter(|&c| {
            // Keep tabs, newlines, carriage returns, and non-control/non-invisible characters
            c == '\n' || c == '\r' || c == '\t' || (!c.is_control() && !is_invisible(c))
        })
        .collect()
}

fn is_invisible(c: char) -> bool {
    matches!(c,
        '\u{200b}'..='\u{200d}' |
        '\u{200e}'..='\u{200f}' |
        '\u{feff}' |
        '\u{202a}'..='\u{202e}'
    )
}

fn escape_xml(text: &str) -> String {
    text.replace('<', "&lt;").replace('>', "&gt;")
}

pub fn validate_and_sanitize(text: &str) -> Result<String, String> {
    let cleaned = clean_invisible_characters(text);
    
    // 1. Limitação de tamanho (max 4000 caracteres)
    if cleaned.len() > 4000 {
        return Err("Input length exceeds maximum allowed limit".to_string());
    }
    
    // 2. Detecção de padrões de prompt injection
    let set = get_patterns();
    if set.is_match(&cleaned) {
        return Err("Security policy violation: Prompt Injection pattern detected".to_string());
    }
    
    // 3. Sanitização/Escape de tags XML
    let sanitized = escape_xml(&cleaned);
    Ok(sanitized)
}
