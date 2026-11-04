# TEST_CASES — 테스트 케이스

> 이 문서는 "제대로 동작하는지 어떻게 확인하는가"에 답합니다. "완성"의 기준입니다.
> 테스트 코드의 이름 앞에 아래 ID가 붙어 있어서, 실패하면 어느 줄인지 바로 찾을 수 있습니다.
> 테스트 데이터는 모두 가짜입니다. (김테스트, 010-1234-5678 등)

## 1. 백엔드 — 입력 검사 (backend/tests/test_schemas.py)

| ID | 대상 | 상황 | 기대 결과 | 기능 |
|---|---|---|---|---|
| VAL-01 | ApplicantCreate | 이름 `"  김테스트 "`, 바른 연락처·프로그램 | 통과, 이름은 `"김테스트"` | F-01 |
| VAL-02 | ApplicantCreate | 이름 `""`, `"   "`, 21자 | 실패 | F-02 |
| VAL-03 | ApplicantCreate | 연락처 `01012345678`, `010-123-4567`, `011-1234-5678` | 실패 | F-02 |
| VAL-04 | ApplicantCreate | `programId` 없음, `0` | 실패, "프로그램을 선택해 주세요." | F-02 |
| VAL-05 | ApplicantUpdate | `attended`만, `name`만 → 통과 / 빈 객체 → 실패 | | F-04, F-10 |
| VAL-06 | ApplicantOut | JSON으로 바꾸기 | 키가 `programId`, `createdAt`, `updatedAt` (camelCase) | F-03 |
| VAL-07 | ProgramCreate | 이름 `" 모의면접 "`, 장소 `"  "`, 정원 10 → 통과(이름 공백 제거, 장소 `None`) / 빈 이름, 31자, 정원 0·1000, 장소 51자, 종료일 < 시작일 → 실패 | | F-13, F-14 |
| VAL-09 | SessionCreate | 날짜 + 메모 `" OT "` → 통과(메모 `"OT"`), 메모 `"  "` → `None` / 날짜 없음, 메모 31자 → 실패 | | F-15 |
| VAL-10 | ProgramCreate·ProgramUpdate 수료 기준 | 안 보냄·`null` → 80, `"70"` → 70 / 0, 101, `true`, 문자 → 실패, 수정에서 `null` → 실패 | | F-19 |
| VAL-11 | SessionUpdate | 메모만 `null` → `{note: None}`, 날짜만 → 날짜 / 빈 객체, 날짜 `null`·빈 값, 메모 31자 → 실패 | | F-20 |
| VAL-12 | BulkCreate, validation_message | 1명 → 통과 / 0명·201명·프로그램 없음 → 실패, 줄 검사 에러가 "이름을 입력해 주세요."·"연락처는 …" 한국어 문구로 | | F-26 |
| VAL-08 | ProgramUpdate | `{"capacity": null}` → 통과(정원 비우기로 기록됨) / `{}`, `{"name": null}` → 실패 | | F-13, F-14 |

## 2. 백엔드 — 저장소 (test_repository.py, test_sql_repository.py)

메모리 저장소와 SQL 저장소가 **같은 테스트**를 통과해야 합니다. SQL 쪽은 `uv run pytest -m db`로 실행합니다.

| ID | 상황 | 기대 결과 | 기능 |
|---|---|---|---|
| REPO-01 | 2명 등록 후 list | 나중에 등록한 사람이 먼저, `attended=false`, id는 1부터 | F-01, F-03 |
| REPO-02 | update로 `attended=True` | 값이 바뀌고 `updated_at`이 갱신됨 | F-04 |
| REPO-03 | delete | `True`, 이후 list에 없음 | F-05 |
| REPO-04 | 없는 id로 update / delete | `None` / `False` (예외 없음) | F-05, F-10 |
| REPO-05 | 같은 연락처+프로그램으로 create, 또는 update로 중복을 만듦 | `DuplicateApplicationError` | F-08 |
| REPO-06 | 프로그램 추가 → 목록, 수정, 같은 이름 추가 | 만든 순서로 조회, 값이 바뀜, 같은 이름은 `DuplicateProgramError` | F-13 |
| REPO-07 | 정원 2명 프로그램에 3번째 등록, 다른 신청자를 그 프로그램으로 옮김 | 둘 다 `ProgramFullError`. 같은 프로그램 안에서 이름만 바꾸는 건 통과 | F-14 |
| REPO-08 | 신청자 2명인 프로그램의 정원을 1로 줄임 | `CapacityTooSmallError` | F-14 |
| REPO-09 | 신청자가 있는 프로그램 삭제 / 없는 프로그램 삭제 | `ProgramInUseError` / `True` | F-13 |
| REPO-10 | 없는 프로그램 번호로 신청 등록 | `InvalidProgramError` | F-02 |
| REPO-11 | 프로그램 목록의 `applicant_count` | 그 프로그램의 신청자 수와 같음 | F-14 |
| REPO-12 | 회차 2개를 날짜 역순으로 추가 → 목록, 같은 날짜 추가, 없는 프로그램에 추가 | 날짜순 / `DuplicateSessionError` / `None` | F-15 |
| REPO-13 | 출석 체크 → 다시 체크 → 해제 | 기록 1개(두 번 체크해도 1개), `attendee_count` 1 → 해제 후 0 | F-16 |
| REPO-14 | 다른 프로그램 신청자 체크 / 없는 회차 / 없는 신청자 | `NotInProgramError` / `SessionNotFoundError` / `NotFoundError` | F-16 |
| REPO-15 | 회차 삭제, 신청자 삭제, (신청자 없는) 프로그램 삭제 | 각각 관련 출석 기록·회차도 지워짐 | F-15, F-16 |
| REPO-16 | 출석 기록이 있는 신청자를 다른 프로그램으로 옮김 / 기록 없는 신청자 옮김 | `HasAttendanceError` / 통과 | F-16 |
| REPO-17 | 회차 날짜·메모 수정 | 출석 기록 그대로, 날짜순 다시 정렬, 다른 회차와 같은 날짜 → `DuplicateSessionError`, 자기 날짜 그대로 메모만 → 통과, 없는 id → `None` | F-20 |
| REPO-18 | 수료 기준 | 만들면 80, 60으로 수정 → 목록에도 60 | F-19 |
| REPO-19 | seed_demo (시연용 데이터) | 기본 프로그램이 있으면 내용만 채움, 프로그램·신청자·회차·출석 수가 정의와 같음, 연락처가 모두 `010-0000-`, 두 번째 실행은 `False`로 아무것도 안 함 | F-22 |
| REPO-20 | 회차 기간 검사 | 기간 11.10~11.12에 9일·13일 회차 추가, 20일로 수정 / 시작일을 11일로 줄임 / 종료일을 늘림 / 하루짜리 프로그램 | `SessionOutOfPeriodError`(문구에 기간) / `SessionsOutsidePeriodError` / 통과 / 시작일만 허용 | F-23 |

