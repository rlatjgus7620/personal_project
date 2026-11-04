import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulkImport from "./BulkImport";
import { makeApplicant } from "../test-utils/makeApplicant";
import { makeProgram } from "../test-utils/makeProgram";
import type { BulkResult } from "../types/applicant";

const PROGRAMS = [makeProgram({ id: 3, name: "모의면접" })];

function setup(result: BulkResult = { created: [makeApplicant({ id: 9, name: "김예시" })], failed: [] }) {
  const onBulkAdd = jest.fn().mockResolvedValue(result);
  const user = userEvent.setup();
  render(
    <BulkImport
      programs={PROGRAMS}
      applicants={[makeApplicant({ phone: "010-0000-0009", programId: 3 })]}
      onBulkAdd={onBulkAdd}
    />,
  );
  return { onBulkAdd, user };
}

test("UI-54 붙여 넣으면 줄마다 미리 검사하고, 문제없는 줄만 보낸다 (v2.5)", async () => {
  const { onBulkAdd, user } = setup();
  const area = screen.getByLabelText("붙여 넣을 명단");
  await user.click(area);
  await user.paste("김예시\t010-0000-0001\n이샘플\t010-0000-0009\n박데모\t02-123");
  // 프로그램을 고르기 전: 형식 오류만 걸러지고, 보낼 수 없음
  // ("같은 프로그램에 이미 신청"은 프로그램을 골라야 알 수 있음)
  expect(screen.getByText("등록할 수 있는 사람 2명 · 문제 있는 줄 1개")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "2명 등록" })).toBeDisabled();

  await user.selectOptions(screen.getByLabelText("일괄 등록 프로그램"), "3");
  expect(screen.getByText("등록할 수 있는 사람 1명 · 문제 있는 줄 2개")).toBeInTheDocument();
  expect(screen.getByText(/2번째 줄 \(이샘플\): 이미 같은 프로그램에 신청한 연락처입니다/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "1명 등록" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "1명 등록" }));
  expect(onBulkAdd).toHaveBeenCalledWith(3, [{ name: "김예시", phone: "010-0000-0001" }]);
  expect(await screen.findByRole("status")).toHaveTextContent("1명을 등록했습니다.");
});

test("UI-55 서버에서 실패한 줄은 이유와 함께 보여주고 입력칸은 그대로 둔다 (v2.5)", async () => {
  const { user } = setup({
    created: [],
    failed: [{ row: 1, name: "김예시", phone: "010-0000-0001", message: "정원이 가득 찼습니다. (정원 3명)" }],
  });
  await user.selectOptions(screen.getByLabelText("일괄 등록 프로그램"), "3");
  await user.click(screen.getByLabelText("붙여 넣을 명단"));
  await user.paste("김예시\t010-0000-0001");
  await user.click(screen.getByRole("button", { name: "1명 등록" }));
  const status = await screen.findByRole("status");
  expect(status).toHaveTextContent("0명을 등록했습니다.");
  expect(status).toHaveTextContent("김예시 (010-0000-0001): 정원이 가득 찼습니다. (정원 3명)");
  expect(screen.getByLabelText("붙여 넣을 명단")).toHaveValue("김예시\t010-0000-0001");
});
