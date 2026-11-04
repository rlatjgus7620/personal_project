// 통계 화면용 계산 (v2.6, 순수 함수)

import type { Applicant, AttendanceRecord, Session } from "../types/applicant";
import { sessionsOf, shortDate } from "./attendance";

export type SessionRate = {
  sessionId: number;
  label: string; // "1회차 11.10"
  present: number; // 그 회차 출석 인원 (그 프로그램 신청자만)
  total: number; // 그 프로그램 신청자 수
  rate: number | null; // 출석률(%) 반올림, 신청자 0명이면 null
};

// 한 프로그램의 회차별 출석률 (날짜순)
export function sessionRates(
  programId: number,
  sessions: Session[],
  applicants: Applicant[],
  attendance: AttendanceRecord[],
): SessionRate[] {
  const memberIds = new Set(applicants.filter((a) => a.programId === programId).map((a) => a.id));
  return sessionsOf(sessions, programId).map((s, i) => {
    const present = attendance.filter((r) => r.sessionId === s.id && memberIds.has(r.applicantId)).length;
    const total = memberIds.size;
    return {
      sessionId: s.id,
      label: `${i + 1}회차 ${shortDate(s.sessionDate)}`,
      present,
      total,
      rate: total === 0 ? null : Math.round((present / total) * 100),
    };
  });
}