## 3. 백엔드 — API (backend/tests/test_applicants_api.py, test_programs_api.py)

신청자 API 테스트는 먼저 프로그램을 하나 만들고 그 번호(`programId`)로 신청합니다.

| ID | 대상 | 상황 | 기대 결과 | 기능 |
|---|---|---|---|---|
| API-01 | POST | 바른 입력 | 201, `attended=false`, 키는 camelCase | F-01 |
| API-02 | POST | 빈 이름 | 400, `VALIDATION_ERROR`, "이름을 입력해 주세요." | F-02 |
| API-03 | POST | 연락처 `01012345678` | 400, `VALIDATION_ERROR`, 연락처 형식 문구 | F-02 |
| API-04 | POST | `programId` 0 / 없는 번호 999 | 400, `VALIDATION_ERROR`, "프로그램을 선택해 주세요." / "선택한 프로그램이 없습니다." | F-02 |
| API-05 | POST | 같은 연락처 + 같은 프로그램 두 번 | 두 번째는 409, `DUPLICATE_APPLICATION` | F-08 |
| API-06 | POST | 같은 연락처 + 다른 프로그램 | 201 | F-08 |
| API-07 | GET | 2명 등록 후 조회 | 200, 최신순 | F-03 |
| API-08 | PATCH | `{"attended": true}` | 200, 값 바뀜, `updatedAt` 갱신 | F-04 |
| API-09 | PATCH | 이름·연락처·프로그램 수정 | 200, 세 값 모두 바뀜 | F-10 |
| API-10 | PATCH | `{}` | 400, `VALIDATION_ERROR` | F-10 |
| API-11 | PATCH | `/api/applicants/999` | 404, `NOT_FOUND` | F-10 |
| API-12 | PATCH | `/api/applicants/abc` | 400, `VALIDATION_ERROR` | F-10 |
| API-13 | DELETE | 있는 id | 204, 본문 비어 있음, 이후 GET에 없음 | F-05 |
| API-14 | DELETE | `/api/applicants/999` | 404, `NOT_FOUND` | F-05 |
| API-15 | GET /health | | 200, `{"status": "ok"}` | — |
| API-16 | CORS | 화면 주소가 `localhost:3000`, `localhost:3001`, `127.0.0.1:3000` | 세 주소 모두 허용 헤더가 붙음 | — |
| API-17 | POST /api/programs | 이름·기간·장소·정원 | 201, 키 `startDate`·`endDate`·`location`·`capacity`, `applicantCount=0` | F-13 |
| API-18 | POST /api/programs | 빈 이름 / 같은 이름 두 번 | 400 "프로그램 이름을 입력해 주세요." / 409 `DUPLICATE_PROGRAM` | F-13 |
| API-19 | GET /api/programs | 프로그램 2개, 한쪽에 신청자 2명 | 200, 만든 순서, `applicantCount` 2와 0 | F-13 |
| API-20 | PATCH /api/programs/{id} | 장소·정원 수정 / `capacity: null` / 999 | 200 값 바뀜 / 200 정원 `null` / 404 `NOT_FOUND` | F-13 |
| API-21 | PATCH /api/programs/{id} | 신청자 2명인데 정원 1 | 400 `VALIDATION_ERROR` "지금 신청자(2명)보다 정원을 적게 줄일 수 없습니다." | F-14 |
| API-22 | DELETE /api/programs/{id} | 신청자 있음 / 없음 / 999 | 409 `PROGRAM_IN_USE` / 204 / 404 | F-13 |
| API-23 | POST /api/applicants | 정원 1명 프로그램에 2번째 신청 | 409 `PROGRAM_FULL` "정원이 가득 찼습니다. (정원 1명)" | F-14 |
| API-24 | PATCH /api/applicants/{id} | 마감된 다른 프로그램으로 옮김 | 409 `PROGRAM_FULL` | F-14 |
| API-25 | POST /api/programs/{id}/sessions | 바른 입력 / 날짜 없음 / 같은 날짜 / 없는 프로그램 | 201 `attendeeCount=0` / 400 "회차 날짜를 입력해 주세요." / 409 `DUPLICATE_SESSION` / 404 | F-15 |
| API-26 | GET /api/sessions | 두 프로그램에 회차, 날짜를 섞어서 추가 | 프로그램 번호순, 그 안에서 날짜순, 키 `programId`·`sessionDate`·`note`·`attendeeCount` | F-15 |
| API-27 | PUT·DELETE /api/sessions/{id}/attendees/{applicantId}, GET /api/attendance | 체크 두 번 → 해제 두 번 | 모두 204, 체크 후 기록 1개, 해제 후 0개 | F-16 |
| API-28 | PUT /api/sessions/{id}/attendees/{applicantId} | 다른 프로그램 신청자 / 없는 회차 / 없는 신청자 | 400 "이 회차 프로그램의 신청자가 아닙니다." / 404 "회차를 찾을 수 없습니다." / 404 | F-16 |
| API-29 | DELETE /api/sessions/{id} | 출석 기록 있는 회차 / 없는 회차 | 204, 이후 출석 기록도 없음 / 404 | F-15 |
| API-30 | PATCH /api/applicants/{id} | 출석 기록이 있는데 `programId` 바꿈 | 409 `HAS_ATTENDANCE` | F-16 |
| API-36 | PATCH /api/sessions/{id} | 날짜 바꾸고 메모 `null` / 다른 회차 날짜 / `{}` / 없는 회차 | 200 / 409 `DUPLICATE_SESSION` / 400 "수정할 항목이 없습니다." / 404 | F-20 |
| API-37 | POST·PATCH /api/programs `completionRate` | 70으로 추가 → 100으로 수정 / 0, 101, `null`, 문자 | 200 / 400 "수료 기준은 1~100% 사이로 입력해 주세요." (API-17: 안 보내면 80) | F-19 |
| API-38 | 예상 못 한 에러 | 저장소가 `RuntimeError`를 냄 (Origin: localhost:3000) | 500 `INTERNAL_ERROR` "서버에서 오류가 발생했습니다…", 응답에 `access-control-allow-origin` 있음 | — |
| API-39 | 회차 기간 검사 | 기간 밖 회차 추가 / 회차를 밖으로 내보내는 기간 수정 | 400 "회차 날짜는 프로그램 기간(2026.11.10 ~ 2026.11.12) 안이어야 합니다." / 400 "바꾼 기간 밖에 회차가 있습니다…" | F-23 |
| API-40 | POST /api/applicants/bulk | 정원 3명(기존 1명)에 5줄: 정상·중복·형식 오류·정상·정원 초과 / 빈 목록 / 없는 프로그램 | 200, `created` 2명, `failed` 줄 번호·이유 3개 / 400 "등록할 명단이 없습니다." / 400 "선택한 프로그램이 없습니다." | F-26 |

