// 화면 표시용 작은 함수들

// 010-1234-5678 → 010-****-5678 (옆 사람이 화면을 봐도 번호 전체가 보이지 않게)
export function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})-\d{4}-(\d{4})$/, "$1-****-$2");
}

// 입력 중인 연락처에 하이픈을 자동으로 넣음 (숫자만 남기고 최대 11자리)
// 예: "0101234" → "010-1234", "01012345678" → "010-1234-5678"
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// 2026-10-29T05:00:00Z → 2026.10.29 (한국 시간 기준)
export function formatDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")}`;
}
