import uuid
import pytest
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_and_login_user(username_prefix: str, full_name: str = "Test User") -> dict:
    """Helper to create and login a unique user for testing."""
    email = f"{username_prefix}@teamx-pagination.com"
    password = "SecurePassword123!"
    reg_res = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username_prefix,
            "full_name": full_name,
            "password": password,
        },
        headers={"X-Forwarded-For": f"10.50.{uuid.uuid4().int % 250}.1"},
    )
    assert reg_res.status_code == 201, reg_res.text
    user_data = reg_res.json()

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": password},
        headers={"X-Forwarded-For": f"10.50.{uuid.uuid4().int % 250}.2"},
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    return {
        "id": user_data["id"],
        "email": email,
        "username": username_prefix,
        "full_name": full_name,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


def test_company_members_pagination_and_filtering():
    """
    Tests 1, 2, 3, 5, 6:
    - Default pagination returns 20 or fewer items.
    - page=2 returns next page.
    - limit=5 returns 5 items.
    - Filtering by role, department, search happens in SQL before pagination.
    - Total count is accurate.
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"pg_own_{suffix}", "Owner Boss")

    # Create company
    c_res = client.post("/companies", headers=owner["headers"], json={"name": f"Paginated Corp {suffix}"})
    assert c_res.status_code == 201
    company_id = c_res.json()["id"]

    # Create and add 12 additional members (Total members = 13)
    created_members = []
    for i in range(1, 13):
        dept = "Engineering" if i <= 6 else "Marketing"
        role = "ADMIN" if i in (1, 2) else "MEMBER"
        user = _create_and_login_user(f"pg_usr_{i}_{suffix}", f"Employee {i}")
        add_res = client.post(
            f"/companies/{company_id}/members?user_id={user['id']}&role={role}&department={dept}&designation=Staff_{i}",
            headers=owner["headers"],
        )
        assert add_res.status_code == 201
        created_members.append(user)

    # TEST 1 & 6: Default pagination (page=1, limit=20) -> total=13, returns all 13
    res_default = client.get(f"/companies/{company_id}/members", headers=owner["headers"])
    assert res_default.status_code == 200
    data_default = res_default.json()
    assert data_default["total"] == 13
    assert data_default["page"] == 1
    assert data_default["limit"] == 20
    assert data_default["total_pages"] == 1
    assert data_default["has_next"] is False
    assert data_default["has_previous"] is False
    assert len(data_default["items"]) == 13

    # TEST 3: limit=5, page=1 -> 5 items returned, total=13, total_pages=3, has_next=True
    res_p1 = client.get(f"/companies/{company_id}/members?page=1&limit=5", headers=owner["headers"])
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()
    assert len(data_p1["items"]) == 5
    assert data_p1["total"] == 13
    assert data_p1["page"] == 1
    assert data_p1["limit"] == 5
    assert data_p1["total_pages"] == 3
    assert data_p1["has_next"] is True
    assert data_p1["has_previous"] is False

    # TEST 2: page=2, limit=5 -> next 5 items returned, has_previous=True, has_next=True
    res_p2 = client.get(f"/companies/{company_id}/members?page=2&limit=5", headers=owner["headers"])
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()
    assert len(data_p2["items"]) == 5
    assert data_p2["page"] == 2
    assert data_p2["has_next"] is True
    assert data_p2["has_previous"] is True
    # Ensure items on page 1 and page 2 are disjoint
    p1_ids = {m["id"] for m in data_p1["items"]}
    p2_ids = {m["id"] for m in data_p2["items"]}
    assert p1_ids.isdisjoint(p2_ids)

    # TEST 5: Role and department filtering before pagination
    res_filtered = client.get(
        f"/companies/{company_id}/members?department=Engineering&role=ADMIN&page=1&limit=10",
        headers=owner["headers"],
    )
    assert res_filtered.status_code == 200
    data_filtered = res_filtered.json()
    assert data_filtered["total"] == 2
    assert len(data_filtered["items"]) == 2
    for m in data_filtered["items"]:
        assert m["role"] == "ADMIN"
        assert m["department"] == "Engineering"

    # Search filter
    res_search = client.get(
        f"/companies/{company_id}/members?search=Employee%201&page=1&limit=10",
        headers=owner["headers"],
    )
    assert res_search.status_code == 200
    data_search = res_search.json()
    # Matches Employee 1, Employee 10, Employee 11, Employee 12
    assert data_search["total"] >= 4
    for m in data_search["items"]:
        assert "Employee 1" in m["user"]["full_name"] or "Employee 1" in m["designation"]


from unittest.mock import patch


def test_invitations_pagination_and_status_filtering():
    """
    Tests 7, 8:
    - Invitation pagination works (page, limit, total, total_pages).
    - Status filtering + pagination works together.
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"pg_inv_own_{suffix}", "Inv Owner")

    c_res = client.post("/companies", headers=owner["headers"], json={"name": f"Inv Corp {suffix}"})
    company_id = c_res.json()["id"]

    # Create 7 invitations with mocked email delivery
    with patch("app.services.company_invitation.send_company_invitation_email"):
        for i in range(1, 8):
            client.post(
                f"/companies/{company_id}/invitations",
                headers=owner["headers"],
                json={"email": f"invite_{i}_{suffix}@teamx-pagination.com", "role": "MEMBER", "department": "Sales"},
            )

    # TEST 7: Page 1, limit 3 -> 3 items, total 7, total_pages 3, has_next True
    res_p1 = client.get(f"/companies/{company_id}/invitations?page=1&limit=3", headers=owner["headers"])
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()
    assert data_p1["total"] == 7
    assert len(data_p1["items"]) == 3
    assert data_p1["page"] == 1
    assert data_p1["limit"] == 3
    assert data_p1["total_pages"] == 3
    assert data_p1["has_next"] is True
    assert data_p1["has_previous"] is False

    # TEST 8: Filter by PENDING status
    res_pending = client.get(
        f"/companies/{company_id}/invitations?status=PENDING&page=1&limit=10",
        headers=owner["headers"],
    )
    assert res_pending.status_code == 200
    data_pending = res_pending.json()
    assert data_pending["total"] == 7
    assert len(data_pending["items"]) == 7
    for inv in data_pending["items"]:
        assert inv["status"] == "PENDING"


