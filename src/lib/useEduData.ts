"use client";
// 관리 화면의 데이터와 서버 저장을 맡는 훅 (v2.7, 원래 AdminDashboard 안에 있던 코드)
// - 처음 열릴 때 프로그램·명단·회차·출석 기록을 불러옴
// - 등록·수정·삭제·출석 체크를 서버에 저장하고, 성공하면 화면의 데이터를 바꿈
// - 401(로그인 만료)이면 onUnauthorized, 그 밖의 에러는 error 문구로
// AdminDashboard는 이 훅이 돌려준 값으로 화면만 그립니다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  createApplicant,
  createApplicantsBulk,
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
  updateSession,
} from "./applicantApi";
import { applicantSessionStat, hasAttended } from "./attendance";
import { withApplicantCounts } from "./programs";
import type {
  Applicant,
  ApplicantChanges,
  ApplicantInput,
  AttendanceRecord,
  BulkResult,
  BulkRow,
  Program,
  ProgramInput,
  Session,
  SessionInput,
} from "../types/applicant";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

export function useEduData(onUnauthorized: (message: string) => void) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [programList, setProgramList] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]); // 회차 (v1.3)
  const [attendance, setAttendanceList] = useState<AttendanceRecord[]>([]); // 출석 기록 (v1.3)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 서버 처리 중인 신청자 id 모음 (그 줄의 버튼을 잠가서 두 번 눌리지 않게)
  const [busyIds, setBusyIds] = useState<ReadonlySet<number>>(new Set());

  // 처음 불러오기 effect에서 쓰려고 최신 함수를 ref에 담아 둠 (effect를 한 번만 실행하기 위해)
  const unauthorizedRef = useRef(onUnauthorized);
  useEffect(() => {
    unauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  // 에러 처리: 로그인이 풀렸으면(401) 로그인 화면으로, 아니면 빨간 알림
  const showError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      unauthorizedRef.current(e.message);
      return;
    }
    setError(errorText(e));
  }, []);

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
  }, [showError]);

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

  // 서버에 보내는 작업 하나를 감싸는 도우미: 이전 알림을 지우고, 실패하면 알림. 성공하면 true
  async function attempt(task: () => Promise<void>): Promise<boolean> {
    setError(null);
    try {
      await task();
      return true;
    } catch (e) {
      showError(e);
      return false;
    }
  }

  // id를 "처리 중"으로 표시하고 작업을 실행한 뒤 표시를 지움. 성공하면 true
  async function runBusy(id: number, task: () => Promise<void>): Promise<boolean> {
    setBusyIds((ids) => new Set(ids).add(id));
    try {
      return await attempt(task);
    } finally {
      setBusyIds((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }
  }

  // 서버 응답으로 받은 한 명을 목록에서 바꿔 끼움
  function replace(updated: Applicant) {
    setApplicants((list) => list.map((a) => (a.id === updated.id ? updated : a)));
  }

  // ---------- 신청자 ----------

  function addApplicant(input: ApplicantInput): Promise<boolean> {
    return attempt(async () => {
      const created = await createApplicant(input);
      setApplicants((list) => [created, ...list]); // 최신순이므로 맨 위에
    });
  }

  // 명단 일괄 등록 (v2.5): 결과(성공·실패 목록)를 돌려줌. 요청 자체가 실패하면 null
  async function addApplicantsBulk(programId: number, items: BulkRow[]): Promise<BulkResult | null> {
    setError(null);
    try {
      const result = await createApplicantsBulk(programId, items);
      // 서버는 넣은 순서대로 돌려줌 → 최신순 목록이 되도록 뒤집어서 맨 위에
      setApplicants((list) => [...[...result.created].reverse(), ...list]);
      return result;
    } catch (e) {
      showError(e);
      return null;
    }
  }

  // 참석 체크를 정해진 값으로 (현장 체크인 v2.4). 이미 처리 중이면 false
  function setAttended(id: number, attended: boolean): Promise<boolean> {
    if (busyIds.has(id)) return Promise.resolve(false);
    return runBusy(id, async () => {
      replace(await updateApplicant(id, { attended }));
    });
  }

  // 명단의 참석 체크박스: 지금 값의 반대로
  async function toggleAttended(id: number): Promise<boolean> {
    const target = applicants.find((a) => a.id === id);
    if (!target) return false;
    return setAttended(id, !target.attended);
  }

  function editApplicant(id: number, changes: ApplicantChanges): Promise<boolean> {
    return runBusy(id, async () => {
      replace(await updateApplicant(id, changes));
    });
  }

  function removeApplicant(id: number): Promise<boolean> {
    return runBusy(id, async () => {
      await deleteApplicant(id);
      setApplicants((list) => list.filter((a) => a.id !== id));
      setAttendanceList((list) => list.filter((r) => r.applicantId !== id)); // 서버도 함께 지움
    });
  }

  // ---------- 프로그램 (v1.2) ----------

  function addProgram(input: ProgramInput): Promise<boolean> {
    return attempt(async () => {
      const created = await createProgram(input);
      setProgramList((list) => [...list, created]); // 만든 순서이므로 맨 뒤에
    });
  }

  function editProgram(id: number, input: ProgramInput): Promise<boolean> {
    return attempt(async () => {
      const updated = await updateProgram(id, input);
      setProgramList((list) => list.map((p) => (p.id === id ? updated : p)));
    });
  }

  // 지우면 true (화면이 필터를 되돌리는 데 씀)
  function removeProgram(id: number): Promise<boolean> {
    return attempt(async () => {
      await deleteProgram(id);
      setProgramList((list) => list.filter((p) => p.id !== id));
      setSessions((list) => list.filter((s) => s.programId !== id)); // 서버도 회차를 함께 지움
    });
  }

  // ---------- 회차·출석 (v1.3) ----------

  function addSession(programId: number, input: SessionInput): Promise<boolean> {
    return attempt(async () => {
      const created = await createSession(programId, input);
      setSessions((list) => [...list, created]); // 날짜순 정렬은 출석부가 함
    });
  }

  // 회차 날짜·메모 수정 (v2.1): 출석 기록은 그대로
  function editSession(sessionId: number, input: SessionInput): Promise<boolean> {
    return attempt(async () => {
      const updated = await updateSession(sessionId, input);
      setSessions((list) => list.map((s) => (s.id === sessionId ? updated : s)));
    });
  }

  function removeSession(sessionId: number): Promise<boolean> {
    return attempt(async () => {
      await deleteSession(sessionId);
      setSessions((list) => list.filter((s) => s.id !== sessionId));
      setAttendanceList((list) => list.filter((r) => r.sessionId !== sessionId));
    });
  }

  // 서버가 저장한 뒤에 화면의 출석 기록을 바꿈. 성공하면 true
  function markAttendance(sessionId: number, applicantId: number, present: boolean): Promise<boolean> {
    return attempt(async () => {
      await setAttendance(sessionId, applicantId, present);
      setAttendanceList((list) => {
        const rest = list.filter((r) => !(r.sessionId === sessionId && r.applicantId === applicantId));
        return present ? [...rest, { sessionId, applicantId }] : rest;
      });
    });
  }

  return {
    // 데이터
    applicants,
    programs,
    sessions,
    attendance,
    loading,
    error,
    busyIds,
    isAttended,
    sessionStatOf,
    // 신청자
    addApplicant,
    addApplicantsBulk,
    toggleAttended,
    setAttended,
    editApplicant,
    removeApplicant,
    // 프로그램
    addProgram,
    editProgram,
    removeProgram,
    // 회차·출석
    addSession,
    editSession,
    removeSession,
    markAttendance,
  };
}
