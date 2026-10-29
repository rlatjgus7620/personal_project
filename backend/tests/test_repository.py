"""REPO-01 ~ REPO-05: 메모리 저장소"""

from collections.abc import Callable

import pytest

from app.repository import ApplicantRepository, MemoryApplicantRepository
from tests.repo_scenarios import ALL_SCENARIOS


@pytest.mark.parametrize("scenario", ALL_SCENARIOS, ids=lambda f: f.__name__)
def test_메모리_저장소(scenario: Callable[[ApplicantRepository], None]) -> None:
    scenario(MemoryApplicantRepository())
