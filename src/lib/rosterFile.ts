// 명단 파일 읽기 (v2.8): 엑셀(.xlsx)이나 CSV 파일에서 이름·연락처를 꺼내
// "이름<탭>연락처" 줄들로 바꿉니다. 그 뒤 검사는 붙여넣기와 같은 parseRoster()가 합니다.
//
// .xlsx 파일은 사실 zip 압축 파일이고, 안에 시트 내용이 XML 글로 들어 있습니다.
// 라이브러리 없이 브라우저 기본 기능(DecompressionStream)으로 압축을 풀어 읽습니다.

export const ROSTER_FILE_MAX_BYTES = 5 * 1024 * 1024; // 5MB

export const FILE_MESSAGES = {
  wrongType: "엑셀(.xlsx)이나 CSV 파일만 올릴 수 있습니다.",
  oldExcel:
    "옛 엑셀 형식(.xls)이거나 암호가 걸린 파일은 읽을 수 없습니다. 엑셀에서 '다른 이름으로 저장' → 'Excel 통합 문서(.xlsx)'로 저장해 주세요.",
  tooBig: "파일이 너무 큽니다. 5MB 이하 파일만 올릴 수 있습니다.",
  broken: "파일을 읽지 못했습니다. 엑셀(.xlsx)이나 CSV 파일이 맞는지 확인해 주세요.",
  empty: "파일에서 명단을 찾지 못했습니다. 첫 번째 시트에 이름·연락처가 있는지 확인해 주세요.",
} as const;

// 사용자에게 보여줄 문구를 담은 에러
export class RosterFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RosterFileError";
    Object.setPrototypeOf(this, RosterFileError.prototype); // 옛 JS로 바꿔도 instanceof가 맞게
  }
}

// 파일 고르기 창에서 받은 파일 (테스트에서는 같은 모양의 가짜 객체)
export type RosterFile = { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };

// ---------- zip 풀기 ----------

type ZipEntry = { method: number; start: number; size: number };

function u16(b: Uint8Array, at: number): number {
  return b[at] | (b[at + 1] << 8);
}
function u32(b: Uint8Array, at: number): number {
  return (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
}

// zip 맨 끝의 "목차"를 읽어 파일 이름 → 위치·크기
function zipEntries(b: Uint8Array): Map<string, ZipEntry> {
  // 목차 끝 표시(PK\x05\x06)를 뒤에서부터 찾음
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 0xffff); i--) {
    if (u32(b, i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new RosterFileError(FILE_MESSAGES.broken);
  const count = u16(b, end + 10);
  let at = u32(b, end + 16);
  const names = new TextDecoder();
  const entries = new Map<string, ZipEntry>();
  for (let n = 0; n < count; n++) {
    if (u32(b, at) !== 0x02014b50) throw new RosterFileError(FILE_MESSAGES.broken);
    const method = u16(b, at + 10);
    const size = u32(b, at + 20);
    const nameLen = u16(b, at + 28);
    const extraLen = u16(b, at + 30);
    const commentLen = u16(b, at + 32);
    const local = u32(b, at + 42);
    const name = names.decode(b.subarray(at + 46, at + 46 + nameLen));
    // 실제 내용은 각 파일 머리말 바로 뒤
    const start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    entries.set(name, { method, start, size });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// 압축(deflate)된 내용 풀기
async function inflateRaw(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer
    .write(data)
    .then(() => writer.close())
    .catch(() => undefined); // 실패는 아래 read()에서 알 수 있음
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

async function readZipText(
  b: Uint8Array<ArrayBuffer>,
  entries: Map<string, ZipEntry>,
  name: string,
): Promise<string | null> {
  const e = entries.get(name);
  if (!e) return null;
  const raw = b.subarray(e.start, e.start + e.size);
  let data: Uint8Array<ArrayBuffer>;
  if (e.method === 0) data = raw; // 압축 안 함
  else if (e.method === 8) data = await inflateRaw(raw);
  else throw new RosterFileError(FILE_MESSAGES.broken);
  return new TextDecoder().decode(data);
}

// ---------- 엑셀 XML 읽기 ----------

// XML 글자 되돌리기 (&amp; → &, _x000D_ → 줄바꿈 문자 등)
function unescapeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/_x([0-9a-fA-F]{4})_/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

// <t>글자</t> 들을 이어 붙임 (윗주 <rPh>는 뺌)
function textRuns(xml: string): string {
  const clean = xml.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, "");
  let out = "";
  for (const m of clean.matchAll(/<(?:\w+:)?t\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?t>)/g)) out += m[1] ?? "";
  return unescapeXml(out);
}

// 같은 글자를 한 곳에 모아 두는 표 (xl/sharedStrings.xml)
export function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((m) => textRuns(m[1]));
}

// "AB" → 27번째 칸(0부터 세면 27)
function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// 시트 XML → 줄마다 칸 글자 (빈 칸은 "")
export function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<(?:\w+:)?row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
    const row: string[] = [];
    const body = rowMatch[1] ?? "";
    for (const c of body.matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attrs = c[1];
      const inner = c[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+)\d+"/);
      const col = ref ? columnIndex(ref[1]) : row.length;
      const type = attrs.match(/\bt="([^"]*)"/)?.[1] ?? "n";
      const v = inner.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
      let text = "";
      if (type === "s") text = v === undefined ? "" : (shared[Number(v)] ?? "");
      else if (type === "inlineStr") text = textRuns(inner);
      else text = v === undefined ? "" : unescapeXml(v);
      while (row.length < col) row.push("");
      row[col] = text;
    }
    rows.push(row);
  }
  return rows;
}

