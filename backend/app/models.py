"""DB 테이블 정의 (SQLAlchemy 2.0). docs/DATA_MODEL.md의 표와 똑같아야 합니다."""

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Program(Base):
    """프로그램 (v1.2). 프로그램 1개에 신청자 여러 명"""

    __tablename__ = "programs"
    __table_args__ = (UniqueConstraint("name", name="uq_programs_name"),)  # 이름 중복 불가

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(30), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    location: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = 제한 없음
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Applicant(Base):
    __tablename__ = "applicants"
    # 같은 연락처 + 같은 프로그램은 한 번만 (F-08)
    __table_args__ = (
        UniqueConstraint("phone", "program_id", name="uq_applicants_phone_program_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), nullable=False)
    phone: Mapped[str] = mapped_column(String(13), nullable=False)
    # 외래 키: programs.id에 있는 번호만 넣을 수 있음
    program_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("programs.id", name="fk_applicants_program_id"), nullable=False
    )
    attended: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
