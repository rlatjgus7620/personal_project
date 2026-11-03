# COMPONENT_SPEC — 화면 부품 명세

> 이 문서는 "화면이 어떤 부품으로 이루어지는가"에 답합니다. 근거 문서: PRD.md, API_SPEC.md

## 1. 컴포넌트 트리

```text
Home (app/page.tsx)                  (v2.0) : 로그인 문지기 — 토큰이 없으면 LoginForm, 있으면 AdminDashboard
├─ LoginForm                         (v2.0) : 관리자 비밀번호 입력 + 로그인 버튼
└─ AdminDashboard                    (v2.0) : 데이터와 상태를 가진 "지휘자" (v1.3까지의 page.tsx 내용) + 로그아웃 버튼
   ├─ ApplicantSummary                      : 전체 N명 · 참석 M명
   ├─ ProgramSummary                 (v1.1) : 프로그램별 신청·참석 인원, 참석률, 정원·마감 (v1.2)
   ├─ ProgramManager                 (v1.2) : 프로그램 목록·추가·수정·삭제 (접었다 펴는 칸)
   │  └─ ProgramForm                 (v1.2) : 프로그램 이름·시작일·종료일·장소·정원 입력
   ├─ AttendanceBook                 (v1.3) : 회차 출석부 — 프로그램·회차 고르기, 회차 추가·삭제, 출석 체크 (접었다 펴는 칸)
   ├─ ApplicantForm                         : 이름 + 연락처 + 프로그램 + 등록 버튼
   ├─ ApplicantFilter                (v0.4) : 참석 여부 버튼 3개 + 프로그램 선택 + 이름 검색
   ├─ ExportButton                   (v1.1) : 지금 보이는 명단을 CSV로 저장
   └─ ApplicantList                         : 명단 (ul)
      └─ ApplicantItem                      : 한 사람 (li) — 참석 체크, 정보, 수정, 삭제
```

원칙: **데이터를 바꾸는 일(API 호출)은 페이지(v2.0부터 AdminDashboard)만 한다.** 부품들은 화면을 그리고, 사용자가 무엇을 했는지 `onAdd`, `onToggle` 같은 함수로 페이지에 알리기만 한다.

v1.3부터 페이지는 회차(`GET /api/sessions`)와 출석 기록(`GET /api/attendance`)도 함께 불러온다. 신청자별 "출석 2/3회", 프로그램 출석률은 `lib/attendance.ts`의 순수 함수로 계산한다.

v1.2부터 프로그램 목록은 코드에 고정하지 않고 서버(`GET /api/programs`)에서 받아 온다. 각 프로그램의 신청자 수(`applicantCount`)는 페이지가 지금 명단으로 다시 계산해서(`withApplicantCounts`) 부품들에 넘긴다. 그래서 신청·삭제 직후에도 숫자가 바로 맞는다.

## 2. 공유 타입

v2.0: `lib/applicantApi.ts`는 `ApiError`(`message` + `status`)를 던진다. 연결 자체가 안 되면 `status`는 `0`.

```ts
type Program = {
  id: number; name: string;
  startDate: string | null; endDate: string | null;   // "2026-11-10"
  location: string | null; capacity: number | null;   // capacity null = 제한 없음
  applicantCount: number;
};
type ProgramInput = Omit<Program, "id" | "applicantCount">; // 추가·수정할 때 보내는 값
type ApplicantInput = { name: string; phone: string; programId: number };
type ApplicantChanges = Partial<ApplicantInput> & { attended?: boolean }; // 수정할 항목만
type AttendanceFilter = "all" | "attended" | "absent";
type ApplicantFilterValue = {
  attendance: AttendanceFilter;
  program: number | "all";   // 프로그램 번호
  keyword: string;
};
```

"마감"의 뜻: `capacity`가 있고 `applicantCount >= capacity` (`isFull()`)

```ts
// v1.3
type Session = { id: number; programId: number; sessionDate: string; note: string | null; attendeeCount: number };
type AttendanceRecord = { sessionId: number; applicantId: number };   // 줄이 있으면 출석
type SessionInput = { sessionDate: string; note: string | null };
type SessionStat = { attended: number; total: number };               // 출석 횟수 / 회차 수
```

