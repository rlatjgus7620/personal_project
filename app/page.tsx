"use client";
// 이 페이지는 useState/useEffect(브라우저에서만 동작)와 클릭 이벤트를 쓰므로 "use client"가 필요합니다.

import { useEffect, useMemo, useState } from "react";
import ApplicantFilter from "@/components/ApplicantFilter";
import ApplicantForm from "@/components/ApplicantForm";
import ApplicantList from "@/components/ApplicantList";
import ApplicantSummary from "@/components/ApplicantSummary";
import {
  createApplicant,
  deleteApplicant,
  fetchApplicants,
  updateApplicant,
} from "@/lib/applicantApi";
import { filterApplicants, isFilterActive } from "@/lib/filterApplicants";
import {
  INITIAL_FILTER,
  type Applicant,
  type ApplicantChanges,
  type ApplicantFilterValue,
  type ApplicantInput,
} from "@/types/applicant";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

export default function ApplicantPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicantFilterValue>(INITIAL_FILTER);

  // 처음 화면이 열릴 때 서버에서 명단을 불러옴
  useEffect(() => {
    fetchApplicants()
      .then(setApplicants)
      .catch((e: unknown) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, []);

  // 화면에 보여줄 목록은 필터로 "계산"만 함 (따로 state에 저장하지 않음)
  const visible = useMemo(() => filterApplicants(applicants, filter), [applicants, filter]);

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
      setError(errorText(e));
      return false;
    }
  }

  async function handleToggle(id: number) {
    const target = applicants.find((a) => a.id === id);
    if (!target) return;
    setError(null);
    try {
      replace(await updateApplicant(id, { attended: !target.attended }));
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function handleEdit(id: number, changes: ApplicantChanges) {
    setError(null);
    try {
      replace(await updateApplicant(id, changes));
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteApplicant(id);
      setApplicants((list) => list.filter((a) => a.id !== id));
    } catch (e) {
      setError(errorText(e));
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
        <ApplicantSummary applicants={applicants} />
      </header>

      <ApplicantForm onAdd={handleAdd} />

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <ApplicantFilter value={filter} onChange={setFilter} />
        {loading ? (
          <p className="py-10 text-center text-slate-500">불러오는 중...</p>
        ) : (
          <ApplicantList
            applicants={visible}
            emptyMessage={emptyMessage}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
      </section>
    </main>
  );
}
