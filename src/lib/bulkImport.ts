// 명단 일괄 등록용 붙여넣기 해석 (v2.5, 순수 함수)
// 엑셀에서 "이름 | 연락처" 두 칸을 복사해 붙여 넣으면 탭으로 나뉜 줄들이 들어옵니다.
// 쉼표(CSV), 공백으로 나눈 것도 받습니다.

import { formatPhoneInput } from "./format";
import { NAME_MAX_LENGTH, MESSAGES, PHONE_PATTERN } from "./validation";
import type { Applicant, BulkRow } from "../types/applicant";

export const BULK_MAX_ROWS = 200;

export type ParsedRow = BulkRow & {
  line: number; // 붙여 넣은 글의 몇 번째 줄인지 (1부터)
  error: string | null; // 문제가 있으면 문구, 없으면 null
};

// "김예시\t010-1234-5678" / "김예시,01012345678" / "김예시 010 1234 5678" → 이름·연락처
function splitLine(line: string): { name: string; phone: string } {
  // 탭·쉼표가 있으면 첫 칸이 이름, 나머지가 연락처 (이름 칸이 비어 있어도 자리는 지킴)
  const cells = line.split(/[\t,]/).map((c) => c.trim());
  if (cells.length >= 2) return { name: cells[0], phone: cells.slice(1).join("") };
  // 공백으로만 나뉜 경우: 숫자가 시작하는 곳부터 연락처
  const match = line.trim().match(/^(.*?)\s+([\d\s-]+)$/);
  if (match) return { name: match[1].trim(), phone: match[2] };
  return { name: line.trim(), phone: "" };
}

// 머리글 줄("이름, 연락처")은 건너뜀
function isHeader(line: string): boolean {
  return /이름/.test(line) && /(연락처|전화|휴대폰)/.test(line);
}

// 붙여 넣은 글 → 줄마다 이름·연락처와 문제(있으면). 이미 같은 프로그램에 있는 연락처, 붙여 넣은 글 안의 중복도 표시
export function parseRoster(text: string, existing: Applicant[], programId: number | null): ParsedRow[] {
  const taken = new Set(existing.filter((a) => a.programId === programId).map((a) => a.phone));
  const seen = new Set<string>();
  const rows: ParsedRow[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    if (raw.trim() === "" || (rows.length === 0 && isHeader(raw))) return;
    const { name, phone: rawPhone } = splitLine(raw);
    const phone = formatPhoneInput(rawPhone);
    let error: string | null = null;
    if (name === "") error = MESSAGES.nameRequired;
    else if (name.length > NAME_MAX_LENGTH) error = MESSAGES.nameTooLong;
    else if (!PHONE_PATTERN.test(phone)) error = MESSAGES.phoneFormat;
    else if (taken.has(phone)) error = "이미 같은 프로그램에 신청한 연락처입니다.";
    else if (seen.has(phone)) error = "붙여 넣은 명단 안에 같은 연락처가 있습니다.";
    if (error === null) seen.add(phone);
    rows.push({ line: index + 1, name, phone, error });
  });
  return rows;
}