"참석한 사람"의 뜻(v1.3, `hasAttended()`): 회차가 없는 프로그램이면 `attended`, 회차가 있는 프로그램이면 1회 이상 출석.
ApplicantSummary의 "참석 M명", ApplicantFilter의 참석/미참석은 이 뜻을 쓴다.

## 3. 컴포넌트별 명세

### Home (app/page.tsx, v2.0)
- 처음 열릴 때 `loadToken()`으로 `sessionStorage`의 토큰을 읽어 `setAuthToken()`에 넣는다.
- 토큰이 없으면 `LoginForm`, 있으면 `AdminDashboard`를 보여준다.
- 로그인 성공 → 토큰 저장(`saveToken`), `AdminDashboard`로.
- 로그아웃 또는 401 → 토큰 지우기(`clearToken`), `LoginForm`으로. 401이면 서버 문구("로그인이 필요합니다. 다시 로그인해 주세요.")를 LoginForm에 `notice`로 넘긴다.

### LoginForm (v2.0)
| Props | 타입 | 설명 |
|---|---|---|
| `onLogin` | `(password: string) => Promise<string \| null>` | 성공하면 `null`, 실패하면 보여줄 문구 |
| `notice` | `string \| null` (선택) | 로그인 화면 위에 보여줄 안내 (예: 로그인 만료) |

- 제목 `관리자 로그인`, 비밀번호 입력(`type="password"`, 접근 이름 "관리자 비밀번호", `autoComplete="current-password"`), **로그인** 버튼
- 비밀번호가 비면 보내지 않고 "비밀번호를 입력해 주세요." (`role="alert"`)
- 보내는 동안 버튼을 잠근다. `onLogin`이 문구를 돌려주면 `role="alert"`로 보여주고 입력칸을 비운다.
- `notice`는 `role="status"`로 보여준다.

### AdminDashboard (v2.0)
| Props | 타입 | 설명 |
|---|---|---|
| `onLogout` | `() => void` | **로그아웃** 버튼 |
| `onUnauthorized` | `(message: string) => void` | 서버가 401을 주면 호출 (Home이 로그인 화면으로 바꿈) |

- v1.3까지 `app/page.tsx`가 하던 일(데이터 불러오기·저장, 부품 배치)을 그대로 옮긴다.
- 머리글 오른쪽에 요약과 **로그아웃** 버튼.
- 어떤 API든 `ApiError`의 `status`가 401이면 빨간 알림 대신 `onUnauthorized(message)`.

### ApplicantSummary
| Props | 타입 |
|---|---|
| `applicants` | `Applicant[]` |
| `isAttended` | `(a: Applicant) => boolean` (선택, 기본 `a.attended`, v1.3) |

- 전체 명단(필터 전) 기준으로 `전체 {N}명 · 참석 {M}명`을 표시한다.

### ApplicantForm
| Props | 타입 | 설명 |
|---|---|---|
| `programs` | `Program[]` | 신청자 수가 계산된 프로그램 목록 (v1.2) |
| `onAdd` | `(input: ApplicantInput) => Promise<boolean>` | 성공하면 `true`를 돌려준다 |

| 요소 | 접근 이름(label) |
|---|---|
| 이름 입력창 | 이름 (`maxLength=20`) |
| 연락처 입력창 | 연락처 (placeholder `010-0000-0000`, `maxLength=13`). 입력하는 대로 숫자만 남기고 `010-1234-5678` 모양으로 하이픈을 자동으로 넣음 (`formatPhoneInput`) |
| 프로그램 선택 | 프로그램 (첫 항목 "선택하세요", 값 `""`). 항목 문구는 `programOptionLabel()`: 정원이 있으면 `모의면접 (7/10명)`, 마감이면 `모의면접 (마감)`이고 **선택할 수 없음(disabled)** |
| 버튼 | 등록 |

