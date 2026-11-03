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
│  ├─ page.tsx                  # 로그인 여부를 보고 로그인 화면 또는 관리 화면을 보여줌 (v2.0)
│  └─ globals.css               # Tailwind 불러오기
│
├─ src/
│  ├─ components/               # 화면 부품 (+ 같은 이름의 .test.tsx)
│  │  ├─ ApplicantForm.tsx      # 신청자 등록 폼
│  │  ├─ ApplicantList.tsx      # 명단 목록
│  │  ├─ ApplicantItem.tsx      # 신청자 한 줄 (참석 체크, 수정, 삭제 확인)
│  │  ├─ ApplicantFilter.tsx    # 참석 여부·프로그램 필터, 이름 검색
│  │  ├─ ApplicantSummary.tsx   # 전체 N명 · 참석 M명
│  │  ├─ ProgramSummary.tsx     # 프로그램별 신청·참석 인원, 참석률, 정원·마감
│  │  ├─ ProgramManager.tsx     # 프로그램 목록·추가·수정·삭제 (v1.2)
│  │  ├─ ProgramForm.tsx        # 프로그램 이름·기간·장소·정원 입력 (v1.2)
│  │  ├─ AttendanceBook.tsx     # 회차 출석부: 회차 추가·삭제, 회차별 출석 체크 (v1.3)
│  │  ├─ AdminDashboard.tsx     # 로그인 뒤의 관리 화면 전체 (데이터 불러오기·저장) (v2.0)
│  │  ├─ LoginForm.tsx          # 관리자 로그인 화면 (v2.0)
│  │  └─ ExportButton.tsx       # 명단 CSV 내보내기
│  ├─ lib/                      # 화면과 분리된 함수 (+ .test.ts)
│  │  ├─ applicantApi.ts        # FastAPI를 부르는 함수 모음
│  │  ├─ validation.ts          # 입력값 검사 (서버와 같은 규칙·문구)
│  │  ├─ filterApplicants.ts    # 필터 계산
│  │  ├─ format.ts              # 연락처 가리기, 하이픈 자동 입력, 날짜·기간 표시
│  │  ├─ programs.ts            # 프로그램 이름 찾기, 신청자 수·마감 계산 (v1.2)
│  │  ├─ attendance.ts          # 회차 정렬, 출석 횟수·참석 여부 계산 (v1.3)
│  │  ├─ authStorage.ts         # 로그인 토큰을 sessionStorage에 저장·읽기·지우기 (v2.0)
│  │  └─ report.ts              # CSV 만들기, 프로그램별 요약 계산
│  ├─ types/applicant.ts        # 공유 타입 (신청자, 프로그램, 회차, 출석)
│  └─ test-utils/               # 테스트용 가짜 데이터 (makeApplicant, makeProgram, makeSession)
│
└─ backend/                     # FastAPI 서버
   ├─ pyproject.toml            # 서버 쪽 패키지와 pytest 설정
   ├─ uv.lock                   # 설치된 패키지 버전 고정
   ├─ .env.example              # 서버용 환경 변수 예시 (DB 주소, CORS)
   ├─ alembic.ini               # DB 마이그레이션 설정
   ├─ alembic/versions/         # 테이블을 만들고 바꾼 기록 (0001 신청자, 0002 프로그램 분리, 0003 회차·출석)
   ├─ app/
   │  ├─ main.py                # 서버 시작점: CORS, 에러 형식 통일, 라우터 등록
   │  ├─ routers/applicants.py  # /api/applicants 주소별 처리 (GET·POST·PATCH·DELETE)
   │  ├─ routers/programs.py    # /api/programs 주소별 처리 (v1.2)
   │  ├─ routers/sessions.py    # 회차·출석 주소별 처리 (v1.3)
   │  ├─ routers/auth.py        # 로그인 주소 (v2.0)
   │  ├─ auth.py                # require_admin: 토큰이 없으면 401 (v2.0)
   │  ├─ security.py            # 토큰 만들기·검사, 로그인 시도 제한 (FastAPI 없이 순수 함수) (v2.0)
   │  ├─ schemas.py             # 요청·응답 검사 (Pydantic)
   │  ├─ repository.py          # 저장소 약속(Protocol) + 메모리 저장소
   │  ├─ sql_repository.py      # DB 저장소
   │  ├─ deps.py                # 라우터에 저장소를 넣어 주는 곳 (get_repo)
   │  ├─ models.py              # DB 테이블 정의 (programs, applicants, sessions, attendances)
   │  ├─ db.py                  # DB 연결과 세션
   │  ├─ config.py              # .env 설정 읽기
   │  └─ errors.py              # 404·409·업무 규칙 에러 (정원 초과 등)
   └─ tests/                    # pytest 테스트 (입력 검사, 저장소, 로그인, 신청자·프로그램·회차 API)
