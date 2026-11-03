"""/api/auth 엔드포인트 (v2.0). 로그인만 있습니다 (로그아웃은 화면이 토큰을 지우면 끝)."""

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import field_validator

from app.auth import get_login_limiter, token_secret
from app.config import Settings, get_settings
from app.errors import AuthNotConfiguredError, InvalidPasswordError, TooManyAttemptsError
from app.schemas import MSG_PASSWORD_REQUIRED, CamelModel, as_utc
from app.security import LoginLimiter, check_password, make_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(CamelModel):
    password: str

    @field_validator("password", mode="before")
    @classmethod
    def _password(cls, value: object) -> object:
        # 비밀번호는 공백도 글자일 수 있으므로 자르지 않고, 완전히 빈 값만 막음
        if value is None or value == "":
            raise ValueError(MSG_PASSWORD_REQUIRED)
        return value


class LoginResponse(CamelModel):
    token: str
    expires_at: datetime

    @field_validator("expires_at")
    @classmethod
    def _utc(cls, value: datetime) -> datetime:
        return as_utc(value)


@router.post("/login", response_model=LoginResponse)
def login(
    data: LoginRequest,
    settings: Settings = Depends(get_settings),
    limiter: LoginLimiter = Depends(get_login_limiter),
) -> LoginResponse:
    """관리자 비밀번호가 맞으면 토큰을 줌"""
    if not settings.admin_password:
        raise AuthNotConfiguredError()
    if limiter.is_blocked():
        raise TooManyAttemptsError()
    if not check_password(data.password, settings.admin_password):
        limiter.record_failure()
        raise InvalidPasswordError()
    limiter.reset()
    token, expires_at = make_token(token_secret(settings), settings.token_hours)
    return LoginResponse(token=token, expires_at=expires_at)
