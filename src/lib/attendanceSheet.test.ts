import { makeApplicant } from "../test-utils/makeApplicant";
import { makeProgram } from "../test-utils/makeProgram";
import { makeSession } from "../test-utils/makeSession";
import { buildAttendanceSheet, escapeHtml, sheetFileName, sheetToCsv, sheetToHtml } from "./attendanceSheet";

const PROGRAM = makeProgram({ id: 3, name: "모의면접", completionRate: 60 });
const SESSIONS = [
  makeSession({ id: 11, programId: 3, sessionDate: "2026-11-12" }),
  makeSession({ id: 10, programId: 3, sessionDate: "2026-11-10" }),
  makeSession({ id: 20, programId: 4, sessionDate: "2026-11-10" }), // 다른 프로그램
];
const APPLICANTS = [
  makeApplicant({ id: 1, name: "이테스트", programId: 3, phone: "010-1111-2222" }),
  makeApplicant({ id: 2, name: "김테스트", programId: 3, phone: "010-3333-4444" }),
  makeApplicant({ id: 3, name: "박테스트", programId: 4 }),
];
const ATTENDANCE = [
  { sessionId: 10, applicantId: 1 },
  { sessionId: 11, applicantId: 1 },
  { sessionId: 10, applicantId: 2 },
];

test("LOGIC-21 출석표는 이름순 사람 × 날짜순 회차, 출석·출석률·수료를 계산한다", () => {
  const sheet = buildAttendanceSheet(PROGRAM, SESSIONS, APPLICANTS, ATTENDANCE);
  expect(sheet.title).toBe("모의면접 출석표");
  expect(sheet.header).toEqual(["이름", "연락처", "1회차 11.10", "2회차 11.12", "출석", "출석률", "수료(기준 60%)"]);
  expect(sheet.rows).toEqual([
    ["김테스트", "010-3333-4444", "O", "", "1/2", "50%", "미수료"],
    ["이테스트", "010-1111-2222", "O", "O", "2/2", "100%", "수료"],
  ]);
  // 인쇄용은 연락처를 가림
  const printed = buildAttendanceSheet(PROGRAM, SESSIONS, APPLICANTS, ATTENDANCE, { maskPhones: true });
  expect(printed.rows[0][1]).toBe("010-****-4444");
});

test("LOGIC-22 출석표 CSV·파일 이름·인쇄용 HTML", () => {
  const sheet = buildAttendanceSheet(PROGRAM, SESSIONS, APPLICANTS, ATTENDANCE);
  const csv = sheetToCsv(sheet);
  expect(csv.startsWith("﻿")).toBe(true);
  expect(csv.slice(1).split("\r\n")[1]).toBe("김테스트,010-3333-4444,O,,1/2,50%,미수료");
  expect(sheetFileName("모의면접 1/2반", new Date("2026-11-03T03:00:00Z"))).toBe("출석표_모의면접 1_2반_20261103.csv");

  expect(escapeHtml(`<b>"김"&'이'</b>`)).toBe("&lt;b&gt;&quot;김&quot;&amp;&#39;이&#39;&lt;/b&gt;");
  const evil = buildAttendanceSheet(
    PROGRAM,
    SESSIONS,
    [makeApplicant({ id: 9, name: "<img src=x>", programId: 3 })],
    [],
  );
  const html = sheetToHtml(evil, "2026.11.03");
  expect(html).toContain("&lt;img src=x&gt;");
  expect(html).not.toContain("<img");
  expect(html).toContain("<title>모의면접 출석표</title>");
});
