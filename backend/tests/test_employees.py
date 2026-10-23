from decimal import Decimal

from fastapi import status


def test_create_employee_success(client, sample_department):
    payload = {
        "employee_number": "EMP-99001",
        "first_name": "Alice",
        "last_name": "Smith",
        "email": "alice.smith@acme-corp.internal",
        "country_code": "US",
        "department_id": sample_department.id,
        "job_title": "Product Designer",
        "employment_status": "ACTIVE",
        "hire_date": "2024-02-01",
        "annual_salary": "115000.00",
        "currency_code": "USD",
    }
    response = client.post("/api/v1/employees", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["employee_number"] == "EMP-99001"
    assert data["first_name"] == "Alice"
    assert Decimal(str(data["current_salary"])) == Decimal("115000.00")
    assert len(data["compensations"]) == 1


def test_create_employee_duplicate_email(client, sample_employee):
    payload = {
        "employee_number": "EMP-DIFF-01",
        "first_name": "Duplicate",
        "last_name": "Email",
        "email": sample_employee.email,  # duplicate
        "country_code": "US",
        "department_id": sample_employee.department_id,
        "job_title": "Engineer",
        "employment_status": "ACTIVE",
        "hire_date": "2024-01-01",
        "annual_salary": "100000.00",
        "currency_code": "USD",
    }
    response = client.post("/api/v1/employees", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response.json()["detail"]


def test_create_employee_duplicate_number(client, sample_employee):
    payload = {
        "employee_number": sample_employee.employee_number,  # duplicate
        "first_name": "Duplicate",
        "last_name": "Number",
        "email": "diff.email@acme-corp.internal",
        "country_code": "US",
        "department_id": sample_employee.department_id,
        "job_title": "Engineer",
        "employment_status": "ACTIVE",
        "hire_date": "2024-01-01",
        "annual_salary": "100000.00",
        "currency_code": "USD",
    }
    response = client.post("/api/v1/employees", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already in use" in response.json()["detail"]


def test_update_employee_salary_history(client, sample_employee):
    # Adjust salary
    update_payload = {
        "annual_salary": "165000.00",
        "job_title": "Staff Software Engineer",
    }
    response = client.patch(f"/api/v1/employees/{sample_employee.id}", json=update_payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert Decimal(str(data["current_salary"])) == Decimal("165000.00")
    assert data["job_title"] == "Staff Software Engineer"
    # Should now have 2 compensation records (one closed, one active)
    assert len(data["compensations"]) == 2


def test_deactivate_employee(client, sample_employee):
    response = client.post(f"/api/v1/employees/{sample_employee.id}/deactivate")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["employment_status"] == "INACTIVE"
    # Historical compensation is preserved
    assert len(data["compensations"]) >= 1


def test_get_employees_pagination_and_search(client, sample_employee):
    # Test pagination
    response = client.get("/api/v1/employees?page=1&size=10")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1
    assert data["page"] == 1

    # Test search matching
    search_resp = client.get(f"/api/v1/employees?search={sample_employee.first_name}")
    assert search_resp.status_code == status.HTTP_200_OK
    search_data = search_resp.json()
    assert any(e["id"] == sample_employee.id for e in search_data["items"])

    # Test search non-matching
    non_resp = client.get("/api/v1/employees?search=NonExistentPersonName123XYZ")
    assert non_resp.status_code == status.HTTP_200_OK
    assert non_resp.json()["total"] == 0


def test_csv_export_sanitization(client, sample_employee):
    response = client.get("/api/v1/export/employees")
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    content = response.text
    assert "Employee Number,First Name,Last Name" in content
    assert sample_employee.employee_number in content
