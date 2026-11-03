"""programs.completion_rate (v2.1)

프로그램마다 수료 기준 출석률(%)을 정하는 칸을 추가합니다. 기존 프로그램은 80%로 채웁니다.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("programs") as batch:
        batch.add_column(
            sa.Column("completion_rate", sa.Integer(), nullable=False, server_default="80")
        )


def downgrade() -> None:
    with op.batch_alter_table("programs") as batch:
        batch.drop_column("completion_rate")
