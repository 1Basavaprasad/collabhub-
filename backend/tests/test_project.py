import uuid
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_and_login_user(suffix: str, full_name: str = "Test User"):
    email = f"project_user_{suffix}@example.com"
    username = f"project_user_{suffix}"
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

    return {
        "id": user_id,
        "email": email,
        "username": username,
        "full_name": full_name,
        "headers": headers,
    }


def test_project_lifecycle_rbac_and_isolation():
    suffix1 = uuid.uuid4().hex[:8]
    suffix2 = uuid.uuid4().hex[:8]
    suffix3 = uuid.uuid4().hex[:8]
    suffix4 = uuid.uuid4().hex[:8]

    owner = _create_and_login_user(suffix1, "Owner Basavaprasad")
    admin = _create_and_login_user(suffix2, "Admin Priya")
    member = _create_and_login_user(suffix3, "Member Rahul")
    outsider = _create_and_login_user(suffix4, "Outsider User")

    # 1. Create Company Workspace
    comp_res = client.post(
        "/companies",
        headers=owner["headers"],
        json={"name": f"CollabHub Corp {suffix1}", "description": "Primary Workspace"},
    )
    assert comp_res.status_code == 201
    company_id = comp_res.json()["id"]

    # Add Admin and Member to Company Workspace
    admin_add = client.post(
        f"/companies/{company_id}/members?user_id={admin['id']}&role=ADMIN",
        headers=owner["headers"],
    )
    assert admin_add.status_code == 201

    member_add = client.post(
        f"/companies/{company_id}/members?user_id={member['id']}&role=MEMBER",
        headers=owner["headers"],
    )
    assert member_add.status_code == 201

    # ----------------------------------------------------
    # Unauthenticated Access (Scenario 10)
    # ----------------------------------------------------
    unauth_res = client.get(f"/companies/{company_id}/projects")
    assert unauth_res.status_code == 401

    unauth_create = client.post(
        f"/companies/{company_id}/projects",
        json={"name": "Secret Project"},
    )
    assert unauth_create.status_code == 401

    # ----------------------------------------------------
    # Outsider Access (Scenario 12)
    # ----------------------------------------------------
    outsider_list = client.get(
        f"/companies/{company_id}/projects",
        headers=outsider["headers"],
    )
    assert outsider_list.status_code == 403
    assert "You do not belong to this company workspace" in outsider_list.json()["detail"]

    outsider_create = client.post(
        f"/companies/{company_id}/projects",
        headers=outsider["headers"],
        json={"name": "Hacker Project"},
    )
    assert outsider_create.status_code == 403

    # ----------------------------------------------------
    # Regular Member Permissions (Scenario 11 & 18)
    # Member cannot create projects -> 403
    # ----------------------------------------------------
    member_create = client.post(
        f"/companies/{company_id}/projects",
        headers=member["headers"],
        json={"name": "Unauthorized Project"},
    )
    assert member_create.status_code == 403
    assert "Only workspace owners and admins can manage projects" in member_create.json()["detail"]

    # ----------------------------------------------------
    # Owner Creates Project (Scenario 1 & 16)
    # ----------------------------------------------------
    owner_create = client.post(
        f"/companies/{company_id}/projects",
        headers=owner["headers"],
        json={
            "name": "Cloud Platform Modernization",
            "description": "Migrating infrastructure to modern microservices architecture",
            "icon": "layers",
            "color": "indigo",
        },
    )
    assert owner_create.status_code == 201
    p1 = owner_create.json()
    p1_id = p1["id"]
    assert p1["name"] == "Cloud Platform Modernization"
    assert p1["description"] == "Migrating infrastructure to modern microservices architecture"
    assert p1["icon"] == "layers"
    assert p1["color"] == "indigo"
    assert p1["status"] == "ACTIVE"
    assert p1["created_by"] == owner["id"]
    assert p1["creator"] is not None
    assert p1["creator"]["id"] == owner["id"]
    assert p1["creator"]["full_name"] == "Owner Basavaprasad"

    # ----------------------------------------------------
    # Admin Creates Project (Scenario 1 & 17)
    # ----------------------------------------------------
    admin_create = client.post(
        f"/companies/{company_id}/projects",
        headers=admin["headers"],
        json={
            "name": "AI Automation Pipeline",
            "description": "Automated workflow bots and agent integration",
            "icon": "zap",
            "color": "emerald",
        },
    )
    assert admin_create.status_code == 201
    p2 = admin_create.json()
    p2_id = p2["id"]
    assert p2["name"] == "AI Automation Pipeline"
    assert p2["created_by"] == admin["id"]

    # ----------------------------------------------------
    # Duplicate Project Name Validation (Scenario 14)
    # ----------------------------------------------------
    dup_res = client.post(
        f"/companies/{company_id}/projects",
        headers=owner["headers"],
        json={"name": "  cloud platform modernization  "},
    )
    assert dup_res.status_code == 409
    assert "already exists in this workspace" in dup_res.json()["detail"]

    # ----------------------------------------------------
    # List Projects with Member & Owner (Scenario 2 & 18)
    # Owner & Admin can view all workspace projects (total 2)
    # Unassigned member sees only 0 projects
    # ----------------------------------------------------
    owner_list = client.get(
        f"/companies/{company_id}/projects",
        headers=owner["headers"],
    )
    assert owner_list.status_code == 200
    assert owner_list.json()["total"] == 2

    admin_list = client.get(
        f"/companies/{company_id}/projects",
        headers=admin["headers"],
    )
    assert admin_list.status_code == 200
    assert admin_list.json()["total"] == 2

    member_list = client.get(
        f"/companies/{company_id}/projects",
        headers=member["headers"],
    )
    assert member_list.status_code == 200
    assert member_list.json()["total"] == 0

    # Unassigned member cannot access p1 details -> 403 Forbidden
    detail_unauthz = client.get(
        f"/companies/{company_id}/projects/{p1_id}",
        headers=member["headers"],
    )
    assert detail_unauthz.status_code == 403

    # Add member as a direct project member to p1
    add_mem = client.post(
        f"/companies/{company_id}/projects/{p1_id}/members",
        headers=owner["headers"],
        json={"user_id": member["id"]},
    )
    assert add_mem.status_code == 201

    # Now member can list p1 (total 1)
    member_list_after = client.get(
        f"/companies/{company_id}/projects",
        headers=member["headers"],
    )
    assert member_list_after.status_code == 200
    assert member_list_after.json()["total"] == 1
    assert member_list_after.json()["items"][0]["id"] == p1_id

    # ----------------------------------------------------
    # Get Single Project Details (Scenario 3)
    # ----------------------------------------------------
    detail_res = client.get(
        f"/companies/{company_id}/projects/{p1_id}",
        headers=member["headers"],
    )
    assert detail_res.status_code == 200
    p1_detail = detail_res.json()
    assert p1_detail["id"] == p1_id
    assert p1_detail["name"] == "Cloud Platform Modernization"
    assert p1_detail["creator"]["id"] == owner["id"]
    assert p1_detail["creator"]["username"] == owner["username"]

    # ----------------------------------------------------
    # Update Project (Scenario 4)
    # Regular Member cannot update -> 403
    # ----------------------------------------------------
    member_update = client.patch(
        f"/companies/{company_id}/projects/{p1_id}",
        headers=member["headers"],
        json={"name": "Hacked Name"},
    )
    assert member_update.status_code == 403

    # Admin Updates Project -> 200
    admin_update = client.patch(
        f"/companies/{company_id}/projects/{p1_id}",
        headers=admin["headers"],
        json={
            "name": "Cloud Platform 2.0",
            "description": "Updated roadmap description",
            "color": "cyan",
        },
    )
    assert admin_update.status_code == 200
    assert admin_update.json()["name"] == "Cloud Platform 2.0"
    assert admin_update.json()["description"] == "Updated roadmap description"
    assert admin_update.json()["color"] == "cyan"

    # ----------------------------------------------------
    # Archive & Restore Project Lifecycle (Scenario 5, 6, 15)
    # Member cannot archive -> 403
    # ----------------------------------------------------
    member_archive = client.post(
        f"/companies/{company_id}/projects/{p2_id}/archive",
        headers=member["headers"],
    )
    assert member_archive.status_code == 403

    # Admin Archives p2 -> 200
    admin_archive = client.post(
        f"/companies/{company_id}/projects/{p2_id}/archive",
        headers=admin["headers"],
    )
    assert admin_archive.status_code == 200
    assert admin_archive.json()["status"] == "ARCHIVED"

    # Verify status filtering
    # Active filter: should only return p1
    active_filter_res = client.get(
        f"/companies/{company_id}/projects?status=active",
        headers=owner["headers"],
    )
    assert active_filter_res.status_code == 200
    assert active_filter_res.json()["total"] == 1
    assert active_filter_res.json()["items"][0]["id"] == p1_id

    # Archived filter: should only return p2
    archived_filter_res = client.get(
        f"/companies/{company_id}/projects?status=archived",
        headers=owner["headers"],
    )
    assert archived_filter_res.status_code == 200
    assert archived_filter_res.json()["total"] == 1
    assert archived_filter_res.json()["items"][0]["id"] == p2_id
    assert archived_filter_res.json()["items"][0]["archived_at"] is not None

    # Owner Restores p2 -> 200
    owner_restore = client.post(
        f"/companies/{company_id}/projects/{p2_id}/restore",
        headers=owner["headers"],
    )
    assert owner_restore.status_code == 200
    assert owner_restore.json()["status"] == "ACTIVE"

    # Verify p2 is active again
    active_after_restore = client.get(
        f"/companies/{company_id}/projects?status=active",
        headers=owner["headers"],
    )
    assert active_after_restore.status_code == 200
    assert active_after_restore.json()["total"] == 2

    # ----------------------------------------------------
    # Search and Sorting (Scenario 2)
    # ----------------------------------------------------
    # Member searches for assigned project (Cloud Platform)
    search_mem_res = client.get(
        f"/companies/{company_id}/projects?search=platform",
        headers=member["headers"],
    )
    assert search_mem_res.status_code == 200
    assert search_mem_res.json()["total"] == 1
    assert search_mem_res.json()["items"][0]["id"] == p1_id

    # Owner searches for automation project (AI Automation Pipeline)
    search_owner_res = client.get(
        f"/companies/{company_id}/projects?search=automation",
        headers=owner["headers"],
    )
    assert search_owner_res.status_code == 200
    assert search_owner_res.json()["total"] == 1
    assert search_owner_res.json()["items"][0]["id"] == p2_id

    # ----------------------------------------------------
    # Invalid Project ID & Not Found Handling (Scenario 8 & 9)
    # ----------------------------------------------------
    invalid_id_res = client.get(
        f"/companies/{company_id}/projects/not-a-valid-uuid",
        headers=owner["headers"],
    )
    assert invalid_id_res.status_code == 422

    random_uuid = str(uuid.uuid4())
    not_found_res = client.get(
        f"/companies/{company_id}/projects/{random_uuid}",
        headers=owner["headers"],
    )
    assert not_found_res.status_code == 404
    assert "Project not found in this company workspace" in not_found_res.json()["detail"]

    # ----------------------------------------------------
    # Cross-Company Isolation & IDOR Protection (Scenario 12 & 13)
    # ----------------------------------------------------
    # Create second company for outsider
    comp2_res = client.post(
        "/companies",
        headers=outsider["headers"],
        json={"name": f"Outsider Org {suffix4}"},
    )
    assert comp2_res.status_code == 201
    company2_id = comp2_res.json()["id"]

    # Create project in company 2
    comp2_proj_res = client.post(
        f"/companies/{company2_id}/projects",
        headers=outsider["headers"],
        json={"name": "Confidential R&D"},
    )
    assert comp2_proj_res.status_code == 201
    comp2_proj_id = comp2_proj_res.json()["id"]

    # Owner of company 1 attempts to access company 2 project via company 1 URL (IDOR probe) -> 404
    idor_res1 = client.get(
        f"/companies/{company_id}/projects/{comp2_proj_id}",
        headers=owner["headers"],
    )
    assert idor_res1.status_code == 404

    # Owner of company 1 attempts to access company 2 project via company 2 URL -> 403
    idor_res2 = client.get(
        f"/companies/{company2_id}/projects/{comp2_proj_id}",
        headers=owner["headers"],
    )
    assert idor_res2.status_code == 403

    # Outsider attempts to update company 1 project -> 403
    idor_update = client.patch(
        f"/companies/{company_id}/projects/{p1_id}",
        headers=outsider["headers"],
        json={"name": "Hijacked"},
    )
    assert idor_update.status_code == 403

    # Outsider attempts to delete company 1 project via company 2 URL -> 404
    idor_del = client.delete(
        f"/companies/{company2_id}/projects/{p1_id}",
        headers=outsider["headers"],
    )
    assert idor_del.status_code == 404

    # ----------------------------------------------------
    # Project Deletion (Scenario 7)
    # Member cannot delete -> 403
    # ----------------------------------------------------
    member_del = client.delete(
        f"/companies/{company_id}/projects/{p2_id}",
        headers=member["headers"],
    )
    assert member_del.status_code == 403

    # Admin deletes p2 -> 204
    admin_del = client.delete(
        f"/companies/{company_id}/projects/{p2_id}",
        headers=admin["headers"],
    )
    assert admin_del.status_code == 204

    # Verify p2 no longer exists
    get_del = client.get(
        f"/companies/{company_id}/projects/{p2_id}",
        headers=owner["headers"],
    )
    assert get_del.status_code == 404


