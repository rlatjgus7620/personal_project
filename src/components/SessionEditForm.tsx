"use client";
// 회차 날짜·메모 수정 칸 (v2.1, v2.7에 AttendanceBook에서 분리)

import { useState, type FormEvent } from "react";
import type { Session, SessionInput } from "../types/applicant";
import { MESSAGES, NOTE_MAX_LENGTH } from "../lib/validation";

type Props = {
  session: Session; // 고치는 회차 (처음 값)
  minDate?: string; // 프로그램 기간 (v2.3)
  maxDate?: string;
  onSave: (input: SessionInput) => Promise<boolean>; // 성공하면 true → 부모가 닫음
  onCancel: () => void;
};

export default function SessionEditForm({ session, minDate, maxDate, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState({ date: session.sessionDate, note: session.note ?? "" });
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.date === "") {
      setMessage(MESSAGES.sessionDateRequired);
      return;
    }
    const note = draft.note.trim();
    await onSave({ sessionDate: draft.date, note: note === "" ? null : note });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
    >
      <input
        type="date"
        aria-label="회차 날짜 수정"
        min={minDate}
        max={maxDate}
        value={draft.date}
        onChange={(e) => {
          setDraft({ ...draft, date: e.target.value });
          setMessage(null);
        }}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2"
      />
      <input
        aria-label="회차 메모 수정"
        placeholder="메모 (예: OT)"
        value={draft.note}
        maxLength={NOTE_MAX_LENGTH}
        onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2"
      />
      <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
        저장
      </button>
      <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-4 py-2">
        취소
      </button>
      {message && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-4">
          {message}
        </p>
      )}
    </form>
  );
}
