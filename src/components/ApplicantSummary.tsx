import type { Applicant } from "../types/applicant";

type Props = {
  applicants: Applicant[];
  // "참석했는지" 판단 방법 (v1.3, 기본은 attended 값. 페이지는 회차 출석까지 반영해서 넘김)
  isAttended?: (a: Applicant) => boolean;
};

export default function ApplicantSummary({ applicants, isAttended = (a) => a.attended }: Props) {
  const attended = applicants.filter(isAttended).length;
  return (
    <p className="text-sm font-medium text-slate-600">
      전체 {applicants.length}명 · 참석 {attended}명
    </p>
  );
}
