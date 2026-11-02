# DATA_MODEL — 데이터 모델

> 이 문서는 "어떤 데이터를 저장하는가"에 답합니다. 근거 문서: PRD.md, TRD.md
> v1.2부터 테이블이 2개입니다: `programs`(프로그램)와 `applicants`(신청자). 프로그램 1개에 신청자 여러 명이 속합니다.

```text
programs (1) ──< applicants (N)
   id  ◀──────────  program_id
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

## 업무 규칙

| 규칙 | 어디서 지키나 | 어기면 |
|---|---|---|
| 정원이 있는 프로그램은 신청자 수가 정원을 넘을 수 없다 | 서버 저장소 (신청 등록, 다른 프로그램으로 옮길 때) | 409 `PROGRAM_FULL` |
| 정원을 지금 신청자 수보다 적게 줄일 수 없다 | 서버 저장소 (프로그램 수정) | 400 `VALIDATION_ERROR` |
| 신청자가 있는 프로그램은 지울 수 없다 | 서버 저장소 + DB 외래 키 | 409 `PROGRAM_IN_USE` |
| 프로그램 이름은 겹칠 수 없다 | 서버 저장소 + DB 유일 조건 | 409 `DUPLICATE_PROGRAM` |

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

## TypeScript 타입 예시

```ts
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
