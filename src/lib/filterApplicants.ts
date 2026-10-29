// 필터 계산 (순수 함수: 같은 입력이면 항상 같은 결과, 원본 배열은 건드리지 않음)

import type { Applicant, ApplicantFilterValue } from "../types/applicant";

export function filterApplicants(
  applicants: Applicant[],
  filter: ApplicantFilterValue,
): Applicant[] {
  const keyword = filter.keyword.trim().toLowerCase();
  return applicants.filter((a) => {
    if (filter.attendance === "attended" && !a.attended) return false;
    if (filter.attendance === "absent" && a.attended) return false;
    if (filter.program !== "all" && a.program !== filter.program) return false;
    if (keyword !== "" && !a.name.toLowerCase().includes(keyword)) return false;
    return true;
  });
}

export function isFilterActive(filter: ApplicantFilterValue): boolean {
  return filter.attendance !== "all" || filter.program !== "all" || filter.keyword.trim() !== "";
}
