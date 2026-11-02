import { MESSAGES, toProgramId, validateApplicant, validateProgram } from "./validation";

const VALID = { name: "김테스트", phone: "010-1234-5678", programId: "3" };

describe("LOGIC-07 validateApplicant", () => {
  test("빈 이름, 공백만 있는 이름", () => {
    expect(validateApplicant({ ...VALID, name: "" })).toBe(MESSAGES.nameRequired);
    expect(validateApplicant({ ...VALID, name: "   " })).toBe(MESSAGES.nameRequired);
  });

  test("21자 이름", () => {
    expect(validateApplicant({ ...VALID, name: "가".repeat(21) })).toBe(MESSAGES.nameTooLong);
  });

  test("틀린 연락처", () => {
    expect(validateApplicant({ ...VALID, phone: "01012345678" })).toBe(MESSAGES.phoneFormat);
    expect(validateApplicant({ ...VALID, phone: "010-123-4567" })).toBe(MESSAGES.phoneFormat);
  });

  test("프로그램 안 고름", () => {
    expect(validateApplicant({ ...VALID, programId: "" })).toBe(MESSAGES.programRequired);
  });

  test("정상 입력은 null", () => {
    expect(validateApplicant(VALID)).toBeNull();
  });
});

test("LOGIC-07 선택칸 값을 프로그램 번호로 바꾼다", () => {
  expect(toProgramId("3")).toBe(3);
  expect(toProgramId("")).toBeNull();
  expect(toProgramId("0")).toBeNull();
});

const PROGRAM = { name: "모의면접", startDate: null, endDate: null, location: null, capacity: null };

describe("LOGIC-12 validateProgram", () => {
  test("이름", () => {
    expect(validateProgram({ ...PROGRAM, name: "  " })).toBe(MESSAGES.programNameRequired);
    expect(validateProgram({ ...PROGRAM, name: "가".repeat(31) })).toBe(MESSAGES.programNameTooLong);
  });

  test("장소 51자", () => {
    expect(validateProgram({ ...PROGRAM, location: "가".repeat(51) })).toBe(MESSAGES.locationTooLong);
  });

  test("정원 0, 1000, 1.5", () => {
    expect(validateProgram({ ...PROGRAM, capacity: 0 })).toBe(MESSAGES.capacityRange);
    expect(validateProgram({ ...PROGRAM, capacity: 1000 })).toBe(MESSAGES.capacityRange);
    expect(validateProgram({ ...PROGRAM, capacity: 1.5 })).toBe(MESSAGES.capacityRange);
  });

  test("종료일이 시작일보다 빠름", () => {
    expect(validateProgram({ ...PROGRAM, startDate: "2026-11-12", endDate: "2026-11-10" })).toBe(
      MESSAGES.periodOrder,
    );
  });

  test("정상 입력은 null", () => {
    expect(validateProgram(PROGRAM)).toBeNull();
    expect(
      validateProgram({ name: "특강", startDate: "2026-11-10", endDate: "2026-11-12", location: "3층", capacity: 10 }),
    ).toBeNull();
  });
});
