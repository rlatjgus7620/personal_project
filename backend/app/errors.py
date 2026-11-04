"""우리 앱에서 쓰는 예외(에러)들.

모두 AppError를 물려받고, main.py의 핸들러 하나가
{ "error": { "code", "message" } } 형식의 응답으로 바꿉니다. (API_SPEC.md 에러 표 참고)
"""


class AppError(Exception):
    status_code = 400
    code = "VALIDATION_ERROR"
    default_message = "요청을 처리할 수 없습니다."

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.default_message
        super().__init__(self.message)


class NotFoundError(AppError):
    """없는 신청자·프로그램 id → 404"""

    status_code = 404
    code = "NOT_FOUND"
    default_message = "신청자를 찾을 수 없습니다."


class ProgramNotFoundError(NotFoundError):
    default_message = "프로그램을 찾을 수 없습니다."


class DuplicateApplicationError(AppError):
    """같은 연락처가 같은 프로그램에 이미 신청 → 409"""

    status_code = 409
    code = "DUPLICATE_APPLICATION"
    default_message = "이미 같은 프로그램에 신청한 연락처입니다."


class InvalidProgramError(AppError):
    """없는 프로그램 번호로 신청 → 400"""

    default_message = "선택한 프로그램이 없습니다."


class ProgramFullError(AppError):
    """정원이 가득 찬 프로그램에 신청하거나 옮김 → 409"""

    status_code = 409
    code = "PROGRAM_FULL"

    def __init__(self, capacity: int) -> None:
        super().__init__(f"정원이 가득 찼습니다. (정원 {capacity}명)")


class CapacityTooSmallError(AppError):
    """정원을 지금 신청자 수보다 적게 줄임 → 400"""

    def __init__(self, applicant_count: int) -> None:
        super().__init__(f"지금 신청자({applicant_count}명)보다 정원을 적게 줄일 수 없습니다.")


class InvalidPeriodError(AppError):
    """수정 결과 종료일이 시작일보다 빠름 → 400"""

    default_message = "종료일은 시작일보다 빠를 수 없습니다."


class DuplicateProgramError(AppError):
    """같은 이름의 프로그램이 이미 있음 → 409"""

    status_code = 409
    code = "DUPLICATE_PROGRAM"
    default_message = "같은 이름의 프로그램이 이미 있습니다."


class ProgramInUseError(AppError):
    """신청자가 있는 프로그램 삭제 → 409"""

    status_code = 409
    code = "PROGRAM_IN_USE"
    default_message = "신청자가 있는 프로그램은 삭제할 수 없습니다."


# ---------- 회차·출석 (v1.3) ----------


class SessionNotFoundError(NotFoundError):
    default_message = "회차를 찾을 수 없습니다."


class DuplicateSessionError(AppError):
    """한 프로그램에 같은 날짜 회차가 이미 있음 → 409"""

    status_code = 409
    code = "DUPLICATE_SESSION"
    default_message = "같은 날짜의 회차가 이미 있습니다."


class NotInProgramError(AppError):
    """회차 프로그램의 신청자가 아닌 사람을 출석 체크 → 400"""

    default_message = "이 회차 프로그램의 신청자가 아닙니다."


class HasAttendanceError(AppError):
    """출석 기록이 있는 신청자를 다른 프로그램으로 옮김 → 409"""

    status_code = 409
    code = "HAS_ATTENDANCE"
    default_message = "출석 기록이 있는 신청자는 다른 프로그램으로 옮길 수 없습니다."


# ---------- 로그인 (v2.0) ----------


class UnauthorizedError(AppError):
    """토큰이 없거나 틀렸거나 만료됨 → 401"""

    status_code = 401
    code = "UNAUTHORIZED"
    default_message = "로그인이 필요합니다. 다시 로그인해 주세요."


class InvalidPasswordError(AppError):
    """로그인 비밀번호가 틀림 → 401"""

    status_code = 401
    code = "INVALID_PASSWORD"
    default_message = "비밀번호가 맞지 않습니다."


class TooManyAttemptsError(AppError):
    """1분 안에 비밀번호를 5번 틀림 → 429"""

    status_code = 429
    code = "TOO_MANY_ATTEMPTS"
    default_message = "로그인 시도가 너무 많습니다. 1분 뒤에 다시 시도해 주세요."


class AuthNotConfiguredError(AppError):
    """서버에 ADMIN_PASSWORD가 없음 → 503"""

    status_code = 503
    code = "AUTH_NOT_CONFIGURED"
    default_message = "서버에 관리자 비밀번호가 설정되지 않았습니다. backend/.env를 확인해 주세요."


# ---------- 기간 검사 (v2.3) ----------


def _dot(day: object) -> str:
    return str(day).replace("-", ".")


def period_text(start: object, end: object) -> str:
    """2026.11.10 ~ 2026.11.12 / 2026.11.10 ~ / ~ 2026.11.12"""
    return f"{_dot(start) if start else ''} ~ {_dot(end) if end else ''}".strip()


class SessionOutOfPeriodError(AppError):
    """회차 날짜가 프로그램 기간 밖 → 400"""

    def __init__(self, period: str) -> None:
        super().__init__(f"회차 날짜는 프로그램 기간({period}) 안이어야 합니다.")


class SessionsOutsidePeriodError(AppError):
    """프로그램 기간을 바꾸면 기존 회차가 기간 밖으로 나감 → 400"""

    default_message = "바꾼 기간 밖에 회차가 있습니다. 회차 날짜를 먼저 옮기거나 지워 주세요."
