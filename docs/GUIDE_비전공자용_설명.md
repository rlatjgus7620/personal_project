# 비전공자용 설명서 — 이 프로젝트는 어떻게 만들어졌나

> 코드를 한 줄씩 다 이해하지 않아도 괜찮습니다. 이 문서의 목표는
> "어떤 파일이 무슨 일을 하는지, 버튼 하나를 누르면 무슨 일이 일어나는지"를 말로 설명할 수 있게 되는 것입니다.

---

## 1. 이 앱이 하는 일

운영 담당자가 **신청자를 등록**하고, 행사 날 **참석을 체크**하고, **프로그램별로 골라 보는** 웹 앱입니다.
Todo 앱과 뼈대가 거의 같습니다. 바뀐 건 이것뿐입니다.

| Todo 앱 | 이 앱 | 
|---|---|
| 할 일 제목 (`title`) | 이름 (`name`) + 연락처 (`phone`) + 프로그램 (`program`) |
| 완료 여부 (`completed`) | 참석 여부 (`attended`) |
| 전체 / 진행 중 / 완료 필터 | 전체 / 참석 / 미참석 + 프로그램 + 이름 검색 |
| 제목 더블클릭 수정 | "수정" 버튼으로 세 항목 수정 |
| (없음) | 같은 연락처의 중복 신청 막기, 연락처 가리기, 인원 요약 |

---

## 2. 큰 그림 — 식당에 비유하면

```text
 [손님이 보는 홀]        [주문서]          [주방]            [창고]
  화면 (Next.js)  →   API (JSON)   →  서버 (FastAPI)  →  DB (SQLite/Postgres)
  app/, src/          applicantApi.ts   backend/app/       backend/dev.db
```

- **화면(프런트엔드)**: 사람이 보고 클릭하는 부분. 데이터를 직접 저장하지 않고 서버에 "주문"만 합니다.
- **API**: 화면과 서버가 주고받는 약속된 주문서. "이 주소로, 이런 모양의 JSON을 보내면, 이런 답을 준다"가 `docs/API_SPEC.md`에 적혀 있습니다.
- **서버(백엔드)**: 주문을 받아 규칙에 맞는지 검사하고 창고에 넣거나 꺼냅니다.
- **DB(데이터베이스)**: 서버를 껐다 켜도 데이터가 남는 창고입니다.

화면과 서버가 따로 있기 때문에 **터미널을 2개** 띄워서 둘 다 실행해야 합니다.

---

## 3. 왜 문서부터 썼나 (docs 폴더)

수업 가이드의 첫째 원칙: **"문서가 먼저, 코드는 나중."** 클로드(AI)는 문서를 기준으로 판단하기 때문에, 문서가 없으면 추측하고 추측은 내 의도와 어긋납니다.

| 순서 | 문서 | 한 줄 요약 | 이 프로젝트에서 정한 것 |
|---|---|---|---|
| 1 | `IDEA.md` | 무엇을 만들고 **무엇을 빼는가** | 로그인·정원·엑셀은 지금 안 함 |
| 2 | `CLAUDE.md` (최상위) | 클로드의 업무 수칙 | "명세에 없는 기능 금지", "실제 개인정보 금지" |
| 3 | `PRD.md` | 기능 목록 F-01~F-10과 화면 문구 | "신청자가 없습니다" 같은 문구 확정 |
| 4 | `TRD.md` | 어떤 기술, 어떤 폴더 구조 | 버튼 → DB까지 10단계 흐름 |
| 5 | `DATA_MODEL.md` | 저장할 칸(필드)과 규칙 | 이름 1~20자, 연락처 `010-0000-0000` |
| 6 | `API_SPEC.md` | 주소·요청·응답·에러 | 중복이면 409 |
| 7 | `COMPONENT_SPEC.md` | 화면 부품과 동작 | 수정 중 Esc = 취소 |
| 8 | `TEST_CASES.md` | "완성"의 기준표 | 테스트 ID 60여 개 |

**팁:** 기능 ID(F-01)와 테스트 ID(UI-01)가 문서끼리 연결되어 있습니다. `TEST_CASES.md` 맨 아래 표를 보면 "이 기능은 이 테스트들이 지킨다"가 한눈에 보입니다.

---

## 4. 폴더 지도 — 파일마다 무슨 일을 하나

### 화면 쪽 (프로젝트 최상위)

