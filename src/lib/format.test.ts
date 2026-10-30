import { formatDate, formatPhoneInput, maskPhone } from "./format";

test("LOGIC-05 연락처 가운데 네 자리를 가린다", () => {
  expect(maskPhone("010-1234-5678")).toBe("010-****-5678");
});

test("LOGIC-08 입력 중인 연락처에 하이픈을 자동으로 넣는다", () => {
  expect(formatPhoneInput("010")).toBe("010");
  expect(formatPhoneInput("0101234")).toBe("010-1234");
  expect(formatPhoneInput("01012345678")).toBe("010-1234-5678");
  expect(formatPhoneInput("010-1234-5678")).toBe("010-1234-5678");
  expect(formatPhoneInput("010 1234 5678abc9")).toBe("010-1234-5678");
});

test("LOGIC-06 날짜를 2026.10.29 형식으로 바꾼다", () => {
  expect(formatDate("2026-10-29T05:00:00Z")).toBe("2026.10.29");
});
