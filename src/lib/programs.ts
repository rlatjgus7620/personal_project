// 프로그램 관련 계산 (순수 함수, v1.2)

import type { Applicant, Program } from "../types/applicant";

// 번호로 프로그램 이름 찾기
export function programName(programs: Program[], id: number): string {
  return programs.find((p) => p.id === id)?.name ?? "알 수 없는 프로그램";
}

// 지금 명단으로 프로그램별 신청자 수를 다시 계산 (신청·삭제 직후에도 숫자가 바로 맞게)
export function withApplicantCounts(programs: Program[], applicants: Applicant[]): Program[] {
  return programs.map((p) => ({
    ...p,
    applicantCount: applicants.filter((a) => a.programId === p.id).length,
  }));
}

// 정원이 있고 이미 가득 찼는지
export function isFull(program: Program): boolean {
  return program.capacity !== null && program.applicantCount >= program.capacity;
}

// 신청 폼 선택지 문구: "모의면접", "모의면접 (3/10명)", "모의면접 (마감)"
export function programOptionLabel(program: Program): string {
  if (program.capacity === null) return program.name;
  if (isFull(program)) return `${program.name} (마감)`;
  return `${program.name} (${program.applicantCount}/${program.capacity}명)`;
}