| 사용자 동작 | 결과 |
|---|---|
| 모두 바르게 입력 후 **등록** 클릭 또는 Enter | 앞뒤 공백을 자른 값으로 `onAdd({ name, phone, programId })` 호출. `true`가 오면 입력칸을 모두 비움 |
| `onAdd`가 `false`를 돌려줌 (서버 에러) | 입력값을 그대로 둠 (다시 고쳐서 등록할 수 있게) |
| 이름이 비었거나 공백만 | `onAdd` 호출 안 함. "이름을 입력해 주세요." 표시 |
| 연락처 형식이 틀림 | `onAdd` 호출 안 함. "연락처는 010-0000-0000 형식으로 입력해 주세요." 표시 |
| 프로그램을 안 고름 | `onAdd` 호출 안 함. "프로그램을 선택해 주세요." 표시 |
| 프로그램이 하나도 없음 (v1.2) | 폼 아래에 "먼저 프로그램 관리에서 프로그램을 추가해 주세요." 안내 |

검사 문구는 `role="alert"`로 표시한다. 검사는 이름 → 연락처 → 프로그램 순서로 하고 첫 번째 문구 하나만 보여준다.

### ApplicantList
| Props | 타입 | 설명 |
|---|---|---|
| `applicants` | `Applicant[]` | 이미 필터된 목록 |
| `programs` | `Program[]` | ApplicantItem에 그대로 전달 (v1.2) |
| `emptyMessage` | `string` | 0명일 때 문구 |
| `onToggle` | `(id: number) => void` | ApplicantItem에 그대로 전달 |
| `onDelete` | `(id: number) => void` | 〃 |
| `onEdit` | `(id: number, changes: ApplicantChanges) => Promise<boolean>` | 〃 (v0.4) |
| `busyIds` | `ReadonlySet<number>` | 서버 처리 중인 신청자 id. 해당 ApplicantItem에 `busy`로 전달 |
| `sessionStatOf` | `(a: Applicant) => SessionStat \| null` (선택, v1.3) | ApplicantItem의 `sessionStat`으로 전달 |

- 0명이면 `emptyMessage`를 보여준다. (페이지가 상황에 따라 "신청자가 없습니다" 또는 "조건에 맞는 신청자가 없습니다"를 넘긴다)
- 목록은 `ul`/`li`, key는 `applicant.id`

### ApplicantItem
| Props | 타입 | 설명 |
|---|---|---|
| `applicant` | `Applicant` | |
| `programs` | `Program[]` | 프로그램 이름 표시와 수정용 선택지 (v1.2) |
| `onToggle` | `(id: number) => void` | |
| `onDelete` | `(id: number) => void` | |
| `onEdit` | `(id: number, changes: ApplicantChanges) => Promise<boolean>` | 서버 저장에 성공하면 `true` |
| `busy` | `boolean` (기본 `false`) | 서버 처리 중이면 `true` |
| `sessionStat` | `SessionStat \| null` (선택, v1.3) | 회차가 있는 프로그램이면 출석 횟수. 있으면 체크박스 대신 "출석 2/3회" 표시 |

**보기 모드**

| 요소 | 내용 / 접근 이름 |
|---|---|
| 체크박스 | `{이름} 참석` (회차 없는 프로그램만) |
| 출석 횟수 (v1.3) | 회차 있는 프로그램이면 체크박스 자리에 `출석 {M}/{N}회`. 1회 이상이면 초록 배경 |
| 이름 | 그대로 |
| 프로그램 | 프로그램 이름 (`programName()`, 목록에 없으면 "알 수 없는 프로그램") |
| 연락처 | 가운데를 가린 값 (예: `010-****-5678`). 전체 번호는 화면에 나오지 않음 |
| 신청일 | `2026.10.29` 형식 |
| 참석 표시 | 참석이면 "참석 완료" 표시와 초록 배경 |
| 수정 버튼 | `{이름} 수정` (v0.4) |
| 삭제 버튼 | `{이름} 삭제` |

| 사용자 동작 | 결과 |
|---|---|
| 체크박스 클릭 | `onToggle(id)` |
| 삭제 버튼 클릭 | 바로 지우지 않고 그 줄에 "{이름} 님의 신청을 취소할까요?"와 **삭제 확인** / **아니요** 버튼을 보여줌 |
| **삭제 확인** 클릭 | `onDelete(id)` |
| **아니요** 클릭 | `onDelete` 호출 안 함, 원래 모습으로 |
| `busy=true`일 때 | 체크박스·수정·삭제 버튼이 비활성화되어 눌리지 않음 (두 번 눌러 값이 꼬이는 것 방지) |
| 수정 버튼 클릭 | 수정 모드로 바뀜 (v0.4) |

