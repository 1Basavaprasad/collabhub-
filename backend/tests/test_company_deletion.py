import secrets
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from sqlalchemy import select
from starlette.testclient import TestClient

from app.core.database import SessionLocal
from app.main import app
from app.models.company import Company
from app.models.company_invitation import CompanyInvitation, InvitationStatus
from app.models.company_member import CompanyMember, CompanyRole
from app.models.team import Team
from app.models.team_activity import TeamActivity
from app.models.team_member import TeamMember
from app.models.user import User
from app.repositories.company_invitation import create_invitation
from app.services.company_invitation import _hash_invitation_token

client = TestClient(app)


def _create_and_login_user(suffix: str, full_name: str = "Test User"):
    email = f"del_user_{suffix}@example.com"
    username = f"del_user_{suffix}"
    password = "SecurePassword123!"
    ip = f"192.168.{abs(hash(suffix)) % 240 + 1}.{abs(hash(suffix)) % 240 + 1}"
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


def _create_company(owner_dict: dict, name: str = "Test Workspace") -> dict:
    res = client.post(
        "/companies",
        json={
            "name": name,
            "description": "Workspace description for testing deletion lifecycle",
            "industry": "Technology",
            "company_size": "11-50",
            "country": "India",
            "city": "Bengaluru",
        },
        headers=owner_dict["headers"],
    )
    assert res.status_code == 201
    return res.json()


# ============================================================================
# 1. OWNER CAN SOFT-DELETE COMPANY (Sets is_deleted=True and deleted_at)
# ============================================================================
def test_owner_can_soft_delete_company_and_sets_fields():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Company Owner")
    comp = _create_company(owner, f"Deletable Corp {suffix}")
    company_id = comp["id"]

    # Delete company
    del_res = client.delete(f"/companies/{company_id}", headers=owner["headers"])
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "Company deleted successfully."
    assert del_res.json()["company_id"] == company_id

    # Verify directly in database that it is soft-deleted
    with SessionLocal() as db:
        db_comp = db.scalar(select(Company).where(Company.id == uuid.UUID(company_id)))
        assert db_comp is not None
        assert db_comp.is_deleted is True
        assert db_comp.deleted_at is not None


# ============================================================================
# 2. ADMIN CANNOT DELETE COMPANY (403 Forbidden)
# ============================================================================
def test_admin_cannot_delete_company():
    suffix1 = uuid.uuid4().hex[:8]
    suffix2 = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix1, "Owner User")
    admin = _create_and_login_user(suffix2, "Admin User")

    comp = _create_company(owner, f"Admin Test Corp {suffix1}")
    company_id = comp["id"]

    # Add admin to company
    add_res = client.post(
        f"/companies/{company_id}/members?user_id={admin['id']}&role=ADMIN",
        headers=owner["headers"],
    )
    assert add_res.status_code == 201

    # Admin attempts deletion -> 403 Forbidden
    del_res = client.delete(f"/companies/{company_id}", headers=admin["headers"])
    assert del_res.status_code == 403
    assert "Only company owners can delete the company workspace" in del_res.json()["detail"]

    # Ensure company remains active
    with SessionLocal() as db:
        db_comp = db.scalar(select(Company).where(Company.id == uuid.UUID(company_id)))
        assert db_comp.is_deleted is False


# ============================================================================
# 3. REGULAR MEMBER CANNOT DELETE COMPANY (403 Forbidden)
# ============================================================================
def test_member_cannot_delete_company():
    suffix1 = uuid.uuid4().hex[:8]
    suffix2 = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix1, "Owner User")
    member = _create_and_login_user(suffix2, "Member User")

    comp = _create_company(owner, f"Member Test Corp {suffix1}")
    company_id = comp["id"]

    # Add member to company
    add_res = client.post(
        f"/companies/{company_id}/members?user_id={member['id']}&role=MEMBER",
        headers=owner["headers"],
    )
    assert add_res.status_code == 201

    # Member attempts deletion -> 403 Forbidden
    del_res = client.delete(f"/companies/{company_id}", headers=member["headers"])
    assert del_res.status_code == 403
    assert "Only company owners can delete the company workspace" in del_res.json()["detail"]


