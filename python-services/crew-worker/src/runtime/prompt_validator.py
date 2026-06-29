import re

# Padrões clássicos de jailbreak e role override
_INJECTION_PATTERNS = [
    r"(?i)(ignore\s+as\s+instruções|ignore\s+as\s+diretrizes|ignore\s+everything\s+above)",
    r"(?i)(daqui\s+em\s+diante|you\s+are\s+now|você\s+agora\s+é)",
    r"(?i)(system\s+bypass|override\s+rules|regras\s+de\s+sistema)",
    r"(?i)(ignore\s+todas\s+as\s+regras|ignore\s+toda\s+a\s+instrução|ignore\s+instruções\s+anteriores)",
]


def clean_invisible_characters(text: str) -> str:
    # Remove caracteres de controle e invisíveis do Unicode, exceto quebras de linha e tabs comuns
    return re.sub(r"[\u200b-\u200d\u200e\u200f\uFEFF\u202a-\u202e]", "", text)


def escape_xml(text: str) -> str:
    # Escape simples para evitar injeções baseadas em tags XML fechando a tag estrutural
    return text.replace("<", "&lt;").replace(">", "&gt;")


def validate_and_sanitize(text: str) -> str:
    if not text:
        return ""

    cleaned = clean_invisible_characters(text)

    # 1. Limitação de tamanho (max 4000 caracteres)
    if len(cleaned) > 4000:
        raise ValueError("Input length exceeds maximum allowed limit")

    # 2. Detecção de padrões de prompt injection
    for pattern in _INJECTION_PATTERNS:
        if re.search(pattern, cleaned):
            raise ValueError(
                "Security policy violation: Prompt Injection pattern detected"
            )

    # 3. Sanitização/Escape de tags XML
    sanitized = escape_xml(cleaned)
    return sanitized
