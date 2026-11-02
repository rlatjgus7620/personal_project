"use client";

import { useState, type FormEvent } from "react";
import type { Applicant, AttendanceRecord, Program, Session, SessionInput } from "../types/applicant";
import { applicantSessionStat, isPresent, sessionTitle, sessionsOf, shortDate } from "../lib/attendance";
import { maskPhone } from "../lib/format";
import { MESSAGES, NOTE_MAX_LENGTH } from "../lib/validation";

type Props = {
  programs: Program[];
  applicants: Applicant[]; // 전체 명단
  sessions: Session[]; // 전체 회차
  attendance: AttendanceRecord[]; // 전체 출석 기록
  onAddSession: (programId: number, input: SessionInput) => Promise<boolean>; // 성공하면 true
  onDeleteSession: (sessionId: number) => void;
  onToggle: (sessionId: number, applicantId: number, present: boolean) => void; // 체크 후 상태
};

export default function AttendanceBook({
  programs,
  applicants,
  sessions,
  attendance,
  onAddSession,
  onDeleteSession,
  onToggle,
}: Props) {
  const [pickedProgramId, setPickedProgramId] = useState<number | null>(null);
  // 회차는 날짜로 고름 (한 프로그램에 같은 날짜는 하나뿐이라서 새로 추가한 회차도 바로 고를 수 있음)
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [draft, setDraft] = useState({ date: "", note: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // 고른 프로그램이 지워졌거나 아직 안 골랐으면 첫 프로그램
  const program = programs.find((p) => p.id === pickedProgramId) ?? programs[0];

  function pickProgram(value: string) {
    setPickedProgramId(Number(value));
    setPickedDate(null);
    setMessage(null);
    setConfirmingDelete(false);
  }

  function pickSession(date: string) {
    setPickedDate(date);
    setConfirmingDelete(false);
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!program) return;
    if (draft.date === "") {
      setMessage(MESSAGES.sessionDateRequired);
      return;
    }
    setMessage(null);
    setSaving(true);
    const note = draft.note.trim();
    const ok = await onAddSession(program.id, { sessionDate: draft.date, note: note === "" ? null : note });
    setSaving(false);
    if (ok) {
      setPickedDate(draft.date); // 새 회차를 고름
      setDraft({ date: "", note: "" });
    }
  }

  const summary = (
    <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-slate-800">회차 출석부</summary>
  );

  if (!program) {
    return (
      <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {summary}
        <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          먼저 프로그램 관리에서 프로그램을 추가해 주세요.
        </p>
      </details>
    );
  }

  const list = sessionsOf(sessions, program.id);
  const index = Math.max(0, list.findIndex((s) => s.sessionDate === pickedDate));
  const current: Session | undefined = list[index];
  // 출석부는 이름순 (현장에서 이름으로 찾기 쉽게)
  const members = applicants
    .filter((a) => a.programId === program.id)
    .sort((a, b) => a.name.localeCompare(b.name, "ko") || a.id - b.id);
  const presentCount = current ? members.filter((a) => isPresent(attendance, current.id, a.id)).length : 0;

  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {summary}
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3">
        <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <span className="font-medium">프로그램</span>
          <select
            aria-label="출석부 프로그램"
            value={program.id}
            onChange={(e) => pickProgram(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {list.length === 0 ? (
          <p className="text-sm text-slate-500">
            회차를 추가하면 이 프로그램은 출석부에서 회차별로 출석을 체크합니다.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="회차">
            {list.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={i === index}
                onClick={() => pickSession(s.sessionDate)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  i === index
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {i + 1}회차 {shortDate(s.sessionDate)}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleAdd}
          noValidate
          className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
        >
          <input
            type="date"
            aria-label="회차 날짜"
            value={draft.date}
            onChange={(e) => {
              setDraft({ ...draft, date: e.target.value });
              setMessage(null);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
          <input
            aria-label="회차 메모"
            placeholder="메모 (예: OT)"
            value={draft.note}
            maxLength={NOTE_MAX_LENGTH}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            회차 추가
          </button>
          {message && (
            <p role="alert" className="text-sm text-red-600 sm:col-span-3">
              {message}
            </p>
          )}
        </form>

        {current && (
          <section aria-label="고른 회차" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">
                {sessionTitle(current, index + 1)} · 출석 {presentCount}/{members.length}명
              </h3>
              {confirmingDelete ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-red-700">
                    {index + 1}회차({current.sessionDate.replace(/-/g, ".")})를 삭제할까요? 출석 기록도 함께
                    지워집니다.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingDelete(false);
                      onDeleteSession(current.id);
                    }}
                    className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white"
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
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1 text-sm text-red-600"
                >
                  {index + 1}회차 삭제
                </button>
              )}
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-slate-500">이 프로그램 신청자가 없습니다</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
                {members.map((a) => {
                  const present = isPresent(attendance, current.id, a.id);
                  const stat = applicantSessionStat(a, sessions, attendance);
                  return (
                    <li
                      key={a.id}
                      className={`flex items-center gap-3 px-3 py-2 ${present ? "bg-emerald-50" : "bg-white"}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`${a.name} 출석`}
                        checked={present}
                        onChange={() => onToggle(current.id, a.id, !present)}
                        className="h-5 w-5 accent-emerald-600"
                      />
                      <span className="font-medium text-slate-900">{a.name}</span>
                      <span className="text-sm text-slate-500">{maskPhone(a.phone)}</span>
                      <span className="ml-auto text-sm text-slate-600">
                        누적 {stat?.attended ?? 0}/{stat?.total ?? list.length}회
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </details>
  );
}