# ============================================================================
# 4. NON-MEMBER OUTSIDER CANNOT DELETE COMPANY (403 Forbidden)
# ============================================================================
def test_non_member_cannot_delete_company():
    suffix1 = uuid.uuid4().hex[:8]
    suffix2 = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix1, "Owner User")
    outsider = _create_and_login_user(suffix2, "Outsider User")

    comp = _create_company(owner, f"Outsider Test Corp {suffix1}")
    company_id = comp["id"]

    # Outsider attempts deletion -> 403 Forbidden
    del_res = client.delete(f"/companies/{company_id}", headers=outsider["headers"])
    assert del_res.status_code == 403
    assert "You do not belong to this company workspace" in del_res.json()["detail"]


# ============================================================================
# 5. DELETED COMPANY NOT RETURNED IN GET /companies/{company_id} (404 Not Found)
# ============================================================================
def test_deleted_company_not_returned_in_get_by_id():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Company Owner")
    comp = _create_company(owner, f"Lookup Corp {suffix}")
    company_id = comp["id"]

    # Accessible before deletion
    get_res1 = client.get(f"/companies/{company_id}", headers=owner["headers"])
    assert get_res1.status_code == 200

    # Delete company
    del_res = client.delete(f"/companies/{company_id}", headers=owner["headers"])
    assert del_res.status_code == 200

    # Lookup after deletion -> 404 Not Found
    get_res2 = client.get(f"/companies/{company_id}", headers=owner["headers"])
    assert get_res2.status_code == 404


# ============================================================================
# 6. DELETED COMPANY EXCLUDED FROM GET /companies (List)
# ============================================================================
def test_deleted_company_excluded_from_my_companies_list():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Company Owner")
    comp1 = _create_company(owner, f"Company One {suffix}")
    comp2 = _create_company(owner, f"Company Two {suffix}")

    # List shows both
    list_res1 = client.get("/companies", headers=owner["headers"])
    assert list_res1.status_code == 200
    comp_ids1 = [c["id"] for c in list_res1.json()]
    assert comp1["id"] in comp_ids1
    assert comp2["id"] in comp_ids1

    # Delete comp1
    del_res = client.delete(f"/companies/{comp1['id']}", headers=owner["headers"])
    assert del_res.status_code == 200

    # List now only includes comp2
    list_res2 = client.get("/companies", headers=owner["headers"])
    assert list_res2.status_code == 200
    comp_ids2 = [c["id"] for c in list_res2.json()]
    assert comp1["id"] not in comp_ids2
    assert comp2["id"] in comp_ids2


# ============================================================================
# 7. DELETED COMPANY EXCLUDED FROM GET /companies/me (Active Fallback)
# ============================================================================
def test_deleted_company_excluded_from_my_company_active_details():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Company Owner")
    comp1 = _create_company(owner, f"Primary Company {suffix}")
    comp2 = _create_company(owner, f"Secondary Company {suffix}")

    # GET /companies/me returns first active company
    me_res1 = client.get("/companies/me", headers=owner["headers"])
    assert me_res1.status_code == 200
    assert me_res1.json()["id"] == comp1["id"]

    # Delete comp1
    client.delete(f"/companies/{comp1['id']}", headers=owner["headers"])

    # GET /companies/me automatically switches to comp2
    me_res2 = client.get("/companies/me", headers=owner["headers"])
    assert me_res2.status_code == 200
    assert me_res2.json()["id"] == comp2["id"]

    # Delete comp2
    client.delete(f"/companies/{comp2['id']}", headers=owner["headers"])

    # Now returns 404 since no active companies remain
    me_res3 = client.get("/companies/me", headers=owner["headers"])
    assert me_res3.status_code == 404


# ============================================================================
# 8. COMPANY DELETION PRESERVES USER ACCOUNTS
# ============================================================================
def test_company_deletion_preserves_user_accounts():
    suffix1 = uuid.uuid4().hex[:8]
    suffix2 = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix1, "Preserved Owner")
    member = _create_and_login_user(suffix2, "Preserved Member")

    comp = _create_company(owner, f"Preservation Test Corp {suffix1}")
    company_id = comp["id"]

    client.post(
        f"/companies/{company_id}/members?user_id={member['id']}&role=MEMBER",
        headers=owner["headers"],
    )

    # Delete the company
    del_res = client.delete(f"/companies/{company_id}", headers=owner["headers"])
    assert del_res.status_code == 200

    # Verify both users still exist in database and can access auth endpoints
    with SessionLocal() as db:
        db_owner = db.scalar(select(User).where(User.id == uuid.UUID(owner["id"])))
        db_member = db.scalar(select(User).where(User.id == uuid.UUID(member["id"])))
        assert db_owner is not None
        assert db_member is not None

    # Owner and member can still call /auth/me
    auth_owner = client.get("/auth/me", headers=owner["headers"])
    assert auth_owner.status_code == 200
    auth_member = client.get("/auth/me", headers=member["headers"])
    assert auth_member.status_code == 200


