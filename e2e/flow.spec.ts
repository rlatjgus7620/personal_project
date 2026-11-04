// 화면 전체 흐름 테스트 (v2.7, E2E-01): 실제 브라우저로 처음부터 끝까지
// 로그인 → 신청자 등록 → 일괄 등록 → 회차 추가 → 출석 체크 → 수료 표시 → 현장 체크인 → 로그아웃
import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

test("E2E-01 로그인부터 현장 체크인, 로그아웃까지", async ({ page }) => {
  // 1) 로그인: 틀린 비밀번호 → 맞는 비밀번호
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();
  await page.getByLabel("관리자 비밀번호").fill("wrong-password");
  await page.getByRole("button", { name: "로그인" }).click();
  // Next.js가 페이지마다 화면 낭독기용 role="alert" 요소를 하나 더 넣으므로 본문(main) 안에서만 찾음
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("비밀번호가 맞지 않습니다.");
  await page.getByLabel("관리자 비밀번호").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: "에듀체크", level: 1 })).toBeVisible();
  await expect(page.getByText("0명 표시 중")).toBeVisible();

  // 2) 신청자 한 명 등록 (연락처는 숫자만 쳐도 하이픈이 들어감)
  await page.getByLabel("이름", { exact: true }).fill("김예시");
  await page.getByLabel("연락처", { exact: true }).fill("01000000001");
  await page.getByLabel("프로그램", { exact: true }).selectOption({ label: "모의면접" });
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await expect(page.getByText("1명 표시 중")).toBeVisible();

  // 3) 명단 한꺼번에 등록: 2명
  await page.getByText("명단 한꺼번에 등록").click();
  await page.getByLabel("일괄 등록 프로그램").selectOption({ label: "모의면접" });
  await page.getByLabel("붙여 넣을 명단").fill("이샘플\t010-0000-0002\n박데모\t010-0000-0003");
  await page.getByRole("button", { name: "2명 등록", exact: true }).click();
  await expect(page.getByText("2명을 등록했습니다.")).toBeVisible();
  await expect(page.getByText("3명 표시 중")).toBeVisible();

  // 4) 회차 2개 추가하고 출석 체크
  await page.getByText("회차 출석부").click();
  await page.getByLabel("출석부 프로그램").selectOption({ label: "모의면접" });
  await page.getByLabel("회차 날짜", { exact: true }).fill("2026-11-10");
  await page.getByRole("button", { name: "회차 추가" }).click();
  await expect(page.getByRole("button", { name: "1회차 11.10" })).toBeVisible();
  await page.getByLabel("회차 날짜", { exact: true }).fill("2026-11-12");
  await page.getByRole("button", { name: "회차 추가" }).click();
  await expect(page.getByRole("button", { name: "2회차 11.12" })).toBeVisible();
  for (const label of ["1회차 11.10", "2회차 11.12"]) {
    await page.getByRole("button", { name: label }).click();
    const box = page.getByRole("checkbox", { name: "김예시 출석" });
    await box.click();
    await expect(box).toBeChecked();
  }

  // 5) 명단에 출석 횟수와 수료(2/2회 = 100% ≥ 80%) 표시
  const kim = page.getByRole("listitem").filter({ hasText: "김예시" }).filter({ hasText: "신청" });
  await expect(kim).toContainText("출석 2/2회");
  await expect(kim).toContainText("수료");

  // 6) 현장 체크인: 연락처 뒷자리로 찾아 출석
  await page.getByRole("button", { name: "현장 체크인" }).click();
  await page.getByLabel("체크인 프로그램").selectOption({ label: "모의면접" });
  await page.getByLabel("이름 또는 연락처 뒷자리").fill("0003");
  await page.getByRole("button", { name: "박데모 출석" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText("박데모 님 출석 처리했습니다");
  await page.getByRole("button", { name: "관리 화면으로" }).click();

  // 7) 로그아웃하면 로그인 화면, 새로고침해도 로그인 화면
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();
});