## 3-1. 백엔드 — 로그인 (backend/tests/test_auth.py, test_auth_api.py, v2.0)

API 테스트의 `client`는 테스트용 비밀번호로 미리 로그인해서 토큰을 붙여 둔다. 아래 테스트는 토큰 없는 `anon` 클라이언트도 쓴다.

| ID | 대상 | 상황 | 기대 결과 | 기능 |
|---|---|---|---|---|
| AUTH-01 | make_token / verify_token | 바른 토큰 / 서명 한 글자 바꿈 / 만료 시각 바꿈 / 시간 지남 / 다른 비밀 키 / 엉뚱한 문자열 | 통과 / 나머지 모두 거부 | F-18 |
| AUTH-02 | LoginLimiter | 1분 안에 5번 실패 → 막힘, 1분 지나면 풀림, 성공하면 실패 횟수 초기화 | 시간(clock)을 바꿔 가며 확인 | F-17 |
| API-31 | POST /api/auth/login | 맞는 비밀번호 | 200, `token`·`expiresAt`, 이 토큰으로 GET /api/applicants 200 | F-17 |
| API-32 | POST /api/auth/login | 틀린 비밀번호 / 빈 비밀번호 | 401 `INVALID_PASSWORD` / 400 "비밀번호를 입력해 주세요." | F-17 |
| API-33 | 토큰이 필요한 주소 | 토큰 없음 / `Bearer 엉뚱한값` / 만료된 토큰으로 applicants·programs·sessions·attendance | 모두 401 `UNAUTHORIZED`, `/health`는 토큰 없이 200 | F-18 |
| API-34 | POST /api/auth/login | 틀린 비밀번호 5번 뒤 맞는 비밀번호 | 429 `TOO_MANY_ATTEMPTS` | F-17 |
| API-35 | POST /api/auth/login | 서버에 `ADMIN_PASSWORD`가 비어 있음 | 503 `AUTH_NOT_CONFIGURED` | F-17 |

## 4. 프런트 — 순수 함수 (src/lib/*.test.ts)

