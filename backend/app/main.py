"""FastAPI 앱의 시작점. 실행: uv run python -m fastapi dev app/main.py

여기서 하는 일
1) CORS: 화면(localhost:3000)이 이 서버를 부를 수 있게 허락
2) 에러 형식 통일: 어떤 에러든 { "error": { "code", "message" } } 로 응답
   (예상 못 한 에러도 500 INTERNAL_ERROR로, CORS 허락 표시를 붙여서 → middleware.py, v2.2.1)
3) 라우터 등록: /api/auth (v2.0), /api/programs (v1.2), /api/sessions·/api/attendance (v1.3), /api/applicants
4) 로그인 검사 (v2.0): /api/auth와 /health를 뺀 모든 라우터에 require_admin을 붙임
"""

from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth import require_admin
from app.config import get_settings
from app.errors import AppError
from app.messages import validation_message
from app.middleware import CatchUnexpectedErrors
from app.routers import applicants, auth, programs, sessions

app = FastAPI(title="에듀체크 API (교육 프로그램 신청·참석 관리)", version="2.8.0")

# 미들웨어는 나중에 추가한 것이 바깥쪽입니다.
# 에러 잡기를 먼저(안쪽에) 넣어야 그 500 응답에도 CORS 허락 표시가 붙습니다.
app.add_middleware(CatchUnexpectedErrors)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],  # Authorization: 로그인 토큰 (v2.0)
)

def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    # FastAPI 기본은 422지만 API_SPEC.md는 400을 요구
    return error_response(
        status.HTTP_400_BAD_REQUEST, "VALIDATION_ERROR", validation_message(list(exc.errors()))
    )


@app.exception_handler(AppError)
async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
    # errors.py의 모든 에러(404, 409, 업무 규칙 400)를 같은 형식으로
    return error_response(exc.status_code, exc.code, exc.message)


@app.get("/health")
def health() -> dict[str, str]:
    """서버가 살아 있는지 확인 (배포 서버의 상태 점검용)"""
    return {"status": "ok"}


# 로그인 없이 부를 수 있는 것: /health, /api/auth/login
app.include_router(auth.router)
# 나머지는 모두 토큰 필요 (v2.0)
admin_only = [Depends(require_admin)]
app.include_router(programs.router, dependencies=admin_only)
app.include_router(sessions.router, dependencies=admin_only)
app.include_router(applicants.router, dependencies=admin_only)
