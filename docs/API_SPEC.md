# API_SPEC — API 명세

> 이 문서는 "화면과 서버가 어떻게 대화하는가"에 답합니다. 근거 문서: DATA_MODEL.md
> 기본 주소: 개발 `http://localhost:8000`, JSON 필드는 camelCase

## 한눈에 보기

| 메서드 | 주소 | 하는 일 | 성공 코드 | 버전 |
|---|---|---|---|---|
| GET | `/health` | 서버 상태 확인 (로그인 없이) | 200 | |
| POST | `/api/auth/login` | 관리자 로그인 → 토큰 받기 (로그인 없이) | 200 | v2.0 |
| GET | `/api/programs` | 프로그램 목록 (만든 순서) | 200 | v1.2 |
| POST | `/api/programs` | 프로그램 추가 | 201 | v1.2 |
| PATCH | `/api/programs/{id}` | 프로그램 수정 | 200 | v1.2 |
| DELETE | `/api/programs/{id}` | 프로그램 삭제 (신청자가 없을 때만, 회차도 함께 삭제) | 204 | v1.2 |
| GET | `/api/sessions` | 전체 회차 목록 (프로그램별 날짜순) | 200 | v1.3 |
| POST | `/api/programs/{id}/sessions` | 그 프로그램에 회차 추가 | 201 | v1.3 |
| PATCH | `/api/sessions/{id}` | 회차 날짜·메모 수정 (출석 기록은 그대로) | 200 | v2.1 |
| DELETE | `/api/sessions/{id}` | 회차 삭제 (출석 기록도 삭제) | 204 | v1.3 |
| GET | `/api/attendance` | 전체 출석 기록 | 200 | v1.3 |
| PUT | `/api/sessions/{id}/attendees/{applicantId}` | 출석으로 체크 | 204 | v1.3 |
| DELETE | `/api/sessions/{id}/attendees/{applicantId}` | 출석 체크 해제 | 204 | v1.3 |
| GET | `/api/applicants` | 명단 조회 (최신 신청순) | 200 | |
| POST | `/api/applicants` | 신청자 등록 | 201 | |
| PATCH | `/api/applicants/{id}` | 정보 수정 또는 참석 전환 | 200 | |
| DELETE | `/api/applicants/{id}` | 신청 취소(삭제) | 204 | |

v2.0부터 `/health`와 `/api/auth/login`을 뺀 **모든 `/api/...` 주소는 로그인 토큰이 있어야** 합니다.
요청 머리글(header)에 `Authorization: Bearer {토큰}`을 붙입니다. 없거나 틀렸거나 만료되면 401 `UNAUTHORIZED`.