# ============================================================================
# 9. MULTI-COMPANY USER RETAINS ACCESS TO OTHER COMPANIES AFTER DELETION
# ============================================================================
def test_multi_company_user_retains_access_to_other_companies_after_deletion():
    suffix_user = uuid.uuid4().hex[:8]
    suffix_other_owner = uuid.uuid4().hex[:8]

    user = _create_and_login_user(suffix_user, "Shared User")
    other_owner = _create_and_login_user(suffix_other_owner, "Other Owner")

    # user creates Company A
    comp_a = _create_company(user, f"User Own Company A {suffix_user}")

    # other_owner creates Company B and adds user
    comp_b = _create_company(other_owner, f"Other Company B {suffix_other_owner}")
    client.post(
        f"/companies/{comp_b['id']}/members?user_id={user['id']}&role=MEMBER",
        headers=other_owner["headers"],
    )

    # User deletes Company A
    del_res = client.delete(f"/companies/{comp_a['id']}", headers=user["headers"])
    assert del_res.status_code == 200

    # User can still access Company B
    comp_b_get = client.get(f"/companies/{comp_b['id']}", headers=user["headers"])
    assert comp_b_get.status_code == 200
    assert comp_b_get.json()["name"] == comp_b["name"]


# ============================================================================
# 10. PENDING INVITATIONS REVOKED ON COMPANY DELETION
# ============================================================================
@patch("app.services.company_invitation.send_company_invitation_email")
def test_pending_invitations_revoked_on_company_deletion(mock_email):
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Company Owner")
    comp = _create_company(owner, f"Invite Revoke Corp {suffix}")
    company_id = comp["id"]

    # Send 2 invitations
    inv1_res = client.post(
        f"/companies/{company_id}/invitations",
        json={"email": f"invitee1_{suffix}@example.com", "role": "MEMBER"},
        headers=owner["headers"],
    )
    assert inv1_res.status_code == 201

    inv2_res = client.post(
        f"/companies/{company_id}/invitations",
        json={"email": f"invitee2_{suffix}@example.com", "role": "ADMIN"},
        headers=owner["headers"],
    )
    assert inv2_res.status_code == 201

    # Delete the company
    del_res = client.delete(f"/companies/{company_id}", headers=owner["headers"])
    assert del_res.status_code == 200

    # Verify both invitations are REVOKED in DB
    with SessionLocal() as db:
        invitations = list(
            db.execute(
                select(CompanyInvitation).where(
                    CompanyInvitation.company_id == uuid.UUID(company_id)
                )
            ).scalars().all()
        )
        assert len(invitations) == 2
        for inv in invitations:
            assert inv.status == InvitationStatus.REVOKED


# ============================================================================
# 11. CANNOT ACCEPT INVITATION TO DELETED COMPANY
# ============================================================================
def test_cannot_accept_invitation_to_deleted_company():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Company Owner")
    comp = _create_company(owner, f"Accept Test Corp {suffix}")
    company_id = uuid.UUID(comp["id"])

    invitee_email = f"accept_test_{suffix}@example.com"
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_invitation_token(raw_token)

    with SessionLocal() as db:
        create_invitation(
            db=db,
            company_id=company_id,
            email=invitee_email,
            role="MEMBER",
            token_hash=token_hash,
            invited_by=uuid.UUID(owner["id"]),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=72),
        )

    # Create & login invitee user
    invitee_user = _create_and_login_user(f"acc_{suffix}", "Invitee Person")
    with SessionLocal() as db:
        u = db.scalar(select(User).where(User.id == uuid.UUID(invitee_user["id"])))
        u.email = invitee_email
        db.commit()

    # Delete company
    del_res = client.delete(f"/companies/{company_id}", headers=owner["headers"])
    assert del_res.status_code == 200

    # Attempt to accept invitation -> 400 Bad Request (revoked) or 404 (not found/deleted)
    accept_res = client.post(
        f"/companies/invitations/accept/{raw_token}",
        headers=invitee_user["headers"],
    )
    assert accept_res.status_code in [400, 404]


