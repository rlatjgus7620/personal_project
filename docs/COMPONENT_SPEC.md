# COMPONENT_SPEC — 화면 부품 명세

> 이 문서는 "화면이 어떤 부품으로 이루어지는가"에 답합니다. 근거 문서: PRD.md, API_SPEC.md

## 1. 컴포넌트 트리

```text
ApplicantPage (app/page.tsx)       : 데이터와 상태를 가진 "지휘자"
├─ ApplicantSummary                : 전체 N명 · 참석 M명
├─ ApplicantForm                   : 이름 + 연락처 + 프로그램 + 등록 버튼
├─ ApplicantFilter          (v0.4) : 참석 여부 버튼 3개 + 프로그램 선택 + 이름 검색
└─ ApplicantList                   : 명단 (ul)
   └─ ApplicantItem                : 한 사람 (li) — 참석 체크, 정보, 수정, 삭제
```

원칙: **데이터를 바꾸는 일(API 호출)은 페이지만 한다.** 부품들은 화면을 그리고, 사용자가 무엇을 했는지 `onAdd`, `onToggle` 같은 함수로 페이지에 알리기만 한다.

## 2. 공유 타입

```ts
type ProgramCode = "job_search" | "resume_clinic" | "mock_interview" | "career_lecture";
type ApplicantInput = { name: string; phone: string; program: ProgramCode };
type ApplicantChanges = Partial<ApplicantInput>;          // 수정할 항목만
type AttendanceFilter = "all" | "attended" | "absent";
type ApplicantFilterValue = {
  attendance: AttendanceFilter;
  program: ProgramCode | "all";
  keyword: string;
};
```

## 3. 컴포넌트별 명세

### ApplicantSummary
| Props | 타입 |
|---|---|
| `applicants` | `Applicant[]` |

- 전체 명단(필터 전) 기준으로 `전체 {N}명 · 참석 {M}명`을 표시한다.

### ApplicantForm
| Props | 타입 | 설명 |
|---|---|---|
| `onAdd` | `(input: ApplicantInput) => Promise<boolean>` | 성공하면 `true`를 돌려준다 |

| 요소 | 접근 이름(label) |
|---|---|
| 이름 입력창 | 이름 (`maxLength=20`) |
| 연락처 입력창 | 연락처 (placeholder `010-0000-0000`, `maxLength=13`) |
| 프로그램 선택 | 프로그램 (첫 항목 "선택하세요", 값 `""`) |
| 버튼 | 등록 |

| 사용자 동작 | 결과 |
|---|---|
| 모두 바르게 입력 후 **등록** 클릭 또는 Enter | 앞뒤 공백을 자른 값으로 `onAdd` 호출. `true`가 오면 입력칸을 모두 비움 |
| `onAdd`가 `false`를 돌려줌 (서버 에러) | 입력값을 그대로 둠 (다시 고쳐서 등록할 수 있게) |
| 이름이 비었거나 공백만 | `onAdd` 호출 안 함. "이름을 입력해 주세요." 표시 |
| 연락처 형식이 틀림 | `onAdd` 호출 안 함. "연락처는 010-0000-0000 형식으로 입력해 주세요." 표시 |
| 프로그램을 안 고름 | `onAdd` 호출 안 함. "프로그램을 선택해 주세요." 표시 |

검사 문구는 `role="alert"`로 표시한다. 검사는 이름 → 연락처 → 프로그램 순서로 하고 첫 번째 문구 하나만 보여준다.

### ApplicantList
| Props | 타입 | 설명 |
|---|---|---|
| `applicants` | `Applicant[]` | 이미 필터된 목록 |
| `emptyMessage` | `string` | 0명일 때 문구 |
| `onToggle` | `(id: number) => void` | ApplicantItem에 그대로 전달 |
| `onDelete` | `(id: number) => void` | 〃 |
| `onEdit` | `(id: number, changes: ApplicantChanges) => void` | 〃 (v0.4) |

