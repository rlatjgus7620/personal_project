"""테스트 공통 준비물(fixture).

client: 테스트마다 새 메모리 저장소를 끼우고, 테스트용 비밀번호로 미리 로그인한 가짜 브라우저 (v2.0)
        실제 DB를 건드리지 않고, 서버를 띄우지 않아도 API를 호출할 수 있습니다.
anon:   같은 서버에 로그인하지 않은 가짜 브라우저 (401 확인용)
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.auth import get_login_limiter
from app.config import Settings, get_settings
from app.deps import get_repo
from app.main import app
from app.repository import MemoryApplicantRepository
from app.security import LoginLimiter

# 테스트 전용 가짜 값 (실제 비밀번호 아님)
TEST_PASSWORD = "test-password-1234"
TEST_SECRET = "test-secret"


def make_test_settings(password: str = TEST_PASSWORD) -> Settings:
    return Settings(admin_password=password, auth_secret=TEST_SECRET, token_hours=12)


@pytest.fixture
def server() -> Iterator[None]:
    """메모리 저장소 + 테스트용 설정 + 새 로그인 시도 제한기를 끼움"""
    repo = MemoryApplicantRepository()
    limiter = LoginLimiter()
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_settings] = lambda: make_test_settings()
    app.dependency_overrides[get_login_limiter] = lambda: limiter
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def anon(server: None) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def client(server: None) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        response = test_client.post("/api/auth/login", json={"password": TEST_PASSWORD})
        assert response.status_code == 200, response.text
        test_client.headers["Authorization"] = f"Bearer {response.json()['token']}"
        yield test_client
