// 필터 계산 (순수 함수: 같은 입력이면 항상 같은 결과, 원본 배열은 건드리지 않음)

import type { Applicant, ApplicantFilterValue } from "../types/applicant";

// isAttended: "참석했는지" 판단 방법 (v1.3, 기본은 attended 값. 페이지는 회차 출석까지 반영한 hasAttended를 넘김)
export function filterApplicants(
  applicants: Applicant[],
  filter: ApplicantFilterValue,
  isAttended: (a: Applicant) => boolean = (a) => a.attended,
): Applicant[] {
  const keyword = filter.keyword.trim().toLowerCase();
  return applicants.filter((a) => {
    const attended = isAttended(a);
    if (filter.attendance === "attended" && !attended) return false;
    if (filter.attendance === "absent" && attended) return false;
    if (filter.program !== "all" && a.programId !== filter.program) return false;
    if (keyword !== "" && !a.name.toLowerCase().includes(keyword)) return false;
    return true;
  });
}

export function isFilterActive(filter: ApplicantFilterValue): boolean {
  return filter.attendance !== "all" || filter.program !== "all" || filter.keyword.trim() !== "";
}
