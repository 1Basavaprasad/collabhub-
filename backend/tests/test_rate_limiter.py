import time
import uuid
from collections.abc import Generator

from starlette.testclient import TestClient

from app.core.config import settings
from app.core.rate_limiter import InMemoryRateLimiter, reset_rate_limiter
from app.main import app

client = TestClient(app)


def test_login_under_and_exceeding_rate_limit():
    """
    TEST 1 & TEST 2:
    - Login attempts under the limit succeed (or return 401 for wrong credentials).
    - Login attempts exceeding the limit return 429 Too Many Requests with Retry-After.
    """
    reset_rate_limiter()
    ip = "198.51.100.10"
    headers = {"X-Forwarded-For": ip}

    limit = settings.RATE_LIMIT_LOGIN_MAX_REQUESTS  # default 5

    # Attempts under limit
    for _ in range(limit):
        res = client.post(
            "/auth/login",
            json={"email": "nobody@example.com", "password": "wrongpassword"},
            headers=headers,
        )
        assert res.status_code == 401, f"Expected 401 under limit, got {res.status_code}"

    # Exceeding attempt
    blocked_res = client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": "wrongpassword"},
        headers=headers,
    )
    assert blocked_res.status_code == 429
    assert blocked_res.json()["detail"] == "Too many requests. Please try again later."
    assert "retry-after" in blocked_res.headers
    assert int(blocked_res.headers["retry-after"]) > 0


def test_register_under_and_exceeding_rate_limit():
    """
    TEST 3 & TEST 4:
    - Register requests under the limit return 201/409.
    - Register requests exceeding the limit return 429.
    """
    reset_rate_limiter()
    ip = "198.51.100.20"
    headers = {"X-Forwarded-For": ip}

    limit = settings.RATE_LIMIT_REGISTER_MAX_REQUESTS  # default 5

    for _ in range(limit):
        suffix = uuid.uuid4().hex[:6]
        res = client.post(
            "/auth/register",
            json={
                "email": f"ratetest_{suffix}@example.com",
                "username": f"ratetest_{suffix}",
                "full_name": "Rate Limit User",
                "password": "Password123!",
            },
            headers=headers,
        )
        assert res.status_code == 201

    # Next attempt exceeds limit
    blocked_res = client.post(
        "/auth/register",
        json={
            "email": "blocked@example.com",
            "username": "blocked_user",
            "full_name": "Blocked User",
            "password": "Password123!",
        },
        headers=headers,
    )
    assert blocked_res.status_code == 429
    assert blocked_res.json()["detail"] == "Too many requests. Please try again later."


def test_forgot_password_under_and_exceeding_rate_limit():
    """
    TEST 5 & TEST 6:
    - Forgot password requests under the limit return uniform generic message.
    - Exceeding limit returns 429 without leaking email existence or tokens.
    """
    reset_rate_limiter()
    ip = "198.51.100.30"
    headers = {"X-Forwarded-For": ip}

    limit = settings.RATE_LIMIT_FORGOT_PASSWORD_MAX_REQUESTS  # default 3

    for _ in range(limit):
        res = client.post(
            "/auth/forgot-password",
            json={"email": "target@example.com"},
            headers=headers,
        )
        assert res.status_code == 200
        assert "password reset link has been sent" in res.json()["message"]

    # Exceeded
    blocked_res = client.post(
        "/auth/forgot-password",
        json={"email": "target@example.com"},
        headers=headers,
    )
    assert blocked_res.status_code == 429
    assert blocked_res.json()["detail"] == "Too many requests. Please try again later."
    assert "token" not in blocked_res.text


def test_reset_password_exceeds_rate_limit():
    """
    TEST 7:
    - Reset password requests exceeding the limit return 429.
    """
    reset_rate_limiter()
    ip = "198.51.100.40"
    headers = {"X-Forwarded-For": ip}

    limit = settings.RATE_LIMIT_RESET_PASSWORD_MAX_REQUESTS  # default 5

    for _ in range(limit):
        res = client.post(
            "/auth/reset-password",
            json={"token": "invalid-token", "new_password": "NewPassword123!"},
            headers=headers,
        )
        assert res.status_code == 400

    # Exceeded
    blocked_res = client.post(
        "/auth/reset-password",
        json={"token": "invalid-token", "new_password": "NewPassword123!"},
        headers=headers,
    )
    assert blocked_res.status_code == 429
    assert blocked_res.json()["detail"] == "Too many requests. Please try again later."


