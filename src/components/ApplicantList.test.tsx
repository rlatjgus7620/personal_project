import { render, screen } from "@testing-library/react";
import ApplicantList from "./ApplicantList";
import ApplicantSummary from "./ApplicantSummary";
import { makeApplicant } from "../test-utils/makeApplicant";

const noop = () => {};

test("UI-11 0명이면 emptyMessage를 보여준다", () => {
  render(
    <ApplicantList applicants={[]} emptyMessage="신청자가 없습니다" onToggle={noop} onDelete={noop} onEdit={noop} />,
  );
  expect(screen.getByText("신청자가 없습니다")).toBeInTheDocument();
});

test("UI-12 3명이면 목록 항목이 3개", () => {
  const list = [
    makeApplicant({ id: 1, name: "김테스트" }),
    makeApplicant({ id: 2, name: "이테스트", phone: "010-2222-2222" }),
    makeApplicant({ id: 3, name: "박테스트", phone: "010-3333-3333" }),
  ];
  render(
    <ApplicantList applicants={list} emptyMessage="신청자가 없습니다" onToggle={noop} onDelete={noop} onEdit={noop} />,
  );
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
});

test("UI-13 요약은 '전체 3명 · 참석 1명'", () => {
  const list = [
    makeApplicant({ id: 1, attended: true }),
    makeApplicant({ id: 2 }),
    makeApplicant({ id: 3 }),
  ];
  render(<ApplicantSummary applicants={list} />);
  expect(screen.getByText("전체 3명 · 참석 1명")).toBeInTheDocument();
});
