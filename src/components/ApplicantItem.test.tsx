import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApplicantItem from "./ApplicantItem";
import { makeApplicant } from "../test-utils/makeApplicant";
import type { Applicant } from "../types/applicant";

function setup(applicant: Applicant = makeApplicant({ id: 7 })) {
  const handlers = { onToggle: jest.fn(), onDelete: jest.fn(), onEdit: jest.fn() };
  const user = userEvent.setup();
  render(
    <ul>
      <ApplicantItem applicant={applicant} {...handlers} />
    </ul>,
  );
  return { ...handlers, user };
}

describe("보기 모드 (v0.1)", () => {
  test("UI-07 이름, 프로그램 이름, 가린 연락처, 신청일을 보여주고 전체 번호는 숨긴다", () => {
    setup();
    expect(screen.getByText("김테스트")).toBeInTheDocument();
    expect(screen.getByText("이력서 클리닉")).toBeInTheDocument();
    expect(screen.getByText("010-****-5678")).toBeInTheDocument();
    expect(screen.getByText("신청 2026.10.29")).toBeInTheDocument();
    expect(screen.queryByText("010-1234-5678")).not.toBeInTheDocument();
  });

  test("UI-08 체크박스를 누르면 onToggle(id)", async () => {
    const { onToggle, user } = setup();
    await user.click(screen.getByRole("checkbox", { name: "김테스트 참석" }));
    expect(onToggle).toHaveBeenCalledWith(7);
  });

  test("UI-09 삭제를 누르면 onDelete(id)", async () => {
    const { onDelete, user } = setup();
    await user.click(screen.getByRole("button", { name: "김테스트 삭제" }));
    expect(onDelete).toHaveBeenCalledWith(7);
  });

  test("UI-10 참석한 사람은 체크되어 있고 '참석 완료'가 보인다", () => {
    setup(makeApplicant({ attended: true }));
    expect(screen.getByRole("checkbox", { name: "김테스트 참석" })).toBeChecked();
    expect(screen.getByText("참석 완료")).toBeInTheDocument();
  });
});

describe("수정 모드 (v0.4)", () => {
  test("UI-19 수정을 누르면 입력창 3개에 기존 값이 들어 있고 이름에 포커스", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "김테스트 수정" }));
    expect(screen.getByLabelText("이름 수정")).toHaveValue("김테스트");
    expect(screen.getByLabelText("이름 수정")).toHaveFocus();
    expect(screen.getByLabelText("연락처 수정")).toHaveValue("010-1234-5678");
    expect(screen.getByLabelText("프로그램 수정")).toHaveValue("resume_clinic");
  });

  test("UI-20 이름을 바꾸고 Enter → 바뀐 항목만 onEdit, 보기 모드로", async () => {
    const { onEdit, user } = setup();
    await user.click(screen.getByRole("button", { name: "김테스트 수정" }));
    const name = screen.getByLabelText("이름 수정");
    await user.clear(name);
    await user.type(name, "김수정{Enter}");
    expect(onEdit).toHaveBeenCalledWith(7, { name: "김수정" });
    expect(screen.queryByLabelText("이름 수정")).not.toBeInTheDocument();
  });

  test("UI-21 Esc나 취소를 누르면 onEdit 없이 원래 값으로", async () => {
    const { onEdit, user } = setup();
    await user.click(screen.getByRole("button", { name: "김테스트 수정" }));
    await user.type(screen.getByLabelText("이름 수정"), "바뀜{Escape}");
    expect(screen.getByText("김테스트")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "김테스트 수정" }));
    await user.type(screen.getByLabelText("이름 수정"), "바뀜");
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByText("김테스트")).toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });

  test("UI-22 빈 이름이나 틀린 연락처로 저장하면 onEdit 없이 문구를 보여준다", async () => {
    const { onEdit, user } = setup();
    await user.click(screen.getByRole("button", { name: "김테스트 수정" }));
    await user.clear(screen.getByLabelText("이름 수정"));
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByRole("alert")).toHaveTextContent("이름을 입력해 주세요.");

    await user.type(screen.getByLabelText("이름 수정"), "김테스트");
    await user.clear(screen.getByLabelText("연락처 수정"));
    await user.type(screen.getByLabelText("연락처 수정"), "010-12");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByRole("alert")).toHaveTextContent("010-0000-0000 형식");
    expect(screen.getByLabelText("이름 수정")).toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });

  test("UI-23 아무것도 안 바꾸고 저장하면 onEdit 없이 보기 모드로", async () => {
    const { onEdit, user } = setup();
    await user.click(screen.getByRole("button", { name: "김테스트 수정" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("이름 수정")).not.toBeInTheDocument();
  });
});
