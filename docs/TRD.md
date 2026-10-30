# TRD — 기술 요구사항

> 이 문서는 "어떤 기술로, 어떤 구조로 만드는가"에 답합니다. 근거 문서: PRD.md, CLAUDE.md

## 1. 기술 스택과 고른 이유

| 영역 | 기술 | 왜 골랐나 (한 줄) |
|---|---|---|
| 화면 | Next.js 15 + React 19 | 수업에서 쓰는 도구이고, Vercel에 무료로 바로 배포된다 |
| 언어 | TypeScript | 필드 이름을 잘못 쓰면 실행 전에 빨간 줄로 알려준다 |
| 스타일 | Tailwind CSS | CSS 파일 없이 class 이름만으로 모양을 낸다 |
| 화면 테스트 | Jest + React Testing Library | 사용자가 클릭·입력하는 것처럼 화면을 자동으로 확인한다 |
| 서버 | FastAPI (Python) | 코드가 짧고, /docs 주소에 API 시험 화면(Swagger)을 자동으로 만들어 준다 |
| 입력 검사 | Pydantic v2 | "이름 1~20자" 같은 규칙을 한 줄로 적으면 자동으로 검사한다 |
| 패키지 관리 | uv | 파이썬 가상환경과 설치를 명령 하나로 처리한다 |
| DB 연결 | SQLAlchemy 2.0 | 파이썬 코드로 DB를 다룬다. SQLite ↔ Postgres를 주소만 바꿔 갈아끼울 수 있다 |
| DB 구조 관리 | Alembic | 테이블을 만들고 바꾼 기록을 파일로 남긴다 (DB용 Git) |
| 개발용 DB | SQLite | 설치·가입 없이 파일 하나로 바로 동작한다 |
| 배포용 DB | Neon Postgres | 무료 클라우드 DB. 배포한 서버가 여기에 저장한다 |

## 2. 폴더 구조

```text
personal_project/
├─ app/                     # Next.js 페이지 (layout.tsx, page.tsx)
├─ src/
│  ├─ components/           # 화면 부품과 테스트
│  ├─ lib/
│  │  ├─ applicantApi.ts    # FastAPI를 부르는 함수 모음
│  │  ├─ filterApplicants.ts# 필터 계산 (순수 함수)
│  │  └─ format.ts          # 연락처 가리기, 날짜 표시
│  └─ types/applicant.ts    # 공유 타입
├─ docs/                    # 명세 문서
└─ backend/
   ├─ app/
   │  ├─ main.py            # FastAPI 앱, CORS, 에러 핸들러 등록
   │  ├─ config.py          # .env 설정 읽기
   │  ├─ errors.py          # NotFoundError, DuplicateError
   │  ├─ schemas.py         # Pydantic 요청/응답 모델
   │  ├─ repository.py      # 저장소 약속(Protocol) + 메모리 저장소
   │  ├─ models.py          # DB 테이블 정의
   │  ├─ db.py              # DB 엔진과 세션
   │  ├─ sql_repository.py  # DB 저장소
   │  ├─ deps.py            # get_repo 의존성
   │  └─ routers/applicants.py # /api/applicants 엔드포인트
   ├─ alembic/              # 마이그레이션
   ├─ tests/
   └─ pyproject.toml
```

## 3. 데이터 흐름 — "등록" 버튼을 누르고 DB에 저장되기까지

1. 담당자가 `ApplicantForm`에 이름·연락처·프로그램을 넣고 **등록**을 누른다.
2. `ApplicantForm`이 빈 이름, 연락처 형식을 먼저 검사한다. 틀리면 문구만 보여주고 멈춘다.
3. 통과하면 `page.tsx`의 `handleAdd`가 `applicantApi.ts`의 `createApplicant()`를 부른다.
4. `createApplicant()`가 `POST http://localhost:8000/api/applicants`로 JSON을 보낸다.
5. FastAPI가 요청을 받아 Pydantic(`ApplicantCreate`)으로 다시 검사한다. 틀리면 400.
6. 라우터가 `get_repo()`로 받은 저장소의 `create()`를 부른다.
7. 저장소가 같은 연락처+프로그램이 있는지 확인한다. 있으면 409.
8. SQL 저장소가 `applicants` 테이블에 한 줄을 넣고, 만들어진 행을 돌려준다.
9. FastAPI가 `ApplicantOut`으로 바꿔 camelCase JSON + 201로 응답한다.
10. `page.tsx`가 응답 받은 신청자를 목록 맨 위에 넣고 화면을 다시 그린다.

```text
화면(ApplicantForm) → page.tsx → applicantApi.ts → FastAPI 라우터 → 저장소 → DB
```

## 4. 저장소(Repository) 분리
- 라우터는 `Depends(get_repo)`로 받은 저장소만 쓴다. DB를 직접 모른다.
- 테스트에서는 메모리 저장소를, 실제 실행에서는 SQL 저장소를 끼운다.
- 그래서 v0.2 → v0.3에서 DB를 붙일 때 라우터와 API 테스트는 바뀌지 않는다.

## 5. 에러 처리
- 응답 형식: `{ "error": { "code": "...", "message": "..." } }`
- FastAPI 기본 422 검증 에러 → 400 `VALIDATION_ERROR`로 바꾼다.
- 없는 id → 404 `NOT_FOUND`, 중복 신청 → 409 `DUPLICATE_APPLICATION`
- 화면은 서버의 `error.message`를 그대로 사용자에게 보여준다.
- 서버에 연결조차 안 되면 "서버에 연결할 수 없습니다..." 문구를 보여준다.

## 6. 환경 변수

| 위치 | 이름 | 예시 | 설명 |
|---|---|---|---|
| 프런트 `.env.local` | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | 백엔드 주소, 끝에 `/` 없이 |
| `backend/.env` | `DATABASE_URL` | `sqlite:///./dev.db` | 비우면 SQLite 기본값. 배포 때는 `postgresql+psycopg://...` |
| `backend/.env` | `DATABASE_URL_TEST` | `sqlite:///./test.db` | `pytest -m db`용 DB. 비우면 SQLite 기본값 |
| `backend/.env` | `CORS_ORIGINS` | 비우면 `localhost`·`127.0.0.1`의 3000·3001번 | 허용할 화면 주소, 쉼표로 여러 개. 화면이 3001번으로 켜져도 연결되도록 기본값에 포함 |

`.env`, `.env.local`은 Git에 올리지 않는다. 대신 `.env.example`에 키 이름만 적어 둔다.
