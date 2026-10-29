# 교육 프로그램 신청·참석 관리 앱

교육기관 운영 담당자가 프로그램 신청자를 등록하고, 행사 당일 참석을 체크하고, 프로그램별로 골라 보는 웹 앱입니다.
AX 풀스택 빌더 과정의 Todo 앱 가이드(STEP 0~14) 방식으로 만든 개인 프로젝트입니다. 현재 버전: **v0.4** (필터와 수정까지)

- 처음 보는 분은 [docs/GUIDE_비전공자용_설명.md](docs/GUIDE_비전공자용_설명.md)부터 읽어 주세요.
- 명세 문서: [docs/](docs/) 폴더 (IDEA → PRD → TRD → DATA_MODEL → API_SPEC → COMPONENT_SPEC → TEST_CASES)

## 기술 스택
- 화면: Next.js 15, React 19, TypeScript, Tailwind CSS, Jest + React Testing Library
- 서버: Python 3.12+, FastAPI, Pydantic v2, uv
- DB: SQLAlchemy 2.0 + Alembic (개발: SQLite 파일 / 배포: Neon Postgres)

## 처음 한 번만 준비하기 (Windows PowerShell)

필요한 프로그램: Node.js LTS(`node -v`), Python 3.12 이상(`python --version`), uv(`uv --version`)
uv가 없으면: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`

```powershell
# 1) 화면 쪽 패키지 설치 (프로젝트 최상위 폴더에서)
npm install

# 2) 화면용 서버 주소 파일 만들기
copy .env.example .env.local

# 3) 서버 쪽 패키지 설치 + DB 테이블 만들기
cd backend
uv sync
uv run alembic upgrade head
cd ..
```

`.env.local`이 없어도 기본 주소(`http://localhost:8000`)로 동작하지만, 배포 전 연습을 위해 만들어 두세요. 서버 설정을 바꾸려면 `backend/.env.example`을 복사해 `backend/.env`를 만드세요.

## 실행하기 (터미널 2개)

```powershell
# 터미널 1: 서버 → http://localhost:8000/docs 에서 API 시험 화면
cd backend
uv run fastapi dev app/main.py
```

```powershell
# 터미널 2: 화면 → http://localhost:3000
npm run dev
```

## 테스트

```powershell
npm test                      # 화면 테스트 (Jest)
cd backend; uv run pytest      # 서버 테스트 (메모리 저장소)
uv run pytest -m db            # DB 저장소 테스트 (backend/test.db)
```

## 배포 환경 변수 (v1.0에서 사용, 실제 값은 쓰지 않음)

| 서비스 | 변수 이름 | 예시 값 | 설명 |
| --- | --- | --- | --- |
| Render | `DATABASE_URL` | `postgresql+psycopg://...` | Neon main 브랜치 주소 |
| Render | `CORS_ORIGINS` | `https://○○.vercel.app` | 허용할 화면 주소, 쉼표로 여러 개, 끝에 `/` 없이 |
| Vercel | `NEXT_PUBLIC_API_URL` | `https://○○.onrender.com` | 서버 주소, 끝에 `/` 없이 |

Render 설정: Root Directory `backend`, Build `pip install uv && uv sync --frozen`,
Start `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`, Health Check `/health`
(`uv sync`를 처음 실행하면 생기는 `backend/uv.lock`을 꼭 커밋하세요. `--frozen`이 이 파일을 씁니다.)

## 개인정보
테스트와 시연에는 가짜 데이터만 씁니다. 화면의 연락처는 `010-****-5678`처럼 가려서 보여줍니다.