**수정 모드 (v0.4)**

| 요소 | 접근 이름 |
|---|---|
| 이름 입력창 | 이름 수정 (기존 값, 자동 포커스) |
| 연락처 입력창 | 연락처 수정 (기존 전체 번호, 등록 폼과 같은 하이픈 자동 입력) |
| 프로그램 선택 | 프로그램 수정. 마감된 다른 프로그램은 선택할 수 없음 (지금 프로그램은 마감이어도 선택 가능) |
| 버튼 | 저장, 취소 |

| 사용자 동작 | 결과 |
|---|---|
| 값을 바꾸고 **저장** 또는 Enter | **바뀐 항목만** 담아 `onEdit(id, changes)` 호출. `true`가 오면 보기 모드로 |
| `onEdit`가 `false`를 돌려줌 (서버 에러, 예: 중복) | 수정 모드와 입력한 값을 그대로 유지 (다시 고칠 수 있게) |
| 아무것도 안 바꾸고 저장 | `onEdit` 호출 안 함, 보기 모드로 |
| **취소** 또는 Esc | `onEdit` 호출 안 함, 원래 값으로 보기 모드 |
| 빈 이름 / 틀린 연락처로 저장 | `onEdit` 호출 안 함, 수정 모드 유지, ApplicantForm과 같은 문구 표시 |

### ApplicantFilter (v0.4)
| Props | 타입 |
|---|---|
| `value` | `ApplicantFilterValue` |
| `programs` | `Program[]` (v1.2) |
| `onChange` | `(value: ApplicantFilterValue) => void` |

참석/미참석 계산은 페이지가 `filterApplicants(applicants, filter, hasAttended)`로 한다 (v1.3).

| 요소 | 내용 |
|---|---|
| 참석 여부 버튼 3개 | 전체(`all`) / 참석(`attended`) / 미참석(`absent`). 선택된 버튼은 `aria-pressed="true"` |
| 프로그램 선택 | 접근 이름 "프로그램 필터". "전체 프로그램"(`all`) + 서버에서 받은 프로그램들 (값은 프로그램 번호) |
| 검색창 | 접근 이름 "이름 검색", placeholder "이름으로 검색" |

- 무엇을 바꾸든 바뀐 항목만 새 값으로 바꾼 **전체 필터 값**으로 `onChange`를 부른다.
- 필터 값은 페이지의 `useState`로 관리하고, 보여줄 목록은 `filterApplicants()`로 계산한다. (필터된 목록을 따로 state에 저장하지 않음)

### ProgramSummary (v1.1, v1.2에서 확장)
| Props | 타입 |
|---|---|
| `programs` | `Program[]` (신청자 수가 계산된 목록, v1.2) |
| `applicants` | `Applicant[]` (필터 전 전체 명단) |

- 프로그램마다 카드 하나 (서버에서 받은 순서). 신청자가 0명인 프로그램도 보여준다.
- v1.3: `sessions`, `attendance` Props(선택)를 받는다. 회차가 있는 프로그램 카드는 `신청 {N}명 · 회차 {K}개`(정원이 있으면 `신청 {N}/{정원}명 · 회차 {K}개`), `출석률 {P}%` (= 출석 기록 ÷ (신청자 × 회차 수)). 신청 0명이면 `출석률 -`
- 카드 내용(회차 없는 프로그램): 프로그램 이름, 정원이 있으면 `신청 {N}/{정원}명 · 참석 {M}명`, 없으면 `신청 {N}명 · 참석 {M}명`, `참석률 {P}%` (신청 0명이면 `참석률 -`)
- 마감이면 이름 옆에 **마감** 표시 (v1.2)
- 프로그램이 하나도 없으면 카드 대신 "등록된 프로그램이 없습니다"
- 참석률은 소수점 없이 반올림. 계산은 `summarizeByProgram()` 순수 함수가 한다.

