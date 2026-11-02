"""DB에 저장하는 저장소. repository.py의 ApplicantRepository 약속을 그대로 지킵니다."""

from datetime import date
from typing import cast

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import (
    DuplicateApplicationError,
    DuplicateProgramError,
    InvalidProgramError,
    ProgramInUseError,
)
from app.models import Applicant, Program
from app.repository import ensure_capacity_fits, ensure_period, ensure_seat, now_utc
from app.schemas import (
    ApplicantCreate,
    ApplicantOut,
    ApplicantUpdate,
    ProgramCreate,
    ProgramOut,
    ProgramUpdate,
)


class SqlApplicantRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    # ----- 내부 도우미 -----
    def _count(self, program_id: int) -> int:
        query = select(func.count()).select_from(Applicant).where(Applicant.program_id == program_id)
        return int(self._session.scalar(query) or 0)

    def _program_out(self, row: Program) -> ProgramOut:
        return ProgramOut(
            id=row.id,
            name=row.name,
            start_date=row.start_date,
            end_date=row.end_date,
            location=row.location,
            capacity=row.capacity,
            applicant_count=self._count(row.id),
        )

    def _name_taken(self, name: str, except_id: int | None = None) -> bool:
        query = select(Program.id).where(Program.name == name)
        if except_id is not None:
            query = query.where(Program.id != except_id)
        return self._session.scalar(query) is not None

    def _is_duplicate(self, phone: str, program_id: int, except_id: int | None = None) -> bool:
        query = select(Applicant.id).where(
            Applicant.phone == phone, Applicant.program_id == program_id
        )
        if except_id is not None:
            query = query.where(Applicant.id != except_id)
        return self._session.scalar(query) is not None

    def _commit(self, error: Exception) -> None:
        # 미리 확인했어도 동시에 두 요청이 오면 DB의 유일 조건에 걸릴 수 있어서 한 번 더 처리
        try:
            self._session.commit()
        except IntegrityError as integrity_error:
            self._session.rollback()
            raise error from integrity_error

    # ----- 프로그램 -----
    def list_programs(self) -> list[ProgramOut]:
        rows = self._session.scalars(select(Program).order_by(Program.id))
        return [self._program_out(row) for row in rows]

    def create_program(self, data: ProgramCreate) -> ProgramOut:
        if self._name_taken(data.name):
            raise DuplicateProgramError()
        row = Program(**data.model_dump(), created_at=now_utc())
        self._session.add(row)
        self._commit(DuplicateProgramError())
        self._session.refresh(row)
        return self._program_out(row)

    def update_program(self, program_id: int, data: ProgramUpdate) -> ProgramOut | None:
        row = self._session.get(Program, program_id)
        if row is None:
            return None
        changes = data.changes()
        name = str(changes.get("name", row.name))
        if self._name_taken(name, except_id=program_id):
            raise DuplicateProgramError()
        # 보낸 항목은 새 값, 안 보낸 항목은 지금 값으로 규칙 확인
        start = cast(date | None, changes.get("start_date", row.start_date))
        end = cast(date | None, changes.get("end_date", row.end_date))
        ensure_period(start, end)
        capacity = cast(int | None, changes.get("capacity", row.capacity))
        ensure_capacity_fits(capacity, self._count(program_id))
        for field, value in changes.items():
            setattr(row, field, value)
        self._commit(DuplicateProgramError())
        self._session.refresh(row)
        return self._program_out(row)

    def delete_program(self, program_id: int) -> bool:
        row = self._session.get(Program, program_id)
        if row is None:
            return False
        if self._count(program_id) > 0:
            raise ProgramInUseError()
        self._session.delete(row)
        self._commit(ProgramInUseError())
        return True

    # ----- 신청자 -----
    def list(self) -> list[ApplicantOut]:
        rows = self._session.scalars(
            select(Applicant).order_by(Applicant.created_at.desc(), Applicant.id.desc())
        )
        return [ApplicantOut.model_validate(row) for row in rows]

    def create(self, data: ApplicantCreate) -> ApplicantOut:
        program = self._session.get(Program, data.program_id)
        if program is None:
            raise InvalidProgramError()
        if self._is_duplicate(data.phone, data.program_id):
            raise DuplicateApplicationError()
        ensure_seat(self._program_out(program))
        now = now_utc()
        row = Applicant(
            name=data.name,
            phone=data.phone,
            program_id=data.program_id,
            attended=False,
            created_at=now,
            updated_at=now,
        )
        self._session.add(row)
        self._commit(DuplicateApplicationError())
        self._session.refresh(row)
        return ApplicantOut.model_validate(row)

    def update(self, applicant_id: int, data: ApplicantUpdate) -> ApplicantOut | None:
        row = self._session.get(Applicant, applicant_id)
        if row is None:
            return None
        changes = data.changes()
        phone = str(changes.get("phone", row.phone))
        program_id = cast(int, changes.get("program_id", row.program_id))
        moving = program_id != row.program_id
        target = self._session.get(Program, program_id) if moving else None
        if moving and target is None:
            raise InvalidProgramError()
        if self._is_duplicate(phone, program_id, except_id=applicant_id):
            raise DuplicateApplicationError()
        if target is not None:
            ensure_seat(self._program_out(target))  # 다른 프로그램으로 옮길 때만 정원 확인
        for field, value in changes.items():
            setattr(row, field, value)
        row.updated_at = now_utc()
        self._commit(DuplicateApplicationError())
        self._session.refresh(row)
        return ApplicantOut.model_validate(row)

    def delete(self, applicant_id: int) -> bool:
        row = self._session.get(Applicant, applicant_id)
        if row is None:
            return False
        self._session.delete(row)
        self._session.commit()
        return True
