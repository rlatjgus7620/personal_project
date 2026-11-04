import { render, screen, within } from "@testing-library/react";
import ProgramStats from "./ProgramStats";
import { makeApplicant } from "../test-utils/makeApplicant";
import { makeProgram } from "../test-utils/makeProgram";
import { makeSession } from "../test-utils/makeSession";

test("UI-57 프로그램별 요약 표와 회차별 출석률을 숫자와 함께 보여준다 (v2.6)", () => {
  render(
    <ProgramStats
      programs={[makeProgram({ id: 3, name: "모의면접" }), makeProgram({ id: 4, name: "취업 특강" })]}
      applicants={[makeApplicant({ id: 1, programId: 3 }), makeApplicant({ id: 2, programId: 3 })]}
      sessions={[makeSession({ id: 10, programId: 3, sessionDate: "2026-11-10" })]}
      attendance={[{ sessionId: 10, applicantId: 1 }]}
    />,
  );
  const table = screen.getByRole("table", { name: "프로그램별 요약" });
  const mock = within(table).getByRole("row", { name: /모의면접/ });
  // 1명은 1/1회(100%) 출석해 수료 기준 80% 이상
  expect(mock).toHaveTextContent("2명1개50%1/2명");
  expect(within(table).getByRole("row", { name: /취업 특강/ })).toHaveTextContent("0명--");
  const bars = screen.getByRole("region", { name: "모의면접 회차별 출석률" });
  expect(within(bars).getByText("1/2명 · 50%")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "취업 특강 회차별 출석률" })).not.toBeInTheDocument();
});
