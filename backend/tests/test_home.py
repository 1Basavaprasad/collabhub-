import uuid
from datetime import datetime, timedelta, timezone
from starlette.testclient import TestClient

from app.main import app
from tests.test_notifications import _create_company, _create_user

client = TestClient(app)


def test_home_command_center_authorization_and_isolation():
    s1 = uuid.uuid4().hex[:8]
    s2 = uuid.uuid4().hex[:8]

    owner1 = _create_user(s1, "Owner One")
    company1_id = _create_company(owner1["headers"], f"Company 1 {s1}")

    owner2 = _create_user(s2, "Owner Two")
    company2_id = _create_company(owner2["headers"], f"Company 2 {s2}")

    # 1. Owner 1 accesses Company 1 Home -> 200 OK
    res1 = client.get(f"/companies/{company1_id}/home", headers=owner1["headers"])
    assert res1.status_code == 200, res1.text
    data1 = res1.json()
    assert data1["workspace_name"] == f"Company 1 {s1}"
    assert data1["user_permissions"]["can_create_project"] is True
    assert data1["user_permissions"]["can_invite_members"] is True

    # 2. Owner 1 attempts to access Company 2 Home -> 403 Forbidden
    res_forbidden = client.get(f"/companies/{company2_id}/home", headers=owner1["headers"])
    assert res_forbidden.status_code == 403, res_forbidden.text


def test_home_my_work_and_attention_counts():
    s1 = uuid.uuid4().hex[:8]
    s2 = uuid.uuid4().hex[:8]

    owner = _create_user(s1, "Owner User")
    member = _create_user(s2, "Member User")
    company_id = _create_company(owner["headers"], f"Company {s1}")

    # Add member to company
    client.post(
        f"/companies/{company_id}/members?user_id={member['id']}&role=MEMBER",
        headers=owner["headers"],
    )

    # Create project and add member
    proj_res = client.post(
        f"/companies/{company_id}/projects",
        headers=owner["headers"],
        json={"name": f"Project {s1}"},
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    client.post(
        f"/companies/{company_id}/projects/{proj_id}/members",
        headers=owner["headers"],
        json={"user_id": member["id"]},
    )

    now = datetime.now(timezone.utc)
    yesterday = (now - timedelta(days=2)).isoformat()
    today = now.isoformat()
    future = (now + timedelta(days=5)).isoformat()

    # 1. Create Overdue Task for Member
    client.post(
        f"/companies/{company_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": "Overdue Task",
            "priority": "HIGH",
            "assignee_id": member["id"],
            "due_date": yesterday,
        },
    )

    # 2. Create Due Today Task for Member
    client.post(
        f"/companies/{company_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": "Due Today Task",
            "priority": "URGENT",
            "assignee_id": member["id"],
            "due_date": today,
        },
    )

    # 3. Create In-Progress Upcoming Task for Member
    client.post(
        f"/companies/{company_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": "In-Progress Task",
            "priority": "MEDIUM",
            "status": "IN_PROGRESS",
            "assignee_id": member["id"],
            "due_date": future,
        },
    )

    # 4. Fetch Home Command Center for Member
    home_res = client.get(f"/companies/{company_id}/home", headers=member["headers"])
    assert home_res.status_code == 200, home_res.text
    data = home_res.json()

    # Verify Attention Summary
    attention = data["attention"]
    assert attention["overdue_count"] >= 1
    assert attention["due_today_count"] >= 1
    assert attention["in_progress_count"] >= 1

    # Verify My Work categories
    my_work = data["my_work"]
    assert any(t["title"] == "Overdue Task" for t in my_work["overdue"])
    assert any(t["title"] == "Due Today Task" for t in my_work["due_today"])
    assert any(t["title"] == "In-Progress Task" for t in my_work["in_progress"])


def test_home_project_progress_and_metrics():
    s = uuid.uuid4().hex[:8]
    owner = _create_user(s, "Project Owner")
    company_id = _create_company(owner["headers"], f"Progress Co {s}")

    # Create project
    proj_res = client.post(
        f"/companies/{company_id}/projects",
        headers=owner["headers"],
        json={"name": "Alpha Milestone"},
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # Add 2 completed tasks and 2 in-progress tasks
    t1 = client.post(
        f"/companies/{company_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={"title": "Task Done 1", "status": "DONE"},
    ).json()

    t2 = client.post(
        f"/companies/{company_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={"title": "Task Done 2", "status": "DONE"},
    ).json()

    client.post(
        f"/companies/{company_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={"title": "Task Todo 3", "status": "TODO"},
    )

    client.post(
        f"/companies/{company_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={"title": "Task In Progress 4", "status": "IN_PROGRESS"},
    )

    # Check Home
    home_res = client.get(f"/companies/{company_id}/home", headers=owner["headers"])
    assert home_res.status_code == 200, home_res.text
    data = home_res.json()

    projects = data["recent_projects"]
    assert len(projects) >= 1
    alpha_proj = next(p for p in projects if p["id"] == proj_id)
    assert alpha_proj["total_tasks"] == 4
    assert alpha_proj["completed_tasks"] == 2
    assert alpha_proj["in_progress_tasks"] == 1
    assert alpha_proj["completion_percentage"] == 50.0


def test_home_empty_workspace_state():
    s = uuid.uuid4().hex[:8]
    owner = _create_user(s, "Empty Co Owner")
    company_id = _create_company(owner["headers"], f"Empty Co {s}")

    home_res = client.get(f"/companies/{company_id}/home", headers=owner["headers"])
    assert home_res.status_code == 200, home_res.text
    data = home_res.json()

    assert data["attention"]["overdue_count"] == 0
    assert data["attention"]["due_today_count"] == 0
    assert data["attention"]["in_progress_count"] == 0
    assert data["my_work"]["overdue"] == []
    assert data["my_work"]["due_today"] == []
    assert data["recent_projects"] == []
    assert data["user_permissions"]["can_create_project"] is True
