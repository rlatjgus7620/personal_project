"""로그인에 쓰는 순수 함수들 (v2.0). FastAPI를 몰라도 되게 따로 둠 → 테스트하기 쉬움.

토큰 모양: "{만료 시각(초)}.{서명}"
- 서명 = HMAC-SHA256(비밀 키, 만료 시각). 비밀 키는 서버만 알기 때문에
  누가 만료 시각을 바꾸면 서명이 맞지 않아 거부됩니다.
- 토큰을 DB에 저장하지 않습니다. 서명과 만료 시각만 확인합니다.
"""

import hashlib
import hmac
import time
from collections.abc import Callable
from datetime import UTC, datetime


def _sign(expires: int, secret: str) -> str:
    return hmac.new(secret.encode(), str(expires).encode(), hashlib.sha256).hexdigest()


def make_token(secret: str, hours: int, now: float | None = None) -> tuple[str, datetime]:
    """토큰과 만료 시각을 만듦"""
    current = time.time() if now is None else now
    expires = int(current) + hours * 3600
    return f"{expires}.{_sign(expires, secret)}", datetime.fromtimestamp(expires, UTC)


def verify_token(token: str, secret: str, now: float | None = None) -> bool:
    """서명이 맞고 아직 만료되지 않았으면 True"""
    expires_text, _, signature = token.partition(".")
    if not expires_text.isascii() or not expires_text.isdigit() or not signature:
        return False
    expires = int(expires_text)
    # compare_digest: 비교에 걸리는 시간으로 정답을 추측하지 못하게 하는 비교
    if not hmac.compare_digest(signature, _sign(expires, secret)):
        return False
    current = time.time() if now is None else now
    return current < expires


def check_password(given: str, expected: str) -> bool:
    """비밀번호 비교 (시간 차이로 추측하지 못하게)"""
    return hmac.compare_digest(given.encode(), expected.encode())


class LoginLimiter:
    """window_seconds 안에 max_failures번 틀리면 block_seconds 동안 로그인을 막음.

    담당자 1명용 앱이라 사람(IP)별로 나누지 않고 서버 전체에 하나만 둡니다.
    clock을 바꿔 끼울 수 있어서 테스트에서 시간을 마음대로 흐르게 할 수 있습니다.
    """

    def __init__(
        self,
        max_failures: int = 5,
        window_seconds: float = 60,
        block_seconds: float = 60,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._max = max_failures
        self._window = window_seconds
        self._block = block_seconds
        self._clock = clock
        self._failures: list[float] = []
        self._blocked_until = 0.0

    def is_blocked(self) -> bool:
        return self._clock() < self._blocked_until

    def record_failure(self) -> None:
        now = self._clock()
        self._failures = [t for t in self._failures if now - t < self._window] + [now]
        if len(self._failures) >= self._max:
            self._blocked_until = now + self._block
            self._failures = []

    def reset(self) -> None:
        """로그인에 성공하면 실패 기록을 지움"""
        self._failures = []
        self._blocked_until = 0.0
