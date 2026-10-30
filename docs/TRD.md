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
├─ CLAUDE.md                    # 클로드 작업 규칙 (기술 스택, 폴더 구조, 금지 사항)
├─ README.md                    # 프로젝트 소개, 실행 방법 (지금 보는 문서)
├─ package.json                 # 화면 쪽 패키지와 명령 (npm run dev:all 등)
├─ dev-all.ps1                  # 서버와 화면을 터미널 하나로 켜는 스크립트
├─ .env.example                 # 화면용 환경 변수 예시 (NEXT_PUBLIC_API_URL)
│
├─ docs/                        # 명세 문서 (코드보다 먼저 씀)
│  ├─ IDEA.md                   # 아이디어, MVP, 빼는 것, 버전 로드맵
│  ├─ PRD.md                    # 기능 목록(F-01~), 사용자 스토리, 화면 문구
│  ├─ TRD.md                    # 기술 선택 이유, 폴더 구조, 데이터 흐름
│  ├─ DATA_MODEL.md             # 테이블과 필드, 검사 규칙
│  ├─ API_SPEC.md               # API 주소, 요청·응답, 에러 형식
│  ├─ COMPONENT_SPEC.md         # 화면 부품, Props, 동작과 문구
│  ├─ TEST_CASES.md             # 테스트 ID와 기대 결과 ("완성"의 기준)
│  └─ images/screenshot.png     # README용 실행 화면
│
├─ app/                         # Next.js 페이지
│  ├─ layout.tsx                # 모든 페이지를 감싸는 틀
│  ├─ page.tsx                  # 메인 화면 (데이터와 서버 호출을 맡는 "지휘자")
│  └─ globals.css               # Tailwind 불러오기
│
├─ src/
│  ├─ components/               # 화면 부품 (+ 같은 이름의 .test.tsx)
│  │  ├─ ApplicantForm.tsx      # 신청자 등록 폼
│  │  ├─ ApplicantList.tsx      # 명단 목록
│  │  ├─ ApplicantItem.tsx      # 신청자 한 줄 (참석 체크, 수정, 삭제 확인)
│  │  ├─ ApplicantFilter.tsx    # 참석 여부·프로그램 필터, 이름 검색
│  │  ├─ ApplicantSummary.tsx   # 전체 N명 · 참석 M명
│  │  ├─ ProgramSummary.tsx     # 프로그램별 신청·참석 인원과 참석률
│  │  └─ ExportButton.tsx       # 명단 CSV 내보내기
│  ├─ lib/                      # 화면과 분리된 함수 (+ .test.ts)
│  │  ├─ applicantApi.ts        # FastAPI를 부르는 함수 모음
│  │  ├─ validation.ts          # 입력값 검사 (서버와 같은 규칙·문구)
│  │  ├─ filterApplicants.ts    # 필터 계산
│  │  ├─ format.ts              # 연락처 가리기, 하이픈 자동 입력, 날짜 표시
│  │  └─ report.ts              # CSV 만들기, 프로그램별 요약 계산
│  ├─ types/applicant.ts        # 공유 타입, 프로그램 목록
│  └─ test-utils/makeApplicant.ts  # 테스트용 가짜 신청자
│
└─ backend/                     # FastAPI 서버
   ├─ pyproject.toml            # 서버 쪽 패키지와 pytest 설정
   ├─ uv.lock                   # 설치된 패키지 버전 고정
   ├─ .env.example              # 서버용 환경 변수 예시 (DB 주소, CORS)
   ├─ alembic.ini               # DB 마이그레이션 설정
   ├─ alembic/versions/         # 테이블을 만들고 바꾼 기록
   ├─ app/
   │  ├─ main.py                # 서버 시작점: CORS, 에러 형식 통일, 라우터 등록
   │  ├─ routers/applicants.py  # /api/applicants 주소별 처리 (GET·POST·PATCH·DELETE)
   │  ├─ schemas.py             # 요청·응답 검사 (Pydantic)
   │  ├─ repository.py          # 저장소 약속(Protocol) + 메모리 저장소
   │  ├─ sql_repository.py      # DB 저장소
   │  ├─ deps.py                # 라우터에 저장소를 넣어 주는 곳 (get_repo)
   │  ├─ models.py              # DB 테이블 정의
   │  ├─ db.py                  # DB 연결과 세션
   │  ├─ config.py              # .env 설정 읽기
   │  └─ errors.py              # 404·409용 에러
   └─ tests/                    # pytest 테스트 (입력 검사, 저장소, API)
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
