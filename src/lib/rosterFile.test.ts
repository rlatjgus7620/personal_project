/**
 * @jest-environment node
 */
// 압축 풀기(DecompressionStream)와 글자 인코딩(TextDecoder)은 브라우저 기능이라
// 이 파일만 jsdom 대신 Node 환경에서 돌립니다 (Node에도 같은 기능이 있음).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DecompressionStream as NodeDecompressionStream } from "node:stream/web";
import {
  FILE_MESSAGES,
  ROSTER_FILE_MAX_BYTES,
  fixPhoneCell,
  parseCsv,
  parseSheet,
  readRosterFile,
  rowsToRosterText,
  type RosterFile,
} from "./rosterFile";

if (typeof globalThis.DecompressionStream === "undefined") {
  Object.assign(globalThis, { DecompressionStream: NodeDecompressionStream });
}

// 테스트용 가짜 파일 (브라우저의 File과 같은 모양)
function fakeFile(name: string, bytes: Uint8Array, size = bytes.length): RosterFile {
  return {
    name,
    size,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  };
}
function fixture(name: string): RosterFile {
  return fakeFile(name, new Uint8Array(readFileSync(join(__dirname, "__fixtures__", name))));
}

test("LOGIC-30 구글폼 엑셀: 머리글에서 이름·전화번호 열을 찾고, 숫자로 바뀐 연락처의 앞자리 0을 되살려 하이픈을 넣는다 (v2.8)", async () => {
  // 타임스탬프 | 이름 | 전화번호 | 메모, 빈 줄 하나, 두 번째 시트는 읽지 않음
  const result = await readRosterFile(fixture("roster-form.xlsx"));
  expect(result).toEqual({
    text: "김예시\t010-0000-0001\n이샘플\t010-0000-0002\n박데모\t010-0000-0003",
    count: 3,
  });
});

test("LOGIC-31 엑셀이 저장한 모양(압축·공유 글자표·첫 시트가 sheet2.xml)도 읽는다 (v2.8)", async () => {
  // 성명 | 휴대폰 머리글, 서식이 나뉜 글자(김+예시), 윗주, 빈 칸 건너뜀
  expect((await readRosterFile(fixture("roster-excel.xlsx"))).text).toBe("김예시\t010-0000-0001\n이샘플\t010-0000-0002");
  // 압축 안 한 zip, 머리글 없음 → 앞의 두 칸
  expect((await readRosterFile(fixture("roster-plain.xlsx"))).text).toBe("정테스트\t010-0000-0005\n한예제\t010-0000-0006");
});

test("LOGIC-32 한국어 엑셀이 저장한 CSV(CP949)와 따옴표 칸을 읽는다 (v2.8)", async () => {
  const result = await readRosterFile(fixture("roster-cp949.csv"));
  // 이름 안 쉼표는 띄어쓰기로 바꿈 (붙여넣기 칸에서 쉼표는 칸 나눔이라)
  expect(result.text).toBe("오샘플\t010-0000-0011\n윤 데모\t010-0000-0012");
  // UTF-8(BOM), 따옴표 안 줄바꿈·"" , 탭으로 나눈 글
  expect(parseCsv('﻿이름,연락처\n"한\n예제","010-0000-0006"""')).toEqual([
    ["﻿이름", "연락처"],
    ["한\n예제", '010-0000-0006"'],
  ]);
  expect(parseCsv("김예시\t010-0000-0001\r\n")).toEqual([["김예시", "010-0000-0001"]]);
});

test("LOGIC-33 올릴 수 없는 파일은 이유를 알려 준다 (v2.8)", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  await expect(readRosterFile(fakeFile("명단.pdf", bytes))).rejects.toThrow(FILE_MESSAGES.wrongType);
  await expect(readRosterFile(fakeFile("명단.xls", bytes))).rejects.toThrow(FILE_MESSAGES.oldExcel);
  // 이름은 .xlsx지만 속은 옛 엑셀(암호 걸린 파일도 같은 모양)
  const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  await expect(readRosterFile(fakeFile("명단.xlsx", ole))).rejects.toThrow(FILE_MESSAGES.oldExcel);
  await expect(readRosterFile(fakeFile("명단.xlsx", bytes))).rejects.toThrow(FILE_MESSAGES.broken);
  await expect(readRosterFile(fakeFile("명단.csv", bytes, ROSTER_FILE_MAX_BYTES + 1))).rejects.toThrow(
    FILE_MESSAGES.tooBig,
  );
  await expect(readRosterFile(fakeFile("명단.csv", new TextEncoder().encode("이름,연락처\n,\n")))).rejects.toThrow(
    FILE_MESSAGES.empty,
  );
});

test("LOGIC-34 줄·칸 → 붙여넣기 글: 머리글 찾기, 빈 줄 건너뛰기, 앞자리 0·하이픈 (v2.8)", () => {
  expect(fixPhoneCell(" 1000000001 ")).toBe("010-0000-0001");
  expect(fixPhoneCell("01000000002")).toBe("010-0000-0002");
  expect(fixPhoneCell("010-0000-0001")).toBe("010-0000-0001");
  expect(fixPhoneCell("212345678")).toBe("212345678"); // 휴대폰이 아니면 그대로 (형식 검사에서 걸림)
  // 위에 제목 줄이 있어도 머리글을 찾음. 이름 안의 줄바꿈은 띄어쓰기로
  const rows = [["2026 모의면접 신청 명단"], [], ["번호", "연락처", "이름"], ["1", "1000000001", "김\n예시"], ["2", "", ""]];
  expect(rowsToRosterText(rows)).toBe("김 예시\t010-0000-0001");
  // XML 특수 글자, 칸 건너뛰기(B칸만 있는 줄)
  const xml =
    '<worksheet><sheetData><row r="1"><c r="B1" t="inlineStr"><is><t>A&amp;B &lt;반&gt;</t></is></c></row></sheetData></worksheet>';
  expect(parseSheet(xml, [])).toEqual([["", "A&B <반>"]]);
});
