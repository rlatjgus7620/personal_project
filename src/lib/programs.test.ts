import { makeApplicant } from "../test-utils/makeApplicant";
import { makeProgram } from "../test-utils/makeProgram";
import { isFull, programName, programOptionLabel, withApplicantCounts } from "./programs";

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
