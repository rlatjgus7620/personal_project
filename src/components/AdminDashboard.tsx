"use client";
// 로그인한 뒤의 관리 화면 전체 (v2.0, v1.3까지는 app/page.tsx였음)
// 데이터 불러오기·저장은 useEduData 훅이 맡고(v2.7), 이 컴포넌트는 화면 배치만 합니다.
// "관리 화면"과 "현장 체크인"(v2.4) 두 모드가 있습니다.

import { useMemo, useState } from "react";
import ApplicantFilter from "./ApplicantFilter";
import ApplicantForm from "./ApplicantForm";
import ApplicantList from "./ApplicantList";
import ApplicantSummary from "./ApplicantSummary";
import AttendanceBook from "./AttendanceBook";
import BulkImport from "./BulkImport";
import CheckInMode from "./CheckInMode";
import ExportButton from "./ExportButton";
import ProgramManager from "./ProgramManager";
import ProgramStats from "./ProgramStats";
import ProgramSummary from "./ProgramSummary";
import { filterApplicants, isFilterActive } from "../lib/filterApplicants";
import { useEduData } from "../lib/useEduData";
import { SLOW_SERVER_MESSAGE, useSlowNotice } from "../lib/useSlowNotice";
import { INITIAL_FILTER, type ApplicantFilterValue } from "../types/applicant";

type Props = {
  onLogout: () => void; // 로그아웃 버튼
  onUnauthorized: (message: string) => void; // 서버가 401을 줌 → 로그인 화면으로
};

type Mode = "manage" | "checkin";

export default function AdminDashboard({ onLogout, onUnauthorized }: Props) {
  const data = useEduData(onUnauthorized);
  const [mode, setMode] = useState<Mode>("manage");
  const [filter, setFilter] = useState<ApplicantFilterValue>(INITIAL_FILTER);
  const slowLoading = useSlowNotice(data.loading); // 3초 넘게 걸리면 "서버를 깨우는 중" 안내 (v2.0.1)

  // 화면에 보여줄 목록은 필터로 "계산"만 함 (따로 state에 저장하지 않음)
  const visible = useMemo(
    () => filterApplicants(data.applicants, filter, data.isAttended),
    [data.applicants, filter, data.isAttended],
  );

  async function handleDeleteProgram(id: number) {
    const ok = await data.removeProgram(id);
    // 지운 프로그램을 필터로 고르고 있었으면 "전체 프로그램"으로
    if (ok) setFilter((f) => (f.program === id ? { ...f, program: "all" } : f));
  }

  const emptyMessage = isFilterActive(filter) ? "조건에 맞는 신청자가 없습니다" : "신청자가 없습니다";

  const errorBox = data.error && (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {data.error}
    </p>
  );

  const loadingBox = (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-500">
      <p>불러오는 중...</p>
      {slowLoading && (
        <p role="status" className="text-sm">
          {SLOW_SERVER_MESSAGE}
        </p>
      )}
    </div>
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">에듀체크</h1>
          <p className="text-sm text-slate-500">교육 프로그램 신청·참석 관리 — 신청자를 등록하고, 당일 참석을 체크하세요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ApplicantSummary applicants={data.applicants} isAttended={data.isAttended} />
          {mode === "manage" && (
            <button
              type="button"
              onClick={() => setMode("checkin")}
              disabled={data.loading}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              현장 체크인
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </header>

      {mode === "checkin" ? (
        <>
          {errorBox}
          <CheckInMode
            programs={data.programs}
            applicants={data.applicants}
            sessions={data.sessions}
            attendance={data.attendance}
            onSetAttended={data.setAttended}
            onSetAttendance={data.markAttendance}
            onClose={() => setMode("manage")}
          />
        </>
      ) : (
        <>
          {!data.loading && (
            <ProgramSummary
              programs={data.programs}
              applicants={data.applicants}
              sessions={data.sessions}
              attendance={data.attendance}
            />
          )}

          {errorBox}

          <ProgramManager
            programs={data.programs}
            onAdd={data.addProgram}
            onUpdate={data.editProgram}
            onDelete={handleDeleteProgram}
          />

          <AttendanceBook
            programs={data.programs}
            applicants={data.applicants}
            sessions={data.sessions}
            attendance={data.attendance}
            onAddSession={data.addSession}
            onUpdateSession={data.editSession}
            onDeleteSession={data.removeSession}
            onToggle={data.markAttendance}
          />

          <ProgramStats
            programs={data.programs}
            applicants={data.applicants}
            sessions={data.sessions}
            attendance={data.attendance}
          />

          <ApplicantForm programs={data.programs} onAdd={data.addApplicant} />

          <BulkImport programs={data.programs} applicants={data.applicants} onBulkAdd={data.addApplicantsBulk} />

          <section className="flex flex-col gap-3">
            <ApplicantFilter value={filter} programs={data.programs} onChange={setFilter} />
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-500">{visible.length}명 표시 중</p>
              <ExportButton
                applicants={visible}
                programs={data.programs}
                sessions={data.sessions}
                attendance={data.attendance}
              />
            </div>
            {data.loading ? (
              loadingBox
            ) : (
              <ApplicantList
                applicants={visible}
                programs={data.programs}
                emptyMessage={emptyMessage}
                onToggle={data.toggleAttended}
                onDelete={data.removeApplicant}
                onEdit={data.editApplicant}
                busyIds={data.busyIds}
                sessionStatOf={data.sessionStatOf}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}
