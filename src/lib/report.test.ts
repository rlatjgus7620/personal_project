import { makeApplicant } from "../test-utils/makeApplicant";
import { csvFileName, summarizeByProgram, toCsv } from "./report";

test("LOGIC-09 toCsv는 BOM, 머리글, 사람마다 한 줄을 만든다", () => {
  const csv = toCsv([
    makeApplicant({ id: 1, name: "김테스트", program: "mock_interview", attended: true }),
    makeApplicant({ id: 2, name: "이테스트", phone: "010-2222-3333" }),
  ]);
  expect(csv.startsWith("﻿")).toBe(true);
  const lines = csv.slice(1).trimEnd().split("\r\n");
  expect(lines).toEqual([
    "번호,이름,연락처,프로그램,참석,신청일",
    "1,김테스트,010-1234-5678,모의면접,참석,2026.10.29",
    "2,이테스트,010-2222-3333,이력서 클리닉,미참석,2026.10.29",
  ]);
});

test("LOGIC-10 toCsv는 쉼표·따옴표를 감싸고 수식처럼 보이는 값을 막는다", () => {
  const csv = toCsv([
    makeApplicant({ name: '김,"별명"' }),
    makeApplicant({ name: "=1+1" }),
  ]);
  const lines = csv.slice(1).trimEnd().split("\r\n");
  expect(lines[1].split(",")[0]).toBe("1");
  expect(lines[1]).toContain('"김,""별명"""');
  expect(lines[2]).toContain(",'=1+1,");
});

test("LOGIC-10 파일 이름은 한국 날짜로 만든다", () => {
  expect(csvFileName(new Date("2026-10-30T03:00:00Z"))).toBe("신청자명단_20261030.csv");
});

test("LOGIC-11 summarizeByProgram은 프로그램 4개를 순서대로 요약한다", () => {
  const result = summarizeByProgram([
    makeApplicant({ id: 1, program: "mock_interview", attended: true }),
    makeApplicant({ id: 2, program: "mock_interview", attended: true }),
    makeApplicant({ id: 3, program: "mock_interview", attended: false }),
    makeApplicant({ id: 4, program: "job_search", attended: false }),
  ]);
  expect(result.map((r) => r.program)).toEqual([
    "job_search",
    "resume_clinic",
    "mock_interview",
    "career_lecture",
  ]);
  const mock = result.find((r) => r.program === "mock_interview");
  expect(mock).toEqual({ program: "mock_interview", label: "모의면접", total: 3, attended: 2, rate: 67 });
  const lecture = result.find((r) => r.program === "career_lecture");
  expect(lecture?.total).toBe(0);
  expect(lecture?.rate).toBeNull();
});
