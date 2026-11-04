import { makeApplicant } from "../test-utils/makeApplicant";
import { INITIAL_FILTER } from "../types/applicant";
import { filterApplicants, matchesKeyword } from "./filterApplicants";

const list = [
  makeApplicant({ id: 1, name: "김테스트", programId: 3, attended: true }),
  makeApplicant({ id: 2, name: "이테스트", programId: 3, attended: false }),
  makeApplicant({ id: 3, name: "박샘플", programId: 2, attended: false }),
];
const ids = (result: { id: number }[]) => result.map((a) => a.id);

test("LOGIC-01 참석 여부로 거른다", () => {
  expect(ids(filterApplicants(list, INITIAL_FILTER))).toEqual([1, 2, 3]);
  expect(ids(filterApplicants(list, { ...INITIAL_FILTER, attendance: "attended" }))).toEqual([1]);
  expect(ids(filterApplicants(list, { ...INITIAL_FILTER, attendance: "absent" }))).toEqual([2, 3]);
});

test("LOGIC-02 프로그램 번호로 거른다", () => {
  expect(ids(filterApplicants(list, { ...INITIAL_FILTER, program: 3 }))).toEqual([1, 2]);
});

test("LOGIC-03 이름 검색(앞뒤 공백 무시)과 여러 조건을 함께 쓴다", () => {
  expect(ids(filterApplicants(list, { ...INITIAL_FILTER, keyword: " 테스 " }))).toEqual([1, 2]);
  expect(
    ids(
      filterApplicants(list, {
        attendance: "absent",
        program: 3,
        keyword: "테스",
      }),
    ),
  ).toEqual([2]);
});

test("LOGIC-04 원본 배열은 바뀌지 않는다", () => {
  const copy = [...list];
  filterApplicants(list, { ...INITIAL_FILTER, attendance: "attended" });
  expect(list).toEqual(copy);
});

test("LOGIC-23 연락처 뒷자리로도 찾는다 (v2.4)", () => {
  const kim = makeApplicant({ name: "김테스트", phone: "010-1234-5678" });
  expect(matchesKeyword(kim, "")).toBe(true);
  expect(matchesKeyword(kim, "테스")).toBe(true);
  expect(matchesKeyword(kim, "5678")).toBe(true);
  expect(matchesKeyword(kim, "56")).toBe(true); // 뒷자리를 앞에서부터 치는 중
  expect(matchesKeyword(kim, "1234-5678")).toBe(true);
  expect(matchesKeyword(kim, "1234")).toBe(false); // 가운데 자리는 뒷자리가 아님
  expect(matchesKeyword(kim, "78")).toBe(false);
  expect(matchesKeyword(kim, "이")).toBe(false);
  const phoneSearch = filterApplicants(
    [kim, makeApplicant({ id: 2, name: "이테스트", phone: "010-9999-0000" })],
    { ...INITIAL_FILTER, keyword: "0000" },
  );
  expect(phoneSearch.map((a) => a.name)).toEqual(["이테스트"]);
});
