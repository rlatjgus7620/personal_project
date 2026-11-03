"""시연용 가짜 데이터 넣기 (v2.2).

실행 (backend 폴더에서): uv run python -m app.seed

- DB에 신청자와 회차가 하나도 없을 때만 넣습니다. (실제 데이터와 섞이지 않게)
- 이름·연락처는 모두 가짜입니다. 연락처는 010-0000-으로 시작합니다.
- 날짜는 실행한 날을 기준으로 정해서, 언제 시연해도 "지난주에 시작한 프로그램"처럼 보입니다.
- 저장소(Repository)를 거쳐서 넣으므로 정원·중복 같은 규칙도 그대로 지킵니다.
"""

from dataclasses import dataclass, field
from datetime import date, timedelta

from app.repository import ApplicantRepository
from app.schemas import ApplicantCreate, ApplicantUpdate, ProgramCreate, ProgramUpdate, SessionCreate


@dataclass(frozen=True)
class DemoProgram:
    name: str
    start: int | None  # 오늘로부터 며칠 뒤(음수면 며칠 전)
    end: int | None
    location: str
    capacity: int | None
    completion_rate: int = 80
    sessions: list[tuple[int, str | None]] = field(default_factory=list)  # (며칠 뒤, 메모)


DEMO_PROGRAMS = [
    DemoProgram("모의면접", -7, -3, "3층 세미나실", 10, 80, [(-7, "OT"), (-5, None), (-3, "실전")]),
    DemoProgram("구직활동 프로그램", -14, 0, "2층 강의실", 20, 60, [(-14, "OT"), (-7, None), (0, "마무리")]),
    DemoProgram("이력서 클리닉", -2, -2, "상담실", 8),
    DemoProgram("취업 특강", 7, 7, "대강당", 30),
]

# (이름, 연락처 끝 4자리, 프로그램, 참석 체크(회차 없는 프로그램), 출석한 회차 번호(1부터))
DEMO_APPLICANTS: list[tuple[str, str, str, bool, list[int]]] = [
    ("김예시", "0001", "모의면접", False, [1, 2, 3]),
    ("이샘플", "0002", "모의면접", False, [1, 3]),
    ("박데모", "0003", "모의면접", False, [1]),
    ("최가상", "0004", "모의면접", False, []),
    ("정연습", "0005", "구직활동 프로그램", False, [1, 2]),
    ("강모의", "0006", "구직활동 프로그램", False, [2]),
    ("조시연", "0007", "구직활동 프로그램", False, [1, 2, 3]),
    ("윤테스트", "0008", "이력서 클리닉", True, []),
    ("서체험", "0009", "이력서 클리닉", True, []),
    ("임예제", "0010", "이력서 클리닉", False, []),
    ("한견본", "0011", "취업 특강", False, []),
    ("오임시", "0012", "취업 특강", False, []),
]


def _day(today: date, offset: int | None) -> date | None:
    return None if offset is None else today + timedelta(days=offset)


def seed_demo(repo: ApplicantRepository, today: date) -> bool:
    """시연용 데이터를 넣고 True. 이미 신청자나 회차가 있으면 아무것도 안 하고 False"""
    if repo.list() or repo.list_sessions():
        return False

    # 1) 프로그램: 같은 이름이 있으면(마이그레이션이 넣은 기본 4개) 내용만 채우고, 없으면 새로 만듦
    existing = {p.name: p.id for p in repo.list_programs()}
    program_ids: dict[str, int] = {}
    session_ids: dict[str, list[int]] = {}
    for spec in DEMO_PROGRAMS:
        details = {
            "start_date": _day(today, spec.start),
            "end_date": _day(today, spec.end),
            "location": spec.location,
            "capacity": spec.capacity,
            "completion_rate": spec.completion_rate,
        }
        if spec.name in existing:
            updated = repo.update_program(existing[spec.name], ProgramUpdate.model_validate(details))
            assert updated is not None
            program_ids[spec.name] = updated.id
        else:
            program_ids[spec.name] = repo.create_program(
                ProgramCreate.model_validate({"name": spec.name, **details})
            ).id
        # 2) 회차
        session_ids[spec.name] = []
        for offset, note in spec.sessions:
            created = repo.create_session(
                program_ids[spec.name], SessionCreate(session_date=today + timedelta(days=offset), note=note)
            )
            assert created is not None
            session_ids[spec.name].append(created.id)

    # 3) 신청자, 참석 체크, 회차별 출석
    for name, tail, program, attended, present in DEMO_APPLICANTS:
        applicant = repo.create(
            ApplicantCreate(name=name, phone=f"010-0000-{tail}", program_id=program_ids[program])
        )
        if attended:
            repo.update(applicant.id, ApplicantUpdate(attended=True))
        for order in present:
            repo.set_attendance(session_ids[program][order - 1], applicant.id, True)
    return True


def main() -> None:
    # DB 연결은 실행할 때만 불러옴 (테스트는 메모리 저장소로 seed_demo만 확인)
    from app.db import SessionLocal
    from app.sql_repository import SqlApplicantRepository

    with SessionLocal() as session:
        if seed_demo(SqlApplicantRepository(session), date.today()):
            # 명령으로 실행하는 도구라서 결과를 화면에 알려줌 (디버깅용 print 아님)
            print(f"시연용 데이터를 넣었습니다. (프로그램 {len(DEMO_PROGRAMS)}개, 신청자 {len(DEMO_APPLICANTS)}명)")
        else:
            print("이미 신청자나 회차가 있어서 넣지 않았습니다. (실제 데이터를 지키려고)")


if __name__ == "__main__":
    main()
