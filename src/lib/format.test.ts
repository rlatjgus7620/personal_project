import { formatDate, maskPhone } from "./format";

test("LOGIC-05 연락처 가운데 네 자리를 가린다", () => {
  expect(maskPhone("010-1234-5678")).toBe("010-****-5678");
});

test("LOGIC-06 날짜를 2026.10.29 형식으로 바꾼다", () => {
  expect(formatDate("2026-10-29T05:00:00Z")).toBe("2026.10.29");
});
