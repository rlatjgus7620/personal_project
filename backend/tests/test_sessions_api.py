"""API-25 ~ API-30: 회차·출석 (v1.3, docs/TEST_CASES.md 3절)"""

from fastapi.testclient import TestClient


def make_program(client: TestClient, name: str = "모의면접") -> int:
    response = client.post("/api/programs", json={"name": name})
    assert response.status_code == 201, response.text
    program_id: int = response.json()["id"]
    return program_id


def make_applicant(client: TestClient, program_id: int, phone: str = "010-1234-5678") -> int:
    response = client.post(
        "/api/applicants", json={"name": "김테스트", "phone": phone, "programId": program_id}
    )
    assert response.status_code == 201, response.text
    applicant_id: int = response.json()["id"]
    return applicant_id


def make_session(client: TestClient, program_id: int, day: str, note: str | None = None) -> int:
    response = client.post(
        f"/api/programs/{program_id}/sessions", json={"sessionDate": day, "note": note}
    )
    assert response.status_code == 201, response.text
    session_id: int = response.json()["id"]
    return session_id


def error_of(response_json: dict[str, object]) -> dict[str, object]:
    error = response_json["error"]
    assert isinstance(error, dict)
    return error


def test_api_25_회차_추가(client: TestClient) -> None:
    pid = make_program(client)
    url = f"/api/programs/{pid}/sessions"
    ok = client.post(url, json={"sessionDate": "2026-11-10", "note": "OT"})
    assert ok.status_code == 201
    assert ok.json()["attendeeCount"] == 0
    assert ok.json()["programId"] == pid

    missing = client.post(url, json={"note": "OT"})
    assert missing.status_code == 400
    assert error_of(missing.json())["message"] == "회차 날짜를 입력해 주세요."

    bad_date = client.post(url, json={"sessionDate": "2026-13-40"})
    assert bad_date.status_code == 400
    assert error_of(bad_date.json())["message"] == "날짜는 YYYY-MM-DD 형식으로 입력해 주세요."

    duplicate = client.post(url, json={"sessionDate": "2026-11-10"})
    assert duplicate.status_code == 409
    assert error_of(duplicate.json())["code"] == "DUPLICATE_SESSION"

    no_program = client.post("/api/programs/999/sessions", json={"sessionDate": "2026-11-10"})
    assert no_program.status_code == 404
    assert error_of(no_program.json())["message"] == "프로그램을 찾을 수 없습니다."


def test_api_26_회차_목록은_프로그램순_날짜순(client: TestClient) -> None:
    a = make_program(client, "모의면접")
    b = make_program(client, "취업 특강")
    make_session(client, b, "2026-11-01")
    make_session(client, a, "2026-11-12")
    make_session(client, a, "2026-11-10", "OT")
    body = client.get("/api/sessions").json()
    assert [(s["programId"], s["sessionDate"]) for s in body] == [
        (a, "2026-11-10"),
        (a, "2026-11-12"),
        (b, "2026-11-01"),
    ]
    assert set(body[0]) == {"id", "programId", "sessionDate", "note", "attendeeCount"}
    assert body[0]["note"] == "OT"
    assert body[1]["note"] is None


def test_api_27_출석_체크와_해제는_여러_번_해도_204(client: TestClient) -> None:
    pid = make_program(client)
    sid = make_session(client, pid, "2026-11-10")
    aid = make_applicant(client, pid)
    url = f"/api/sessions/{sid}/attendees/{aid}"
    assert client.put(url).status_code == 204
    assert client.put(url).status_code == 204
    assert client.get("/api/attendance").json() == [{"sessionId": sid, "applicantId": aid}]
    assert client.get("/api/sessions").json()[0]["attendeeCount"] == 1
    assert client.delete(url).status_code == 204
    assert client.delete(url).status_code == 204
    assert client.get("/api/attendance").json() == []


def test_api_28_출석_체크_에러(client: TestClient) -> None:
    a = make_program(client, "모의면접")
    b = make_program(client, "취업 특강")
    sid = make_session(client, a, "2026-11-10")
    other = make_applicant(client, b)

    wrong = client.put(f"/api/sessions/{sid}/attendees/{other}")
    assert wrong.status_code == 400
    assert error_of(wrong.json())["message"] == "이 회차 프로그램의 신청자가 아닙니다."

    no_session = client.put(f"/api/sessions/999/attendees/{other}")
    assert no_session.status_code == 404
    assert error_of(no_session.json())["message"] == "회차를 찾을 수 없습니다."

    no_applicant = client.delete(f"/api/sessions/{sid}/attendees/999")
    assert no_applicant.status_code == 404
    assert error_of(no_applicant.json())["message"] == "신청자를 찾을 수 없습니다."


def test_api_29_회차를_지우면_출석_기록도_지워진다(client: TestClient) -> None:
    pid = make_program(client)
    sid = make_session(client, pid, "2026-11-10")
    aid = make_applicant(client, pid)
    client.put(f"/api/sessions/{sid}/attendees/{aid}")
    assert client.delete(f"/api/sessions/{sid}").status_code == 204
    assert client.get("/api/sessions").json() == []
    assert client.get("/api/attendance").json() == []

    missing = client.delete(f"/api/sessions/{sid}")
    assert missing.status_code == 404
    assert error_of(missing.json())["message"] == "회차를 찾을 수 없습니다."


def test_api_30_출석_기록이_있으면_다른_프로그램으로_못_옮긴다(client: TestClient) -> None:
    a = make_program(client, "모의면접")
    b = make_program(client, "취업 특강")
    sid = make_session(client, a, "2026-11-10")
    aid = make_applicant(client, a)
    client.put(f"/api/sessions/{sid}/attendees/{aid}")
    response = client.patch(f"/api/applicants/{aid}", json={"programId": b})
    assert response.status_code == 409
    assert error_of(response.json())["code"] == "HAS_ATTENDANCE"
