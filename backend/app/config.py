"""설정 값 읽기. backend/.env 파일이나 환경 변수에서 읽습니다.

값이 없으면 개발용 기본값(SQLite 파일, localhost:3000)을 씁니다.
배포 서버(Render)에서는 대시보드의 환경 변수로 값을 넣습니다.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # 개발 기본값: backend/dev.db 파일 (설치 없이 바로 동작)
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'dev.db').as_posix()}"
    # pytest -m db 에서 쓰는 테스트용 DB
    database_url_test: str = f"sqlite:///{(BACKEND_DIR / 'test.db').as_posix()}"
    # 허용할 화면 주소. 쉼표로 여러 개 (예: https://내앱.vercel.app,http://localhost:3000)
    # 3000번이 사용 중이면 Next.js가 3001번으로 켜지므로 개발 기본값에 함께 넣어 둠
    cors_origins: str = (
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    )

    # 관리자 로그인 비밀번호 (v2.0). 비어 있으면 로그인이 안 됨. 값은 backend/.env에만 적기
    admin_password: str = ""
    # 토큰 서명용 비밀 키 (v2.0). 비우면 서버를 켤 때마다 새로 만듦 (→ 서버를 다시 켜면 다시 로그인)
    auth_secret: str = ""
    # 로그인 유지 시간
    token_hours: int = 12

    @property
    def cors_origin_list(self) -> list[str]:
        # 끝의 / 는 지움 (붙어 있으면 CORS 에러가 남)
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