| 파일 | 하는 일 | 가이드 STEP |
|---|---|---|
| `app/page.tsx` | **지휘자.** 명단 데이터를 갖고 있고, 서버를 부르고, 부품들을 배치 | 10-5, 11-9, 13-4 |
| `app/layout.tsx` | 모든 페이지를 감싸는 틀 (제목, 배경색) | 9 |
| `src/types/applicant.ts` | 신청자가 어떤 칸을 가지는지 정한 **설계도(타입)** | 10-1 |
| `src/components/ApplicantForm.tsx` | 등록 입력칸 3개 + 등록 버튼 | 10-4 |
| `src/components/ApplicantItem.tsx` | 신청자 한 줄 (참석 체크, 수정, 삭제) | 10-2, 13-3 |
| `src/components/ApplicantList.tsx` | 여러 줄을 목록으로, 0명이면 안내 문구 | 10-3 |
| `src/components/ApplicantSummary.tsx` | "전체 N명 · 참석 M명" | 10 |
| `src/components/ApplicantFilter.tsx` | 참석 여부 버튼, 프로그램 선택, 이름 검색 | 13-2 |
| `src/lib/applicantApi.ts` | 서버에 주문서를 보내는 함수 4개 | 11-9 |
| `src/lib/filterApplicants.ts` | 필터 조건으로 명단을 거르는 계산 | 13-1 |
| `src/lib/validation.ts` | 입력값 검사 (서버와 같은 규칙·문구) | 10-4 |
| `src/lib/format.ts` | 연락처 가리기, 날짜 모양 바꾸기 | 10-2 |
| `*.test.ts(x)` | 바로 옆 파일이 명세대로 동작하는지 자동 확인 | 매 STEP |

### 서버 쪽 (`backend/`)

| 파일 | 하는 일 | 가이드 STEP |
|---|---|---|
| `app/main.py` | 서버의 시작점. CORS 허락, 에러 모양 통일, 라우터 등록 | 11-2, 11-5 |
| `app/schemas.py` | 들어온 JSON 검사 (Pydantic). 규칙과 한국어 에러 문구 | 11-3 |
| `app/routers/applicants.py` | 주소별 처리: GET 조회, POST 등록, PATCH 수정, DELETE 삭제 | 11-6, 11-7 |
| `app/repository.py` | 저장소의 **약속**(Protocol) + 메모리 저장소 | 11-4 |
| `app/sql_repository.py` | 같은 약속을 지키는 **DB 저장소** | 12-4 |
| `app/deps.py` | 라우터에 어떤 저장소를 꽂아 줄지 결정 | 11-5, 12-5 |
| `app/models.py` | DB 테이블 모양 | 12-3 |
| `app/db.py` | DB 연결 | 12-3 |
| `app/config.py` | `.env` 설정 읽기 | 12-3 |
| `app/errors.py` | 404, 409용 에러 종류 | 11-5 |
| `alembic/versions/0001_...py` | 테이블을 만드는 기록(마이그레이션) | 12-3 |
| `tests/` | 서버 자동 테스트 | 11~12 |

---

## 5. "등록" 버튼을 누르면 일어나는 일

예: 이름 `김테스트`, 연락처 `010-1234-5678`, 프로그램 `모의면접`

1. **ApplicantForm**이 먼저 검사합니다 (`validation.ts`). 이름이 비었으면 여기서 "이름을 입력해 주세요."를 보여주고 끝.
2. 통과하면 `onAdd(...)`를 불러 **page.tsx**에 "등록해 줘"라고 알립니다. (부품은 직접 서버를 부르지 않음)
3. page.tsx의 `handleAdd`가 **applicantApi.ts**의 `createApplicant()`를 부릅니다.
4. `createApplicant()`가 `POST http://localhost:8000/api/applicants`로 JSON을 보냅니다.
   ```json
   { "name": "김테스트", "phone": "010-1234-5678", "program": "mock_interview" }
   ```
5. 서버의 **schemas.py**(`ApplicantCreate`)가 한 번 더 검사합니다. 화면 검사를 건너뛴 요청도 막기 위해서입니다.
6. **routers/applicants.py**의 `create_applicant()`가 저장소에게 `create()`를 시킵니다.
7. **sql_repository.py**가 같은 연락처+프로그램이 이미 있는지 확인합니다. 있으면 409 에러.
8. 없으면 DB의 `applicants` 테이블에 한 줄을 넣습니다. 번호(id)와 신청일은 자동.
9. 서버가 `201 Created`와 함께 저장된 신청자를 돌려줍니다. (`createdAt`처럼 camelCase로)
10. page.tsx가 받은 신청자를 명단 맨 위에 넣고, 화면이 다시 그려지고, 입력칸이 비워집니다.

실패하면? 서버가 `{ "error": { "code": "DUPLICATE_APPLICATION", "message": "이미 같은 프로그램에 신청한 연락처입니다." } }`를 보내고, 화면은 이 `message`를 빨간 알림으로 보여주며 **입력값은 그대로 둡니다**(고쳐서 다시 등록할 수 있게).

