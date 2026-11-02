// 테스트용 가짜 회차 (v1.3)
import type { Session } from "../types/applicant";

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    programId: 3, // TEST_PROGRAMS의 모의면접
    sessionDate: "2026-11-10",
    note: null,
    attendeeCount: 0,
    ...overrides,
  };
}
