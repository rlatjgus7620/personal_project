// 필터 계산 (순수 함수: 같은 입력이면 항상 같은 결과, 원본 배열은 건드리지 않음)

import type { Applicant, ApplicantFilterValue } from "../types/applicant";

// 검색어가 이름에 들어 있거나, 숫자면 연락처 뒷자리와 맞는지 (v2.4)
// 숫자 4자리 이하는 뒷자리 4개의 앞부분부터 맞춰 봄 → "56", "567", "5678" 모두 010-1234-5678과 맞음
export function matchesKeyword(applicant: Applicant, keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (k === "") return true;
  if (applicant.name.toLowerCase().includes(k)) return true;
  const digits = k.replace(/-/g, "");
  if (!/^\d+$/.test(digits)) return false;
  const phone = applicant.phone.replace(/\D/g, "");
  return digits.length <= 4 ? phone.slice(-4).startsWith(digits) : phone.endsWith(digits);
}

// isAttended: "참석했는지" 판단 방법 (v1.3, 기본은 attended 값. 페이지는 회차 출석까지 반영한 hasAttended를 넘김)
export function filterApplicants(
  applicants: Applicant[],
  filter: ApplicantFilterValue,
  isAttended: (a: Applicant) => boolean = (a) => a.attended,
): Applicant[] {
  return applicants.filter((a) => {
    const attended = isAttended(a);
    if (filter.attendance === "attended" && !attended) return false;
    if (filter.attendance === "absent" && attended) return false;
    if (filter.program !== "all" && a.programId !== filter.program) return false;
    if (!matchesKeyword(a, filter.keyword)) return false;
    return true;
  });
}

export function isFilterActive(filter: ApplicantFilterValue): boolean {
  return filter.attendance !== "all" || filter.program !== "all" || filter.keyword.trim() !== "";
}
