import uuid
from datetime import datetime, timezone, timedelta
import pytest
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_and_login_user(suffix: str, full_name: str = "Test User"):
    email = f"pact_{suffix}@example.com"
    username = f"pact_{suffix}"
    password = "SecurePassword123!"
    ip = f"192.168.{abs(hash(suffix)) % 250 + 1}.{abs(hash(suffix)) % 250 + 1}"
    req_headers = {"X-Forwarded-For": ip}

    reg_res = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "full_name": full_name,
            "password": password,
        },
        headers=req_headers,
    )
    assert reg_res.status_code == 201, reg_res.text
    user_id = reg_res.json()["id"]

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": password},
        headers=req_headers,
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Forwarded-For": ip}

    return {
        "id": user_id,
        "email": email,
        "username": username,
        "full_name": full_name,
        "headers": headers,
    }


def test_project_activity_lifecycle_and_security():
    s_owner = uuid.uuid4().hex[:8]
    s_member = uuid.uuid4().hex[:8]
    s_outsider = uuid.uuid4().hex[:8]
    s_comp_b = uuid.uuid4().hex[:8]

    owner = _create_and_login_user(s_owner, "Basavaprasad")
    member = _create_and_login_user(s_member, "Kailash")
    outsider = _create_and_login_user(s_outsider, "Outsider Suresh")
    comp_b_owner = _create_and_login_user(s_comp_b, "Comp B Owner")

    # 1. Create Company A
    c_res = client.post(
        "/companies",
        json={"name": f"Acme Org {s_owner}"},
        headers=owner["headers"],
    )
    assert c_res.status_code == 201, c_res.text
    company_id = c_res.json()["id"]

    # 2. Add Kailash as company member directly
    add_m = client.post(
        f"/companies/{company_id}/members?user_id={member['id']}&role=MEMBER",
        headers=owner["headers"],
    )
    assert add_m.status_code == 201

    # 3. Create Project
    p_res = client.post(
        f"/companies/{company_id}/projects",
        json={"name": "Authentication Redesign"},
        headers=owner["headers"],
    )
    assert p_res.status_code == 201, p_res.text
    project_id = p_res.json()["id"]

    # 4. Add Kailash to project directly
    pm_res = client.post(
        f"/companies/{company_id}/projects/{project_id}/members",
        json={"user_id": member["id"]},
        headers=owner["headers"],
    )
    assert pm_res.status_code == 201, pm_res.text

    # 5. Create Task (unassigned first) -> TASK_CREATED
    t1_res = client.post(
        f"/companies/{company_id}/projects/{project_id}/tasks",
        json={
            "title": "Implement authentication API",
            "description": "OAuth2 and JWT token support",
            "priority": "MEDIUM",
        },
        headers=owner["headers"],
    )
    assert t1_res.status_code == 201, t1_res.text
    task1_id = t1_res.json()["id"]

    # Check activity
    act_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=owner["headers"],
    )
    assert act_res.status_code == 200, act_res.text
    items = act_res.json()["items"]
    assert len(items) >= 1
    assert items[0]["action"] == "TASK_CREATED"
    assert "Implement authentication API" in items[0]["details"]
    assert items[0]["actor"]["full_name"] == "Basavaprasad"

    # 6. Assign task to Kailash -> TASK_ASSIGNED
    assign_res = client.patch(
        f"/companies/{company_id}/projects/{project_id}/tasks/{task1_id}",
        json={"assignee_id": member["id"]},
        headers=owner["headers"],
    )
    assert assign_res.status_code == 200, assign_res.text

    act_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=owner["headers"],
    )
    items = act_res.json()["items"]
    assert items[0]["action"] == "TASK_ASSIGNED"
    assert "Kailash" in items[0]["details"]
    assert items[0]["target_user"]["full_name"] == "Kailash"
    assert items[0]["actor"]["full_name"] == "Basavaprasad"
    # Verify NO raw UUIDs exposed in details
    assert str(member["id"]) not in items[0]["details"]

    # 7. Move task status TODO -> IN_PROGRESS -> TASK_STATUS_CHANGED
    status_res = client.patch(
        f"/companies/{company_id}/projects/{project_id}/tasks/{task1_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=member["headers"],
    )
    assert status_res.status_code == 200, status_res.text

    act_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=owner["headers"],
    )
    items = act_res.json()["items"]
    assert items[0]["action"] == "TASK_STATUS_CHANGED"
    assert "In Progress" in items[0]["details"]
    assert items[0]["actor"]["full_name"] == "Kailash"

    # 8. Change priority Medium -> High -> TASK_PRIORITY_CHANGED
    prio_res = client.patch(
        f"/companies/{company_id}/projects/{project_id}/tasks/{task1_id}",
        json={"priority": "HIGH"},
        headers=owner["headers"],
    )
    assert prio_res.status_code == 200, prio_res.text

    act_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=owner["headers"],
    )
    items = act_res.json()["items"]
    assert items[0]["action"] == "TASK_PRIORITY_CHANGED"
    assert "High" in items[0]["details"]

    # 9. Change due date -> TASK_DUE_DATE_CHANGED
    due_dt = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    due_res = client.patch(
        f"/companies/{company_id}/projects/{project_id}/tasks/{task1_id}",
        json={"due_date": due_dt},
        headers=owner["headers"],
    )
    assert due_res.status_code == 200, due_res.text

    act_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=owner["headers"],
    )
    items = act_res.json()["items"]
    assert items[0]["action"] == "TASK_DUE_DATE_CHANGED"

    # 10. Complete task -> TASK_COMPLETED
    comp_res = client.post(
        f"/companies/{company_id}/projects/{project_id}/tasks/{task1_id}/complete",
        headers=member["headers"],
    )
    assert comp_res.status_code == 200, comp_res.text

    act_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=owner["headers"],
    )
    items = act_res.json()["items"]
    assert items[0]["action"] == "TASK_COMPLETED"
    assert "completed" in items[0]["details"]

    # 11. Create a task directly with initial assignee -> TASK_CREATED & TASK_ASSIGNED
    t2_res = client.post(
        f"/companies/{company_id}/projects/{project_id}/tasks",
        json={
            "title": "Setup rate limiting",
            "assignee_id": member["id"],
            "priority": "LOW",
        },
        headers=owner["headers"],
    )
    assert t2_res.status_code == 201, t2_res.text
    task2_id = t2_res.json()["id"]

    act_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=owner["headers"],
    )
    items = act_res.json()["items"]
    actions = [i["action"] for i in items[:2]]
    assert "TASK_ASSIGNED" in actions
    assert "TASK_CREATED" in actions

    # 12. Unassign task2 -> TASK_UNASSIGNED
    unassign_res = client.patch(
        f"/companies/{company_id}/projects/{project_id}/tasks/{task2_id}",
        json={"assignee_id": None},
        headers=owner["headers"],
    )
    assert unassign_res.status_code == 200, unassign_res.text

    act_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=owner["headers"],
    )
    items = act_res.json()["items"]
    assert items[0]["action"] == "TASK_UNASSIGNED"
    assert "removed Kailash" in items[0]["details"] or "Kailash" in items[0]["details"]

    # 13. Delete task2 -> TASK_DELETED
    del_res = client.delete(
        f"/companies/{company_id}/projects/{project_id}/tasks/{task2_id}",
        headers=owner["headers"],
    )
    assert del_res.status_code == 204, del_res.text

    act_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=owner["headers"],
    )
    items = act_res.json()["items"]
    assert items[0]["action"] == "TASK_DELETED"
    assert "Setup rate limiting" in items[0]["details"]

    # 14. Security & RBAC:
    # Kailash (project member) CAN view activity
    m_act_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=member["headers"],
    )
    assert m_act_res.status_code == 200

    # Outsider CANNOT view activity (403 or 404)
    out_res = client.get(
        f"/companies/{company_id}/projects/{project_id}/activity",
        headers=outsider["headers"],
    )
    assert out_res.status_code in (403, 404)

    # Cross-company isolation
    c_b_res = client.post(
        "/companies",
        json={"name": f"Company B {s_comp_b}"},
        headers=comp_b_owner["headers"],
    )
    assert c_b_res.status_code == 201
    comp_b_id = c_b_res.json()["id"]

    cross_res = client.get(
        f"/companies/{comp_b_id}/projects/{project_id}/activity",
        headers=comp_b_owner["headers"],
    )
    assert cross_res.status_code == 404
