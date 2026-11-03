import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttendanceBook from "./AttendanceBook";
import { makeApplicant } from "../test-utils/makeApplicant";
import { makeProgram } from "../test-utils/makeProgram";
import { makeSession } from "../test-utils/makeSession";
import { MESSAGES } from "../lib/validation";
import type { AttendanceRecord, Session } from "../types/applicant";

const PROGRAMS = [makeProgram({ id: 3, name: "모의면접" }), makeProgram({ id: 4, name: "취업 특강" })];
const APPLICANTS = [
  makeApplicant({ id: 1, name: "이테스트", programId: 3, phone: "010-1111-2222" }),
  makeApplicant({ id: 2, name: "김테스트", programId: 3, phone: "010-3333-4444" }),
  makeApplicant({ id: 3, name: "박테스트", programId: 4, phone: "010-5555-6666" }),
];
const SESSIONS = [
  makeSession({ id: 11, programId: 3, sessionDate: "2026-11-12" }),
  makeSession({ id: 10, programId: 3, sessionDate: "2026-11-10", note: "OT" }),
];

function setup(sessions: Session[] = SESSIONS, attendance: AttendanceRecord[] = []) {
  const handlers = {
    onAddSession: jest.fn().mockResolvedValue(true),
    onUpdateSession: jest.fn().mockResolvedValue(true),
    onDeleteSession: jest.fn(),
    onToggle: jest.fn(),
  };
  const user = userEvent.setup();
  render(
    <AttendanceBook
      programs={PROGRAMS}
      applicants={APPLICANTS}
      sessions={sessions}
      attendance={attendance}
      {...handlers}
    />,
  );
  return { ...handlers, user };
}

test("UI-40 회차가 없으면 안내 문구, 날짜·메모로 회차 추가, 날짜가 없으면 문구", async () => {
  const { onAddSession, user } = setup([]);
  expect(
    screen.getByText("회차를 추가하면 이 프로그램은 출석부에서 회차별로 출석을 체크합니다."),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "회차 추가" }));
  expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.sessionDateRequired);
  expect(onAddSession).not.toHaveBeenCalled();

  await user.type(screen.getByLabelText("회차 날짜"), "2026-11-10");
  await user.type(screen.getByLabelText("회차 메모"), " OT ");
  await user.click(screen.getByRole("button", { name: "회차 추가" }));
  expect(onAddSession).toHaveBeenCalledWith(3, { sessionDate: "2026-11-10", note: "OT" });
  expect(screen.getByLabelText("회차 날짜")).toHaveValue("");
});

test("UI-41 첫 회차를 고르고, 출석한 사람만 체크, 누르면 onToggle(회차, 신청자, 반대 상태)", async () => {
  const { onToggle, user } = setup(SESSIONS, [{ sessionId: 10, applicantId: 1 }]);
  expect(screen.getByRole("button", { name: "1회차 11.10" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "2회차 11.12" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("heading", { name: "1회차 · 2026.11.10 (OT) · 출석 1/2명" })).toBeInTheDocument();

  const lee = screen.getByRole("checkbox", { name: "이테스트 출석" });
  const kim = screen.getByRole("checkbox", { name: "김테스트 출석" });
  expect(lee).toBeChecked();
  expect(kim).not.toBeChecked();
  // 이름순: 김테스트가 먼저
  const rows = screen.getAllByRole("listitem");
  expect(within(rows[0]).getByText("김테스트")).toBeInTheDocument();
  expect(within(rows[1]).getByText("누적 1/2회")).toBeInTheDocument();

  await user.click(kim);
  expect(onToggle).toHaveBeenCalledWith(10, 2, true);
  await user.click(lee);
  expect(onToggle).toHaveBeenCalledWith(10, 1, false);
});

test("UI-42 2회차를 고르고 삭제 → 확인하면 onDeleteSession(2회차 id)", async () => {
  const { onDeleteSession, user } = setup();
  await user.click(screen.getByRole("button", { name: "2회차 11.12" }));
  await user.click(screen.getByRole("button", { name: "2회차 삭제" }));
  expect(
    screen.getByText("2회차(2026.11.12)를 삭제할까요? 출석 기록도 함께 지워집니다."),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "삭제 확인" }));
  expect(onDeleteSession).toHaveBeenCalledWith(11);
});

