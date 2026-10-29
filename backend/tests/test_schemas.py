"""VAL-01 ~ VAL-06: 입력 검사 규칙 (docs/TEST_CASES.md 1절)"""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas import ApplicantCreate, ApplicantOut, ApplicantUpdate

VALID = {"name": "김테스트", "phone": "010-1234-5678", "program": "resume_clinic"}


def test_val_01_정상_입력은_통과하고_이름_공백이_제거된다() -> None:
    data = ApplicantCreate(**{**VALID, "name": "  김테스트 "})
    assert data.name == "김테스트"
    assert data.phone == "010-1234-5678"
    assert data.program == "resume_clinic"


@pytest.mark.parametrize("name", ["", "   ", "가" * 21])
def test_val_02_이름이_비었거나_21자면_실패한다(name: str) -> None:
    with pytest.raises(ValidationError):
        ApplicantCreate(**{**VALID, "name": name})


@pytest.mark.parametrize("phone", ["01012345678", "010-123-4567", "011-1234-5678"])
def test_val_03_연락처_형식이_틀리면_실패한다(phone: str) -> None:
    with pytest.raises(ValidationError):
        ApplicantCreate(**{**VALID, "phone": phone})


def test_val_04_없는_프로그램_코드는_실패한다() -> None:
    with pytest.raises(ValidationError):
        ApplicantCreate(**{**VALID, "program": "cooking"})


def test_val_05_수정은_한_항목만_있어도_되지만_빈_객체는_실패한다() -> None:
    assert ApplicantUpdate(attended=True).changes() == {"attended": True}
    assert ApplicantUpdate(name=" 김수정 ").changes() == {"name": "김수정"}
    with pytest.raises(ValidationError):
        ApplicantUpdate()


def test_val_06_응답을_JSON으로_바꾸면_키가_camelCase다() -> None:
    now = datetime(2026, 10, 29, 5, 0, tzinfo=UTC)
    out = ApplicantOut(id=1, attended=False, created_at=now, updated_at=now, **VALID)
    dumped = out.model_dump(by_alias=True)
    assert "createdAt" in dumped
    assert "updatedAt" in dumped
    assert "created_at" not in dumped