# ============================================================================
# 12. CANNOT VERIFY INVITATION TO DELETED COMPANY (404 Not Found)
# ============================================================================
def test_cannot_verify_invitation_to_deleted_company():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Company Owner")
    comp = _create_company(owner, f"Verify Test Corp {suffix}")
    company_id = uuid.UUID(comp["id"])

    invitee_email = f"verify_test_{suffix}@example.com"
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_invitation_token(raw_token)

    with SessionLocal() as db:
        create_invitation(
            db=db,
            company_id=company_id,
            email=invitee_email,
            role="MEMBER",
            token_hash=token_hash,
            invited_by=uuid.UUID(owner["id"]),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=72),
        )

    # Verify works before company deletion
    verify_res1 = client.get(f"/companies/invitations/verify/{raw_token}")
    assert verify_res1.status_code == 200

    # Delete company
    client.delete(f"/companies/{company_id}", headers=owner["headers"])

    # Verify fails after company deletion -> 404 Not Found
    verify_res2 = client.get(f"/companies/invitations/verify/{raw_token}")
    assert verify_res2.status_code == 404


# ============================================================================
# 13. COMPANY DELETION IS IDEMPOTENT / RETURNS 404 ON SECOND DELETE
# ============================================================================
def test_company_deletion_is_idempotent_and_returns_404_on_second_delete():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Idempotent Owner")
    comp = _create_company(owner, f"Idempotent Corp {suffix}")
    company_id = comp["id"]

    # First delete -> 200 OK
    del_res1 = client.delete(f"/companies/{company_id}", headers=owner["headers"])
    assert del_res1.status_code == 200

    # Second delete -> 404 Not Found
    del_res2 = client.delete(f"/companies/{company_id}", headers=owner["headers"])
    assert del_res2.status_code == 404


# ============================================================================
# 14. TEAMS AND ACTIVITIES REMAIN INTACT IN DB FOR AUDIT INTEGRITY
# ============================================================================
def test_teams_and_activities_remain_intact_in_db_for_audit_integrity():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Audit Owner")
    comp = _create_company(owner, f"Audit Corp {suffix}")
    company_id = comp["id"]

    # Create team
    team_res = client.post(
        f"/companies/{company_id}/teams",
        json={"name": "Engineering Team", "description": "Core dev team"},
        headers=owner["headers"],
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    # Delete company
    del_res = client.delete(f"/companies/{company_id}", headers=owner["headers"])
    assert del_res.status_code == 200

    # Verify team & activities still exist in the database with foreign keys intact
    with SessionLocal() as db:
        db_team = db.scalar(select(Team).where(Team.id == uuid.UUID(team_id)))
        assert db_team is not None
        assert db_team.name == "Engineering Team"
        assert str(db_team.company_id) == company_id

        db_members = list(
            db.execute(select(TeamMember).where(TeamMember.team_id == uuid.UUID(team_id))).scalars().all()
        )
        assert len(db_members) >= 1

        db_activities = list(
            db.execute(select(TeamActivity).where(TeamActivity.team_id == uuid.UUID(team_id))).scalars().all()
        )
        assert len(db_activities) >= 1

    # Querying team via API returns 404 because company is soft-deleted
    team_get = client.get(f"/companies/{company_id}/teams/{team_id}", headers=owner["headers"])
    assert team_get.status_code in [403, 404]


# ============================================================================
# 15. DELETED COMPANY MEMBER ENDPOINTS RETURN 404
# ============================================================================
def test_deleted_company_member_endpoints_return_404():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Owner User")
    comp = _create_company(owner, f"Member Endpoint Corp {suffix}")
    company_id = comp["id"]

    # Delete company
    client.delete(f"/companies/{company_id}", headers=owner["headers"])

    # GET /companies/{company_id}/members -> 404 Not Found
    members_res = client.get(f"/companies/{company_id}/members", headers=owner["headers"])
    assert members_res.status_code == 404


# ============================================================================
# 16. DELETED COMPANY INVITATIONS ENDPOINTS RETURN 404
# ============================================================================
def test_deleted_company_invitations_endpoints_return_404():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(suffix, "Owner User")
    comp = _create_company(owner, f"Inv Endpoint Corp {suffix}")
    company_id = comp["id"]

    # Delete company
    client.delete(f"/companies/{company_id}", headers=owner["headers"])

    # GET /companies/{company_id}/invitations -> 404 Not Found
    inv_res = client.get(f"/companies/{company_id}/invitations", headers=owner["headers"])
    assert inv_res.status_code == 404
