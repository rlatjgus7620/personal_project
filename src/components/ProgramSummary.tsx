import type { Applicant, AttendanceRecord, Program, Session } from "../types/applicant";
import { summarizeByProgram } from "../lib/report";

type Props = {
  programs: Program[]; // 서버에서 받은 순서
  applicants: Applicant[]; // 필터 전 전체 명단
  sessions?: Session[]; // 회차 (v1.3)
  attendance?: AttendanceRecord[]; // 출석 기록 (v1.3)
};

export default function ProgramSummary({ programs, applicants, sessions = [], attendance = [] }: Props) {
  if (programs.length === 0) {
    return <p className="text-sm text-slate-500">등록된 프로그램이 없습니다</p>;
  }
  const stats = summarizeByProgram(programs, applicants, sessions, attendance);
  return (
    <section aria-label="프로그램별 요약" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <article
          key={s.programId}
          aria-label={s.label}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <span className="truncate">{s.label}</span>
            {s.full && (
              <span className="shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                마감
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-600">
            {s.capacity === null ? `신청 ${s.total}명` : `신청 ${s.total}/${s.capacity}명`} ·{" "}
            {s.sessionCount > 0 ? `회차 ${s.sessionCount}개` : `참석 ${s.attended}명`}
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-700">
            {/* 회차가 있으면 출석률(출석 기록 ÷ 신청자 × 회차), 없으면 참석률 */}
            {s.sessionCount > 0 ? "출석률" : "참석률"} {s.rate === null ? "-" : `${s.rate}%`}
          </p>
          {s.sessionCount > 0 && (
            <p className="text-xs text-indigo-700">
              수료 {s.completed}명 (기준 {s.completionRate}%)
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