| ID | 대상 | 상황 | 기대 결과 | 기능 |
|---|---|---|---|---|
| LOGIC-01 | filterApplicants | 참석 여부 `all` / `attended` / `absent` | 전부 / 참석만 / 미참석만 | F-09 |
| LOGIC-02 | filterApplicants | 프로그램 번호 3 | 그 프로그램만 | F-09 |
| LOGIC-03 | filterApplicants | 검색어 `" 테스 "` (앞뒤 공백), 여러 조건 함께 | 이름에 "테스"가 들어간 사람 중 모든 조건을 만족하는 사람만 | F-09 |
| LOGIC-04 | filterApplicants | 실행 후 원본 배열 | 바뀌지 않음 | F-09 |
| LOGIC-05 | maskPhone | `010-1234-5678` | `010-****-5678` | F-03 |
| LOGIC-06 | formatDate | `2026-10-29T05:00:00Z` | `2026.10.29` | F-03 |
| LOGIC-07 | validateApplicant | 빈 이름 / 틀린 연락처 / 프로그램 안 고름(`""`) / 정상 | 각 문구 / `null` | F-02 |
| LOGIC-08 | formatPhoneInput | `"010"`, `"0101234"`, `"01012345678"`, `"010-1234-5678"`, `"010 1234 5678abc9"` | `"010"`, `"010-1234"`, `"010-1234-5678"`, 그대로, 숫자 11자리까지만 | F-02 |
| LOGIC-09 | toCsv (v2.1: 수료 칸 포함) | 2명 (한 명은 참석) | BOM + 머리글 줄 + 2줄, 프로그램 이름·참석/미참석·신청일 한국어로 | F-11 |
| LOGIC-10 | toCsv | 이름에 쉼표·따옴표, `=`로 시작하는 값 | 큰따옴표로 감싸고 `""`로 바꿈, 수식 방지 `'` 붙임 | F-11 |
| LOGIC-11 | summarizeByProgram | 프로그램 2개(정원 10, 제한 없음), 한쪽 3명 중 2명 참석 | 받은 순서대로, 67%, 정원·마감 여부 포함, 0명은 참석률 `null` | F-12, F-14 |
| LOGIC-12 | validateProgram (v2.1: 수료 기준 0·101·1.5 포함) | 빈 이름 / 31자 / 장소 51자 / 정원 `0`·`1000`·`1.5` / 종료일 < 시작일 / 정상 | 각 문구 (API_SPEC과 같음) / `null` | F-13, F-14 |
| LOGIC-13 | formatPeriod | (null, null) / (11-10, null) / (11-10, 11-10) / (11-10, 11-12) | `기간 미정` / `2026.11.10` / `2026.11.10` / `2026.11.10 ~ 2026.11.12` | F-13 |
| LOGIC-15 | sessionsOf, sessionTitle | 날짜가 섞인 회차 | 그 프로그램 것만 날짜순, `1회차 · 2026.11.10 (OT)`, 메모 없으면 괄호 없음 | F-15 |
| LOGIC-16 | applicantSessionStat, hasAttended | 회차 3개 중 2번 출석 / 회차 없는 프로그램 | `{ attended: 2, total: 3 }`·`true` / `null`·`attended` 값 그대로 | F-16 |
| LOGIC-17 | summarizeByProgram (회차) | 신청자 2명 × 회차 2개, 출석 기록 3개 | `sessionCount` 2, 출석률 75%, "참석한 사람"은 1회 이상 출석한 사람 수 | F-12, F-16 |
| LOGIC-18 | toCsv (회차) | 회차 프로그램 신청자 | 참석 칸이 `출석 2/3회` | F-11, F-16 |
| LOGIC-19 | saveToken, loadToken, clearToken | 저장 → 읽기 → 지우기 / sessionStorage가 에러를 던짐 | 같은 값 → `null` / 에러 없이 `null` | F-17 |
| LOGIC-20 | isCompleted, attendanceRate | 4/5회 기준 80 / 2/3회 기준 80·60 / 회차 0개 | 수료 / 미수료·수료 / 미수료, 출석률 67% | F-19 |
| LOGIC-21 | buildAttendanceSheet | 회차 2개(날짜 섞임), 신청자 2명 + 다른 프로그램 1명 | 이름순 × 날짜순, `O`, `1/2`, `50%`, 수료 기준 60%로 수료·미수료, 인쇄용은 연락처 가림 | F-21 |
| LOGIC-22 | sheetToCsv, sheetFileName, escapeHtml, sheetToHtml | CSV 한 줄, 파일 이름의 `/` → `_`, 이름이 `<img src=x>` | BOM + 쉼표 줄, `출석표_모의면접 1_2반_20261103.csv`, HTML에 태그가 그대로 들어가지 않음 | F-21 |
| LOGIC-23 | matchesKeyword | 이름 일부 / `5678`·`56`·`1234-5678` / 가운데 `1234`·끝 `78` | 맞음 / 맞음 / 안 맞음, 숫자 검색으로 명단 거르기 | F-25 |
| LOGIC-24 | todayInSeoul | UTC 15:30 / 14:59 | 한국 날짜로 다음 날 / 같은 날 | F-24 |
| LOGIC-25 | defaultSessionFor, defaultCheckInProgramId | 오늘 회차 있음 / 지난 회차만 / 앞으로 회차만 / 회차 없음 | 오늘 / 지난 마지막 / 첫 회차 / 없음, 오늘 회차 있는 프로그램 먼저 | F-24 |
| LOGIC-26 | parseRoster (구분) | 머리글 + 탭·쉼표·띄어쓰기 줄, 빈 줄 | 머리글·빈 줄 건너뜀, 줄 번호 유지, 하이픈 자동 | F-26 |
| LOGIC-27 | parseRoster (문제) | 이미 신청한 연락처, 이름 빈 칸, 형식 오류, 붙여넣기 안 중복 / 다른 프로그램 | 줄마다 문구 / 다른 프로그램 신청자와는 겹쳐도 통과 | F-26 |
| LOGIC-28 | sessionRates | 회차 2개(날짜 섞임), 신청 4명, 다른 사람 기록 포함 | 날짜순, `3/4 75%`, `1/4 25%`, 그 프로그램 신청자만 셈 | F-28 |
| LOGIC-29 | copyName, copyOf | 짧은 이름 / 30자 이름 | " (복사)" 붙임, 30자 이내, 장소·정원·수료 기준 그대로 | F-27 |
| LOGIC-30 | readRosterFile (구글폼 엑셀) | 타임스탬프·이름·전화번호·메모 열, 숫자 연락처, 빈 줄, 두 번째 시트 | 이름·전화번호 열만 3줄, `010-0000-0002`로 되살림, 두 번째 시트는 안 읽음 | F-29 |
| LOGIC-31 | readRosterFile (엑셀 저장 모양) | 압축·공유 글자표·서식 나뉜 글자·윗주·첫 시트가 sheet2.xml / 압축 안 함·머리글 없음 | 성명·휴대폰 열 2줄 / 앞의 두 칸 2줄 | F-29 |
| LOGIC-32 | readRosterFile·parseCsv (CSV) | CP949 CSV, 따옴표 칸 / UTF-8 BOM, 따옴표 안 줄바꿈·`""` / 탭 구분 | 한글이 깨지지 않음, 이름 안 쉼표는 띄어쓰기로 / 칸 그대로 | F-29 |
| LOGIC-33 | readRosterFile (거부) | .pdf / .xls / 속이 옛 엑셀인 .xlsx / 깨진 .xlsx / 5MB 초과 / 명단 없음 | 각 이유 문구 | F-29 |
| LOGIC-34 | rowsToRosterText·fixPhoneCell·parseSheet | 제목 줄 + 머리글(번호·연락처·이름), `1000000001`, 이름 안 줄바꿈 / XML 특수 글자·건너뛴 칸 | 머리글 아래만, `010-0000-0001`, `김 예시` / `A&B <반>`이 둘째 칸 | F-29 |
| LOGIC-14 | withApplicantCounts, isFull, programOptionLabel | 정원 2에 2명 / 정원 없음 | `applicantCount` 다시 계산, 마감 `true`·문구 `(마감)` / `false`·이름만 | F-14 |

