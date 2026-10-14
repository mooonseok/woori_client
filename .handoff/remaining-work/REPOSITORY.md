# 클라이언트 구현 책임

## 현재 경로

- apps/web/src/app: 페이지 진입점. Next.js 정적 export, 동적 서버 기능은 API에 둔다.
- apps/web/src/sections/auth, verify-email, mypage: 가입·로그인·인증과 계정 UI.
- apps/web/src/hooks/use-auth.tsx, services: HttpOnly 세션/계정 전환 경계.
- apps/web/src/sections/groups, invite, albums, album: 그룹·초대·앨범.
- apps/web/src/sections/home: 현재 대표 앨범/최근 앨범. 날짜 기반 추억 선별은 미구현.
- apps/web/src/sections/settings, notifications, hooks/use-web-push.ts,
  services/web-push.ts, public/sw.js: 기기별 푸시·권한 확인·로그아웃 정리.
- apps/admin/src/sections/dashboard: 관리자 준비 화면이며 실제 운영 기능 미구현.

## 작업별 책임

W01: 복구 요청·메일 안내·새 비밀번호·이름 수정 화면. 서버 에러/만료/재시도/중복 제출과
로그아웃된 뒤 재설정 진입, 기존 auth next 보존, token 노출 최소화. 기존 디자인 컴포넌트 재사용.
W02: 명단·권한에 따른 관리 메뉴·탈퇴·이전·삭제 확인. 권한 상실 시 선택 그룹/사진 Blob/알림 캐시 제거.
W03: memories API 소비·날짜 출처 표시·숨김·빈 상태. 홈 그룹 전환과 늦은 응답 격리.
W04: HEIC/처리 대기·부분 실패·재시도 표시, 모바일 사진 선택/저장/핀치·핀 좌표·가이드 실기기 검증.
W05: 이메일/비밀번호 변경·탈퇴·공지/도움말/문의/신고/차단. 파괴적 행동 결과를 구체적으로 설명.
W06: 별도 관리자 로그인·MFA·사용자/그룹/앨범 탐색·사유 입력/감사/운영 상태 UI.
W07: 정적 빌드 환경/도메인 설정·HTTPS 브라우저 E2E·설치형 웹 알림·가족 사용 검증.
W08: Capacitor 플랫폼·링크·네이티브 인증 저장/푸시·사진 권한·서명 빌드/스토어 자산.

## 서버와 맞출 것

서버 contracts/openapi.json이 계약 정본. 제안 API를 구현된 것으로 하드코딩하지 않는다.
DTO의 optional/null, error code, 버전 충돌, 날짜/타임존, 권한 capability를 확인한다.
UI가 메뉴를 숨겨도 보안은 서버에서 재검사해야 한다.
권한 거절을 빈 목록으로 변환하거나 demo 데이터로 대체하지 않는다.

## 검증

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm check:boundaries
pnpm format:check
# 같은 checkout의 dev와 동시에 실행 금지
pnpm build
node --test .handoff/remaining-work/lifecycle.test.mjs
```

기준선: 기능 테스트 61개, 웹/관리자 production build 통과. 새 환경 재검증 필요.
브라우저는 두 계정·비회원, 모바일 폭/키보드/reduced-motion, 로그인 전후 초대/알림 링크를 확인한다.
