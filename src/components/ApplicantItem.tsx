"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { Applicant, ApplicantChanges, Program, SessionStat } from "../types/applicant";
import { sessionStatLabel } from "../lib/attendance";
import { formatDate, formatPhoneInput, maskPhone } from "../lib/format";
import { NAME_MAX_LENGTH, toProgramId, validateApplicant } from "../lib/validation";
import { isFull, programName, programOptionLabel } from "../lib/programs";

type Props = {
  applicant: Applicant;
  programs: Program[]; // 프로그램 이름 표시와 수정용 선택지 (v1.2)
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  // 서버 저장에 성공하면 true → 그때만 수정 칸을 닫음
  onEdit: (id: number, changes: ApplicantChanges) => Promise<boolean>;
  // 서버 처리 중이면 true → 버튼을 잠가서 두 번 눌리지 않게
  busy?: boolean;
  // 회차가 있는 프로그램이면 출석 횟수 (v1.3). 있으면 체크박스 대신 "출석 2/3회"
  sessionStat?: SessionStat | null;
};

export default function ApplicantItem({
  applicant,
  programs,
  onToggle,
  onDelete,
  onEdit,
  busy = false,
  sessionStat = null,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", program: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft({ name: applicant.name, phone: applicant.phone, program: String(applicant.programId) });
    setMessage(null);
    setConfirmingDelete(false);
    setEditing(true);
  }

  function cancelEdit() {
    setMessage(null);
    setEditing(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateApplicant({ name: draft.name, phone: draft.phone, programId: draft.program });
    const programId = toProgramId(draft.program);
    if (error !== null || programId === null) {
      setMessage(error);
      return;
    }
    // 바뀐 항목만 모아서 보냄
    const changes: ApplicantChanges = {};
    const name = draft.name.trim();
    const phone = draft.phone.trim();
    if (name !== applicant.name) changes.name = name;
    if (phone !== applicant.phone) changes.phone = phone;
    if (programId !== applicant.programId) changes.programId = programId;
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onEdit(applicant.id, changes);
    setSaving(false);
    // 실패하면(예: 중복 연락처) 수정 칸과 입력한 값을 그대로 둠
    if (ok) setEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") cancelEdit();
  }

  // 초록 줄: 회차 없는 프로그램은 참석 체크, 회차 있는 프로그램은 1회 이상 출석
  const attended = sessionStat === null ? applicant.attended : sessionStat.attended > 0;
  const rowColor = attended
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
            onChange={(e) => setDraft({ ...draft, phone: formatPhoneInput(e.target.value) })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
          <select
            aria-label="프로그램 수정"
            value={draft.program}
            onChange={(e) => setDraft({ ...draft, program: e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {programs.map((p) => (
              // 마감된 다른 프로그램으로는 옮길 수 없음 (지금 프로그램은 그대로 선택 가능)
              <option key={p.id} value={p.id} disabled={p.id !== applicant.programId && isFull(p)}>
                {programOptionLabel(p)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
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
    <li className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${rowColor} ${busy ? "opacity-60" : ""}`}>
      {sessionStat === null ? (
        <input
          type="checkbox"
          aria-label={`${applicant.name} 참석`}
          checked={applicant.attended}
          disabled={busy}
          onChange={() => onToggle(applicant.id)}
          className="h-5 w-5 accent-emerald-600"
        />
      ) : (
        // 회차별 출석은 "회차 출석부"에서 체크
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            sessionStat.attended > 0 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {sessionStatLabel(sessionStat)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">
          {applicant.name}
          {sessionStat === null && applicant.attended && (
            <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
              참석 완료
            </span>
          )}
        </p>
        <p className="text-sm text-slate-600">
          <span>{programName(programs, applicant.programId)}</span>
          <span className="mx-1 text-slate-300">|</span>
          <span>{maskPhone(applicant.phone)}</span>
          <span className="mx-1 text-slate-300">|</span>
          <span>신청 {formatDate(applicant.createdAt)}</span>
        </p>
      </div>
      {confirmingDelete ? (
        // 삭제는 되돌릴 수 없으므로 한 번 더 확인
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <span className="text-sm text-red-700">{applicant.name} 님의 신청을 취소할까요?</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setConfirmingDelete(false);
              onDelete(applicant.id);
            }}
            className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            삭제 확인
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm"
          >
            아니요
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            aria-label={`${applicant.name} 수정`}
            disabled={busy}
            onClick={startEdit}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
          >
            수정
          </button>
          <button
            type="button"
            aria-label={`${applicant.name} 삭제`}
            disabled={busy}
            onClick={() => setConfirmingDelete(true)}
            className="rounded-lg border border-red-200 bg-white px-3 py-1 text-sm text-red-600 disabled:opacity-50"
          >
            삭제
          </button>
        </>
      )}
    </li>
  );
}
