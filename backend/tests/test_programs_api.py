"""API-17 ~ API-22: /api/programs (v1.2, docs/TEST_CASES.md 3절)"""

from fastapi.testclient import TestClient

URL = "/api/programs"


def create(client: TestClient, **body: object) -> dict[str, object]:
    response = client.post(URL, json={"name": "모의면접", **body})
    assert response.status_code == 201, response.text
    result: dict[str, object] = response.json()
    return result


def apply(client: TestClient, program_id: object, phone: str) -> None:
    response = client.post(
        "/api/applicants", json={"name": "김테스트", "phone": phone, "programId": program_id}
    )
    assert response.status_code == 201, response.text


def error_of(response_json: dict[str, object]) -> dict[str, object]:
    error = response_json["error"]
    assert isinstance(error, dict)
    return error


def test_api_17_프로그램을_추가하면_201과_camelCase(client: TestClient) -> None:
    body = create(
        client, startDate="2026-11-10", endDate="2026-11-12", location="3층 세미나실", capacity=10
    )
    assert body["name"] == "모의면접"
    assert body["startDate"] == "2026-11-10"
    assert body["endDate"] == "2026-11-12"
    assert body["location"] == "3층 세미나실"
    assert body["capacity"] == 10
    assert body["applicantCount"] == 0
    assert body["completionRate"] == 80  # v2.1: 안 보내면 기본 80%
    assert set(body) == {
        "id", "name", "startDate", "endDate", "location", "capacity", "completionRate", "applicantCount"
    }


def test_api_18_빈_이름은_400_같은_이름은_409(client: TestClient) -> None:
    response = client.post(URL, json={"name": "  "})
    assert response.status_code == 400
    assert error_of(response.json())["message"] == "프로그램 이름을 입력해 주세요."
    create(client)
    response = client.post(URL, json={"name": "모의면접"})
    assert response.status_code == 409
    assert error_of(response.json())["code"] == "DUPLICATE_PROGRAM"


def test_api_19_목록은_만든_순서와_신청자_수(client: TestClient) -> None:
    first = create(client, name="모의면접")
    second = create(client, name="취업 특강")
    apply(client, first["id"], "010-1111-1111")
    apply(client, first["id"], "010-2222-2222")
    response = client.get(URL)
    assert response.status_code == 200
    rows = response.json()
    assert [r["id"] for r in rows] == [first["id"], second["id"]]
    assert [r["applicantCount"] for r in rows] == [2, 0]


def test_api_20_수정과_정원_비우기와_없는_id(client: TestClient) -> None:
    created = create(client, capacity=10)
    response = client.patch(f"{URL}/{created['id']}", json={"location": "2층", "capacity": 20})
    assert response.status_code == 200
    assert (response.json()["location"], response.json()["capacity"]) == ("2층", 20)
    response = client.patch(f"{URL}/{created['id']}", json={"capacity": None})
    assert response.status_code == 200
    assert response.json()["capacity"] is None
    response = client.patch(f"{URL}/999", json={"capacity": 5})
    assert response.status_code == 404
    assert error_of(response.json())["message"] == "프로그램을 찾을 수 없습니다."


def test_api_21_정원을_신청자보다_적게_줄이면_400(client: TestClient) -> None:
    created = create(client, capacity=10)
    apply(client, created["id"], "010-1111-1111")
    apply(client, created["id"], "010-2222-2222")
    response = client.patch(f"{URL}/{created['id']}", json={"capacity": 1})
    assert response.status_code == 400
    error = error_of(response.json())
    assert error["code"] == "VALIDATION_ERROR"
    assert error["message"] == "지금 신청자(2명)보다 정원을 적게 줄일 수 없습니다."


def test_api_22_삭제는_신청자가_없을_때만(client: TestClient) -> None:
    used = create(client, name="모의면접")
    empty = create(client, name="취업 특강")
    apply(client, used["id"], "010-1111-1111")
    response = client.delete(f"{URL}/{used['id']}")
    assert response.status_code == 409
    assert error_of(response.json())["code"] == "PROGRAM_IN_USE"
    response = client.delete(f"{URL}/{empty['id']}")
    assert response.status_code == 204
    assert response.content == b""
    assert client.delete(f"{URL}/999").status_code == 404


def test_api_37_수료_기준은_1부터_100까지_바꿀_수_있다(client: TestClient) -> None:
    program = create(client, completionRate=70)
    assert program["completionRate"] == 70
    updated = client.patch(f"{URL}/{program['id']}", json={"completionRate": 100})
    assert updated.status_code == 200
    assert updated.json()["completionRate"] == 100
    for bad in [0, 101, None, "많이"]:
        response = client.patch(f"{URL}/{program['id']}", json={"completionRate": bad})
        assert response.status_code == 400, bad
        assert error_of(response.json())["message"] == "수료 기준은 1~100% 사이로 입력해 주세요."
