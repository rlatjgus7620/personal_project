"use client";
// 현장 체크인 모드 (v2.4): 행사 당일 태블릿에서 쓰는 큰 화면
// 이름이나 연락처 뒷자리로 찾아서 큰 버튼 한 번으로 출석 처리합니다.
// 회차가 있는 프로그램은 고른 회차에 출석, 없는 프로그램은 참석 체크(attended)를 바꿉니다.

import { useRef, useState } from "react";
import type { Applicant, AttendanceRecord, Program, Session } from "../types/applicant";
import {
  defaultCheckInProgramId,
  defaultSessionFor,
  isPresent,
  sessionTitle,
  sessionsOf,
} from "../lib/attendance";
import { matchesKeyword } from "../lib/filterApplicants";
import { maskPhone, todayInSeoul } from "../lib/format";

type Props = {
  programs: Program[];
  applicants: Applicant[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  // 회차 없는 프로그램: 참석 체크를 바꿈. 성공하면 true
  onSetAttended: (applicantId: number, attended: boolean) => Promise<boolean>;
  // 회차 있는 프로그램: 그 회차 출석을 바꿈. 성공하면 true
  onSetAttendance: (sessionId: number, applicantId: number, present: boolean) => Promise<boolean>;
  onClose: () => void; // 관리 화면으로
  today?: string; // 테스트에서 "오늘"을 정하려고 (기본: 한국 날짜)
};

export default function CheckInMode({
  programs,
  applicants,
  sessions,
  attendance,
  onSetAttended,
  onSetAttendance,
  onClose,
  today = todayInSeoul(),
}: Props) {
  const [programId, setProgramId] = useState<number | undefined>(() =>
    defaultCheckInProgramId(
      programs.map((p) => p.id),
      sessions,
      today,
    ),
  );
  const [pickedSessionId, setPickedSessionId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const program = programs.find((p) => p.id === programId) ?? programs[0];

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-bold text-slate-900">현장 체크인</h2>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
      >
        관리 화면으로
      </button>
    </div>
  );

  if (!program) {
    return (
      <section aria-label="현장 체크인" className="flex flex-col gap-4">
        {header}
        <p className="text-slate-500">먼저 프로그램 관리에서 프로그램을 추가해 주세요.</p>
      </section>
    );
  }

  const list = sessionsOf(sessions, program.id);
  const session = list.find((s) => s.id === pickedSessionId) ?? defaultSessionFor(list, today);
  const order = session ? list.findIndex((s) => s.id === session.id) + 1 : 0;
  // 회차가 있으면 그 회차 출석, 없으면 참석 체크
  const presentOf = (a: Applicant) => (session ? isPresent(attendance, session.id, a.id) : a.attended);
  const members = applicants
    .filter((a) => a.programId === program.id)
    .sort((a, b) => a.name.localeCompare(b.name, "ko") || a.id - b.id);
  const shown = members.filter((a) => matchesKeyword(a, keyword));
  const presentCount = members.filter(presentOf).length;

  function pickProgram(value: string) {
    setProgramId(Number(value));
    setPickedSessionId(null);
    setKeyword("");
    setNotice(null);
  }

  async function check(applicant: Applicant, present: boolean) {
    setBusyId(applicant.id);
    const ok = session
      ? await onSetAttendance(session.id, applicant.id, present)
      : await onSetAttended(applicant.id, present);
    setBusyId(null);
    if (!ok) return; // 실패 문구는 위쪽 빨간 알림에 나옴
    if (present) {
      setNotice(`${applicant.name} 님 출석 처리했습니다`);
      setKeyword(""); // 다음 사람을 바로 찾을 수 있게
    } else {
      setNotice(`${applicant.name} 님 출석을 취소했습니다`);
    }
    searchRef.current?.focus();
  }

  return (
    <section aria-label="현장 체크인" className="flex flex-col gap-4">
      {header}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          프로그램
          <select
            aria-label="체크인 프로그램"
            value={program.id}
            onChange={(e) => pickProgram(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {session && (
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            회차
            <select
              aria-label="체크인 회차"
              value={session.id}
              onChange={(e) => {
                setPickedSessionId(Number(e.target.value));
                setNotice(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal"
            >
              {list.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {sessionTitle(s, i + 1)}
                  {s.sessionDate === today ? " · 오늘" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="ml-auto text-2xl font-bold text-emerald-700" aria-live="polite">
          출석 {presentCount}/{members.length}명
        </p>
      </div>

      <p className="text-sm text-slate-500">
        {session ? `${sessionTitle(session, order)} 출석을 체크합니다.` : "이 프로그램은 회차가 없어 참석 여부를 체크합니다."}
      </p>

      <input
        ref={searchRef}
        type="search"
        autoFocus
        aria-label="이름 또는 연락처 뒷자리"
        placeholder="이름 또는 연락처 뒷자리 4개"
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value);
          setNotice(null);
        }}
        className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-xl"
      />

      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-lg font-semibold text-emerald-800">
          {notice}
        </p>
      )}

      {members.length === 0 ? (
        <p className="py-10 text-center text-slate-500">이 프로그램 신청자가 없습니다</p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-slate-500">찾는 신청자가 없습니다</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((a) => {
            const present = presentOf(a);
            return (
              <li
                key={a.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${
                  present ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-slate-900">{a.name}</p>
                  <p className="text-slate-500">{maskPhone(a.phone)}</p>
                </div>
                {present ? (
                  <button
                    type="button"
                    aria-label={`${a.name} 출석 취소`}
                    disabled={busyId === a.id}
                    onClick={() => check(a, false)}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-base text-slate-600 disabled:opacity-50"
                  >
                    출석 완료 · 취소
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`${a.name} 출석`}
                    disabled={busyId === a.id}
                    onClick={() => check(a, true)}
                    className="rounded-xl bg-emerald-600 px-8 py-3 text-lg font-bold text-white disabled:opacity-50"
                  >
                    출석
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
