import type { Applicant } from "../types/applicant";
import { summarizeByProgram } from "../lib/report";

type Props = { applicants: Applicant[] }; // 필터 전 전체 명단

export default function ProgramSummary({ applicants }: Props) {
  const stats = summarizeByProgram(applicants);
  return (
    <section aria-label="프로그램별 요약" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <article
          key={s.program}
          aria-label={s.label}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-800">{s.label}</h2>
          <p className="text-xs text-slate-600">
            신청 {s.total}명 · 참석 {s.attended}명
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-700">
            참석률 {s.rate === null ? "-" : `${s.rate}%`}
          </p>
        </article>
      ))}
    </section>
  );
}
