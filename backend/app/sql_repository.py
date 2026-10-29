"""DB에 저장하는 저장소. repository.py의 ApplicantRepository 약속을 그대로 지킵니다."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import DuplicateApplicationError
from app.models import Applicant
from app.repository import now_utc
from app.schemas import ApplicantCreate, ApplicantOut, ApplicantUpdate


class SqlApplicantRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _is_duplicate(self, phone: str, program: str, except_id: int | None = None) -> bool:
        query = select(Applicant.id).where(Applicant.phone == phone, Applicant.program == program)
        if except_id is not None:
            query = query.where(Applicant.id != except_id)
        return self._session.scalar(query) is not None

    def _commit(self) -> None:
        # 미리 확인했어도 동시에 두 요청이 오면 DB의 유일 조건에 걸릴 수 있어서 한 번 더 처리
        try:
            self._session.commit()
        except IntegrityError as error:
            self._session.rollback()
            raise DuplicateApplicationError() from error

    def list(self) -> list[ApplicantOut]:
        rows = self._session.scalars(
            select(Applicant).order_by(Applicant.created_at.desc(), Applicant.id.desc())
        )
        return [ApplicantOut.model_validate(row) for row in rows]

    def create(self, data: ApplicantCreate) -> ApplicantOut:
        if self._is_duplicate(data.phone, data.program):
            raise DuplicateApplicationError()
        now = now_utc()
        row = Applicant(
            name=data.name,
            phone=data.phone,
            program=data.program,
            attended=False,
            created_at=now,
            updated_at=now,
        )
        self._session.add(row)
        self._commit()
        self._session.refresh(row)
        return ApplicantOut.model_validate(row)

    def update(self, applicant_id: int, data: ApplicantUpdate) -> ApplicantOut | None:
        row = self._session.get(Applicant, applicant_id)
        if row is None:
            return None
        changes = data.changes()
        phone = str(changes.get("phone", row.phone))
        program = str(changes.get("program", row.program))
        if self._is_duplicate(phone, program, except_id=applicant_id):
            raise DuplicateApplicationError()
        for field, value in changes.items():
            setattr(row, field, value)
        row.updated_at = now_utc()
        self._commit()
        self._session.refresh(row)
        return ApplicantOut.model_validate(row)

    def delete(self, applicant_id: int) -> bool:
        row = self._session.get(Applicant, applicant_id)
        if row is None:
            return False
        self._session.delete(row)
        self._session.commit()
        return True
