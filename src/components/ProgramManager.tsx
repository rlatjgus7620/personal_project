"use client";

import { useState } from "react";
import type { Program, ProgramInput } from "../types/applicant";
import { formatPeriod } from "../lib/format";
import { copyOf } from "../lib/programs";
import ProgramForm from "./ProgramForm";

type Props = {
  programs: Program[]; // 신청자 수가 계산된 목록
  onAdd: (input: ProgramInput) => Promise<boolean>;
  onUpdate: (id: number, input: ProgramInput) => Promise<boolean>;
  onDelete: (id: number) => void;
};

function capacityText(p: Program): string {
  return p.capacity === null
    ? `신청 ${p.applicantCount}명 · 정원 제한 없음`
    : `신청 ${p.applicantCount}/${p.capacity}명`;
}

export default function ProgramManager({ programs, onAdd, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  // 복사 (v2.5): 고른 프로그램 값을 새 프로그램 칸에 채움. key를 바꿔서 폼을 새로 그림
  const [copySource, setCopySource] = useState<Program | null>(null);
  const [copyKey, setCopyKey] = useState(0);

  function startCopy(program: Program) {
    setCopySource(program);
    setCopyKey((k) => k + 1);
    setConfirmingId(null);
  }

  async function handleAdd(input: ProgramInput): Promise<boolean> {
    const ok = await onAdd(input);
    if (ok) setCopySource(null);
    return ok;
  }

  async function handleUpdate(id: number, input: ProgramInput): Promise<boolean> {
    const ok = await onUpdate(id, input);
    if (ok) setEditingId(null);
    return ok;
  }

  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-slate-800">
        프로그램 관리 ({programs.length}개)
      </summary>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3">
        {programs.length === 0 ? (
          <p className="text-sm text-slate-500">등록된 프로그램이 없습니다. 아래에서 추가해 주세요.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {programs.map((p) =>
              editingId === p.id ? (
                <li key={p.id} className="py-2">
                  <ProgramForm
                    initial={p}
                    submitLabel="저장"
                    onSubmit={(input) => handleUpdate(p.id, input)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatPeriod(p.startDate, p.endDate)} · {p.location ?? "장소 미정"} · {capacityText(p)} · 수료 기준{" "}
                      {p.completionRate}%
                    </p>
                  </div>
                  {confirmingId === p.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-red-700">{p.name} 프로그램을 삭제할까요?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingId(null);
                          onDelete(p.id);
                        }}
                        className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white"
                      >
                        삭제 확인
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm"
                      >
                        아니요
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label={`${p.name} 복사`}
                        onClick={() => startCopy(p)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm"
                      >
                        복사
                      </button>
                      <button
                        type="button"
                        aria-label={`${p.name} 수정`}
                        onClick={() => {
                          setConfirmingId(null);
                          setEditingId(p.id);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        aria-label={`${p.name} 삭제`}
                        disabled={p.applicantCount > 0}
                        title={p.applicantCount > 0 ? "신청자가 있는 프로그램은 삭제할 수 없습니다." : undefined}
                        onClick={() => setConfirmingId(p.id)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1 text-sm text-red-600 disabled:opacity-40"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-700">새 프로그램</p>
          {copySource && (
            <p role="status" className="mb-2 text-sm text-blue-700">
              {copySource.name}의 내용을 채웠습니다. 이름과 기간을 고친 뒤 추가하세요. (회차·신청자는 복사되지 않음)
            </p>
          )}
          <ProgramForm
            key={copyKey}
            template={copySource ? copyOf(copySource) : undefined}
            autoFocusName={copySource !== null}
            submitLabel="프로그램 추가"
            onSubmit={handleAdd}
          />
        </div>
      </div>
    </details>
  );
}
