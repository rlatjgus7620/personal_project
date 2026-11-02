import { makeApplicant } from "../test-utils/makeApplicant";
import { TEST_PROGRAMS, makeProgram } from "../test-utils/makeProgram";
import { makeSession } from "../test-utils/makeSession";
import { csvFileName, summarizeByProgram, toCsv } from "./report";

test("LOGIC-09 toCsv는 BOM, 머리글, 사람마다 한 줄을 만든다", () => {
  const csv = toCsv(
    [
      makeApplicant({ id: 1, name: "김테스트", programId: 3, attended: true }),
      makeApplicant({ id: 2, name: "이테스트", phone: "010-2222-3333" }),
    ],
    TEST_PROGRAMS,
  );
  expect(csv.startsWith("﻿")).toBe(true);
  const lines = csv.slice(1).trimEnd().split("\r\n");
  expect(lines).toEqual([
    "번호,이름,연락처,프로그램,참석,신청일",
    "1,김테스트,010-1234-5678,모의면접,참석,2026.10.29",
    "2,이테스트,010-2222-3333,이력서 클리닉,미참석,2026.10.29",
  ]);
});

test("LOGIC-10 toCsv는 쉼표·따옴표를 감싸고 수식처럼 보이는 값을 막는다", () => {
  const csv = toCsv([makeApplicant({ name: '김,"별명"' }), makeApplicant({ name: "=1+1" })], TEST_PROGRAMS);
  const lines = csv.slice(1).trimEnd().split("\r\n");
  expect(lines[1].split(",")[0]).toBe("1");
  expect(lines[1]).toContain('"김,""별명"""');
  expect(lines[2]).toContain(",'=1+1,");
});

test("LOGIC-10 파일 이름은 한국 날짜로 만든다", () => {
  expect(csvFileName(new Date("2026-10-30T03:00:00Z"))).toBe("신청자명단_20261030.csv");
});

test("LOGIC-11 summarizeByProgram은 받은 순서대로 요약하고 정원·마감을 함께 준다", () => {
  const programs = [
    makeProgram({ id: 7, name: "모의면접", capacity: 3 }),
    makeProgram({ id: 5, name: "취업 특강", capacity: null }),
  ];
  const result = summarizeByProgram(programs, [
    makeApplicant({ id: 1, programId: 7, attended: true }),
    makeApplicant({ id: 2, programId: 7, attended: true }),
    makeApplicant({ id: 3, programId: 7, attended: false }),
  ]);
  expect(result.map((r) => r.programId)).toEqual([7, 5]);
  expect(result[0]).toEqual({
    programId: 7,
    label: "모의면접",
    total: 3,
    attended: 2,
    capacity: 3,
    full: true,
    sessionCount: 0,
    rate: 67,
  });
  expect(result[1].total).toBe(0);
  expect(result[1].full).toBe(false);
  expect(result[1].rate).toBeNull();
});

test("LOGIC-17 회차가 있는 프로그램은 출석률 = 출석 기록 ÷ (신청자 × 회차 수)", () => {
  const programs = [makeProgram({ id: 3, name: "모의면접" })];
  const applicants = [
    makeApplicant({ id: 1, programId: 3 }),
    makeApplicant({ id: 2, programId: 3, phone: "010-2222-3333" }),
  ];
  const sessions = [makeSession({ id: 10, programId: 3 }), makeSession({ id: 11, programId: 3, sessionDate: "2026-11-12" })];
  const attendance = [
    { sessionId: 10, applicantId: 1 },
    { sessionId: 11, applicantId: 1 },
    { sessionId: 10, applicantId: 2 },
  ];
  const [stat] = summarizeByProgram(programs, applicants, sessions, attendance);
  expect(stat.sessionCount).toBe(2);
  expect(stat.rate).toBe(75);
  expect(stat.attended).toBe(2); // 1회 이상 출석한 사람 수
  expect(summarizeByProgram(programs, [], sessions, [])[0].rate).toBeNull();
});

test("LOGIC-18 toCsv는 회차가 있는 프로그램의 참석 칸을 '출석 M/N회'로 쓴다", () => {
  const sessions = [
    makeSession({ id: 10, programId: 3 }),
    makeSession({ id: 11, programId: 3, sessionDate: "2026-11-12" }),
    makeSession({ id: 12, programId: 3, sessionDate: "2026-11-14" }),
  ];
  const csv = toCsv(
    [
      makeApplicant({ id: 1, programId: 3 }),
      makeApplicant({ id: 2, programId: 2, attended: true, phone: "010-2222-3333" }),
    ],
    TEST_PROGRAMS,
    sessions,
    [
      { sessionId: 10, applicantId: 1 },
      { sessionId: 12, applicantId: 1 },
    ],
  );
  const lines = csv.slice(1).trimEnd().split("\r\n");
  expect(lines[1]).toBe("1,김테스트,010-1234-5678,모의면접,출석 2/3회,2026.10.29");
  expect(lines[2]).toBe("2,김테스트,010-2222-3333,이력서 클리닉,참석,2026.10.29");
});