- 0명이면 `emptyMessage`를 보여준다. (페이지가 상황에 따라 "신청자가 없습니다" 또는 "조건에 맞는 신청자가 없습니다"를 넘긴다)
- 목록은 `ul`/`li`, key는 `applicant.id`

### ApplicantItem
| Props | 타입 |
|---|---|
| `applicant` | `Applicant` |
| `onToggle` | `(id: number) => void` |
| `onDelete` | `(id: number) => void` |
| `onEdit` | `(id: number, changes: ApplicantChanges) => void` |

**보기 모드**

| 요소 | 내용 / 접근 이름 |
|---|---|
| 체크박스 | `{이름} 참석` |
| 이름 | 그대로 |
| 프로그램 | 화면 이름 (예: 모의면접) |
| 연락처 | 가운데를 가린 값 (예: `010-****-5678`). 전체 번호는 화면에 나오지 않음 |
| 신청일 | `2026.10.29` 형식 |
| 참석 표시 | 참석이면 "참석 완료" 표시와 초록 배경 |
| 수정 버튼 | `{이름} 수정` (v0.4) |
| 삭제 버튼 | `{이름} 삭제` |

| 사용자 동작 | 결과 |
|---|---|
| 체크박스 클릭 | `onToggle(id)` |
| 삭제 버튼 클릭 | `onDelete(id)` |
| 수정 버튼 클릭 | 수정 모드로 바뀜 (v0.4) |

**수정 모드 (v0.4)**

| 요소 | 접근 이름 |
|---|---|
| 이름 입력창 | 이름 수정 (기존 값, 자동 포커스) |
| 연락처 입력창 | 연락처 수정 (기존 전체 번호) |
| 프로그램 선택 | 프로그램 수정 |
| 버튼 | 저장, 취소 |

| 사용자 동작 | 결과 |
|---|---|
| 값을 바꾸고 **저장** 또는 Enter | **바뀐 항목만** 담아 `onEdit(id, changes)` 호출, 보기 모드로 |
| 아무것도 안 바꾸고 저장 | `onEdit` 호출 안 함, 보기 모드로 |
| **취소** 또는 Esc | `onEdit` 호출 안 함, 원래 값으로 보기 모드 |
| 빈 이름 / 틀린 연락처로 저장 | `onEdit` 호출 안 함, 수정 모드 유지, ApplicantForm과 같은 문구 표시 |

### ApplicantFilter (v0.4)
| Props | 타입 |
|---|---|
| `value` | `ApplicantFilterValue` |
| `onChange` | `(value: ApplicantFilterValue) => void` |

| 요소 | 내용 |
|---|---|
| 참석 여부 버튼 3개 | 전체(`all`) / 참석(`attended`) / 미참석(`absent`). 선택된 버튼은 `aria-pressed="true"` |
| 프로그램 선택 | 접근 이름 "프로그램 필터". "전체 프로그램"(`all`) + 프로그램 4개 |
| 검색창 | 접근 이름 "이름 검색", placeholder "이름으로 검색" |

- 무엇을 바꾸든 바뀐 항목만 새 값으로 바꾼 **전체 필터 값**으로 `onChange`를 부른다.
- 필터 값은 페이지의 `useState`로 관리하고, 보여줄 목록은 `filterApplicants()`로 계산한다. (필터된 목록을 따로 state에 저장하지 않음)

## 4. 페이지 상태별 화면

| 상태 | 화면 |
|---|---|
| 처음 불러오는 중 | 명단 자리에 "불러오는 중..." |
| 서버 연결 실패 | 빨간 알림(`role="alert"`)에 "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." |
| 서버가 400/404/409를 돌려줌 | 빨간 알림에 서버의 `error.message` |
| 신청자 0명 | "신청자가 없습니다" |
| 필터 결과 0명 | "조건에 맞는 신청자가 없습니다" |

새 작업(등록·체크·삭제·수정)을 시작하면 이전 알림은 지운다.
