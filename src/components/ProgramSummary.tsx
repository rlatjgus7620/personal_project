import type { Applicant, Program } from "../types/applicant";
import { summarizeByProgram } from "../lib/report";

type Props = {
  programs: Program[]; // 서버에서 받은 순서
  applicants: Applicant[]; // 필터 전 전체 명단
};

export default function ProgramSummary({ programs, applicants }: Props) {
  if (programs.length === 0) {
    return <p className="text-sm text-slate-500">등록된 프로그램이 없습니다</p>;
  }
  const stats = summarizeByProgram(programs, applicants);
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
            {s.capacity === null ? `신청 ${s.total}명` : `신청 ${s.total}/${s.capacity}명`} · 참석{" "}
            {s.attended}명
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-700">
            참석률 {s.rate === null ? "-" : `${s.rate}%`}
          </p>
        </article>
      ))}
    </section>
  );
}
