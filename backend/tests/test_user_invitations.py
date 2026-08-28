import uuid
from starlette.testclient import TestClient

from app.main import app
from tests.test_notifications import _create_user, _create_company

client = TestClient(app)


def test_user_in_app_invitations_flow():
    s1 = uuid.uuid4().hex[:8]
    s2 = uuid.uuid4().hex[:8]
    s3 = uuid.uuid4().hex[:8]

    # 1. Register User A (Company Owner)
    alice = _create_user(s1, "Alice Owner")
    company_id = _create_company(alice["headers"], f"Company Alpha {s1}")

    # 2. Register User B (Invitee)
    bob = _create_user(s2, "Bob Invitee")

    # 3. Before invitation: User B should have 0 pending invitations
    invs_before = client.get("/users/me/invitations", headers=bob["headers"])
    assert invs_before.status_code == 200, invs_before.text
    assert len(invs_before.json()) == 0

    # 4. User A invites User B to Company Alpha
    invite_res = client.post(
        f"/companies/{company_id}/invitations",
        headers=alice["headers"],
        json={
            "email": bob["email"],
            "role": "MEMBER",
            "designation": "Frontend Engineer",
            "department": "Engineering",
        },
    )
    assert invite_res.status_code == 201, invite_res.text
    invitation_id = invite_res.json()["id"]

    # 5. User B checks /users/me/invitations -> Should see 1 pending invitation
    invs_after = client.get("/users/me/invitations", headers=bob["headers"])
    assert invs_after.status_code == 200, invs_after.text
    pending_list = invs_after.json()
    assert len(pending_list) == 1
    item = pending_list[0]
    assert item["id"] == invitation_id
    assert item["company_id"] == company_id
    assert item["role"] == "MEMBER"
    assert item["designation"] == "Frontend Engineer"
    assert item["inviter_name"] == "Alice Owner"

    # 6. Third user (User C) tries to accept User B's invitation -> Must return 403 Forbidden
    charlie = _create_user(s3, "Charlie User")
    idor_accept = client.post(
        f"/invitations/{invitation_id}/accept",
        headers=charlie["headers"],
    )
    assert idor_accept.status_code == 403, idor_accept.text

    # 7. User B accepts the invitation in-app
    accept_res = client.post(
        f"/invitations/{invitation_id}/accept",
        headers=bob["headers"],
    )
    assert accept_res.status_code == 200, accept_res.text
    assert accept_res.json()["status"] == "ACCEPTED"

    # 8. User B now belongs to the company -> can access company details
    comp_access = client.get(
        f"/companies/{company_id}",
        headers=bob["headers"],
    )
    assert comp_access.status_code == 200, comp_access.text

    # 9. Invitations list for User B is now empty (accepted invitations are not pending)
    invs_final = client.get("/users/me/invitations", headers=bob["headers"])
    assert invs_final.status_code == 200
    assert len(invs_final.json()) == 0


def test_user_in_app_invitation_decline():
    s1 = uuid.uuid4().hex[:8]
    s2 = uuid.uuid4().hex[:8]

    boss = _create_user(s1, "Boss User")
    company_id = _create_company(boss["headers"], f"Company Beta {s1}")

    dave = _create_user(s2, "Dave User")

    # Invite Dave
    invite_res = client.post(
        f"/companies/{company_id}/invitations",
        headers=boss["headers"],
        json={
            "email": dave["email"],
            "role": "MEMBER",
        },
    )
    assert invite_res.status_code == 201, invite_res.text
    invitation_id = invite_res.json()["id"]

    # Dave declines in-app
    decline_res = client.post(
        f"/invitations/{invitation_id}/decline",
        headers=dave["headers"],
    )
    assert decline_res.status_code == 200, decline_res.text
    assert decline_res.json()["status"] == "DECLINED"

    # Dave should NOT have access to company
    comp_access = client.get(
        f"/companies/{company_id}",
        headers=dave["headers"],
    )
    assert comp_access.status_code == 403, comp_access.text
