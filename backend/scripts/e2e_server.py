"""화면 흐름 테스트(Playwright)용 서버 (v2.7).

실행은 playwright.config.ts가 알아서 합니다 (직접 켤 일은 없음).
- 매번 빈 SQLite DB(backend/e2e.db)를 새로 만들고 마이그레이션을 끝까지 적용
- 그다음 8100번 포트로 서버를 켬 (개발 서버 8000번과 겹치지 않게)
- 비밀번호 등 설정은 playwright.config.ts의 env로 들어옴 (가짜 값)
"""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DB_FILE = BACKEND_DIR / "e2e.db"


def main() -> None:
    DB_FILE.unlink(missing_ok=True)
    # 개발용 dev.db를 건드리지 않도록 DB 주소를 테스트 파일로 고정 (설정을 읽기 전에 정해야 함)
    os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE.as_posix()}"

    from alembic import command
    from alembic.config import Config

    command.upgrade(Config(str(BACKEND_DIR / "alembic.ini")), "head")

    import uvicorn

    port = int(os.environ.get("E2E_API_PORT", "8100"))
    uvicorn.run("app.main:app", host="127.0.0.1", port=port)


if __name__ == "__main__":
    main()
