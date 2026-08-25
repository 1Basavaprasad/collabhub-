import uuid
from contextlib import contextmanager
import pytest
from sqlalchemy import event
from starlette.testclient import TestClient

from app.core.database import engine
from app.main import app

client = TestClient(app)


@contextmanager
def count_sql_queries():
    """Context manager to record all executed SQL statements."""
    queries = []

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        queries.append(statement)

    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        yield queries
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)


def _create_and_login_user(username_prefix: str, full_name: str = "Test User") -> dict:
    """Helper to create and login a unique user for testing."""
    email = f"{username_prefix}@teamx-query-opt.com"
    password = "SecurePassword123!"
    reg_res = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username_prefix,
            "full_name": full_name,
            "password": password,
        },
        headers={"X-Forwarded-For": f"10.60.{uuid.uuid4().int % 250}.1"},
    )
    assert reg_res.status_code == 201, reg_res.text
    user_data = reg_res.json()

    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": password},
        headers={"X-Forwarded-For": f"10.60.{uuid.uuid4().int % 250}.2"},
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


def test_company_members_query_efficiency_no_n_plus_one():
    """
    Verifies GET /companies/{company_id}/members executes a constant O(1) number of queries,
    preventing N+1 queries for User records.
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"opt_own_{suffix}", "Owner Boss")

    c_res = client.post("/companies", headers=owner["headers"], json={"name": f"Opt Corp {suffix}"})
    company_id = c_res.json()["id"]

    # Measure query count with 1 member
    with count_sql_queries() as q_small:
        res_small = client.get(f"/companies/{company_id}/members", headers=owner["headers"])
    assert res_small.status_code == 200
    small_query_count = len(q_small)

    # Add 10 more members
    for i in range(1, 11):
        u = _create_and_login_user(f"opt_u_{i}_{suffix}", f"Member {i}")
        client.post(f"/companies/{company_id}/members?user_id={u['id']}&role=MEMBER", headers=owner["headers"])

    # Measure query count with 11 members
    with count_sql_queries() as q_large:
        res_large = client.get(f"/companies/{company_id}/members", headers=owner["headers"])
    assert res_large.status_code == 200
    large_query_count = len(q_large)

    # In an N+1 scenario, query count would increase by 10 (one per member).
    # With eager loading / joined contains_eager, query count remains constant O(1).
    assert large_query_count == small_query_count, (
        f"Query count scaled linearly with members! 1 member: {small_query_count} queries, "
        f"11 members: {large_query_count} queries"
    )
    # Ensure query count is strictly bounded (auth user query + company membership auth check + count query + items query)
    assert large_query_count <= 4


def test_company_invitations_query_efficiency_no_n_plus_one():
    """
    Verifies GET /companies/{company_id}/invitations executes a constant O(1) number of queries.
    """
    from unittest.mock import patch

    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"opt_inv_own_{suffix}", "Inv Owner")
    company_id = client.post("/companies", headers=owner["headers"], json={"name": f"Inv Corp {suffix}"}).json()["id"]

    with patch("app.services.company_invitation.send_company_invitation_email"):
        # Create 1 invitation
        client.post(
            f"/companies/{company_id}/invitations",
            headers=owner["headers"],
            json={"email": f"inv_1_{suffix}@opt-test.com", "role": "MEMBER"},
        )

        with count_sql_queries() as q_small:
            res_small = client.get(f"/companies/{company_id}/invitations", headers=owner["headers"])
        assert res_small.status_code == 200
        small_count = len(q_small)

        # Create 8 more invitations
        for i in range(2, 10):
            client.post(
                f"/companies/{company_id}/invitations",
                headers=owner["headers"],
                json={"email": f"inv_{i}_{suffix}@opt-test.com", "role": "MEMBER"},
            )

        with count_sql_queries() as q_large:
            res_large = client.get(f"/companies/{company_id}/invitations", headers=owner["headers"])
        assert res_large.status_code == 200
        large_count = len(q_large)

        # Constant query count
        assert large_count == small_count, f"Invitation queries scaled: {small_count} vs {large_count}"
        assert large_count <= 4


def test_teams_listing_query_efficiency_no_n_plus_one():
    """
    Verifies GET /companies/{company_id}/teams executes a constant O(1) number of queries,
    and does NOT query team members or users in a per-team loop.
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"opt_tm_own_{suffix}", "Team Owner")
    company_id = client.post("/companies", headers=owner["headers"], json={"name": f"Team Corp {suffix}"}).json()["id"]

    # Create 1 team
    client.post(
        f"/companies/{company_id}/teams",
        headers=owner["headers"],
        json={"name": f"Team 1 {suffix}", "description": "Team 1"},
    )

    with count_sql_queries() as q_small:
        res_small = client.get(f"/companies/{company_id}/teams", headers=owner["headers"])
    assert res_small.status_code == 200
    small_count = len(q_small)

    # Create 5 more teams with members
    for i in range(2, 7):
        t_res = client.post(
            f"/companies/{company_id}/teams",
            headers=owner["headers"],
            json={"name": f"Team {i} {suffix}", "description": f"Team {i}"},
        )
        t_id = t_res.json()["id"]
        # Add a member to each
        u = _create_and_login_user(f"opt_tmu_{i}_{suffix}", f"Member {i}")
        client.post(f"/companies/{company_id}/members?user_id={u['id']}&role=MEMBER", headers=owner["headers"])
        client.post(f"/companies/{company_id}/teams/{t_id}/members", headers=owner["headers"], json={"user_id": u["id"]})

    with count_sql_queries() as q_large:
        res_large = client.get(f"/companies/{company_id}/teams", headers=owner["headers"])
    assert res_large.status_code == 200
    large_count = len(q_large)

    # In an N+1 scenario (querying members/users per team), large_count would grow by at least 5 to 10 queries.
    # With selectinload and batch aggregation, query count remains constant.
    assert large_count == small_count, f"Team listing queries scaled: 1 team = {small_count}, 6 teams = {large_count}"
    assert large_count <= 8