```

## 3. 데이터 흐름 — "등록" 버튼을 누르고 DB에 저장되기까지

1. 담당자가 `ApplicantForm`에 이름·연락처·프로그램을 넣고 **등록**을 누른다.
2. `ApplicantForm`이 빈 이름, 연락처 형식을 먼저 검사한다. 틀리면 문구만 보여주고 멈춘다.
3. 통과하면 `AdminDashboard.tsx`(v1.3까지는 `page.tsx`)의 `handleAdd`가 `applicantApi.ts`의 `createApplicant()`를 부른다.
4. `createApplicant()`가 `POST http://localhost:8000/api/applicants`로 JSON(`name`, `phone`, `programId`)을 보낸다. v2.0부터는 `Authorization: Bearer {토큰}` 머리글도 붙인다.
5. (v2.0) FastAPI가 먼저 `require_admin`으로 토큰을 확인한다. 없거나 틀리면 401로 멈춘다.
6. Pydantic(`ApplicantCreate`)으로 입력을 다시 검사한다. 틀리면 400.
7. 라우터가 `get_repo()`로 받은 저장소의 `create()`를 부른다.
8. 저장소가 프로그램이 있는지(없으면 400), 같은 연락처+프로그램이 있는지(있으면 409), 정원이 찼는지(찼으면 409) 확인한다.
9. SQL 저장소가 `applicants` 테이블에 한 줄을 넣고(`program_id`는 `programs.id`를 가리키는 외래 키), 만들어진 행을 돌려준다.
10. FastAPI가 `ApplicantOut`으로 바꿔 camelCase JSON + 201로 응답한다.
11. `AdminDashboard.tsx`가 응답 받은 신청자를 목록 맨 위에 넣고 화면을 다시 그린다.

```text
화면(ApplicantForm) → AdminDashboard.tsx → applicantApi.ts → FastAPI 라우터 → 저장소 → DB
```

v1.2부터 8번 단계에서 **프로그램이 있는지, 정원이 찼는지**도 저장소가 함께 확인합니다.
정원 같은 업무 규칙은 화면(선택지 비활성화)과 서버(409 응답) 양쪽에서 지키되, **최종 판단은 서버**가 합니다.
화면만 막으면 다른 창에서 동시에 신청할 때 정원을 넘을 수 있기 때문입니다.

## 3-1. 로그인과 토큰 (v2.0)

담당자가 1명이라 회원 테이블 없이 **비밀번호 하나**(`backend/.env`의 `ADMIN_PASSWORD`)만 씁니다.

1. 로그인 화면에서 비밀번호를 보내면(`POST /api/auth/login`) 서버가 `.env`의 값과 비교한다. (`hmac.compare_digest`: 비교 시간으로 비밀번호를 추측하지 못하게)
2. 맞으면 서버가 **토큰**(출입증)을 만든다. 모양은 `{만료 시각}.{서명}`이고, 서명은 `AUTH_SECRET`으로 만든 HMAC-SHA256 값이다.
3. 화면은 토큰을 `sessionStorage`에 넣어 두고, 이후 모든 요청에 `Authorization: Bearer {토큰}`을 붙인다. (`sessionStorage`는 탭을 닫으면 지워진다 → 자동 로그아웃)
4. 서버는 `/api/...` 요청마다 `require_admin`(의존성)으로 서명과 만료 시각을 확인한다. 틀리면 401.
5. 화면은 401을 받으면 토큰을 지우고 로그인 화면으로 돌아간다.

