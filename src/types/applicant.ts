// 신청자·프로그램 공유 타입. docs/DATA_MODEL.md, docs/COMPONENT_SPEC.md와 같아야 합니다.

// 프로그램 (v1.2부터 서버 DB에 저장. 코드에 고정하지 않음)
export type Program = {
  id: number;
  name: string;
  startDate: string | null; // "2026-11-10"
  endDate: string | null;
  location: string | null;
  capacity: number | null; // null이면 정원 제한 없음
  applicantCount: number; // 지금 신청자 수
};

// 프로그램을 추가·수정할 때 보내는 값
export type ProgramInput = Omit<Program, "id" | "applicantCount">;

export type Applicant = {
  id: number;
  name: string;
  phone: string;
  programId: number;
  attended: boolean;
  // 서버가 JSON으로 보내는 날짜는 문자열(ISO 형식)이라서 string으로 받음
  createdAt: string;
  updatedAt: string;
};

// 등록할 때 보내는 값
export type ApplicantInput = {
  name: string;
  phone: string;
  programId: number;
};

// 수정할 때 보내는 값 (바꿀 항목만)
export type ApplicantChanges = Partial<ApplicantInput> & { attended?: boolean };

// ---------- 회차·출석 (v1.3) ----------

// 프로그램의 회차 (날짜 하나)
export type Session = {
  id: number;
  programId: number;
  sessionDate: string; // "2026-11-10"
  note: string | null; // 예: "OT"
  attendeeCount: number; // 이 회차 출석 인원
};

// 출석 기록 한 줄 (줄이 있으면 출석, 없으면 결석)
export type AttendanceRecord = { sessionId: number; applicantId: number };

// 회차를 추가할 때 보내는 값
export type SessionInput = { sessionDate: string; note: string | null };

// 한 신청자의 출석 횟수 / 그 프로그램 회차 수
export type SessionStat = { attended: number; total: number };

export type AttendanceFilter = "all" | "attended" | "absent";

export type ApplicantFilterValue = {
  attendance: AttendanceFilter;
  program: number | "all"; // 프로그램 번호
  keyword: string;
};

export const INITIAL_FILTER: ApplicantFilterValue = {
  attendance: "all",
  program: "all",
  keyword: "",
};
