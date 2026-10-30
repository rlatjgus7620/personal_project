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
| VAL-04 | ApplicantCreate | 프로그램 `cooking` | 실패 | F-02 |
| VAL-05 | ApplicantUpdate | `attended`만, `name`만 → 통과 / 빈 객체 → 실패 | | F-04, F-10 |
| VAL-06 | ApplicantOut | JSON으로 바꾸기 | 키가 `createdAt`, `updatedAt` (camelCase) | F-03 |

## 2. 백엔드 — 저장소 (test_repository.py, test_sql_repository.py)

메모리 저장소와 SQL 저장소가 **같은 테스트**를 통과해야 합니다. SQL 쪽은 `uv run pytest -m db`로 실행합니다.

| ID | 상황 | 기대 결과 | 기능 |
|---|---|---|---|
| REPO-01 | 2명 등록 후 list | 나중에 등록한 사람이 먼저, `attended=false`, id는 1부터 | F-01, F-03 |
| REPO-02 | update로 `attended=True` | 값이 바뀌고 `updated_at`이 갱신됨 | F-04 |
| REPO-03 | delete | `True`, 이후 list에 없음 | F-05 |
| REPO-04 | 없는 id로 update / delete | `None` / `False` (예외 없음) | F-05, F-10 |
| REPO-05 | 같은 연락처+프로그램으로 create, 또는 update로 중복을 만듦 | `DuplicateApplicationError` | F-08 |

## 3. 백엔드 — API (backend/tests/test_applicants_api.py)

| ID | 대상 | 상황 | 기대 결과 | 기능 |
|---|---|---|---|---|
| API-01 | POST | 바른 입력 | 201, `attended=false`, 키는 camelCase | F-01 |
| API-02 | POST | 빈 이름 | 400, `VALIDATION_ERROR`, "이름을 입력해 주세요." | F-02 |
| API-03 | POST | 연락처 `01012345678` | 400, `VALIDATION_ERROR`, 연락처 형식 문구 | F-02 |
| API-04 | POST | 프로그램 `cooking` | 400, `VALIDATION_ERROR` | F-02 |
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

## 4. 프런트 — 순수 함수 (src/lib/*.test.ts)

| ID | 대상 | 상황 | 기대 결과 | 기능 |
|---|---|---|---|---|
| LOGIC-01 | filterApplicants | 참석 여부 `all` / `attended` / `absent` | 전부 / 참석만 / 미참석만 | F-09 |
| LOGIC-02 | filterApplicants | 프로그램 `mock_interview` | 그 프로그램만 | F-09 |
| LOGIC-03 | filterApplicants | 검색어 `" 테스 "` (앞뒤 공백), 여러 조건 함께 | 이름에 "테스"가 들어간 사람 중 모든 조건을 만족하는 사람만 | F-09 |
| LOGIC-04 | filterApplicants | 실행 후 원본 배열 | 바뀌지 않음 | F-09 |
| LOGIC-05 | maskPhone | `010-1234-5678` | `010-****-5678` | F-03 |
| LOGIC-06 | formatDate | `2026-10-29T05:00:00Z` | `2026.10.29` | F-03 |
| LOGIC-07 | validateApplicant | 빈 이름 / 틀린 연락처 / 프로그램 없음 / 정상 | 각 문구 / `null` | F-02 |
| LOGIC-08 | formatPhoneInput | `"010"`, `"0101234"`, `"01012345678"`, `"010-1234-5678"`, `"010 1234 5678abc9"` | `"010"`, `"010-1234"`, `"010-1234-5678"`, 그대로, 숫자 11자리까지만 | F-02 |
| LOGIC-09 | toCsv | 2명 (한 명은 참석) | BOM + 머리글 줄 + 2줄, 프로그램 이름·참석/미참석·신청일 한국어로 | F-11 |
| LOGIC-10 | toCsv | 이름에 쉼표·따옴표, `=`로 시작하는 값 | 큰따옴표로 감싸고 `""`로 바꿈, 수식 방지 `'` 붙임 | F-11 |
| LOGIC-11 | summarizeByProgram | 모의면접 3명 중 2명 참석, 취업 특강 0명 | 4개 프로그램 순서대로, 모의면접 67%, 취업 특강 참석률 없음(`null`) | F-12 |

## 5. 프런트 — API 호출 (src/lib/applicantApi.test.ts)

실제 서버 대신 가짜 `fetch`로 확인합니다.

| ID | 대상 | 기대 결과 |
|---|---|---|
| CLIENT-01 | fetchApplicants | `GET {API_URL}/api/applicants` 호출, 배열 반환 |
| CLIENT-02 | createApplicant | `POST`, `Content-Type: application/json`, 본문이 입력값 |
| CLIENT-03 | updateApplicant | `PATCH {API_URL}/api/applicants/1`, 본문이 바꿀 항목 |
| CLIENT-04 | deleteApplicant | `DELETE`, 204 응답에서 JSON을 읽지 않음 |
| CLIENT-05 | 공통 | 서버가 400/404/409를 주면 `error.message`를 담은 Error를 던짐 |

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
| UI-14 | ApplicantFilter | 표시 | 버튼 3개(전체/참석/미참석), 프로그램 필터, 이름 검색 | F-09 |
| UI-15 | ApplicantFilter | 현재 값 `attended` | "참석" 버튼만 `aria-pressed="true"` | F-09 |
| UI-16 | ApplicantFilter | "미참석" 클릭 | `onChange({ ...value, attendance: "absent" })` | F-09 |
| UI-17 | ApplicantFilter | 프로그램 필터에서 모의면접 선택 | `onChange({ ...value, program: "mock_interview" })` | F-09 |
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
| UI-28 | ProgramSummary | 모의면접 2명 중 1명 참석 | 모의면접 카드에 "신청 2명 · 참석 1명", "참석률 50%", 신청 0명 카드는 "참석률 -" | F-12 |
| UI-29 | ExportButton | 0명 | 버튼 비활성화 | F-11 |
| UI-30 | ExportButton | 2명 있을 때 클릭 | `신청자명단_YYYYMMDD.csv` 파일 내려받기가 실행됨 | F-11 |

## 7. 직접 해 보는 확인 (브라우저)

| ID | 상황 | 기대 결과 | 기능 |
|---|---|---|---|
| MAN-01 | 등록 후 새로고침, 백엔드 재시작 | 명단이 남아 있음 | F-07 |
| MAN-02 | 백엔드를 끄고 새로고침 | 연결 실패 문구, 화면이 깨지지 않음 | — |
| MAN-03 | 375px 모바일 보기 | 깨지지 않음 | — |

## 기능 ↔ 테스트 연결 확인

| 기능 | 테스트 |
|---|---|
| F-01 등록 | VAL-01, REPO-01, API-01, CLIENT-02, UI-01, UI-05 |
| F-02 입력 검사 | VAL-02~04, API-02~04, LOGIC-07~08, UI-02~04, UI-27 |
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
