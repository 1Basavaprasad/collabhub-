import uuid
# pyrefly: ignore [missing-import]
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_and_login_user(suffix: str, full_name: str = "Test User"):
    email = f"user_{suffix}@example.com"
    username = f"user_{suffix}"
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

    return {"id": user_id, "email": email, "username": username, "headers": headers}


def test_company_multi_membership_lifecycle():
    suffix1 = uuid.uuid4().hex[:8]
    suffix2 = uuid.uuid4().hex[:8]
    suffix3 = uuid.uuid4().hex[:8]

    user1 = _create_and_login_user(suffix1, "Primary Owner")
    user2 = _create_and_login_user(suffix2, "Secondary Owner / Admin")
    user3 = _create_and_login_user(suffix3, "Non Member")

    # 1. GET /companies/me before creation -> 404
    pre_get = client.get("/companies/me", headers=user1["headers"])
    assert pre_get.status_code == 404
    assert "You do not belong to any company" in pre_get.json()["detail"]

    # 2. POST /companies: user1 creates Company A (creator automatically becomes OWNER)
    create_res = client.post(
        "/companies",
        headers=user1["headers"],
        json={
            "name": "Acme Innovations",
            "description": "Building future tech tools",
        },
    )
    assert create_res.status_code == 201
    comp_a = create_res.json()
    comp_a_id = comp_a["id"]
    assert comp_a["name"] == "Acme Innovations"
    assert comp_a["profile_completeness"] == 35

    # 3. GET /companies/me returns Company A
    me_res = client.get("/companies/me", headers=user1["headers"])
    assert me_res.status_code == 200
    assert me_res.json()["id"] == comp_a_id

    # 4. Multi-Company: user1 can create a second Company B
    create_b_res = client.post(
        "/companies",
        headers=user1["headers"],
        json={"name": "Acme Ventures"},
    )
    assert create_b_res.status_code == 201
    comp_b_id = create_b_res.json()["id"]

    # 5. List user1 companies -> both Company A and Company B
    list_res = client.get("/companies", headers=user1["headers"])
    assert list_res.status_code == 200
    comp_ids = [c["id"] for c in list_res.json()]
    assert comp_a_id in comp_ids
    assert comp_b_id in comp_ids

    # 6. Multiple Owners & Members: user1 adds user2 as OWNER to Company A
    add_owner_res = client.post(
        f"/companies/{comp_a_id}/members?user_id={user2['id']}&role=OWNER",
        headers=user1["headers"],
    )
    assert add_owner_res.status_code == 201
    assert add_owner_res.json()["role"] == "OWNER"

    # 7. Duplicate Prevention: Cannot add user2 again to Company A
    dup_add_res = client.post(
        f"/companies/{comp_a_id}/members?user_id={user2['id']}&role=MEMBER",
        headers=user1["headers"],
    )
    assert dup_add_res.status_code == 400
    assert "already a member" in dup_add_res.json()["detail"]

    # 8. User2 can access Company A (200 OK)
    user2_get = client.get(f"/companies/{comp_a_id}", headers=user2["headers"])
    assert user2_get.status_code == 200
    assert user2_get.json()["id"] == comp_a_id

    # 9. User2 (as OWNER) can update Company A profile fields
    patch_res = client.patch(
        f"/companies/{comp_a_id}",
        headers=user2["headers"],
        json={
            "industry": "Software & AI",
            "company_size": "11-50",
            "country": "United States",
            "city": "San Francisco",
            "website": "https://acmeinnovations.com",
            "logo_url": "https://acmeinnovations.com/logo.png",
        },
    )
    assert patch_res.status_code == 200
    patched_data = patch_res.json()
    assert patched_data["industry"] == "Software & AI"
    assert patched_data["profile_completeness"] == 100

    # 10. Non-member (user3) cannot access Company A -> 403 Forbidden
    non_member_get = client.get(f"/companies/{comp_a_id}", headers=user3["headers"])
    assert non_member_get.status_code == 403
    assert "You do not have access" in non_member_get.json()["detail"]

    # 11. Non-member (user3) cannot patch Company A -> 403 Forbidden
    non_member_patch = client.patch(
        f"/companies/{comp_a_id}",
        headers=user3["headers"],
        json={"name": "Hacked Name"},
    )
    assert non_member_patch.status_code == 403
