"""저장소(Repository): 데이터를 어디에, 어떻게 저장할지 담당합니다.

- ApplicantRepository: 저장소가 지켜야 할 "약속"(메서드 목록)
- MemoryApplicantRepository: 파이썬 리스트에 저장 (서버를 끄면 사라짐, 테스트용)
- SQL 저장소는 sql_repository.py에 있고, 같은 약속을 지킵니다.

라우터는 이 약속만 알고 실제 저장 방식은 모릅니다. 그래서 저장 방식을 바꿔도 라우터는 그대로입니다.
"""

from datetime import UTC, datetime
from typing import Protocol

from app.errors import DuplicateApplicationError
from app.schemas import ApplicantCreate, ApplicantOut, ApplicantUpdate


class ApplicantRepository(Protocol):
    def list(self) -> list[ApplicantOut]:
        """전체 명단, 최신 신청순"""
        ...

    def create(self, data: ApplicantCreate) -> ApplicantOut:
        """등록. 같은 연락처+프로그램이 있으면 DuplicateApplicationError"""
        ...

    def update(self, applicant_id: int, data: ApplicantUpdate) -> ApplicantOut | None:
        """수정. 없는 id면 None. 수정 결과가 중복이면 DuplicateApplicationError"""
        ...

    def delete(self, applicant_id: int) -> bool:
        """삭제. 없는 id면 False"""
        ...


def now_utc() -> datetime:
    return datetime.now(UTC)


class MemoryApplicantRepository:
    """리스트에 저장하는 저장소"""

    def __init__(self) -> None:
        self._items: list[ApplicantOut] = []
        self._next_id = 1

    def _is_duplicate(self, phone: str, program: str, except_id: int | None = None) -> bool:
        return any(
            item.phone == phone and item.program == program and item.id != except_id
            for item in self._items
        )

    def list(self) -> list[ApplicantOut]:
        # 신청일이 늦은 순, 같으면 id가 큰 순
        return sorted(self._items, key=lambda a: (a.created_at, a.id), reverse=True)

    def create(self, data: ApplicantCreate) -> ApplicantOut:
        if self._is_duplicate(data.phone, data.program):
            raise DuplicateApplicationError()
        now = now_utc()
        applicant = ApplicantOut(
            id=self._next_id,
            name=data.name,
            phone=data.phone,
            program=data.program,
            attended=False,
            created_at=now,
            updated_at=now,
        )
        self._items.append(applicant)
        self._next_id += 1
        return applicant

    def update(self, applicant_id: int, data: ApplicantUpdate) -> ApplicantOut | None:
        for index, item in enumerate(self._items):
            if item.id != applicant_id:
                continue
            updated = item.model_copy(update={**data.changes(), "updated_at": now_utc()})
            if self._is_duplicate(updated.phone, updated.program, except_id=applicant_id):
                raise DuplicateApplicationError()
            self._items[index] = updated
            return updated
        return None

    def delete(self, applicant_id: int) -> bool:
        before = len(self._items)
        self._items = [item for item in self._items if item.id != applicant_id]
        return len(self._items) < before
