"""입력 검사 에러를 사용자용 한국어 문장으로 바꾸기.

main.py(요청 전체 검사)와 일괄 등록(v2.5, 줄마다 검사)이 함께 씁니다.
"""

from app.schemas import MSG_PASSWORD_REQUIRED, MSG_PROGRAM_REQUIRED, MSG_SESSION_DATE_REQUIRED

# 필드가 빠졌을 때 문구에 쓸 한국어 이름 (JSON 이름 기준)
FIELD_LABELS = {"name": "이름", "phone": "연락처", "attended": "참석 여부"}
DATE_FIELDS = {"startDate", "endDate", "sessionDate"}


def validation_message(errors: list[dict[str, object]]) -> str:
    """Pydantic이 준 에러 목록 중 첫 번째를 사용자용 한국어 문장으로 바꿈"""
    if not errors:
        return "입력값이 올바르지 않습니다."
    first = errors[0]
    loc = first.get("loc")
    location = loc if isinstance(loc, tuple | list) else ()
    field = str(location[-1]) if location else ""
    ctx = first.get("ctx")
    # schemas.py에서 ValueError로 직접 정한 문구가 있으면 그대로 사용
    if first.get("type") == "value_error" and isinstance(ctx, dict) and "error" in ctx:
        return str(ctx["error"])
    if location and location[0] == "path":
        return "주소의 번호는 숫자여야 합니다."
    if first.get("type") == "missing":
        if field == "programId":
            return MSG_PROGRAM_REQUIRED
        if field == "sessionDate":
            return MSG_SESSION_DATE_REQUIRED
        if field == "password":
            return MSG_PASSWORD_REQUIRED
        if field in FIELD_LABELS:
            return f"{FIELD_LABELS[field]} 항목이 필요합니다."
    if field in DATE_FIELDS:
        return "날짜는 YYYY-MM-DD 형식으로 입력해 주세요."
    return "입력값이 올바르지 않습니다."
