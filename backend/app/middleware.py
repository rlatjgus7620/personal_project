"""예상 못 한 에러 잡기 (v2.2.1).

라우터에서 AppError가 아닌 에러(예: DB 구조가 옛날 것)가 나면 FastAPI는 맨 바깥에서
일반 500 응답을 만드는데, 이 응답에는 CORS 허락 표시가 빠집니다. 그러면 브라우저가 응답을 막아서
화면에는 "서버에 연결할 수 없습니다"라고 잘못 보입니다.

이 미들웨어는 CORS 안쪽에서 에러를 먼저 잡아 { "error": { "code", "message" } } 형식의 500으로 바꿉니다.
CORS가 그 응답에 허락 표시를 붙여 주므로, 화면에 "서버에서 오류가 발생했습니다"가 제대로 보입니다.
에러 내용은 서버 터미널에 그대로 남깁니다 (원인을 찾을 수 있게).
"""

import logging

from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger("educheck")

MSG_INTERNAL_ERROR = "서버에서 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요."


class CatchUnexpectedErrors:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started = False  # 응답을 이미 보내기 시작했으면 바꿀 수 없음

        async def send_and_remember(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, send_and_remember)
        except Exception:
            # 터미널에 에러 전체를 남김 (화면에는 짧은 문구만)
            logger.exception("처리하지 못한 에러: %s %s", scope.get("method"), scope.get("path"))
            if started:
                raise
            response = JSONResponse(
                status_code=500,
                content={"error": {"code": "INTERNAL_ERROR", "message": MSG_INTERNAL_ERROR}},
            )
            await response(scope, receive, send)
