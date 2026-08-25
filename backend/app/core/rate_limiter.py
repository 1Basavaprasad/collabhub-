import math
import threading
import time
from collections.abc import Callable

from fastapi import HTTPException, Request, status

from app.core.config import settings


def get_client_ip(request: Request) -> str:
    """
    Extracts the client IP safely.
    If the direct connection request.client.host is in TRUSTED_PROXIES,
    we inspect X-Forwarded-For or X-Real-IP headers.
    Otherwise, we use request.client.host directly to prevent header spoofing attacks.
    """
    client_host = request.client.host if request.client else "127.0.0.1"

    trusted_proxies = set(settings.TRUSTED_PROXIES)
    if client_host in trusted_proxies:
        # Check X-Forwarded-For header
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # First IP in the comma-separated list is the client IP
            ips = [ip.strip() for ip in forwarded_for.split(",") if ip.strip()]
            if ips:
                return ips[0]

        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip and real_ip.strip():
            return real_ip.strip()

    return client_host


class InMemoryRateLimiter:
    """
    Thread-safe, sliding-window in-memory rate limiter.
    Maintains a timestamp history for each key with automatic expiration
    and bounded memory management to prevent memory leaks.
    """

    def __init__(self, cleanup_interval_seconds: float = 300.0, max_keys: int = 50000) -> None:
        self._lock = threading.Lock()
        self._storage: dict[str, list[float]] = {}
        self._cleanup_interval = cleanup_interval_seconds
        self._last_cleanup = time.time()
        self._max_keys = max_keys

    def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, int]:
        """
        Checks if the given key is allowed under the sliding window limit.
        Returns:
            (is_allowed: bool, retry_after_seconds: int)
        """
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            # Perform periodic cleanup if interval elapsed or too many keys
            if now - self._last_cleanup > self._cleanup_interval or len(self._storage) > self._max_keys:
                self._cleanup_stale_keys(now)

            # Retrieve existing timestamps for key and filter expired
            timestamps = self._storage.get(key, [])
            valid_timestamps = [t for t in timestamps if t > window_start]

            if len(valid_timestamps) >= max_requests:
                # Rate limit exceeded: calculate retry_after as seconds until oldest timestamp expires
                oldest_timestamp = valid_timestamps[0]
                retry_after = max(1, math.ceil(oldest_timestamp + window_seconds - now))
                self._storage[key] = valid_timestamps
                return False, retry_after

            # Record this request
            valid_timestamps.append(now)
            self._storage[key] = valid_timestamps
            return True, 0

    def _cleanup_stale_keys(self, now: float) -> None:
        """Removes expired entries across the entire store to prevent unbounded memory growth."""
        self._last_cleanup = now
        keys_to_remove = []
        max_window = 3600.0  # Max retention window (1 hour)
        cutoff = now - max_window

        for key, timestamps in self._storage.items():
            valid = [t for t in timestamps if t > cutoff]
            if not valid:
                keys_to_remove.append(key)
            else:
                self._storage[key] = valid

        for key in keys_to_remove:
            del self._storage[key]

    def reset(self) -> None:
        """Clears all rate limit state. Essential for clean test isolation."""
        with self._lock:
            self._storage.clear()
            self._last_cleanup = time.time()


# Global singleton in-memory rate limiter
rate_limiter = InMemoryRateLimiter()


def reset_rate_limiter() -> None:
    """Convenience helper to reset the global rate limiter."""
    rate_limiter.reset()


def create_rate_limit_dependency(
    resource_name: str,
    get_max_requests: Callable[[], int],
    get_window_seconds: Callable[[], int],
):
    """
    Creates a FastAPI dependency that enforces rate limiting for a specific route.
    """

    def rate_limit_dependency(request: Request) -> None:
        if not settings.RATE_LIMITING_ENABLED:
            return

        max_requests = get_max_requests()
        window_seconds = get_window_seconds()
        client_ip = get_client_ip(request)
        key = f"{resource_name}:{client_ip}"

        is_allowed, retry_after = rate_limiter.check_rate_limit(
            key=key,
            max_requests=max_requests,
            window_seconds=window_seconds,
        )

        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )

    return rate_limit_dependency


# Pre-configured route rate limit dependencies
rate_limit_login = create_rate_limit_dependency(
    "auth:login",
    lambda: settings.RATE_LIMIT_LOGIN_MAX_REQUESTS,
    lambda: settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
)

rate_limit_register = create_rate_limit_dependency(
    "auth:register",
    lambda: settings.RATE_LIMIT_REGISTER_MAX_REQUESTS,
    lambda: settings.RATE_LIMIT_REGISTER_WINDOW_SECONDS,
)

rate_limit_forgot_password = create_rate_limit_dependency(
    "auth:forgot_password",
    lambda: settings.RATE_LIMIT_FORGOT_PASSWORD_MAX_REQUESTS,
    lambda: settings.RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS,
)

rate_limit_reset_password = create_rate_limit_dependency(
    "auth:reset_password",
    lambda: settings.RATE_LIMIT_RESET_PASSWORD_MAX_REQUESTS,
    lambda: settings.RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS,
)

rate_limit_invitation_verify = create_rate_limit_dependency(
    "invitation:verify",
    lambda: settings.RATE_LIMIT_INVITATION_VERIFY_MAX_REQUESTS,
    lambda: settings.RATE_LIMIT_INVITATION_VERIFY_WINDOW_SECONDS,
)
