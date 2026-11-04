import { makeApplicant } from "../test-utils/makeApplicant";
import { makeSession } from "../test-utils/makeSession";
import { sessionRates } from "./stats";

test("LOGIC-28 회차별 출석률은 날짜순, 그 프로그램 신청자만 센다 (v2.6)", () => {
  const sessions = [
    makeSession({ id: 11, programId: 3, sessionDate: "2026-11-12" }),
    makeSession({ id: 10, programId: 3, sessionDate: "2026-11-10" }),
  ];
  const applicants = [
    makeApplicant({ id: 1, programId: 3 }),
    makeApplicant({ id: 2, programId: 3 }),
    makeApplicant({ id: 3, programId: 3 }),
    makeApplicant({ id: 4, programId: 3 }),
  ];
  const attendance = [
    { sessionId: 10, applicantId: 1 },
    { sessionId: 10, applicantId: 2 },
    { sessionId: 10, applicantId: 3 },
    { sessionId: 11, applicantId: 1 },
    { sessionId: 11, applicantId: 99 }, // 다른 사람(이미 지워진 기록 등)은 세지 않음
  ];
  expect(sessionRates(3, sessions, applicants, attendance)).toEqual([
    { sessionId: 10, label: "1회차 11.10", present: 3, total: 4, rate: 75 },
    { sessionId: 11, label: "2회차 11.12", present: 1, total: 4, rate: 25 },
  ]);
  expect(sessionRates(3, sessions, [], [])[0].rate).toBeNull();
  expect(sessionRates(9, sessions, applicants, attendance)).toEqual([]);
});
