"""create applicants

applicants 테이블을 만듭니다. docs/DATA_MODEL.md의 표와 한 줄씩 대조해 보세요.

Revision ID: 0001
Revises:
Create Date: 2026-10-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "applicants",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=20), nullable=False),
        sa.Column("phone", sa.String(length=13), nullable=False),
        sa.Column("program", sa.String(length=30), nullable=False),
        sa.Column("attended", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("phone", "program", name="uq_applicants_phone_program"),
    )


def downgrade() -> None:
    op.drop_table("applicants")
