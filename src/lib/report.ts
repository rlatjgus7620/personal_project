// 보고용 계산 (순수 함수): CSV 만들기, 프로그램별 요약

import { PROGRAMS, programLabel, type Applicant, type ProgramCode } from "../types/applicant";
import { formatDate } from "./format";

// ---------- CSV ----------

const CSV_HEADER = ["번호", "이름", "연락처", "프로그램", "참석", "신청일"];

// 값 하나를 CSV 칸으로 바꿈
function csvCell(value: string | number): string {
  let text = String(value);
  // 엑셀이 =, +, -, @ 로 시작하는 값을 수식으로 실행하지 않게 앞에 ' 를 붙임
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  // 쉼표·따옴표·줄바꿈이 있으면 큰따옴표로 감싸고, 안의 " 는 "" 로
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

// 엑셀에서 한글이 깨지지 않도록 맨 앞에 BOM(﻿)을 붙임
export function toCsv(applicants: Applicant[]): string {
  const rows = applicants.map((a, index) => [
    index + 1,
    a.name,
    a.phone,
    programLabel(a.program),
    a.attended ? "참석" : "미참석",
    formatDate(a.createdAt),
  ]);
  const lines = [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

// 오늘 날짜(한국 시간)로 파일 이름: 신청자명단_20261030.csv
export function csvFileName(now: Date = new Date()): string {
  const ymd = formatDate(now.toISOString()).replace(/\./g, "");
  return `신청자명단_${ymd}.csv`;
}

// ---------- 프로그램별 요약 ----------

export type ProgramStat = {
  program: ProgramCode;
  label: string;
  total: number;
  attended: number;
  rate: number | null; // 참석률(%) 반올림, 신청 0명이면 null
};

export function summarizeByProgram(applicants: Applicant[]): ProgramStat[] {
  return PROGRAMS.map(({ code, label }) => {
    const members = applicants.filter((a) => a.program === code);
    const attended = members.filter((a) => a.attended).length;
    const total = members.length;
    return {
      program: code,
      label,
      total,
      attended,
      rate: total === 0 ? null : Math.round((attended / total) * 100),
    };
  });
}
