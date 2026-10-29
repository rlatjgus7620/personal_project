"""의존성(Dependency): 라우터에 "저장소"를 넣어주는 곳.

라우터는 Depends(get_repo)로 저장소를 받기만 합니다.
테스트(conftest.py)는 이 함수를 메모리 저장소로 바꿔 끼웁니다(dependency_overrides).
"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db import get_session
from app.repository import ApplicantRepository
from app.sql_repository import SqlApplicantRepository


def get_repo(session: Session = Depends(get_session)) -> ApplicantRepository:
    return SqlApplicantRepository(session)
