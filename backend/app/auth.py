"""로그인 검사 의존성 (v2.0).

- require_admin: 라우터 앞에서 "Authorization: Bearer {토큰}"을 확인. 틀리면 401
- main.py가 /api/programs, /api/applicants, 회차·출석 라우터에 붙입니다.
- HTTPBearer를 쓰면 /docs 화면에 Authorize 버튼이 생겨서 토큰을 넣고 시험할 수 있습니다.
"""

import secrets

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.errors import UnauthorizedError
from app.security import LoginLimiter, verify_token

# AUTH_SECRET이 비어 있을 때 쓸 임시 비밀 키 (서버를 켤 때마다 새로 만들어짐)
_RANDOM_SECRET = secrets.token_hex(32)

# auto_error=False: 머리글이 없어도 FastAPI 기본 에러 대신 우리 401 문구를 쓰려고
bearer = HTTPBearer(auto_error=False)

_login_limiter = LoginLimiter()


def token_secret(settings: Settings) -> str:
    return settings.auth_secret or _RANDOM_SECRET


def get_login_limiter() -> LoginLimiter:
    """로그인 시도 제한기 (테스트에서는 새것으로 바꿔 끼움)"""
    return _login_limiter


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> None:
    if credentials is None or not verify_token(credentials.credentials, token_secret(settings)):
        raise UnauthorizedError()
