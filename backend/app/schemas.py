"""요청/응답 모델 (Pydantic).

- 화면에서 온 JSON을 검사하고(입력 검사), 서버가 돌려줄 JSON 모양을 정합니다.
- 규칙은 docs/DATA_MODEL.md의 "검사 규칙 정리" 표와 같습니다.
- 에러 문구는 사용자에게 그대로 보여줄 한국어로 직접 정합니다.
"""

import re
from datetime import UTC, datetime
from typing import Literal, get_args

from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from pydantic.alias_generators import to_camel

# 프로그램 코드 (DB와 API에는 영어 코드, 화면에서만 한국어 이름)
ProgramCode = Literal["job_search", "resume_clinic", "mock_interview", "career_lecture"]
PROGRAM_CODES: tuple[str, ...] = get_args(ProgramCode)

NAME_MAX_LENGTH = 20
PHONE_PATTERN = re.compile(r"^010-\d{4}-\d{4}$")

# 에러 문구 (API_SPEC.md와 같음)
MSG_NAME_REQUIRED = "이름을 입력해 주세요."
MSG_NAME_TOO_LONG = f"이름은 {NAME_MAX_LENGTH}자 이하로 입력해 주세요."
MSG_PHONE_FORMAT = "연락처는 010-0000-0000 형식으로 입력해 주세요."
MSG_PROGRAM_REQUIRED = "프로그램을 선택해 주세요."
MSG_NOTHING_TO_UPDATE = "수정할 항목이 없습니다."


def clean_name(value: str) -> str:
    """앞뒤 공백을 자르고 1~20자인지 확인"""
    name = value.strip()
    if not name:
        raise ValueError(MSG_NAME_REQUIRED)
    if len(name) > NAME_MAX_LENGTH:
        raise ValueError(MSG_NAME_TOO_LONG)
    return name


def check_phone(value: str) -> str:
    """010-0000-0000 형식인지 확인"""
    phone = value.strip()
    if not PHONE_PATTERN.fullmatch(phone):
        raise ValueError(MSG_PHONE_FORMAT)
    return phone


def check_program(value: object) -> object:
    """정해진 4개 코드 중 하나인지 확인 (Literal 기본 에러 대신 우리 문구를 쓰려고 먼저 검사)"""
    if value is not None and value not in PROGRAM_CODES:
        raise ValueError(MSG_PROGRAM_REQUIRED)
    return value


class CamelModel(BaseModel):
    """JSON에서는 camelCase(createdAt), 파이썬에서는 snake_case(created_at)로 쓰게 해주는 공통 부모"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ApplicantCreate(CamelModel):
    """POST /api/applicants 요청 본문"""

    name: str
    phone: str
    program: ProgramCode

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        return clean_name(value)

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str) -> str:
        return check_phone(value)

    @field_validator("program", mode="before")
    @classmethod
    def _program(cls, value: object) -> object:
        return check_program(value)


class ApplicantUpdate(CamelModel):
    """PATCH /api/applicants/{id} 요청 본문. 모두 선택이지만 최소 하나는 있어야 함"""

    name: str | None = None
    phone: str | None = None
    program: ProgramCode | None = None
    attended: bool | None = None

    @field_validator("name")
    @classmethod
    def _name(cls, value: str | None) -> str | None:
        return None if value is None else clean_name(value)

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str | None) -> str | None:
        return None if value is None else check_phone(value)

    @field_validator("program", mode="before")
    @classmethod
    def _program(cls, value: object) -> object:
        return check_program(value)

    @model_validator(mode="after")
    def _at_least_one(self) -> "ApplicantUpdate":
        if all(v is None for v in (self.name, self.phone, self.program, self.attended)):
            raise ValueError(MSG_NOTHING_TO_UPDATE)
        return self

    def changes(self) -> dict[str, object]:
        """실제로 보낸 항목만 딕셔너리로 (저장소가 이 항목만 바꿈)"""
        return self.model_dump(exclude_none=True)


class ApplicantOut(CamelModel):
    """서버가 돌려주는 신청자 한 명"""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: int
    name: str
    phone: str
    program: ProgramCode
    attended: bool
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def _as_utc(cls, value: datetime) -> datetime:
        # SQLite는 시간대 정보를 버리므로, 시간대가 없으면 UTC로 간주
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value
