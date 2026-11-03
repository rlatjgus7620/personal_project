"use client";
// 로그인한 뒤의 관리 화면 전체 (v2.0, v1.3까지는 app/page.tsx였음)
// 데이터 불러오기·저장(API 호출)은 이 컴포넌트만 하고, 아래 부품들은 화면만 그립니다.
// useState/useEffect(브라우저에서만 동작)와 클릭 이벤트를 쓰므로 "use client"가 필요합니다.

import { useCallback, useEffect, useMemo, useState } from "react";
import ApplicantFilter from "./ApplicantFilter";
import ApplicantForm from "./ApplicantForm";
import ApplicantList from "./ApplicantList";
import ApplicantSummary from "./ApplicantSummary";
import AttendanceBook from "./AttendanceBook";
import ExportButton from "./ExportButton";
import ProgramManager from "./ProgramManager";
import ProgramSummary from "./ProgramSummary";
import {
  ApiError,
  createApplicant,
  createProgram,
  createSession,
  deleteApplicant,
  deleteProgram,
  deleteSession,
  fetchApplicants,
  fetchAttendance,
  fetchPrograms,
  fetchSessions,
  setAttendance,
  updateApplicant,
  updateProgram,
} from "../lib/applicantApi";
import { applicantSessionStat, hasAttended } from "../lib/attendance";
import { filterApplicants, isFilterActive } from "../lib/filterApplicants";
import { withApplicantCounts } from "../lib/programs";
import {
  INITIAL_FILTER,
  type Applicant,
  type ApplicantChanges,
  type ApplicantFilterValue,
  type ApplicantInput,
  type AttendanceRecord,
  type Program,
  type ProgramInput,
  type Session,
  type SessionInput,
} from "../types/applicant";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

type Props = {
  onLogout: () => void; // 로그아웃 버튼
  onUnauthorized: (message: string) => void; // 서버가 401을 줌 → 로그인 화면으로
};

