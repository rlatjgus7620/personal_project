"""/api/applicants 엔드포인트. 저장소는 Depends(get_repo)로만 받습니다."""

from fastapi import APIRouter, Depends, Response, status
from pydantic import ValidationError

from app.deps import get_repo
from app.errors import AppError, InvalidProgramError, NotFoundError
from app.messages import validation_message
from app.repository import ApplicantRepository
from app.schemas import (
    ApplicantCreate,
    ApplicantOut,
    ApplicantUpdate,
    BulkCreate,
    BulkFailure,
    BulkResult,
)

router = APIRouter(prefix="/api/applicants", tags=["applicants"])


@router.get("", response_model=list[ApplicantOut])
def list_applicants(repo: ApplicantRepository = Depends(get_repo)) -> list[ApplicantOut]:
    """명단 조회 (최신 신청순)"""
    return repo.list()


@router.post("", response_model=ApplicantOut, status_code=status.HTTP_201_CREATED)
def create_applicant(
    data: ApplicantCreate, repo: ApplicantRepository = Depends(get_repo)
) -> ApplicantOut:
    """신청자 등록"""
    return repo.create(data)


@router.post("/bulk", response_model=BulkResult)
def create_applicants_bulk(data: BulkCreate, repo: ApplicantRepository = Depends(get_repo)) -> BulkResult:
    """명단 일괄 등록 (v2.5). 줄마다 등록하고, 실패한 줄은 이유와 함께 failed로 돌려줌"""
    if not any(p.id == data.program_id for p in repo.list_programs()):
        raise InvalidProgramError()
    created: list[ApplicantOut] = []
    failed: list[BulkFailure] = []
    for row, item in enumerate(data.items, start=1):
        name = item.get("name") or ""
        phone = item.get("phone") or ""
        try:
            payload = ApplicantCreate.model_validate({"name": name, "phone": phone, "program_id": data.program_id})
            created.append(repo.create(payload))  # 중복·정원 규칙은 저장소가 그대로 지킴
        except ValidationError as error:
            failed.append(
                BulkFailure(row=row, name=str(name), phone=str(phone), message=validation_message(list(error.errors())))
            )
        except AppError as error:
            failed.append(BulkFailure(row=row, name=str(name), phone=str(phone), message=error.message))
    return BulkResult(created=created, failed=failed)


@router.patch("/{applicant_id}", response_model=ApplicantOut)
def update_applicant(
    applicant_id: int, data: ApplicantUpdate, repo: ApplicantRepository = Depends(get_repo)
) -> ApplicantOut:
    """정보 수정 또는 참석 전환"""
    applicant = repo.update(applicant_id, data)
    if applicant is None:
        raise NotFoundError()
    return applicant


@router.delete("/{applicant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_applicant(applicant_id: int, repo: ApplicantRepository = Depends(get_repo)) -> Response:
    """신청 취소(삭제). 204는 본문이 없어야 해서 빈 Response를 돌려줌"""
    if not repo.delete(applicant_id):
        raise NotFoundError()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
