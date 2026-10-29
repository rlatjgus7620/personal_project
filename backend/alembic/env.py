"""Alembic 실행 설정. DB 주소는 app/config.py에서, 테이블 모양은 app/models.py에서 가져옵니다.

테스트 DB에 적용하고 싶을 때(PowerShell):
    $env:ALEMBIC_TARGET="test"; uv run alembic upgrade head; Remove-Item Env:ALEMBIC_TARGET
"""

import os
from logging.config import fileConfig

from sqlalchemy import create_engine, pool

from alembic import context
from app.config import get_settings
from app.models import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

settings = get_settings()
DB_URL = settings.database_url_test if os.getenv("ALEMBIC_TARGET") == "test" else settings.database_url


def run_migrations_offline() -> None:
    context.configure(url=DB_URL, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(DB_URL, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # SQLite는 ALTER TABLE이 약해서 "새 표를 만들어 옮기기" 방식을 씀
            render_as_batch=connection.dialect.name == "sqlite",
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
