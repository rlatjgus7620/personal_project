"use client";

import { useId, useState, type FormEvent } from "react";
import { PROGRAMS, type ApplicantInput } from "../types/applicant";
import { NAME_MAX_LENGTH, isProgramCode, validateApplicant } from "../lib/validation";

type Props = {
  // 서버 저장에 성공하면 true를 돌려줌 → 그때만 입력칸을 비움
  onAdd: (input: ApplicantInput) => Promise<boolean>;
};

export default function ApplicantForm({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [program, setProgram] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const id = useId(); // label과 입력칸을 짝지을 고유 id

  // 버튼 클릭과 Enter 모두 form의 onSubmit 하나로 처리
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateApplicant({ name, phone, program });
    if (error !== null || !isProgramCode(program)) {
      setMessage(error);
      return;
    }
    setMessage(null);
    setSubmitting(true);
    const ok = await onAdd({ name: name.trim(), phone: phone.trim(), program });
    setSubmitting(false);
    if (ok) {
      setName("");
      setPhone("");
      setProgram("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
    >
      <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        <label htmlFor={`${id}-name`}>이름</label>
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
          className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
        />
      </div>
      <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        <label htmlFor={`${id}-phone`}>연락처</label>
        <input
          id={`${id}-phone`}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          maxLength={13}
          inputMode="tel"
          className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
        />
      </div>
      <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        <label htmlFor={`${id}-program`}>프로그램</label>
        <select
          id={`${id}-program`}
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
        >
          <option value="">선택하세요</option>
          {PROGRAMS.map((p) => (
            <option key={p.code} value={p.code}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        등록
      </button>
      {message && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-4">
          {message}
        </p>
      )}
    </form>
  );
}
