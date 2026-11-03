// 로그인 토큰 보관 (v2.0)
// sessionStorage: 같은 탭에서는 새로고침해도 남고, 탭을 닫으면 지워짐 → 자동 로그아웃
// 브라우저 설정에 따라 저장소가 막혀 있으면 에러가 날 수 있어서 모두 try/catch로 감쌈

const TOKEN_KEY = "adminToken";

export function loadToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 저장이 안 돼도 이번 화면에서는 로그인 상태로 쓸 수 있음 (새로고침하면 다시 로그인)
  }
}

export function clearToken(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // 지울 수 없으면 그대로 둠
  }
}