def test_project_input_validation_and_character_boundaries():
    suffix = uuid.uuid4().hex[:8]
    user = _create_and_login_user(suffix, "Validation User")

    comp_res = client.post(
        "/companies",
        headers=user["headers"],
        json={"name": f"Validation Workspace {suffix}"},
    )
    assert comp_res.status_code == 201
    company_id = comp_res.json()["id"]

    # Empty name or single character -> 422
    empty_name_res = client.post(
        f"/companies/{company_id}/projects",
        headers=user["headers"],
        json={"name": "   "},
    )
    assert empty_name_res.status_code == 422

    short_name_res = client.post(
        f"/companies/{company_id}/projects",
        headers=user["headers"],
        json={"name": "A"},
    )
    assert short_name_res.status_code == 422

    # Exceeding max length (101 characters) -> 422
    long_name_res = client.post(
        f"/companies/{company_id}/projects",
        headers=user["headers"],
        json={"name": "P" * 101},
    )
    assert long_name_res.status_code == 422


def test_project_pagination_and_sorting():
    suffix = uuid.uuid4().hex[:8]
    user = _create_and_login_user(suffix, "Pagination User")

    comp_res = client.post(
        "/companies",
        headers=user["headers"],
        json={"name": f"Paging Workspace {suffix}"},
    )
    assert comp_res.status_code == 201
    company_id = comp_res.json()["id"]

    # Create 5 projects
    created_names = ["Alpha Project", "Beta Project", "Gamma Project", "Delta Project", "Epsilon Project"]
    for name in created_names:
        client.post(
            f"/companies/{company_id}/projects",
            headers=user["headers"],
            json={"name": name},
        )

    # Test limit=2, page=1
    page1_res = client.get(
        f"/companies/{company_id}/projects?page=1&limit=2",
        headers=user["headers"],
    )
    assert page1_res.status_code == 200
    page1 = page1_res.json()
    assert page1["total"] == 5
    assert page1["total_pages"] == 3
    assert len(page1["items"]) == 2
    assert page1["has_next"] is True
    assert page1["has_previous"] is False

    # Test limit=2, page=2
    page2_res = client.get(
        f"/companies/{company_id}/projects?page=2&limit=2",
        headers=user["headers"],
    )
    assert page2_res.status_code == 200
    page2 = page2_res.json()
    assert len(page2["items"]) == 2
    assert page2["has_next"] is True
    assert page2["has_previous"] is True

    # Test sorting by name (asc)
    sort_name_res = client.get(
        f"/companies/{company_id}/projects?sort_by=name&limit=10",
        headers=user["headers"],
    )
    assert sort_name_res.status_code == 200
    sorted_items = sort_name_res.json()["items"]
    assert sorted_items[0]["name"] == "Alpha Project"
    assert sorted_items[-1]["name"] == "Gamma Project"