### ProgramManager (v1.2)
| Props | 타입 | 설명 |
|---|---|---|
| `programs` | `Program[]` | 신청자 수가 계산된 목록 |
| `onAdd` | `(input: ProgramInput) => Promise<boolean>` | 성공하면 `true` |
| `onUpdate` | `(id: number, input: ProgramInput) => Promise<boolean>` | 폼의 모든 값을 보냄. 성공하면 `true` |
| `onDelete` | `(id: number) => void` | |

- 전체를 `<details>`로 감싸 평소에는 접어 둔다. 제목: `프로그램 관리 ({개수}개)`
- 프로그램 한 줄: 이름, 기간(`formatPeriod()`: `2026.11.10 ~ 2026.11.12`, 하루면 `2026.11.10`, 없으면 `기간 미정`), 장소(없으면 `장소 미정`), 정원(`신청 7/10명` 또는 `신청 7명 · 정원 제한 없음`)
- 버튼: `{프로그램 이름} 수정`, `{프로그램 이름} 삭제`
  - 신청자가 있으면 삭제 버튼은 비활성화 (서버도 409로 막음)
  - 삭제를 누르면 "{프로그램 이름} 프로그램을 삭제할까요?"와 **삭제 확인** / **아니요** (신청자 삭제와 같은 방식)
- 수정을 누르면 그 줄이 ProgramForm(기존 값, 버튼 **저장**·**취소**)으로 바뀐다. `onUpdate`가 `true`면 다시 보기로.
- 목록 아래에 새 프로그램용 ProgramForm(버튼 **프로그램 추가**). `onAdd`가 `true`면 입력칸을 비운다.
- 프로그램이 없으면 "등록된 프로그램이 없습니다. 아래에서 추가해 주세요."

### ProgramForm (v1.2)
| Props | 타입 | 설명 |
|---|---|---|
| `initial` | `Program` (선택) | 수정할 때 기존 값 |
| `submitLabel` | `string` | "프로그램 추가" 또는 "저장" |
| `onSubmit` | `(input: ProgramInput) => Promise<boolean>` | 성공하면 `true` |
| `onCancel` | `() => void` (선택) | 있으면 **취소** 버튼을 보여줌 |

| 요소 | 접근 이름 | 비고 |
|---|---|---|
| 이름 입력창 | 프로그램 이름 | `maxLength=30` |
| 날짜 입력 2개 | 시작일, 종료일 | `type="date"` |
| 장소 입력창 | 장소 | `maxLength=50` |
| 정원 입력창 | 정원 | `type="number"`, placeholder "제한 없음" |

- 빈 칸은 `null`로 보낸다. 정원은 숫자로 바꿔서 보낸다.
- 보내기 전에 `validateProgram()`으로 검사하고, 문제가 있으면 첫 문구를 `role="alert"`로 보여주고 보내지 않는다. 문구는 API_SPEC과 같다.
- `onSubmit`이 `true`면: 추가 폼은 입력칸을 비우고, 수정 폼은 그대로 둔다(부모가 닫음). `false`면 입력값을 유지한다.

### AttendanceBook (v1.3)
| Props | 타입 | 설명 |
|---|---|---|
| `programs` | `Program[]` | |
| `applicants` | `Applicant[]` | 전체 명단 |
| `sessions` | `Session[]` | 전체 회차 |
| `attendance` | `AttendanceRecord[]` | 전체 출석 기록 |
| `onAddSession` | `(programId: number, input: SessionInput) => Promise<boolean>` | 성공하면 `true` |
| `onDeleteSession` | `(sessionId: number) => void` | |
| `onToggle` | `(sessionId: number, applicantId: number, present: boolean) => void` | 출석 체크(`true`)·해제(`false`) |