test("UI-43 다른 프로그램을 고르면 그 프로그램의 회차·신청자로 바뀐다", async () => {
  const { user } = setup([...SESSIONS, makeSession({ id: 20, programId: 4, sessionDate: "2026-11-20" })]);
  await user.selectOptions(screen.getByLabelText("출석부 프로그램"), "4");
  expect(screen.getByRole("button", { name: "1회차 11.20" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("button", { name: "2회차 11.12" })).not.toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "박테스트 출석" })).toBeInTheDocument();
  expect(screen.queryByRole("checkbox", { name: "김테스트 출석" })).not.toBeInTheDocument();
});

test("UI-48 회차 수정: 날짜·메모를 바꿔 저장하면 onUpdateSession, 날짜를 비우면 문구 (v2.1)", async () => {
  const { onUpdateSession, user } = setup();
  await user.click(screen.getByRole("button", { name: "1회차 수정" }));
  const date = screen.getByLabelText("회차 날짜 수정");
  const note = screen.getByLabelText("회차 메모 수정");
  expect(date).toHaveValue("2026-11-10");
  expect(note).toHaveValue("OT");

  await user.clear(date);
  await user.click(screen.getByRole("button", { name: "저장" }));
  expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.sessionDateRequired);
  expect(onUpdateSession).not.toHaveBeenCalled();

  await user.type(date, "2026-11-11");
  await user.clear(note);
  await user.click(screen.getByRole("button", { name: "저장" }));
  expect(onUpdateSession).toHaveBeenCalledWith(10, { sessionDate: "2026-11-11", note: null });
  expect(screen.queryByLabelText("회차 날짜 수정")).not.toBeInTheDocument();
});

test("UI-49 회차가 없는데 참석 체크된 사람이 있으면 회차 추가 전에 안내한다 (v2.0.1)", () => {
  render(
    <AttendanceBook
      programs={PROGRAMS}
      applicants={[{ ...APPLICANTS[0], attended: true }, APPLICANTS[1]]}
      sessions={[]}
      attendance={[]}
      onAddSession={jest.fn()}
      onUpdateSession={jest.fn()}
      onDeleteSession={jest.fn()}
      onToggle={jest.fn()}
    />,
  );
  expect(screen.getByText(/참석 체크된 신청자가 1명 있습니다/)).toBeInTheDocument();
});

test("UI-50 수료 표시와 출석표 CSV·인쇄 버튼 (v2.1~v2.2)", async () => {
  // 회차 2개 모두 출석한 이테스트만 수료 (기준 80%)
  const { user } = setup(SESSIONS, [
    { sessionId: 10, applicantId: 1 },
    { sessionId: 11, applicantId: 1 },
    { sessionId: 10, applicantId: 2 },
  ]);
  const rows = screen.getAllByRole("listitem");
  expect(within(rows[1]).getByText("수료")).toBeInTheDocument(); // 이테스트
  expect(within(rows[0]).queryByText("수료")).not.toBeInTheDocument(); // 김테스트

  URL.createObjectURL = jest.fn(() => "blob:test");
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  await user.click(screen.getByRole("button", { name: "출석표 CSV" }));
  expect(click).toHaveBeenCalledTimes(1);
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  click.mockRestore();

  // 팝업이 막혔을 때 (window.open이 null)
  const open = jest.spyOn(window, "open").mockReturnValue(null);
  await user.click(screen.getByRole("button", { name: "출석표 인쇄" }));
  expect(open).toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("팝업이 막혀 인쇄 창을 열 수 없습니다");
  open.mockRestore();
});