def test_team_members_query_efficiency_no_n_plus_one():
    """
    Verifies GET /companies/{company_id}/teams/{team_id}/members executes a constant O(1) number of queries.
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"opt_tmem_own_{suffix}", "Team Member Owner")
    company_id = client.post("/companies", headers=owner["headers"], json={"name": f"TMem Corp {suffix}"}).json()["id"]
    team_id = client.post(
        f"/companies/{company_id}/teams",
        headers=owner["headers"],
        json={"name": f"TMem Team {suffix}"},
    ).json()["id"]

    # 1 member in team (owner)
    with count_sql_queries() as q_small:
        res_small = client.get(f"/companies/{company_id}/teams/{team_id}/members", headers=owner["headers"])
    assert res_small.status_code == 200
    small_count = len(q_small)

    # Add 8 more members to the team
    for i in range(1, 9):
        u = _create_and_login_user(f"opt_tm_u_{i}_{suffix}", f"Dev {i}")
        client.post(f"/companies/{company_id}/members?user_id={u['id']}&role=MEMBER", headers=owner["headers"])
        client.post(f"/companies/{company_id}/teams/{team_id}/members", headers=owner["headers"], json={"user_id": u["id"]})

    # 9 members in team
    with count_sql_queries() as q_large:
        res_large = client.get(f"/companies/{company_id}/teams/{team_id}/members", headers=owner["headers"])
    assert res_large.status_code == 200
    large_count = len(q_large)

    assert large_count == small_count, f"Team member queries scaled: {small_count} vs {large_count}"
    assert large_count <= 8


def test_team_activity_query_efficiency_no_n_plus_one():
    """
    Verifies GET /companies/{company_id}/teams/{team_id}/activity executes a constant O(1) number of queries.
    """
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"opt_act_own_{suffix}", "Activity Owner")
    company_id = client.post("/companies", headers=owner["headers"], json={"name": f"Act Corp {suffix}"}).json()["id"]
    team_id = client.post(
        f"/companies/{company_id}/teams",
        headers=owner["headers"],
        json={"name": f"Act Team {suffix}"},
    ).json()["id"]

    # 1 activity (creation)
    with count_sql_queries() as q_small:
        res_small = client.get(f"/companies/{company_id}/teams/{team_id}/activity", headers=owner["headers"])
    assert res_small.status_code == 200
    small_count = len(q_small)

    # Generate 6 more activities
    for i in range(1, 7):
        u = _create_and_login_user(f"opt_act_u_{i}_{suffix}", f"Act User {i}")
        client.post(f"/companies/{company_id}/members?user_id={u['id']}&role=MEMBER", headers=owner["headers"])
        client.post(f"/companies/{company_id}/teams/{team_id}/members", headers=owner["headers"], json={"user_id": u["id"]})

    with count_sql_queries() as q_large:
        res_large = client.get(f"/companies/{company_id}/teams/{team_id}/activity", headers=owner["headers"])
    assert res_large.status_code == 200
    large_count = len(q_large)

    assert large_count == small_count, f"Team activity queries scaled: {small_count} vs {large_count}"
    assert large_count <= 8
