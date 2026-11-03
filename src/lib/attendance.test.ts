import { makeApplicant } from "../test-utils/makeApplicant";
import { makeSession } from "../test-utils/makeSession";
import {
  applicantSessionStat,
  attendanceRate,
  isCompleted,
  hasAttended,
  isPresent,
  sessionStatLabel,
  sessionTitle,
  sessionsOf,
  shortDate,
} from "./attendance";

const SESSIONS = [
  makeSession({ id: 2, programId: 3, sessionDate: "2026-11-12" }),
  makeSession({ id: 9, programId: 4, sessionDate: "2026-11-01" }),
  makeSession({ id: 1, programId: 3, sessionDate: "2026-11-10", note: "OT" }),
  makeSession({ id: 3, programId: 3, sessionDate: "2026-11-14" }),
];

test("LOGIC-15 sessionsOf는 그 프로그램 회차만 날짜순으로, sessionTitle은 순서·날짜·메모를 보여준다", () => {
  const mine = sessionsOf(SESSIONS, 3);
  expect(mine.map((s) => s.id)).toEqual([1, 2, 3]);
  expect(sessionTitle(mine[0], 1)).toBe("1회차 · 2026.11.10 (OT)");
  expect(sessionTitle(mine[1], 2)).toBe("2회차 · 2026.11.12");
  expect(shortDate("2026-11-10")).toBe("11.10");
  expect(sessionsOf(SESSIONS, 1)).toEqual([]);
  // 원본 배열은 그대로
  expect(SESSIONS[0].id).toBe(2);
});

test("LOGIC-16 applicantSessionStat·hasAttended는 회차가 있으면 출석 기록, 없으면 attended를 쓴다", () => {
  const kim = makeApplicant({ id: 5, programId: 3, attended: false });
  const attendance = [
    { sessionId: 1, applicantId: 5 },
    { sessionId: 3, applicantId: 5 },
    { sessionId: 1, applicantId: 6 }, // 다른 사람
  ];
  expect(applicantSessionStat(kim, SESSIONS, attendance)).toEqual({ attended: 2, total: 3 });
  expect(hasAttended(kim, SESSIONS, attendance)).toBe(true);
  expect(hasAttended(kim, SESSIONS, [])).toBe(false);
  expect(isPresent(attendance, 1, 5)).toBe(true);
  expect(isPresent(attendance, 2, 5)).toBe(false);
  expect(sessionStatLabel({ attended: 2, total: 3 })).toBe("출석 2/3회");

  // 회차 없는 프로그램(1번)은 예전처럼 attended 값
  const lee = makeApplicant({ id: 7, programId: 1, attended: true });
  expect(applicantSessionStat(lee, SESSIONS, attendance)).toBeNull();
  expect(hasAttended(lee, SESSIONS, attendance)).toBe(true);
  expect(hasAttended({ ...lee, attended: false }, SESSIONS, attendance)).toBe(false);
});

test("LOGIC-20 출석률이 수료 기준 이상이면 수료 (v2.1)", () => {
  expect(isCompleted({ attended: 4, total: 5 }, 80)).toBe(true); // 80%
  expect(isCompleted({ attended: 2, total: 3 }, 80)).toBe(false); // 67%
  expect(isCompleted({ attended: 2, total: 3 }, 60)).toBe(true);
  expect(isCompleted({ attended: 0, total: 0 }, 1)).toBe(false);
  expect(attendanceRate({ attended: 2, total: 3 })).toBe(67);
  expect(attendanceRate({ attended: 0, total: 0 })).toBe(0);
});
