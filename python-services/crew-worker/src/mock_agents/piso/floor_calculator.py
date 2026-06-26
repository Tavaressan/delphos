"""
Calculadora determinística de especificações de piso de cabine de elevador.
Artefato de referência incluído no pacote do agente.
A mesma lógica é implementada como tool no crewai_adapter.py.
"""

MATERIAL_TABLE = {
    "residencial": {"base": "granito", "min_thickness_mm": 20, "min_mpa": 40},
    "comercial":   {"base": "granito ou porcelanato técnico", "min_thickness_mm": 25, "min_mpa": 60},
    "hospitalar":  {"base": "resina epóxi antiderrapante", "min_thickness_mm": 15, "min_mpa": 50},
    "carga":       {"base": "chapa de aço xadrez", "min_thickness_mm": 8, "min_mpa": 250},
}

SAFETY_FACTOR = 1.5  # fator de segurança sobre carga nominal


def calculate(floor_type: str, load_kg: int, cabin_width_mm: int, cabin_depth_mm: int) -> dict:
    floor_type = floor_type.lower().strip()
    if floor_type not in MATERIAL_TABLE:
        raise ValueError(f"Tipo de piso inválido: {floor_type!r}. Opções: {list(MATERIAL_TABLE)}")

    area_m2 = (cabin_width_mm / 1000) * (cabin_depth_mm / 1000)
    if area_m2 <= 0:
        raise ValueError("Dimensões da cabine devem ser positivas.")

    spec = MATERIAL_TABLE[floor_type]
    design_load_kg = load_kg * SAFETY_FACTOR
    load_per_m2 = design_load_kg / area_m2

    # Ajuste de espessura por carga/área: +1 mm a cada 50 kg/m² acima de 200
    extra_thickness = max(0, int((load_per_m2 - 200) / 50))
    thickness_mm = spec["min_thickness_mm"] + extra_thickness

    return {
        "floor_type": floor_type,
        "area_m2": round(area_m2, 4),
        "design_load_kg": round(design_load_kg, 1),
        "load_per_m2_kg": round(load_per_m2, 1),
        "recommended_material": spec["base"],
        "min_thickness_mm": thickness_mm,
        "min_compressive_strength_mpa": spec["min_mpa"],
        "installation_notes": (
            f"Instalar sobre contrapiso nivelado com tolerância de ±2 mm. "
            f"Rejunte com epóxi para {'tipo ' + floor_type}. "
            f"Verificar deflexão máxima de L/500 da estrutura do piso."
        ),
    }


if __name__ == "__main__":
    import json
    result = calculate("comercial", 1000, 1400, 2100)
    print(json.dumps(result, ensure_ascii=False, indent=2))
