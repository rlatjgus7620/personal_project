"""programs table (v1.2)

프로그램을 코드(문자열)에서 별도 테이블로 옮깁니다. 하는 일:
1) programs 테이블을 만들고, 기존 프로그램 4개를 넣는다
2) applicants에 program_id 칸을 추가하고, 기존 program 코드로 번호를 채운다
3) program 칸을 지우고, program_id를 필수 + 외래 키 + (phone, program_id) 유일 조건으로 바꾼다

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# v1.1까지 쓰던 코드 → 프로그램 이름
DEFAULT_PROGRAMS = [
    ("job_search", "구직활동 프로그램"),
    ("resume_clinic", "이력서 클리닉"),
    ("mock_interview", "모의면접"),
    ("career_lecture", "취업 특강"),
]


def upgrade() -> None:
    # 1) programs 테이블 + 기본 프로그램 4개
    programs = op.create_table(
        "programs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=30), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("location", sa.String(length=50), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("name", name="uq_programs_name"),
    )
    # 번호(id)는 DB가 자동으로 정하게 두고, 이름으로 연결함 (Postgres 자동 번호가 꼬이지 않게)
    op.bulk_insert(programs, [{"name": name} for _, name in DEFAULT_PROGRAMS])

    # 2) program_id 칸 추가 (우선 비어 있어도 되게) → 기존 코드로 번호 채우기
    with op.batch_alter_table("applicants") as batch:
        batch.add_column(sa.Column("program_id", sa.Integer(), nullable=True))

    applicants = sa.table(
        "applicants", sa.column("program", sa.String()), sa.column("program_id", sa.Integer())
    )
    programs_t = sa.table("programs", sa.column("id", sa.Integer()), sa.column("name", sa.String()))
    for code, name in DEFAULT_PROGRAMS:
        program_id = sa.select(programs_t.c.id).where(programs_t.c.name == name).scalar_subquery()
        op.execute(
            applicants.update().where(applicants.c.program == code).values(program_id=program_id)
        )

    # 3) 옛 칸·조건 정리, 새 조건 걸기
    with op.batch_alter_table("applicants") as batch:
        batch.drop_constraint("uq_applicants_phone_program", type_="unique")
        batch.drop_column("program")
        batch.alter_column("program_id", existing_type=sa.Integer(), nullable=False)
        batch.create_unique_constraint("uq_applicants_phone_program_id", ["phone", "program_id"])
        batch.create_foreign_key(
            "fk_applicants_program_id", "programs", ["program_id"], ["id"]
        )


def downgrade() -> None:
    # 되돌리기: program 코드 칸을 다시 만들고 이름으로 코드를 채움 (기본 4개 이외 프로그램의 신청자는 지워짐)
    with op.batch_alter_table("applicants") as batch:
        batch.add_column(sa.Column("program", sa.String(length=30), nullable=True))

    applicants = sa.table(
        "applicants", sa.column("program", sa.String()), sa.column("program_id", sa.Integer())
    )
    programs_t = sa.table("programs", sa.column("id", sa.Integer()), sa.column("name", sa.String()))
    for code, name in DEFAULT_PROGRAMS:
        ids = sa.select(programs_t.c.id).where(programs_t.c.name == name)
        op.execute(applicants.update().where(applicants.c.program_id.in_(ids)).values(program=code))
    op.execute(applicants.delete().where(applicants.c.program.is_(None)))

    with op.batch_alter_table("applicants") as batch:
        batch.drop_constraint("fk_applicants_program_id", type_="foreignkey")
        batch.drop_constraint("uq_applicants_phone_program_id", type_="unique")
        batch.drop_column("program_id")
        batch.alter_column("program", existing_type=sa.String(length=30), nullable=False)
        batch.create_unique_constraint("uq_applicants_phone_program", ["phone", "program"])
    op.drop_table("programs")
