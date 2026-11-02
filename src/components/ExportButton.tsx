"use client";

import type { Applicant, AttendanceRecord, Program, Session } from "../types/applicant";
import { csvFileName, toCsv } from "../lib/report";

type Props = {
  applicants: Applicant[]; // 지금 화면에 보이는(필터된) 명단
  programs: Program[]; // 프로그램 이름을 쓰기 위해 (v1.2)
  sessions?: Session[]; // 회차 프로그램은 참석 칸을 "출석 2/3회"로 (v1.3)
  attendance?: AttendanceRecord[];
};

// 브라우저에서 파일 내려받기를 실행 (서버를 거치지 않음)
function download(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 내려받기가 시작된 뒤에 임시 주소를 지움 (바로 지우면 일부 브라우저에서 파일 이름이 사라짐)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportButton({ applicants, programs, sessions = [], attendance = [] }: Props) {
  return (
    <button
      type="button"
      disabled={applicants.length === 0}
      onClick={() => download(csvFileName(), toCsv(applicants, programs, sessions, attendance))}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
    >
      명단 CSV 내보내기
    </button>
  );
}
