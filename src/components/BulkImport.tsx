"use client";
// 명단 한꺼번에 등록 (v2.5): 엑셀·구글폼에서 "이름 | 연락처" 두 칸을 복사해 붙여 넣으면
// 줄마다 미리 검사해서 보여주고, 문제없는 줄만 서버로 보냅니다.

import { useMemo, useState } from "react";
import type { Applicant, BulkResult, BulkRow, Program } from "../types/applicant";
import { BULK_MAX_ROWS, parseRoster } from "../lib/bulkImport";
import { programOptionLabel } from "../lib/programs";
import { MESSAGES, toProgramId } from "../lib/validation";

type Props = {
  programs: Program[];
  applicants: Applicant[]; // 이미 신청한 연락처를 미리 걸러내려고
  onBulkAdd: (programId: number, items: BulkRow[]) => Promise<BulkResult | null>;
};

export default function BulkImport({ programs, applicants, onBulkAdd }: Props) {
  const [program, setProgram] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  const programId = toProgramId(program);
  const rows = useMemo(() => parseRoster(text, applicants, programId), [text, applicants, programId]);
  const valid = rows.filter((r) => r.error === null);
  const problems = rows.filter((r) => r.error !== null);
  const tooMany = valid.length > BULK_MAX_ROWS;

  async function handleSubmit() {
    if (programId === null || valid.length === 0 || tooMany) return;
    setSending(true);
    const outcome = await onBulkAdd(
      programId,
      valid.map((r) => ({ name: r.name, phone: r.phone })),
    );
    setSending(false);
    if (outcome === null) return; // 요청 자체가 실패하면 위쪽 빨간 알림에 나옴
    setResult(outcome);
    if (outcome.failed.length === 0) setText(""); // 모두 성공하면 입력칸을 비움
  }

  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-slate-800">
        명단 한꺼번에 등록
      </summary>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3">
        <p className="text-sm text-slate-500">
          엑셀에서 이름·연락처 두 칸을 복사해 붙여 넣으세요. 한 줄에 한 명이고, 쉼표나 띄어쓰기로 나눠도 됩니다. 한 번에{" "}
          {BULK_MAX_ROWS}명까지 등록할 수 있습니다.
        </p>
        <select
          aria-label="일괄 등록 프로그램"
          value={program}
          onChange={(e) => {
            setProgram(e.target.value);
            setResult(null);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-80"
        >
          <option value="">프로그램을 선택하세요</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {programOptionLabel(p)}
            </option>
          ))}
        </select>
        <textarea
          aria-label="붙여 넣을 명단"
          rows={6}
          value={text}
          placeholder={"김예시\t010-0000-0001\n이샘플\t010-0000-0002"}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
        />

        {rows.length > 0 && (
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium text-slate-700">
              등록할 수 있는 사람 {valid.length}명 · 문제 있는 줄 {problems.length}개
            </p>
            {problems.length > 0 && (
              <ul aria-label="문제 있는 줄" className="list-disc pl-5 text-red-700">
                {problems.map((r) => (
                  <li key={r.line}>
                    {r.line}번째 줄 ({r.name || "이름 없음"}): {r.error}
                  </li>
                ))}
              </ul>
            )}
            {programId === null && <p className="text-amber-700">{MESSAGES.programRequired}</p>}
            {tooMany && <p className="text-red-700">한 번에 {BULK_MAX_ROWS}명까지 등록할 수 있습니다.</p>}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={sending || programId === null || valid.length === 0 || tooMany}
          className="self-start rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          {valid.length}명 등록
        </button>

        {result && (
          <div role="status" className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <p className="font-semibold text-emerald-700">{result.created.length}명을 등록했습니다.</p>
            {result.failed.length > 0 && (
              <>
                <p className="mt-1 font-semibold text-red-700">등록하지 못한 {result.failed.length}명</p>
                <ul className="list-disc pl-5 text-red-700">
                  {result.failed.map((f) => (
                    <li key={f.row}>
                      {f.name} ({f.phone}): {f.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
