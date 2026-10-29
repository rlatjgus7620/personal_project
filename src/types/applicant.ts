// 신청자 관련 공유 타입. docs/DATA_MODEL.md, docs/COMPONENT_SPEC.md와 같아야 합니다.

export type ProgramCode =
  | "job_search"
  | "resume_clinic"
  | "mock_interview"
  | "career_lecture";

// 화면에 보여줄 프로그램 이름 (DB에는 코드만 저장)
export const PROGRAMS: ReadonlyArray<{ code: ProgramCode; label: string }> = [
  { code: "job_search", label: "구직활동 프로그램" },
  { code: "resume_clinic", label: "이력서 클리닉" },
  { code: "mock_interview", label: "모의면접" },
  { code: "career_lecture", label: "취업 특강" },
];

export function programLabel(code: ProgramCode): string {
  return PROGRAMS.find((p) => p.code === code)?.label ?? code;
}

export type Applicant = {
  id: number;
  name: string;
  phone: string;
  program: ProgramCode;
  attended: boolean;
  // 서버가 JSON으로 보내는 날짜는 문자열(ISO 형식)이라서 string으로 받음
  createdAt: string;
  updatedAt: string;
};

// 등록할 때 보내는 값
export type ApplicantInput = {
  name: string;
  phone: string;
  program: ProgramCode;
};

// 수정할 때 보내는 값 (바꿀 항목만)
export type ApplicantChanges = Partial<ApplicantInput> & { attended?: boolean };

export type AttendanceFilter = "all" | "attended" | "absent";

export type ApplicantFilterValue = {
  attendance: AttendanceFilter;
  program: ProgramCode | "all";
  keyword: string;
};

export const INITIAL_FILTER: ApplicantFilterValue = {
  attendance: "all",
  program: "all",
  keyword: "",
};
