import uuid
import pytest
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_and_login_user(suffix: str, full_name: str = "Test User"):
    email = f"chat_user_{suffix}@example.com"
    username = f"chat_user_{suffix}"
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


def test_team_chat_full_collaboration_and_security():
    s = uuid.uuid4().hex[:8]
    owner = _create_and_login_user(f"own_{s}", "Owner Basavaprasad")
    lead_team_a = _create_and_login_user(f"la_{s}", "Team Lead Kailash")
    member_team_a = _create_and_login_user(f"ma_{s}", "Team A Alice")
    member_team_b = _create_and_login_user(f"mb_{s}", "Team B Bob")
    outsider = _create_and_login_user(f"out_{s}", "Outsider Charlie")
    other_comp_user = _create_and_login_user(f"compb_{s}", "Other Comp Dave")

    # 1. Create Company A and Company B
    comp_a_res = client.post("/companies", headers=owner["headers"], json={"name": f"Chat Corp A {s}"})
    assert comp_a_res.status_code == 201
    comp_a_id = comp_a_res.json()["id"]

    comp_b_res = client.post("/companies", headers=other_comp_user["headers"], json={"name": f"Chat Corp B {s}"})
    assert comp_b_res.status_code == 201
    comp_b_id = comp_b_res.json()["id"]

    # 2. Add members to Company A
    for u in [lead_team_a, member_team_a, member_team_b, outsider]:
        add_m = client.post(f"/companies/{comp_a_id}/members?user_id={u['id']}&role=MEMBER", headers=owner["headers"])
        assert add_m.status_code == 201

    # 3. Create Team A and Team B in Company A
    team_a_res = client.post(f"/companies/{comp_a_id}/teams", headers=owner["headers"], json={"name": f"Backend Core {s}"})
    assert team_a_res.status_code == 201
    team_a_id = team_a_res.json()["id"]

    team_b_res = client.post(f"/companies/{comp_a_id}/teams", headers=owner["headers"], json={"name": f"Frontend UI {s}"})
    assert team_b_res.status_code == 201
    team_b_id = team_b_res.json()["id"]

    # 4. Add Lead and Member to Team A, and Member to Team B
    add_lead_a = client.post(f"/companies/{comp_a_id}/teams/{team_a_id}/members", headers=owner["headers"], json={"user_id": lead_team_a["id"], "role": "LEAD"})
    assert add_lead_a.status_code == 201

    add_tm_a = client.post(f"/companies/{comp_a_id}/teams/{team_a_id}/members", headers=owner["headers"], json={"user_id": member_team_a["id"], "role": "MEMBER"})
    assert add_tm_a.status_code == 201

    add_tm_b = client.post(f"/companies/{comp_a_id}/teams/{team_b_id}/members", headers=owner["headers"], json={"user_id": member_team_b["id"], "role": "MEMBER"})
    assert add_tm_b.status_code == 201

    # ============================================================
    # 5. POST MESSAGE & PRIVACY
    # ============================================================
    msg1_res = client.post(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages",
        headers=member_team_a["headers"],
        json={"message": "Authentication endpoint is deployed and ready.", "mentioned_user_ids": [lead_team_a["id"]]},
    )
    assert msg1_res.status_code == 201
    msg1 = msg1_res.json()
    assert msg1["message"] == "Authentication endpoint is deployed and ready."
    assert msg1["sender"]["full_name"] == "Team A Alice"
    assert len(msg1["mentions"]) == 1
    assert msg1["mentions"][0]["full_name"] == "Team Lead Kailash"
    msg1_id = msg1["id"]

    # Team B user tries to read Team A -> 403
    assert client.get(f"/companies/{comp_a_id}/teams/{team_a_id}/messages", headers=member_team_b["headers"]).status_code == 403
    # Team B user tries to post in Team A -> 403
    assert client.post(f"/companies/{comp_a_id}/teams/{team_a_id}/messages", headers=member_team_b["headers"], json={"message": "hack"}).status_code == 403
    # Cross company -> 404
    assert client.get(f"/companies/{comp_b_id}/teams/{team_a_id}/messages", headers=other_comp_user["headers"]).status_code == 404

    # ============================================================
    # 6. REPLY SYSTEM
    # ============================================================
    reply_res = client.post(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages",
        headers=lead_team_a["headers"],
        json={
            "message": "Thanks Alice! I will run the integration test suite now.",
            "reply_to_message_id": msg1_id,
        },
    )
    assert reply_res.status_code == 201
    reply_data = reply_res.json()
    assert reply_data["reply_to_message_id"] == msg1_id
    assert reply_data["reply_to"] is not None
    assert reply_data["reply_to"]["sender_name"] == "Team A Alice"
    assert "Authentication endpoint is deployed" in reply_data["reply_to"]["message_snippet"]
    reply_id = reply_data["id"]

    # Invalid parent reply (from non-existent or different team) -> 400
    fake_reply = client.post(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages",
        headers=lead_team_a["headers"],
        json={"message": "Test invalid parent", "reply_to_message_id": str(uuid.uuid4())},
    )
    assert fake_reply.status_code == 400

    # ============================================================
    # 7. MESSAGE EDITING
    # ============================================================
    edit_res = client.patch(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/{msg1_id}",
        headers=member_team_a["headers"],
        json={"message": "Authentication endpoint is deployed and validated with JWT."},
    )
    assert edit_res.status_code == 200
    edited_msg = edit_res.json()
    assert edited_msg["message"] == "Authentication endpoint is deployed and validated with JWT."
    assert edited_msg["edited_at"] is not None

    # Other member cannot edit Alice's message -> 403
    unauth_edit = client.patch(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/{msg1_id}",
        headers=lead_team_a["headers"],
        json={"message": "Malicious edit"},
    )
    assert unauth_edit.status_code == 403

    # ============================================================
    # 8. EMOJI REACTIONS
    # ============================================================
    # Alice reacts 👍
    r1 = client.post(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/{msg1_id}/reactions",
        headers=member_team_a["headers"],
        json={"emoji": "👍"},
    )
    assert r1.status_code == 200
    r1_data = r1.json()
    assert len(r1_data["reactions"]) == 1
    assert r1_data["reactions"][0]["emoji"] == "👍"
    assert r1_data["reactions"][0]["count"] == 1
    assert r1_data["reactions"][0]["has_reacted"] is True

    # Kailash also reacts 👍
    r2 = client.post(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/{msg1_id}/reactions",
        headers=lead_team_a["headers"],
        json={"emoji": "👍"},
    )
    assert r2.status_code == 200
    r2_data = r2.json()
    assert r2_data["reactions"][0]["count"] == 2

    # Kailash also reacts 🎉
    r3 = client.post(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/{msg1_id}/reactions",
        headers=lead_team_a["headers"],
        json={"emoji": "🎉"},
    )
    assert r3.status_code == 200
    r3_data = r3.json()
    assert len(r3_data["reactions"]) == 2

    # Kailash toggles 👍 again -> removes his 👍 reaction
    r4 = client.post(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/{msg1_id}/reactions",
        headers=lead_team_a["headers"],
        json={"emoji": "👍"},
    )
    assert r4.status_code == 200
    r4_data = r4.json()
    thumbs = [rx for rx in r4_data["reactions"] if rx["emoji"] == "👍"][0]
    assert thumbs["count"] == 1
    # When Kailash queries, has_reacted for thumbs is False, for party is True
    assert thumbs["has_reacted"] is False

    # ============================================================
    # 9. MESSAGE PINNING
    # ============================================================
    # Regular member cannot pin -> 403
    unauth_pin = client.post(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/{msg1_id}/pin",
        headers=member_team_a["headers"],
    )
    assert unauth_pin.status_code == 403

    # Team Lead pins message -> 200
    pin_res = client.post(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/{msg1_id}/pin",
        headers=lead_team_a["headers"],
    )
    assert pin_res.status_code == 200
    assert pin_res.json()["is_pinned"] is True
    assert pin_res.json()["pinned_by"]["full_name"] == "Team Lead Kailash"

    # List pinned messages
    pinned_list = client.get(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/pinned",
        headers=member_team_a["headers"],
    )
    assert pinned_list.status_code == 200
    pinned_items = pinned_list.json()
    assert len(pinned_items) == 1
    assert pinned_items[0]["id"] == msg1_id

    # ============================================================
    # 10. SCOPED SEARCH
    # ============================================================
    search_res = client.get(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/search?q=JWT",
        headers=member_team_a["headers"],
    )
    assert search_res.status_code == 200
    search_items = search_res.json()["messages"]
    assert len(search_items) == 1
    assert search_items[0]["id"] == msg1_id

    search_empty = client.get(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/search?q=NonexistentQueryPhrase",
        headers=member_team_a["headers"],
    )
    assert search_empty.status_code == 200
    assert len(search_empty.json()["messages"]) == 0

    # ============================================================
    # 11. READ TRACKING & UNREAD COUNTS
    # ============================================================
    # Kailash marks team A as read
    read_res = client.post(
        f"/companies/{comp_a_id}/team-chat/{team_a_id}/read",
        headers=lead_team_a["headers"],
        json={"message_id": reply_id},
    )
    assert read_res.status_code == 200
    assert read_res.json()["unread_count"] == 0

    # Alice posts a new message
    msg3_res = client.post(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages",
        headers=member_team_a["headers"],
        json={"message": "New test announcement for unread count!"},
    )
    assert msg3_res.status_code == 201
    msg3_id = msg3_res.json()["id"]

    # Kailash checks unread counts -> should see 1 unread in Team A
    unreads_res = client.get(
        f"/companies/{comp_a_id}/team-chat/unread-counts",
        headers=lead_team_a["headers"],
    )
    assert unreads_res.status_code == 200
    unreads = unreads_res.json()
    team_a_unread = [u for u in unreads if u["team_id"] == team_a_id]
    assert len(team_a_unread) == 1
    assert team_a_unread[0]["unread_count"] == 1

    # Kailash marks as read again
    client.post(
        f"/companies/{comp_a_id}/team-chat/{team_a_id}/read",
        headers=lead_team_a["headers"],
    )
    unreads_after = client.get(
        f"/companies/{comp_a_id}/team-chat/unread-counts",
        headers=lead_team_a["headers"],
    ).json()
    team_a_unread_after = [u for u in unreads_after if u["team_id"] == team_a_id][0]
    assert team_a_unread_after["unread_count"] == 0

    # ============================================================
    # 12. SOFT DELETION
    # ============================================================
    del_res = client.delete(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages/{msg3_id}",
        headers=member_team_a["headers"],
    )
    assert del_res.status_code == 204

    # List messages shows deleted message with placeholder and deleted_at set
    all_msgs = client.get(
        f"/companies/{comp_a_id}/teams/{team_a_id}/messages",
        headers=lead_team_a["headers"],
    ).json()["messages"]
    deleted_item = [m for m in all_msgs if m["id"] == msg3_id][0]
    assert deleted_item["deleted_at"] is not None
    assert deleted_item["message"] == "This message was deleted"