---

## 6. 꼭 알아야 할 개념 10가지 (쉬운 말 버전)

1. **컴포넌트**: 화면을 레고 블록처럼 나눈 부품. `ApplicantItem`은 "한 사람 줄" 블록입니다.
2. **Props**: 부모가 부품에게 건네주는 재료. `ApplicantItem`은 `applicant`(데이터)와 `onDelete`(눌렸을 때 알릴 함수)를 받습니다.
3. **useState**: 화면이 기억하는 값. 값이 바뀌면 React가 화면을 다시 그립니다. 명단, 필터, 입력 중인 글자가 여기에 있습니다.
4. **HTTP 메서드**: 주문의 종류. GET=보여줘, POST=새로 만들어, PATCH=일부 고쳐, DELETE=지워.
5. **상태 코드**: 서버의 대답 번호. 200 성공, 201 만들었음, 204 지웠음(내용 없음), 400 입력이 틀림, 404 없음, 409 충돌(중복).
6. **JSON과 camelCase**: 화면과 서버가 주고받는 글 형식. 자바스크립트 관례에 맞춰 `createdAt`처럼 쓰고, 파이썬 안에서는 `created_at`으로 씁니다. 바꿔 주는 일은 `schemas.py`의 `CamelModel`이 합니다.
7. **저장소 분리(Repository)**: 라우터는 "저장해 줘"만 말하고, 어디에 저장하는지는 모릅니다. 멀티탭 콘센트처럼 메모리 저장소를 꽂으면 테스트용, DB 저장소를 꽂으면 실제용이 됩니다. 그래서 v0.3에서 DB를 붙일 때 라우터와 API 테스트를 하나도 안 고쳤습니다.
8. **마이그레이션(Alembic)**: DB 테이블을 만들고 바꾼 기록. "DB용 Git"이라고 생각하면 됩니다. `uv run alembic upgrade head` = "기록대로 테이블을 최신 상태로 만들어".
9. **환경 변수(.env)**: 서버 주소나 DB 비밀번호처럼 컴퓨터마다 다르거나 비밀인 값. 코드에 직접 쓰지 않고 `.env` 파일에 두며, **Git에 올리지 않습니다**(.gitignore).
10. **CORS**: 브라우저의 보안 규칙. 3000번(화면)에서 8000번(서버)을 부르려면 서버가 "3000번은 괜찮아"라고 허락해야 합니다. `main.py`의 `CORSMiddleware`가 그 허락입니다.

### 테스트는 왜 있나 (Red → Green → Refactor)
테스트는 **명세를 코드로 적어 둔 자동 검사표**입니다. 예를 들어 `UI-02` 테스트는 "이름이 비었으면 등록되면 안 된다"를 매번 자동으로 확인합니다.
- Red: 테스트만 먼저 쓰고 실패하는 걸 본다 (아직 기능이 없으니까)
- Green: 테스트를 통과하는 최소한의 코드를 쓴다
- Refactor: 기능은 그대로 두고 읽기 쉽게 정리한다

나중에 새 기능을 넣다가 예전 기능이 망가지면 테스트가 빨간불로 바로 알려줍니다.

---

## 7. 내 컴퓨터에서 실행하기 (Windows)

VS Code에서 `C:\mushroom\personal_project`를 연 상태로, 메뉴 **터미널 → 새 터미널**(PowerShell)에서 진행합니다.

**① 프로그램 확인** — 버전이 나오면 OK
```powershell
node -v
python --version
uv --version
```
`uv`가 없다면: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"` 실행 후 VS Code를 껐다 켜기

**② 처음 한 번만: 설치와 테이블 만들기**
```powershell
npm install
copy .env.example .env.local
cd backend
uv sync
uv run alembic upgrade head
```
마지막 줄 결과에 `Running upgrade -> 0001, create applicants`가 보이면 `backend/dev.db` 파일에 테이블이 생긴 것입니다.

**③ 서버 켜기** (지금 터미널, backend 폴더에서)
```powershell
uv run fastapi dev app/main.py
```
브라우저에서 `http://localhost:8000/docs`를 열면 API 시험 화면(Swagger)이 나옵니다.

**④ 화면 켜기** (터미널 오른쪽 위 `+`로 새 터미널, 최상위 폴더에서)
```powershell
npm run dev
```
브라우저에서 `http://localhost:3000`을 엽니다.

**⑤ 테스트 돌리기** (서버·화면을 끈 터미널이나 새 터미널에서)
```powershell
npm test
cd backend
uv run pytest
uv run pytest -m db
```
모두 `passed`(초록)면 성공입니다. 실패가 있으면 테스트 이름 앞의 ID(예: `API-05`)를 `TEST_CASES.md`에서 찾아보세요.

