"""요청/응답 모델 (Pydantic).

- 화면에서 온 JSON을 검사하고(입력 검사), 서버가 돌려줄 JSON 모양을 정합니다.
- 규칙은 docs/DATA_MODEL.md의 "검사 규칙 정리" 표와 같습니다.
- 에러 문구는 사용자에게 그대로 보여줄 한국어로 직접 정합니다.
"""

import re
from datetime import UTC, date, datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from pydantic.alias_generators import to_camel

NAME_MAX_LENGTH = 20
PHONE_PATTERN = re.compile(r"^010-\d{4}-\d{4}$")
PROGRAM_NAME_MAX_LENGTH = 30
LOCATION_MAX_LENGTH = 50
CAPACITY_MIN, CAPACITY_MAX = 1, 999

# 에러 문구 (API_SPEC.md와 같음)
MSG_NAME_REQUIRED = "이름을 입력해 주세요."
MSG_NAME_TOO_LONG = f"이름은 {NAME_MAX_LENGTH}자 이하로 입력해 주세요."
MSG_PHONE_FORMAT = "연락처는 010-0000-0000 형식으로 입력해 주세요."
MSG_PROGRAM_REQUIRED = "프로그램을 선택해 주세요."
MSG_NOTHING_TO_UPDATE = "수정할 항목이 없습니다."
MSG_PROGRAM_NAME_REQUIRED = "프로그램 이름을 입력해 주세요."
MSG_PROGRAM_NAME_TOO_LONG = f"프로그램 이름은 {PROGRAM_NAME_MAX_LENGTH}자 이하로 입력해 주세요."
MSG_LOCATION_TOO_LONG = f"장소는 {LOCATION_MAX_LENGTH}자 이하로 입력해 주세요."
MSG_CAPACITY_RANGE = f"정원은 {CAPACITY_MIN}~{CAPACITY_MAX}명 사이로 입력해 주세요."
MSG_PERIOD_ORDER = "종료일은 시작일보다 빠를 수 없습니다."


# ---------- 검사 함수 ----------


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


def check_program_id(value: object) -> object:
    """비었거나 1보다 작으면 '프로그램을 선택해 주세요.' (실제로 있는지는 저장소가 확인)"""
    if value is None or value == "" or (isinstance(value, int) and not isinstance(value, bool) and value < 1):
        raise ValueError(MSG_PROGRAM_REQUIRED)
    return value


def clean_program_name(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(MSG_PROGRAM_NAME_REQUIRED)
    name = value.strip()
    if len(name) > PROGRAM_NAME_MAX_LENGTH:
        raise ValueError(MSG_PROGRAM_NAME_TOO_LONG)
    return name


def clean_location(value: object) -> str | None:
    """앞뒤 공백을 자르고, 비었으면 None"""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(MSG_LOCATION_TOO_LONG)
    location = value.strip()
    if len(location) > LOCATION_MAX_LENGTH:
        raise ValueError(MSG_LOCATION_TOO_LONG)
    return location or None


def check_capacity(value: object) -> int | None:
    """비우면 None(제한 없음), 아니면 1~999 정수"""
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        raise ValueError(MSG_CAPACITY_RANGE)
    if isinstance(value, str) and value.strip().isdigit():
        value = int(value.strip())
    if not isinstance(value, int) or not CAPACITY_MIN <= value <= CAPACITY_MAX:
        raise ValueError(MSG_CAPACITY_RANGE)
    return value


def check_period(start: date | None, end: date | None) -> None:
    if start is not None and end is not None and end < start:
        raise ValueError(MSG_PERIOD_ORDER)


# ---------- 공통 부모 ----------


class CamelModel(BaseModel):
    """JSON에서는 camelCase(createdAt), 파이썬에서는 snake_case(created_at)로 쓰게 해주는 공통 부모"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


def as_utc(value: datetime) -> datetime:
    # SQLite는 시간대 정보를 버리므로, 시간대가 없으면 UTC로 간주
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


# ---------- 프로그램 (v1.2) ----------


class ProgramCreate(CamelModel):
    """POST /api/programs 요청 본문. 이름만 필수"""

    name: str
    start_date: date | None = None
    end_date: date | None = None
    location: str | None = None
    capacity: int | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _name(cls, value: object) -> str:
        return clean_program_name(value)

    @field_validator("location", mode="before")
    @classmethod
    def _location(cls, value: object) -> str | None:
        return clean_location(value)

    @field_validator("capacity", mode="before")
    @classmethod
    def _capacity(cls, value: object) -> int | None:
        return check_capacity(value)

    @model_validator(mode="after")
    def _period(self) -> "ProgramCreate":
        check_period(self.start_date, self.end_date)
        return self


class ProgramUpdate(CamelModel):
    """PATCH /api/programs/{id} 요청 본문.

    보낸 항목만 바꿉니다. null을 보내면 그 항목을 비웁니다(이름 제외).
    "안 보냄"과 "null을 보냄"을 구분하려고 model_fields_set을 씁니다.
    """

    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    location: str | None = None
    capacity: int | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _name(cls, value: object) -> str:
        return clean_program_name(value)  # 이름은 null로 비울 수 없음

    @field_validator("location", mode="before")
    @classmethod
    def _location(cls, value: object) -> str | None:
        return clean_location(value)

    @field_validator("capacity", mode="before")
    @classmethod
    def _capacity(cls, value: object) -> int | None:
        return check_capacity(value)

    @model_validator(mode="after")
    def _check(self) -> "ProgramUpdate":
        if not self.model_fields_set:
            raise ValueError(MSG_NOTHING_TO_UPDATE)
        check_period(self.start_date, self.end_date)
        return self

    def changes(self) -> dict[str, object]:
        """실제로 보낸 항목만 (null 포함)"""
        return {field: getattr(self, field) for field in self.model_fields_set}


class ProgramOut(CamelModel):
    """서버가 돌려주는 프로그램 하나. applicant_count는 저장하지 않고 계산한 값"""

    id: int
    name: str
    start_date: date | None
    end_date: date | None
    location: str | None
    capacity: int | None
    applicant_count: int = 0


# ---------- 신청자 ----------


class ApplicantCreate(CamelModel):
    """POST /api/applicants 요청 본문"""

    name: str
    phone: str
    program_id: int

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        return clean_name(value)

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str) -> str:
        return check_phone(value)

    @field_validator("program_id", mode="before")
    @classmethod
    def _program_id(cls, value: object) -> object:
        return check_program_id(value)


class ApplicantUpdate(CamelModel):
    """PATCH /api/applicants/{id} 요청 본문. 모두 선택이지만 최소 하나는 있어야 함"""

    name: str | None = None
    phone: str | None = None
    program_id: int | None = None
    attended: bool | None = None

    @field_validator("name")
    @classmethod
    def _name(cls, value: str | None) -> str | None:
        return None if value is None else clean_name(value)

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str | None) -> str | None:
        return None if value is None else check_phone(value)

    @field_validator("program_id", mode="before")
    @classmethod
    def _program_id(cls, value: object) -> object:
        return None if value is None else check_program_id(value)

    @model_validator(mode="after")
    def _at_least_one(self) -> "ApplicantUpdate":
        if all(v is None for v in (self.name, self.phone, self.program_id, self.attended)):
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
    program_id: int
    attended: bool
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def _as_utc(cls, value: datetime) -> datetime:
        return as_utc(value)
