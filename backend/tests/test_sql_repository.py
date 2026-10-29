"""REPO-01 ~ REPO-05: SQL 저장소. 실행: uv run pytest -m db

DATABASE_URL_TEST(비어 있으면 backend/test.db SQLite 파일)에 연결합니다.
테스트마다 테이블을 새로 만들어서 깨끗한 상태에서 시작합니다.
"""

from collections.abc import Callable, Iterator

import pytest
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import make_engine
from app.models import Base
from app.repository import ApplicantRepository
from app.sql_repository import SqlApplicantRepository
from tests.repo_scenarios import ALL_SCENARIOS

pytestmark = pytest.mark.db


@pytest.fixture
def session() -> Iterator[Session]:
    engine = make_engine(get_settings().database_url_test)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as db_session:
        yield db_session
    engine.dispose()


@pytest.mark.parametrize("scenario", ALL_SCENARIOS, ids=lambda f: f.__name__)
def test_SQL_저장소(scenario: Callable[[ApplicantRepository], None], session: Session) -> None:
    scenario(SqlApplicantRepository(session))
