import uuid
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_and_login_user(suffix: str, full_name: str = "Test User"):
    email = f"team_user_{suffix}@example.com"
    username = f"team_user_{suffix}"
    password = "SecurePassword123!"

    reg_res = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "full_name": full_name,
            "password": password,
        },
    )
    assert reg_res.status_code == 201
    user_id = reg_res.json()["id"]

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return {
        "id": user_id,
        "email": email,
        "username": username,
        "full_name": full_name,
        "headers": headers,
    }


def test_team_lifecycle_permissions_and_membership():
    suffix1 = uuid.uuid4().hex[:8]
    suffix2 = uuid.uuid4().hex[:8]
    suffix3 = uuid.uuid4().hex[:8]
    suffix4 = uuid.uuid4().hex[:8]
    suffix5 = uuid.uuid4().hex[:8]
    suffix6 = uuid.uuid4().hex[:8]

    owner = _create_and_login_user(suffix1, "Owner Basavaprasad")
    admin = _create_and_login_user(suffix2, "Admin Priya")
    member = _create_and_login_user(suffix3, "Member Rahul")
    member2 = _create_and_login_user(suffix4, "Member Anil")
    member3 = _create_and_login_user(suffix6, "Member Sneha")
    outsider = _create_and_login_user(suffix5, "Outsider User")

    # 1. Create Company
    comp_res = client.post(
        "/companies",
        headers=owner["headers"],
        json={"name": f"BRN Tech {suffix1}", "description": "Tech workspace"},
    )
    assert comp_res.status_code == 201
    company_id = comp_res.json()["id"]

    # Add admin and members to company
    client.post(
        f"/companies/{company_id}/members?user_id={admin['id']}&role=ADMIN",
        headers=owner["headers"],
    )
    client.post(
        f"/companies/{company_id}/members?user_id={member['id']}&role=MEMBER",
        headers=owner["headers"],
    )
    client.post(
        f"/companies/{company_id}/members?user_id={member2['id']}&role=MEMBER",
        headers=owner["headers"],
    )
    client.post(
        f"/companies/{company_id}/members?user_id={member3['id']}&role=MEMBER",
        headers=owner["headers"],
    )

    # 2. Member cannot create team -> 403
    mem_create = client.post(
        f"/companies/{company_id}/teams",
        headers=member["headers"],
        json={"name": "Dev Team", "description": "Developers"},
    )
    assert mem_create.status_code == 403
    assert "Only workspace owners and admins can create new teams" in mem_create.json()["detail"]

    # 3. Outsider cannot create team -> 403
    out_create = client.post(
        f"/companies/{company_id}/teams",
        headers=outsider["headers"],
        json={"name": "Out Team"},
    )
    assert out_create.status_code == 403

    # 4. Owner creates team with visual identity (icon and color) -> 201
    owner_create = client.post(
        f"/companies/{company_id}/teams",
        headers=owner["headers"],
        json={
            "name": "Engineering",
            "description": "Core software engineering",
            "icon": "code",
            "color": "indigo",
        },
    )
    assert owner_create.status_code == 201
    eng_team = owner_create.json()
    eng_team_id = eng_team["id"]
    assert eng_team["name"] == "Engineering"
    assert eng_team["icon"] == "code"
    assert eng_team["color"] == "indigo"
    assert eng_team["is_archived"] is False
    assert eng_team["member_count"] == 1
    assert len(eng_team["leads"]) == 1
    assert eng_team["leads"][0]["id"] == owner["id"]

    # 5. Admin creates another team -> 201
    admin_create = client.post(
        f"/companies/{company_id}/teams",
        headers=admin["headers"],
        json={"name": "Automation", "description": "QA & testing", "icon": "zap", "color": "emerald"},
    )
    assert admin_create.status_code == 201
    auto_team = admin_create.json()
    auto_team_id = auto_team["id"]
    assert auto_team["name"] == "Automation"

    # 6. Duplicate team name in same company -> 409
    dup_res = client.post(
        f"/companies/{company_id}/teams",
        headers=owner["headers"],
        json={"name": "Engineering"},
    )
    assert dup_res.status_code == 409

    # 7. List teams in company with filters
    list_res = client.get(
        f"/companies/{company_id}/teams",
        headers=member["headers"],
    )
    assert list_res.status_code == 200
    teams_list = list_res.json()
    assert len(teams_list) == 2

    # 8. Batch add team members (member and member2)
    batch_res = client.post(
        f"/companies/{company_id}/teams/{eng_team_id}/members/batch",
        headers=owner["headers"],
        json={"user_ids": [member["id"], member2["id"]], "role": "MEMBER"},
    )
    assert batch_res.status_code == 201
    assert len(batch_res.json()) == 2

    # 9. Leadership Transfer: Transfer leadership from owner to member (Rahul)
    transfer_res = client.post(
        f"/companies/{company_id}/teams/{eng_team_id}/transfer-leadership",
        headers=owner["headers"],
        json={"new_lead_user_id": member["id"]},
    )
    assert transfer_res.status_code == 200
    assert "transferred successfully" in transfer_res.json()["message"]

    # Verify team details reflects new lead
    get_eng = client.get(
        f"/companies/{company_id}/teams/{eng_team_id}",
        headers=member["headers"],
    )
    assert get_eng.status_code == 200
    leads = [l["id"] for l in get_eng.json()["leads"]]
    assert member["id"] in leads

    # 10. Archive Team
    archive_res = client.post(
        f"/companies/{company_id}/teams/{auto_team_id}/archive",
        headers=admin["headers"],
    )
    assert archive_res.status_code == 200
    assert archive_res.json()["is_archived"] is True

    # Filter active teams -> should only show Engineering
    active_list = client.get(
        f"/companies/{company_id}/teams?status=active",
        headers=owner["headers"],
    )
    assert active_list.status_code == 200
    assert len(active_list.json()) == 1
    assert active_list.json()[0]["id"] == eng_team_id

    # Filter archived teams -> should show Automation
    archived_list = client.get(
        f"/companies/{company_id}/teams?status=archived",
        headers=owner["headers"],
    )
    assert archived_list.status_code == 200
    assert len(archived_list.json()) == 1
    assert archived_list.json()[0]["id"] == auto_team_id

    # Restore Team
    restore_res = client.post(
        f"/companies/{company_id}/teams/{auto_team_id}/restore",
        headers=owner["headers"],
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["is_archived"] is False

    # 11. My Teams filter (for member Rahul) -> should only return Engineering
    my_teams_res = client.get(
        f"/companies/{company_id}/teams?my_teams=true",
        headers=member["headers"],
    )
    assert my_teams_res.status_code == 200
    assert len(my_teams_res.json()) == 1
    assert my_teams_res.json()[0]["id"] == eng_team_id

    # 12. Check real team activity logs
    activity_res = client.get(
        f"/companies/{company_id}/teams/{eng_team_id}/activity",
        headers=member["headers"],
    )
    assert activity_res.status_code == 200
    activities = activity_res.json()
    assert len(activities) >= 3
    actions = [a["action"] for a in activities]
    assert "TEAM_CREATED" in actions
    assert "MEMBER_ADDED" in actions
    assert "LEADERSHIP_TRANSFERRED" in actions

    # 13. Delete team
    delete_res = client.delete(
        f"/companies/{company_id}/teams/{auto_team_id}",
        headers=admin["headers"],
    )
    assert delete_res.status_code == 204
