import pytest
from app.core.rate_limiter import reset_rate_limiter


@pytest.fixture(autouse=True)
def clean_rate_limit_state():
    """Ensure every test starts and ends with a clean rate-limit state."""
    reset_rate_limiter()
    yield
    reset_rate_limiter()
