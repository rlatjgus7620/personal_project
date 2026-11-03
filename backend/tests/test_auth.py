"""AUTH-01 ~ AUTH-02: 토큰과 로그인 시도 제한 (v2.0, FastAPI 없이 순수 함수만)"""

from app.security import LoginLimiter, check_password, make_token, verify_token

NOW = 1_800_000_000.0  # 고정된 "지금" (테스트가 실행 시각에 따라 바뀌지 않게)


def test_auth_01_토큰은_서명과_만료_시각을_확인한다() -> None:
    token, expires_at = make_token("secret", hours=12, now=NOW)
    expires_text, signature = token.split(".")
    assert int(expires_text) == int(NOW) + 12 * 3600
    assert expires_at.timestamp() == int(NOW) + 12 * 3600

    assert verify_token(token, "secret", now=NOW) is True
    # 서명 한 글자 바꿈
    flipped = signature[:-1] + ("0" if signature[-1] != "0" else "1")
    assert verify_token(f"{expires_text}.{flipped}", "secret", now=NOW) is False
    # 만료 시각을 늘려서 오래 쓰려고 함 → 서명이 맞지 않음
    assert verify_token(f"{int(expires_text) + 3600}.{signature}", "secret", now=NOW) is False
    # 시간이 지남
    assert verify_token(token, "secret", now=NOW + 12 * 3600) is False
    # 다른 비밀 키
    assert verify_token(token, "other-secret", now=NOW) is False
    # 엉뚱한 값
    for bad in ["", "abc", "123", ".abc", "abc.def", "١٢٣.abc"]:
        assert verify_token(bad, "secret", now=NOW) is False

    assert check_password("pw-1234", "pw-1234") is True
    assert check_password("pw-123", "pw-1234") is False


class FakeClock:
    """테스트에서 시간을 직접 흐르게 하는 시계"""

    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def test_auth_02_1분_안에_5번_틀리면_1분_동안_막는다() -> None:
    clock = FakeClock()
    limiter = LoginLimiter(clock=clock)
    for _ in range(4):
        limiter.record_failure()
        clock.now += 5
    assert limiter.is_blocked() is False
    limiter.record_failure()  # 5번째
    assert limiter.is_blocked() is True
    clock.now += 59
    assert limiter.is_blocked() is True
    clock.now += 2
    assert limiter.is_blocked() is False

    # 오래전 실패는 세지 않음: 4번 틀리고 1분 뒤 1번 더 → 막히지 않음
    for _ in range(4):
        limiter.record_failure()
    clock.now += 61
    limiter.record_failure()
    assert limiter.is_blocked() is False

    # 성공하면 기록을 지움
    for _ in range(3):
        limiter.record_failure()
    limiter.reset()
    limiter.record_failure()
    limiter.record_failure()
    assert limiter.is_blocked() is False
