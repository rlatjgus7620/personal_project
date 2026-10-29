"""DB 연결(엔진)과 세션 만들기."""

from collections.abc import Iterator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings


def make_engine(url: str) -> Engine:
    if url.startswith("sqlite"):
        # SQLite는 FastAPI가 여러 스레드에서 쓸 수 있게 이 옵션이 필요
        return create_engine(url, connect_args={"check_same_thread": False})
    # pool_pre_ping: Neon처럼 쉬다가 끊긴 연결을 자동으로 다시 맺음
    return create_engine(url, pool_pre_ping=True)


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """요청마다 세션을 열고, 응답이 끝나면 닫음"""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
