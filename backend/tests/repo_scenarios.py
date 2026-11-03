"""REPO-01 ~ REPO-19 시나리오.

메모리 저장소(test_repository.py)와 SQL 저장소(test_sql_repository.py)가
똑같은 시나리오를 통과해야 "라우터가 차이를 모른다"고 말할 수 있습니다.
"""

import time
from datetime import date

import pytest

from app.errors import (
    CapacityTooSmallError,
    DuplicateApplicationError,
    DuplicateProgramError,
    DuplicateSessionError,
    HasAttendanceError,
    InvalidProgramError,
    NotFoundError,
    NotInProgramError,
    ProgramFullError,
    ProgramInUseError,
    SessionNotFoundError,
)
from app.repository import ApplicantRepository
from app.seed import DEMO_APPLICANTS, DEMO_PROGRAMS, seed_demo
from app.schemas import (
    ApplicantCreate,
    ApplicantUpdate,
    ProgramCreate,
    ProgramUpdate,
    SessionCreate,
    SessionUpdate,
)


def program(repo: ApplicantRepository, name: str = "이력서 클리닉", capacity: int | None = None) -> int:
    """테스트용 프로그램을 만들고 번호를 돌려줌"""
    return repo.create_program(ProgramCreate(name=name, capacity=capacity)).id


def session(repo: ApplicantRepository, program_id: int, day: int, note: str | None = None) -> int:
    """테스트용 회차(2026-11-day)를 만들고 번호를 돌려줌"""
    created = repo.create_session(program_id, SessionCreate(session_date=date(2026, 11, day), note=note))
    assert created is not None
    return created.id


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


# ---------- 회차·출석 (v1.3) ----------


def repo_12_회차는_날짜순이고_같은_날짜는_중복_에러(repo: ApplicantRepository) -> None:
    pid = program(repo)
    later = session(repo, pid, 12)
    earlier = session(repo, pid, 10, note="OT")
    result = repo.list_sessions()
    assert [s.id for s in result] == [earlier, later]
    assert result[0].note == "OT"
    assert result[0].attendee_count == 0
    with pytest.raises(DuplicateSessionError):
        session(repo, pid, 10)
    assert repo.create_session(999, SessionCreate(session_date=date(2026, 11, 1))) is None


def repo_13_출석_체크는_여러_번_해도_한_번(repo: ApplicantRepository) -> None:
    pid = program(repo)
    sid = session(repo, pid, 10)
    applicant = repo.create(make(pid))
    repo.set_attendance(sid, applicant.id, True)
    repo.set_attendance(sid, applicant.id, True)
    assert [(r.session_id, r.applicant_id) for r in repo.list_attendance()] == [(sid, applicant.id)]
    assert repo.list_sessions()[0].attendee_count == 1
    repo.set_attendance(sid, applicant.id, False)
    repo.set_attendance(sid, applicant.id, False)
    assert repo.list_attendance() == []
    assert repo.list_sessions()[0].attendee_count == 0


def repo_14_출석_체크_에러(repo: ApplicantRepository) -> None:
    a = program(repo, "모의면접")
    b = program(repo, "취업 특강")
    sid = session(repo, a, 10)
    other = repo.create(make(b))
    with pytest.raises(NotInProgramError):
        repo.set_attendance(sid, other.id, True)
    with pytest.raises(SessionNotFoundError):
        repo.set_attendance(999, other.id, True)
    with pytest.raises(NotFoundError):
        repo.set_attendance(sid, 999, True)


def repo_15_삭제하면_관련_출석과_회차도_지워진다(repo: ApplicantRepository) -> None:
    pid = program(repo, "모의면접")
    s1 = session(repo, pid, 10)
    s2 = session(repo, pid, 12)
    kim = repo.create(make(pid, phone="010-1111-1111"))
    lee = repo.create(make(pid, phone="010-2222-2222"))
    for sid in (s1, s2):
        repo.set_attendance(sid, kim.id, True)
        repo.set_attendance(sid, lee.id, True)
    # 회차 삭제 → 그 회차 출석만 사라짐
    assert repo.delete_session(s1) is True
    assert repo.delete_session(s1) is False
    assert {(r.session_id, r.applicant_id) for r in repo.list_attendance()} == {(s2, kim.id), (s2, lee.id)}
    # 신청자 삭제 → 그 사람 출석만 사라짐
    assert repo.delete(kim.id) is True
    assert [(r.session_id, r.applicant_id) for r in repo.list_attendance()] == [(s2, lee.id)]
    # 신청자가 없는 프로그램 삭제 → 회차도 사라짐
    empty = program(repo, "취업 특강")
    session(repo, empty, 20)
    assert repo.delete_program(empty) is True
    assert [s.program_id for s in repo.list_sessions()] == [pid]