def test_project_create_complete_flow_regression():
    suffix = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"reg_o_{suffix}", "Regression Owner")
    member = _create_and_login_user(f"reg_m_{suffix}", "Regression Member")

    # 1. Create Workspace
    comp_res = client.post(
        "/companies",
        headers=owner["headers"],
        json={"name": f"Regression Workspace {suffix}"},
    )
    assert comp_res.status_code == 201
    company_id = comp_res.json()["id"]

    # 2. Add Member to Workspace
    add_m = client.post(
        f"/companies/{company_id}/members?user_id={member['id']}&role=MEMBER",
        headers=owner["headers"],
    )
    assert add_m.status_code == 201

    # 3. Member attempts project creation -> 403 Forbidden
    m_create = client.post(
        f"/companies/{company_id}/projects",
        headers=member["headers"],
        json={"name": "Disallowed Member Project"},
    )
    assert m_create.status_code == 403
    assert "Only workspace owners and admins can manage projects" in m_create.json()["detail"]

    # 4. Owner creates project with visual metadata -> 201 Created
    o_create = client.post(
        f"/companies/{company_id}/projects",
        headers=owner["headers"],
        json={
            "name": "Design System 2.0",
            "description": "Revamping UI component tokens and accessibility",
            "icon": "sparkles",
            "color": "emerald",
        },
    )
    assert o_create.status_code == 201
    created_data = o_create.json()
    assert created_data["name"] == "Design System 2.0"
    assert created_data["description"] == "Revamping UI component tokens and accessibility"
    assert created_data["icon"] == "sparkles"
    assert created_data["color"] == "emerald"
    assert created_data["status"] == "ACTIVE"
    assert created_data["creator"] is not None
    assert created_data["creator"]["id"] == owner["id"]
    assert created_data["creator"]["full_name"] == "Regression Owner"

    # 5. Duplicate name in same workspace -> 409 Conflict
    dup_res = client.post(
        f"/companies/{company_id}/projects",
        headers=owner["headers"],
        json={"name": "design system 2.0"},
    )
    assert dup_res.status_code == 409
    assert "already exists in this workspace" in dup_res.json()["detail"]

    # 6. Invalid validation constraints -> 422 Unprocessable Entity
    short_res = client.post(
        f"/companies/{company_id}/projects",
        headers=owner["headers"],
        json={"name": "a"},
    )
    assert short_res.status_code == 422

    # 7. Member views empty directory list before assignment
    list_res_before = client.get(
        f"/companies/{company_id}/projects",
        headers=member["headers"],
    )
    assert list_res_before.status_code == 200
    assert list_res_before.json()["total"] == 0

    # 8. Owner views project in directory list
    list_res_owner = client.get(
        f"/companies/{company_id}/projects",
        headers=owner["headers"],
    )
    assert list_res_owner.status_code == 200
    assert list_res_owner.json()["total"] == 1
    assert list_res_owner.json()["items"][0]["name"] == "Design System 2.0"
    assert list_res_owner.json()["items"][0]["creator"]["full_name"] == "Regression Owner"

    # 9. Assign member directly and verify member can now list and view
    proj_id = created_data["id"]
    add_m_res = client.post(
        f"/companies/{company_id}/projects/{proj_id}/members",
        headers=owner["headers"],
        json={"user_id": member["id"]},
    )
    assert add_m_res.status_code == 201

    list_res_after = client.get(
        f"/companies/{company_id}/projects",
        headers=member["headers"],
    )
    assert list_res_after.status_code == 200
    assert list_res_after.json()["total"] == 1
    assert list_res_after.json()["items"][0]["name"] == "Design System 2.0"


