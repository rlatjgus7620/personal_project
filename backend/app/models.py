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


class Session(Base):
    """회차 (v1.3). 프로그램 1개에 회차 여러 개"""

    __tablename__ = "sessions"
    # 한 프로그램에 같은 날짜 회차는 하나만
    __table_args__ = (
        UniqueConstraint("program_id", "session_date", name="uq_sessions_program_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    program_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("programs.id", name="fk_sessions_program_id"), nullable=False
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Attendance(Base):
    """출석 기록 (v1.3). 줄이 있으면 출석. 회차 × 신청자 = 다대다"""

    __tablename__ = "attendances"

    # 두 칸을 합쳐서 기본 키 → 같은 회차에 같은 사람은 한 번만
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sessions.id", name="fk_attendances_session_id"), primary_key=True
    )
    applicant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applicants.id", name="fk_attendances_applicant_id"), primary_key=True
    )
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
