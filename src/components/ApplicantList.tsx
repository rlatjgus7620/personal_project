import type { Applicant, ApplicantChanges } from "../types/applicant";
import ApplicantItem from "./ApplicantItem";

type Props = {
  applicants: Applicant[];
  emptyMessage: string;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, changes: ApplicantChanges) => Promise<boolean>;
  busyIds?: ReadonlySet<number>; // 서버 처리 중인 신청자 id
};

export default function ApplicantList({
  applicants,
  emptyMessage,
  onToggle,
  onDelete,
  onEdit,
  busyIds,
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
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          busy={busyIds?.has(applicant.id) ?? false}
        />
      ))}
    </ul>
  );
}
