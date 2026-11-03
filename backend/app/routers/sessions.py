"""회차·출석 엔드포인트 (v1.3). 저장소는 Depends(get_repo)로만 받습니다.

- GET    /api/sessions                                  전체 회차
- POST   /api/programs/{program_id}/sessions            회차 추가
- PATCH  /api/sessions/{session_id}                     회차 날짜·메모 수정 (v2.1)
- DELETE /api/sessions/{session_id}                     회차 삭제
- GET    /api/attendance                                전체 출석 기록
- PUT    /api/sessions/{session_id}/attendees/{applicant_id}   출석 체크
- DELETE /api/sessions/{session_id}/attendees/{applicant_id}   출석 해제
"""

from fastapi import APIRouter, Depends, Response, status

from app.deps import get_repo
from app.errors import ProgramNotFoundError, SessionNotFoundError
from app.repository import ApplicantRepository
from app.schemas import AttendanceOut, SessionCreate, SessionOut, SessionUpdate

router = APIRouter(prefix="/api", tags=["sessions"])


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(repo: ApplicantRepository = Depends(get_repo)) -> list[SessionOut]:
    """전체 회차 (프로그램 번호순, 그 안에서 날짜순)"""
    return repo.list_sessions()


@router.post(
    "/programs/{program_id}/sessions",
    response_model=SessionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    program_id: int, data: SessionCreate, repo: ApplicantRepository = Depends(get_repo)
) -> SessionOut:
    """그 프로그램에 회차 추가"""
    session = repo.create_session(program_id, data)
    if session is None:
        raise ProgramNotFoundError()
    return session


@router.patch("/sessions/{session_id}", response_model=SessionOut)
def update_session(
    session_id: int, data: SessionUpdate, repo: ApplicantRepository = Depends(get_repo)
) -> SessionOut:
    """회차 날짜·메모 수정 (출석 기록은 그대로)"""
    session = repo.update_session(session_id, data)
    if session is None:
        raise SessionNotFoundError()
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, repo: ApplicantRepository = Depends(get_repo)) -> Response:
    """회차 삭제 (출석 기록도 함께)"""
    if not repo.delete_session(session_id):
        raise SessionNotFoundError()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/attendance", response_model=list[AttendanceOut])
def list_attendance(repo: ApplicantRepository = Depends(get_repo)) -> list[AttendanceOut]:
    """전체 출석 기록 (줄이 있으면 출석)"""
    return repo.list_attendance()


@router.put(
    "/sessions/{session_id}/attendees/{applicant_id}", status_code=status.HTTP_204_NO_CONTENT
)
def check_attendance(
    session_id: int, applicant_id: int, repo: ApplicantRepository = Depends(get_repo)
) -> Response:
    """출석으로 체크 (이미 출석이어도 204)"""
    repo.set_attendance(session_id, applicant_id, present=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/sessions/{session_id}/attendees/{applicant_id}", status_code=status.HTTP_204_NO_CONTENT
)
def uncheck_attendance(
    session_id: int, applicant_id: int, repo: ApplicantRepository = Depends(get_repo)
) -> Response:
    """출석 체크 해제 (이미 결석이어도 204)"""
    repo.set_attendance(session_id, applicant_id, present=False)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