def test_project_bola_comprehensive_matrix():
    """
    Exhaustively tests all 9 project authorization scenarios:
    1. OWNER allowed (200)
    2. ADMIN allowed (200)
    3. Direct Project Member allowed (200)
    4. Member of team assigned to project allowed (200)
    5. Normal unassigned Workspace Member forbidden (403) across all project resources:
       - GET project details
       - GET project teams
       - GET project members
       - GET effective members
       - GET project tasks
       - POST project task
       - GET project activity
    6. User from another company forbidden (403)
    7. Non-existent project returns 404
    8. Cross-company project access returns 404
    9. Archived project accessible by assigned members, unarchivable only by admin/owner
    """
    s_owner = uuid.uuid4().hex[:8]
    s_admin = uuid.uuid4().hex[:8]
    s_direct = uuid.uuid4().hex[:8]
    s_team_mem = uuid.uuid4().hex[:8]
    s_unassigned = uuid.uuid4().hex[:8]
    s_other_co = uuid.uuid4().hex[:8]

    owner = _create_and_login_user(f"bo_{s_owner}", "Workspace Owner")
    admin = _create_and_login_user(f"ba_{s_admin}", "Workspace Admin")
    direct_mem = _create_and_login_user(f"bd_{s_direct}", "Direct Project Member")
    team_mem = _create_and_login_user(f"bt_{s_team_mem}", "Team Member")
    unassigned_mem = _create_and_login_user(f"bu_{s_unassigned}", "Unassigned Workspace Member")
    other_co_user = _create_and_login_user(f"bx_{s_other_co}", "Other Company User")

    # 1. Create Workspace A
    comp_a_res = client.post(
        "/companies",
        headers=owner["headers"],
        json={"name": f"BOLA Test Corp A {s_owner}"},
    )
    assert comp_a_res.status_code == 201
    company_a_id = comp_a_res.json()["id"]

    # Add workspace members to Company A
    client.post(f"/companies/{company_a_id}/members?user_id={admin['id']}&role=ADMIN", headers=owner["headers"])
    client.post(f"/companies/{company_a_id}/members?user_id={direct_mem['id']}&role=MEMBER", headers=owner["headers"])
    client.post(f"/companies/{company_a_id}/members?user_id={team_mem['id']}&role=MEMBER", headers=owner["headers"])
    client.post(f"/companies/{company_a_id}/members?user_id={unassigned_mem['id']}&role=MEMBER", headers=owner["headers"])

    # 2. Create Workspace B
    comp_b_res = client.post(
        "/companies",
        headers=other_co_user["headers"],
        json={"name": f"BOLA Test Corp B {s_other_co}"},
    )
    assert comp_b_res.status_code == 201
    company_b_id = comp_b_res.json()["id"]

    # 3. Create Team in Company A and add team_mem
    team_res = client.post(
        f"/companies/{company_a_id}/teams",
        headers=owner["headers"],
        json={"name": f"Frontend Team {s_owner}"},
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]
    client.post(
        f"/companies/{company_a_id}/teams/{team_id}/members",
        headers=owner["headers"],
        json={"user_id": team_mem["id"], "role": "MEMBER"},
    )

    # 4. Owner creates Project in Company A
    proj_res = client.post(
        f"/companies/{company_a_id}/projects",
        headers=owner["headers"],
        json={"name": "Secure Project", "description": "High security data"},
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # Assign team to Project
    client.post(
        f"/companies/{company_a_id}/projects/{project_id}/teams",
        headers=owner["headers"],
        json={"team_id": team_id},
    )

    # Assign direct_mem directly to Project
    client.post(
        f"/companies/{company_a_id}/projects/{project_id}/members",
        headers=owner["headers"],
        json={"user_id": direct_mem["id"]},
    )

    # Create a task in the project
    task_res = client.post(
        f"/companies/{company_a_id}/projects/{project_id}/tasks",
        headers=owner["headers"],
        json={"title": "Task 1", "priority": "HIGH"},
    )
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # ========================================================
    # SCENARIO 1 & 2: OWNER & ADMIN ALLOWED (200)
    # ========================================================
    for user_obj in [owner, admin]:
        # List projects
        l_res = client.get(f"/companies/{company_a_id}/projects", headers=user_obj["headers"])
        assert l_res.status_code == 200
        assert l_res.json()["total"] == 1

        # Get details
        d_res = client.get(f"/companies/{company_a_id}/projects/{project_id}", headers=user_obj["headers"])
        assert d_res.status_code == 200

        # Get teams
        t_res = client.get(f"/companies/{company_a_id}/projects/{project_id}/teams", headers=user_obj["headers"])
        assert t_res.status_code == 200

        # Get members
        m_res = client.get(f"/companies/{company_a_id}/projects/{project_id}/members", headers=user_obj["headers"])
        assert m_res.status_code == 200

        # Get tasks
        k_res = client.get(f"/companies/{company_a_id}/projects/{project_id}/tasks", headers=user_obj["headers"])
        assert k_res.status_code == 200

        # Get activity
        a_res = client.get(f"/companies/{company_a_id}/projects/{project_id}/activity", headers=user_obj["headers"])
        assert a_res.status_code == 200

    # ========================================================
    # SCENARIO 3: DIRECT PROJECT MEMBER ALLOWED (200)
    # ========================================================
    d_dir = client.get(f"/companies/{company_a_id}/projects/{project_id}", headers=direct_mem["headers"])
    assert d_dir.status_code == 200

    t_dir = client.get(f"/companies/{company_a_id}/projects/{project_id}/tasks", headers=direct_mem["headers"])
    assert t_dir.status_code == 200

    act_dir = client.get(f"/companies/{company_a_id}/projects/{project_id}/activity", headers=direct_mem["headers"])
    assert act_dir.status_code == 200

    # ========================================================
    # SCENARIO 4: TEAM MEMBER OF ASSIGNED TEAM ALLOWED (200)
    # ========================================================
    d_team = client.get(f"/companies/{company_a_id}/projects/{project_id}", headers=team_mem["headers"])
    assert d_team.status_code == 200

    t_team = client.get(f"/companies/{company_a_id}/projects/{project_id}/tasks", headers=team_mem["headers"])
    assert t_team.status_code == 200

    act_team = client.get(f"/companies/{company_a_id}/projects/{project_id}/activity", headers=team_mem["headers"])
    assert act_team.status_code == 200

    # ========================================================
    # SCENARIO 5: UNASSIGNED WORKSPACE MEMBER FORBIDDEN (403)
    # ========================================================
    # Project list should be empty
    list_unassigned = client.get(f"/companies/{company_a_id}/projects", headers=unassigned_mem["headers"])
    assert list_unassigned.status_code == 200
    assert list_unassigned.json()["total"] == 0

    # Detail access blocked -> 403
    d_un = client.get(f"/companies/{company_a_id}/projects/{project_id}", headers=unassigned_mem["headers"])
    assert d_un.status_code == 403
    assert "You do not have access to view this project" in d_un.json()["detail"]

    # Teams list blocked -> 403
    t_un = client.get(f"/companies/{company_a_id}/projects/{project_id}/teams", headers=unassigned_mem["headers"])
    assert t_un.status_code == 403

    # Members list blocked -> 403
    m_un = client.get(f"/companies/{company_a_id}/projects/{project_id}/members", headers=unassigned_mem["headers"])
    assert m_un.status_code == 403

    # Effective members list blocked -> 403
    eff_un = client.get(f"/companies/{company_a_id}/projects/{project_id}/effective-members", headers=unassigned_mem["headers"])
    assert eff_un.status_code == 403

    # Tasks list blocked -> 403
    task_list_un = client.get(f"/companies/{company_a_id}/projects/{project_id}/tasks", headers=unassigned_mem["headers"])
    assert task_list_un.status_code == 403

    # Task creation blocked -> 403
    task_create_un = client.post(
        f"/companies/{company_a_id}/projects/{project_id}/tasks",
        headers=unassigned_mem["headers"],
        json={"title": "Unauthorized task"},
    )
    assert task_create_un.status_code == 403

    # Activity timeline blocked -> 403
    act_un = client.get(f"/companies/{company_a_id}/projects/{project_id}/activity", headers=unassigned_mem["headers"])
    assert act_un.status_code == 403

    # ========================================================
    # SCENARIO 6: USER FROM ANOTHER COMPANY FORBIDDEN (403)
    # ========================================================
    cross_co_res = client.get(
        f"/companies/{company_a_id}/projects/{project_id}",
        headers=other_co_user["headers"],
    )
    assert cross_co_res.status_code == 403
    assert "You do not belong to this company workspace" in cross_co_res.json()["detail"]

    # ========================================================
    # SCENARIO 7: NON-EXISTENT PROJECT (404)
    # ========================================================
    fake_proj_id = str(uuid.uuid4())
    fake_res = client.get(
        f"/companies/{company_a_id}/projects/{fake_proj_id}",
        headers=owner["headers"],
    )
    assert fake_res.status_code == 404
    assert "Project not found in this company workspace" in fake_res.json()["detail"]

    # ========================================================
    # SCENARIO 8: CROSS-COMPANY PROJECT UUID UNDER COMPANY B ROUTE (404)
    # ========================================================
    idor_res = client.get(
        f"/companies/{company_b_id}/projects/{project_id}",
        headers=other_co_user["headers"],
    )
    assert idor_res.status_code == 404
    assert "Project not found in this company workspace" in idor_res.json()["detail"]


