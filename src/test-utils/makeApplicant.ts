// 테스트용 가짜 신청자를 만드는 작은 함수 (실제 개인정보 아님)
import type { Applicant } from "../types/applicant";

export function makeApplicant(overrides: Partial<Applicant> = {}): Applicant {
  return {
    id: 1,
    name: "김테스트",
    phone: "010-1234-5678",
    program: "resume_clinic",
    attended: false,
    createdAt: "2026-10-29T05:00:00Z",
    updatedAt: "2026-10-29T05:00:00Z",
    ...overrides,
  };
}
