"use client";
// 로그인 문지기 (v2.0): 토큰이 없으면 로그인 화면, 있으면 관리 화면을 보여줍니다.
// sessionStorage(브라우저 저장소)를 읽어야 해서 "use client"가 필요합니다.

import { useEffect, useState } from "react";
import AdminDashboard from "@/components/AdminDashboard";
import LoginForm from "@/components/LoginForm";
import { ApiError, CONNECTION_ERROR_MESSAGE, login, setAuthToken } from "@/lib/applicantApi";
import { clearToken, loadToken, saveToken } from "@/lib/authStorage";

type AuthState = "checking" | "loggedOut" | "loggedIn";

export default function Home() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [notice, setNotice] = useState<string | null>(null);

  // 처음 열릴 때 같은 탭에 저장해 둔 토큰이 있으면 그대로 로그인 상태
  // (토큰이 만료됐으면 관리 화면이 데이터를 불러올 때 401을 받고 로그인 화면으로 돌아옴)
  useEffect(() => {
    const saved = loadToken();
    setAuthToken(saved);
    setAuth(saved ? "loggedIn" : "loggedOut");
  }, []);

  async function handleLogin(password: string): Promise<string | null> {
    try {
      const result = await login(password);
      saveToken(result.token);
      setAuthToken(result.token);
      setNotice(null);
      setAuth("loggedIn");
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : CONNECTION_ERROR_MESSAGE;
    }
  }

  function logOut(message: string | null) {
    clearToken();
    setAuthToken(null);
    setNotice(message);
    setAuth("loggedOut");
  }

  if (auth === "checking") return null; // 저장소를 읽는 아주 짧은 순간
  if (auth === "loggedOut") return <LoginForm onLogin={handleLogin} notice={notice} />;
  return <AdminDashboard onLogout={() => logOut(null)} onUnauthorized={(message) => logOut(message)} />;
}
