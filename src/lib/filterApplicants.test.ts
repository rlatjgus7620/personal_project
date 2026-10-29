import { makeApplicant } from "../test-utils/makeApplicant";
import { INITIAL_FILTER } from "../types/applicant";
import { filterApplicants } from "./filterApplicants";

const list = [
  makeApplicant({ id: 1, name: "김테스트", program: "mock_interview", attended: true }),
  makeApplicant({ id: 2, name: "이테스트", program: "mock_interview", attended: false }),
  makeApplicant({ id: 3, name: "박샘플", program: "resume_clinic", attended: false }),
];
const ids = (result: { id: number }[]) => result.map((a) => a.id);

test("LOGIC-01 참석 여부로 거른다", () => {
  expect(ids(filterApplicants(list, INITIAL_FILTER))).toEqual([1, 2, 3]);
  expect(ids(filterApplicants(list, { ...INITIAL_FILTER, attendance: "attended" }))).toEqual([1]);
  expect(ids(filterApplicants(list, { ...INITIAL_FILTER, attendance: "absent" }))).toEqual([2, 3]);
});

test("LOGIC-02 프로그램으로 거른다", () => {
  expect(ids(filterApplicants(list, { ...INITIAL_FILTER, program: "mock_interview" }))).toEqual([1, 2]);
});

test("LOGIC-03 이름 검색(앞뒤 공백 무시)과 여러 조건을 함께 쓴다", () => {
  expect(ids(filterApplicants(list, { ...INITIAL_FILTER, keyword: " 테스 " }))).toEqual([1, 2]);
  expect(
    ids(
      filterApplicants(list, {
        attendance: "absent",
        program: "mock_interview",
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
