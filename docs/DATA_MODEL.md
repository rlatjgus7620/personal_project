# DATA_MODEL — 데이터 모델

> 이 문서는 "어떤 데이터를 저장하는가"에 답합니다. 근거 문서: PRD.md, TRD.md
> 테이블은 하나(`applicants`)만 씁니다. 프로그램 테이블 분리는 v1.1에서 합니다.

## applicants 테이블

| 필드(DB / 파이썬) | JSON 이름 | 타입 | 제약조건 | 설명 |
|---|---|---|---|---|
| `id` | `id` | `integer` | PK, 자동 증가 | 신청 번호 |
| `name` | `name` | `varchar(20)` | 필수, 1~20자, 앞뒤 공백 제거 | 신청자 이름 |
| `phone` | `phone` | `varchar(13)` | 필수, `010-0000-0000` 형식 | 연락처 |
| `program` | `program` | `varchar(30)` | 필수, 아래 4개 코드 중 하나 | 신청 프로그램 |
| `attended` | `attended` | `boolean` | 기본값 `false` | 참석 여부 |
| `created_at` | `createdAt` | `timestamp (timezone)` | 기본값 현재 시각 | 신청일 |
| `updated_at` | `updatedAt` | `timestamp (timezone)` | 기본값 현재 시각, 수정 때 갱신 | 마지막 수정 시각 |

**유일 조건:** (`phone`, `program`) 조합은 중복될 수 없다. → 같은 연락처로 같은 프로그램에 두 번 신청 불가 (F-08)

## 프로그램 코드

DB와 API에는 영어 코드를 저장하고, 화면에서만 한국어 이름으로 바꿔 보여줍니다.
(나중에 프로그램 이름을 바꿔도 저장된 데이터는 그대로 두기 위해서입니다.)

| 코드 | 화면 이름 |
|---|---|
| `job_search` | 구직활동 프로그램 |
| `resume_clinic` | 이력서 클리닉 |
| `mock_interview` | 모의면접 |
| `career_lecture` | 취업 특강 |

## 검사 규칙 정리

| 항목 | 규칙 | 통과 예 | 실패 예 |
|---|---|---|---|
| 이름 | 앞뒤 공백 제거 후 1~20자 | `"  김테스트 "` → `"김테스트"` | `""`, `"   "`, 21자 |
| 연락처 | 정규식 `^010-\d{4}-\d{4}$` | `010-1234-5678` | `01012345678`, `010-123-4567` |
| 프로그램 | 위 4개 코드 중 하나 | `mock_interview` | `cooking` |

## TypeScript 타입 예시

```ts
export type ProgramCode =
  | "job_search"
  | "resume_clinic"
  | "mock_interview"
  | "career_lecture";

export type Applicant = {
  id: number;
  name: string;
  phone: string;
  program: ProgramCode;
  attended: boolean;
  createdAt: string; // 서버가 JSON으로 보내는 날짜는 ISO 문자열
  updatedAt: string;
};
```
