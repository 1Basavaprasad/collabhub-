import uuid
from unittest.mock import patch
# pyrefly: ignore [missing-import]
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_user(suffix: str, full_name: str = "Test User"):
    email = f"authz_{suffix}@example.com"
    username = f"authz_{suffix}"
    password = "SecurePassword123!"
    ip = f"10.0.{abs(hash(suffix)) % 250 + 1}.{abs(hash(suffix)) % 250 + 1}"
    headers = {"X-Forwarded-For": ip}

    reg_res = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "full_name": full_name,
            "password": password,
        },
        headers=headers,
    )
    assert reg_res.status_code == 201
    user_id = reg_res.json()["id"]

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": password},
        headers=headers,
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}", "X-Forwarded-For": ip}

    return {
        "id": user_id,
        "email": email,
        "username": username,
        "full_name": full_name,
        "headers": auth_headers,
    }


def _create_company(owner_user: dict, name: str = "Authz Test Corp"):
    res = client.post(
        "/companies",
        headers=owner_user["headers"],
        json={"name": name, "description": "Testing permissions"},
    )
    assert res.status_code == 201
    return res.json()


# ============================================================
# 1. UNAUTHENTICATED ACCESS TESTS (401 UNAUTHORIZED)
# ============================================================

def test_unauthenticated_requests_return_401():
    fake_cid = str(uuid.uuid4())
    fake_tid = str(uuid.uuid4())
    fake_uid = str(uuid.uuid4())

    endpoints = [
        ("GET", "/auth/me"),
        ("GET", "/companies/me"),
        ("GET", "/companies"),
        ("POST", "/companies"),
        ("GET", f"/companies/{fake_cid}"),
        ("PATCH", f"/companies/{fake_cid}"),
        ("DELETE", f"/companies/{fake_cid}"),
        ("GET", f"/companies/{fake_cid}/members"),
        ("POST", f"/companies/{fake_cid}/members"),
        ("PATCH", f"/companies/{fake_cid}/members/{fake_uid}"),
        ("DELETE", f"/companies/{fake_cid}/members/{fake_uid}"),
        ("POST", f"/companies/{fake_cid}/leave"),
        ("GET", f"/companies/{fake_cid}/invitations"),
        ("POST", f"/companies/{fake_cid}/invitations"),
        ("POST", f"/companies/{fake_cid}/invitations/{fake_uid}/revoke"),
        ("GET", f"/companies/{fake_cid}/teams"),
        ("POST", f"/companies/{fake_cid}/teams"),
        ("GET", f"/companies/{fake_cid}/teams/{fake_tid}"),
        ("PATCH", f"/companies/{fake_cid}/teams/{fake_tid}"),
        ("POST", f"/companies/{fake_cid}/teams/{fake_tid}/archive"),
        ("POST", f"/companies/{fake_cid}/teams/{fake_tid}/restore"),
        ("DELETE", f"/companies/{fake_cid}/teams/{fake_tid}"),
        ("GET", f"/companies/{fake_cid}/teams/{fake_tid}/members"),
        ("POST", f"/companies/{fake_cid}/teams/{fake_tid}/members"),
        ("POST", f"/companies/{fake_cid}/teams/{fake_tid}/members/batch"),
        ("POST", f"/companies/{fake_cid}/teams/{fake_tid}/transfer-leadership"),
        ("PATCH", f"/companies/{fake_cid}/teams/{fake_tid}/members/{fake_uid}"),
        ("DELETE", f"/companies/{fake_cid}/teams/{fake_tid}/members/{fake_uid}"),
        ("GET", f"/companies/{fake_cid}/teams/{fake_tid}/activity"),
    ]

    for method, path in endpoints:
        if method == "GET":
            res = client.get(path)
        elif method == "POST":
            res = client.post(path, json={})
        elif method == "PATCH":
            res = client.patch(path, json={})
        elif method == "DELETE":
            res = client.delete(path)
        assert res.status_code in (401, 403), f"Expected 401/403 for unauthenticated {method} {path}, got {res.status_code}"


