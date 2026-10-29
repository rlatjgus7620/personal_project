import {
  createApplicant,
  deleteApplicant,
  fetchApplicants,
  updateApplicant,
} from "./applicantApi";
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
});

test("CLIENT-01 fetchApplicants는 GET으로 명단을 받아온다", async () => {
  const list = [makeApplicant()];
  const fetchMock = mockFetch(200, list);
  await expect(fetchApplicants()).resolves.toEqual(list);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/api/applicants`, undefined);
});

test("CLIENT-02 createApplicant는 JSON 본문으로 POST한다", async () => {
  const input = { name: "김테스트", phone: "010-1234-5678", program: "resume_clinic" as const };
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