### 직접 확인해 볼 것 (TEST_CASES.md 7절)
- [ ] 가짜 신청자 3명 등록 → 최신 등록자가 맨 위, 연락처는 `010-****-5678`처럼 보임
- [ ] 같은 연락처로 같은 프로그램을 또 등록 → 빨간 알림, 입력값 유지
- [ ] 참석 체크 → 초록 배경 + "참석 완료", 위쪽 요약 숫자 변화
- [ ] "미참석" 필터에서 체크하면 목록에서 바로 사라짐
- [ ] 수정 → 이름 바꾸고 Enter → 새로고침해도 유지 / Esc는 취소
- [ ] 서버 터미널에서 `Ctrl+C`로 끄고 새로고침 → "서버에 연결할 수 없습니다..." 표시
- [ ] 서버를 다시 켜면 명단이 그대로 남아 있음 (DB 저장)

---

## 8. 자주 막히는 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| 화면에 "서버에 연결할 수 없습니다" | 서버(터미널 1)가 안 켜짐 | `backend`에서 `uv run fastapi dev app/main.py` |
| 서버 로그에 `no such table: applicants` | 테이블을 안 만듦 | `backend`에서 `uv run alembic upgrade head` |
| F12 콘솔에 `CORS` 에러 | 화면 주소가 허락 목록에 없음 | `backend/.env`의 `CORS_ORIGINS` 확인 (끝에 `/` 없이) |
| `uv`를 찾을 수 없음 | uv 미설치 또는 VS Code 재시작 필요 | 위 설치 명령 후 VS Code 재시작 |
| `npm test`에서 `Cannot find module` | `npm install`을 안 함 | 최상위 폴더에서 `npm install` |
| 응답이 400이어야 하는데 422 | 에러 핸들러 누락 | `main.py`의 `handle_validation_error` 확인 |

막히면 클로드 코드에게 이렇게 물어보세요: "고치지 말고 가능한 원인 3가지를 가능성 높은 순서로 말해줘. (에러 붙여넣기)"

---

## 9. 이 코드로 공부하는 방법

이 폴더는 가이드의 **v0.4까지 완성된 결과물**입니다. 수업처럼 단계별로 직접 만들어 보고 싶다면:

1. 이 폴더는 "정답지"로 두고, 새 폴더에서 `docs/`와 `CLAUDE.md`만 복사해 시작합니다.
2. 가이드의 프롬프트(P10-1, P10-2a …)에서 `Todo`를 `Applicant`로, 테스트 ID를 이 프로젝트의 `TEST_CASES.md` ID로 바꿔서 보냅니다.
3. 막히면 이 폴더의 같은 파일과 비교합니다.

Git을 쓴다면 지금 상태를 먼저 저장해 두세요.
```powershell
git init
git add .
git commit -m "feat: v0.4 신청·참석 관리 (명세, FastAPI, Next.js)"
git tag v0.4
```

---

## 10. 다음 단계

| 버전 | 할 일 | 새로 배우는 것 |
|---|---|---|
| v1.0 | Render(서버) + Vercel(화면) + Neon(DB) 배포 (가이드 STEP 14, README의 환경 변수 표) | 배포, 환경 변수, CORS |
| v1.1 | 프로그램을 별도 테이블로 분리 (일정, 정원) | 테이블 2개와 관계(1:N) |
| v1.2 | 정원 초과 시 신청 막기 | 서버 쪽 업무 규칙 |
| v1.3 | 명단 CSV 내보내기 | 파일 다운로드 |
| v1.4 | 회차별 출석부, 출석률 | 날짜별 기록 테이블 |

새 기능도 같은 순서입니다: **IDEA에 적기 → 명세 문서 고치기 → 테스트(Red) → 구현(Green) → 정리(Refactor) → 커밋.**

---

## 11. 면접에서 이렇게 설명할 수 있어요

- **왜 이 주제?** "교육 프로그램에 참여해 본 경험에서, 운영 쪽에서는 신청자 명단과 참석 확인이 반복되는 업무라고 생각해 이를 한 화면으로 관리하는 도구를 만들었습니다."
- **실무 감각:** 연락처 가리기, 중복 신청 막기, 가짜 데이터만 사용하는 개인정보 원칙을 처음부터 명세에 넣었습니다.
- **개발 방식:** 문서(명세)를 먼저 쓰고 AI에게 작은 단위로 지시했으며, 테스트 ID로 기능과 테스트를 연결해 "완성"의 기준을 분명히 했습니다.