## 5. 프런트 — API 호출 (src/lib/applicantApi.test.ts)

실제 서버 대신 가짜 `fetch`로 확인합니다.

| ID | 대상 | 기대 결과 |
|---|---|---|
| CLIENT-01 | fetchApplicants | `GET {API_URL}/api/applicants` 호출, 배열 반환 |
| CLIENT-02 | createApplicant | `POST`, `Content-Type: application/json`, 본문이 입력값 |
| CLIENT-03 | updateApplicant | `PATCH {API_URL}/api/applicants/1`, 본문이 바꿀 항목 |
| CLIENT-04 | deleteApplicant | `DELETE`, 204 응답에서 JSON을 읽지 않음 |
| CLIENT-05 | 공통 | 서버가 400/404/409를 주면 `error.message`를 담은 Error를 던짐 |
| CLIENT-06 | fetchPrograms, createProgram, updateProgram, deleteProgram | `/api/programs` 주소, 메서드, 본문이 명세와 같음 |
| CLIENT-08 | login, setAuthToken | `POST /api/auth/login`에 `{ password }`. 토큰을 넣은 뒤에는 모든 요청에 `Authorization: Bearer {토큰}` |
| CLIENT-09 | 공통 | 401을 받으면 `ApiError`(`status` 401, 서버 문구), 연결 실패는 `status` 0 |
| CLIENT-07 | fetchSessions, createSession, updateSession(v2.1), deleteSession, fetchAttendance, setAttendance | 회차·출석 주소와 메서드 (수정은 PATCH, 체크는 PUT, 해제는 DELETE) |

## 6. 프런트 — 컴포넌트 (src/components/*.test.tsx)

