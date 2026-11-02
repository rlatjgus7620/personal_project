"""REPO-01 ~ REPO-11 시나리오.

메모리 저장소(test_repository.py)와 SQL 저장소(test_sql_repository.py)가
똑같은 시나리오를 통과해야 "라우터가 차이를 모른다"고 말할 수 있습니다.
"""

import time

import pytest

from app.errors import (
    CapacityTooSmallError,
    DuplicateApplicationError,
    DuplicateProgramError,
    InvalidProgramError,
    ProgramFullError,
    ProgramInUseError,
)
from app.repository import ApplicantRepository
from app.schemas import ApplicantCreate, ApplicantUpdate, ProgramCreate, ProgramUpdate


def program(repo: ApplicantRepository, name: str = "이력서 클리닉", capacity: int | None = None) -> int:
    """테스트용 프로그램을 만들고 번호를 돌려줌"""
    return repo.create_program(ProgramCreate(name=name, capacity=capacity)).id


def make(program_id: int, name: str = "김테스트", phone: str = "010-1234-5678") -> ApplicantCreate:
    return ApplicantCreate(name=name, phone=phone, program_id=program_id)


def repo_01_등록하면_최신순으로_조회된다(repo: ApplicantRepository) -> None:
    pid = program(repo)
    first = repo.create(make(pid, "김테스트", "010-1111-1111"))
    time.sleep(0.01)  # 신청 시각이 확실히 다르게
    second = repo.create(make(pid, "이테스트", "010-2222-2222"))
    result = repo.list()
    assert [a.id for a in result] == [second.id, first.id]
    assert result[0].attended is False
    assert result[0].program_id == pid


def repo_02_참석으로_바꾸면_updated_at이_갱신된다(repo: ApplicantRepository) -> None:
    created = repo.create(make(program(repo)))
    time.sleep(0.01)
    updated = repo.update(created.id, ApplicantUpdate(attended=True))
    assert updated is not None
    assert updated.attended is True
    assert updated.updated_at > created.updated_at


def repo_03_삭제하면_목록에서_사라진다(repo: ApplicantRepository) -> None:
    created = repo.create(make(program(repo)))
    assert repo.delete(created.id) is True
    assert repo.list() == []


def repo_04_없는_id는_None과_False를_돌려준다(repo: ApplicantRepository) -> None:
    assert repo.update(999, ApplicantUpdate(attended=True)) is None
    assert repo.delete(999) is False
    assert repo.update_program(999, ProgramUpdate(capacity=5)) is None
    assert repo.delete_program(999) is False


def repo_05_같은_연락처와_프로그램은_중복_에러(repo: ApplicantRepository) -> None:
    pid = program(repo)
    repo.create(make(pid, phone="010-1234-5678"))
    with pytest.raises(DuplicateApplicationError):
        repo.create(make(pid, name="다른이름", phone="010-1234-5678"))
    # 수정으로 중복을 만들어도 에러
    other = repo.create(make(pid, phone="010-9999-9999"))
    with pytest.raises(DuplicateApplicationError):
        repo.update(other.id, ApplicantUpdate(phone="010-1234-5678"))


def repo_06_프로그램_추가_목록_수정_이름_중복(repo: ApplicantRepository) -> None:
    a = program(repo, "모의면접")
    b = program(repo, "취업 특강")
    assert [p.id for p in repo.list_programs()] == [a, b]
    updated = repo.update_program(a, ProgramUpdate(location="3층", capacity=10))
    assert updated is not None
    assert (updated.location, updated.capacity) == ("3층", 10)
    with pytest.raises(DuplicateProgramError):
        program(repo, "모의면접")
    with pytest.raises(DuplicateProgramError):
        repo.update_program(b, ProgramUpdate(name="모의면접"))


def repo_07_정원이_차면_등록과_이동을_막는다(repo: ApplicantRepository) -> None:
    full = program(repo, "모의면접", capacity=2)
    other = program(repo, "취업 특강")
    repo.create(make(full, phone="010-1111-1111"))
    second = repo.create(make(full, phone="010-2222-2222"))
    with pytest.raises(ProgramFullError):
        repo.create(make(full, phone="010-3333-3333"))
    mover = repo.create(make(other, phone="010-4444-4444"))
    with pytest.raises(ProgramFullError):
        repo.update(mover.id, ApplicantUpdate(program_id=full))
    # 같은 프로그램 안에서 이름만 바꾸는 건 정원과 상관없음
    assert repo.update(second.id, ApplicantUpdate(name="이수정")) is not None


def repo_08_정원을_신청자보다_적게_줄일_수_없다(repo: ApplicantRepository) -> None:
    pid = program(repo, capacity=5)
    repo.create(make(pid, phone="010-1111-1111"))
    repo.create(make(pid, phone="010-2222-2222"))
    with pytest.raises(CapacityTooSmallError):
        repo.update_program(pid, ProgramUpdate(capacity=1))
    assert repo.update_program(pid, ProgramUpdate(capacity=2)) is not None
    cleared = repo.update_program(pid, ProgramUpdate(capacity=None))
    assert cleared is not None and cleared.capacity is None


def repo_09_신청자가_있는_프로그램은_삭제할_수_없다(repo: ApplicantRepository) -> None:
    used = program(repo, "모의면접")
    empty = program(repo, "취업 특강")
    repo.create(make(used))
    with pytest.raises(ProgramInUseError):
        repo.delete_program(used)
    assert repo.delete_program(empty) is True
    assert [p.id for p in repo.list_programs()] == [used]


def repo_10_없는_프로그램으로_신청하면_에러(repo: ApplicantRepository) -> None:
    with pytest.raises(InvalidProgramError):
        repo.create(make(999))
    created = repo.create(make(program(repo)))
    with pytest.raises(InvalidProgramError):
        repo.update(created.id, ApplicantUpdate(program_id=999))


def repo_11_프로그램_신청자_수를_센다(repo: ApplicantRepository) -> None:
    a = program(repo, "모의면접")
    b = program(repo, "취업 특강")
    repo.create(make(a, phone="010-1111-1111"))
    repo.create(make(a, phone="010-2222-2222"))
    counts = {p.id: p.applicant_count for p in repo.list_programs()}
    assert counts == {a: 2, b: 0}


ALL_SCENARIOS = [
    repo_01_등록하면_최신순으로_조회된다,
    repo_02_참석으로_바꾸면_updated_at이_갱신된다,
    repo_03_삭제하면_목록에서_사라진다,
    repo_04_없는_id는_None과_False를_돌려준다,
    repo_05_같은_연락처와_프로그램은_중복_에러,
    repo_06_프로그램_추가_목록_수정_이름_중복,
    repo_07_정원이_차면_등록과_이동을_막는다,
    repo_08_정원을_신청자보다_적게_줄일_수_없다,
    repo_09_신청자가_있는_프로그램은_삭제할_수_없다,
    repo_10_없는_프로그램으로_신청하면_에러,
    repo_11_프로그램_신청자_수를_센다,
]
