import { makeApplicant } from "../test-utils/makeApplicant";
import { makeProgram } from "../test-utils/makeProgram";
import { copyName, copyOf, isFull, programName, programOptionLabel, withApplicantCounts } from "./programs";

test("LOGIC-14 지금 명단으로 신청자 수를 다시 세고 마감 여부와 선택지 문구를 만든다", () => {
  const programs = withApplicantCounts(
    [
      makeProgram({ id: 1, name: "모의면접", capacity: 2, applicantCount: 0 }),
      makeProgram({ id: 2, name: "취업 특강", capacity: 10 }),
      makeProgram({ id: 3, name: "이력서 클리닉", capacity: null }),
    ],
    [
      makeApplicant({ id: 1, programId: 1 }),
      makeApplicant({ id: 2, programId: 1 }),
      makeApplicant({ id: 3, programId: 2 }),
    ],
  );
  expect(programs.map((p) => p.applicantCount)).toEqual([2, 1, 0]);
  expect(programs.map(isFull)).toEqual([true, false, false]);
  expect(programs.map(programOptionLabel)).toEqual([
    "모의면접 (마감)",
    "취업 특강 (1/10명)",
    "이력서 클리닉",
  ]);
});

test("LOGIC-14 번호로 이름을 찾고, 없으면 알 수 없는 프로그램", () => {
  const programs = [makeProgram({ id: 3, name: "모의면접" })];
  expect(programName(programs, 3)).toBe("모의면접");
  expect(programName(programs, 9)).toBe("알 수 없는 프로그램");
});

test("LOGIC-29 프로그램 복사는 이름에 (복사)를 붙이고 30자를 넘지 않는다 (v2.5)", () => {
  expect(copyName("모의면접")).toBe("모의면접 (복사)");
  const long = "가".repeat(30);
  expect(copyName(long)).toBe("가".repeat(25) + " (복사)");
  expect(copyName(long).length).toBe(30);
  const program = makeProgram({ id: 3, name: "모의면접", location: "3층", capacity: 10, completionRate: 60, applicantCount: 4 });
  expect(copyOf(program)).toEqual({
    name: "모의면접 (복사)",
    startDate: null,
    endDate: null,
    location: "3층",
    capacity: 10,
    completionRate: 60,
  });
});
