import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckInMode from "./CheckInMode";
import { makeApplicant } from "../test-utils/makeApplicant";
import { makeProgram } from "../test-utils/makeProgram";
import { makeSession } from "../test-utils/makeSession";
import type { AttendanceRecord } from "../types/applicant";

const PROGRAMS = [makeProgram({ id: 3, name: "모의면접" }), makeProgram({ id: 4, name: "취업 특강" })];
const APPLICANTS = [
  makeApplicant({ id: 1, name: "이예시", programId: 3, phone: "010-0000-1111" }),
  makeApplicant({ id: 2, name: "김예시", programId: 3, phone: "010-0000-2222" }),
  makeApplicant({ id: 3, name: "박데모", programId: 4, phone: "010-0000-3333", attended: true }),
];
const SESSIONS = [
  makeSession({ id: 10, programId: 3, sessionDate: "2026-11-10", note: "OT" }),
  makeSession({ id: 11, programId: 3, sessionDate: "2026-11-12" }),
];

function setup(attendance: AttendanceRecord[] = [], today = "2026-11-12") {
  const handlers = {
    onSetAttended: jest.fn().mockResolvedValue(true),
    onSetAttendance: jest.fn().mockResolvedValue(true),
    onClose: jest.fn(),
  };
  const user = userEvent.setup();
  render(
    <CheckInMode
      programs={PROGRAMS}
      applicants={APPLICANTS}
      sessions={SESSIONS}
      attendance={attendance}
      today={today}
      {...handlers}
    />,
  );
  return { ...handlers, user };
}

test("UI-51 오늘 회차가 있는 프로그램·회차를 먼저 고르고, 이름순 명단과 출석 수를 보여준다 (v2.4)", () => {
  setup([{ sessionId: 11, applicantId: 1 }]);
  expect(screen.getByLabelText("체크인 프로그램")).toHaveValue("3");
  expect(screen.getByLabelText("체크인 회차")).toHaveValue("11");
  expect(screen.getByText("출석 1/2명")).toBeInTheDocument();
  const names = screen.getAllByRole("listitem").map((li) => li.querySelector("p")?.textContent);
  expect(names).toEqual(["김예시", "이예시"]);
  expect(screen.getByRole("button", { name: "이예시 출석 취소" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "김예시 출석" })).toBeInTheDocument();
});

test("UI-52 뒷자리로 찾아 출석 → 회차 출석 저장, 완료 문구, 검색어 비움 (v2.4)", async () => {
  const { onSetAttendance, user } = setup();
  const search = screen.getByLabelText("이름 또는 연락처 뒷자리");
  await user.type(search, "2222");
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "김예시 출석" }));
  expect(onSetAttendance).toHaveBeenCalledWith(11, 2, true);
  expect(screen.getByRole("status")).toHaveTextContent("김예시 님 출석 처리했습니다");
  expect(search).toHaveValue("");

  await user.type(search, "없는사람");
  expect(screen.getByText("찾는 신청자가 없습니다")).toBeInTheDocument();
});

test("UI-53 회차 없는 프로그램은 참석 체크를 바꾸고, 관리 화면으로 돌아갈 수 있다 (v2.4)", async () => {
  const { onSetAttended, onClose, user } = setup();
  await user.selectOptions(screen.getByLabelText("체크인 프로그램"), "4");
  expect(screen.queryByLabelText("체크인 회차")).not.toBeInTheDocument();
  expect(screen.getByText("이 프로그램은 회차가 없어 참석 여부를 체크합니다.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "박데모 출석 취소" }));
  expect(onSetAttended).toHaveBeenCalledWith(3, false);
  expect(screen.getByRole("status")).toHaveTextContent("박데모 님 출석을 취소했습니다");
  await user.click(screen.getByRole("button", { name: "관리 화면으로" }));
  expect(onClose).toHaveBeenCalled();
});