- 토큰을 DB에 저장하지 않는다. 서명만 맞으면 통과하므로 서버를 여러 대 켜도 같은 `AUTH_SECRET`이면 된다.
- 비밀번호를 1분 안에 5번 틀리면 1분 동안 로그인을 막는다(`LoginLimiter`, 서버 메모리). 담당자 1명용이라 IP별로 나누지 않는다.
- 비밀번호·토큰은 코드, 문서, 로그(print)에 남기지 않는다.

## 4. 저장소(Repository) 분리
- 라우터는 `Depends(get_repo)`로 받은 저장소만 쓴다. DB를 직접 모른다.
- 테스트에서는 메모리 저장소를, 실제 실행에서는 SQL 저장소를 끼운다.
- 그래서 v0.2 → v0.3에서 DB를 붙일 때 라우터와 API 테스트는 바뀌지 않는다.

## 5. 에러 처리
- 응답 형식: `{ "error": { "code": "...", "message": "..." } }`
- FastAPI 기본 422 검증 에러 → 400 `VALIDATION_ERROR`로 바꾼다.
- 없는 id → 404 `NOT_FOUND`, 중복 신청 → 409 `DUPLICATE_APPLICATION`
- v1.2: 정원 초과 → 409 `PROGRAM_FULL`, 프로그램 이름 중복 → 409 `DUPLICATE_PROGRAM`, 신청자가 있는 프로그램 삭제 → 409 `PROGRAM_IN_USE`
- v2.0: 토큰 없음·만료 → 401 `UNAUTHORIZED`, 비밀번호 틀림 → 401 `INVALID_PASSWORD`, 너무 많이 틀림 → 429 `TOO_MANY_ATTEMPTS`
- v1.3: 같은 날짜 회차 → 409 `DUPLICATE_SESSION`, 출석 기록이 있는 신청자를 다른 프로그램으로 옮김 → 409 `HAS_ATTENDANCE`, 다른 프로그램 신청자 출석 체크 → 400
- 이런 에러는 모두 `errors.py`의 `AppError`를 물려받고(상태 코드·코드·문구를 가짐), `main.py`의 핸들러 하나가 같은 형식으로 응답한다. 새 규칙이 생겨도 에러 클래스만 하나 추가하면 된다.
- 화면은 서버의 `error.message`를 그대로 사용자에게 보여준다.
- 서버에 연결조차 안 되면 "서버에 연결할 수 없습니다..." 문구를 보여준다.

## 6. 환경 변수

| 위치 | 이름 | 예시 | 설명 |
|---|---|---|---|
| 프런트 `.env.local` | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | 백엔드 주소, 끝에 `/` 없이 |
| `backend/.env` | `DATABASE_URL` | `sqlite:///./dev.db` | 비우면 SQLite 기본값. 배포 때는 `postgresql+psycopg://...` |
| `backend/.env` | `DATABASE_URL_TEST` | `sqlite:///./test.db` | `pytest -m db`용 DB. 비우면 SQLite 기본값 |
| `backend/.env` | `ADMIN_PASSWORD` | (직접 정함, 문서에 적지 않음) | 관리자 로그인 비밀번호 (v2.0). 비우면 로그인이 안 됨(503) |
| `backend/.env` | `AUTH_SECRET` | (긴 무작위 문자열) | 토큰 서명용 비밀 키 (v2.0). 비우면 서버를 켤 때마다 새로 만듦 → 서버를 다시 켜면 다시 로그인. 배포 때는 꼭 넣기 |
| `backend/.env` | `CORS_ORIGINS` | 비우면 `localhost`·`127.0.0.1`의 3000·3001번 | 허용할 화면 주소, 쉼표로 여러 개. 화면이 3001번으로 켜져도 연결되도록 기본값에 포함 |

`.env`, `.env.local`은 Git에 올리지 않는다. 대신 `.env.example`에 키 이름만 적어 둔다.