| ID | 대상 | 상황 | 기대 결과 | 기능 |
|---|---|---|---|---|
| UI-01 | ApplicantForm | 바르게 입력 후 등록 클릭 | `onAdd`가 공백 자른 값으로 호출, 입력칸 비움 | F-01 |
| UI-02 | ApplicantForm | 이름 `""`, `"   "` | `onAdd` 호출 안 됨, "이름을 입력해 주세요." | F-02 |
| UI-03 | ApplicantForm | 연락처를 덜 입력(`0101234`) | `onAdd` 호출 안 됨, 연락처 형식 문구 | F-02 |
| UI-04 | ApplicantForm | 프로그램 안 고름 | `onAdd` 호출 안 됨, "프로그램을 선택해 주세요." | F-02 |
| UI-05 | ApplicantForm | 입력창에서 Enter | 등록 클릭과 같음 | F-01 |
| UI-06 | ApplicantForm | `onAdd`가 `false` 반환 | 입력값 그대로 | F-08 |
| UI-07 | ApplicantItem | 표시 | 이름, 프로그램 이름, 가린 연락처, 신청일. 전체 번호는 없음 | F-03 |
| UI-08 | ApplicantItem | 체크박스 클릭 | `onToggle(id)` | F-04 |
| UI-09 | ApplicantItem | 삭제 → **삭제 확인** 클릭 | 확인 문구가 보이고, 확인을 눌러야 `onDelete(id)` | F-05 |
| UI-10 | ApplicantItem | `attended=true` | 체크되어 있고 "참석 완료" 표시 | F-04 |
| UI-11 | ApplicantList | 0명 | `emptyMessage` 표시 | F-03 |
| UI-12 | ApplicantList | 3명 | 목록 항목 3개 | F-03 |
| UI-13 | ApplicantSummary | 3명 중 1명 참석 | "전체 3명 · 참석 1명" | F-06 |
| UI-14 | ApplicantFilter (v2.4: 검색창 이름이 "이름 또는 연락처 검색") | 표시 | 버튼 3개(전체/참석/미참석), 프로그램 필터, 이름 검색 | F-09 |
| UI-15 | ApplicantFilter | 현재 값 `attended` | "참석" 버튼만 `aria-pressed="true"` | F-09 |
| UI-16 | ApplicantFilter | "미참석" 클릭 | `onChange({ ...value, attendance: "absent" })` | F-09 |
| UI-17 | ApplicantFilter | 프로그램 필터에서 모의면접 선택 | `onChange({ ...value, program: 모의면접 번호 })` | F-09 |
| UI-18 | ApplicantFilter | 검색창에 글자 입력 | `onChange`에 `keyword`가 담겨 호출 | F-09 |
| UI-19 | ApplicantItem | 수정 클릭 | 입력창 3개에 기존 값, 이름 입력창에 포커스 | F-10 |
| UI-20 | ApplicantItem | 이름을 바꾸고 Enter | `onEdit(id, { name: 새 이름 })` (바뀐 항목만), 보기 모드 | F-10 |
| UI-21 | ApplicantItem | 값을 바꾸다 Esc / 취소 | `onEdit` 호출 안 됨, 원래 값 표시 | F-10 |
| UI-22 | ApplicantItem | 빈 이름 / 틀린 연락처로 저장 | `onEdit` 호출 안 됨, 문구 표시, 수정 모드 유지 | F-10 |
| UI-23 | ApplicantItem | 안 바꾸고 저장 | `onEdit` 호출 안 됨, 보기 모드 | F-10 |
| UI-24 | ApplicantItem | 삭제 → **아니요** 클릭 | `onDelete` 호출 안 됨, 확인 문구 사라짐 | F-05 |
| UI-25 | ApplicantItem | `busy=true` | 체크박스·수정·삭제 버튼 비활성화 | F-04 |
| UI-26 | ApplicantItem | 수정 저장 후 `onEdit`가 `false` | 수정 모드와 입력한 값 유지 | F-10 |
| UI-27 | ApplicantForm | 연락처에 `01012345678` 입력 | 입력칸에 `010-1234-5678`로 보이고 등록됨 | F-02 |
| UI-28 | ProgramSummary | 정원 2명 모의면접에 2명 중 1명 참석, 정원 없는 프로그램 0명 | 모의면접 카드 "신청 2/2명 · 참석 1명", "참석률 50%", **마감** 표시 / 다른 카드 "신청 0명 · 참석 0명", "참석률 -" | F-12, F-14 |
| UI-29 | ExportButton | 0명 | 버튼 비활성화 | F-11 |
| UI-30 | ExportButton | 2명 있을 때 클릭 | `신청자명단_YYYYMMDD.csv` 파일 내려받기가 실행됨 | F-11 |
| UI-31 | ProgramForm | 이름·시작일·장소·정원 입력 후 **프로그램 추가** | `onSubmit({ name, startDate, endDate: null, location, capacity: 숫자, completionRate: 80 })` (수료 기준을 비우면 80, v2.1), 성공하면 입력칸 비움 | F-13 |
| UI-32 | ProgramForm | 빈 이름 / 정원 0 / 종료일 < 시작일 | `onSubmit` 호출 안 됨, 각 문구 표시 | F-13, F-14 |
| UI-33 | ProgramManager | 펼쳐서 보기 | 제목 "프로그램 관리 (2개)", 줄마다 기간·장소·"신청 1/10명"·"수료 기준 80%"(v2.1), 신청자 있는 프로그램의 삭제 버튼은 비활성화 | F-13 |
| UI-34 | ProgramManager | 수정 → 장소 바꾸고 **저장** | `onUpdate(id, 전체 값)` 호출, 성공하면 보기로 돌아감 | F-13 |
| UI-35 | ProgramManager | 신청자 없는 프로그램 삭제 → **삭제 확인** | 확인 문구 후 `onDelete(id)` | F-13 |
| UI-36 | ApplicantForm | 정원 2에 2명인 프로그램 | 선택지에 "(마감)", 선택할 수 없음(disabled). 정원 10에 3명이면 "(3/10명)" | F-14 |
| UI-37 | ApplicantForm | 프로그램 0개 | "먼저 프로그램 관리에서 프로그램을 추가해 주세요." | F-13 |
| UI-38 | ApplicantItem | `sessionStat` = 2/3 | "출석 2/3회" 표시, 참석 체크박스 없음 | F-16 |
| UI-39 | ProgramSummary | 회차 2개 프로그램, 신청 2명, 출석 기록 3개 | "신청 2명 · 회차 2개", "출석률 75%", "수료 1명 (기준 80%)" (v2.1) | F-12, F-16 |
| UI-40 | AttendanceBook | 회차 없는 프로그램 → 날짜·메모 넣고 **회차 추가** / 날짜 없이 추가 | 안내 문구, `onAddSession(프로그램 id, { sessionDate, note })` / "회차 날짜를 입력해 주세요." | F-15 |
| UI-41 | AttendanceBook | 회차 2개, 신청자 2명, 1회차에 1명 출석 | 1회차 버튼 `aria-pressed`, 제목 "… 출석 1/2명", 출석한 사람만 체크, 체크박스 누르면 `onToggle(회차, 신청자, 반대 상태)` | F-16 |
| UI-42 | AttendanceBook | 2회차 고르고 **2회차 삭제** → **삭제 확인** | 확인 문구 후 `onDeleteSession(2회차 id)` | F-15 |
| UI-43 | AttendanceBook | "출석부 프로그램"에서 다른 프로그램 고름 | 그 프로그램의 회차·신청자로 바뀜 | F-15, F-16 |
| UI-44 | LoginForm | 빈 칸으로 로그인 / 비밀번호 넣고 로그인 | "비밀번호를 입력해 주세요.", `onLogin` 안 부름 / `onLogin("비밀번호")` | F-17 |
| UI-45 | LoginForm | `onLogin`이 "비밀번호가 맞지 않습니다." 돌려줌 | 그 문구를 `role="alert"`로, 입력칸 비움 | F-17 |
| UI-46 | LoginForm | `notice` = "로그인이 필요합니다. 다시 로그인해 주세요." | `role="status"`로 보임 | F-18 |
| UI-47 | ApplicantItem | `sessionStat` 4/5 (기준 80%) / 0/3 | "수료" 표시, 수정 칸의 프로그램 선택 잠김 + 안내 / 수료 없음, 선택 가능 | F-16, F-19 |
| UI-48 | AttendanceBook | **1회차 수정** → 날짜 비우고 저장 / 날짜·메모 바꿔 저장 | "회차 날짜를 입력해 주세요." / `onUpdateSession(10, { sessionDate, note: null })`, 수정 칸 닫힘 | F-20 |
| UI-49 | AttendanceBook | 회차 없음 + 참석 체크된 신청자 1명 | "참석 체크된 신청자가 1명 있습니다…" 안내 | F-16 |
| UI-50 | AttendanceBook | 2회 모두 출석한 사람 / 출석표 CSV / 팝업이 막힌 출석표 인쇄 | "수료" 표시 / 파일 내려받기 1번 / "팝업이 막혀 인쇄 창을 열 수 없습니다…" | F-19, F-21 |
| UI-51 | CheckInMode | 오늘(11.12) 회차가 있는 프로그램, 1명 출석 | 그 프로그램·회차가 먼저 골라짐, "출석 1/2명", 이름순, 출석한 사람은 "출석 취소" 버튼 | F-24 |
| UI-52 | CheckInMode | 뒷자리 `2222` 검색 → **출석** / 없는 이름 | `onSetAttendance(11, 2, true)`, "김예시 님 출석 처리했습니다", 검색칸 비움 / "찾는 신청자가 없습니다" | F-24, F-25 |
| UI-53 | CheckInMode | 회차 없는 프로그램 고름 → 출석 취소 → **관리 화면으로** | 회차 선택 없음·안내 문구, `onSetAttended(3, false)`, 취소 문구, `onClose` | F-24 |
| UI-54 | BulkImport | 3줄 붙여넣기(정상·이미 신청·형식 오류) → 프로그램 고르고 등록 | 프로그램 전에는 "2명 · 1개"이고 버튼 잠김, 고른 뒤 "등록할 수 있는 사람 1명 · 문제 있는 줄 2개", 정상 줄만 `onBulkAdd`, "1명을 등록했습니다." | F-26 |
| UI-55 | BulkImport | 서버가 정원 초과로 실패 | 실패 이름·연락처·이유 표시, 입력칸 유지 | F-26 |
| UI-56 | ProgramManager | **모의면접 복사** → **프로그램 추가** | 새 프로그램 칸에 "모의면접 (복사)"·장소 채움, 안내 표시, 같은 설정으로 `onAdd`, 성공 후 비움 | F-27 |
| UI-58 | BulkImport | 프로그램 고르고 **명단 파일 선택**으로 .xlsx 올리기(가짜 읽기: 2줄) | 파일을 그대로 넘김, "신청명단.xlsx에서 2줄을 불러왔습니다…", 입력칸 채움, "1명 · 1개"(이미 신청), 정상 줄만 `onBulkAdd` | F-29 |
| UI-59 | BulkImport | 붙여 넣은 뒤 읽을 수 없는 파일 / 예상 못 한 오류 / 입력칸 고치기 | 옛 엑셀 문구, 입력칸 그대로 / "파일을 읽지 못했습니다…" / 안내 사라짐 | F-29 |
| UI-57 | ProgramStats | 신청 2명, 회차 1개, 출석 1명 / 신청 0명 프로그램 | 요약 표 `2명·1개·50%·1/2명` / `0명·-`, 회차별 막대 옆 `1/2명 · 50%`, 회차 없는 프로그램은 막대 없음 | F-28 |

