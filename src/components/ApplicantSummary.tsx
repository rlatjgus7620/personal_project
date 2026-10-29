import type { Applicant } from "../types/applicant";

type Props = { applicants: Applicant[] };

export default function ApplicantSummary({ applicants }: Props) {
  const attended = applicants.filter((a) => a.attended).length;
  return (
    <p className="text-sm font-medium text-slate-600">
      전체 {applicants.length}명 · 참석 {attended}명
    </p>
  );
}
