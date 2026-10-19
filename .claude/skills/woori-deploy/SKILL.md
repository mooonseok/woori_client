---
name: woori-deploy
description: 사용자가 요청한 배포의 사전 검사·호환 순서·상태 확인과 복구 절차를 수행한다.
disable-model-invocation: true
---

1. 사용자가 요청한 배포 대상·환경·도메인·이전 버전을 확인한다. 회원·관리자 웹은 Cloudflare Pages로 확정됐으며, 실제 프로젝트 생성·배포는 승인된 범위에서만 한다.
2. pnpm policy:quality와 해당 UI 흐름을 검증한다. HTTPS API 주소·CORS·쿠키 도메인·공개 환경변수만 확인한다.
3. 기존 static export 및 Capacitor 제약과 기능 호환성을 확인하고 호환되는 서버가 먼저 준비되었는지 확인한다.
4. 요청된 배포만 수행하고 로그인→그룹→초대 진입을 확인한다. 실패 시 이전 정적 배포로 복구한다.
5. 모바일 패키지 생성과 앱스토어 제출은 별도 요청 범위다. 미구현 기능을 배포 완료로 표시하지 않는다.

출처: woori approved deployment architecture. 원본 절차를 프로젝트에 맞게 재작성했으며 프레임워크 구조/명명 규칙은 가져오지 않았다.
