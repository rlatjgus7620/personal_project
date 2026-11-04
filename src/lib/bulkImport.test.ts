import { makeApplicant } from "../test-utils/makeApplicant";
import { MESSAGES } from "./validation";
import { parseRoster } from "./bulkImport";

test("LOGIC-26 엑셀 붙여넣기(탭)·쉼표·공백을 이름·연락처로 나누고 하이픈을 넣는다 (v2.5)", () => {
  const text = "이름\t연락처\n김예시\t010-0000-0001\n이샘플,01000000002\n\n박데모 010 0000 0003\n";
  const rows = parseRoster(text, [], 3);
  expect(rows.map((r) => [r.line, r.name, r.phone, r.error])).toEqual([
    [2, "김예시", "010-0000-0001", null],
    [3, "이샘플", "010-0000-0002", null],
    [5, "박데모", "010-0000-0003", null],
  ]);
});

test("LOGIC-27 형식 오류, 이미 신청한 연락처, 붙여넣기 안의 중복을 줄마다 알려준다 (v2.5)", () => {
  const existing = [makeApplicant({ phone: "010-0000-0001", programId: 3 })];
  const text = ["김예시\t010-0000-0001", "\t010-0000-0002", "이샘플\t02-123-4567", "박데모\t010-0000-0004", "최가상\t010-0000-0004"].join("\n");
  const rows = parseRoster(text, existing, 3);
  expect(rows.map((r) => r.error)).toEqual([
    "이미 같은 프로그램에 신청한 연락처입니다.",
    MESSAGES.nameRequired,
    MESSAGES.phoneFormat,
    null,
    "붙여 넣은 명단 안에 같은 연락처가 있습니다.",
  ]);
  // 다른 프로그램의 신청자와는 겹쳐도 괜찮음
  expect(parseRoster("김예시\t010-0000-0001", existing, 4)[0].error).toBeNull();
});
