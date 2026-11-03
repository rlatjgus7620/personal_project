// 회차별 출석표 (v2.2, 순수 함수): 사람 × 회차 표를 만들고 CSV·인쇄용 HTML로 바꿈

import type { Applicant, AttendanceRecord, Program, Session } from "../types/applicant";
import { applicantSessionStat, attendanceRate, isCompleted, isPresent, sessionsOf, shortDate } from "./attendance";
import { formatDate, maskPhone } from "./format";
import { linesToCsv } from "./report";

export type AttendanceSheet = {
  title: string; // "모의면접 출석표"
  header: string[]; // 이름, 연락처, 1회차 11.10, …, 출석, 출석률, 수료
  rows: string[][];
};

// maskPhones: 인쇄용은 연락처 가운데를 가림 (종이는 여러 사람이 보므로)
export function buildAttendanceSheet(
  program: Program,
  sessions: Session[],
  applicants: Applicant[],
  attendance: AttendanceRecord[],
  { maskPhones = false }: { maskPhones?: boolean } = {},
): AttendanceSheet {
  const list = sessionsOf(sessions, program.id);
  const members = applicants
    .filter((a) => a.programId === program.id)
    .sort((a, b) => a.name.localeCompare(b.name, "ko") || a.id - b.id);
  const header = [
    "이름",
    "연락처",
    ...list.map((s, i) => `${i + 1}회차 ${shortDate(s.sessionDate)}`),
    "출석",
    "출석률",
    `수료(기준 ${program.completionRate}%)`,
  ];
  const rows = members.map((a) => {
    const stat = applicantSessionStat(a, sessions, attendance) ?? { attended: 0, total: 0 };
    return [
      a.name,
      maskPhones ? maskPhone(a.phone) : a.phone,
      ...list.map((s) => (isPresent(attendance, s.id, a.id) ? "O" : "")),
      `${stat.attended}/${stat.total}`,
      `${attendanceRate(stat)}%`,
      isCompleted(stat, program.completionRate) ? "수료" : "미수료",
    ];
  });
  return { title: `${program.name} 출석표`, header, rows };
}

export function sheetToCsv(sheet: AttendanceSheet): string {
  return linesToCsv([sheet.header, ...sheet.rows]);
}

// 파일 이름에 쓸 수 없는 글자(\ / : * ? " < > |)는 _ 로 바꿈
export function sheetFileName(programName: string, now: Date = new Date()): string {
  const safe = programName.replace(/[\\/:*?"<>|]/g, "_").trim() || "프로그램";
  const ymd = formatDate(now.toISOString()).replace(/\./g, "");
  return `출석표_${safe}_${ymd}.csv`;
}

// HTML에 그대로 넣으면 안 되는 글자를 바꿈 (이름에 <script> 같은 글자가 있어도 실행되지 않게)
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 인쇄용 HTML 한 페이지 (새 창에 열어서 인쇄)
export function sheetToHtml(sheet: AttendanceSheet, printedAt: string): string {
  const head = sheet.header.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body =
    sheet.rows.length === 0
      ? `<tr><td colspan="${sheet.header.length}">이 프로그램 신청자가 없습니다</td></tr>`
      : sheet.rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(sheet.title)}</title>
<style>
body{font-family:sans-serif;margin:24px;color:#111}
h1{font-size:20px;margin:0 0 4px}
p{margin:0 0 12px;color:#555;font-size:12px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border:1px solid #999;padding:6px 8px;text-align:center}
th{background:#f1f5f9}
td:first-child,th:first-child{text-align:left}
</style></head><body>
<h1>${escapeHtml(sheet.title)}</h1><p>출력일 ${escapeHtml(printedAt)}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}
