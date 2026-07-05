from unittest.mock import MagicMock, patch

import seed_mock_agents as seed


def _mock_response(json_data):
    resp = MagicMock()
    resp.json.return_value = json_data
    resp.raise_for_status = MagicMock()
    return resp


def test_find_existing_agent_matches_by_tag():
    agents = [
        {"id": "a1", "tag": "compliance", "name": "Agente de Compliance de Elevadores"},
        {"id": "a2", "tag": "piso", "name": "Agente de Piso"},
    ]

    match = seed.find_existing_agent(agents, "piso", "Agente de Piso")

    assert match["id"] == "a2"


def test_find_existing_agent_falls_back_to_name_when_tag_missing():
    agents = [{"id": "a1", "tag": None, "name": "Agente Orquestrador"}]

    match = seed.find_existing_agent(agents, "orquestrador", "Agente Orquestrador")

    assert match["id"] == "a1"


def test_find_existing_agent_returns_none_when_no_match():
    agents = [
        {"id": "a1", "tag": "catalogo", "name": "Agente Catálogo Elevadores Alfabra"}
    ]

    match = seed.find_existing_agent(agents, "piso", "Agente de Piso")

    assert match is None


def test_ensure_agents_reuses_existing_published_agent_without_recreating():
    existing = [
        {
            "id": "existing-id",
            "tag": "compliance",
            "status": "PUBLISHED",
            "name": "Agente de Compliance de Elevadores",
        }
    ]

    with patch("seed_mock_agents.list_agents", return_value=existing), patch(
        "seed_mock_agents.create_agent"
    ) as mock_create, patch("seed_mock_agents.update_tag") as mock_update_tag, patch(
        "seed_mock_agents.publish_agent"
    ) as mock_publish, patch(
        "seed_mock_agents.AGENTS",
        [
            {
                "name": "Agente de Compliance de Elevadores",
                "tag": "compliance",
                "subdir": "compliance",
                "files": ["instructions.md"],
            }
        ],
    ):
        created = seed.ensure_agents("http://localhost:8080", "tenant-1")

    assert created == {"compliance": "existing-id"}
    mock_create.assert_not_called()
    mock_update_tag.assert_not_called()
    mock_publish.assert_not_called()


def test_ensure_agents_publishes_existing_unpublished_agent():
    existing = [
        {
            "id": "existing-id",
            "tag": "piso",
            "status": "DRAFT",
            "name": "Agente de Piso",
        }
    ]

    with patch("seed_mock_agents.list_agents", return_value=existing), patch(
        "seed_mock_agents.create_agent"
    ) as mock_create, patch("seed_mock_agents.publish_agent") as mock_publish, patch(
        "seed_mock_agents.AGENTS",
        [
            {
                "name": "Agente de Piso",
                "tag": "piso",
                "subdir": "piso",
                "files": ["instructions.md"],
            }
        ],
    ):
        created = seed.ensure_agents("http://localhost:8080", "tenant-1")

    assert created == {"piso": "existing-id"}
    mock_create.assert_not_called()
    mock_publish.assert_called_once_with("http://localhost:8080", "existing-id")


def test_ensure_agents_creates_agent_when_none_exists():
    with patch("seed_mock_agents.list_agents", return_value=[]), patch(
        "seed_mock_agents.build_zip", return_value=b"zip-bytes"
    ), patch(
        "seed_mock_agents.create_agent", return_value={"id": "new-id"}
    ) as mock_create, patch(
        "seed_mock_agents.update_tag"
    ) as mock_update_tag, patch(
        "seed_mock_agents.publish_agent"
    ) as mock_publish, patch(
        "seed_mock_agents.AGENTS",
        [
            {
                "name": "Agente Catálogo Elevadores Alfabra",
                "tag": "catalogo",
                "subdir": "catalogo",
                "files": ["instructions.md", "catalogo_elevadores_alfabra.md"],
            }
        ],
    ):
        created = seed.ensure_agents("http://localhost:8080", "tenant-1")

    assert created == {"catalogo": "new-id"}
    mock_create.assert_called_once_with(
        "http://localhost:8080",
        "Agente Catálogo Elevadores Alfabra",
        b"zip-bytes",
        "tenant-1",
    )
    mock_update_tag.assert_called_once_with(
        "http://localhost:8080", "new-id", "catalogo"
    )
    mock_publish.assert_called_once_with("http://localhost:8080", "new-id")


def test_ensure_agents_tolerates_list_agents_failure():
    import requests

    http_error = requests.HTTPError("boom")
    http_error.response = MagicMock(status_code=500, text="boom")

    with patch("seed_mock_agents.list_agents", side_effect=http_error), patch(
        "seed_mock_agents.build_zip", return_value=b"zip-bytes"
    ), patch("seed_mock_agents.create_agent", return_value={"id": "new-id"}), patch(
        "seed_mock_agents.update_tag"
    ), patch(
        "seed_mock_agents.publish_agent"
    ), patch(
        "seed_mock_agents.AGENTS",
        [
            {
                "name": "Agente Orquestrador",
                "tag": "orquestrador",
                "subdir": "orquestrador",
                "files": ["instructions.md"],
            }
        ],
    ):
        created = seed.ensure_agents("http://localhost:8080", "tenant-1")

    assert created == {"orquestrador": "new-id"}
