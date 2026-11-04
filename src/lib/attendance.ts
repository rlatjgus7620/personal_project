// 회차·출석 계산 (v1.3, 순수 함수)
// 서버에서 받은 회차·출석 기록 전체로 화면에 필요한 숫자를 계산합니다.

import type { Applicant, AttendanceRecord, Session, SessionStat } from "../types/applicant";

// 그 프로그램의 회차만, 날짜순 (같은 날짜는 없지만 혹시 몰라 id순)
export function sessionsOf(sessions: Session[], programId: number): Session[] {
  return sessions
    .filter((s) => s.programId === programId)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.id - b.id);
}

// "2026-11-10" → "11.10" (회차 버튼용 짧은 날짜)
export function shortDate(ymd: string): string {
  return ymd.slice(5).replace("-", ".");
}

// 1회차 · 2026.11.10 (OT)  — 메모가 없으면 괄호 없이
export function sessionTitle(session: Session, order: number): string {
  const date = session.sessionDate.replace(/-/g, ".");
  const note = session.note ? ` (${session.note})` : "";
  return `${order}회차 · ${date}${note}`;
}

// 이 회차에 이 신청자가 출석했는지
export function isPresent(attendance: AttendanceRecord[], sessionId: number, applicantId: number): boolean {
  return attendance.some((r) => r.sessionId === sessionId && r.applicantId === applicantId);
}

// 신청자의 출석 횟수. 그 프로그램에 회차가 없으면 null (→ 예전처럼 참석 체크박스 사용)
export function applicantSessionStat(
  applicant: Applicant,
  sessions: Session[],
  attendance: AttendanceRecord[],
): SessionStat | null {
  const ids = new Set(sessionsOf(sessions, applicant.programId).map((s) => s.id));
  if (ids.size === 0) return null;
  const attended = attendance.filter((r) => r.applicantId === applicant.id && ids.has(r.sessionId)).length;
  return { attended, total: ids.size };
}

// "참석한 사람"의 뜻: 회차가 없으면 attended 값, 회차가 있으면 1회 이상 출석
export function hasAttended(
  applicant: Applicant,
  sessions: Session[],
  attendance: AttendanceRecord[],
): boolean {
  const stat = applicantSessionStat(applicant, sessions, attendance);
  return stat === null ? applicant.attended : stat.attended > 0;
}

// "출석 2/3회"
export function sessionStatLabel(stat: SessionStat): string {
  return `출석 ${stat.attended}/${stat.total}회`;
}

// ---------- 수료 판정 (v2.1) ----------

// 출석률(%)이 수료 기준 이상이면 수료. 회차가 없으면(total 0) 수료 판정 없음
export function isCompleted(stat: SessionStat, completionRate: number): boolean {
  return stat.total > 0 && stat.attended * 100 >= completionRate * stat.total;
}

// 출석률(%) 반올림
export function attendanceRate(stat: SessionStat): number {
  return stat.total === 0 ? 0 : Math.round((stat.attended / stat.total) * 100);
}

// ---------- 현장 체크인 (v2.4) ----------

// 체크인할 회차 고르기: 오늘 회차 → 없으면 오늘 이전 마지막 회차 → 없으면 첫 회차
// (list는 sessionsOf로 날짜순 정렬된 한 프로그램의 회차)
export function defaultSessionFor(list: Session[], today: string): Session | undefined {
  const exact = list.find((s) => s.sessionDate === today);
  if (exact) return exact;
  const past = list.filter((s) => s.sessionDate < today);
  return past.length > 0 ? past[past.length - 1] : list[0];
}

// 처음 고를 프로그램: 오늘 회차가 있는 프로그램 → 없으면 첫 프로그램
export function defaultCheckInProgramId(
  programIds: number[],
  sessions: Session[],
  today: string,
): number | undefined {
  const withToday = programIds.find((id) => sessions.some((s) => s.programId === id && s.sessionDate === today));
  return withToday ?? programIds[0];
}