def test_teams_pagination_and_filters():
    """
    Tests 9, 10:
    - Team pagination works.
    - Active/archived/my_teams filtering works with pagination.
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"pg_tm_own_{suffix}", "Team Owner")
    user2 = _create_and_login_user(f"pg_tm_u2_{suffix}", "User Two")

    c_res = client.post("/companies", headers=owner["headers"], json={"name": f"Team Corp {suffix}"})
    company_id = c_res.json()["id"]

    # Add user2 to company
    client.post(f"/companies/{company_id}/members?user_id={user2['id']}&role=MEMBER", headers=owner["headers"])

    # Create 6 teams
    team_ids = []
    for i in range(1, 7):
        t_res = client.post(
            f"/companies/{company_id}/teams",
            headers=owner["headers"],
            json={"name": f"Team {i} {suffix}", "description": f"Team {i} description"},
        )
        assert t_res.status_code == 201
        t_id = t_res.json()["id"]
        team_ids.append(t_id)

    # Archive team 6
    client.post(f"/companies/{company_id}/teams/{team_ids[5]}/archive", headers=owner["headers"])

    # Add user2 only to team 1 and team 2
    client.post(f"/companies/{company_id}/teams/{team_ids[0]}/members", headers=owner["headers"], json={"user_id": user2["id"]})
    client.post(f"/companies/{company_id}/teams/{team_ids[1]}/members", headers=owner["headers"], json={"user_id": user2["id"]})

    # TEST 9: Team pagination limit=2, page=1
    res_teams = client.get(f"/companies/{company_id}/teams?page=1&limit=2", headers=owner["headers"])
    assert res_teams.status_code == 200
    data_teams = res_teams.json()
    assert data_teams["total"] == 6
    assert len(data_teams["items"]) == 2
    assert data_teams["total_pages"] == 3
    assert data_teams["has_next"] is True

    # TEST 10: Active filter -> total=5
    res_active = client.get(f"/companies/{company_id}/teams?status=active&page=1&limit=10", headers=owner["headers"])
    assert res_active.status_code == 200
    assert res_active.json()["total"] == 5

    # Archived filter -> total=1
    res_archived = client.get(f"/companies/{company_id}/teams?status=archived&page=1&limit=10", headers=owner["headers"])
    assert res_archived.status_code == 200
    assert res_archived.json()["total"] == 1
    assert res_archived.json()["items"][0]["is_archived"] is True

    # my_teams filter for user2 -> total=2
    res_my_teams = client.get(f"/companies/{company_id}/teams?my_teams=true&page=1&limit=10", headers=user2["headers"])
    assert res_my_teams.status_code == 200
    assert res_my_teams.json()["total"] == 2


def test_team_members_and_activity_pagination():
    """
    Tests 11, 12, 13:
    - Team member pagination works.
    - Activity pagination works.
    - Activity remains newest-first and deterministic.
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"pg_tma_own_{suffix}", "TMA Owner")

    c_res = client.post("/companies", headers=owner["headers"], json={"name": f"TMA Corp {suffix}"})
    company_id = c_res.json()["id"]

    t_res = client.post(
        f"/companies/{company_id}/teams",
        headers=owner["headers"],
        json={"name": f"Core Team {suffix}"},
    )
    team_id = t_res.json()["id"]

    # Add 5 members to company and team
    for i in range(1, 6):
        u = _create_and_login_user(f"pg_tm_usr_{i}_{suffix}", f"Developer {i}")
        client.post(f"/companies/{company_id}/members?user_id={u['id']}&role=MEMBER", headers=owner["headers"])
        client.post(f"/companies/{company_id}/teams/{team_id}/members", headers=owner["headers"], json={"user_id": u["id"]})

    # TEST 11: Team members pagination (Owner + 5 members = 6 members)
    res_tm = client.get(f"/companies/{company_id}/teams/{team_id}/members?page=1&limit=3", headers=owner["headers"])
    assert res_tm.status_code == 200
    data_tm = res_tm.json()
    assert data_tm["total"] == 6
    assert len(data_tm["items"]) == 3
    assert data_tm["total_pages"] == 2
    assert data_tm["has_next"] is True

    # TEST 12 & 13: Team activity pagination & newest-first order
    # Activities: 1 creation + 5 member additions = 6 activities
    res_act = client.get(f"/companies/{company_id}/teams/{team_id}/activity?page=1&limit=4", headers=owner["headers"])
    assert res_act.status_code == 200
    data_act = res_act.json()
    assert data_act["total"] >= 6
    assert len(data_act["items"]) == 4
    assert data_act["has_next"] is True

    # Check newest-first ordering
    timestamps = [item["created_at"] for item in data_act["items"]]
    assert timestamps == sorted(timestamps, reverse=True)