// 첫 번째 시트 파일 경로 찾기 (보통 xl/worksheets/sheet1.xml)
async function firstSheetPath(b: Uint8Array<ArrayBuffer>, entries: Map<string, ZipEntry>): Promise<string> {
  const workbook = await readZipText(b, entries, "xl/workbook.xml");
  const rels = await readZipText(b, entries, "xl/_rels/workbook.xml.rels");
  const rid = workbook?.match(/<(?:\w+:)?sheet\b[^>]*?\br:id="([^"]+)"/)?.[1];
  if (rid && rels) {
    for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
      if (m[0].match(/\bId="([^"]+)"/)?.[1] !== rid) continue;
      const target = m[0].match(/\bTarget="([^"]+)"/)?.[1];
      if (target) return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    }
  }
  const sheets = [...entries.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  if (sheets.length === 0) throw new RosterFileError(FILE_MESSAGES.broken);
  return sheets[0];
}

// .xlsx 내용 → 첫 번째 시트의 줄·칸
export async function readXlsxRows(b: Uint8Array<ArrayBuffer>): Promise<string[][]> {
  const entries = zipEntries(b);
  const sheetXml = await readZipText(b, entries, await firstSheetPath(b, entries));
  if (sheetXml === null) throw new RosterFileError(FILE_MESSAGES.broken);
  const sharedXml = await readZipText(b, entries, "xl/sharedStrings.xml");
  return parseSheet(sheetXml, sharedXml ? parseSharedStrings(sharedXml) : []);
}

// ---------- CSV 읽기 ----------

// 글자 인코딩: UTF-8이 아니면 한국어 엑셀의 기본값(CP949/EUC-KR)으로 읽음
export function decodeText(b: Uint8Array<ArrayBuffer>): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(b);
  } catch {
    text = new TextDecoder("euc-kr").decode(b);
  }
  return text.replace(/^﻿/, "");
}

// CSV 글 → 줄·칸 (따옴표 안의 쉼표·줄바꿈, "" 는 따옴표 하나). 쉼표가 없고 탭이 있으면 탭으로 나눔
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = !firstLine.includes(",") && firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ---------- 줄·칸 → 붙여넣기 글 ----------

const NAME_HEADER = /이름|성명|^name$/i;
const PHONE_HEADER = /연락처|전화|휴대폰|핸드폰|^phone$/i;

// 엑셀이 숫자로 바꾸며 지운 앞자리 0 되살리기, 숫자만 있는 휴대폰 번호는 하이픈 넣기
// (1012345678 → 010-1234-5678, 01012345678 → 010-1234-5678). 그 밖의 값은 그대로 둬서 검사에서 걸리게 함
export function fixPhoneCell(value: string): string {
  let v = value.trim();
  if (/^1\d{9}$/.test(v)) v = `0${v}`;
  return /^01\d{9}$/.test(v) ? `${v.slice(0, 3)}-${v.slice(3, 7)}-${v.slice(7)}` : v;
}

// 머리글 줄에서 "이름"·"연락처" 칸을 찾으면 그 두 칸만, 없으면 앞의 두 칸을 씀
export function rowsToRosterText(rows: string[][]): string {
  let nameCol = 0;
  let phoneCol = 1;
  let startRow = 0;
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const cells = rows[r].map((c) => c.trim());
    const n = cells.findIndex((c) => NAME_HEADER.test(c));
    const p = cells.findIndex((c, i) => i !== n && PHONE_HEADER.test(c));
    if (n >= 0 && p >= 0) {
      nameCol = n;
      phoneCol = p;
      startRow = r + 1;
      break;
    }
  }
  const lines: string[] = [];
  for (const row of rows.slice(startRow)) {
    // 이름 안의 줄바꿈·탭·쉼표는 띄어쓰기로 (붙여넣기 칸에서 칸 나눔으로 오해하지 않게)
    const name = (row[nameCol] ?? "").replace(/[\s,]+/g, " ").trim();
    const phone = fixPhoneCell(row[phoneCol] ?? "");
    if (name === "" && phone === "") continue; // 빈 줄
    lines.push(`${name}\t${phone}`);
  }
  return lines.join("\n");
}

// ---------- 파일 하나 읽기 ----------

// 파일 → 붙여넣기 칸에 넣을 글과 줄 수. 문제가 있으면 RosterFileError(문구)
export async function readRosterFile(file: RosterFile): Promise<{ text: string; count: number }> {
  const ext = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (ext === "xls") throw new RosterFileError(FILE_MESSAGES.oldExcel);
  if (!["xlsx", "csv", "txt", "tsv"].includes(ext)) throw new RosterFileError(FILE_MESSAGES.wrongType);
  if (file.size > ROSTER_FILE_MAX_BYTES) throw new RosterFileError(FILE_MESSAGES.tooBig);

  const bytes = new Uint8Array(await file.arrayBuffer());
  let rows: string[][];
  if (ext === "xlsx") {
    // 옛 엑셀·암호 걸린 엑셀은 zip이 아니라 D0 CF 11 E0 으로 시작함
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
      throw new RosterFileError(FILE_MESSAGES.oldExcel);
    }
    try {
      rows = await readXlsxRows(bytes);
    } catch (e) {
      if (e instanceof RosterFileError) throw e;
      throw new RosterFileError(FILE_MESSAGES.broken);
    }
  } else {
    rows = parseCsv(decodeText(bytes));
  }

  const text = rowsToRosterText(rows);
  if (text === "") throw new RosterFileError(FILE_MESSAGES.empty);
  return { text, count: text.split("\n").length };
}
