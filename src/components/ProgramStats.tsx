// 통계 (v2.6): 프로그램별 요약 표 + 회차별 출석률 막대
// 막대는 한 가지 색(출석률이 클수록 길게)이고, 숫자를 옆에 글자로 함께 적어서 색을 못 봐도 읽을 수 있게 합니다.

import type { Applicant, AttendanceRecord, Program, Session } from "../types/applicant";
import { summarizeByProgram } from "../lib/report";
import { sessionRates } from "../lib/stats";

type Props = {
  programs: Program[];
  applicants: Applicant[];
  sessions: Session[];
  attendance: AttendanceRecord[];
};

function percent(rate: number | null): string {
  return rate === null ? "-" : `${rate}%`;
}

export default function ProgramStats({ programs, applicants, sessions, attendance }: Props) {
  const stats = summarizeByProgram(programs, applicants, sessions, attendance);
  const withSessions = stats.filter((s) => s.sessionCount > 0);

  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-slate-800">통계</summary>
      <div className="flex flex-col gap-5 border-t border-slate-100 px-4 py-3">
        {stats.length === 0 ? (
          <p className="text-sm text-slate-500">등록된 프로그램이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="mb-2 text-left font-semibold text-slate-700">프로그램별 요약</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th scope="col" className="py-1.5 pr-3 font-medium">프로그램</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">신청</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">회차</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">출석·참석률</th>
                  <th scope="col" className="py-1.5 text-right font-medium">수료</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.programId} className="border-b border-slate-100 text-slate-800">
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                      {s.label}
                    </th>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{s.total}명</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{s.sessionCount > 0 ? `${s.sessionCount}개` : "-"}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{percent(s.rate)}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {s.sessionCount > 0 ? `${s.completed}/${s.total}명` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {withSessions.map((s) => {
          const rates = sessionRates(s.programId, sessions, applicants, attendance);
          return (
            <section key={s.programId} aria-label={`${s.label} 회차별 출석률`} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-slate-700">{s.label} · 회차별 출석률</h3>
              <ul className="flex flex-col gap-1.5">
                {rates.map((r) => {
                  const text = `${r.present}/${r.total}명 · ${percent(r.rate)}`;
                  return (
                    <li
                      key={r.sessionId}
                      title={`${r.label} 출석 ${text}`}
                      className="grid grid-cols-[6.5rem_1fr_7rem] items-center gap-2 text-sm"
                    >
                      <span className="text-slate-600">{r.label}</span>
                      <span className="h-2 rounded-full bg-slate-100" aria-hidden="true">
                        <span
                          className="block h-2 rounded-full bg-emerald-600"
                          style={{ width: `${r.rate ?? 0}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums text-slate-800">{text}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </details>
  );
}
