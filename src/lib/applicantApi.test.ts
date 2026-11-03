import {
  ApiError,
  CONNECTION_ERROR_MESSAGE,
  createApplicant,
  createProgram,
  createSession,
  deleteApplicant,
  deleteProgram,
  deleteSession,
  updateSession,
  fetchApplicants,
  fetchAttendance,
  fetchPrograms,
  fetchSessions,
  login,
  setAttendance,
  setAuthToken,
  updateApplicant,
  updateProgram,
} from "./applicantApi";
import { makeProgram } from "../test-utils/makeProgram";
import { makeApplicant } from "../test-utils/makeApplicant";

const API = "http://test-api";

// 진짜 서버 대신 가짜 fetch를 끼움
function mockFetch(status: number, body?: unknown) {
  const fn = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = API;
  setAuthToken(null); // 테스트끼리 토큰이 섞이지 않게
});

test("CLIENT-01 fetchApplicants는 GET으로 명단을 받아온다", async () => {
  const list = [makeApplicant()];
  const fetchMock = mockFetch(200, list);
  await expect(fetchApplicants()).resolves.toEqual(list);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/applicants`, undefined);
});

test("CLIENT-02 createApplicant는 JSON 본문으로 POST한다", async () => {
  const input = { name: "김테스트", phone: "010-1234-5678", programId: 2 };
  const fetchMock = mockFetch(201, makeApplicant());
  await createApplicant(input);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/applicants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
});

test("CLIENT-03 updateApplicant는 바꿀 항목만 PATCH한다", async () => {
  const fetchMock = mockFetch(200, makeApplicant({ attended: true }));
  await updateApplicant(1, { attended: true });
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/applicants/1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attended: true }),
  });
});

test("CLIENT-04 deleteApplicant는 204 응답에서 JSON을 읽지 않는다", async () => {
  const fetchMock = mockFetch(204);
  await expect(deleteApplicant(1)).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/applicants/1`, { method: "DELETE" });
  const response = await fetchMock.mock.results[0].value;
  expect(response.json).not.toHaveBeenCalled();
});

test.each([400, 404, 409])("CLIENT-05 서버가 %i을 주면 error.message로 Error를 던진다", async (status) => {
  mockFetch(status, { error: { code: "X", message: "서버가 보낸 문구" } });
  await expect(fetchApplicants()).rejects.toThrow("서버가 보낸 문구");
});

test("CLIENT-06 프로그램 API는 /api/programs 주소와 메서드를 쓴다", async () => {
  const input = {
    name: "모의면접",
    startDate: "2026-11-10",
    endDate: null,
    location: "3층",
    capacity: 10,
    completionRate: 80,
  };
  let fetchMock = mockFetch(200, [makeProgram()]);
  await fetchPrograms();
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/programs`, undefined);

  fetchMock = mockFetch(201, makeProgram());
  await createProgram(input);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/programs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  fetchMock = mockFetch(200, makeProgram());
  await updateProgram(3, { capacity: null });
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/programs/3`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capacity: null }),
  });

  fetchMock = mockFetch(204);
  await deleteProgram(3);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/programs/3`, { method: "DELETE" });
});

test("CLIENT-07 회차·출석 API는 주소와 메서드를 지킨다 (체크는 PUT, 해제는 DELETE)", async () => {
  let fetchMock = mockFetch(200, []);
  await fetchSessions();
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/sessions`, undefined);

  const input = { sessionDate: "2026-11-10", note: "OT" };
  fetchMock = mockFetch(201, {});
  await createSession(3, input);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/programs/3/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  fetchMock = mockFetch(200, {});
  await updateSession(7, { sessionDate: "2026-11-11", note: null });
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/sessions/7`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionDate: "2026-11-11", note: null }),
  });

  fetchMock = mockFetch(204);
  await deleteSession(7);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/sessions/7`, { method: "DELETE" });

  fetchMock = mockFetch(200, []);
  await fetchAttendance();
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/attendance`, undefined);

  fetchMock = mockFetch(204);
  await setAttendance(7, 5, true);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/sessions/7/attendees/5`, { method: "PUT" });

  fetchMock = mockFetch(204);
  await setAttendance(7, 5, false);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/sessions/7/attendees/5`, { method: "DELETE" });
});

test("CLIENT-08 login은 비밀번호를 POST하고, 토큰을 넣으면 모든 요청에 Authorization을 붙인다", async () => {
  let fetchMock = mockFetch(200, { token: "123.abc", expiresAt: "2026-11-03T12:00:00Z" });
  await expect(login("pw-1234")).resolves.toEqual({ token: "123.abc", expiresAt: "2026-11-03T12:00:00Z" });
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "pw-1234" }),
  });

  setAuthToken("123.abc");
  fetchMock = mockFetch(200, []);
  await fetchApplicants();
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/applicants`, {
    headers: { Authorization: "Bearer 123.abc" },
  });

  fetchMock = mockFetch(201, makeApplicant());
  const input = { name: "김테스트", phone: "010-1234-5678", programId: 2 };
  await createApplicant(input);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/applicants`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer 123.abc" },
    body: JSON.stringify(input),
  });
});

test("CLIENT-09 401은 status가 401인 ApiError, 연결 실패는 status 0", async () => {
  mockFetch(401, { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다. 다시 로그인해 주세요." } });
  const error = await fetchApplicants().catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(401);
  expect((error as ApiError).message).toBe("로그인이 필요합니다. 다시 로그인해 주세요.");

  global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
  const offline = await fetchApplicants().catch((e: unknown) => e);
  expect((offline as ApiError).status).toBe(0);
  expect((offline as ApiError).message).toBe(CONNECTION_ERROR_MESSAGE);
});