def test_pagination_security_and_cross_company():
    """
    Tests 14, 15:
    - Unauthorized user cannot access paginated company data.
    - Cross-company access is rejected.
    """
    suffix = uuid.uuid4().hex[:8]
    owner_a = _create_and_login_user(f"sec_a_{suffix}", "Owner A")
    owner_b = _create_and_login_user(f"sec_b_{suffix}", "Owner B")

    c_a = client.post("/companies", headers=owner_a["headers"], json={"name": f"Sec A {suffix}"}).json()["id"]
    c_b = client.post("/companies", headers=owner_b["headers"], json={"name": f"Sec B {suffix}"}).json()["id"]

    # TEST 14: Unauthenticated user -> 401 Unauthorized
    res_unauth = client.get(f"/companies/{c_a}/members?page=1&limit=10")
    assert res_unauth.status_code == 401

    # TEST 15: Owner B tries to access Company A members -> 403 Forbidden
    res_cross_members = client.get(f"/companies/{c_a}/members?page=1&limit=10", headers=owner_b["headers"])
    assert res_cross_members.status_code == 403

    # Cross company invitations -> 403 Forbidden
    res_cross_inv = client.get(f"/companies/{c_a}/invitations?page=1&limit=10", headers=owner_b["headers"])
    assert res_cross_inv.status_code == 403

    # Cross company teams -> 403 Forbidden
    res_cross_teams = client.get(f"/companies/{c_a}/teams?page=1&limit=10", headers=owner_b["headers"])
    assert res_cross_teams.status_code == 403


def test_pagination_validation_errors():
    """
    Tests 4, 16, 17, 18:
    - page=0 rejected (422).
    - limit=0 rejected (422).
    - limit>100 rejected (422).
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"val_{suffix}", "Val Owner")
    c_id = client.post("/companies", headers=owner["headers"], json={"name": f"Val Corp {suffix}"}).json()["id"]

    # TEST 16: page=0 -> 422
    res_page_zero = client.get(f"/companies/{c_id}/members?page=0&limit=20", headers=owner["headers"])
    assert res_page_zero.status_code == 422

    # TEST 17: limit=0 -> 422
    res_limit_zero = client.get(f"/companies/{c_id}/members?page=1&limit=0", headers=owner["headers"])
    assert res_limit_zero.status_code == 422

    # TEST 4 & 18: limit=101 -> 422
    res_limit_large = client.get(f"/companies/{c_id}/members?page=1&limit=101", headers=owner["headers"])
    assert res_limit_large.status_code == 422

    # Same validation on teams
    res_team_val = client.get(f"/companies/{c_id}/teams?limit=500", headers=owner["headers"])
    assert res_team_val.status_code == 422
