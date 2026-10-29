"use client";

import {
  PROGRAMS,
  type ApplicantFilterValue,
  type AttendanceFilter,
  type ProgramCode,
} from "../types/applicant";

type Props = {
  value: ApplicantFilterValue;
  onChange: (value: ApplicantFilterValue) => void;
};

// 버튼 문구와 값의 짝을 한곳에서 관리
const ATTENDANCE_OPTIONS: ReadonlyArray<{ value: AttendanceFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "attended", label: "참석" },
  { value: "absent", label: "미참석" },
];

export default function ApplicantFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex gap-1" role="group" aria-label="참석 여부 필터">
        {ATTENDANCE_OPTIONS.map((option) => {
          const selected = value.attendance === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ ...value, attendance: option.value })}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                selected ? "bg-slate-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-300"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <select
        aria-label="프로그램 필터"
        value={value.program}
        onChange={(e) => onChange({ ...value, program: e.target.value as ProgramCode | "all" })}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
      >
        <option value="all">전체 프로그램</option>
        {PROGRAMS.map((p) => (
          <option key={p.code} value={p.code}>
            {p.label}
          </option>
        ))}
      </select>
      <input
        type="search"
        aria-label="이름 검색"
        placeholder="이름으로 검색"
        value={value.keyword}
        onChange={(e) => onChange({ ...value, keyword: e.target.value })}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm sm:ml-auto"
      />
    </div>
  );
}
