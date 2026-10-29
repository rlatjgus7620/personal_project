// 화면 쪽 입력 검사. 서버(backend/app/schemas.py)와 같은 규칙, 같은 문구를 씁니다.
// 화면에서 먼저 검사하면 서버까지 갔다 오지 않아도 바로 알려줄 수 있습니다.

import { PROGRAMS, type ProgramCode } from "../types/applicant";

export const NAME_MAX_LENGTH = 20;
export const PHONE_PATTERN = /^010-\d{4}-\d{4}$/;

export const MESSAGES = {
  nameRequired: "이름을 입력해 주세요.",
  nameTooLong: `이름은 ${NAME_MAX_LENGTH}자 이하로 입력해 주세요.`,
  phoneFormat: "연락처는 010-0000-0000 형식으로 입력해 주세요.",
  programRequired: "프로그램을 선택해 주세요.",
} as const;

export function isProgramCode(value: string): value is ProgramCode {
  return PROGRAMS.some((p) => p.code === value);
}

// 문제가 있으면 첫 번째 문구를, 없으면 null을 돌려줌 (검사 순서: 이름 → 연락처 → 프로그램)
export function validateApplicant(input: {
  name: string;
  phone: string;
  program: string;
}): string | null {
  const name = input.name.trim();
  if (name === "") return MESSAGES.nameRequired;
  if (name.length > NAME_MAX_LENGTH) return MESSAGES.nameTooLong;
  if (!PHONE_PATTERN.test(input.phone.trim())) return MESSAGES.phoneFormat;
  if (!isProgramCode(input.program)) return MESSAGES.programRequired;
  return null;
}
