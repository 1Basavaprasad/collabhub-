import uuid
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_user(suffix: str, full_name: str = "Test User") -> dict:
    email = f"notif_user_{suffix}@example.com"
    username = f"notif_user_{suffix}"
    password = "SecurePassword123!"
    ip = f"10.0.{abs(hash(suffix)) % 250 + 1}.{abs(hash(suffix)) % 250 + 1}"
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


def _create_company(headers: dict, name: str) -> str:
    res = client.post(
        "/companies",
        headers=headers,
        json={"name": name, "description": "Test Workspace"},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def test_notification_lifecycle_and_rbac():
    s1 = uuid.uuid4().hex[:8]
    s2 = uuid.uuid4().hex[:8]

    owner = _create_user(s1, "Owner User")
    member = _create_user(s2, "Member User")

    # 1. Create company
    company_id = _create_company(owner["headers"], f"Company {s1}")

    # 2. Add Member to Company
    add_mem = client.post(
        f"/companies/{company_id}/members?user_id={member['id']}&role=MEMBER",
        headers=owner["headers"],
    )
    assert add_mem.status_code == 201, add_mem.text

    # 3. Create Project & Add Member
    proj_res = client.post(
        f"/companies/{company_id}/projects",
        headers=owner["headers"],
        json={"name": f"Project {s1}", "description": "Test Project"},
    )
    assert proj_res.status_code == 201, proj_res.text
    proj_id = proj_res.json()["id"]

    add_proj_mem = client.post(
        f"/companies/{company_id}/projects/{proj_id}/members",
        headers=owner["headers"],
        json={"user_id": member["id"]},
    )
    assert add_proj_mem.status_code == 201, add_proj_mem.text

    # 4. User B should have received a notification for project member added
    notif_res = client.get(
        f"/companies/{company_id}/notifications",
        headers=member["headers"],
    )
    assert notif_res.status_code == 200, notif_res.text
    data = notif_res.json()
    assert data["total"] >= 1
    assert any("Project" in n["title"] or "Project" in n["message"] for n in data["items"])

    # 5. Check unread count for User B
    count_res = client.get(
        f"/companies/{company_id}/notifications/unread-count",
        headers=member["headers"],
    )
    assert count_res.status_code == 200, count_res.text
    assert count_res.json()["unread_count"] >= 1

    # 6. User A assigns task to User B
    task_res = client.post(
        f"/companies/{company_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": "Build Notification System",
            "priority": "HIGH",
            "assignee_id": member["id"],
        },
    )
    assert task_res.status_code == 201, task_res.text
    task_id = task_res.json()["id"]

    # 7. User B checks notifications filter=assignments
    assign_notifs = client.get(
        f"/companies/{company_id}/notifications",
        headers=member["headers"],
        params={"filter": "assignments"},
    )
    assert assign_notifs.status_code == 200, assign_notifs.text
    assign_data = assign_notifs.json()
    assert assign_data["total"] >= 1
    task_notif = next(n for n in assign_data["items"] if "Build Notification System" in n["message"])
    assert task_notif["is_read"] is False
    assert task_notif["deep_link"] is not None

    # 8. Mark single notification as read
    notif_id = task_notif["id"]
    read_res = client.patch(
        f"/companies/{company_id}/notifications/{notif_id}/read",
        headers=member["headers"],
    )
    assert read_res.status_code == 200, read_res.text
    assert read_res.json()["is_read"] is True

    # 9. User A tries to read/delete User B's notification -> Must return 403 Forbidden
    idor_res = client.patch(
        f"/companies/{company_id}/notifications/{notif_id}/read",
        headers=owner["headers"],
    )
    assert idor_res.status_code == 403, idor_res.text

    idor_del = client.delete(
        f"/companies/{company_id}/notifications/{notif_id}",
        headers=owner["headers"],
    )
    assert idor_del.status_code == 403, idor_del.text

    # 10. Mark all as read for User B
    mark_all_res = client.post(
        f"/companies/{company_id}/notifications/read-all",
        headers=member["headers"],
    )
    assert mark_all_res.status_code == 200, mark_all_res.text

    # Verify unread count is 0
    count_zero = client.get(
        f"/companies/{company_id}/notifications/unread-count",
        headers=member["headers"],
    )
    assert count_zero.status_code == 200
    assert count_zero.json()["unread_count"] == 0

    # 11. Delete notification
    del_res = client.delete(
        f"/companies/{company_id}/notifications/{notif_id}",
        headers=member["headers"],
    )
    assert del_res.status_code == 204, del_res.text


def test_notification_preferences():
    s = uuid.uuid4().hex[:8]
    user = _create_user(s, "Pref User")
    company_id = _create_company(user["headers"], f"Company {s}")

    # 1. Get default preferences
    get_res = client.get(
        f"/companies/{company_id}/notifications/preferences",
        headers=user["headers"],
    )
    assert get_res.status_code == 200, get_res.text
    prefs = get_res.json()
    assert prefs["task_assignments_in_app"] is True
    assert prefs["chat_messages_in_app"] is True

    # 2. Update preferences
    patch_res = client.patch(
        f"/companies/{company_id}/notifications/preferences",
        headers=user["headers"],
        json={"task_assignments_in_app": False, "task_updates_email": True},
    )
    assert patch_res.status_code == 200, patch_res.text
    updated = patch_res.json()
    assert updated["task_assignments_in_app"] is False
    assert updated["task_updates_email"] is True
