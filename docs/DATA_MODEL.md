# DATA_MODEL — 데이터 모델

> 이 문서는 "어떤 데이터를 저장하는가"에 답합니다. 근거 문서: PRD.md, TRD.md
> v1.2부터 `programs`(프로그램)와 `applicants`(신청자), v1.3부터 `sessions`(회차)와 `attendances`(출석 기록)가 더해져 테이블이 4개입니다.

```text
programs (1) ──< applicants (N)
    │                 │
    └──< sessions (N) │
             │        │
             └──< attendances >──┘   (회차 × 신청자 = 출석 기록, 다대다)
```

## programs 테이블 (v1.2)

| 필드(DB / 파이썬) | JSON 이름 | 타입 | 제약조건 | 설명 |
|---|---|---|---|---|
| `id` | `id` | `integer` | PK, 자동 증가 | 프로그램 번호 |
| `name` | `name` | `varchar(30)` | 필수, 1~30자, 앞뒤 공백 제거, **중복 불가** | 프로그램 이름 |
| `start_date` | `startDate` | `date` | 선택 | 시작일 |
| `end_date` | `endDate` | `date` | 선택, 시작일보다 빠를 수 없음 | 종료일 (하루짜리면 비워 둠) |
| `location` | `location` | `varchar(50)` | 선택, 0~50자 | 장소 |
| `capacity` | `capacity` | `integer` | 선택, 1~999. 비우면 제한 없음 | 정원 |
| `completion_rate` | `completionRate` | `integer` | 필수, 1~100, 기본값 80 (v2.1) | 수료 기준 출석률(%). 회차가 있는 프로그램에서 출석률이 이 값 이상이면 수료 |
| `created_at` | — | `timestamp (timezone)` | 기본값 현재 시각 | 만든 시각 (응답에는 안 넣음) |
| — | `applicantCount` | `integer` | 계산 값 (저장 안 함) | 지금 신청자 수 |

**처음 데이터:** v1.2 마이그레이션이 기존 프로그램 4개(구직활동 프로그램, 이력서 클리닉, 모의면접, 취업 특강)를 이 테이블에 넣고, 기존 신청자를 새 번호로 연결합니다.

## applicants 테이블

| 필드(DB / 파이썬) | JSON 이름 | 타입 | 제약조건 | 설명 |
|---|---|---|---|---|
| `id` | `id` | `integer` | PK, 자동 증가 | 신청 번호 |
| `name` | `name` | `varchar(20)` | 필수, 1~20자, 앞뒤 공백 제거 | 신청자 이름 |
| `phone` | `phone` | `varchar(13)` | 필수, `010-0000-0000` 형식 | 연락처 |
| `program_id` | `programId` | `integer` | 필수, **외래 키 → `programs.id`** | 신청 프로그램 (v1.1까지는 `program` 코드 문자열) |
| `attended` | `attended` | `boolean` | 기본값 `false` | 참석 여부 |
| `created_at` | `createdAt` | `timestamp (timezone)` | 기본값 현재 시각 | 신청일 |
| `updated_at` | `updatedAt` | `timestamp (timezone)` | 기본값 현재 시각, 수정 때 갱신 | 마지막 수정 시각 |

**유일 조건:** (`phone`, `program_id`) 조합은 중복될 수 없다. → 같은 연락처로 같은 프로그램에 두 번 신청 불가 (F-08)

## sessions 테이블 (v1.3)

프로그램의 날짜별 회차입니다. 회차를 하나라도 등록한 프로그램은 **회차별 출석부**로 출석을 관리합니다.

| 필드(DB / 파이썬) | JSON 이름 | 타입 | 제약조건 | 설명 |
|---|---|---|---|---|
| `id` | `id` | `integer` | PK, 자동 증가 | 회차 번호 |
| `program_id` | `programId` | `integer` | 필수, 외래 키 → `programs.id` | 어느 프로그램의 회차인지 |
| `session_date` | `sessionDate` | `date` | 필수 | 회차 날짜 |
| `note` | `note` | `varchar(30)` | 선택, 0~30자 (빈 값은 `null`) | 메모 (예: "OT", "모의면접 1차") |
| `created_at` | — | `timestamp (timezone)` | 기본값 현재 시각 | 만든 시각 (응답에는 안 넣음) |
| — | `attendeeCount` | `integer` | 계산 값 | 이 회차 출석 인원 |

**유일 조건:** (`program_id`, `session_date`) — 한 프로그램에 같은 날짜 회차는 하나만.
회차 번호(1회차, 2회차…)는 저장하지 않고, 날짜순으로 화면에서 붙입니다.

## attendances 테이블 (v1.3)

"이 신청자가 이 회차에 출석했다"는 기록입니다. **줄이 있으면 출석, 없으면 결석**입니다.

| 필드(DB / 파이썬) | JSON 이름 | 타입 | 제약조건 | 설명 |
|---|---|---|---|---|
| `session_id` | `sessionId` | `integer` | PK, 외래 키 → `sessions.id` | 회차 |
| `applicant_id` | `applicantId` | `integer` | PK, 외래 키 → `applicants.id` | 신청자 |
| `checked_at` | — | `timestamp (timezone)` | 기본값 현재 시각 | 출석 체크한 시각 |

**기본 키:** (`session_id`, `applicant_id`) 두 칸을 합친 것 — 같은 회차에 같은 사람을 두 번 기록할 수 없습니다.

