import uuid
from datetime import datetime, timezone, timedelta
import pytest
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_and_login_user(suffix: str, full_name: str = "Test User"):
    email = f"task_user_{suffix}@example.com"
    username = f"task_user_{suffix}"
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


def test_tasks_complete_lifecycle_and_rbac():
    # 1. Setup users
    s_owner = uuid.uuid4().hex[:8]
    s_member = uuid.uuid4().hex[:8]
    s_team_member = uuid.uuid4().hex[:8]
    s_outsider = uuid.uuid4().hex[:8]
    s_comp_b_owner = uuid.uuid4().hex[:8]

    owner = _create_and_login_user(s_owner, "Owner Basavaprasad")
    member = _create_and_login_user(s_member, "Direct Member Rahul")
    team_member = _create_and_login_user(s_team_member, "Team Member Ananya")
    outsider = _create_and_login_user(s_outsider, "Workspace Outsider Suresh")
    comp_b_user = _create_and_login_user(s_comp_b_owner, "Other Company Owner Divya")

    # 2. Setup Company A and Company B
    comp_a_res = client.post(
        "/companies",
        headers=owner["headers"],
        json={"name": f"CollabHub Tasks Corp {s_owner}"},
    )
    assert comp_a_res.status_code == 201
    comp_a_id = comp_a_res.json()["id"]

    comp_b_res = client.post(
        "/companies",
        headers=comp_b_user["headers"],
        json={"name": f"Other Corp {s_comp_b_owner}"},
    )
    assert comp_b_res.status_code == 201
    comp_b_id = comp_b_res.json()["id"]

    # Add member, team_member, and outsider to Company A
    for u in [member, team_member, outsider]:
        add_m = client.post(
            f"/companies/{comp_a_id}/members?user_id={u['id']}&role=MEMBER",
            headers=owner["headers"],
        )
        assert add_m.status_code == 201

    # 3. Create Team in Company A and add team_member to that team
    team_res = client.post(
        f"/companies/{comp_a_id}/teams",
        headers=owner["headers"],
        json={"name": f"Engineering Core {s_owner}"},
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    add_tm = client.post(
        f"/companies/{comp_a_id}/teams/{team_id}/members",
        headers=owner["headers"],
        json={"user_id": team_member["id"], "role": "MEMBER"},
    )
    assert add_tm.status_code == 201

    # 4. Create Project in Company A
    proj_res = client.post(
        f"/companies/{comp_a_id}/projects",
        headers=owner["headers"],
        json={"name": f"Kanban Platform {s_owner}", "description": "Platform dev"},
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # 5. Assign Direct Member (Rahul) and Team (Engineering Core) to Project
    assign_dir = client.post(
        f"/companies/{comp_a_id}/projects/{proj_id}/members",
        headers=owner["headers"],
        json={"user_id": member["id"]},
    )
    assert assign_dir.status_code == 201

    assign_tm = client.post(
        f"/companies/{comp_a_id}/projects/{proj_id}/teams",
        headers=owner["headers"],
        json={"team_id": team_id},
    )
    assert assign_tm.status_code == 201

    # Outsider Suresh is in Company A, but NOT assigned to Project
    # Comp B User Divya is in Company B

    # 6. Test Task Creation:
    # A) Create task with no assignee
    task1_res = client.post(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": "Design Database Schema",
            "description": "PostgreSQL schema design for Kanban tasks",
            "priority": "HIGH",
            "status": "TODO",
        },
    )
    assert task1_res.status_code == 201
    task1 = task1_res.json()
    assert task1["title"] == "Design Database Schema"
    assert task1["status"] == "TODO"
    assert task1["priority"] == "HIGH"
    assert task1["assignee"] is None
    assert task1["creator"]["id"] == owner["id"]
    task1_id = task1["id"]

    # B) Create task with direct project member as assignee (Rahul)
    due = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    task2_res = client.post(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks",
        headers=member["headers"],
        json={
            "title": "Implement REST Endpoints",
            "description": "FastAPI routers and schemas",
            "priority": "URGENT",
            "status": "TODO",
            "assignee_id": member["id"],
            "due_date": due,
        },
    )
    assert task2_res.status_code == 201
    task2 = task2_res.json()
    assert task2["assignee"]["id"] == member["id"]
    assert task2["assignee"]["full_name"] == "Direct Member Rahul"
    assert task2["creator"]["id"] == member["id"]
    task2_id = task2["id"]

    # C) Create task with inherited team member as assignee (Ananya)
    task3_res = client.post(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": "Build Kanban UI Components",
            "priority": "MEDIUM",
            "status": "IN_PROGRESS",
            "assignee_id": team_member["id"],
        },
    )
    assert task3_res.status_code == 201
    task3 = task3_res.json()
    assert task3["assignee"]["id"] == team_member["id"]
    assert task3["assignee"]["full_name"] == "Team Member Ananya"
    assert task3["status"] == "IN_PROGRESS"
    task3_id = task3["id"]

    # D) Reject assignee outside project (Suresh is in company but not project member)
    rej_assignee = client.post(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": "Invalid Task Assignment",
            "assignee_id": outsider["id"],
        },
    )
    assert rej_assignee.status_code == 400
    assert "Assignee must be an assigned member" in rej_assignee.json()["detail"]

    # E) Reject assignee from another company (Divya)
    rej_cross_comp = client.post(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": "Cross Company Task Assignment",
            "assignee_id": comp_b_user["id"],
        },
    )
    assert rej_cross_comp.status_code == 400

    # 7. Test Non-Member & Unauthorized Access
    # A) Suresh (in company, but not in project) cannot create task
    suresh_create = client.post(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks",
        headers=outsider["headers"],
        json={"title": "Unauthorized Create"},
    )
    assert suresh_create.status_code == 403

    # B) Suresh cannot view tasks
    suresh_view = client.get(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks",
        headers=outsider["headers"],
    )
    assert suresh_view.status_code == 403

    # C) Divya (Company B) cannot view or access Company A tasks
    divya_view = client.get(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks",
        headers=comp_b_user["headers"],
    )
    assert divya_view.status_code == 403

    # 8. Test List Tasks & Filters
    list_all = client.get(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks",
        headers=member["headers"],
    )
    assert list_all.status_code == 200
    all_tasks = list_all.json()
    assert len(all_tasks) == 3

    # Filter by status = IN_PROGRESS
    list_inprogress = client.get(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks?status=IN_PROGRESS",
        headers=member["headers"],
    )
    assert list_inprogress.status_code == 200
    assert len(list_inprogress.json()) == 1
    assert list_inprogress.json()[0]["id"] == task3_id

    # Filter by priority = URGENT
    list_urgent = client.get(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks?priority=URGENT",
        headers=member["headers"],
    )
    assert list_urgent.status_code == 200
    assert len(list_urgent.json()) == 1
    assert list_urgent.json()[0]["id"] == task2_id

    # Filter by assignee = Rahul
    list_by_assignee = client.get(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks?assignee_id={member['id']}",
        headers=member["headers"],
    )
    assert list_by_assignee.status_code == 200
    assert len(list_by_assignee.json()) == 1
    assert list_by_assignee.json()[0]["id"] == task2_id

    # Search keyword
    list_search = client.get(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks?search=Database",
        headers=member["headers"],
    )
    assert list_search.status_code == 200
    assert len(list_search.json()) == 1
    assert list_search.json()[0]["id"] == task1_id

    # 9. Test Get Task Details
    get_t1 = client.get(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks/{task1_id}",
        headers=member["headers"],
    )
    assert get_t1.status_code == 200
    assert get_t1.json()["title"] == "Design Database Schema"

    # 10. Test Update Task (Title, Description, Priority, Assignee, Due Date)
    new_due = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    up_res = client.patch(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks/{task1_id}",
        headers=owner["headers"],
        json={
            "title": "Design Database Schema & Indexes",
            "priority": "URGENT",
            "assignee_id": member["id"],
            "due_date": new_due,
        },
    )
    assert up_res.status_code == 200
    updated_t1 = up_res.json()
    assert updated_t1["title"] == "Design Database Schema & Indexes"
    assert updated_t1["priority"] == "URGENT"
    assert updated_t1["assignee"]["id"] == member["id"]

    # 11. Test Kanban Status Movement across all states
    # TODO -> IN_PROGRESS
    move1 = client.patch(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks/{task1_id}/status",
        headers=member["headers"],
        json={"status": "IN_PROGRESS", "position": 1},
    )
    assert move1.status_code == 200
    assert move1.json()["status"] == "IN_PROGRESS"
    assert move1.json()["position"] == 1

    # IN_PROGRESS -> REVIEW
    move2 = client.patch(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks/{task1_id}/status",
        headers=member["headers"],
        json={"status": "REVIEW", "position": 0},
    )
    assert move2.status_code == 200
    assert move2.json()["status"] == "REVIEW"

    # REVIEW -> DONE
    move3 = client.patch(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks/{task1_id}/status",
        headers=member["headers"],
        json={"status": "DONE", "position": 0},
    )
    assert move3.status_code == 200
    assert move3.json()["status"] == "DONE"

    # 12. Test IDOR & Cross-Project Protection
    # Create Project 2 in Company A
    proj2_res = client.post(
        f"/companies/{comp_a_id}/projects",
        headers=owner["headers"],
        json={"name": f"Second Project {s_owner}"},
    )
    assert proj2_res.status_code == 201
    proj2_id = proj2_res.json()["id"]

    # Accessing task1 using proj2_id should return 404
    idor_get = client.get(
        f"/companies/{comp_a_id}/projects/{proj2_id}/tasks/{task1_id}",
        headers=owner["headers"],
    )
    assert idor_get.status_code == 404

    # Accessing task1 using comp_b_id should return 403 / 404
    idor_comp = client.get(
        f"/companies/{comp_b_id}/projects/{proj_id}/tasks/{task1_id}",
        headers=comp_b_user["headers"],
    )
    assert idor_comp.status_code in (403, 404)

    # 13. Test Delete Task
    del_res = client.delete(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks/{task3_id}",
        headers=owner["headers"],
    )
    assert del_res.status_code == 204

    # Confirm deletion
    get_deleted = client.get(
        f"/companies/{comp_a_id}/projects/{proj_id}/tasks/{task3_id}",
        headers=owner["headers"],
    )
    assert get_deleted.status_code == 404

    # 14. Test Cascade Delete when Project is deleted
    del_proj = client.delete(
        f"/companies/{comp_a_id}/projects/{proj_id}",
        headers=owner["headers"],
    )
    assert del_proj.status_code == 204

    # Verify tasks are deleted with project
    get_proj_deleted = client.get(
        f"/companies/{comp_a_id}/projects/{proj_id}",
        headers=owner["headers"],
    )
    assert get_proj_deleted.status_code == 404


