import yaml

_FALLBACK_GOAL = (
    "Responder perguntas com base no contexto técnico da base de conhecimento."
)

_FALLBACK_BACKSTORY = (
    "You are an expert in elevators and escalators with access to the company's "
    "technical knowledge base. You operate within the Alfabra company context, a major "
    "player in the vertical transport systems industry. Your responses should be concise, "
    "accurate, directly answer the user query based on the retrieved documents, and always "
    "be in portuguese."
)


def parse(text: str, name: str) -> dict:
    if not text:
        return {"role": name, "goal": _FALLBACK_GOAL, "backstory": _FALLBACK_BACKSTORY}

    cleaned = text.strip().lstrip("﻿")
    frontmatter = _extract_frontmatter(cleaned)

    role = frontmatter.get("role") or name
    goal = frontmatter.get("goal") or _FALLBACK_GOAL
    backstory = frontmatter.get("backstory") or cleaned or _FALLBACK_BACKSTORY

    return {"role": role, "goal": goal, "backstory": backstory}


def _extract_frontmatter(text: str) -> dict:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    block = text[3:end].strip()
    try:
        result = yaml.safe_load(block)
        return result if isinstance(result, dict) else {}
    except yaml.YAMLError:
        return {}
