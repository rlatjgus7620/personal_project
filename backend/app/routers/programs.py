"""/api/programs 엔드포인트 (v1.2). 저장소는 Depends(get_repo)로만 받습니다."""

from fastapi import APIRouter, Depends, Response, status

from app.deps import get_repo
from app.errors import ProgramNotFoundError
from app.repository import ApplicantRepository
from app.schemas import ProgramCreate, ProgramOut, ProgramUpdate

router = APIRouter(prefix="/api/programs", tags=["programs"])


@router.get("", response_model=list[ProgramOut])
def list_programs(repo: ApplicantRepository = Depends(get_repo)) -> list[ProgramOut]:
    """프로그램 목록 (만든 순서, 신청자 수 포함)"""
    return repo.list_programs()


@router.post("", response_model=ProgramOut, status_code=status.HTTP_201_CREATED)
def create_program(data: ProgramCreate, repo: ApplicantRepository = Depends(get_repo)) -> ProgramOut:
    """프로그램 추가"""
    return repo.create_program(data)


@router.patch("/{program_id}", response_model=ProgramOut)
def update_program(
    program_id: int, data: ProgramUpdate, repo: ApplicantRepository = Depends(get_repo)
) -> ProgramOut:
    """프로그램 수정 (보낸 항목만)"""
    program = repo.update_program(program_id, data)
    if program is None:
        raise ProgramNotFoundError()
    return program


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(program_id: int, repo: ApplicantRepository = Depends(get_repo)) -> Response:
    """프로그램 삭제 (신청자가 없을 때만)"""
    if not repo.delete_program(program_id):
        raise ProgramNotFoundError()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
