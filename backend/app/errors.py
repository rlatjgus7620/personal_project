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
