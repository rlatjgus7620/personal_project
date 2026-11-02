import type { Applicant, ApplicantChanges, Program, SessionStat } from "../types/applicant";
import ApplicantItem from "./ApplicantItem";

type Props = {
  applicants: Applicant[];
  programs: Program[];
  emptyMessage: string;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, changes: ApplicantChanges) => Promise<boolean>;
  busyIds?: ReadonlySet<number>; // 서버 처리 중인 신청자 id
  sessionStatOf?: (a: Applicant) => SessionStat | null; // 회차 출석 횟수 (v1.3)
};

export default function ApplicantList({
  applicants,
  programs,
  emptyMessage,
  onToggle,
  onDelete,
  onEdit,
  busyIds,
  sessionStatOf,
}: Props) {
  if (applicants.length === 0) {
    return <p className="py-10 text-center text-slate-500">{emptyMessage}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {applicants.map((applicant) => (
        <ApplicantItem
          key={applicant.id}
          applicant={applicant}
          programs={programs}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          busy={busyIds?.has(applicant.id) ?? false}
          sessionStat={sessionStatOf?.(applicant) ?? null}
        />
      ))}
    </ul>
  );
}
