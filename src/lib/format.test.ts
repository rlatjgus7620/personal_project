import { formatDate, formatPeriod, formatPhoneInput, maskPhone, todayInSeoul } from "./format";

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

test("LOGIC-13 프로그램 기간을 보기 좋게 바꾼다", () => {
  expect(formatPeriod(null, null)).toBe("기간 미정");
  expect(formatPeriod("2026-11-10", null)).toBe("2026.11.10");
  expect(formatPeriod("2026-11-10", "2026-11-10")).toBe("2026.11.10");
  expect(formatPeriod("2026-11-10", "2026-11-12")).toBe("2026.11.10 ~ 2026.11.12");
});

test("LOGIC-24 todayInSeoul은 한국 시간 기준 날짜 (v2.4)", () => {
  expect(todayInSeoul(new Date("2026-11-03T15:30:00Z"))).toBe("2026-11-04"); // 한국은 다음 날 00:30
  expect(todayInSeoul(new Date("2026-11-03T14:59:00Z"))).toBe("2026-11-03");
});
