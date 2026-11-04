"use client";
// 출석표 CSV·인쇄 버튼 (v2.2, v2.7에 AttendanceBook에서 분리)
// 표 만들기는 lib/attendanceSheet.ts의 순수 함수가 하고, 여기서는 내려받기·인쇄 창만 다룹니다.

import { useState } from "react";
import type { Applicant, AttendanceRecord, Program, Session } from "../types/applicant";
import { buildAttendanceSheet, sheetFileName, sheetToCsv, sheetToHtml } from "../lib/attendanceSheet";
import { downloadText } from "../lib/download";
import { formatDate } from "../lib/format";

type Props = {
  program: Program;
  applicants: Applicant[];
  sessions: Session[];
  attendance: AttendanceRecord[];
};

export default function AttendanceSheetButtons({ program, applicants, sessions, attendance }: Props) {
  const [message, setMessage] = useState<string | null>(null);

  function exportSheet() {
    const sheet = buildAttendanceSheet(program, sessions, applicants, attendance);
    downloadText(sheetFileName(program.name), sheetToCsv(sheet));
  }

  // 새 창에 표를 열고 인쇄 (인쇄본은 연락처 가운데를 가림)
  function printSheet() {
    const sheet = buildAttendanceSheet(program, sessions, applicants, attendance, { maskPhones: true });
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setMessage("팝업이 막혀 인쇄 창을 열 수 없습니다. 브라우저에서 팝업을 허용해 주세요.");
      return;
    }
    setMessage(null);
    printWindow.document.write(sheetToHtml(sheet, formatDate(new Date().toISOString())));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
      <span className="text-sm text-slate-500">출석표 (수료 기준 {program.completionRate}%)</span>
      <button
        type="button"
        onClick={exportSheet}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50"
      >
        출석표 CSV
      </button>
      <button
        type="button"
        onClick={printSheet}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50"
      >
        출석표 인쇄
      </button>
      {message && (
        <p role="alert" className="w-full text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
