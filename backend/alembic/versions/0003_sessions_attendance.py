"""sessions and attendances tables (v1.3)

회차별 출석을 위한 테이블 두 개를 만듭니다. 기존 데이터는 그대로입니다.
1) sessions: 프로그램의 회차(날짜). 한 프로그램에 같은 날짜는 하나만
2) attendances: 출석 기록. (회차, 신청자) 한 쌍이 한 줄, 줄이 있으면 출석

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("program_id", sa.Integer(), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("note", sa.String(length=30), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["program_id"], ["programs.id"], name="fk_sessions_program_id"),
        sa.UniqueConstraint("program_id", "session_date", name="uq_sessions_program_date"),
    )
    op.create_table(
        "attendances",
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("applicant_id", sa.Integer(), nullable=False),
        sa.Column(
            "checked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("session_id", "applicant_id", name="pk_attendances"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], name="fk_attendances_session_id"),
        sa.ForeignKeyConstraint(
            ["applicant_id"], ["applicants.id"], name="fk_attendances_applicant_id"
        ),
    )


def downgrade() -> None:
    # 출석 기록이 회차를 가리키므로 출석부터 지움
    op.drop_table("attendances")
    op.drop_table("sessions")
