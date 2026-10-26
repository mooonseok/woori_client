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

## 작업 흐름과 완료 조건

- 메인 에이전트가 원래 요구사항·수용 기준·수정 범위·기준 커밋/기존 diff를 정리하고 작업을 조율한다. 단순한 작업은 단일 에이전트로 처리한다.
- 위임할 때 위 입력과 허용 파일·금지 작업·검증 명령을 전달한다. 독립 조사는 병렬로 하되 같은 파일의 수정 담당은 한 명으로 고정한다. 검토 담당은 구현 담당과 분리한다.
- 조사 결과로 영향 범위와 검사 선택이 설명되면 구현한다. 검토자는 구현 요약뿐 아니라 원래 요구사항과 실제 diff·호출부를 확인하고, 수정은 구현 담당에게 돌려보낸다.
- 저장소 루트에서 `pnpm harness:check`, 선택한 `pnpm harness:verify --profile <이름> --dry-run`으로 실행 조건과 명령을 확인한다. 프로필과 보고 방식은 woori-verify를 따른다.
- 완료 전 실제 변경에 필요한 검사와, 위임/고위험 작업의 독립 검토 결과를 대조한다. `pass`, `fail`, `blocked`, `not-run`을 구분하고, 환경 때문에 실행하지 못한 검사는 통과로 처리하지 않는다.
- 실패는 재현 명령·기준 상태의 결과로 이번 회귀/기존 실패/환경 문제/미확인을 구분한다. 같은 실패가 두 번 반복되면 원인·시도·다음 선택지를 정리하고 무작정 재시도하지 않는다. 테스트 삭제·기대값 완화로 실패를 숨기지 않는다.
- 하네스 실행은 커밋·push·PR 병합·배포·운영 데이터 변경 권한을 부여하지 않는다. 이 작업들은 사용자 요청 범위를 별도로 따른다.

## 위임 및 집행

- 대량 탐색은 code-explorer, 긴 검사 로그는 verification-runner, 보안 검토는 security-reviewer에 위임 가능하다.
- .claude/agents와 .codex/agents는 동일 역할을 각 도구 형식으로 정의한다. Codex 모델·샌드박스·승인 정책은 부모 세션에서 상속한다. 읽기 전용 역할 설명은 별도 권한 격리가 아니다.
- 위임 결과는 결론·파일/행 근거·검사 결과·실패 이유·미확인 사항으로 요약한다.
- pnpm policy:install은 저장소 로컬 Git 훅을 설치한다. 기존 다른 hooksPath는 덮어쓰지 않는다.
- pnpm policy:check는 파일 연결·정적 설정, policy:test는 fixture 차단을 검증한다. 실제 Codex 역할 로딩과 훅 신뢰/활성화는 프로젝트 루트 세션에서 별도 확인한다.
- Codex/Claude 훅 사용·검증·해제: .claude/skills/woori-verify/references/policy-operations.md.
- 로컬 훅은 우회 불가능한 보안 경계가 아니다. CI 설정 파일만으로 원격 필수 검사가 활성화되지는 않는다.

## 코드 포맷

- pnpm format으로 전체 포맷, pnpm format:check로 검사한다. Prettier 확장 설치 시 저장에도 적용된다.
- 커밋 훅은 완전히 스테이징한 파일을 자동 포맷한다. 부분 스테이징 파일에 포맷이 필요하면 변경을 보존하고 차단한다.
- push와 CI는 포맷 불일치를 차단한다. 마이그레이션·생성 파일·잠금 파일은 자동 포맷하지 않는다.

<!-- WOORI_TEMP_HANDOFF_START -->

## 임시 작업 인계 (2026-10-14 사용자 승인 예외)

- 남은 작업을 시작할 때 `.handoff/remaining-work/README.md`와 `status.json`을 먼저 읽는다.
- 이 폴더의 계획 문서만 이번 레포 내 보관 예외다. 미래 작업 승인·DB 적용 권한은 별도로 확인한다.
- 각 작업 완료 시 실제 검증 근거를 status.json에 기록하고 `node .handoff/remaining-work/lifecycle.mjs status`를 실행한다.
- 전체 완료 및 영구 사실 이관 후 CLEANUP.md에 따라 cleanup dry-run → 명시적 `--apply`로 임시 자료를 정리한다.
- 일부 기능 완료/단순 완료 발언만으로 삭제하지 않는다. 정리 명령은 코드·환경·DB·R2·다른 저장소를 변경하지 않는다.

<!-- WOORI_TEMP_HANDOFF_END -->