# ============================================================
# 2. CROSS-COMPANY ISOLATION & IDOR TESTS (403 / 404)
# ============================================================

def test_cross_company_isolation_and_idor_protection():
    u_comp_a = _create_user(uuid.uuid4().hex[:8], "Company A Owner")
    u_comp_b = _create_user(uuid.uuid4().hex[:8], "Company B Owner")

    comp_a = _create_company(u_comp_a, "Company Alpha")
    comp_b = _create_company(u_comp_b, "Company Beta")

    cid_a = comp_a["id"]
    cid_b = comp_b["id"]

    # 1. Company A owner accessing Company B details -> 403 Forbidden
    res = client.get(f"/companies/{cid_b}", headers=u_comp_a["headers"])
    assert res.status_code == 403

    # 2. Company A owner accessing Company B members -> 403 Forbidden
    res = client.get(f"/companies/{cid_b}/members", headers=u_comp_a["headers"])
    assert res.status_code == 403

    # 3. Company A owner accessing Company B invitations -> 403 Forbidden
    res = client.get(f"/companies/{cid_b}/invitations", headers=u_comp_a["headers"])
    assert res.status_code == 403

    # 4. Company A owner listing Company B teams -> 403 Forbidden
    res = client.get(f"/companies/{cid_b}/teams", headers=u_comp_a["headers"])
    assert res.status_code == 403

    # Create team in Company B
    team_b_res = client.post(
        f"/companies/{cid_b}/teams",
        headers=u_comp_b["headers"],
        json={"name": "Beta Core Team", "description": "Team in Beta"},
    )
    assert team_b_res.status_code == 201
    tid_b = team_b_res.json()["id"]

    # 5. IDOR: Company A owner attempts to access Team B via Company A's path -> 404 Not Found
    res = client.get(f"/companies/{cid_a}/teams/{tid_b}", headers=u_comp_a["headers"])
    assert res.status_code == 404
    assert "Team not found in this company workspace" in res.json()["detail"]

    # 6. IDOR: Company A owner attempts to access Team B via Company B's path -> 403 Forbidden
    res = client.get(f"/companies/{cid_b}/teams/{tid_b}", headers=u_comp_a["headers"])
    assert res.status_code == 403

    # 7. IDOR: Company A owner attempts to modify Team B -> 404 on Company A path, 403 on Company B path
    res = client.patch(
        f"/companies/{cid_a}/teams/{tid_b}",
        headers=u_comp_a["headers"],
        json={"name": "Hacked Name"},
    )
    assert res.status_code == 404

    res = client.patch(
        f"/companies/{cid_b}/teams/{tid_b}",
        headers=u_comp_a["headers"],
        json={"name": "Hacked Name"},
    )
    assert res.status_code == 403


# ============================================================
# 3. PRIVILEGE ESCALATION PREVENTION TESTS (ADMIN -> OWNER)
# ============================================================

