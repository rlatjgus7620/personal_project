"""API-01 ~ API-15: /api/applicants 와 /health (docs/TEST_CASES.md 3절)"""

import time

from fastapi.testclient import TestClient

URL = "/api/applicants"
VALID = {"name": "김테스트", "phone": "010-1234-5678", "program": "resume_clinic"}


def post(client: TestClient, **overrides: object) -> dict[str, object]:
    response = client.post(URL, json={**VALID, **overrides})
    assert response.status_code == 201, response.text
    body: dict[str, object] = response.json()
    return body


def assert_error(response_json: dict[str, object], code: str) -> None:
    error = response_json["error"]
    assert isinstance(error, dict)
    assert error["code"] == code
    assert isinstance(error["message"], str) and error["message"]


def test_api_01_등록하면_201과_camelCase_응답(client: TestClient) -> None:
    response = client.post(URL, json=VALID)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "김테스트"
    assert body["attended"] is False
    assert set(body) == {"id", "name", "phone", "program", "attended", "createdAt", "updatedAt"}


def test_api_02_빈_이름은_400(client: TestClient) -> None:
    response = client.post(URL, json={**VALID, "name": "   "})
    assert response.status_code == 400
    assert_error(response.json(), "VALIDATION_ERROR")
    assert response.json()["error"]["message"] == "이름을 입력해 주세요."


def test_api_03_연락처_형식이_틀리면_400(client: TestClient) -> None:
    response = client.post(URL, json={**VALID, "phone": "01012345678"})
    assert response.status_code == 400
    assert response.json()["error"]["message"] == "연락처는 010-0000-0000 형식으로 입력해 주세요."


def test_api_04_없는_프로그램은_400(client: TestClient) -> None:
    response = client.post(URL, json={**VALID, "program": "cooking"})
    assert response.status_code == 400
    assert_error(response.json(), "VALIDATION_ERROR")


def test_api_05_같은_연락처_같은_프로그램은_409(client: TestClient) -> None:
    post(client)
    response = client.post(URL, json={**VALID, "name": "다른이름"})
    assert response.status_code == 409
    assert_error(response.json(), "DUPLICATE_APPLICATION")


def test_api_06_같은_연락처라도_다른_프로그램은_등록된다(client: TestClient) -> None:
    post(client)
    response = client.post(URL, json={**VALID, "program": "mock_interview"})
    assert response.status_code == 201


def test_api_07_조회하면_최신순(client: TestClient) -> None:
    first = post(client, phone="010-1111-1111")
    time.sleep(0.01)
    second = post(client, phone="010-2222-2222")
    response = client.get(URL)
    assert response.status_code == 200
    assert [a["id"] for a in response.json()] == [second["id"], first["id"]]


def test_api_08_참석으로_바꾸면_200과_updatedAt_갱신(client: TestClient) -> None:
    created = post(client)
    time.sleep(0.01)
    response = client.patch(f"{URL}/{created['id']}", json={"attended": True})
    assert response.status_code == 200
    body = response.json()
    assert body["attended"] is True
    assert body["updatedAt"] != created["updatedAt"]


def test_api_09_이름_연락처_프로그램을_수정한다(client: TestClient) -> None:
    created = post(client)
    changes = {"name": "김수정", "phone": "010-9999-8888", "program": "career_lecture"}
    response = client.patch(f"{URL}/{created['id']}", json=changes)
    assert response.status_code == 200
    body = response.json()
    assert {k: body[k] for k in changes} == changes


def test_api_10_빈_객체로_수정하면_400(client: TestClient) -> None:
    created = post(client)
    response = client.patch(f"{URL}/{created['id']}", json={})
    assert response.status_code == 400
    assert response.json()["error"]["message"] == "수정할 항목이 없습니다."


def test_api_11_없는_id_수정은_404(client: TestClient) -> None:
    response = client.patch(f"{URL}/999", json={"attended": True})
    assert response.status_code == 404
    assert_error(response.json(), "NOT_FOUND")


def test_api_12_숫자가_아닌_id는_400(client: TestClient) -> None:
    response = client.patch(f"{URL}/abc", json={"attended": True})
    assert response.status_code == 400
    assert_error(response.json(), "VALIDATION_ERROR")


def test_api_13_삭제하면_204_빈_본문_이후_조회에_없음(client: TestClient) -> None:
    created = post(client)
    response = client.delete(f"{URL}/{created['id']}")
    assert response.status_code == 204
    assert response.content == b""
    assert client.get(URL).json() == []


def test_api_14_없는_id_삭제는_404(client: TestClient) -> None:
    response = client.delete(f"{URL}/999")
    assert response.status_code == 404
    assert_error(response.json(), "NOT_FOUND")


def test_api_15_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
