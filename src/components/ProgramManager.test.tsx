import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProgramForm from "./ProgramForm";
import ProgramManager from "./ProgramManager";
import { makeProgram } from "../test-utils/makeProgram";
import { MESSAGES } from "../lib/validation";

describe("ProgramForm (v1.2)", () => {
  test("UI-31 값을 넣고 추가하면 변환된 값으로 onSubmit, 성공하면 입력칸을 비운다", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(<ProgramForm submitLabel="프로그램 추가" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("프로그램 이름"), " 자기소개서 특강 ");
    await user.type(screen.getByLabelText("시작일"), "2026-11-20");
    await user.type(screen.getByLabelText("장소"), "2층 강의실");
    await user.type(screen.getByLabelText("정원"), "20");
    await user.click(screen.getByRole("button", { name: "프로그램 추가" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "자기소개서 특강",
      startDate: "2026-11-20",
      endDate: null,
      location: "2층 강의실",
      capacity: 20,
      completionRate: 80, // 비워 두면 기본 80% (v2.1)
    });
    expect(screen.getByLabelText("프로그램 이름")).toHaveValue("");
  });

  test("UI-32 빈 이름, 정원 0, 종료일 < 시작일이면 보내지 않고 문구를 보여준다", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(<ProgramForm submitLabel="프로그램 추가" onSubmit={onSubmit} />);
    const submit = screen.getByRole("button", { name: "프로그램 추가" });

    await user.click(submit);
    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.programNameRequired);

    await user.type(screen.getByLabelText("프로그램 이름"), "특강");
    await user.type(screen.getByLabelText("정원"), "0");
    await user.click(submit);
    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.capacityRange);

    await user.clear(screen.getByLabelText("정원"));
    await user.type(screen.getByLabelText("시작일"), "2026-11-12");
    await user.type(screen.getByLabelText("종료일"), "2026-11-10");
    await user.click(submit);
    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.periodOrder);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("ProgramManager (v1.2)", () => {
  const programs = [
    makeProgram({
      id: 1,
      name: "모의면접",
      startDate: "2026-11-10",
      endDate: "2026-11-12",
      location: "3층 세미나실",
      capacity: 10,
      applicantCount: 1,
    }),
    makeProgram({ id: 2, name: "취업 특강" }),
  ];

  function setup(updateResult = true) {
    const handlers = {
      onAdd: jest.fn().mockResolvedValue(true),
      onUpdate: jest.fn().mockResolvedValue(updateResult),
      onDelete: jest.fn(),
    };
    const user = userEvent.setup();
    render(<ProgramManager programs={programs} {...handlers} />);
    return { ...handlers, user };
  }

  test("UI-33 펼치면 기간·장소·정원·수료 기준이 보이고, 신청자가 있으면 삭제를 막는다", async () => {
    const { user } = setup();
    await user.click(screen.getByText("프로그램 관리 (2개)"));
    expect(screen.getByText("2026.11.10 ~ 2026.11.12 · 3층 세미나실 · 신청 1/10명 · 수료 기준 80%")).toBeInTheDocument();
    expect(screen.getByText("기간 미정 · 장소 미정 · 신청 0명 · 정원 제한 없음 · 수료 기준 80%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "모의면접 삭제" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "취업 특강 삭제" })).toBeEnabled();
  });

  test("UI-34 수정해서 저장하면 전체 값으로 onUpdate, 성공하면 보기로 돌아간다", async () => {
    const { onUpdate, user } = setup();
    await user.click(screen.getByText("프로그램 관리 (2개)"));
    await user.click(screen.getByRole("button", { name: "모의면접 수정" }));
    const row = screen.getByRole("button", { name: "저장" }).closest("li") as HTMLElement;
    const location = within(row).getByLabelText("장소");
    expect(location).toHaveValue("3층 세미나실");
    await user.clear(location);
    await user.type(location, "2층 강의실");
    await user.click(within(row).getByRole("button", { name: "저장" }));
    expect(onUpdate).toHaveBeenCalledWith(1, {
      name: "모의면접",
      startDate: "2026-11-10",
      endDate: "2026-11-12",
      location: "2층 강의실",
      capacity: 10,
      completionRate: 80,
    });
    expect(await screen.findByRole("button", { name: "모의면접 수정" })).toBeInTheDocument();
  });

  test("UI-35 신청자 없는 프로그램은 확인 후 삭제된다", async () => {
    const { onDelete, user } = setup();
    await user.click(screen.getByText("프로그램 관리 (2개)"));
    await user.click(screen.getByRole("button", { name: "취업 특강 삭제" }));
    expect(screen.getByText("취업 특강 프로그램을 삭제할까요?")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));
    expect(onDelete).toHaveBeenCalledWith(2);
  });
});
