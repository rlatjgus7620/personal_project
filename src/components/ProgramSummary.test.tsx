import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExportButton from "./ExportButton";
import ProgramSummary from "./ProgramSummary";
import { makeApplicant } from "../test-utils/makeApplicant";

test("UI-28 프로그램별 신청·참석 인원과 참석률을 보여준다", () => {
  render(
    <ProgramSummary
      applicants={[
        makeApplicant({ id: 1, program: "mock_interview", attended: true }),
        makeApplicant({ id: 2, program: "mock_interview", attended: false }),
      ]}
    />,
  );
  const mock = screen.getByRole("article", { name: "모의면접" });
  expect(within(mock).getByText("신청 2명 · 참석 1명")).toBeInTheDocument();
  expect(within(mock).getByText("참석률 50%")).toBeInTheDocument();
  const lecture = screen.getByRole("article", { name: "취업 특강" });
  expect(within(lecture).getByText("참석률 -")).toBeInTheDocument();
});

test("UI-29 내보낼 사람이 0명이면 CSV 버튼이 비활성화된다", () => {
  render(<ExportButton applicants={[]} />);
  expect(screen.getByRole("button", { name: "명단 CSV 내보내기" })).toBeDisabled();
});

test("UI-30 CSV 버튼을 누르면 파일 내려받기가 실행된다", async () => {
  // 테스트 환경(jsdom)에는 파일 주소 만들기 기능이 없어서 가짜로 넣음
  URL.createObjectURL = jest.fn(() => "blob:test");
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    expect(this.download).toMatch(/^신청자명단_\d{8}\.csv$/);
  });
  const user = userEvent.setup();
  render(<ExportButton applicants={[makeApplicant({ id: 1 }), makeApplicant({ id: 2 })]} />);
  await user.click(screen.getByRole("button", { name: "명단 CSV 내보내기" }));
  expect(click).toHaveBeenCalledTimes(1);
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  click.mockRestore();
});
