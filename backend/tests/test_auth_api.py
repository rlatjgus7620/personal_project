"""API-31 ~ API-35: 로그인과 API 보호 (v2.0, docs/TEST_CASES.md 3-1절)"""

from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.security import make_token
from tests.conftest import TEST_PASSWORD, TEST_SECRET, make_test_settings

LOGIN = "/api/auth/login"
PROTECTED = ["/api/applicants", "/api/programs", "/api/sessions", "/api/attendance"]


def error_of(response_json: dict[str, object]) -> dict[str, object]:
    error = response_json["error"]
    assert isinstance(error, dict)
    return error


def test_api_31_맞는_비밀번호면_토큰을_주고_그_토큰으로_명단을_본다(anon: TestClient) -> None:
    response = anon.post(LOGIN, json={"password": TEST_PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"token", "expiresAt"}
    listed = anon.get("/api/applicants", headers={"Authorization": f"Bearer {body['token']}"})
    assert listed.status_code == 200
    assert listed.json() == []


def test_api_32_틀린_비밀번호와_빈_비밀번호(anon: TestClient) -> None:
    wrong = anon.post(LOGIN, json={"password": "wrong-password"})
    assert wrong.status_code == 401
    assert error_of(wrong.json()) == {"code": "INVALID_PASSWORD", "message": "비밀번호가 맞지 않습니다."}

    for body in [{"password": ""}, {}]:
        empty = anon.post(LOGIN, json=body)
        assert empty.status_code == 400
        assert error_of(empty.json())["message"] == "비밀번호를 입력해 주세요."


def test_api_33_토큰이_없거나_틀리거나_만료되면_401(anon: TestClient) -> None:
    expired, _ = make_token(TEST_SECRET, hours=12, now=0)  # 1970년에 만료된 토큰
    bad_headers: list[dict[str, str]] = [
        {},
        {"Authorization": "Bearer not-a-token"},
        {"Authorization": "Bearer abc.def"},
        {"Authorization": f"Bearer {expired}"},
        {"Authorization": TEST_PASSWORD},  # Bearer 없이 비밀번호를 그대로 보냄
    ]
    for url in PROTECTED:
        for headers in bad_headers:
            response = anon.get(url, headers=headers)
            assert response.status_code == 401, (url, headers)
            assert error_of(response.json()) == {
                "code": "UNAUTHORIZED",
                "message": "로그인이 필요합니다. 다시 로그인해 주세요.",
            }
    # 쓰기 요청도 막힘 (입력 검사보다 로그인 검사가 먼저)
    assert anon.post("/api/applicants", json={}).status_code == 401
    assert anon.delete("/api/programs/1").status_code == 401
    # 상태 확인은 로그인 없이
    assert anon.get("/health").status_code == 200


def test_api_34_5번_틀리면_맞는_비밀번호도_막힌다(anon: TestClient) -> None:
    for _ in range(5):
        assert anon.post(LOGIN, json={"password": "wrong-password"}).status_code == 401
    blocked = anon.post(LOGIN, json={"password": TEST_PASSWORD})
    assert blocked.status_code == 429
    assert error_of(blocked.json())["code"] == "TOO_MANY_ATTEMPTS"


def test_api_35_서버에_비밀번호가_없으면_503(anon: TestClient) -> None:
    app.dependency_overrides[get_settings] = lambda: make_test_settings(password="")
    response = anon.post(LOGIN, json={"password": "anything"})
    assert response.status_code == 503
    assert error_of(response.json())["code"] == "AUTH_NOT_CONFIGURED"
