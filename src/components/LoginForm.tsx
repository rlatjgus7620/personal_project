"use client";

import { useState, type FormEvent } from "react";
import { MESSAGES } from "../lib/validation";

type Props = {
  // 성공하면 null, 실패하면 보여줄 문구
  onLogin: (password: string) => Promise<string | null>;
  // 로그인 화면 위에 보여줄 안내 (예: 로그인 만료)
  notice?: string | null;
};

export default function LoginForm({ onLogin, notice = null }: Props) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password === "") {
      setMessage(MESSAGES.passwordRequired);
      return;
    }
    setMessage(null);
    setSending(true);
    const error = await onLogin(password);
    setSending(false);
    if (error !== null) {
      setMessage(error);
      setPassword(""); // 틀린 비밀번호는 지우고 다시 입력
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">관리자 로그인</h1>
        <p className="text-sm text-slate-500">교육 프로그램 신청·참석 관리</p>
      </div>
      {notice && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          관리자 비밀번호
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setMessage(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        {message && (
          <p role="alert" className="text-sm text-red-600">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          로그인
        </button>
      </form>
    </main>
  );
}
