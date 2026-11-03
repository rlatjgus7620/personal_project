"use client";

import type { Applicant, AttendanceRecord, Program, Session } from "../types/applicant";
import { downloadText } from "../lib/download";
import { csvFileName, toCsv } from "../lib/report";

type Props = {
  applicants: Applicant[]; // 지금 화면에 보이는(필터된) 명단
  programs: Program[]; // 프로그램 이름을 쓰기 위해 (v1.2)
  sessions?: Session[]; // 회차 프로그램은 참석 칸을 "출석 2/3회"로 (v1.3)
  attendance?: AttendanceRecord[];
};

export default function ExportButton({ applicants, programs, sessions = [], attendance = [] }: Props) {
  return (
    <button
      type="button"
      disabled={applicants.length === 0}
      onClick={() => downloadText(csvFileName(), toCsv(applicants, programs, sessions, attendance))}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
    >
      명단 CSV 내보내기
    </button>
  );
}
