"""DB 테이블 정의 (SQLAlchemy 2.0). docs/DATA_MODEL.md의 표와 똑같아야 합니다."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, UniqueConstraint, false, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Applicant(Base):
    __tablename__ = "applicants"
    # 같은 연락처 + 같은 프로그램은 한 번만 (F-08)
    __table_args__ = (UniqueConstraint("phone", "program", name="uq_applicants_phone_program"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), nullable=False)
    phone: Mapped[str] = mapped_column(String(13), nullable=False)
    program: Mapped[str] = mapped_column(String(30), nullable=False)
    attended: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
