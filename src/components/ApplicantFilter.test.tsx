import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApplicantFilter from "./ApplicantFilter";
import { INITIAL_FILTER, type ApplicantFilterValue } from "../types/applicant";

function setup(value: ApplicantFilterValue = INITIAL_FILTER) {
  const onChange = jest.fn();
  const user = userEvent.setup();
  render(<ApplicantFilter value={value} onChange={onChange} />);
  return { onChange, user };
}

test("UI-14 참석 여부 버튼 3개, 프로그램 필터, 이름 검색을 보여준다", () => {
  setup();
  for (const name of ["전체", "참석", "미참석"]) {
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  }
  expect(screen.getByLabelText("프로그램 필터")).toBeInTheDocument();
  expect(screen.getByLabelText("이름 검색")).toBeInTheDocument();
});

test("UI-15 선택된 버튼만 aria-pressed=true", () => {
  setup({ ...INITIAL_FILTER, attendance: "attended" });
  expect(screen.getByRole("button", { name: "참석" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "미참석" })).toHaveAttribute("aria-pressed", "false");
});

test("UI-16 미참석을 누르면 attendance만 바뀐 값으로 onChange", async () => {
  const { onChange, user } = setup();
  await user.click(screen.getByRole("button", { name: "미참석" }));
  expect(onChange).toHaveBeenCalledWith({ ...INITIAL_FILTER, attendance: "absent" });
});

test("UI-17 프로그램 필터에서 모의면접을 고르면 onChange", async () => {
  const { onChange, user } = setup();
  await user.selectOptions(screen.getByLabelText("프로그램 필터"), "모의면접");
  expect(onChange).toHaveBeenCalledWith({ ...INITIAL_FILTER, program: "mock_interview" });
});

test("UI-18 검색창에 입력하면 keyword가 담긴 onChange", async () => {
  const { onChange, user } = setup();
  await user.type(screen.getByLabelText("이름 검색"), "김");
  expect(onChange).toHaveBeenCalledWith({ ...INITIAL_FILTER, keyword: "김" });
});
