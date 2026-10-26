# 프런트엔드 Codex·Claude 공통 작업 체계 구성

- 작업일: 2026-10-27
- 요청: 백엔드에 구성한 작업 체계를 프런트엔드에 맞춰 적용하고 `main`에 push.
- 이슈·PR: 별도 생성 없이 사용자가 지정한 `main`에 문서만 반영.
- 구현 확인 기준: `dev@e47b63b2c546dd5ff3d3b327b0299c5453b3342d`.
- 반영 기준: 초기 `main@30d469049eaf10a431dcc187d61471bd253fe369`. 기존 `dev` 작업 공간은 유지하고 별도 작업 공간에서 문서 구성.

## 배경과 목표

팀은 Codex와 Claude를 함께 쓴다. 백엔드와 같은 문서 입구·범위·정본·검증 기록을 사용하되 프런트엔드의 FSD·UI·MSW·API 계약과 실제 검증 명령을 안내한다. `dev`의 앱 구현 전체를 `main`에 통합하는 일은 이번 범위에 포함하지 않는다.

## 판단과 근거

- 백엔드의 17개 파일 구성을 재사용하고 공통 규칙은 `AGENTS.md`, Claude 진입점은 `@AGENTS.md` 한 줄로 유지한다. 중복 규칙 사본을 만들지 않는다.
- Java·DB·Flyway 지침 대신 기존 FSD, 공통 UI·토큰, TanStack Query·Zustand·axios, 타입·라우트·MSW 호출부를 함께 확인하도록 바꾼다.
- Notion 기능명세·PRD·Engineering Requirements Document·API·DB ERD는 원본 링크로 연결한다. 연결 도구에서 다섯 문서 입구를 조회했다. 개별 기능·계약 전체를 재감사하거나 원문을 수정하지 않았다.
- `[목 전용]`·`[경로 제안]`, 예약/웨이팅 취소 철자, SSE·polling, 회원 식별, 목 결제와 실제 연동의 구분은 확인한 코드에서 가져왔다.
- `main`에는 실행 코드가 없으므로 구현 근거는 확인한 `dev` 커밋의 GitHub 링크로 연결한다. 자동 지침 로딩은 파일이 있는 체크아웃에만 적용된다고 명시한다.
- 기존 `main` README의 브랜치·머지 안내는 보존한다. `feature/`와 `feat/` 차이는 미결정 안내에 남기고 새 팀 규칙으로 통일하지 않는다. 이번 직접 push는 사용자 요청에 따른 예외다.
- 중요한 변경에 work-log를 쓰고 작은 변경은 PR로 설명한다. 기록 검사 CI는 백엔드의 라벨 방식 예제를 그대로 둔다. 개인 SSoT는 저장소 밖에서 사용할 빈 양식으로만 제공한다.

근거: `project-workflow-template.zip`, 백엔드의 `15463fc` 문서 구성, 프런트엔드 `main`·`dev` README·package/lock·Vite/env·도메인 타입·axios·MSW·알림·웨이팅 훅을 확인했다. OpenAI·Claude 공식 문서에서 지침 로딩과 import 방식을 확인했다. 원격 기본 브랜치와 보호 상태는 GitHub API로 조회했다.

## 실제 변경

- 공통 지침·Claude import, README 입구·실행 안내, 프로젝트 기준·협업 절차.
- 프런트엔드용 이슈·PR·AI 작업 지시·work-log 양식과 기록 규칙.
- 실제 발견한 브랜치 안내·목 계약·인증·검증 환경·배포 연결의 확인할 사항.
- 비활성 기록 검사 CI, 개인 SSoT 양식, 개인 Claude 설정의 Git 제외.

## 검증

앱 검사는 기존 `dev@e47b63b` 체크아웃에서 Node.js `v26.12.0`·npm `11.20.0`으로 수행했다. 문서·양식 검사는 문서 전용 작업 공간에서 수행했다. 앱 코드·의존성·활성 CI는 이번 변경에 포함하지 않는다.

| 확인한 내용 | 실제 명령·방법과 환경 | 결과·근거 |
| --- | --- | --- |
| 잠금 파일 설치 | `npm ci --no-audit --no-fund` | 종료 코드 0. package·lock 변경 없음. 보안 감사는 포함하지 않음 |
| 린트 | `npm run lint` | oxlint 종료 코드 0 |
| 타입·프로덕션 빌드 | `npm run build` | `tsc -b && vite build` 종료 코드 0. Vite 8.3.0, 2,366개 모듈 변환 |
| 상대 링크·앵커 | Python 표준 라이브러리로 대상 파일·Markdown 제목 대조 | 41곳 통과 |
| 구현 근거 링크 | Git 객체에서 고정한 `dev` 커밋의 파일·디렉터리·앵커 대조 | 15곳 통과. 존재하지 않는 `main` 앱 경로로 연결하지 않음 |
| 이슈·선택 CI YAML | Ruby 2.6 / Psych의 `YAML.safe_load`와 설정 assert | 2개 문서 통과. 이벤트·최소 권한·고정 SHA 확인 |
| 선택 CI의 판정 | YAML에서 실제 JavaScript를 추출해 Node.js로 실행. GitHub API·context·core는 대역 사용 | 15개 사례 통과. 실제 GitHub Actions 실행과 구분 |
| 공통 지침 연결·개인 설정 | Claude import 내용·대상 확인, `git check-ignore` | `@AGENTS.md` 한 줄과 대상 존재, 개인 Claude 파일 2개 제외 확인 |
| 기존 내용·변경 범위 | `main` README의 브랜치·머지 절 대조, `.gitignore` 기존 내용 대조, 기존 `dev` Git 상태 확인 | 17개 문서·양식·ignore 파일만 변경/추가. 기존 Git 규칙 보존, `dev` 추적 파일 변경 없음, 활성 워크플로 0개 |
| 공백·개행 | `git diff --check`, 신규 파일의 `git diff --no-index --check`, UTF-8·코드 블록 검사 | 오류 없음 |

CI 판정은 라벨 없음·무관한 라벨, 필수 기록 누락, 기록 추가·수정·이름 변경·삭제, README·빈 양식만 변경, 폴더 밖·중첩 경로·다른 확장자·폴더 밖으로 이동, 유효 기록과 다른 변경 혼합, API 오류 전파를 확인했다. 검사 예제는 백엔드와 바이트 단위로 동일하다. 고정한 actions/github-script 커밋도 GitHub API에서 존재를 확인했다.

검사 스크립트는 저장소 밖 임시 폴더에서 실행했으며 공유 의존성·테스트 실행기를 추가하지 않았다. 설치·lint·build 전체 출력은 `test-build-log-summary`의 개별 임시 로그로 보존했다. 문서화한 최소 Node 버전에서 별도 실행하지는 않았다.

## 남은 점과 후속 작업

문서 묶음은 `main`에만 반영한다. `dev`의 자동 지침 로딩·이슈/PR 양식 적용은 별도 반영이 필요하다. 각 팀원의 실제 도구 로딩·Notion 권한은 확인하지 않았다.

이번 작업에서 브라우저 화면·실제 백엔드·PG 결제·SSE·배포와 GitHub Actions 실행은 확인하지 않는다. 로컬 정적 검사는 화면 검증을 대신하지 않는다. 선택 CI는 기록 파일 존재만 검사하므로 내용의 정확성은 리뷰가 필요하다.