def repo_16_출석_기록이_있으면_다른_프로그램으로_못_옮긴다(repo: ApplicantRepository) -> None:
    a = program(repo, "모의면접")
    b = program(repo, "취업 특강")
    sid = session(repo, a, 10)
    kim = repo.create(make(a, phone="010-1111-1111"))
    lee = repo.create(make(a, phone="010-2222-2222"))
    repo.set_attendance(sid, kim.id, True)
    with pytest.raises(HasAttendanceError):
        repo.update(kim.id, ApplicantUpdate(program_id=b))
    # 출석 기록이 있어도 이름 수정은 됨
    renamed = repo.update(kim.id, ApplicantUpdate(name="김수정"))
    assert renamed is not None and renamed.name == "김수정"
    moved = repo.update(lee.id, ApplicantUpdate(program_id=b))
    assert moved is not None and moved.program_id == b


# ---------- v2.1 ~ v2.2 ----------


def repo_17_회차_날짜와_메모를_고쳐도_출석은_그대로(repo: ApplicantRepository) -> None:
    pid = program(repo)
    s1 = session(repo, pid, 10, note="OT")
    s2 = session(repo, pid, 12)
    kim = repo.create(make(pid))
    repo.set_attendance(s1, kim.id, True)
    moved = repo.update_session(s1, SessionUpdate.model_validate({"sessionDate": "2026-11-14", "note": None}))
    assert moved is not None
    assert (moved.session_date, moved.note, moved.attendee_count) == (date(2026, 11, 14), None, 1)
    # 날짜순이 바뀜: 12일 회차가 먼저
    assert [s.id for s in repo.list_sessions()] == [s2, s1]
    with pytest.raises(DuplicateSessionError):
        repo.update_session(s1, SessionUpdate.model_validate({"sessionDate": "2026-11-12"}))
    # 자기 날짜 그대로 메모만 바꾸는 건 괜찮음
    same = repo.update_session(s2, SessionUpdate.model_validate({"sessionDate": "2026-11-12", "note": "실전"}))
    assert same is not None and same.note == "실전"
    assert repo.update_session(999, SessionUpdate.model_validate({"note": "x"})) is None


def repo_18_수료_기준은_기본_80이고_바꿀_수_있다(repo: ApplicantRepository) -> None:
    pid = program(repo)
    assert repo.list_programs()[0].completion_rate == 80
    updated = repo.update_program(pid, ProgramUpdate.model_validate({"completionRate": 60}))
    assert updated is not None and updated.completion_rate == 60
    assert repo.list_programs()[0].completion_rate == 60


def repo_19_시연용_데이터는_비어_있을_때_한_번만_들어간다(repo: ApplicantRepository) -> None:
    program(repo, "모의면접")  # 기본 프로그램이 이미 있는 경우: 새로 만들지 않고 내용만 채움
    assert seed_demo(repo, date(2026, 11, 3)) is True
    programs = {p.name: p for p in repo.list_programs()}
    assert len(programs) == len(DEMO_PROGRAMS)
    assert programs["모의면접"].location == "3층 세미나실"
    assert len(repo.list()) == len(DEMO_APPLICANTS)
    assert all(a.phone.startswith("010-0000-") for a in repo.list())
    assert len(repo.list_sessions()) == sum(len(p.sessions) for p in DEMO_PROGRAMS)
    assert len(repo.list_attendance()) == sum(len(present) for *_, present in DEMO_APPLICANTS)
    # 두 번째 실행은 아무것도 안 함
    assert seed_demo(repo, date(2026, 11, 3)) is False
    assert len(repo.list()) == len(DEMO_APPLICANTS)


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
    repo_12_회차는_날짜순이고_같은_날짜는_중복_에러,
    repo_13_출석_체크는_여러_번_해도_한_번,
    repo_14_출석_체크_에러,
    repo_15_삭제하면_관련_출석과_회차도_지워진다,
    repo_16_출석_기록이_있으면_다른_프로그램으로_못_옮긴다,
    repo_17_회차_날짜와_메모를_고쳐도_출석은_그대로,
    repo_18_수료_기준은_기본_80이고_바꿀_수_있다,
    repo_19_시연용_데이터는_비어_있을_때_한_번만_들어간다,
]