export default function AdminDashboard({ onLogout, onUnauthorized }: Props) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [programList, setProgramList] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]); // 회차 (v1.3)
  const [attendance, setAttendanceList] = useState<AttendanceRecord[]>([]); // 출석 기록 (v1.3)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicantFilterValue>(INITIAL_FILTER);
  // 서버 처리 중인 신청자 id 모음 (그 줄의 버튼을 잠가서 두 번 눌리지 않게)
  const [busyIds, setBusyIds] = useState<ReadonlySet<number>>(new Set());

  // 에러 처리: 로그인이 풀렸으면(401) 로그인 화면으로, 아니면 빨간 알림
  function showError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      onUnauthorized(e.message);
      return;
    }
    setError(errorText(e));
  }

  // 처음 화면이 열릴 때 프로그램·명단·회차·출석 기록을 함께 불러옴
  useEffect(() => {
    Promise.all([fetchPrograms(), fetchApplicants(), fetchSessions(), fetchAttendance()])
      .then(([programs, list, sessionList, records]) => {
        setProgramList(programs);
        setApplicants(list);
        setSessions(sessionList);
        setAttendanceList(records);
      })
      .catch((e: unknown) => showError(e))
      .finally(() => setLoading(false));
  }, []);

  // 프로그램별 신청자 수는 지금 명단으로 다시 계산 (신청·삭제 직후에도 바로 맞게)
  const programs = useMemo(() => withApplicantCounts(programList, applicants), [programList, applicants]);
  // "참석했는지": 회차가 있는 프로그램은 1회 이상 출석, 없으면 참석 체크 (v1.3)
  const isAttended = useCallback(
    (a: Applicant) => hasAttended(a, sessions, attendance),
    [sessions, attendance],
  );
  const sessionStatOf = useCallback(
    (a: Applicant) => applicantSessionStat(a, sessions, attendance),
    [sessions, attendance],
  );
  // 화면에 보여줄 목록은 필터로 "계산"만 함 (따로 state에 저장하지 않음)
  const visible = useMemo(
    () => filterApplicants(applicants, filter, isAttended),
    [applicants, filter, isAttended],
  );

  // ---------- 신청자 ----------

  // 서버 응답으로 받은 한 명을 목록에서 바꿔 끼움
  function replace(updated: Applicant) {
    setApplicants((list) => list.map((a) => (a.id === updated.id ? updated : a)));
  }

  async function handleAdd(input: ApplicantInput): Promise<boolean> {
    setError(null);
    try {
      const created = await createApplicant(input);
      setApplicants((list) => [created, ...list]); // 최신순이므로 맨 위에
      return true;
    } catch (e) {
      showError(e);
      return false;
    }
  }

  // id를 "처리 중"으로 표시하고 작업을 실행한 뒤 표시를 지움. 성공하면 true
  async function runBusy(id: number, task: () => Promise<void>): Promise<boolean> {
    setError(null);
    setBusyIds((ids) => new Set(ids).add(id));
    try {
      await task();
      return true;
    } catch (e) {
      showError(e);
      return false;
    } finally {
      setBusyIds((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleToggle(id: number) {
    const target = applicants.find((a) => a.id === id);
    if (!target || busyIds.has(id)) return;
    await runBusy(id, async () => {
      replace(await updateApplicant(id, { attended: !target.attended }));
    });
  }

  function handleEdit(id: number, changes: ApplicantChanges): Promise<boolean> {
    return runBusy(id, async () => {
      replace(await updateApplicant(id, changes));
    });
  }

  async function handleDelete(id: number) {
    await runBusy(id, async () => {
      await deleteApplicant(id);
      setApplicants((list) => list.filter((a) => a.id !== id));
      setAttendanceList((list) => list.filter((r) => r.applicantId !== id)); // 서버도 함께 지움
    });
  }

  // ---------- 프로그램 (v1.2) ----------

  async function handleAddProgram(input: ProgramInput): Promise<boolean> {
    setError(null);
    try {
      const created = await createProgram(input);
      setProgramList((list) => [...list, created]); // 만든 순서이므로 맨 뒤에
      return true;
    } catch (e) {
      showError(e);
      return false;
    }
  }

  async function handleUpdateProgram(id: number, input: ProgramInput): Promise<boolean> {
    setError(null);
    try {
      const updated = await updateProgram(id, input);
      setProgramList((list) => list.map((p) => (p.id === id ? updated : p)));
      return true;
    } catch (e) {
      showError(e);
      return false;
    }
  }

  async function handleDeleteProgram(id: number) {
    setError(null);
    try {
      await deleteProgram(id);
      setProgramList((list) => list.filter((p) => p.id !== id));
      setSessions((list) => list.filter((s) => s.programId !== id)); // 서버도 회차를 함께 지움
      // 지운 프로그램을 필터로 고르고 있었으면 "전체 프로그램"으로
      setFilter((f) => (f.program === id ? { ...f, program: "all" } : f));
    } catch (e) {
      showError(e);
    }
  }

  // ---------- 회차·출석 (v1.3) ----------

  async function handleAddSession(programId: number, input: SessionInput): Promise<boolean> {
    setError(null);
    try {
      const created = await createSession(programId, input);
      setSessions((list) => [...list, created]); // 날짜순 정렬은 출석부가 함
      return true;
    } catch (e) {
      showError(e);
      return false;
    }
  }

  async function handleDeleteSession(sessionId: number) {
    setError(null);
    try {
      await deleteSession(sessionId);
      setSessions((list) => list.filter((s) => s.id !== sessionId));
      setAttendanceList((list) => list.filter((r) => r.sessionId !== sessionId));
    } catch (e) {
      showError(e);
    }
  }

  // 서버가 저장한 뒤에 화면의 출석 기록을 바꿈
  async function handleToggleAttendance(sessionId: number, applicantId: number, present: boolean) {
    setError(null);
    try {
      await setAttendance(sessionId, applicantId, present);
      setAttendanceList((list) => {
        const rest = list.filter((r) => !(r.sessionId === sessionId && r.applicantId === applicantId));
        return present ? [...rest, { sessionId, applicantId }] : rest;
      });
    } catch (e) {
      showError(e);
    }
  }

  const emptyMessage = isFilterActive(filter)
    ? "조건에 맞는 신청자가 없습니다"
    : "신청자가 없습니다";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">교육 프로그램 신청·참석 관리</h1>
          <p className="text-sm text-slate-500">신청자를 등록하고, 행사 당일 참석을 체크하세요.</p>
        </div>
        <div className="flex items-center gap-3">
          <ApplicantSummary applicants={applicants} isAttended={isAttended} />
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </header>

      {!loading && (
        <ProgramSummary programs={programs} applicants={applicants} sessions={sessions} attendance={attendance} />
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <ProgramManager
        programs={programs}
        onAdd={handleAddProgram}
        onUpdate={handleUpdateProgram}
        onDelete={handleDeleteProgram}
      />

      <AttendanceBook
        programs={programs}
        applicants={applicants}
        sessions={sessions}
        attendance={attendance}
        onAddSession={handleAddSession}
        onDeleteSession={handleDeleteSession}
        onToggle={handleToggleAttendance}
      />

      <ApplicantForm programs={programs} onAdd={handleAdd} />

      <section className="flex flex-col gap-3">
        <ApplicantFilter value={filter} programs={programs} onChange={setFilter} />
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-500">{visible.length}명 표시 중</p>
          <ExportButton applicants={visible} programs={programs} sessions={sessions} attendance={attendance} />
        </div>
        {loading ? (
          <p className="py-10 text-center text-slate-500">불러오는 중...</p>
        ) : (
          <ApplicantList
            applicants={visible}
            programs={programs}
            emptyMessage={emptyMessage}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={handleEdit}
            busyIds={busyIds}
            sessionStatOf={sessionStatOf}
          />
        )}
      </section>
    </main>
  );
}
