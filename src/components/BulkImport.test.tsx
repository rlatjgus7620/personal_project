import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulkImport from "./BulkImport";
import { makeApplicant } from "../test-utils/makeApplicant";
import { makeProgram } from "../test-utils/makeProgram";
import type { BulkResult } from "../types/applicant";
import { FILE_MESSAGES, RosterFileError } from "../lib/rosterFile";

const PROGRAMS = [makeProgram({ id: 3, name: "모의면접" })];

function setup(
  result: BulkResult = { created: [makeApplicant({ id: 9, name: "김예시" })], failed: [] },
  readFile = jest.fn(),
) {
  const onBulkAdd = jest.fn().mockResolvedValue(result);
  const user = userEvent.setup();
  render(
    <BulkImport
      programs={PROGRAMS}
      applicants={[makeApplicant({ phone: "010-0000-0009", programId: 3 })]}
      onBulkAdd={onBulkAdd}
      readFile={readFile}
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

test("UI-58 엑셀 파일을 고르면 명단을 칸에 채우고 같은 방법으로 미리 검사한다 (v2.8)", async () => {
  const readFile = jest.fn().mockResolvedValue({ text: "김예시\t010-0000-0001\n이샘플\t01000000009", count: 2 });
  const { onBulkAdd, user } = setup(undefined, readFile);
  await user.selectOptions(screen.getByLabelText("일괄 등록 프로그램"), "3");
  const file = new File(["가짜 내용"], "신청명단.xlsx");
  await user.upload(screen.getByLabelText("명단 파일 선택"), file);

  expect(readFile).toHaveBeenCalledWith(file);
  expect(await screen.findByText("신청명단.xlsx에서 2줄을 불러왔습니다. 아래에서 확인한 뒤 등록하세요.")).toBeInTheDocument();
  expect(screen.getByLabelText("붙여 넣을 명단")).toHaveValue("김예시\t010-0000-0001\n이샘플\t01000000009");
  // 하이픈 없는 연락처도 하이픈을 넣어 검사 → 이미 신청한 연락처로 걸림
  expect(screen.getByText("등록할 수 있는 사람 1명 · 문제 있는 줄 1개")).toBeInTheDocument();
  expect(screen.getByText(/2번째 줄 \(이샘플\): 이미 같은 프로그램에 신청한 연락처입니다/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "1명 등록" }));
  expect(onBulkAdd).toHaveBeenCalledWith(3, [{ name: "김예시", phone: "010-0000-0001" }]);
});

test("UI-59 읽을 수 없는 파일이면 이유를 보여 주고 입력칸은 그대로 둔다 (v2.8)", async () => {
  const readFile = jest
    .fn()
    .mockRejectedValueOnce(new RosterFileError(FILE_MESSAGES.oldExcel))
    .mockRejectedValueOnce(new Error("알 수 없는 오류"));
  const { user } = setup(undefined, readFile);
  await user.click(screen.getByLabelText("붙여 넣을 명단"));
  await user.paste("김예시\t010-0000-0001");

  await user.upload(screen.getByLabelText("명단 파일 선택"), new File(["x"], "옛날명단.xlsx"));
  expect(await screen.findByText(FILE_MESSAGES.oldExcel)).toBeInTheDocument();
  expect(screen.getByLabelText("붙여 넣을 명단")).toHaveValue("김예시\t010-0000-0001");
  // 예상 못 한 오류는 일반 문구로
  await user.upload(screen.getByLabelText("명단 파일 선택"), new File(["x"], "깨진명단.xlsx"));
  expect(await screen.findByText(FILE_MESSAGES.broken)).toBeInTheDocument();
  // 칸을 고치면 안내는 사라짐
  await user.type(screen.getByLabelText("붙여 넣을 명단"), "1");
  expect(screen.queryByText(FILE_MESSAGES.broken)).not.toBeInTheDocument();
});
