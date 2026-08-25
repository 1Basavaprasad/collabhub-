import uuid
import pytest
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_and_login_user(suffix: str, full_name: str = "Test User"):
    email = f"pm_user_{suffix}@example.com"
    username = f"pm_user_{suffix}"
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


def test_project_teams_and_members_complete_suite():
    # Setup test actors
    s_owner = uuid.uuid4().hex[:8]
    s_admin = uuid.uuid4().hex[:8]
    s_mem1 = uuid.uuid4().hex[:8]
    s_mem2 = uuid.uuid4().hex[:8]
    s_mem3 = uuid.uuid4().hex[:8]
    s_comp_b_owner = uuid.uuid4().hex[:8]
    s_comp_b_user = uuid.uuid4().hex[:8]

    owner_a = _create_and_login_user(s_owner, "Owner Basavaprasad")
    admin_a = _create_and_login_user(s_admin, "Admin Priya")
    member_a1 = _create_and_login_user(s_mem1, "Member Rahul")
    member_a2 = _create_and_login_user(s_mem2, "Member Ravi")
    member_a3 = _create_and_login_user(s_mem3, "Member Sneha")

    owner_b = _create_and_login_user(s_comp_b_owner, "Company B Owner")
    user_b = _create_and_login_user(s_comp_b_user, "Company B User")

    # 1. Create Company A
    res_ca = client.post(
        "/companies",
        headers=owner_a["headers"],
        json={"name": f"Company A {s_owner}"},
    )
    assert res_ca.status_code == 201
    company_a_id = res_ca.json()["id"]

    # Add Admin and Members to Company A
    client.post(
        f"/companies/{company_a_id}/members?user_id={admin_a['id']}&role=ADMIN",
        headers=owner_a["headers"],
    )
    client.post(
        f"/companies/{company_a_id}/members?user_id={member_a1['id']}&role=MEMBER",
        headers=owner_a["headers"],
    )
    client.post(
        f"/companies/{company_a_id}/members?user_id={member_a2['id']}&role=MEMBER",
        headers=owner_a["headers"],
    )
    client.post(
        f"/companies/{company_a_id}/members?user_id={member_a3['id']}&role=MEMBER",
        headers=owner_a["headers"],
    )

    # 2. Create Company B
    res_cb = client.post(
        "/companies",
        headers=owner_b["headers"],
        json={"name": f"Company B {s_comp_b_owner}"},
    )
    assert res_cb.status_code == 201
    company_b_id = res_cb.json()["id"]

    client.post(
        f"/companies/{company_b_id}/members?user_id={user_b['id']}&role=MEMBER",
        headers=owner_b["headers"],
    )

    # Create Team in Company A and add team members
    res_team_a = client.post(
        f"/companies/{company_a_id}/teams",
        headers=owner_a["headers"],
        json={"name": "Backend Team", "description": "Core Backend"},
    )
    assert res_team_a.status_code == 201
    team_a_id = res_team_a.json()["id"]

    # Add Rahul (member_a1) and Ravi (member_a2) to Team A
    client.post(
        f"/companies/{company_a_id}/teams/{team_a_id}/members",
        headers=owner_a["headers"],
        json={"user_id": member_a1["id"], "role": "MEMBER"},
    )
    client.post(
        f"/companies/{company_a_id}/teams/{team_a_id}/members",
        headers=owner_a["headers"],
        json={"user_id": member_a2["id"], "role": "MEMBER"},
    )

    # Create Team in Company B
    res_team_b = client.post(
        f"/companies/{company_b_id}/teams",
        headers=owner_b["headers"],
        json={"name": "Company B Team"},
    )
    assert res_team_b.status_code == 201
    team_b_id = res_team_b.json()["id"]

    # Create Project in Company A
    res_proj_a = client.post(
        f"/companies/{company_a_id}/projects",
        headers=owner_a["headers"],
        json={"name": "Project Alpha", "description": "Main Project"},
    )
    assert res_proj_a.status_code == 201
    project_a_id = res_proj_a.json()["id"]

    # Create Project in Company B
    res_proj_b = client.post(
        f"/companies/{company_b_id}/projects",
        headers=owner_b["headers"],
        json={"name": "Project Beta", "description": "Company B Project"},
    )
    assert res_proj_b.status_code == 201
    project_b_id = res_proj_b.json()["id"]

    # ----------------------------------------------------
    # Test 12: Unauthenticated request rejected
    # ----------------------------------------------------
    unauth_team = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/teams",
        json={"team_id": team_a_id},
    )
    assert unauth_team.status_code == 401

    unauth_member = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/members",
        json={"user_id": member_a1["id"]},
    )
    assert unauth_member.status_code == 401

    # ----------------------------------------------------
    # Test 13: Unauthorized member rejected (MEMBER role)
    # ----------------------------------------------------
    unauthz_team = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/teams",
        headers=member_a1["headers"],
        json={"team_id": team_a_id},
    )
    assert unauthz_team.status_code == 403

    unauthz_member = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/members",
        headers=member_a1["headers"],
        json={"user_id": member_a3["id"]},
    )
    assert unauthz_member.status_code == 403

    # ----------------------------------------------------
    # Test 9: Cross-company team rejected
    # ----------------------------------------------------
    cross_team = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/teams",
        headers=owner_a["headers"],
        json={"team_id": team_b_id},
    )
    assert cross_team.status_code in (400, 404)

    # ----------------------------------------------------
    # Test 10: Cross-company user rejected
    # ----------------------------------------------------
    cross_user = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/members",
        headers=owner_a["headers"],
        json={"user_id": user_b["id"]},
    )
    assert cross_user.status_code in (400, 404)

    # ----------------------------------------------------
    # Test 11 & 20: Cross-company project rejected / IDOR protection
    # ----------------------------------------------------
    idor_team = client.post(
        f"/companies/{company_a_id}/projects/{project_b_id}/teams",
        headers=owner_a["headers"],
        json={"team_id": team_a_id},
    )
    assert idor_team.status_code == 404

    idor_member = client.post(
        f"/companies/{company_a_id}/projects/{project_b_id}/members",
        headers=owner_a["headers"],
        json={"user_id": member_a1["id"]},
    )
    assert idor_member.status_code == 404

    # Outsider trying to manipulate Company A project directly
    outsider_team = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/teams",
        headers=owner_b["headers"],
        json={"team_id": team_b_id},
    )
    assert outsider_team.status_code in (403, 404)

    # ----------------------------------------------------
    # Test 1 & 14: Add project team (Owner allowed)
    # ----------------------------------------------------
    add_team_res = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/teams",
        headers=owner_a["headers"],
        json={"team_id": team_a_id},
    )
    assert add_team_res.status_code == 201
    assert add_team_res.json()["team_id"] == team_a_id
    assert add_team_res.json()["project_id"] == project_a_id
    assert add_team_res.json()["team"]["name"] == "Backend Team"

    # ----------------------------------------------------
    # Test 7: Duplicate team assignment
    # ----------------------------------------------------
    dup_team = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/teams",
        headers=owner_a["headers"],
        json={"team_id": team_a_id},
    )
    assert dup_team.status_code == 409
    assert "already assigned" in dup_team.json()["detail"].lower()

    # ----------------------------------------------------
    # Test 2: List project teams
    # ----------------------------------------------------
    list_teams_res = client.get(
        f"/companies/{company_a_id}/projects/{project_a_id}/teams",
        headers=member_a1["headers"],
    )
    assert list_teams_res.status_code == 200
    teams_data = list_teams_res.json()
    assert len(teams_data) == 1
    assert teams_data[0]["team_id"] == team_a_id

    # ----------------------------------------------------
    # Test 4 & 15: Add direct project member (Admin allowed)
    # ----------------------------------------------------
    # Add Sneha (member_a3) and Rahul (member_a1) as direct members
    add_mem_res1 = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/members",
        headers=admin_a["headers"],
        json={"user_id": member_a3["id"]},
    )
    assert add_mem_res1.status_code == 201
    assert add_mem_res1.json()["user_id"] == member_a3["id"]
    assert add_mem_res1.json()["user"]["username"] == member_a3["username"]

    add_mem_res2 = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/members",
        headers=admin_a["headers"],
        json={"user_id": member_a1["id"]},
    )
    assert add_mem_res2.status_code == 201
    assert add_mem_res2.json()["user_id"] == member_a1["id"]

    # ----------------------------------------------------
    # Test 8: Duplicate member assignment
    # ----------------------------------------------------
    dup_mem = client.post(
        f"/companies/{company_a_id}/projects/{project_a_id}/members",
        headers=admin_a["headers"],
        json={"user_id": member_a1["id"]},
    )
    assert dup_mem.status_code == 409
    assert "already a direct member" in dup_mem.json()["detail"].lower()

    # ----------------------------------------------------
    # Test 5: List direct project members
    # ----------------------------------------------------
    list_mem_res = client.get(
        f"/companies/{company_a_id}/projects/{project_a_id}/members",
        headers=member_a1["headers"],
    )
    assert list_mem_res.status_code == 200
    direct_members = list_mem_res.json()
    assert len(direct_members) == 2
    direct_user_ids = {m["user_id"] for m in direct_members}
    assert member_a3["id"] in direct_user_ids
    assert member_a1["id"] in direct_user_ids

    # ----------------------------------------------------
    # Test 16 & 17: Effective members include team members & remove duplicates
    # ----------------------------------------------------
    # Direct members: Sneha (member_a3), Rahul (member_a1)
    # Team members in Backend Team: Owner (owner_a), Rahul (member_a1), Ravi (member_a2)
    # Expected effective unique members: Sneha, Owner, Rahul, Ravi (Total 4)
    eff_res1 = client.get(
        f"/companies/{company_a_id}/projects/{project_a_id}/members?effective=true",
        headers=member_a1["headers"],
    )
    assert eff_res1.status_code == 200
    eff_members = eff_res1.json()
    assert len(eff_members) == 4

    eff_user_ids = {m["id"] for m in eff_members}
    assert eff_user_ids == {member_a3["id"], owner_a["id"], member_a1["id"], member_a2["id"]}

    # Check dedicated effective-members alias endpoint
    eff_res2 = client.get(
        f"/companies/{company_a_id}/projects/{project_a_id}/effective-members",
        headers=member_a1["headers"],
    )
    assert eff_res2.status_code == 200
    assert len(eff_res2.json()) == 4

    # Check membership metadata
    mem_map = {m["id"]: m for m in eff_members}
    # Rahul is both direct member and in assigned Backend Team
    assert mem_map[member_a1["id"]]["source_type"] == "both"
    assert "Backend Team" in mem_map[member_a1["id"]]["team_names"]
    # Ravi is only in Backend Team
    assert mem_map[member_a2["id"]]["source_type"] == "team"
    assert "Backend Team" in mem_map[member_a2["id"]]["team_names"]
    # Sneha is only direct member
    assert mem_map[member_a3["id"]]["source_type"] == "direct"

    # ----------------------------------------------------
    # Test 3 & 18: Remove project team & does not delete team
    # ----------------------------------------------------
    del_team_res = client.delete(
        f"/companies/{company_a_id}/projects/{project_a_id}/teams/{team_a_id}",
        headers=admin_a["headers"],
    )
    assert del_team_res.status_code == 204

    # Verify team is no longer assigned to project
    list_teams_after = client.get(
        f"/companies/{company_a_id}/projects/{project_a_id}/teams",
        headers=admin_a["headers"],
    )
    assert list_teams_after.status_code == 200
    assert len(list_teams_after.json()) == 0

    # Verify team still exists in company
    get_team_res = client.get(
        f"/companies/{company_a_id}/teams/{team_a_id}",
        headers=admin_a["headers"],
    )
    assert get_team_res.status_code == 200
    assert get_team_res.json()["name"] == "Backend Team"

    # Now effective members should only be the 2 direct members (Sneha and Rahul)
    eff_after_team_del = client.get(
        f"/companies/{company_a_id}/projects/{project_a_id}/members?effective=true",
        headers=admin_a["headers"],
    )
    assert eff_after_team_del.status_code == 200
    assert len(eff_after_team_del.json()) == 2
    assert {m["id"] for m in eff_after_team_del.json()} == {member_a3["id"], member_a1["id"]}

    # ----------------------------------------------------
    # Test 6 & 19: Remove direct project member & does not delete user
    # ----------------------------------------------------
    del_mem_res = client.delete(
        f"/companies/{company_a_id}/projects/{project_a_id}/members/{member_a1['id']}",
        headers=owner_a["headers"],
    )
    assert del_mem_res.status_code == 204

    # Verify member is no longer direct project member
    list_mem_after = client.get(
        f"/companies/{company_a_id}/projects/{project_a_id}/members",
        headers=owner_a["headers"],
    )
    assert list_mem_after.status_code == 200
    assert len(list_mem_after.json()) == 1
    assert list_mem_after.json()[0]["user_id"] == member_a3["id"]

    # Verify user still exists and is still member of company
    company_members_res = client.get(
        f"/companies/{company_a_id}/members",
        headers=owner_a["headers"],
    )
    assert company_members_res.status_code == 200
    comp_member_ids = {m["user_id"] for m in company_members_res.json()["items"]}
    assert member_a1["id"] in comp_member_ids
