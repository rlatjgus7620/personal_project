"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import {
  PROGRAMS,
  programLabel,
  type Applicant,
  type ApplicantChanges,
} from "../types/applicant";
import { formatDate, maskPhone } from "../lib/format";
import { NAME_MAX_LENGTH, isProgramCode, validateApplicant } from "../lib/validation";

type Props = {
  applicant: Applicant;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, changes: ApplicantChanges) => void;
};

export default function ApplicantItem({ applicant, onToggle, onDelete, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", program: "" });
  const [message, setMessage] = useState<string | null>(null);

  function startEdit() {
    setDraft({ name: applicant.name, phone: applicant.phone, program: applicant.program });
    setMessage(null);
    setEditing(true);
  }

  function cancelEdit() {
    setMessage(null);
    setEditing(false);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateApplicant(draft);
    if (error !== null || !isProgramCode(draft.program)) {
      setMessage(error);
      return;
    }
    // 바뀐 항목만 모아서 보냄
    const changes: ApplicantChanges = {};
    const name = draft.name.trim();
    const phone = draft.phone.trim();
    if (name !== applicant.name) changes.name = name;
    if (phone !== applicant.phone) changes.phone = phone;
    if (draft.program !== applicant.program) changes.program = draft.program;
    if (Object.keys(changes).length > 0) onEdit(applicant.id, changes);
    setEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") cancelEdit();
  }

  const rowColor = applicant.attended
    ? "border-emerald-200 bg-emerald-50"
    : "border-slate-200 bg-white";

  if (editing) {
    return (
      <li className="rounded-xl border border-blue-300 bg-blue-50 p-3">
        <form
          onSubmit={handleSave}
          onKeyDown={handleKeyDown}
          noValidate
          className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-center"
        >
          <input
            aria-label="이름 수정"
            autoFocus
            value={draft.name}
            maxLength={NAME_MAX_LENGTH}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
          <input
            aria-label="연락처 수정"
            value={draft.phone}
            maxLength={13}
            inputMode="tel"
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
          <select
            aria-label="프로그램 수정"
            value={draft.program}
            onChange={(e) => setDraft({ ...draft, program: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {PROGRAMS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
            저장
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2"
          >
            취소
          </button>
          {message && (
            <p role="alert" className="text-sm text-red-600 sm:col-span-5">
              {message}
            </p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${rowColor}`}>
      <input
        type="checkbox"
        aria-label={`${applicant.name} 참석`}
        checked={applicant.attended}
        onChange={() => onToggle(applicant.id)}
        className="h-5 w-5 accent-emerald-600"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">
          {applicant.name}
          {applicant.attended && (
            <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
              참석 완료
            </span>
          )}
        </p>
        <p className="text-sm text-slate-600">
          <span>{programLabel(applicant.program)}</span>
          <span className="mx-1 text-slate-300">|</span>
          <span>{maskPhone(applicant.phone)}</span>
          <span className="mx-1 text-slate-300">|</span>
          <span>신청 {formatDate(applicant.createdAt)}</span>
        </p>
      </div>
      <button
        type="button"
        aria-label={`${applicant.name} 수정`}
        onClick={startEdit}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm"
      >
        수정
      </button>
      <button
        type="button"
        aria-label={`${applicant.name} 삭제`}
        onClick={() => onDelete(applicant.id)}
        className="rounded-lg border border-red-200 bg-white px-3 py-1 text-sm text-red-600"
      >
        삭제
      </button>
    </li>
  );
}