## 6-1. 화면 전체 흐름 (e2e/flow.spec.ts, Playwright, v2.7)

테스트 전용 서버(8100, 빈 `backend/e2e.db`)와 화면(3100)을 새로 켜서 실제 브라우저로 누릅니다. 실행: `npm run test:e2e`

| ID | 흐름 | 기대 결과 | 기능 |
|---|---|---|---|
| E2E-01 | 틀린 비밀번호 → 로그인 → 신청자 1명 등록 → 2명 일괄 등록 → 회차 2개 추가 → 한 사람 두 회차 출석 → 현장 체크인에서 뒷자리 `0003`으로 출석 → 로그아웃 → 새로고침 | 각 단계 문구, "3명 표시 중", 명단에 "출석 2/2회"·"수료", "박데모 님 출석 처리했습니다", 로그인 화면 유지 | F-01, F-16, F-17, F-19, F-24~26 |

## 6-2. 자동 실행 (GitHub Actions, .github/workflows/ci.yml, v2.3)

push·PR마다: 서버(ruff, pytest, `pytest -m db`, 빈 DB 마이그레이션·시연 데이터) / 화면(eslint, jest, build) / 화면 흐름(Playwright)

## 7. 직접 해 보는 확인 (브라우저)

| ID | 상황 | 기대 결과 | 기능 |
|---|---|---|---|
| MAN-01 | 등록 후 새로고침, 백엔드 재시작 | 명단이 남아 있음 | F-07 |
| MAN-02 | 백엔드를 끄고 새로고침 | 연결 실패 문구, 화면이 깨지지 않음 | — |
| MAN-03 | 375px 모바일 보기 | 깨지지 않음 | — |
| MAN-04 | v1.1 데이터가 있는 `dev.db`에 `alembic upgrade head` (v1.2) | 프로그램 4개가 생기고, 기존 신청자가 원래 프로그램에 그대로 연결됨 | F-07, F-13 |
| MAN-06 | `backend/.env`에 `ADMIN_PASSWORD`를 넣고 서버 재시작 → 로그인 → 새로고침 → 탭 닫고 다시 열기 → 로그아웃 | 로그인 후 명단이 보임, 새로고침해도 유지, 탭을 닫으면 다시 로그인, 로그아웃하면 로그인 화면 | F-17, F-18 |
| MAN-07 | v2.0 데이터가 있는 `dev.db`에 `alembic upgrade head` (v2.1) | 기존 프로그램의 수료 기준이 80%로 채워지고 나머지 데이터는 그대로 | F-07, F-19 |
| MAN-08 | 빈 DB에서 `uv run python -m app.seed` → 한 번 더 실행 / 출석표 인쇄 | 시연용 데이터가 들어감 → "이미 신청자나 회차가 있어서 넣지 않았습니다." / 새 창에 표가 열리고 인쇄 창이 뜸 | F-21, F-22 |
| MAN-09 | 태블릿(또는 브라우저 폭 줄이기)에서 **현장 체크인** | 큰 버튼이 한 줄에 보이고 가로로 넘치지 않음, 뒷자리 4개로 찾아 출석 | F-24 |
| MAN-10 | 엑셀에서 이름·연락처 두 열을 복사해 **명단 한꺼번에 등록**에 붙여넣기 | 줄마다 검사 결과가 보이고 등록됨 | F-26 |
| MAN-11 | 엑셀로 만든 .xlsx(가짜 이름·010-0000-xxxx, 연락처 칸을 숫자로) / 그 파일을 "CSV(쉼표로 분리)"로 저장한 것 / .xls로 저장한 것을 **엑셀·CSV 파일 선택**으로 올리기 | 입력칸에 이름·연락처가 채워지고 앞자리 0이 살아 있음 / 한글이 깨지지 않음 / 옛 엑셀 안내 | F-29 |
| MAN-05 | v1.2 데이터가 있는 `dev.db`에 `alembic upgrade head` (v1.3) | 회차·출석 테이블이 생기고, 기존 신청자·참석 체크는 그대로 | F-07, F-16 |

