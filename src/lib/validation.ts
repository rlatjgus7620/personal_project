// 화면 쪽 입력 검사. 서버(backend/app/schemas.py)와 같은 규칙, 같은 문구를 씁니다.
// 화면에서 먼저 검사하면 서버까지 갔다 오지 않아도 바로 알려줄 수 있습니다.

import type { ProgramInput } from "../types/applicant";

export const NAME_MAX_LENGTH = 20;
export const PHONE_PATTERN = /^010-\d{4}-\d{4}$/;
export const PROGRAM_NAME_MAX_LENGTH = 30;
export const LOCATION_MAX_LENGTH = 50;
export const CAPACITY_MIN = 1;
export const CAPACITY_MAX = 999;
export const NOTE_MAX_LENGTH = 30; // 회차 메모 (v1.3)

export const MESSAGES = {
  nameRequired: "이름을 입력해 주세요.",
  nameTooLong: `이름은 ${NAME_MAX_LENGTH}자 이하로 입력해 주세요.`,
  phoneFormat: "연락처는 010-0000-0000 형식으로 입력해 주세요.",
  programRequired: "프로그램을 선택해 주세요.",
  programNameRequired: "프로그램 이름을 입력해 주세요.",
  programNameTooLong: `프로그램 이름은 ${PROGRAM_NAME_MAX_LENGTH}자 이하로 입력해 주세요.`,
  locationTooLong: `장소는 ${LOCATION_MAX_LENGTH}자 이하로 입력해 주세요.`,
  capacityRange: `정원은 ${CAPACITY_MIN}~${CAPACITY_MAX}명 사이로 입력해 주세요.`,
  periodOrder: "종료일은 시작일보다 빠를 수 없습니다.",
  sessionDateRequired: "회차 날짜를 입력해 주세요.",
  passwordRequired: "비밀번호를 입력해 주세요.",
} as const;

// 선택칸 값("" 또는 "3")을 프로그램 번호로. 고르지 않았으면 null
export function toProgramId(value: string): number | null {
  const id = Number(value);
  return value !== "" && Number.isInteger(id) && id >= 1 ? id : null;
}

// 문제가 있으면 첫 번째 문구를, 없으면 null을 돌려줌 (검사 순서: 이름 → 연락처 → 프로그램)
export function validateApplicant(input: {
  name: string;
  phone: string;
  programId: string; // 선택칸의 값
}): string | null {
  const name = input.name.trim();
  if (name === "") return MESSAGES.nameRequired;
  if (name.length > NAME_MAX_LENGTH) return MESSAGES.nameTooLong;
  if (!PHONE_PATTERN.test(input.phone.trim())) return MESSAGES.phoneFormat;
  if (toProgramId(input.programId) === null) return MESSAGES.programRequired;
  return null;
}

// 프로그램 입력 검사 (v1.2). 순서: 이름 → 장소 → 정원 → 기간
export function validateProgram(input: ProgramInput): string | null {
  const name = input.name.trim();
  if (name === "") return MESSAGES.programNameRequired;
  if (name.length > PROGRAM_NAME_MAX_LENGTH) return MESSAGES.programNameTooLong;
  if ((input.location ?? "").trim().length > LOCATION_MAX_LENGTH) return MESSAGES.locationTooLong;
  if (
    input.capacity !== null &&
    (!Number.isInteger(input.capacity) || input.capacity < CAPACITY_MIN || input.capacity > CAPACITY_MAX)
  ) {
    return MESSAGES.capacityRange;
  }
  // "2026-11-10" 형식은 글자 순서가 날짜 순서와 같아서 문자열로 비교해도 됨
  if (input.startDate && input.endDate && input.endDate < input.startDate) return MESSAGES.periodOrder;
  return null;
}
