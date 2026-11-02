// FastAPI 서버를 부르는 함수 모음. 화면은 fetch를 직접 쓰지 않고 이 함수들만 씁니다.

import type {
  Applicant,
  ApplicantChanges,
  ApplicantInput,
  AttendanceRecord,
  Program,
  ProgramInput,
  Session,
  SessionInput,
} from "../types/applicant";

export const CONNECTION_ERROR_MESSAGE =
  "서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주세요.";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

type ErrorBody = { error?: { code?: string; message?: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, init);
  } catch {
    // 서버가 꺼져 있거나 주소가 틀려서 아예 연결이 안 됨
    throw new Error(CONNECTION_ERROR_MESSAGE);
  }
  if (!response.ok) {
    let message = `요청에 실패했습니다. (${response.status})`;
    try {
      const body = (await response.json()) as ErrorBody;
      if (body.error?.message) message = body.error.message;
    } catch {
      // 본문이 JSON이 아니면 기본 문구 사용
    }
    throw new Error(message);
  }
  // 204(본문 없음)는 JSON을 읽지 않음
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export function fetchApplicants(): Promise<Applicant[]> {
  return request<Applicant[]>("/api/applicants");
}

export function createApplicant(input: ApplicantInput): Promise<Applicant> {
  return request<Applicant>("/api/applicants", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function updateApplicant(id: number, changes: ApplicantChanges): Promise<Applicant> {
  return request<Applicant>(`/api/applicants/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(changes),
  });
}

export function deleteApplicant(id: number): Promise<void> {
  return request<void>(`/api/applicants/${id}`, { method: "DELETE" });
}

// ---------- 프로그램 (v1.2) ----------

export function fetchPrograms(): Promise<Program[]> {
  return request<Program[]>("/api/programs");
}

export function createProgram(input: ProgramInput): Promise<Program> {
  return request<Program>("/api/programs", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function updateProgram(id: number, input: Partial<ProgramInput>): Promise<Program> {
  return request<Program>(`/api/programs/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function deleteProgram(id: number): Promise<void> {
  return request<void>(`/api/programs/${id}`, { method: "DELETE" });
}

// ---------- 회차·출석 (v1.3) ----------

export function fetchSessions(): Promise<Session[]> {
  return request<Session[]>("/api/sessions");
}

export function createSession(programId: number, input: SessionInput): Promise<Session> {
  return request<Session>(`/api/programs/${programId}/sessions`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function deleteSession(id: number): Promise<void> {
  return request<void>(`/api/sessions/${id}`, { method: "DELETE" });
}

export function fetchAttendance(): Promise<AttendanceRecord[]> {
  return request<AttendanceRecord[]>("/api/attendance");
}

// 출석 체크는 PUT, 해제는 DELETE (여러 번 보내도 결과가 같음)
export function setAttendance(sessionId: number, applicantId: number, present: boolean): Promise<void> {
  return request<void>(`/api/sessions/${sessionId}/attendees/${applicantId}`, {
    method: present ? "PUT" : "DELETE",
  });
}