@patch("app.services.company_invitation.send_company_invitation_email")
def test_admin_privilege_escalation_is_blocked(mock_email):
    owner = _create_user(uuid.uuid4().hex[:8], "Workspace Owner")
    admin = _create_user(uuid.uuid4().hex[:8], "Workspace Admin")
    member = _create_user(uuid.uuid4().hex[:8], "Workspace Member")
    outsider = _create_user(uuid.uuid4().hex[:8], "New Outsider")

    comp = _create_company(owner, "Escalation Shield Corp")
    cid = comp["id"]

    # Add admin and member
    res = client.post(
        f"/companies/{cid}/members?user_id={admin['id']}&role=ADMIN",
        headers=owner["headers"],
    )
    assert res.status_code == 201

    res = client.post(
        f"/companies/{cid}/members?user_id={member['id']}&role=MEMBER",
        headers=owner["headers"],
    )
    assert res.status_code == 201

    # 1. Admin cannot directly add someone with the OWNER role -> 403 Forbidden
    res = client.post(
        f"/companies/{cid}/members?user_id={outsider['id']}&role=OWNER",
        headers=admin["headers"],
    )
    assert res.status_code == 403
    assert "Only company owners can add members with the owner role" in res.json()["detail"]

    # 2. Admin cannot send an invitation with the OWNER role -> 403 Forbidden
    res = client.post(
        f"/companies/{cid}/invitations",
        headers=admin["headers"],
        json={"email": "newowner@example.com", "role": "OWNER"},
    )
    assert res.status_code == 403
    assert "Only company owners can invite new owners" in res.json()["detail"]

    # 3. Owner CAN send an invitation with the OWNER role -> 201 Created
    res = client.post(
        f"/companies/{cid}/invitations",
        headers=owner["headers"],
        json={"email": "valid_new_owner@example.com", "role": "OWNER"},
    )
    assert res.status_code == 201
    owner_inv_id = res.json()["id"]

    # 4. Admin cannot revoke an OWNER invitation -> 403 Forbidden
    res = client.post(
        f"/companies/{cid}/invitations/{owner_inv_id}/revoke",
        headers=admin["headers"],
    )
    assert res.status_code == 403
    assert "Admins cannot revoke owner invitations" in res.json()["detail"]

    # 5. Owner CAN revoke the OWNER invitation -> 200 OK
    res = client.post(
        f"/companies/{cid}/invitations/{owner_inv_id}/revoke",
        headers=owner["headers"],
    )
    assert res.status_code == 200
    assert res.json()["status"] == "REVOKED"


# ============================================================
# 4. TEAM LEAD PERMISSION BOUNDARIES & RESTRICTIONS
# ============================================================

def test_team_lead_permissions_and_boundaries():
    owner = _create_user(uuid.uuid4().hex[:8], "Owner")
    lead_a = _create_user(uuid.uuid4().hex[:8], "Lead of Team A")
    lead_b = _create_user(uuid.uuid4().hex[:8], "Lead of Team B")
    member = _create_user(uuid.uuid4().hex[:8], "Regular Member")

    comp = _create_company(owner, "Team Lead Boundaries Corp")
    cid = comp["id"]

    # Add all to company
    for u in [lead_a, lead_b, member]:
        res = client.post(
            f"/companies/{cid}/members?user_id={u['id']}&role=MEMBER",
            headers=owner["headers"],
        )
        assert res.status_code == 201

    # Create Team A (owner creates and assigns lead_a as LEAD)
    t_a = client.post(
        f"/companies/{cid}/teams",
        headers=owner["headers"],
        json={"name": "Frontend Squad"},
    ).json()
    tid_a = t_a["id"]

    # Add lead_a as LEAD of Team A
    res = client.post(
        f"/companies/{cid}/teams/{tid_a}/members",
        headers=owner["headers"],
        json={"user_id": lead_a["id"], "role": "LEAD"},
    )
    assert res.status_code == 201

    # Create Team B (owner creates and assigns lead_b as LEAD)
    t_b = client.post(
        f"/companies/{cid}/teams",
        headers=owner["headers"],
        json={"name": "Backend Squad"},
    ).json()
    tid_b = t_b["id"]

    res = client.post(
        f"/companies/{cid}/teams/{tid_b}/members",
        headers=owner["headers"],
        json={"user_id": lead_b["id"], "role": "LEAD"},
    )
    assert res.status_code == 201

    # 1. Lead A CAN update Team A settings -> 200 OK
    res = client.patch(
        f"/companies/{cid}/teams/{tid_a}",
        headers=lead_a["headers"],
        json={"description": "Updated by Lead A"},
    )
    assert res.status_code == 200
    assert res.json()["description"] == "Updated by Lead A"

    # 2. Lead A CANNOT update Team B settings -> 403 Forbidden
    res = client.patch(
        f"/companies/{cid}/teams/{tid_b}",
        headers=lead_a["headers"],
        json={"description": "Unauthorized tamper by Lead A"},
    )
    assert res.status_code == 403

    # 3. Lead A CAN add member to Team A -> 201 Created
    res = client.post(
        f"/companies/{cid}/teams/{tid_a}/members",
        headers=lead_a["headers"],
        json={"user_id": member["id"], "role": "MEMBER"},
    )
    assert res.status_code == 201

    # 4. Lead A CANNOT add member to Team B -> 403 Forbidden
    res = client.post(
        f"/companies/{cid}/teams/{tid_b}/members",
        headers=lead_a["headers"],
        json={"user_id": member["id"], "role": "MEMBER"},
    )
    assert res.status_code == 403

    # 5. Lead A CANNOT delete Team A (workspace owner/admin operation) -> 403 Forbidden
    res = client.delete(f"/companies/{cid}/teams/{tid_a}", headers=lead_a["headers"])
    assert res.status_code == 403

    # 6. Lead A CANNOT archive Team A -> 403 Forbidden
    res = client.post(f"/companies/{cid}/teams/{tid_a}/archive", headers=lead_a["headers"])
    assert res.status_code == 403

    # 7. Lead A CANNOT restore Team A -> 403 Forbidden
    res = client.post(f"/companies/{cid}/teams/{tid_a}/restore", headers=lead_a["headers"])
    assert res.status_code == 403


