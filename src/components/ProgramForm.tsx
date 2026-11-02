"use client";

import { useId, useState, type FormEvent } from "react";
import type { Program, ProgramInput } from "../types/applicant";
import { LOCATION_MAX_LENGTH, PROGRAM_NAME_MAX_LENGTH, validateProgram } from "../lib/validation";

type Props = {
  initial?: Program; // 수정할 때 기존 값
  submitLabel: string; // "프로그램 추가" 또는 "저장"
  onSubmit: (input: ProgramInput) => Promise<boolean>; // 성공하면 true
  onCancel?: () => void; // 있으면 취소 버튼을 보여줌
};

type Draft = { name: string; startDate: string; endDate: string; location: string; capacity: string };

function toDraft(program?: Program): Draft {
  const capacity = program?.capacity;
  return {
    name: program?.name ?? "",
    startDate: program?.startDate ?? "",
    endDate: program?.endDate ?? "",
    location: program?.location ?? "",
    capacity: capacity === null || capacity === undefined ? "" : String(capacity),
  };
}

// 입력칸 글자 → 서버로 보낼 값 (빈 칸은 null, 정원은 숫자)
function toInput(draft: Draft): ProgramInput {
  const capacity = draft.capacity.trim();
  return {
    name: draft.name.trim(),
    startDate: draft.startDate || null,
    endDate: draft.endDate || null,
    location: draft.location.trim() || null,
    capacity: capacity === "" ? null : Number(capacity),
  };
}

export default function ProgramForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const id = useId();

  function set(field: keyof Draft, value: string) {
    setDraft((d) => ({ ...d, [field]: value }));
    setMessage(null); // 고치기 시작하면 이전 문구를 지움
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = toInput(draft);
    const error = validateProgram(input);
    if (error !== null) {
      setMessage(error);
      return;
    }
    setMessage(null);
    setSaving(true);
    const ok = await onSubmit(input);
    setSaving(false);
    if (ok && !initial) setDraft(toDraft()); // 추가 폼만 비움 (수정 폼은 부모가 닫음)
  }

  const field = "flex flex-col gap-1 text-xs font-medium text-slate-600";
  const box = "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:items-end"
    >
      {/* 1줄: 이름·장소 / 2줄: 시작일·종료일·정원·버튼 */}
      <div className={`${field} col-span-2`}>
        <label htmlFor={`${id}-name`}>프로그램 이름</label>
        <input
          id={`${id}-name`}
          value={draft.name}
          maxLength={PROGRAM_NAME_MAX_LENGTH}
          onChange={(e) => set("name", e.target.value)}
          className={box}
        />
      </div>
      <div className={`${field} col-span-2`}>
        <label htmlFor={`${id}-location`}>장소</label>
        <input
          id={`${id}-location`}
          value={draft.location}
          maxLength={LOCATION_MAX_LENGTH}
          onChange={(e) => set("location", e.target.value)}
          className={box}
        />
      </div>
      <div className={field}>
        <label htmlFor={`${id}-start`}>시작일</label>
        <input
          id={`${id}-start`}
          type="date"
          value={draft.startDate}
          onChange={(e) => set("startDate", e.target.value)}
          className={box}
        />
      </div>
      <div className={field}>
        <label htmlFor={`${id}-end`}>종료일</label>
        <input
          id={`${id}-end`}
          type="date"
          value={draft.endDate}
          onChange={(e) => set("endDate", e.target.value)}
          className={box}
        />
      </div>
      <div className={field}>
        <label htmlFor={`${id}-capacity`}>정원</label>
        <input
          id={`${id}-capacity`}
          type="number"
          min={1}
          max={999}
          placeholder="제한 없음"
          value={draft.capacity}
          onChange={(e) => set("capacity", e.target.value)}
          className={box}
        />
      </div>
      <div className="col-span-2 flex gap-2 sm:col-span-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 sm:flex-none"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            취소
          </button>
        )}
      </div>
      {message && (
        <p role="alert" className="col-span-2 text-sm text-red-600 sm:col-span-4">
          {message}
        </p>
      )}
    </form>
  );
}
