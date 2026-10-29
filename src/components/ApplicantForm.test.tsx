import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApplicantForm from "./ApplicantForm";

function setup(result = true) {
  const onAdd = jest.fn().mockResolvedValue(result);
  const user = userEvent.setup();
  render(<ApplicantForm onAdd={onAdd} />);
  const name = screen.getByLabelText("이름");
  const phone = screen.getByLabelText("연락처");
  const program = screen.getByLabelText("프로그램");
  const submit = screen.getByRole("button", { name: "등록" });
  return { onAdd, user, name, phone, program, submit };
}

test("UI-01 바르게 입력 후 등록하면 공백을 자른 값으로 onAdd가 호출되고 입력칸이 비워진다", async () => {
  const { onAdd, user, name, phone, program, submit } = setup();
  await user.type(name, "  김테스트 ");
  await user.type(phone, "010-1234-5678");
  await user.selectOptions(program, "mock_interview");
  await user.click(submit);
  expect(onAdd).toHaveBeenCalledWith({
    name: "김테스트",
    phone: "010-1234-5678",
    program: "mock_interview",
  });
  expect(name).toHaveValue("");
  expect(phone).toHaveValue("");
  expect(program).toHaveValue("");
});

test.each(["", "   "])("UI-02 이름이 '%s'이면 onAdd가 호출되지 않는다", async (value) => {
  const { onAdd, user, name, phone, program, submit } = setup();
  if (value) await user.type(name, value);
  await user.type(phone, "010-1234-5678");
  await user.selectOptions(program, "mock_interview");
  await user.click(submit);
  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("이름을 입력해 주세요.");
});

test("UI-03 연락처 형식이 틀리면 onAdd가 호출되지 않는다", async () => {
  const { onAdd, user, name, phone, program, submit } = setup();
  await user.type(name, "김테스트");
  await user.type(phone, "01012345678");
  await user.selectOptions(program, "mock_interview");
  await user.click(submit);
  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "연락처는 010-0000-0000 형식으로 입력해 주세요.",
  );
});

test("UI-04 프로그램을 안 고르면 onAdd가 호출되지 않는다", async () => {
  const { onAdd, user, name, phone, submit } = setup();
  await user.type(name, "김테스트");
  await user.type(phone, "010-1234-5678");
  await user.click(submit);
  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("프로그램을 선택해 주세요.");
});

test("UI-05 입력창에서 Enter를 누르면 등록 클릭과 같다", async () => {
  const { onAdd, user, name, phone, program } = setup();
  await user.type(name, "김테스트");
  await user.selectOptions(program, "job_search");
  await user.type(phone, "010-1234-5678{Enter}");
  expect(onAdd).toHaveBeenCalledTimes(1);
});

test("UI-06 onAdd가 false를 돌려주면 입력값이 그대로 남는다", async () => {
  const { onAdd, user, name, phone, program, submit } = setup(false);
  await user.type(name, "김테스트");
  await user.type(phone, "010-1234-5678");
  await user.selectOptions(program, "job_search");
  await user.click(submit);
  expect(onAdd).toHaveBeenCalled();
  expect(name).toHaveValue("김테스트");
  expect(phone).toHaveValue("010-1234-5678");
});