def test_my_tasks_and_completion_flow():
    s = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"own_{s}", "Owner Basava")
    member = _create_and_login_user(f"mem_{s}", "Member Kailash")
    other_member = _create_and_login_user(f"oth_{s}", "Member Suresh")

    # 1. Create company
    comp_res = client.post("/companies", headers=owner["headers"], json={"name": f"Accountability Corp {s}"})
    assert comp_res.status_code == 201
    comp_id = comp_res.json()["id"]

    # 2. Add members to company
    client.post(
        f"/companies/{comp_id}/members?user_id={member['id']}&role=MEMBER",
        headers=owner["headers"],
    )
    client.post(
        f"/companies/{comp_id}/members?user_id={other_member['id']}&role=MEMBER",
        headers=owner["headers"],
    )

    # 3. Create project
    proj_res = client.post(
        f"/companies/{comp_id}/projects",
        headers=owner["headers"],
        json={"name": f"Accountability Proj {s}"},
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # Add member to project
    client.post(
        f"/companies/{comp_id}/projects/{proj_id}/members",
        headers=owner["headers"],
        json={"user_id": member["id"]},
    )
    client.post(
        f"/companies/{comp_id}/projects/{proj_id}/members",
        headers=owner["headers"],
        json={"user_id": other_member["id"]},
    )

    # 4. Create tasks assigned to member
    now = datetime.now(timezone.utc)
    due_today_str = now.isoformat()
    overdue_str = (now - timedelta(days=2)).isoformat()

    # Task 1: Due today, assigned to member
    t1_res = client.post(
        f"/companies/{comp_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": f"Task 1 Due Today {s}",
            "assignee_id": member["id"],
            "due_date": due_today_str,
            "status": "TODO",
        },
    )
    assert t1_res.status_code == 201
    t1_id = t1_res.json()["id"]

    # Task 2: Overdue, assigned to member
    t2_res = client.post(
        f"/companies/{comp_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": f"Task 2 Overdue {s}",
            "assignee_id": member["id"],
            "due_date": overdue_str,
            "status": "IN_PROGRESS",
        },
    )
    assert t2_res.status_code == 201
    t2_id = t2_res.json()["id"]

    # Task 3: Assigned to other_member
    t3_res = client.post(
        f"/companies/{comp_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": f"Task 3 Other Member {s}",
            "assignee_id": other_member["id"],
            "status": "TODO",
        },
    )
    assert t3_res.status_code == 201
    t3_id = t3_res.json()["id"]

    # 5. Test My Tasks listing
    my_tasks_res = client.get(f"/companies/{comp_id}/my-tasks", headers=member["headers"])
    assert my_tasks_res.status_code == 200
    my_tasks = my_tasks_res.json()
    assert len(my_tasks) == 2
    my_task_ids = {t["id"] for t in my_tasks}
    assert t1_id in my_task_ids
    assert t2_id in my_task_ids
    assert t3_id not in my_task_ids

    # 6. Test My Tasks summary KPI counts
    summary_res = client.get(f"/companies/{comp_id}/my-tasks/summary", headers=member["headers"])
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["assigned_to_me"] == 2
    assert summary["due_today"] == 1
    assert summary["overdue"] == 1
    assert summary["completed"] == 0

    # 7. Test unauthorized completion attempt: other_member tries to complete member's task
    unauth_complete = client.patch(
        f"/companies/{comp_id}/projects/{proj_id}/tasks/{t1_id}/complete",
        headers=other_member["headers"],
    )
    assert unauth_complete.status_code == 403

    # 8. Test assigned member explicitly completing task
    complete_res = client.patch(
        f"/companies/{comp_id}/projects/{proj_id}/tasks/{t1_id}/complete",
        headers=member["headers"],
    )
    assert complete_res.status_code == 200
    completed_task = complete_res.json()
    assert completed_task["status"] == "DONE"
    assert completed_task["completed_by_id"] == member["id"]
    assert completed_task["completed_at"] is not None
    assert completed_task["completed_by"]["full_name"] == "Member Kailash"

    # 9. Verify summary updates after completion
    summary_after = client.get(f"/companies/{comp_id}/my-tasks/summary", headers=member["headers"]).json()
    assert summary_after["assigned_to_me"] == 2
    assert summary_after["due_today"] == 0  # Task 1 is now completed so no longer counted in active due today
    assert summary_after["overdue"] == 1
    assert summary_after["completed"] == 1

    # 10. Test unassigned task does not appear in any user's My Tasks
    unassigned_res = client.post(
        f"/companies/{comp_id}/projects/{proj_id}/tasks",
        headers=owner["headers"],
        json={
            "title": f"Unassigned Task {s}",
            "assignee_id": None,
            "status": "TODO",
        },
    )
    assert unassigned_res.status_code == 201
    unassigned_id = unassigned_res.json()["id"]

    member_tasks_now = client.get(f"/companies/{comp_id}/my-tasks", headers=member["headers"]).json()
    assert unassigned_id not in {t["id"] for t in member_tasks_now}

    # 11. Test reassignment: Reassign Task 2 from member to other_member
    reassign_res = client.patch(
        f"/companies/{comp_id}/projects/{proj_id}/tasks/{t2_id}",
        headers=owner["headers"],
        json={"assignee_id": other_member["id"]},
    )
    assert reassign_res.status_code == 200
    assert reassign_res.json()["assignee_id"] == other_member["id"]

    # Member's My Tasks should no longer have Task 2
    member_tasks_after = client.get(f"/companies/{comp_id}/my-tasks", headers=member["headers"]).json()
    assert t2_id not in {t["id"] for t in member_tasks_after}

    # Other member's My Tasks should now have Task 2 (and Task 3)
    other_tasks = client.get(f"/companies/{comp_id}/my-tasks", headers=other_member["headers"]).json()
    other_task_ids = {t["id"] for t in other_tasks}
    assert t2_id in other_task_ids
    assert t3_id in other_task_ids

