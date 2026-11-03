// 브라우저에서 파일 내려받기 (서버를 거치지 않음). 명단 CSV와 출석표 CSV가 함께 씀
export function downloadText(fileName: string, content: string, type = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 내려받기가 시작된 뒤에 임시 주소를 지움 (바로 지우면 일부 브라우저에서 파일 이름이 사라짐)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
