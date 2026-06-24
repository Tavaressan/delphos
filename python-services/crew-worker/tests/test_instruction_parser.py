import pytest
from runtime.instruction_parser import parse


def test_full_frontmatter():
    text = "---\nrole: HVAC Specialist\ngoal: Analisar sistemas HVAC\nbackstory: Você é especialista em climatização\n---\nResto do conteúdo"
    result = parse(text, "Default Name")
    assert result["role"] == "HVAC Specialist"
    assert result["goal"] == "Analisar sistemas HVAC"
    assert result["backstory"] == "Você é especialista em climatização"


def test_partial_frontmatter_role_only():
    text = "---\nrole: Jurídico\n---\n"
    result = parse(text, "Agente Jurídico")
    assert result["role"] == "Jurídico"
    assert result["goal"]
    assert result["backstory"]


def test_no_frontmatter_uses_name_as_role():
    text = "Sistema de transporte vertical especializado em HVAC."
    result = parse(text, "Agente Teste")
    assert result["role"] == "Agente Teste"
    assert result["backstory"] == text


def test_empty_text_returns_fallback():
    result = parse("", "Nome Fallback")
    assert result["role"] == "Nome Fallback"
    assert result["goal"]
    assert result["backstory"]


def test_none_text_returns_fallback():
    result = parse(None, "Nome Fallback")
    assert result["role"] == "Nome Fallback"
    assert result["backstory"]


def test_bom_prefix_is_stripped():
    text = "﻿---\nrole: BOM Test\ngoal: BOM Goal\nbackstory: BOM Story\n---\n"
    result = parse(text, "BOM Agent")
    assert result["role"] == "BOM Test"
    assert result["goal"] == "BOM Goal"
    assert result["backstory"] == "BOM Story"
