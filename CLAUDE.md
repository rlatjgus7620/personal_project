# CLAUDE.md - 교육 프로그램 신청·참석 관리 앱

## 프로젝트 개요
교육기관 운영 담당자가 프로그램 신청자 명단을 관리하는 웹 앱 (개인 학습 프로젝트)
신청자 등록 → 참석 체크 → 프로그램/참석 여부로 골라 보기

## 기술 스택
- 프런트: Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS
- 프런트 테스트: Jest + React Testing Library + user-event
- 백엔드: Python 3.12+, FastAPI, Pydantic v2, 패키지 관리는 uv
- 백엔드 테스트: pytest + FastAPI TestClient
- DB: SQLAlchemy 2.0 + Alembic
  - 개발 기본값: SQLite 파일 (backend/dev.db, 설치 없이 바로 실행)
  - 배포: Neon Postgres (psycopg 드라이버)
- 프런트는 화면만 담당. app/api 라우트는 만들지 않음. Zod는 쓰지 않음
- 프런트가 부르는 주소: NEXT_PUBLIC_API_URL (개발: http://localhost:8000)

## 폴더 구조
- app/              : Next.js 페이지
- src/components/   : 화면 컴포넌트 (+ 같은 이름의 .test.tsx)
- src/lib/          : API 호출 함수, 필터·표시용 순수 함수
- src/types/        : 공유 타입
- docs/             : 명세 문서
- backend/app/      : FastAPI 코드 (main, schemas, repository, routers ...)
- backend/tests/    : pytest 테스트
- backend/alembic/  : DB 마이그레이션

## 반드시 참고할 문서
- docs/IDEA.md, docs/PRD.md, docs/TRD.md, docs/DATA_MODEL.md
- docs/API_SPEC.md, docs/COMPONENT_SPEC.md, docs/TEST_CASES.md

## 규칙
- 명세에 없는 기능을 임의로 추가하지 말 것 (IDEA.md의 "지금은 빼는 것" 확인)
- 한 번에 한 기능만 작업하고, 끝나면 무엇을 바꿨는지 요약할 것
- 테스트를 삭제하거나 skip하지 말 것
- 테스트가 실패하면 테스트가 아닌 구현을 고칠 것
- TypeScript any 타입 금지, 파이썬 타입 힌트 필수 / Any 금지
- JSON 필드 이름은 camelCase(createdAt), 파이썬 코드는 snake_case(created_at)
- 에러 응답 형식은 { "error": { "code", "message" } }로 통일
- 실제 개인정보(실명, 실제 전화번호)를 코드·테스트·문서에 넣지 말 것. 테스트 데이터는 가짜로
- .env, .env.local, backend/.env 의 값은 출력하거나 커밋하지 말 것
- console.log, print는 디버깅 후 제거할 것
- 이해할 수 있게 주석은 한국어로 짧게

## 자주 쓰는 명령
- 프런트 개발 서버: npm run dev (http://localhost:3000)
- 프런트 테스트: npm test
- 프런트 빌드 확인: npm run build
- 백엔드 개발 서버: cd backend && uv run fastapi dev app/main.py (http://localhost:8000/docs)
- 백엔드 테스트: cd backend && uv run pytest
- DB 저장소 테스트: cd backend && uv run pytest -m db
- DB 테이블 만들기/갱신: cd backend && uv run alembic upgrade head
