"""API-01 ~ API-16, API-23 ~ API-24, API-38: /api/applicants 와 /health (docs/TEST_CASES.md 3절)

신청하려면 프로그램이 있어야 하므로, 먼저 프로그램을 만들고 그 번호로 신청합니다.
"""

import time

import pytest
from fastapi.testclient import TestClient

from app.deps import get_repo
from app.main import app
from app.repository import MemoryApplicantRepository
from app.schemas import ApplicantOut

URL = "/api/applicants"


def make_program(client: TestClient, name: str = "이력서 클리닉", capacity: int | None = None) -> int:
    response = client.post("/api/programs", json={"name": name, "capacity": capacity})
    assert response.status_code == 201, response.text
    program_id: int = response.json()["id"]
    return program_id


@pytest.fixture
def pid(client: TestClient) -> int:
    """기본 프로그램 번호"""
    return make_program(client)


def valid(program_id: int, **overrides: object) -> dict[str, object]:
    return {"name": "김테스트", "phone": "010-1234-5678", "programId": program_id, **overrides}


def post(client: TestClient, program_id: int, **overrides: object) -> dict[str, object]:
    response = client.post(URL, json=valid(program_id, **overrides))
    assert response.status_code == 201, response.text
    body: dict[str, object] = response.json()
    return body


def assert_error(response_json: dict[str, object], code: str) -> None:
    error = response_json["error"]
    assert isinstance(error, dict)
    assert error["code"] == code
    assert isinstance(error["message"], str) and error["message"]


def test_api_01_등록하면_201과_camelCase_응답(client: TestClient, pid: int) -> None:
    response = client.post(URL, json=valid(pid))
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "김테스트"
    assert body["attended"] is False
    assert body["programId"] == pid
    assert set(body) == {"id", "name", "phone", "programId", "attended", "createdAt", "updatedAt"}


def test_api_02_빈_이름은_400(client: TestClient, pid: int) -> None:
    response = client.post(URL, json=valid(pid, name="   "))
    assert response.status_code == 400
    assert_error(response.json(), "VALIDATION_ERROR")
    assert response.json()["error"]["message"] == "이름을 입력해 주세요."


def test_api_03_연락처_형식이_틀리면_400(client: TestClient, pid: int) -> None:
    response = client.post(URL, json=valid(pid, phone="01012345678"))
    assert response.status_code == 400
    assert response.json()["error"]["message"] == "연락처는 010-0000-0000 형식으로 입력해 주세요."


def test_api_04_프로그램을_안_고르거나_없는_번호면_400(client: TestClient, pid: int) -> None:
    response = client.post(URL, json=valid(0))
    assert response.status_code == 400
    assert response.json()["error"]["message"] == "프로그램을 선택해 주세요."
    response = client.post(URL, json={"name": "김테스트", "phone": "010-1234-5678"})
    assert response.status_code == 400
    assert response.json()["error"]["message"] == "프로그램을 선택해 주세요."
    response = client.post(URL, json=valid(999))
    assert response.status_code == 400
    assert_error(response.json(), "VALIDATION_ERROR")
    assert response.json()["error"]["message"] == "선택한 프로그램이 없습니다."


def test_api_05_같은_연락처_같은_프로그램은_409(client: TestClient, pid: int) -> None:
    post(client, pid)
    response = client.post(URL, json=valid(pid, name="다른이름"))
    assert response.status_code == 409
    assert_error(response.json(), "DUPLICATE_APPLICATION")


def test_api_06_같은_연락처라도_다른_프로그램은_등록된다(client: TestClient, pid: int) -> None:
    post(client, pid)
    other = make_program(client, "모의면접")
    response = client.post(URL, json=valid(other))
    assert response.status_code == 201


def test_api_07_조회하면_최신순(client: TestClient, pid: int) -> None:
    first = post(client, pid, phone="010-1111-1111")
    time.sleep(0.01)
    second = post(client, pid, phone="010-2222-2222")
    response = client.get(URL)
    assert response.status_code == 200
    assert [a["id"] for a in response.json()] == [second["id"], first["id"]]


def test_api_08_참석으로_바꾸면_200과_updatedAt_갱신(client: TestClient, pid: int) -> None:
    created = post(client, pid)
    time.sleep(0.01)
    response = client.patch(f"{URL}/{created['id']}", json={"attended": True})
    assert response.status_code == 200
    body = response.json()
    assert body["attended"] is True
    assert body["updatedAt"] != created["updatedAt"]


def test_api_09_이름_연락처_프로그램을_수정한다(client: TestClient, pid: int) -> None:
    created = post(client, pid)
    other = make_program(client, "취업 특강")
    changes = {"name": "김수정", "phone": "010-9999-8888", "programId": other}
    response = client.patch(f"{URL}/{created['id']}", json=changes)
    assert response.status_code == 200
    body = response.json()
    assert {k: body[k] for k in changes} == changes


def test_api_10_빈_객체로_수정하면_400(client: TestClient, pid: int) -> None:
    created = post(client, pid)
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


def test_api_13_삭제하면_204_빈_본문_이후_조회에_없음(client: TestClient, pid: int) -> None:
    created = post(client, pid)
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


def test_api_16_화면이_3001번이나_127_0_0_1이어도_CORS가_허용된다(client: TestClient) -> None:
    for origin in ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]:
        response = client.get(URL, headers={"Origin": origin})
        assert response.headers.get("access-control-allow-origin") == origin


def test_api_23_정원이_차면_409_PROGRAM_FULL(client: TestClient) -> None:
    small = make_program(client, "모의면접", capacity=1)
    post(client, small, phone="010-1111-1111")
    response = client.post(URL, json=valid(small, phone="010-2222-2222"))
    assert response.status_code == 409
    assert_error(response.json(), "PROGRAM_FULL")
    assert response.json()["error"]["message"] == "정원이 가득 찼습니다. (정원 1명)"


def test_api_24_마감된_프로그램으로_옮기면_409(client: TestClient, pid: int) -> None:
    small = make_program(client, "모의면접", capacity=1)
    post(client, small, phone="010-1111-1111")
    mover = post(client, pid, phone="010-2222-2222")
    response = client.patch(f"{URL}/{mover['id']}", json={"programId": small})
    assert response.status_code == 409
    assert_error(response.json(), "PROGRAM_FULL")


class BrokenRepository(MemoryApplicantRepository):
    """명단을 읽을 때 예상 못 한 에러가 나는 저장소 (예: DB 구조가 옛날 것)"""

    def list(self) -> list[ApplicantOut]:
        raise RuntimeError("no such column")


def test_api_38_예상_못_한_에러도_같은_형식의_500이고_CORS가_붙는다(client: TestClient) -> None:
    app.dependency_overrides[get_repo] = lambda: BrokenRepository()
    response = client.get(URL, headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "INTERNAL_ERROR", "message": "서버에서 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요."}
    }
    # CORS 허락 표시가 있어야 브라우저가 응답을 막지 않음
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