## 에러 형식 (모든 API 공통)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "연락처는 010-0000-0000 형식으로 입력해 주세요." } }
```

| 코드 | 상태 | 언제 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | 입력값 규칙 위반, 숫자가 아닌 id, 수정할 항목이 없음, 없는 프로그램으로 신청, 정원을 신청자 수보다 적게 줄임 |
| `NOT_FOUND` | 404 | 없는 신청자 id, 없는 프로그램 id |
| `DUPLICATE_APPLICATION` | 409 | 같은 연락처가 같은 프로그램에 이미 있음 |
| `PROGRAM_FULL` | 409 | 정원이 가득 찬 프로그램에 신청하거나 옮김 (v1.2) |
| `DUPLICATE_PROGRAM` | 409 | 같은 이름의 프로그램이 이미 있음 (v1.2) |
| `PROGRAM_IN_USE` | 409 | 신청자가 있는 프로그램을 삭제하려 함 (v1.2) |
| `DUPLICATE_SESSION` | 409 | 같은 프로그램에 같은 날짜 회차가 이미 있음 (v1.3) |
| `HAS_ATTENDANCE` | 409 | 출석 기록이 있는 신청자를 다른 프로그램으로 옮기려 함 (v1.3) |
| `UNAUTHORIZED` | 401 | 토큰이 없거나 틀렸거나 만료됨 (v2.0) |
| `INVALID_PASSWORD` | 401 | 로그인 비밀번호가 틀림 (v2.0) |
| `TOO_MANY_ATTEMPTS` | 429 | 1분 안에 비밀번호를 5번 틀림 → 1분 동안 로그인 막기 (v2.0) |
| `AUTH_NOT_CONFIGURED` | 503 | 서버에 `ADMIN_PASSWORD`가 설정되지 않음 (v2.0) |

`message`는 사용자에게 그대로 보여줄 한국어 문장입니다.

## GET /health
응답 200
```json
{ "status": "ok" }
```

## 로그인 (v2.0)

### POST /api/auth/login
```json
{ "password": "관리자 비밀번호" }
```
응답 200
```json
{ "token": "1793700000.3f9a...", "expiresAt": "2026-11-03T12:00:00Z" }
```
- 토큰은 `{만료 시각}.{서명}` 모양입니다. 서명은 서버만 아는 비밀 키(`AUTH_SECRET`)로 만들어서, 화면에서 만료 시각을 바꾸면 서명이 맞지 않아 거부됩니다.
- 토큰은 12시간 동안 유효합니다. DB에 저장하지 않습니다.

| 상황 | 응답 |
|---|---|
| 비밀번호가 비었음 | 400 `VALIDATION_ERROR` "비밀번호를 입력해 주세요." |
| 비밀번호가 틀림 | 401 `INVALID_PASSWORD` "비밀번호가 맞지 않습니다." |
| 1분 안에 5번 틀린 뒤 (맞는 비밀번호여도) | 429 `TOO_MANY_ATTEMPTS` "로그인 시도가 너무 많습니다. 1분 뒤에 다시 시도해 주세요." |
| 서버에 `ADMIN_PASSWORD`가 없음 | 503 `AUTH_NOT_CONFIGURED` "서버에 관리자 비밀번호가 설정되지 않았습니다. backend/.env를 확인해 주세요." |

### 토큰이 필요한 주소의 공통 에러

| 상황 | 응답 |
|---|---|
| `Authorization` 머리글이 없음, 모양이 틀림, 서명이 틀림, 만료됨 | 401 `UNAUTHORIZED` "로그인이 필요합니다. 다시 로그인해 주세요." |

## 프로그램 (v1.2)

### GET /api/programs
응답 200 — 만든 순서(`id` 오름차순). `applicantCount`는 지금 신청자 수입니다.
```json
[
  {
    "id": 3,
    "name": "모의면접",
    "startDate": "2026-11-10",
    "endDate": "2026-11-12",
    "location": "3층 세미나실",
    "capacity": 10,
    "completionRate": 80,
    "applicantCount": 4
  }
]
```
`startDate`, `endDate`, `location`, `capacity`는 정하지 않았으면 `null`입니다. `capacity`가 `null`이면 정원 제한이 없습니다.
`completionRate`(v2.1)는 수료 기준 출석률(%)이고 항상 1~100 사이 숫자입니다.

### POST /api/programs
```json
{ "name": "자기소개서 특강", "startDate": "2026-11-20", "endDate": null, "location": "2층 강의실", "capacity": 20, "completionRate": 80 }
```
`name`만 필수입니다. `completionRate`를 빼거나 `null`로 보내면 80. 응답 201: 만들어진 프로그램 (`applicantCount=0`)

| 상황 | 응답 |
|---|---|
| 이름이 비었거나 공백만 | 400 `VALIDATION_ERROR` "프로그램 이름을 입력해 주세요." |
| 이름 31자 이상 | 400 `VALIDATION_ERROR` "프로그램 이름은 30자 이하로 입력해 주세요." |
| 장소 51자 이상 | 400 `VALIDATION_ERROR` "장소는 50자 이하로 입력해 주세요." |
| 정원이 1~999가 아님 | 400 `VALIDATION_ERROR` "정원은 1~999명 사이로 입력해 주세요." |
| 수료 기준이 1~100이 아님 (v2.1) | 400 `VALIDATION_ERROR` "수료 기준은 1~100% 사이로 입력해 주세요." |
| 종료일이 시작일보다 빠름 | 400 `VALIDATION_ERROR` "종료일은 시작일보다 빠를 수 없습니다." |
| 같은 이름이 이미 있음 | 409 `DUPLICATE_PROGRAM` "같은 이름의 프로그램이 이미 있습니다." |

### PATCH /api/programs/{id}
바꿀 항목만 보냅니다. 값을 `null`로 보내면 그 항목을 비웁니다(예: `"capacity": null` → 정원 제한 없음). 이름과 수료 기준은 비울 수 없습니다.

| 상황 | 응답 |
|---|---|
| 빈 객체 `{}` | 400 `VALIDATION_ERROR` "수정할 항목이 없습니다." |
| 정원을 지금 신청자 수보다 적게 | 400 `VALIDATION_ERROR` "지금 신청자(N명)보다 정원을 적게 줄일 수 없습니다." |
| 수정 결과 종료일이 시작일보다 빠름 | 400 `VALIDATION_ERROR` "종료일은 시작일보다 빠를 수 없습니다." |
| 없는 id | 404 `NOT_FOUND` "프로그램을 찾을 수 없습니다." |
| 그 밖의 규칙 위반 | POST와 같음 |

### DELETE /api/programs/{id}
응답 204

| 상황 | 응답 |
|---|---|
| 신청자가 1명이라도 있음 | 409 `PROGRAM_IN_USE` "신청자가 있는 프로그램은 삭제할 수 없습니다." |
| 없는 id | 404 `NOT_FOUND` "프로그램을 찾을 수 없습니다." |

## 회차와 출석 (v1.3)

화면이 처음 열릴 때 `GET /api/sessions`와 `GET /api/attendance`로 전부 받아 와서, 출석 횟수·출석률은 화면에서 계산합니다.

### GET /api/sessions
응답 200 — 프로그램 번호 오름차순, 같은 프로그램 안에서는 날짜 오름차순
```json
[
  { "id": 1, "programId": 3, "sessionDate": "2026-11-10", "note": "OT", "attendeeCount": 4 },
  { "id": 2, "programId": 3, "sessionDate": "2026-11-12", "note": null, "attendeeCount": 0 }
]
```

### POST /api/programs/{id}/sessions
```json
{ "sessionDate": "2026-11-10", "note": "OT" }
```
응답 201: 만들어진 회차 (`attendeeCount=0`)

| 상황 | 응답 |
|---|---|
| 날짜가 없음 | 400 `VALIDATION_ERROR` "회차 날짜를 입력해 주세요." |
| 날짜 형식이 틀림 | 400 `VALIDATION_ERROR` "날짜는 YYYY-MM-DD 형식으로 입력해 주세요." |
| 메모 31자 이상 | 400 `VALIDATION_ERROR` "메모는 30자 이하로 입력해 주세요." |
| 같은 날짜 회차가 이미 있음 | 409 `DUPLICATE_SESSION` "같은 날짜의 회차가 이미 있습니다." |
| 없는 프로그램 | 404 `NOT_FOUND` "프로그램을 찾을 수 없습니다." |

### PATCH /api/sessions/{id} (v2.1)
```json
{ "sessionDate": "2026-11-11", "note": null }
```
바꿀 항목만 보냅니다. `note`를 `null`로 보내면 메모를 지웁니다. 날짜는 비울 수 없습니다. 출석 기록은 그대로 남습니다. 응답 200: 바뀐 회차

| 상황 | 응답 |
|---|---|
| 빈 객체 `{}` | 400 `VALIDATION_ERROR` "수정할 항목이 없습니다." |
| 날짜를 `null`·빈 값으로 | 400 `VALIDATION_ERROR` "회차 날짜를 입력해 주세요." |
| 같은 프로그램의 다른 회차와 날짜가 겹침 | 409 `DUPLICATE_SESSION` "같은 날짜의 회차가 이미 있습니다." |
| 없는 회차 | 404 `NOT_FOUND` "회차를 찾을 수 없습니다." |

### DELETE /api/sessions/{id}
응답 204. 그 회차의 출석 기록도 함께 지웁니다.

| 상황 | 응답 |
|---|---|
| 없는 회차 | 404 `NOT_FOUND` "회차를 찾을 수 없습니다." |

### GET /api/attendance
응답 200 — 출석한 기록만 (줄이 없으면 결석)
```json
[ { "sessionId": 1, "applicantId": 2 }, { "sessionId": 1, "applicantId": 5 } ]
```

### PUT /api/sessions/{id}/attendees/{applicantId}
출석으로 체크합니다. 본문 없음. 응답 204. 이미 출석이어도 204 (여러 번 보내도 결과가 같음).

### DELETE /api/sessions/{id}/attendees/{applicantId}
출석 체크를 풉니다. 응답 204. 이미 결석이어도 204.

PUT·DELETE 공통 에러:

| 상황 | 응답 |
|---|---|
| 없는 회차 | 404 `NOT_FOUND` "회차를 찾을 수 없습니다." |
| 없는 신청자 | 404 `NOT_FOUND` "신청자를 찾을 수 없습니다." |
| 다른 프로그램의 신청자 | 400 `VALIDATION_ERROR` "이 회차 프로그램의 신청자가 아닙니다." |

## 신청자

### GET /api/applicants
최신 신청순(`createdAt` 내림차순, 같으면 `id` 내림차순)으로 전체 명단을 돌려줍니다.
필터는 화면에서 계산하므로 쿼리 파라미터는 없습니다.

응답 200
```json
[
  {
    "id": 2,
    "name": "이테스트",
    "phone": "010-2222-3333",
    "programId": 3,
    "attended": false,
    "createdAt": "2026-10-29T05:00:00Z",
    "updatedAt": "2026-10-29T05:00:00Z"
  }
]
```
v1.1까지는 `"program": "mock_interview"` 같은 코드였고, v1.2부터 프로그램 번호 `programId`로 바뀌었습니다.

### POST /api/applicants
요청
```json
{ "name": "김테스트", "phone": "010-1234-5678", "programId": 2 }
```
- `attended`, `createdAt`, `updatedAt`은 보내지 않습니다. (서버가 정함)

응답 201: 만들어진 신청자 한 명 (`attended=false`)

| 상황 | 응답 |
|---|---|
| 이름이 비었거나 공백만 | 400 `VALIDATION_ERROR` "이름을 입력해 주세요." |
| 이름 21자 이상 | 400 `VALIDATION_ERROR` "이름은 20자 이하로 입력해 주세요." |
| 연락처 형식 틀림 | 400 `VALIDATION_ERROR` "연락처는 010-0000-0000 형식으로 입력해 주세요." |
| `programId`가 없거나 1보다 작음 | 400 `VALIDATION_ERROR` "프로그램을 선택해 주세요." |
| 없는 프로그램 번호 | 400 `VALIDATION_ERROR` "선택한 프로그램이 없습니다." |
| 같은 연락처 + 같은 프로그램 | 409 `DUPLICATE_APPLICATION` "이미 같은 프로그램에 신청한 연락처입니다." |
| 정원이 가득 참 | 409 `PROGRAM_FULL` "정원이 가득 찼습니다. (정원 N명)" |

검사 순서: 입력값 → 프로그램이 있는지 → 중복 신청 → 정원

### PATCH /api/applicants/{id}
바꿀 항목만 보냅니다. 네 항목(`name`, `phone`, `programId`, `attended`) 모두 선택이지만 **최소 하나는** 있어야 합니다.
```json
{ "attended": true }
```
```json
{ "name": "김수정", "phone": "010-9999-8888", "programId": 4 }
```
응답 200: 바뀐 신청자 (`updatedAt` 갱신)

| 상황 | 응답 |
|---|---|
| 빈 객체 `{}` | 400 `VALIDATION_ERROR` "수정할 항목이 없습니다." |
| 항목 규칙 위반, 없는 프로그램 | 400 `VALIDATION_ERROR` (POST와 같은 문구) |
| 숫자가 아닌 id (`/abc`) | 400 `VALIDATION_ERROR` |
| 없는 id | 404 `NOT_FOUND` "신청자를 찾을 수 없습니다." |
| 바꾼 결과가 다른 신청과 중복 | 409 `DUPLICATE_APPLICATION` |
| 정원이 가득 찬 다른 프로그램으로 옮김 | 409 `PROGRAM_FULL` (같은 프로그램 안에서 다른 항목만 바꾸는 건 정원과 무관) |
| 출석 기록이 있는데 다른 프로그램으로 옮김 (v1.3) | 409 `HAS_ATTENDANCE` "출석 기록이 있는 신청자는 다른 프로그램으로 옮길 수 없습니다." |

### DELETE /api/applicants/{id}
응답 204 (본문 없음). v1.3부터 그 사람의 출석 기록도 함께 지웁니다.

| 상황 | 응답 |
|---|---|
| 없는 id | 404 `NOT_FOUND` "신청자를 찾을 수 없습니다." |
