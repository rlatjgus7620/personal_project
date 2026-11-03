import { clearToken, loadToken, saveToken } from "./authStorage";

afterEach(() => {
  jest.restoreAllMocks();
  window.sessionStorage.clear();
});

test("LOGIC-19 토큰을 저장하고 읽고 지운다", () => {
  expect(loadToken()).toBeNull();
  saveToken("123.abc");
  expect(loadToken()).toBe("123.abc");
  clearToken();
  expect(loadToken()).toBeNull();
});

test("LOGIC-19 저장소가 에러를 던져도 화면이 멈추지 않는다", () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(() => saveToken("123.abc")).not.toThrow();
  expect(loadToken()).toBeNull();
  expect(() => clearToken()).not.toThrow();
});
