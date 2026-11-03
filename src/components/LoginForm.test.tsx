import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./LoginForm";

test("UI-44 빈 칸이면 보내지 않고, 비밀번호를 넣으면 onLogin(비밀번호)", async () => {
  const onLogin = jest.fn().mockResolvedValue(null);
  const user = userEvent.setup();
  render(<LoginForm onLogin={onLogin} />);
  expect(screen.getByRole("heading", { name: "관리자 로그인" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "로그인" }));
  expect(screen.getByRole("alert")).toHaveTextContent("비밀번호를 입력해 주세요.");
  expect(onLogin).not.toHaveBeenCalled();

  await user.type(screen.getByLabelText("관리자 비밀번호"), "pw-1234");
  await user.click(screen.getByRole("button", { name: "로그인" }));
  expect(onLogin).toHaveBeenCalledWith("pw-1234");
});

test("UI-45 실패 문구를 보여주고 입력칸을 비운다", async () => {
  const onLogin = jest.fn().mockResolvedValue("비밀번호가 맞지 않습니다.");
  const user = userEvent.setup();
  render(<LoginForm onLogin={onLogin} />);
  await user.type(screen.getByLabelText("관리자 비밀번호"), "wrong");
  await user.click(screen.getByRole("button", { name: "로그인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("비밀번호가 맞지 않습니다.");
  expect(screen.getByLabelText("관리자 비밀번호")).toHaveValue("");
});

test("UI-46 notice가 있으면 안내로 보여준다", () => {
  render(<LoginForm onLogin={jest.fn()} notice="로그인이 필요합니다. 다시 로그인해 주세요." />);
  expect(screen.getByRole("status")).toHaveTextContent("로그인이 필요합니다. 다시 로그인해 주세요.");
});