- `<details>`로 감싸 평소에는 접어 둔다. 제목: `회차 출석부`
- **프로그램 선택** (접근 이름 "출석부 프로그램"): 처음에는 첫 프로그램. 프로그램이 없으면 "먼저 프로그램 관리에서 프로그램을 추가해 주세요."
- **회차 버튼들**: 그 프로그램 회차를 날짜순으로 `1회차 11.10`, `2회차 11.12`… 고른 회차는 `aria-pressed="true"`. 처음에는 첫 회차, 회차를 추가하면 새 회차를 고른다.
- 회차가 없으면 "회차를 추가하면 이 프로그램은 출석부에서 회차별로 출석을 체크합니다."
- **회차 추가 폼**: 날짜 입력(접근 이름 "회차 날짜", 필수) + 메모 입력("회차 메모", 30자) + **회차 추가** 버튼. 날짜가 비면 "회차 날짜를 입력해 주세요."
- **고른 회차 보기**:
  - 제목: `1회차 · 2026.11.10 (OT) · 출석 {M}/{N}명` (N = 그 프로그램 신청자 수)
  - **회차 삭제** 버튼(`{N}회차 삭제`) → "{N}회차({날짜})를 삭제할까요? 출석 기록도 함께 지워집니다." + **삭제 확인** / **아니요**
  - 그 프로그램 신청자마다 한 줄(이름순): 체크박스(`{이름} 출석`, 이 회차 출석이면 체크), 이름, 가린 연락처, `누적 {m}/{n}회`
  - 신청자가 없으면 "이 프로그램 신청자가 없습니다"
- 체크박스를 누르면 `onToggle(회차 id, 신청자 id, 체크 후 상태)`

### ExportButton (v1.1)
| Props | 타입 |
|---|---|
| `applicants` | `Applicant[]` (지금 화면에 보이는, 필터된 명단) |
| `programs` | `Program[]` (프로그램 이름을 쓰기 위해, v1.2) |

- 버튼 문구: **명단 CSV 내보내기**. 0명이면 비활성화.
- 누르면 `toCsv()`로 만든 내용을 `신청자명단_YYYYMMDD.csv`(오늘 날짜, 한국 시간)로 내려받는다.
- CSV 열: `번호, 이름, 연락처, 프로그램, 참석, 신청일` / 참석 값은 `참석` 또는 `미참석`, 회차가 있는 프로그램이면 `출석 2/3회` (v1.3, `sessions`·`attendance` Props 선택)
- 엑셀에서 한글이 깨지지 않도록 파일 맨 앞에 BOM(`﻿`)을 붙인다.
- 값에 쉼표·따옴표·줄바꿈이 있으면 큰따옴표로 감싸고, 값 안의 `"`는 `""`로 바꾼다.
- 엑셀이 `=`, `+`, `-`, `@`로 시작하는 값을 수식으로 실행하지 않도록 그런 값 앞에는 `'`를 붙인다.

## 4. 페이지 상태별 화면

| 상태 | 화면 |
|---|---|
| 로그인 전 (v2.0) | LoginForm만 보임. 명단 API는 부르지 않음 |
| 로그인 만료·토큰 틀림 (v2.0) | LoginForm으로 돌아가고 "로그인이 필요합니다. 다시 로그인해 주세요." |
| 처음 불러오는 중 | 명단 자리에 "불러오는 중..." (프로그램과 명단을 함께 불러옴) |
| 서버 연결 실패 | 빨간 알림(`role="alert"`)에 "서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주세요." |
| 서버가 400/404/409를 돌려줌 | 빨간 알림에 서버의 `error.message` (예: "정원이 가득 찼습니다. (정원 10명)") |
| 신청자 0명 | "신청자가 없습니다" |
| 필터 결과 0명 | "조건에 맞는 신청자가 없습니다" |

새 작업(등록·체크·삭제·수정, 프로그램 추가·수정·삭제)을 시작하면 이전 알림은 지운다.
체크·삭제·수정은 서버 답을 받을 때까지 그 신청자 id를 `busyIds`에 넣어 두고, 끝나면 뺀다.
프로그램을 지우면, 필터가 그 프로그램을 고르고 있던 경우 필터를 "전체 프로그램"으로 되돌린다.
프로그램·회차·신청자를 지우면 화면에 들고 있던 회차·출석 기록에서도 같이 뺀다 (v1.3).
출석 체크는 서버 답을 받은 뒤 화면의 출석 기록을 바꾼다. 실패하면 빨간 알림.
