"""VAL-01 ~ VAL-09: 입력 검사 규칙 (docs/TEST_CASES.md 1절)"""

from datetime import UTC, date, datetime

import pytest
from pydantic import ValidationError

from app.schemas import (
    ApplicantCreate,
    ApplicantOut,
    ApplicantUpdate,
    ProgramCreate,
    ProgramUpdate,
    SessionCreate,
)

VALID = {"name": "김테스트", "phone": "010-1234-5678", "program_id": 2}


def test_val_01_정상_입력은_통과하고_이름_공백이_제거된다() -> None:
    data = ApplicantCreate(**{**VALID, "name": "  김테스트 "})
    assert data.name == "김테스트"
    assert data.phone == "010-1234-5678"
    assert data.program_id == 2


@pytest.mark.parametrize("name", ["", "   ", "가" * 21])
def test_val_02_이름이_비었거나_21자면_실패한다(name: str) -> None:
    with pytest.raises(ValidationError):
        ApplicantCreate(**{**VALID, "name": name})


@pytest.mark.parametrize("phone", ["01012345678", "010-123-4567", "011-1234-5678"])
def test_val_03_연락처_형식이_틀리면_실패한다(phone: str) -> None:
    with pytest.raises(ValidationError):
        ApplicantCreate(**{**VALID, "phone": phone})


@pytest.mark.parametrize("program_id", [None, 0])
def test_val_04_프로그램을_안_고르면_실패한다(program_id: int | None) -> None:
    with pytest.raises(ValidationError, match="프로그램을 선택해 주세요."):
        ApplicantCreate(**{**VALID, "program_id": program_id})


def test_val_05_수정은_한_항목만_있어도_되지만_빈_객체는_실패한다() -> None:
    assert ApplicantUpdate(attended=True).changes() == {"attended": True}
    assert ApplicantUpdate(name=" 김수정 ").changes() == {"name": "김수정"}
    assert ApplicantUpdate(program_id=3).changes() == {"program_id": 3}
    with pytest.raises(ValidationError):
        ApplicantUpdate()


def test_val_06_응답을_JSON으로_바꾸면_키가_camelCase다() -> None:
    now = datetime(2026, 10, 29, 5, 0, tzinfo=UTC)
    out = ApplicantOut(id=1, attended=False, created_at=now, updated_at=now, **VALID)
    dumped = out.model_dump(by_alias=True)
    assert {"programId", "createdAt", "updatedAt"} <= set(dumped)
    assert "created_at" not in dumped


def test_val_07_프로그램_추가_규칙() -> None:
    ok = ProgramCreate(name=" 모의면접 ", location="  ", capacity=10)
    assert ok.name == "모의면접"
    assert ok.location is None
    assert ok.capacity == 10
    assert ProgramCreate(name="특강", capacity=None).capacity is None
    bad_inputs: list[dict[str, object]] = [
        {"name": ""},
        {"name": "가" * 31},
        {"name": "특강", "capacity": 0},
        {"name": "특강", "capacity": 1000},
        {"name": "특강", "location": "가" * 51},
        {"name": "특강", "start_date": date(2026, 11, 12), "end_date": date(2026, 11, 10)},
    ]
    for bad in bad_inputs:
        with pytest.raises(ValidationError):
            ProgramCreate.model_validate(bad)


def test_val_08_프로그램_수정은_null로_비울_수_있지만_이름은_못_비운다() -> None:
    assert ProgramUpdate(capacity=None).changes() == {"capacity": None}
    assert ProgramUpdate.model_validate({"location": "2층"}).changes() == {"location": "2층"}
    with pytest.raises(ValidationError):
        ProgramUpdate()
    with pytest.raises(ValidationError):
        ProgramUpdate(name=None)


def test_val_09_회차_추가_규칙() -> None:
    ok = SessionCreate.model_validate({"sessionDate": "2026-11-10", "note": " OT "})
    assert ok.session_date == date(2026, 11, 10)
    assert ok.note == "OT"
    assert SessionCreate.model_validate({"sessionDate": "2026-11-10", "note": "  "}).note is None
    bad_inputs: list[dict[str, object]] = [
        {},
        {"sessionDate": None},
        {"sessionDate": ""},
        {"sessionDate": "2026-11-10", "note": "가" * 31},
    ]
    for bad in bad_inputs:
        with pytest.raises(ValidationError):
            SessionCreate.model_validate(bad)
