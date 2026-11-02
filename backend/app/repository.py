"""저장소(Repository): 데이터를 어디에, 어떻게 저장할지 담당합니다.

- ApplicantRepository: 저장소가 지켜야 할 "약속"(메서드 목록)
- MemoryApplicantRepository: 파이썬 리스트에 저장 (서버를 끄면 사라짐, 테스트용)
- SQL 저장소는 sql_repository.py에 있고, 같은 약속을 지킵니다.

라우터는 이 약속만 알고 실제 저장 방식은 모릅니다. 그래서 저장 방식을 바꿔도 라우터는 그대로입니다.

업무 규칙(정원, 중복, 삭제 제한)도 저장소가 지킵니다. 두 저장소가 같은 규칙을 쓰도록
공통 검사 함수는 이 파일 아래쪽에 모아 두었습니다.
"""

from datetime import UTC, date, datetime
from typing import Protocol

from app.errors import (
    CapacityTooSmallError,
    DuplicateApplicationError,
    DuplicateProgramError,
    InvalidPeriodError,
    InvalidProgramError,
    ProgramFullError,
    ProgramInUseError,
)
from app.schemas import (
    ApplicantCreate,
    ApplicantOut,
    ApplicantUpdate,
    ProgramCreate,
    ProgramOut,
    ProgramUpdate,
)


class ApplicantRepository(Protocol):
    # ----- 프로그램 (v1.2) -----
    def list_programs(self) -> list[ProgramOut]:
        """전체 프로그램, 만든 순서. applicant_count 포함"""
        ...

    def create_program(self, data: ProgramCreate) -> ProgramOut:
        """추가. 같은 이름이 있으면 DuplicateProgramError"""
        ...

    def update_program(self, program_id: int, data: ProgramUpdate) -> ProgramOut | None:
        """수정. 없는 id면 None. 이름 중복·정원 부족·기간 오류는 예외"""
        ...

    def delete_program(self, program_id: int) -> bool:
        """삭제. 없는 id면 False, 신청자가 있으면 ProgramInUseError"""
        ...

    # ----- 신청자 -----
    def list(self) -> list[ApplicantOut]:
        """전체 명단, 최신 신청순"""
        ...

    def create(self, data: ApplicantCreate) -> ApplicantOut:
        """등록. 없는 프로그램·중복·정원 초과는 예외"""
        ...

    def update(self, applicant_id: int, data: ApplicantUpdate) -> ApplicantOut | None:
        """수정. 없는 id면 None. 수정 결과가 중복이거나 정원 초과면 예외"""
        ...

    def delete(self, applicant_id: int) -> bool:
        """삭제. 없는 id면 False"""
        ...


def now_utc() -> datetime:
    return datetime.now(UTC)


# ---------- 두 저장소가 함께 쓰는 규칙 검사 ----------


def ensure_seat(program: ProgramOut) -> None:
    """정원이 있고 이미 가득 찼으면 ProgramFullError"""
    if program.capacity is not None and program.applicant_count >= program.capacity:
        raise ProgramFullError(program.capacity)


def ensure_capacity_fits(capacity: int | None, applicant_count: int) -> None:
    """정원을 지금 신청자 수보다 적게 줄이면 CapacityTooSmallError"""
    if capacity is not None and capacity < applicant_count:
        raise CapacityTooSmallError(applicant_count)


def ensure_period(start: date | None, end: date | None) -> None:
    """수정 후 값 기준으로 종료일이 시작일보다 빠르면 InvalidPeriodError"""
    if start is not None and end is not None and end < start:
        raise InvalidPeriodError()


# ---------- 메모리 저장소 ----------


class MemoryApplicantRepository:
    """리스트에 저장하는 저장소"""

    def __init__(self) -> None:
        self._programs: list[ProgramOut] = []  # applicant_count는 꺼낼 때 계산
        self._items: list[ApplicantOut] = []
        self._next_program_id = 1
        self._next_id = 1

    # ----- 내부 도우미 -----
    def _count(self, program_id: int) -> int:
        return sum(1 for a in self._items if a.program_id == program_id)

    def _program(self, program_id: int) -> ProgramOut | None:
        for p in self._programs:
            if p.id == program_id:
                return p.model_copy(update={"applicant_count": self._count(p.id)})
        return None

    def _name_taken(self, name: str, except_id: int | None = None) -> bool:
        return any(p.name == name and p.id != except_id for p in self._programs)

    def _is_duplicate(self, phone: str, program_id: int, except_id: int | None = None) -> bool:
        return any(
            a.phone == phone and a.program_id == program_id and a.id != except_id
            for a in self._items
        )

    # ----- 프로그램 -----
    def list_programs(self) -> list[ProgramOut]:
        return [
            p.model_copy(update={"applicant_count": self._count(p.id)})
            for p in sorted(self._programs, key=lambda p: p.id)
        ]

    def create_program(self, data: ProgramCreate) -> ProgramOut:
        if self._name_taken(data.name):
            raise DuplicateProgramError()
        program = ProgramOut(id=self._next_program_id, applicant_count=0, **data.model_dump())
        self._programs.append(program)
        self._next_program_id += 1
        return program

    def update_program(self, program_id: int, data: ProgramUpdate) -> ProgramOut | None:
        current = self._program(program_id)
        if current is None:
            return None
        updated = current.model_copy(update=data.changes())
        if self._name_taken(updated.name, except_id=program_id):
            raise DuplicateProgramError()
        ensure_period(updated.start_date, updated.end_date)
        ensure_capacity_fits(updated.capacity, current.applicant_count)
        self._programs = [updated if p.id == program_id else p for p in self._programs]
        return updated

    def delete_program(self, program_id: int) -> bool:
        if self._program(program_id) is None:
            return False
        if self._count(program_id) > 0:
            raise ProgramInUseError()
        self._programs = [p for p in self._programs if p.id != program_id]
        return True

    # ----- 신청자 -----
    def list(self) -> list[ApplicantOut]:
        # 신청일이 늦은 순, 같으면 id가 큰 순
        return sorted(self._items, key=lambda a: (a.created_at, a.id), reverse=True)

    def create(self, data: ApplicantCreate) -> ApplicantOut:
        program = self._program(data.program_id)
        if program is None:
            raise InvalidProgramError()
        if self._is_duplicate(data.phone, data.program_id):
            raise DuplicateApplicationError()
        ensure_seat(program)
        now = now_utc()
        applicant = ApplicantOut(
            id=self._next_id,
            name=data.name,
            phone=data.phone,
            program_id=data.program_id,
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
            moving = updated.program_id != item.program_id
            target = self._program(updated.program_id)
            if moving and target is None:
                raise InvalidProgramError()
            if self._is_duplicate(updated.phone, updated.program_id, except_id=applicant_id):
                raise DuplicateApplicationError()
            if moving and target is not None:
                ensure_seat(target)  # 다른 프로그램으로 옮길 때만 정원 확인
            self._items[index] = updated
            return updated
        return None

    def delete(self, applicant_id: int) -> bool:
        before = len(self._items)
        self._items = [item for item in self._items if item.id != applicant_id]
        return len(self._items) < before
