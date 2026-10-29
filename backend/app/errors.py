"""우리 앱에서 쓰는 예외(에러)들. main.py가 이 예외를 API_SPEC.md 형식의 응답으로 바꿉니다."""


class NotFoundError(Exception):
    """없는 신청자 id를 요청했을 때 → 404 NOT_FOUND"""

    def __init__(self, message: str = "신청자를 찾을 수 없습니다.") -> None:
        super().__init__(message)
        self.message = message


class DuplicateApplicationError(Exception):
    """같은 연락처가 같은 프로그램에 이미 신청했을 때 → 409 DUPLICATE_APPLICATION"""

    def __init__(self, message: str = "이미 같은 프로그램에 신청한 연락처입니다.") -> None:
        super().__init__(message)
        self.message = message
