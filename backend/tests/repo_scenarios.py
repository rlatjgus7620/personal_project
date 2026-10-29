"""REPO-01 ~ REPO-05 시나리오.

메모리 저장소(test_repository.py)와 SQL 저장소(test_sql_repository.py)가
똑같은 시나리오를 통과해야 "라우터가 차이를 모른다"고 말할 수 있습니다.
"""

import time

import pytest

from app.errors import DuplicateApplicationError
from app.repository import ApplicantRepository
from app.schemas import ApplicantCreate, ApplicantUpdate


def make(name: str = "김테스트", phone: str = "010-1234-5678", program: str = "resume_clinic") -> ApplicantCreate:
    return ApplicantCreate(name=name, phone=phone, program=program)


def repo_01_등록하면_최신순으로_조회된다(repo: ApplicantRepository) -> None:
    first = repo.create(make("김테스트", "010-1111-1111"))
    time.sleep(0.01)  # 신청 시각이 확실히 다르게
    second = repo.create(make("이테스트", "010-2222-2222"))
    result = repo.list()
    assert [a.id for a in result] == [second.id, first.id]
    assert result[0].attended is False


def repo_02_참석으로_바꾸면_updated_at이_갱신된다(repo: ApplicantRepository) -> None:
    created = repo.create(make())
    time.sleep(0.01)
    updated = repo.update(created.id, ApplicantUpdate(attended=True))
    assert updated is not None
    assert updated.attended is True
    assert updated.updated_at > created.updated_at


def repo_03_삭제하면_목록에서_사라진다(repo: ApplicantRepository) -> None:
    created = repo.create(make())
    assert repo.delete(created.id) is True
    assert repo.list() == []


def repo_04_없는_id는_None과_False를_돌려준다(repo: ApplicantRepository) -> None:
    assert repo.update(999, ApplicantUpdate(attended=True)) is None
    assert repo.delete(999) is False


def repo_05_같은_연락처와_프로그램은_중복_에러(repo: ApplicantRepository) -> None:
    repo.create(make(phone="010-1234-5678", program="resume_clinic"))
    with pytest.raises(DuplicateApplicationError):
        repo.create(make(name="다른이름", phone="010-1234-5678", program="resume_clinic"))
    # 수정으로 중복을 만들어도 에러
    other = repo.create(make(phone="010-9999-9999", program="resume_clinic"))
    with pytest.raises(DuplicateApplicationError):
        repo.update(other.id, ApplicantUpdate(phone="010-1234-5678"))


ALL_SCENARIOS = [
    repo_01_등록하면_최신순으로_조회된다,
    repo_02_참석으로_바꾸면_updated_at이_갱신된다,
    repo_03_삭제하면_목록에서_사라진다,
    repo_04_없는_id는_None과_False를_돌려준다,
    repo_05_같은_연락처와_프로그램은_중복_에러,
]