def test_invitation_verify_exceeds_rate_limit():
    """
    TEST 8:
    - Public invitation verification endpoint exceeds configured rate limit -> 429.
    """
    reset_rate_limiter()
    ip = "198.51.100.50"
    headers = {"X-Forwarded-For": ip}

    limit = settings.RATE_LIMIT_INVITATION_VERIFY_MAX_REQUESTS  # default 20

    for _ in range(limit):
        res = client.get(
            "/companies/invitations/verify/invalid-test-token",
            headers=headers,
        )
        assert res.status_code in (400, 404)

    # Exceeded
    blocked_res = client.get(
        "/companies/invitations/verify/invalid-test-token",
        headers=headers,
    )
    assert blocked_res.status_code == 429
    assert blocked_res.json()["detail"] == "Too many requests. Please try again later."


def test_different_ips_have_independent_rate_limit_quotas():
    """
    TEST 9:
    - Client A exhausts limit and gets 429.
    - Client B from a different IP makes requests and succeeds without interference.
    """
    reset_rate_limiter()
    ip_a = "203.0.113.1"
    ip_b = "203.0.113.2"

    limit = settings.RATE_LIMIT_LOGIN_MAX_REQUESTS  # 5

    # Exhaust Client A
    for _ in range(limit):
        client.post(
            "/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
            headers={"X-Forwarded-For": ip_a},
        )

    # Client A is blocked
    res_a = client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
        headers={"X-Forwarded-For": ip_a},
    )
    assert res_a.status_code == 429

    # Client B is NOT blocked
    res_b = client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
        headers={"X-Forwarded-For": ip_b},
    )
    assert res_b.status_code == 401  # Normal auth rejection, not 429


def test_rate_limit_sliding_window_expiration():
    """
    TEST 10:
    - Rate limit window expires and allows new requests.
    """
    limiter = InMemoryRateLimiter()
    key = "test_key"
    max_reqs = 3
    window = 1  # 1 second window

    for _ in range(max_reqs):
        allowed, retry_after = limiter.check_rate_limit(key, max_reqs, window)
        assert allowed is True

    # Immediate next request is blocked
    allowed, retry_after = limiter.check_rate_limit(key, max_reqs, window)
    assert allowed is False
    assert retry_after >= 1

    # Wait for window to expire
    time.sleep(1.1)

    # Now allowed again
    allowed, retry_after = limiter.check_rate_limit(key, max_reqs, window)
    assert allowed is True


def test_429_response_does_not_expose_internal_details_or_secrets():
    """
    TEST 11:
    - Ensure 429 response body contains only standard user-facing error message
      and no tracebacks, SQL statements, or secrets.
    """
    reset_rate_limiter()
    ip = "198.51.100.99"
    headers = {"X-Forwarded-For": ip}

    for _ in range(settings.RATE_LIMIT_LOGIN_MAX_REQUESTS + 1):
        res = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "secret_password"},
            headers=headers,
        )

    assert res.status_code == 429
    body = res.json()
    assert body == {"detail": "Too many requests. Please try again later."}
    assert "secret_password" not in res.text
    assert "Traceback" not in res.text
    assert "SELECT" not in res.text


def test_rate_limiter_thread_safety_under_concurrency():
    """
    TEST 12:
    - Verify thread safety of rate limiter when multiple threads submit requests concurrently.
    """
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    limiter = InMemoryRateLimiter()
    key = "concurrent_key"
    max_reqs = 10
    window = 60
    num_threads = 20

    barrier = Barrier(num_threads)

    def worker():
        barrier.wait()
        return limiter.check_rate_limit(key, max_reqs, window)

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(worker) for _ in range(num_threads)]
        results = [f.result() for f in futures]

    allowed_count = sum(1 for allowed, _ in results if allowed)
    blocked_count = sum(1 for allowed, _ in results if not allowed)

    assert allowed_count == max_reqs
    assert blocked_count == num_threads - max_reqs