# ============================================================
# 5. REGULAR MEMBER RESTRICTIONS MATRIX
# ============================================================

def test_regular_member_restricted_from_admin_and_team_management():
    owner = _create_user(uuid.uuid4().hex[:8], "Owner")
    member = _create_user(uuid.uuid4().hex[:8], "Member")
    other_member = _create_user(uuid.uuid4().hex[:8], "Other Member")

    comp = _create_company(owner, "Member Restrictions Corp")
    cid = comp["id"]

    for u in [member, other_member]:
        res = client.post(
            f"/companies/{cid}/members?user_id={u['id']}&role=MEMBER",
            headers=owner["headers"],
        )
        assert res.status_code == 201

    team = client.post(
        f"/companies/{cid}/teams",
        headers=owner["headers"],
        json={"name": "Dev Squad"},
    ).json()
    tid = team["id"]

    # Add member to team as regular MEMBER
    client.post(
        f"/companies/{cid}/teams/{tid}/members",
        headers=owner["headers"],
        json={"user_id": member["id"], "role": "MEMBER"},
    )

    # 1. Member cannot update company -> 403
    res = client.patch(f"/companies/{cid}", headers=member["headers"], json={"name": "Hacked Corp"})
    assert res.status_code == 403

    # 2. Member cannot delete company -> 403
    res = client.delete(f"/companies/{cid}", headers=member["headers"])
    assert res.status_code == 403

    # 3. Member cannot create team -> 403
    res = client.post(f"/companies/{cid}/teams", headers=member["headers"], json={"name": "Rogue Team"})
    assert res.status_code == 403

    # 4. Member cannot update team -> 403
    res = client.patch(f"/companies/{cid}/teams/{tid}", headers=member["headers"], json={"name": "Changed Name"})
    assert res.status_code == 403

    # 5. Member cannot add someone to team -> 403
    res = client.post(
        f"/companies/{cid}/teams/{tid}/members",
        headers=member["headers"],
        json={"user_id": other_member["id"], "role": "MEMBER"},
    )
    assert res.status_code == 403

    # 6. Member cannot remove other member from team -> 403
    res = client.delete(f"/companies/{cid}/teams/{tid}/members/{other_member['id']}", headers=member["headers"])
    assert res.status_code == 403

    # 7. Member CAN remove THEMSELVES from team (self-removal) -> 204 No Content
    res = client.delete(f"/companies/{cid}/teams/{tid}/members/{member['id']}", headers=member["headers"])
    assert res.status_code == 204
