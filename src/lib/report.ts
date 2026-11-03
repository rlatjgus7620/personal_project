// 보고용 계산 (순수 함수): CSV 만들기, 프로그램별 요약

import type { Applicant, AttendanceRecord, Program, Session } from "../types/applicant";
import { applicantSessionStat, hasAttended, isCompleted, sessionStatLabel, sessionsOf } from "./attendance";
import { formatDate } from "./format";
import { isFull, programName } from "./programs";

// ---------- CSV ----------

const CSV_HEADER = ["번호", "이름", "연락처", "프로그램", "참석", "수료", "신청일"];

// 값 하나를 CSV 칸으로 바꿈 (출석표 CSV에서도 씀, v2.2)
export function csvCell(value: string | number): string {
  let text = String(value);
  // 엑셀이 =, +, -, @ 로 시작하는 값을 수식으로 실행하지 않게 앞에 ' 를 붙임
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  // 쉼표·따옴표·줄바꿈이 있으면 큰따옴표로 감싸고, 안의 " 는 "" 로
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

// 참석 칸: 회차가 있는 프로그램이면 "출석 2/3회", 없으면 "참석"/"미참석" (v1.3)
function attendanceCell(a: Applicant, sessions: Session[], attendance: AttendanceRecord[]): string {
  const stat = applicantSessionStat(a, sessions, attendance);
  if (stat !== null) return sessionStatLabel(stat);
  return a.attended ? "참석" : "미참석";
}

// 수료 칸 (v2.1): 회차가 있는 프로그램만 "수료"/"미수료", 없으면 빈칸
function completionCell(
  a: Applicant,
  programs: Program[],
  sessions: Session[],
  attendance: AttendanceRecord[],
): string {
  const stat = applicantSessionStat(a, sessions, attendance);
  if (stat === null) return "";
  const rate = programs.find((p) => p.id === a.programId)?.completionRate ?? 80;
  return isCompleted(stat, rate) ? "수료" : "미수료";
}

// 여러 줄을 CSV 글자로 (맨 앞 BOM: 엑셀에서 한글이 깨지지 않게)
export function linesToCsv(lines: (string | number)[][]): string {
  return "\uFEFF" + lines.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// 엑셀에서 한글이 깨지지 않도록 맨 앞에 BOM(﻿)을 붙임
export function toCsv(
  applicants: Applicant[],
  programs: Program[],
  sessions: Session[] = [],
  attendance: AttendanceRecord[] = [],
): string {
  const rows = applicants.map((a, index) => [
    index + 1,
    a.name,
    a.phone,
    programName(programs, a.programId),
    attendanceCell(a, sessions, attendance),
    completionCell(a, programs, sessions, attendance),
    formatDate(a.createdAt),
  ]);
  return linesToCsv([CSV_HEADER, ...rows]);
}

// 오늘 날짜(한국 시간)로 파일 이름: 신청자명단_20261030.csv
export function csvFileName(now: Date = new Date()): string {
  const ymd = formatDate(now.toISOString()).replace(/\./g, "");
  return `신청자명단_${ymd}.csv`;
}

// ---------- 프로그램별 요약 ----------

export type ProgramStat = {
  programId: number;
  label: string;
  total: number;
  attended: number;
  capacity: number | null;
  full: boolean;
  sessionCount: number; // 회차 수 (v1.3, 0이면 회차 없는 프로그램)
  completed: number; // 수료 기준을 넘은 사람 수 (v2.1, 회차 없는 프로그램은 0)
  completionRate: number; // 수료 기준(%)
  // 참석률(%) 반올림, 신청 0명이면 null
  // 회차가 있으면 출석률 = 출석 기록 ÷ (신청자 × 회차 수)
  rate: number | null;
};

// 프로그램 순서는 받은 그대로 (서버가 만든 순서로 줌)
export function summarizeByProgram(
  programs: Program[],
  applicants: Applicant[],
  sessions: Session[] = [],
  attendance: AttendanceRecord[] = [],
): ProgramStat[] {
  return programs.map((program) => {
    const members = applicants.filter((a) => a.programId === program.id);
    const attended = members.filter((a) => hasAttended(a, sessions, attendance)).length;
    const completed = members.filter((a) => {
      const stat = applicantSessionStat(a, sessions, attendance);
      return stat !== null && isCompleted(stat, program.completionRate);
    }).length;
    const total = members.length;
    const sessionIds = new Set(sessionsOf(sessions, program.id).map((s) => s.id));
    const memberIds = new Set(members.map((a) => a.id));
    let rate: number | null = null;
    if (total > 0 && sessionIds.size === 0) {
      rate = Math.round((attended / total) * 100);
    } else if (total > 0) {
      const records = attendance.filter(
        (r) => sessionIds.has(r.sessionId) && memberIds.has(r.applicantId),
      ).length;
      rate = Math.round((records / (total * sessionIds.size)) * 100);
    }
    return {
      programId: program.id,
      label: program.name,
      total,
      attended,
      capacity: program.capacity,
      full: isFull({ ...program, applicantCount: total }),
      sessionCount: sessionIds.size,
      completed,
      completionRate: program.completionRate,
      rate,
    };
  });
}