## 기능 ↔ 테스트 연결 확인

| 기능 | 테스트 |
|---|---|
| F-01 등록 | VAL-01, REPO-01, API-01, CLIENT-02, UI-01, UI-05 |
| F-02 입력 검사 | VAL-02~04, REPO-10, API-02~04, LOGIC-07~08, UI-02~04, UI-27 |
| F-03 명단 보기 | VAL-06, API-07, LOGIC-05~06, CLIENT-01, UI-07, UI-11~12 |
| F-04 참석 체크 | REPO-02, API-08, UI-08, UI-10, UI-25 |
| F-05 삭제 | REPO-03, API-13~14, CLIENT-04, UI-09, UI-24 |
| F-06 인원 요약 | UI-13 |
| F-07 데이터 유지 | DB 저장소 테스트(-m db), MAN-01 |
| F-08 중복 막기 | REPO-05, API-05~06, CLIENT-05, UI-06 |
| F-09 필터 | LOGIC-01~04, UI-14~18 |
| F-10 수정 | VAL-05, API-09~12, CLIENT-03, UI-19~23, UI-26 |
| F-11 CSV 내보내기 | LOGIC-09~10, UI-29~30 |
| F-12 프로그램별 요약 | LOGIC-11, UI-28 |
| F-13 프로그램 관리 | VAL-07~08, REPO-06, REPO-09, API-17~20, API-22, LOGIC-12~13, CLIENT-06, UI-31~35, UI-37, MAN-04 |
| F-15 회차 관리 | VAL-09, REPO-12, REPO-15, API-25~26, API-29, LOGIC-15, CLIENT-07, UI-40, UI-42~43 |
| F-16 회차별 출석 | REPO-13~16, API-27~28, API-30, LOGIC-16~18, CLIENT-07, UI-38~39, UI-41, UI-43, MAN-05 |
| F-19 수료 판정 | VAL-10, REPO-18, API-17, API-37, LOGIC-11~12, LOGIC-17, LOGIC-20, UI-39, UI-47, UI-50, MAN-07 |
| F-20 회차 수정 | VAL-11, REPO-17, API-36, CLIENT-07, UI-48 |
| F-21 출석표 내보내기 | LOGIC-21~22, UI-50, MAN-08 |
| F-22 시연용 데이터 | REPO-19, MAN-08 |
| F-23 회차 기간 검사 | REPO-20, API-39 |
| F-24 현장 체크인 | LOGIC-24~25, UI-51~53, E2E-01, MAN-09 |
| F-25 연락처 뒷자리 검색 | LOGIC-23, UI-14, UI-18, UI-52, E2E-01 |
| F-26 명단 일괄 등록 | VAL-12, API-40, LOGIC-26~27, UI-54~55, E2E-01, MAN-10 |
| F-27 프로그램 복사 | LOGIC-29, UI-56 |
| F-28 통계 | LOGIC-28, UI-57 |
| F-29 명단 파일 올리기 | LOGIC-30~34, UI-58~59, MAN-11 |
| F-17 관리자 로그인 | AUTH-02, API-31~32, API-34~35, LOGIC-19, CLIENT-08, UI-44~45, MAN-06 |
| F-18 명단 보호 | AUTH-01, API-33, CLIENT-09, UI-46, MAN-06 |
| F-14 정원 관리 | VAL-07~08, REPO-07~08, REPO-11, API-21, API-23~24, LOGIC-11~12, LOGIC-14, UI-28, UI-32, UI-36 |
