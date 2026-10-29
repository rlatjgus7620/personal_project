"""테스트 공통 준비물(fixture).

client: 테스트마다 새 메모리 저장소를 끼운 가짜 브라우저.
        실제 DB를 건드리지 않고, 서버를 띄우지 않아도 API를 호출할 수 있습니다.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.deps import get_repo
from app.main import app
from app.repository import MemoryApplicantRepository


@pytest.fixture
def client() -> Iterator[TestClient]:
    repo = MemoryApplicantRepository()
    app.dependency_overrides[get_repo] = lambda: repo
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
