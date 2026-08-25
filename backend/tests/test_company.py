import uuid
from unittest.mock import patch
# pyrefly: ignore [missing-import]
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_and_login_user(suffix: str, full_name: str = "Test User"):
    email = f"user_{suffix}@example.com"
    username = f"user_{suffix}"
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
    assert reg_res.status_code == 201
    user_id = reg_res.json()["id"]

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": password},
        headers=req_headers,
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Forwarded-For": ip}

    return {"id": user_id, "email": email, "username": username, "full_name": full_name, "headers": headers}


@patch("app.services.company_invitation.send_company_invitation_email")
def test_company_multi_membership_and_member_management(mock_send_email):
    suffix1 = uuid.uuid4().hex[:8]
    suffix2 = uuid.uuid4().hex[:8]
    suffix3 = uuid.uuid4().hex[:8]
    suffix4 = uuid.uuid4().hex[:8]
    suffix5 = uuid.uuid4().hex[:8]

    owner1 = _create_and_login_user(suffix1, "Primary Owner Basava")
    owner2 = _create_and_login_user(suffix2, "Secondary Owner Arjun")
    admin1 = _create_and_login_user(suffix3, "Admin Priya")
    member1 = _create_and_login_user(suffix4, "Member Rahul")
    outsider = _create_and_login_user(suffix5, "Outsider User")

    # 1. GET /companies/me before creation -> 404
    pre_get = client.get("/companies/me", headers=owner1["headers"])
    assert pre_get.status_code == 404
    assert "You do not belong to any company" in pre_get.json()["detail"]

    # 2. POST /companies: owner1 creates Company (creator automatically becomes OWNER)
    create_res = client.post(
        "/companies",
        headers=owner1["headers"],
        json={
            "name": "BRN Tech",
            "description": "Enterprise cloud platform",
            "industry": "Software & AI",
            "company_size": "51-200",
            "country": "India",
            "city": "Bengaluru",
            "website": "https://brntech.com",
            "logo_url": "https://brntech.com/logo.png",
        },
    )
    assert create_res.status_code == 201
    company = create_res.json()
    company_id = company["id"]
    assert company["name"] == "BRN Tech"
    assert company["profile_completeness"] == 100

    # 3. Multiple Owners: Add owner2 with designation and department
    add_owner2_res = client.post(
        f"/companies/{company_id}/members?user_id={owner2['id']}&role=OWNER&designation=Co-Founder&department=Management",
        headers=owner1["headers"],
    )
    assert add_owner2_res.status_code == 201
    assert add_owner2_res.json()["role"] == "OWNER"
    assert add_owner2_res.json()["designation"] == "Co-Founder"
    assert add_owner2_res.json()["department"] == "Management"

    # 4. Add admin1 as ADMIN
    add_admin1_res = client.post(
        f"/companies/{company_id}/members?user_id={admin1['id']}&role=ADMIN&designation=Engineering%20Manager&department=Engineering",
        headers=owner1["headers"],
    )
    assert add_admin1_res.status_code == 201
    assert add_admin1_res.json()["role"] == "ADMIN"
    assert add_admin1_res.json()["designation"] == "Engineering Manager"

    # 5. Add member1 as MEMBER
    add_member1_res = client.post(
        f"/companies/{company_id}/members?user_id={member1['id']}&role=MEMBER&designation=Backend%20Developer&department=Engineering",
        headers=owner1["headers"],
    )
    assert add_member1_res.status_code == 201
    assert add_member1_res.json()["role"] == "MEMBER"
    assert add_member1_res.json()["designation"] == "Backend Developer"
    assert add_member1_res.json()["department"] == "Engineering"

    # 6. Duplicate membership rejection
    dup_res = client.post(
        f"/companies/{company_id}/members?user_id={member1['id']}&role=MEMBER",
        headers=owner1["headers"],
    )
    assert dup_res.status_code == 400
    assert "already a member" in dup_res.json()["detail"]

    # 7. GET /companies/{company_id}/members: Lists all members with safe user summaries
    members_res = client.get(f"/companies/{company_id}/members", headers=member1["headers"])
    assert members_res.status_code == 200
    members_data = members_res.json()
    members_list = members_data["items"] if "items" in members_data else members_data
    assert len(members_list) == 4
    if "total" in members_data:
        assert members_data["total"] == 4
    
    # Check user information is included safely
    for m in members_list:
        assert "user" in m
        assert "password_hash" not in m["user"]
        assert "email" in m["user"]
        assert "username" in m["user"]
        assert "full_name" in m["user"]

    # 8. Outsider cannot access members -> 403 Forbidden
    outsider_get = client.get(f"/companies/{company_id}/members", headers=outsider["headers"])
    assert outsider_get.status_code == 403
    assert "You do not have access" in outsider_get.json()["detail"]

    # 9. Company invitation can contain designation and department
    invitation_res = client.post(
        f"/companies/{company_id}/invitations",
        headers=admin1["headers"],
        json={
            "email": "priya.qa@example.com",
            "role": "MEMBER",
            "designation": "QA Lead",
            "department": "Quality Assurance",
        },
    )
    assert invitation_res.status_code == 201
    inv_data = invitation_res.json()
    assert inv_data["email"] == "priya.qa@example.com"
    assert inv_data["role"] == "MEMBER"
    assert inv_data["designation"] == "QA Lead"
    assert inv_data["department"] == "Quality Assurance"
    assert inv_data["status"] == "PENDING"

    # 10. MEMBER cannot update another member -> 403 Forbidden
    member_patch = client.patch(
        f"/companies/{company_id}/members/{admin1['id']}",
        headers=member1["headers"],
        json={"designation": "Hacked Title"},
    )
    assert member_patch.status_code == 403
    assert "Members cannot modify company members" in member_patch.json()["detail"]

    # 11. ADMIN can update MEMBER's designation and department
    admin_patch_member = client.patch(
        f"/companies/{company_id}/members/{member1['id']}",
        headers=admin1["headers"],
        json={
            "designation": "Senior Backend Developer",
            "department": "Platform Core",
        },
    )
    assert admin_patch_member.status_code == 200
    assert admin_patch_member.json()["designation"] == "Senior Backend Developer"
    assert admin_patch_member.json()["department"] == "Platform Core"

    # 12. ADMIN cannot modify OWNER -> 403 Forbidden
    admin_patch_owner = client.patch(
        f"/companies/{company_id}/members/{owner1['id']}",
        headers=admin1["headers"],
        json={"designation": "Demoted"},
    )
    assert admin_patch_owner.status_code == 403
    assert "Admins cannot modify company owners" in admin_patch_owner.json()["detail"]

    # 13. ADMIN cannot promote anyone to OWNER -> 403 Forbidden
    admin_promote = client.patch(
        f"/companies/{company_id}/members/{member1['id']}",
        headers=admin1["headers"],
        json={"role": "OWNER"},
    )
    assert admin_promote.status_code == 403
    assert "Admins cannot promote members to owner" in admin_promote.json()["detail"]

    # 14. OWNER can update ADMIN role and designation
    owner_patch_admin = client.patch(
        f"/companies/{company_id}/members/{admin1['id']}",
        headers=owner1["headers"],
        json={
            "designation": "Director of Engineering",
            "role": "ADMIN",
        },
    )
    assert owner_patch_admin.status_code == 200
    assert owner_patch_admin.json()["designation"] == "Director of Engineering"

    # 15. OWNER can update another OWNER
    owner_patch_owner2 = client.patch(
        f"/companies/{company_id}/members/{owner2['id']}",
        headers=owner1["headers"],
        json={"designation": "Executive Chairman"},
    )
    assert owner_patch_owner2.status_code == 200
    assert owner_patch_owner2.json()["designation"] == "Executive Chairman"

    # 16. Demoting an owner when multiple owners exist is ALLOWED
    demote_owner2 = client.patch(
        f"/companies/{company_id}/members/{owner2['id']}",
        headers=owner1["headers"],
        json={"role": "ADMIN"},
    )
    assert demote_owner2.status_code == 200
    assert demote_owner2.json()["role"] == "ADMIN"

    # 17. Demoting the LAST remaining OWNER -> 400 Bad Request
    demote_last_owner = client.patch(
        f"/companies/{company_id}/members/{owner1['id']}",
        headers=owner1["headers"],
        json={"role": "MEMBER"},
    )
    assert demote_last_owner.status_code == 400
    assert "Company must have at least one owner" in demote_last_owner.json()["detail"]

    # 18. Existing Company profile PATCH still works
    patch_comp = client.patch(
        f"/companies/{company_id}",
        headers=owner1["headers"],
        json={"description": "Updated company description"},
    )
    assert patch_comp.status_code == 200
    assert patch_comp.json()["description"] == "Updated company description"

    # 19. Invitation token verification and acceptance lifecycle
    invitee_suffix = uuid.uuid4().hex[:8]
    invitee_user = _create_and_login_user(invitee_suffix, "Invited Priya QA")

    # Invite user with specific designation and department
    create_inv_res = client.post(
        f"/companies/{company_id}/invitations",
        headers=owner1["headers"],
        json={
            "email": invitee_user["email"],
            "role": "MEMBER",
            "designation": "Lead QA Engineer",
            "department": "Quality & Testing",
        },
    )
    assert create_inv_res.status_code == 201

    # Extract raw token from service or database query
    from app.core.database import SessionLocal
    from app.repositories.company_invitation import get_pending_invitation
    from app.services.company_invitation import _hash_invitation_token
    import secrets

    # For testing verification and acceptance endpoints, let's create a test invitation with known raw token
    test_db = SessionLocal()
    try:
        from app.repositories.company_invitation import create_invitation
        from datetime import datetime, timezone, timedelta

        raw_test_token = secrets.token_urlsafe(32)
        test_hash = _hash_invitation_token(raw_test_token)
        create_invitation(
            db=test_db,
            company_id=uuid.UUID(company_id),
            email=invitee_user["email"],
            role="MEMBER",
            token_hash=test_hash,
            invited_by=uuid.UUID(owner1["id"]),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=72),
            designation="Staff QA Engineer",
            department="Quality Assurance",
        )
    finally:
        test_db.close()

    # 20. GET /companies/invitations/verify/{token}
    verify_res = client.get(f"/companies/invitations/verify/{raw_test_token}")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["company_name"] == "BRN Tech"
    assert v_data["email"] == invitee_user["email"]
    assert v_data["role"] == "MEMBER"
    assert v_data["designation"] == "Staff QA Engineer"
    assert v_data["department"] == "Quality Assurance"

    # 21. Wrong user cannot accept invitation (403 Forbidden)
    wrong_accept = client.post(
        f"/companies/invitations/accept/{raw_test_token}",
        headers=outsider["headers"],
    )
    assert wrong_accept.status_code == 403
    assert "different email" in wrong_accept.json()["detail"]

    # 22. Authenticated invitee accepts invitation (200 OK)
    accept_res = client.post(
        f"/companies/invitations/accept/{raw_test_token}",
        headers=invitee_user["headers"],
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ACCEPTED"

    # 23. Verify newly joined member is now in company members list with correct metadata
    new_members_res = client.get(f"/companies/{company_id}/members", headers=invitee_user["headers"])
    assert new_members_res.status_code == 200
    members_raw = new_members_res.json()
    members_data = members_raw["items"] if "items" in members_raw else members_raw
    joined_member = next((m for m in members_data if m["user_id"] == invitee_user["id"]), None)
    assert joined_member is not None
    assert joined_member["role"] == "MEMBER"
    assert joined_member["designation"] == "Staff QA Engineer"
    assert joined_member["department"] == "Quality Assurance"

    # 24. Cannot reuse accepted invitation (404 Not Found)
    reuse_res = client.get(f"/companies/invitations/verify/{raw_test_token}")
    assert reuse_res.status_code == 404

    # 25. GET /companies/{company_id}/invitations - OWNER can view
    owner_invs = client.get(f"/companies/{company_id}/invitations", headers=owner1["headers"])
    assert owner_invs.status_code == 200
    invs_raw = owner_invs.json()
    invs_list = invs_raw["items"] if "items" in invs_raw else invs_raw
    assert len(invs_list) >= 2
    # Ensure no token_hash is exposed
    for inv in invs_list:
        assert "token_hash" not in inv
        assert "email" in inv
        assert "status" in inv
        assert "role" in inv

    # 26. GET /companies/{company_id}/invitations - ADMIN can view
    admin_invs = client.get(f"/companies/{company_id}/invitations", headers=admin1["headers"])
    assert admin_invs.status_code == 200

    # 27. GET /companies/{company_id}/invitations - MEMBER cannot view (403 Forbidden)
    member_invs = client.get(f"/companies/{company_id}/invitations", headers=member1["headers"])
    assert member_invs.status_code == 403
    assert "Only company owners and admins" in member_invs.json()["detail"]

    # 28. Create a new pending invitation for revocation test
    test_revoke_email = f"revoke_test_{uuid.uuid4().hex[:6]}@example.com"
    new_inv_res = client.post(
        f"/companies/{company_id}/invitations",
        headers=admin1["headers"],
        json={"email": test_revoke_email, "role": "MEMBER", "designation": "Intern"},
    )
    assert new_inv_res.status_code == 201
    new_inv_id = new_inv_res.json()["id"]

    # 29. MEMBER cannot revoke invitation (403 Forbidden)
    member_revoke = client.post(
        f"/companies/{company_id}/invitations/{new_inv_id}/revoke",
        headers=member1["headers"],
    )
    assert member_revoke.status_code == 403
    assert "Only company owners and admins" in member_revoke.json()["detail"]

    # 30. ADMIN can revoke invitation (200 OK)
    admin_revoke = client.post(
        f"/companies/{company_id}/invitations/{new_inv_id}/revoke",
        headers=admin1["headers"],
    )
    assert admin_revoke.status_code == 200
    assert admin_revoke.json()["status"] == "REVOKED"

    # 31. Cannot revoke already revoked invitation (400 Bad Request)
    repeat_revoke = client.post(
        f"/companies/{company_id}/invitations/{new_inv_id}/revoke",
        headers=owner1["headers"],
    )
    assert repeat_revoke.status_code == 400
    assert "already been revoked" in repeat_revoke.json()["detail"]


from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from fastapi import HTTPException
from app.models.company_invitation import InvitationStatus
from app.repositories.company import get_company_members
from app.repositories.company_invitation import create_invitation, get_invitation_by_token_hash
from app.services.company_invitation import (
    accept_company_invitation_service,
    _hash_invitation_token,
)
from app.core.database import SessionLocal
from datetime import datetime, timezone, timedelta
import secrets


def test_invitation_acceptance_concurrency_race_condition():
    """
    Test true concurrent invitation acceptance requests with multithreading.
    Row-level locking (SELECT ... FOR UPDATE) ensures only one request succeeds,
    while the concurrent request is blocked and then cleanly rejected once the first commits.
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"c_own_{suffix}", "Concurrency Owner")
    invitee = _create_and_login_user(f"c_inv_{suffix}", "Concurrency Invitee")

    # 1. Create company
    create_res = client.post(
        "/companies",
        headers=owner["headers"],
        json={"name": f"Concurrent Corp {suffix}"},
    )
    assert create_res.status_code == 201
    company_id = uuid.UUID(create_res.json()["id"])
    invitee_id = uuid.UUID(invitee["id"])

    # 2. Create invitation in database
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_invitation_token(raw_token)
    db = SessionLocal()
    try:
        create_invitation(
            db=db,
            company_id=company_id,
            email=invitee["email"],
            role="MEMBER",
            token_hash=token_hash,
            invited_by=uuid.UUID(owner["id"]),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            designation="Concurrency Engineer",
            department="Core Platform",
        )
    finally:
        db.close()

    # 3. Simulate two truly concurrent acceptance attempts using threads and a Barrier
    barrier = Barrier(2)
    results = []

    def concurrent_accept_worker():
        thread_db = SessionLocal()
        try:
            # Synchronize both threads so they hit the database query simultaneously
            barrier.wait()
            accepted_inv = accept_company_invitation_service(
                db=thread_db,
                raw_token=raw_token,
                user_id=invitee_id,
            )
            return {"status": "success", "result": accepted_inv}
        except HTTPException as exc:
            return {"status": "http_error", "status_code": exc.status_code, "detail": exc.detail}
        except Exception as exc:
            return {"status": "error", "exception": str(exc)}
        finally:
            thread_db.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(concurrent_accept_worker)
        f2 = executor.submit(concurrent_accept_worker)
        results = [f1.result(), f2.result()]

    # 4. Verify outcomes: Exactly one succeeded, exactly one was rejected with 400
    successes = [r for r in results if r["status"] == "success"]
    rejections = [r for r in results if r["status"] == "http_error"]
    errors = [r for r in results if r["status"] == "error"]

    assert len(errors) == 0, f"Unexpected unhandled errors occurred: {errors}"
    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}: {results}"
    assert len(rejections) == 1, f"Expected exactly 1 rejection, got {len(rejections)}: {results}"
    assert rejections[0]["status_code"] in (400, 404)

    # 5. Verify database integrity
    verify_db = SessionLocal()
    try:
        # Exactly one membership exists
        members, _ = get_company_members(verify_db, company_id)
        invitee_members = [m for m in members if m.user_id == invitee_id]
        assert len(invitee_members) == 1
        assert invitee_members[0].designation == "Concurrency Engineer"

        # Invitation is marked ACCEPTED exactly once
        inv = get_invitation_by_token_hash(verify_db, token_hash)
        assert inv is not None
        assert inv.status == InvitationStatus.ACCEPTED
        assert inv.accepted_at is not None
    finally:
        verify_db.close()


def test_invitation_state_transitions_and_validations():
    """
    Test that once an invitation transitions to ACCEPTED, REVOKED, or EXPIRED,
    it cannot be accepted again.
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"st_own_{suffix}", "State Owner")
    invitee = _create_and_login_user(f"st_inv_{suffix}", "State Invitee")

    create_res = client.post(
        "/companies",
        headers=owner["headers"],
        json={"name": f"State Corp {suffix}"},
    )
    assert create_res.status_code == 201
    company_id = uuid.UUID(create_res.json()["id"])
    invitee_id = uuid.UUID(invitee["id"])

    # 1. Expired invitation rejection (410 Gone)
    expired_token = secrets.token_urlsafe(32)
    expired_hash = _hash_invitation_token(expired_token)
    db = SessionLocal()
    try:
        create_invitation(
            db=db,
            company_id=company_id,
            email=invitee["email"],
            role="MEMBER",
            token_hash=expired_hash,
            invited_by=uuid.UUID(owner["id"]),
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
    finally:
        db.close()

    expired_accept = client.post(
        f"/companies/invitations/accept/{expired_token}",
        headers=invitee["headers"],
    )
    assert expired_accept.status_code == 410
    assert "expired" in expired_accept.json()["detail"]

    # 2. Revoked invitation rejection (400 Bad Request)
    revoked_token = secrets.token_urlsafe(32)
    revoked_hash = _hash_invitation_token(revoked_token)
    db = SessionLocal()
    try:
        inv = create_invitation(
            db=db,
            company_id=company_id,
            email=invitee["email"],
            role="MEMBER",
            token_hash=revoked_hash,
            invited_by=uuid.UUID(owner["id"]),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        inv.status = InvitationStatus.REVOKED
        db.commit()
    finally:
        db.close()

    revoked_accept = client.post(
        f"/companies/invitations/accept/{revoked_token}",
        headers=invitee["headers"],
    )
    assert revoked_accept.status_code == 400
    assert "revoked" in revoked_accept.json()["detail"]

    # 3. Already accepted invitation rejection (400 Bad Request)
    accepted_token = secrets.token_urlsafe(32)
    accepted_hash = _hash_invitation_token(accepted_token)
    db = SessionLocal()
    try:
        inv2 = create_invitation(
            db=db,
            company_id=company_id,
            email=invitee["email"],
            role="MEMBER",
            token_hash=accepted_hash,
            invited_by=uuid.UUID(owner["id"]),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        inv2.status = InvitationStatus.ACCEPTED
        inv2.accepted_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()

    accepted_again = client.post(
        f"/companies/invitations/accept/{accepted_token}",
        headers=invitee["headers"],
    )
    assert accepted_again.status_code == 400
    assert "already been accepted" in accepted_again.json()["detail"]


def test_member_lifecycle_removal_and_permissions():
    """
    Tests 1, 2, 3, 4, 8:
    - OWNER removes MEMBER -> Success
    - ADMIN removes MEMBER -> Success
    - ADMIN cannot remove OWNER -> 403
    - MEMBER cannot remove MEMBER -> 403
    - Cross-company removal -> 403/404
    - Self-removal via admin endpoint -> 400
    - Last OWNER removal attempt -> 400
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"own_rem_{suffix}", "Owner Alice")
    admin = _create_and_login_user(f"adm_rem_{suffix}", "Admin Bob")
    member1 = _create_and_login_user(f"mem1_rem_{suffix}", "Member Charlie")
    member2 = _create_and_login_user(f"mem2_rem_{suffix}", "Member Dave")
    outsider = _create_and_login_user(f"out_rem_{suffix}", "Outsider Eve")

    # Create Company A
    c_res = client.post("/companies", headers=owner["headers"], json={"name": f"Lifecycle Corp {suffix}"})
    assert c_res.status_code == 201
    company_id = c_res.json()["id"]

    # Add Admin, Member 1, Member 2
    client.post(f"/companies/{company_id}/members?user_id={admin['id']}&role=ADMIN", headers=owner["headers"])
    client.post(f"/companies/{company_id}/members?user_id={member1['id']}&role=MEMBER", headers=owner["headers"])
    client.post(f"/companies/{company_id}/members?user_id={member2['id']}&role=MEMBER", headers=owner["headers"])

    # Create Company B for cross-company tests
    cb_res = client.post("/companies", headers=outsider["headers"], json={"name": f"Other Corp {suffix}"})
    company_b_id = cb_res.json()["id"]

    # TEST 3: MEMBER attempts to remove another MEMBER -> 403 Forbidden
    mem_rem_mem = client.delete(f"/companies/{company_id}/members/{member2['id']}", headers=member1["headers"])
    assert mem_rem_mem.status_code == 403
    assert "Members cannot remove" in mem_rem_mem.json()["detail"]

    # TEST 4: Cross-company removal attempt -> 403 Forbidden
    cross_rem = client.delete(f"/companies/{company_b_id}/members/{outsider['id']}", headers=owner["headers"])
    assert cross_rem.status_code == 403
    assert "You do not have access" in cross_rem.json()["detail"]

    # Admin removal of non-existent member -> 404
    fake_user_id = uuid.uuid4()
    not_found_rem = client.delete(f"/companies/{company_id}/members/{fake_user_id}", headers=admin["headers"])
    assert not_found_rem.status_code == 404

    # Admin attempts to remove OWNER -> 403 Forbidden
    adm_rem_owner = client.delete(f"/companies/{company_id}/members/{owner['id']}", headers=admin["headers"])
    assert adm_rem_owner.status_code == 403
    assert "Admins cannot remove company owners" in adm_rem_owner.json()["detail"]

    # Self-removal via admin endpoint -> 400 Bad Request
    self_rem = client.delete(f"/companies/{company_id}/members/{owner['id']}", headers=owner["headers"])
    assert self_rem.status_code == 400
    assert "You cannot remove yourself" in self_rem.json()["detail"]

    # TEST 2: ADMIN removes MEMBER -> 200 Success
    adm_rem_res = client.delete(f"/companies/{company_id}/members/{member1['id']}", headers=admin["headers"])
    assert adm_rem_res.status_code == 200
    assert "Member removed from company successfully" in adm_rem_res.json()["message"]

    # Verify Member 1 is removed
    res1 = client.get(f"/companies/{company_id}/members", headers=owner["headers"]).json()
    members_list = res1["items"] if "items" in res1 else res1
    assert not any(m["user_id"] == member1["id"] for m in members_list)

    # TEST 1: OWNER removes MEMBER -> 200 Success
    owner_rem_res = client.delete(f"/companies/{company_id}/members/{member2['id']}", headers=owner["headers"])
    assert owner_rem_res.status_code == 200

    # Verify Member 2 is removed
    res2 = client.get(f"/companies/{company_id}/members", headers=owner["headers"]).json()
    members_list2 = res2["items"] if "items" in res2 else res2
    assert not any(m["user_id"] == member2["id"] for m in members_list2)


def test_member_and_admin_leave_company():
    """
    Tests 5, 6, 7, 9:
    - MEMBER leaves company -> Success
    - ADMIN leaves company -> Success when owner remains
    - Only OWNER attempts to leave -> Rejected 400
    - Company has 2 OWNERS -> One leaves -> Exactly 1 remains -> Second cannot leave
    """
    suffix = uuid.uuid4().hex[:8]
    owner1 = _create_and_login_user(f"own1_lv_{suffix}", "Owner One")
    owner2 = _create_and_login_user(f"own2_lv_{suffix}", "Owner Two")
    admin = _create_and_login_user(f"adm_lv_{suffix}", "Admin Bob")
    member = _create_and_login_user(f"mem_lv_{suffix}", "Member Charlie")

    c_res = client.post("/companies", headers=owner1["headers"], json={"name": f"Leave Corp {suffix}"})
    company_id = c_res.json()["id"]

    # Add Owner 2, Admin, Member
    client.post(f"/companies/{company_id}/members?user_id={owner2['id']}&role=OWNER", headers=owner1["headers"])
    client.post(f"/companies/{company_id}/members?user_id={admin['id']}&role=ADMIN", headers=owner1["headers"])
    client.post(f"/companies/{company_id}/members?user_id={member['id']}&role=MEMBER", headers=owner1["headers"])

    # TEST 5: MEMBER leaves company -> 200 Success
    mem_leave = client.post(f"/companies/{company_id}/leave", headers=member["headers"])
    assert mem_leave.status_code == 200
    assert "Successfully left the company" in mem_leave.json()["message"]

    # Verify Member is gone
    res_m1 = client.get(f"/companies/{company_id}/members", headers=owner1["headers"]).json()
    members_list = res_m1["items"] if "items" in res_m1 else res_m1
    assert not any(m["user_id"] == member["id"] for m in members_list)

    # TEST 6: ADMIN leaves company -> 200 Success
    adm_leave = client.post(f"/companies/{company_id}/leave", headers=admin["headers"])
    assert adm_leave.status_code == 200

    # Verify Admin is gone
    res_m2 = client.get(f"/companies/{company_id}/members", headers=owner1["headers"]).json()
    members_list2 = res_m2["items"] if "items" in res_m2 else res_m2
    assert not any(m["user_id"] == admin["id"] for m in members_list2)

    # TEST 9: Company has two OWNERS. Owner 1 leaves -> 200 Success. Exactly one OWNER remains.
    owner1_leave = client.post(f"/companies/{company_id}/leave", headers=owner1["headers"])
    assert owner1_leave.status_code == 200

    # Verify Owner 2 is the only member and only owner
    res_m3 = client.get(f"/companies/{company_id}/members", headers=owner2["headers"]).json()
    members_list3 = res_m3["items"] if "items" in res_m3 else res_m3
    assert len(members_list3) == 1
    assert members_list3[0]["user_id"] == owner2["id"]
    assert members_list3[0]["role"] == "OWNER"

    # TEST 7: Only OWNER attempts to leave -> Rejected with 400 Bad Request
    owner2_leave = client.post(f"/companies/{company_id}/leave", headers=owner2["headers"])
    assert owner2_leave.status_code == 400
    assert "Cannot leave company as the only owner" in owner2_leave.json()["detail"]


def test_team_cleanup_on_company_departure_and_cross_company_isolation():
    """
    Tests 10, 11:
    - Removing a company member removes their team memberships in that company.
    - User has teams in two companies: leaving Company A cleans up Company A teams, preserves Company B teams.
    """
    suffix = uuid.uuid4().hex[:8]
    owner_a = _create_and_login_user(f"oa_{suffix}", "Owner A")
    owner_b = _create_and_login_user(f"ob_{suffix}", "Owner B")
    user = _create_and_login_user(f"u_{suffix}", "Multi-Company User")

    # Create Company A and Company B
    ca = client.post("/companies", headers=owner_a["headers"], json={"name": f"Company A {suffix}"}).json()
    cb = client.post("/companies", headers=owner_b["headers"], json={"name": f"Company B {suffix}"}).json()
    ca_id = ca["id"]
    cb_id = cb["id"]
    user_id = user["id"]

    # Add user to Company A and Company B
    client.post(f"/companies/{ca_id}/members?user_id={user_id}&role=MEMBER", headers=owner_a["headers"])
    client.post(f"/companies/{cb_id}/members?user_id={user_id}&role=MEMBER", headers=owner_b["headers"])

    # Create Team A1, Team A2 in Company A
    t_a1 = client.post(f"/companies/{ca_id}/teams", headers=owner_a["headers"], json={"name": f"Team A1 {suffix}"}).json()
    t_a2 = client.post(f"/companies/{ca_id}/teams", headers=owner_a["headers"], json={"name": f"Team A2 {suffix}"}).json()

    # Create Team B1 in Company B
    t_b1 = client.post(f"/companies/{cb_id}/teams", headers=owner_b["headers"], json={"name": f"Team B1 {suffix}"}).json()

    # Add user to Team A1, Team A2, Team B1
    client.post(f"/companies/{ca_id}/teams/{t_a1['id']}/members", headers=owner_a["headers"], json={"user_id": user_id, "role": "MEMBER"})
    client.post(f"/companies/{ca_id}/teams/{t_a2['id']}/members", headers=owner_a["headers"], json={"user_id": user_id, "role": "MEMBER"})
    client.post(f"/companies/{cb_id}/teams/{t_b1['id']}/members", headers=owner_b["headers"], json={"user_id": user_id, "role": "MEMBER"})

    # Verify user is in Team A1, Team A2, Team B1
    from app.models.team_member import TeamMember
    from sqlalchemy import select
    db = SessionLocal()
    try:
        tms = db.scalars(select(TeamMember).where(TeamMember.user_id == uuid.UUID(user_id))).all()
        assert len(tms) == 3
    finally:
        db.close()

    # User leaves Company A
    leave_res = client.post(f"/companies/{ca_id}/leave", headers=user["headers"])
    assert leave_res.status_code == 200

    # TEST 10 & 11: Verify user removed from Team A1 & A2, but STILL in Team B1
    db = SessionLocal()
    try:
        tms = db.scalars(select(TeamMember).where(TeamMember.user_id == uuid.UUID(user_id))).all()
        assert len(tms) == 1
        assert str(tms[0].team_id) == t_b1["id"]
    finally:
        db.close()


def test_team_lead_leave_and_reassignment_rules():
    """
    Test 12:
    - If user is the only LEAD in a team with multiple members, leaving is rejected (400)
    - After leadership is reassigned (or second lead added), user leaves successfully
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"t_own_{suffix}", "Company Owner")
    lead_user = _create_and_login_user(f"t_lead_{suffix}", "Team Lead")
    sarah = _create_and_login_user(f"t_sarah_{suffix}", "Sarah Member")

    c = client.post("/companies", headers=owner["headers"], json={"name": f"Lead Test Co {suffix}"}).json()
    company_id = c["id"]

    # Add lead_user and sarah to company
    client.post(f"/companies/{company_id}/members?user_id={lead_user['id']}&role=MEMBER", headers=owner["headers"])
    client.post(f"/companies/{company_id}/members?user_id={sarah['id']}&role=MEMBER", headers=owner["headers"])

    # Create team with lead_user as LEAD and sarah as MEMBER
    team = client.post(f"/companies/{company_id}/teams", headers=owner["headers"], json={"name": f"Eng Team {suffix}"}).json()
    team_id = team["id"]
    # Transfer team leadership to lead_user
    client.post(f"/companies/{company_id}/teams/{team_id}/members", headers=owner["headers"], json={"user_id": lead_user["id"], "role": "MEMBER"})
    client.post(f"/companies/{company_id}/teams/{team_id}/members", headers=owner["headers"], json={"user_id": sarah["id"], "role": "MEMBER"})
    client.post(f"/companies/{company_id}/teams/{team_id}/transfer-leadership", headers=owner["headers"], json={"new_lead_user_id": lead_user["id"]})
    # Remove owner from team so lead_user is the ONLY lead and sarah is member
    client.delete(f"/companies/{company_id}/teams/{team_id}/members/{owner['id']}", headers=owner["headers"])

    # Attempt to remove or leave company by lead_user -> 400 Bad Request
    lead_leave = client.post(f"/companies/{company_id}/leave", headers=lead_user["headers"])
    assert lead_leave.status_code == 400
    assert "only lead of team" in lead_leave.json()["detail"]

    # Now promote Sarah to LEAD
    client.patch(f"/companies/{company_id}/teams/{team_id}/members/{sarah['id']}", headers=owner["headers"], json={"role": "LEAD"})

    # Now lead_user leaves company -> 200 OK!
    lead_leave2 = client.post(f"/companies/{company_id}/leave", headers=lead_user["headers"])
    assert lead_leave2.status_code == 200


def test_concurrent_last_owner_leave_and_removal_race_condition():
    """
    Test 13:
    Company starts with 2 owners.
    Two concurrent leave requests arrive at the same time.
    Database row-level locking ensures exactly ONE succeeds and the other is rejected with 400.
    The company NEVER ends up with 0 owners.
    """
    suffix = uuid.uuid4().hex[:8]
    owner1 = _create_and_login_user(f"c_o1_{suffix}", "Concurrent Owner 1")
    owner2 = _create_and_login_user(f"c_o2_{suffix}", "Concurrent Owner 2")

    c = client.post("/companies", headers=owner1["headers"], json={"name": f"Race Corp {suffix}"}).json()
    company_id = uuid.UUID(c["id"])
    owner1_id = uuid.UUID(owner1["id"])
    owner2_id = uuid.UUID(owner2["id"])

    # Add owner2 as OWNER
    client.post(f"/companies/{company_id}/members?user_id={owner2['id']}&role=OWNER", headers=owner1["headers"])

    from app.services.company import leave_company_service
    from app.repositories.company import count_company_owners

    barrier = Barrier(2)
    results = []

    def concurrent_leave_worker(user_id):
        thread_db = SessionLocal()
        try:
            barrier.wait()
            res = leave_company_service(db=thread_db, company_id=company_id, user_id=user_id)
            return {"status": "success", "result": res}
        except HTTPException as exc:
            return {"status": "http_error", "status_code": exc.status_code, "detail": exc.detail}
        except Exception as exc:
            return {"status": "error", "exception": str(exc)}
        finally:
            thread_db.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(concurrent_leave_worker, owner1_id)
        f2 = executor.submit(concurrent_leave_worker, owner2_id)
        results = [f1.result(), f2.result()]

    successes = [r for r in results if r["status"] == "success"]
    rejections = [r for r in results if r["status"] == "http_error"]
    errors = [r for r in results if r["status"] == "error"]

    assert len(errors) == 0, f"Unexpected unhandled errors: {errors}"
    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}: {results}"
    assert len(rejections) == 1, f"Expected exactly 1 rejection, got {len(rejections)}: {results}"
    assert rejections[0]["status_code"] == 400
    assert "only owner" in rejections[0]["detail"]

    # Verify DB: exactly 1 OWNER remains in company
    verify_db = SessionLocal()
    try:
        remaining_owners = count_company_owners(verify_db, company_id)
        assert remaining_owners == 1
    finally:
        verify_db.close()



