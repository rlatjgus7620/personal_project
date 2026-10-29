# API_SPEC — API 명세

> 이 문서는 "화면과 서버가 어떻게 대화하는가"에 답합니다. 근거 문서: DATA_MODEL.md
> 기본 주소: 개발 `http://localhost:8000`, JSON 필드는 camelCase

## 한눈에 보기

| 메서드 | 주소 | 하는 일 | 성공 코드 |
|---|---|---|---|
| GET | `/health` | 서버 상태 확인 | 200 |
| GET | `/api/applicants` | 명단 조회 (최신 신청순) | 200 |
| POST | `/api/applicants` | 신청자 등록 | 201 |
| PATCH | `/api/applicants/{id}` | 정보 수정 또는 참석 전환 | 200 |
| DELETE | `/api/applicants/{id}` | 신청 취소(삭제) | 204 |

## 에러 형식 (모든 API 공통)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "연락처는 010-0000-0000 형식으로 입력해 주세요." } }
```

| 코드 | 상태 | 언제 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | 입력값 규칙 위반, 숫자가 아닌 id, 수정할 항목이 하나도 없음 |
| `NOT_FOUND` | 404 | 없는 id |
| `DUPLICATE_APPLICATION` | 409 | 같은 연락처가 같은 프로그램에 이미 있음 |

`message`는 사용자에게 그대로 보여줄 한국어 문장입니다.

## GET /health
응답 200
```json
{ "status": "ok" }
```

## GET /api/applicants
최신 신청순(`createdAt` 내림차순, 같으면 `id` 내림차순)으로 전체 명단을 돌려줍니다.
필터는 화면에서 계산하므로 쿼리 파라미터는 없습니다.

응답 200
```json
[
  {
    "id": 2,
    "name": "이테스트",
    "phone": "010-2222-3333",
    "program": "mock_interview",
    "attended": false,
    "createdAt": "2026-10-29T05:00:00Z",
    "updatedAt": "2026-10-29T05:00:00Z"
  }
]
```

## POST /api/applicants
요청
```json
{ "name": "김테스트", "phone": "010-1234-5678", "program": "resume_clinic" }
```
- `attended`, `createdAt`, `updatedAt`은 보내지 않습니다. (서버가 정함)

응답 201: 만들어진 신청자 한 명 (`attended=false`)

| 상황 | 응답 |
|---|---|
| 이름이 비었거나 공백만 | 400 `VALIDATION_ERROR` "이름을 입력해 주세요." |
| 이름 21자 이상 | 400 `VALIDATION_ERROR` "이름은 20자 이하로 입력해 주세요." |
| 연락처 형식 틀림 | 400 `VALIDATION_ERROR` "연락처는 010-0000-0000 형식으로 입력해 주세요." |
| 없는 프로그램 코드 | 400 `VALIDATION_ERROR` "프로그램을 선택해 주세요." |
| 같은 연락처 + 같은 프로그램 | 409 `DUPLICATE_APPLICATION` "이미 같은 프로그램에 신청한 연락처입니다." |

## PATCH /api/applicants/{id}
바꿀 항목만 보냅니다. 네 항목 모두 선택이지만 **최소 하나는** 있어야 합니다.
```json
{ "attended": true }
```
```json
{ "name": "김수정", "phone": "010-9999-8888", "program": "career_lecture" }
```
응답 200: 바뀐 신청자 (`updatedAt` 갱신)

| 상황 | 응답 |
|---|---|
| 빈 객체 `{}` | 400 `VALIDATION_ERROR` "수정할 항목이 없습니다." |
| 항목 규칙 위반 | 400 `VALIDATION_ERROR` (POST와 같은 문구) |
| 숫자가 아닌 id (`/abc`) | 400 `VALIDATION_ERROR` |
| 없는 id | 404 `NOT_FOUND` "신청자를 찾을 수 없습니다." |
| 바꾼 결과가 다른 신청과 중복 | 409 `DUPLICATE_APPLICATION` |

## DELETE /api/applicants/{id}
응답 204 (본문 없음)

| 상황 | 응답 |
|---|---|
| 없는 id | 404 `NOT_FOUND` "신청자를 찾을 수 없습니다." |
