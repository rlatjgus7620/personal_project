// 화면 표시용 작은 함수들

// 010-1234-5678 → 010-****-5678 (옆 사람이 화면을 봐도 번호 전체가 보이지 않게)
export function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})-\d{4}-(\d{4})$/, "$1-****-$2");
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
