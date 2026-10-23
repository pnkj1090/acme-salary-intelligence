from fastapi import status


def test_list_question_templates(client):
    response = client.get("/api/v1/questions/templates")
    assert response.status_code == status.HTTP_200_OK
    templates = response.json()
    assert len(templates) >= 7
    ids = [t["id"] for t in templates]
    assert "active_employees_by_country" in ids
    assert "highest_median_salary_department" in ids
    assert "employees_above_salary_threshold" in ids


def test_query_active_employees_by_country(client, sample_employee):
    payload = {"question_id": "active_employees_by_country"}
    response = client.post("/api/v1/questions/query", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["question_id"] == "active_employees_by_country"
    assert "ACME has" in data["natural_language_summary"]
    assert data["numerical_result"] is not None
    assert len(data["table_data"]) >= 1


def test_query_unsupported_question(client):
    payload = {"question_id": "how_many_aliens_at_acme"}
    response = client.post("/api/v1/questions/query", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "not recognized" in data["natural_language_summary"]
    assert data["numerical_result"] is None
