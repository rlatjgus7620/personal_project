"use client";

import { useState, type FormEvent } from "react";
import type { Applicant, AttendanceRecord, Program, Session, SessionInput } from "../types/applicant";
import {
  applicantSessionStat,
  isCompleted,
  isPresent,
  sessionTitle,
  sessionsOf,
  shortDate,
} from "../lib/attendance";
import { buildAttendanceSheet, sheetFileName, sheetToCsv, sheetToHtml } from "../lib/attendanceSheet";
import { downloadText } from "../lib/download";
import { formatDate, maskPhone } from "../lib/format";
import { MESSAGES, NOTE_MAX_LENGTH } from "../lib/validation";

type Props = {
  programs: Program[];
  applicants: Applicant[]; // 전체 명단
  sessions: Session[]; // 전체 회차
  attendance: AttendanceRecord[]; // 전체 출석 기록
  onAddSession: (programId: number, input: SessionInput) => Promise<boolean>; // 성공하면 true
  onUpdateSession: (sessionId: number, input: SessionInput) => Promise<boolean>; // v2.1, 성공하면 true
  onDeleteSession: (sessionId: number) => void;
  onToggle: (sessionId: number, applicantId: number, present: boolean) => void; // 체크 후 상태
};

export default function AttendanceBook({
  programs,
  applicants,
  sessions,
  attendance,
  onAddSession,
  onUpdateSession,
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
  // 회차 수정 (v2.1)
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({ date: "", note: "" });
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [sheetMessage, setSheetMessage] = useState<string | null>(null);

  // 고른 프로그램이 지워졌거나 아직 안 골랐으면 첫 프로그램
  const program = programs.find((p) => p.id === pickedProgramId) ?? programs[0];

  function pickProgram(value: string) {
    setPickedProgramId(Number(value));
    setPickedDate(null);
    setMessage(null);
    setConfirmingDelete(false);
    setEditing(false);
    setSheetMessage(null);
  }

  function pickSession(date: string) {
    setPickedDate(date);
    setConfirmingDelete(false);
    setEditing(false);
  }

  function startEdit(session: Session) {
    setEditDraft({ date: session.sessionDate, note: session.note ?? "" });
    setEditMessage(null);
    setConfirmingDelete(false);
    setEditing(true);
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>, session: Session) {
    event.preventDefault();
    if (editDraft.date === "") {
      setEditMessage(MESSAGES.sessionDateRequired);
      return;
    }
    const note = editDraft.note.trim();
    const ok = await onUpdateSession(session.id, { sessionDate: editDraft.date, note: note === "" ? null : note });
    if (ok) {
      setPickedDate(editDraft.date); // 날짜가 바뀌어도 같은 회차를 계속 보여줌
      setEditing(false);
    }
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
  // 회차가 없는 프로그램에서 이미 참석 체크한 사람 수 (회차를 추가하기 전에 알려 줌, v2.0.1)
  const checkedBeforeSessions = list.length === 0 ? members.filter((a) => a.attended).length : 0;
  const selected = program; // 아래 함수에서 쓰려고 (타입상 undefined가 아님을 고정)

  // 출석표 CSV·인쇄 (v2.2)
  function exportSheet() {
    const sheet = buildAttendanceSheet(selected, sessions, applicants, attendance);
    downloadText(sheetFileName(selected.name), sheetToCsv(sheet));
  }

  function printSheet() {
    const sheet = buildAttendanceSheet(selected, sessions, applicants, attendance, { maskPhones: true });
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setSheetMessage("팝업이 막혀 인쇄 창을 열 수 없습니다. 브라우저에서 팝업을 허용해 주세요.");
      return;
    }
    setSheetMessage(null);
    printWindow.document.write(sheetToHtml(sheet, formatDate(new Date().toISOString())));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

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
          <div className="flex flex-col gap-1">
            <p className="text-sm text-slate-500">
              회차를 추가하면 이 프로그램은 출석부에서 회차별로 출석을 체크합니다.
            </p>
            {checkedBeforeSessions > 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                참석 체크된 신청자가 {checkedBeforeSessions}명 있습니다. 회차를 추가하면 명단에는 회차별 출석
                횟수가 보이고, 기존 참석 체크는 출석 횟수에 들어가지 않습니다.
              </p>
            )}
          </div>
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(current)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm"
                  >
                    {index + 1}회차 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setConfirmingDelete(true);
                    }}
                    className="rounded-lg border border-red-200 bg-white px-3 py-1 text-sm text-red-600"
                  >
                    {index + 1}회차 삭제
                  </button>
                </div>
              )}
            </div>

            {editing && (
              <form
                onSubmit={(e) => handleEdit(e, current)}
                noValidate
                className="grid gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
              >
                <input
                  type="date"
                  aria-label="회차 날짜 수정"
                  value={editDraft.date}
                  onChange={(e) => {
                    setEditDraft({ ...editDraft, date: e.target.value });
                    setEditMessage(null);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
                <input
                  aria-label="회차 메모 수정"
                  placeholder="메모 (예: OT)"
                  value={editDraft.note}
                  maxLength={NOTE_MAX_LENGTH}
                  onChange={(e) => setEditDraft({ ...editDraft, note: e.target.value })}
                  className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2"
                >
                  취소
                </button>
                {editMessage && (
                  <p role="alert" className="text-sm text-red-600 sm:col-span-4">
                    {editMessage}
                  </p>
                )}
              </form>
            )}

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
                      className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 ${present ? "bg-emerald-50" : "bg-white"}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`${a.name} 출석`}
                        checked={present}
                        onChange={() => onToggle(current.id, a.id, !present)}
                        className="h-5 w-5 accent-emerald-600"
                      />
                      <span className="whitespace-nowrap font-medium text-slate-900">{a.name}</span>
                      <span className="whitespace-nowrap text-sm text-slate-500">{maskPhone(a.phone)}</span>
                      {stat !== null && isCompleted(stat, program.completionRate) && (
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                          수료
                        </span>
                      )}
                      <span className="ml-auto whitespace-nowrap text-sm text-slate-600">
                        누적 {stat?.attended ?? 0}/{stat?.total ?? list.length}회
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* 출석표 내보내기 (v2.2): 사람 × 회차 표 */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
              <span className="text-sm text-slate-500">출석표 (수료 기준 {program.completionRate}%)</span>
              <button
                type="button"
                onClick={exportSheet}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50"
              >
                출석표 CSV
              </button>
              <button
                type="button"
                onClick={printSheet}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50"
              >
                출석표 인쇄
              </button>
              {sheetMessage && (
                <p role="alert" className="w-full text-sm text-red-600">
                  {sheetMessage}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </details>
  );
}