## 참석과 출석 (섞어서 쓰기, v1.3)

| 프로그램 종류 | 출석 관리 | 명단에 보이는 것 | "참석한 사람"으로 셈 |
|---|---|---|---|
| 회차가 **없는** 프로그램 (하루짜리 특강 등) | 명단의 체크박스 → `applicants.attended` | 체크박스, "참석 완료" | `attended = true` |
| 회차가 **있는** 프로그램 | 출석부에서 회차별 체크 → `attendances` | "출석 2/3회" (체크박스 없음) | 1회 이상 출석 |

- 프로그램별 **참석률**: 회차 없음 → 참석자 ÷ 신청자, 회차 있음 → 전체 출석 기록 ÷ (신청자 × 회차 수)
- 회차를 처음 등록하면 그 프로그램 신청자의 `attended` 값은 더 이상 쓰지 않습니다 (지우지는 않음). v2.0.1부터 출석부가 회차 추가 전에 이 점을 안내합니다.
- **수료** (v2.1): 회차가 있는 프로그램에서 `출석 횟수 × 100 ≥ 수료 기준 × 회차 수`이면 수료. 회차가 없는 프로그램은 수료 판정을 하지 않습니다. 수료는 저장하지 않고 화면에서 계산합니다.

## 업무 규칙

| 규칙 | 어디서 지키나 | 어기면 |
|---|---|---|
| 정원이 있는 프로그램은 신청자 수가 정원을 넘을 수 없다 | 서버 저장소 (신청 등록, 다른 프로그램으로 옮길 때) | 409 `PROGRAM_FULL` |
| 정원을 지금 신청자 수보다 적게 줄일 수 없다 | 서버 저장소 (프로그램 수정) | 400 `VALIDATION_ERROR` |
| 신청자가 있는 프로그램은 지울 수 없다 | 서버 저장소 + DB 외래 키 | 409 `PROGRAM_IN_USE` |
| 프로그램 이름은 겹칠 수 없다 | 서버 저장소 + DB 유일 조건 | 409 `DUPLICATE_PROGRAM` |
| 한 프로그램에 같은 날짜 회차는 하나만 (v1.3) | 서버 저장소 + DB 유일 조건 | 409 `DUPLICATE_SESSION` |
| 출석은 그 회차 프로그램의 신청자만 체크할 수 있다 (v1.3) | 서버 저장소 | 400 `VALIDATION_ERROR` |
| 출석 기록이 있는 신청자는 다른 프로그램으로 옮길 수 없다 (v1.3) | 서버 저장소 | 409 `HAS_ATTENDANCE` |
| 신청자를 지우면 그 사람의 출석 기록도 지운다 (v1.3) | 서버 저장소 | — |
| 회차를 지우면 그 회차의 출석 기록도 지운다 (v1.3) | 서버 저장소 | — |
| 프로그램을 지우면(신청자가 없을 때만) 그 프로그램의 회차도 지운다 (v1.3) | 서버 저장소 | — |
| 회차 날짜를 바꿔도 같은 프로그램의 다른 회차와 겹칠 수 없다 (v2.1) | 서버 저장소 + DB 유일 조건 | 409 `DUPLICATE_SESSION` |
| 회차 날짜·메모를 바꿔도 출석 기록은 그대로 (v2.1) | 서버 저장소 | — |

## 검사 규칙 정리

| 항목 | 규칙 | 통과 예 | 실패 예 |
|---|---|---|---|
| 신청자 이름 | 앞뒤 공백 제거 후 1~20자 | `"  김테스트 "` → `"김테스트"` | `""`, `"   "`, 21자 |
| 연락처 | 정규식 `^010-\d{4}-\d{4}$` | `010-1234-5678` | `01012345678`, `010-123-4567` |
| 신청 프로그램 | 1 이상의 정수, 실제로 있는 프로그램 번호 | `3` | 없음, `0`, `999`(없는 번호) |
| 프로그램 이름 | 앞뒤 공백 제거 후 1~30자 | `"모의면접"` | `""`, 31자 |
| 장소 | 앞뒤 공백 제거 후 0~50자 (빈 값은 `null`) | `"3층 세미나실"` | 51자 |
| 정원 | 비우거나 1~999 정수 | `null`, `10` | `0`, `1000` |
| 기간 | 종료일 ≥ 시작일 (둘 다 있을 때) | `11-10 ~ 11-12` | `11-12 ~ 11-10` |
| 회차 날짜 | 필수, `YYYY-MM-DD` | `2026-11-10` | 없음, `11/10` |
| 회차 메모 | 앞뒤 공백 제거 후 0~30자 (빈 값은 `null`) | `"OT"` | 31자 |

## TypeScript 타입 예시

```ts
export type Session = {
  id: number;
  programId: number;
  sessionDate: string; // "2026-11-10"
  note: string | null;
  attendeeCount: number;
};

export type AttendanceRecord = { sessionId: number; applicantId: number };

export type Program = {
  id: number;
  name: string;
  startDate: string | null; // "2026-11-10"
  endDate: string | null;
  location: string | null;
  capacity: number | null; // null이면 제한 없음
  applicantCount: number;
};

export type Applicant = {
  id: number;
  name: string;
  phone: string;
  programId: number;
  attended: boolean;
  createdAt: string; // 서버가 JSON으로 보내는 날짜는 ISO 문자열
  updatedAt: string;
};
```
