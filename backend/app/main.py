"""FastAPI 앱의 시작점. 실행: uv run fastapi dev app/main.py

여기서 하는 일
1) CORS: 화면(localhost:3000)이 이 서버를 부를 수 있게 허락
2) 에러 형식 통일: 어떤 에러든 { "error": { "code", "message" } } 로 응답
3) 라우터 등록: /api/applicants
"""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.errors import DuplicateApplicationError, NotFoundError
from app.routers import applicants

app = FastAPI(title="교육 프로그램 신청·참석 관리 API", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

# 필드가 빠졌을 때 문구에 쓸 한국어 이름
FIELD_LABELS = {"name": "이름", "phone": "연락처", "program": "프로그램", "attended": "참석 여부"}


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


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
        return "신청자 번호는 숫자여야 합니다."
    if first.get("type") == "missing" and field in FIELD_LABELS:
        return f"{FIELD_LABELS[field]} 항목이 필요합니다."
    return "입력값이 올바르지 않습니다."


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    # FastAPI 기본은 422지만 API_SPEC.md는 400을 요구
    return error_response(
        status.HTTP_400_BAD_REQUEST, "VALIDATION_ERROR", validation_message(list(exc.errors()))
    )


@app.exception_handler(NotFoundError)
async def handle_not_found(_: Request, exc: NotFoundError) -> JSONResponse:
    return error_response(status.HTTP_404_NOT_FOUND, "NOT_FOUND", exc.message)


@app.exception_handler(DuplicateApplicationError)
async def handle_duplicate(_: Request, exc: DuplicateApplicationError) -> JSONResponse:
    return error_response(status.HTTP_409_CONFLICT, "DUPLICATE_APPLICATION", exc.message)


@app.get("/health")
def health() -> dict[str, str]:
    """서버가 살아 있는지 확인 (배포 서버의 상태 점검용)"""
    return {"status": "ok"}


app.include_router(applicants.router)
