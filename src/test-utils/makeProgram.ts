// 테스트용 가짜 프로그램 (v1.2)
import type { Program } from "../types/applicant";

export function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 1,
    name: "구직활동 프로그램",
    startDate: null,
    endDate: null,
    location: null,
    capacity: null,
    applicantCount: 0,
    ...overrides,
  };
}

// 마이그레이션이 처음 넣는 프로그램 4개와 같은 구성
export const TEST_PROGRAMS: Program[] = [
  makeProgram({ id: 1, name: "구직활동 프로그램" }),
  makeProgram({ id: 2, name: "이력서 클리닉" }),
  makeProgram({ id: 3, name: "모의면접" }),
  makeProgram({ id: 4, name: "취업 특강" }),
];
