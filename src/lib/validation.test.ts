import { MESSAGES, validateApplicant } from "./validation";

const VALID = { name: "김테스트", phone: "010-1234-5678", program: "mock_interview" };

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
    expect(validateApplicant({ ...VALID, program: "" })).toBe(MESSAGES.programRequired);
  });

  test("정상 입력은 null", () => {
    expect(validateApplicant(VALID)).toBeNull();
  });
});
