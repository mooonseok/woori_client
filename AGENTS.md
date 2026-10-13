# 우리 클라이언트 작업 지침

이 파일은 Codex와 Claude가 공유하는 저장소 지침의 정본이다.

## 프로젝트

- Next.js 사용자 웹은 apps/web, 관리자 웹은 apps/admin에 있다.
- src/app은 경로 진입점, sections는 container/view, components는 Atomic 구조다.
- 상태·부수 효과는 hooks/container, 데이터 접근은 services, 표시 요소는 view에 둔다.
- 원시 HTML과 계층 의존성 규칙은 scripts/check-boundaries.mjs를 따른다.
- 기본 실행은 live 모드다. API 실패를 샘플 데이터로 숨기지 않는다.
- 기존 사진 데모는 NEXT_PUBLIC_APP_MODE=demo로 분리한다.
- DB·메일·스토리지 비밀키는 브라우저 코드와 NEXT_PUBLIC 변수에 넣지 않는다.
- 웹 인증은 HttpOnly 쿠키와 credentials:include를 사용한다.
- 세션 변경 시 이전 계정의 그룹·개인 데이터와 오래된 응답이 섞이지 않도록 한다.
- API 계약은 woori_server/contracts/openapi.json이 소유하며 저장소 간 소스를 직접 import하지 않는다.
- 새 화면도 빈 상태·로딩·실패·키보드 접근과 reduced motion을 고려한다.

## 실행과 검증

- nvm use 후 pnpm을 사용한다. 사용자 웹: pnpm dev, localhost:3210.
- 관리자 웹: pnpm dev:admin, localhost:3002. API는 localhost:3001.
- 관련 변경 검증: pnpm lint, pnpm typecheck, pnpm test,
  pnpm check:boundaries, pnpm format:check, pnpm build.
- build 전에 이 저장소의 개발 서버 실행 여부를 확인한다. 같은 .next 산출물을 동시에 쓰지 않는다.
- 화면 변경은 실제 브라우저에서 변경한 흐름과 데스크톱·모바일을 확인한다.
- 현재 구현 범위와 외부 기획 위치는 project.json에서 확인한다.

## 공통 핵심 기준

- 한국어로 실제 코드·검증 결과를 근거로 보고하고 사용자 변경을 보존한다.
- Node는 .nvmrc, pnpm은 packageManager를 따른다. 커밋·push·배포는 요청 범위에 한정한다.
- main/develop 직접 커밋·push, 훅 우회, 비밀값 출력·커밋을 하지 않는다.
- 계획·검토 문서는 대화 또는 ~/.Codex/projects/<project>/plans/에 둔다.
- 지침·스킬·실행 검사 코드는 저장소에 둔다. 기존 폴더 구조/컨벤션을 유지한다.

## 필요한 규칙과 절차 읽기

- 편집 전 .claude/rules/repository-safety.md와 verification.md를 읽는다.
- API/DTO/소비자 변경: .claude/rules/api-contract.md를 읽는다.
- UI/인증 상태 변경: .claude/rules/client-security.md와 interaction-quality.md를 읽는다.

- .claude/skills/<이름>/SKILL.md가 절차 정본이며 .agents/skills에서 같은 파일을 연결한다.
- 기능 구현: woori-implement, 진단: woori-debug, 검증: woori-verify, 리뷰: woori-review.
- API 변경: woori-api-change. 커밋/배포 요청 시 woori-commit/woori-deploy를 명시적으로 사용한다.
- 사진 제스처/온보딩: woori-client-interaction. 접근성: woori-client-accessibility.

## 위임 및 집행

- 대량 탐색은 code-explorer, 긴 검사 로그는 verification-runner, 보안 검토는 security-reviewer에 위임 가능하다.
- .claude/agents와 .codex/agents는 동일 역할을 각 도구 형식으로 정의한다. 모델은 상속한다.
- 위임 결과는 결론·파일/행 근거·검사 결과·실패 이유·미확인 사항으로 요약한다.
- pnpm policy:install은 저장소 로컬 Git 훅을 설치한다. 기존 다른 hooksPath는 덮어쓰지 않는다.
- pnpm policy:check / policy:test로 연결과 실제 차단을 검증한다. 상세 실행 한계는 아래 절차를 읽는다.
- Codex/Claude 훅 사용·검증·해제: .claude/skills/woori-verify/references/policy-operations.md.
- 로컬 훅은 우회 불가능한 보안 경계가 아니다. CI 설정 파일만으로 원격 필수 검사가 활성화되지는 않는다.
