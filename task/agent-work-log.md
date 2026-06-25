2026-06-17 Admin audit log IP-first filtering and detail UX

- Purpose: shift the admin audit log screen toward IP-based tracing, replace free-text action/target filters with dropdowns, and keep change summaries readable without exposing raw JSON snapshots.
- Changed files: `src/pages/admin/AdminLogsPage.vue`, `src/lib/admin-audit-log-utils.js`, `src/lib/admin-organizations.js`, `test/admin-audit-logs.test.js`, `test/admin-organizations.test.js`.
- Behavior:
  The list now filters by `ipAddress`, action type, target type, result, and date range, with `targetId` kept behind an advanced filter.
  The table now emphasizes `작업자 IP` and moves the actor name into secondary text.
  The detail modal now separates `변경 내용`, `작업 정보`, `대상 정보`, and `추가 정보`, while continuing to hide raw JSON snapshots.
  Organization/position UUID fields in change summaries are resolved to master-data names when possible, with safe fallbacks and original IDs only in auxiliary tooltip text.
- Verification:
  Passed `npm test`
  Passed `npm run build`

2026-06-18 User suggestion IME immediate-trigger fix

- Purpose: fix the member suggestion dropdown so one completed Hangul syllable such as `김` or `짱` starts the debounced suggestion request immediately, instead of waiting for blur, Enter, or another follow-up motion.
- Changed files: `src/composables/useUserSuggestions.js`, `src/components/common/MemberPicker.vue`, `src/components/common/UserDirectoryPanel.vue`, `src/components/mail/ComposeModal.vue`, and this log.
- Behavior:
  The shared suggestion composable now tracks an `observedKeyword` stream in addition to the `v-model` ref so the suggestion debounce can react to the input element's visible value during Hangul IME composition.
  Added shared `handleSuggestionInput` wiring to the admin member search, reusable attendee picker, and mail recipient input through `@input`, `@compositionupdate`, and `@compositionend`.
  Existing rules stay the same: one completed Hangul syllable or one Latin/number character can trigger suggestions, standalone Hangul jamo still do not, Enter only selects the highlighted item, and selection still clears/updates the field through the existing callbacks.
- Verification:
  Passed `npm test`
  Passed `npm run build`
  Installed local Playwright Chromium runtime for follow-up browser checks, but no authenticated end-to-end verification was completed in an isolated headless context because the current logged-in in-app browser session is not shared with that runtime.

2026-06-19 회의 팝업 라우팅 수정 및 조기 입장 제한

- 작업 목적: 회의 입장 팝업이 `/app/dashboard`로 잘못 이동하던 문제를 수정하고, 예약 회의는 시작 15분 전부터만 입장할 수 있도록 화면 단 안내와 서버 응답 처리를 맞춘다.
- 변경 파일: `src/router/index.js`, `src/lib/meeting-route.js`, `src/pages/meetings/MeetingsPage.vue`, `src/pages/rooms/RoomsPage.vue`, `src/pages/meeting/MeetingPage.vue`, 이 작업 기록 파일.
- 동작 변경:
  중복 선언되어 있던 `/app/meeting` 라우트 중 `meta.role: 'user'` 경로를 제거해, 실제 `USER` 세션이 회의 팝업 진입 시 권한 가드에 걸려 `/app/dashboard`로 튕기지 않도록 수정했다.
  회의 시작 시각을 알고 있는 화면에서는 팝업 오픈 전에 공통 가드를 먼저 거쳐, 15분보다 이르면 `회의 시작 15분 전부터 입장할 수 있습니다.` 알림을 띄우고 팝업을 열지 않는다.
  회의 목록과 회의실 상세 진입 버튼은 예약 시작 시각 정보를 함께 넘겨 같은 제한 규칙을 사용한다.
  사용자가 직접 회의 로비 URL에 들어온 경우에도 백엔드가 `MEETING_JOIN_TOO_EARLY`를 반환하면 로비 화면에 그대로 머물면서 같은 안내 문구를 보여주고 LiveKit 연결은 진행하지 않는다.
 - 검증:
  통과: `npm run build`

2026-06-22 회의 종료/취소 입장 차단 및 예정 종료 시각 허용

- 작업 목적: 회의가 `ENDED` 또는 `CANCELLED` 상태일 때만 입장을 차단하고, `scheduledEndAt`이 지나더라도 진행 중인 회의는 계속 입장할 수 있도록 정리한다.
- 변경 파일: `src/pages/meeting/MeetingPage.vue`, `src/pages/rooms/RoomsPage.vue`, `src/pages/meetings/MeetingsPage.vue`, `src/lib/meeting-route.js`, `meetbowl-be/application/src/main/java/com/meetbowl/application/meeting/JoinMeetingUseCase.java`, `meetbowl-be/docs/api-spec.md`, 이 작업 기록 파일.
- 동작 변경:
  회의 입장 로직은 종료/취소 상태만 차단하고, 예약 종료 시각 초과만으로는 더 이상 입장을 막지 않는다.
  회의 로비는 그대로 유지하고, 직접 진입했을 때도 종료/취소 회의만 진입이 차단되도록 맞췄다.
  취소된 회의는 프런트에서 종료 화면으로 정리해 사용자가 로비로 다시 진입했다고 오해하지 않게 했다.
- 검증:
  코드 확인 완료, 별도 빌드는 아직 수행하지 않음.

2026-06-22 회의 종료 상태 저장 보강

- 작업 목적: 호스트가 회의 종료 확인에서 종료 버튼을 눌렀을 때 DB 상태가 `ENDED`로 확정되도록 하고, `meeting.ended` 이벤트 발행 실패가 종료 상태 저장을 되돌리지 않게 한다.
- 변경 파일: `src/pages/meeting/MeetingPage.vue`, `meetbowl-be/application/src/main/java/com/meetbowl/application/meeting/EndMeetingUseCase.java`, `meetbowl-be/application/src/test/java/com/meetbowl/application/meeting/EndMeetingUseCaseTest.java`, 이 작업 기록 파일.
- 동작 변경:
  회의 종료 API 성공 후에는 `meeting.ended` 브로드캐스트가 실패해도 회의 종료 상태는 그대로 유지된다.
  프런트 종료 버튼은 종료 API 성공을 우선 기준으로 삼고, DataChannel 송신 실패는 종료 자체를 막지 않는다.
- 검증:
  프런트 `npm run build` 통과.
  백엔드 `./gradlew :application:compileJava` 통과.

2026-06-22 인증 세션 자동 갱신 및 access token 수명 연장

- 작업 목적: 사용 중 세션이 15분마다 끊기는 체감을 줄이고, 로그인 상태가 유지되는 동안에는 access token을 자동으로 갱신해 끊김 없이 쓰게 한다.
- 변경 파일: `src/main.js`, `src/lib/api-client.js`, `src/lib/auth-session.js`, `src/stores/auth.js`, `meetbowl-be/app-api/src/main/resources/application.properties`, `meetbowl-be/.env.example`, 이 작업 기록 파일.
- 동작 변경:
  access token 기본 만료 시간을 15분에서 60분으로 늘렸다.
  프런트는 access token 만료 1분 전에 자동으로 `/auth/token/refresh`를 호출해 세션을 갱신한다.
  API 호출이 만료로 401을 받더라도 refresh token으로 한 번 재시도한다.
- 검증:
  프런트 `npm run build` 통과.
  백엔드 `./gradlew :app-api:compileJava` 통과.

2026-06-22 회의 자막 번역 탭 혼합 문자 정제

- 작업 목적: 회의 자막의 `KOR`/`ENG` 탭에서 한글과 영어가 섞여 보이는 문제를 줄인다.
- 변경 파일: `meetbowl-stt/src/transcript/display-text-builder.ts`, `meetbowl-stt/test/display-text-builder.test.ts`, 이 작업 기록 파일.
- 동작 변경:
  번역 탭은 출력 직전에 타겟 언어와 반대되는 문자 범위를 제거한다.
  원문 탭은 그대로 두고, `KOR`/`ENG` 탭만 정제된 텍스트를 보여준다.
- 검증:
  `meetbowl-stt` `npm test` 통과.
  `meetbowl-stt` `npm run build` 통과.

2026-06-22 회의 입장 same-tab 전환 및 목록 자동 새로고침

- 작업 목적: 회의 탭과 회의실 화면에서 회의 입장이 메인 회의 페이지로 안정적으로 이어지게 하고, 호스트 종료 후 회의 목록에 종료 상태가 남도록 새로고침 타이밍을 보강한다.
- 변경 파일: `src/pages/meeting/MeetingPage.vue`, `src/pages/meetings/MeetingsPage.vue`, `src/pages/rooms/RoomsPage.vue`, 이 작업 기록 파일.
- 동작 변경:
  회의 페이지 자체에서 진입 직후 팝업으로 다시 승격시키던 자동 분기를 제거해, `/app/meeting/:meetingId` 진입 시 현재 탭에서 바로 대기실과 회의실을 사용하도록 바꿨다.
  회의 탭과 회의실 상세의 `회의 입장` 버튼은 더 이상 팝업을 열지 않고 같은 탭에서 회의 페이지로 이동한다.
  회의 탭 목록은 창 포커스 복귀나 탭 가시성 복귀 시 다시 조회해, 호스트가 회의를 종료한 뒤 배경 목록 화면이 stale 상태로 남지 않게 했다.
- 검증:
  통과: `npm run build`

2026-06-22 회의 언어 서브탭 UX 및 로그아웃 예외 정리

- 작업 목적: 회의 자막 언어 전환을 실제 서브탭처럼 보이도록 개선하고, 토큰 만료 상태에서 로그아웃 시 401 예외가 콘솔에 남는 문제를 제거한다.
- 변경 파일: `src/pages/meeting/MeetingPage.vue`, `src/styles/main.css`, `src/stores/auth.js`, 이 작업 기록 파일.
- 동작 변경:
  회의 원문 영역 안의 `원문 / KOR / ENG` 버튼을 독립 패널 안의 서브탭 구조로 재배치해 현재 선택 탭이 더 분명하게 보이도록 했다.
  탭 설명과 상태 문구를 패널 헤더로 올리고, 같은 자막 타임라인은 유지하되 시각적으로는 탭 안의 탭처럼 인지되게 조정했다.
  `/auth/logout` 호출이 401 또는 403을 반환하더라도 세션 정리는 그대로 수행하고, 불필요한 콘솔 예외는 더 이상 전파하지 않도록 했다.
- 검증:
  통과: `npm run build`

2026-06-22 회의 원문 언어 탭 복원 및 종료 화면 유지

- 작업 목적: 회의 원문 패널 안에서 `원문 / KOR / ENG` 전환을 다시 살리고, 회의 종료 시 화면이 초기화되면서 사라지지 않도록 정리한다.
- 변경 파일: `src/pages/meeting/MeetingPage.vue`, 이 작업 기록 파일.
- 동작 변경:
  회의 자막 패널 내부에 언어 탭을 다시 배치해서 같은 자막 타임라인을 원문, 한국어, 영어로 전환해서 볼 수 있게 했다.
  호스트 종료나 `meeting.ended` 수신 후에는 회의 상태를 초기화하더라도 종료 화면은 유지하도록 분리했다.
  팝업 회의 창에서는 종료 화면을 잠깐 보여준 뒤 닫기를 시도해, 가능하면 창이 닫히고 아니면 종료 화면으로 남도록 했다.
- 검증:
  통과: `npm run build`

2026-06-22 회의 번역 UI 별도 영역 복원

- 작업 목적: 회의 화면에서 번역 결과를 다시 보여주되, 원문과 섞이지 않도록 별도 영역으로 분리한다.
- 변경 파일: `src/pages/meeting/MeetingPage.vue`, `src/styles/main.css`, `src/lib/caption-store.js`, `test/caption-store.test.js`, 이 작업 기록 파일.
- 동작 변경:
  원문 자막과 번역 자막을 각각 독립된 섹션으로 렌더링한다.
  원문 섹션은 기존 `caption.text`를 그대로 보여주고, 번역 섹션은 STT가 만든 `koText`/`enText` 중 원문 언어에 맞는 번역 결과를 따로 보여준다.
  번역 결과가 없을 때는 빈 영역 대신 안내 문구를 표시한다.
- 검증:
  통과: `npm run build`

2026-06-22 회의 번역 탭 완전 제거

- 작업 목적: 메인 회의 화면에서 원문/번역 전환 UI를 완전히 없애고, 자막은 단일 스트림만 노출되도록 정리한다.
- 변경 파일: `src/pages/meeting/MeetingPage.vue`, `src/styles/main.css`, `src/lib/caption-store.js`, `test/caption-store.test.js`, 이 작업 기록 파일.
- 동작 변경:
  회의 자막 패널에서 언어 전환 버튼과 관련 표시 분기를 제거했다.
  화면은 다시 `caption.text` 기반의 단일 자막 스트림만 렌더링한다.
  번역 후보 데이터(`koText`, `enText`)는 payload에 남아 있을 수 있지만 화면에서는 노출하지 않는다.
- 검증:
  통과: `npm run build`
  실패(기존 브랜치 이슈): `npm test`
 실패 대상: `test/admin-audit-logs.test.js`, `test/admin-dashboard.test.js`, `test/admin-mail-retention-policy.test.js`, `test/admin-organizations.test.js`, `test/api-client.test.js`
 실패 원인: 이번 회의 입장 수정과 무관한 기존 API client/admin 테스트 기대값 불일치다.

2026-06-22 회의 원문 번역 탭 및 서버 기준 종료 연동

- 작업 목적: 메인 회의 화면에서 원문/한국어/영어 자막 전환을 지원하고, 서버가 종료를 확정했을 때 모든 참여자가 같은 종료 화면으로 정리되도록 프론트 표시를 맞춘다.
- 변경 파일: `src/lib/caption-store.js`, `src/pages/meeting/MeetingPage.vue`, `test/caption-store.test.js`, 이 작업 기록 파일.
- 동작 변경:
  `caption.updated` payload의 `sourceText`, `koText`, `enText`를 화면 상태에 보존하고, 회의 원문 패널 안에서 `원문`, `한국어`, `영어` 탭으로 같은 segment 타임라인을 전환해 볼 수 있게 했다.
  번역문이 아직 없는 segment는 빈 줄로 남기지 않고 원문으로 자연스럽게 폴백한다.
  호스트가 종료 API를 호출한 뒤에는 프론트가 직접 종료 DataChannel을 authoritative하게 보내지 않고, 서버가 보낸 `meeting.ended` 이벤트를 기준으로 `해당 회의는 종료되었습니다.` 화면과 시스템 채팅 문구를 맞춘다.
- 검증:
  통과: `npm run build`
  부분 통과: `npm test -- caption-store.test.js`
  실패(기존 브랜치 이슈 포함): 위 명령은 전체 `node --test test/**/*.test.js`를 함께 실행하는 현재 package script 구조상 기존 admin/api-client 테스트 5건도 같이 실패한다.
  이번 변경 직접 검증: `caption-store.test.js`에 추가한 번역 탭용 자막 선택 테스트는 통과했다.

2026-06-22 회의 원문 번역 탭 가시성 보정

- 작업 목적: 번역 모드 전환 버튼이 실제 탭처럼 보이지 않아 혼동을 준다는 피드백을 반영해, 회의 원문 패널의 언어 전환 UI를 더 명확하게 보이도록 다듬는다.
- 변경 파일: `src/styles/main.css`, 이 작업 기록 파일.
- 동작 변경:
  `원문 / 한국어 / 영어` 전환 영역을 pill 형태의 segmented control로 바꿔 현재 선택 모드가 더 분명하게 보이도록 했다.
  기능은 그대로 유지하고, 데이터 분리는 기존 `captionDisplayMode`/`selectCaptionTextByMode` 로직을 그대로 사용한다.
- 검증:
  통과: `npm run build`

2026-06-22 프론트 개발 서버 localhost 바인딩 안정화

- 작업 목적: 로컬 실행 시 `:5173`에서 `502 Bad Gateway`, `vite http proxy error`, `favicon 404`가 반복되어 회의 입장 흐름이 흔들리는 문제를 줄인다.
- 변경 파일: `vite.config.js`, 새 `public/favicon.svg`, 이 작업 기록 파일.
- 동작 변경:
  Vite dev/preview 서버를 `0.0.0.0`에 바인딩하고 API 프록시 타깃을 `127.0.0.1:8080`으로 고정해 macOS에서 `localhost`가 `::1`로만 해석될 때 생기던 접속 불안정을 줄였다.
  기본 파비콘 파일을 추가해 개발 중 반복되던 `favicon` 404를 제거했다.
- 검증:
  통과: `npm run build`

2026-06-22 회의 종료/입장 기준 조정

- 작업 목적: 예약 종료 시각이 지났다는 이유만으로 회의 입장을 막지 않고, 실제 `ENDED` 상태만 종료로 취급하도록 회의 목록과 입장 조건을 정리한다.
- 변경 파일: `src/pages/meetings/MeetingsPage.vue`, `src/pages/rooms/RoomsPage.vue`, `meetbowl-be/application/src/main/java/com/meetbowl/application/meeting/JoinMeetingUseCase.java`, `meetbowl-be/application/src/test/java/com/meetbowl/application/meeting/JoinMeetingUseCaseTest.java`, 이 작업 기록 파일.
- 동작 변경:
  회의 목록과 회의실 상세에서 `scheduledEndAt` 초과만으로 종료 판정을 내리지 않도록 바꿨다.
  회의실 요약 카드도 예정 종료 시각으로 추가 필터링하지 않아, 실제로 진행 중인 회의는 종료 예정 시간이 지나도 그대로 보인다.
  백엔드 입장 검증은 `ENDED`와 `CANCELLED`만 확실히 막고, `IN_PROGRESS` 상태의 회의는 예정 종료 시각이 지나도 입장할 수 있게 조정했다.
- 검증:
  예정. 프론트 빌드와 STT 테스트는 별도 실행 가능하지만, 이번 수정은 아직 전체 실행 검증을 마치지 않았다.

2026-06-22 회의 종료 브로드캐스트 및 입장 버튼 시간 검증 보강

- 작업 목적: 호스트 종료 후에도 참여자 화면이 그대로 남고, 회의 목록/회의실 목록에서 예약 시간과 맞지 않는 회의에 계속 입장되는 문제를 줄인다.
- 변경 파일: `src/pages/meeting/MeetingPage.vue`, `src/pages/meetings/MeetingsPage.vue`, `src/pages/rooms/RoomsPage.vue`, `src/lib/caption-store.js`, 이 작업 기록 파일.
- 동작 변경:
  호스트가 회의 종료 API를 성공시키면 프론트도 즉시 `meeting.ended` DataChannel을 best-effort로 발행해 다른 참여자 화면이 종료 안내 화면으로 더 빨리 전환되도록 했다.
  회의 목록/회의실 상세에서 예정 종료 시각이 지난 회의와 서버가 `ENDED`/`CANCELLED`로 돌려준 회의는 입장 버튼을 눌러도 종료 안내로 막는다.
  원문 자막 표시 모드는 `sourceTranscript`를 우선 사용하도록 바꿔, 원문 STT가 들어왔는데 `sourceText`/번역 후보보다 덜 잘 보이던 상황을 줄였다.
- 검증:
  통과: `npm run build`

2026-06-23 회의록 조회·편집·승인 API 연결

- 작업 목적: `내 회의록` 화면을 mock 데이터에서 BE 회의록 API 기반으로 전환하고, 종료 회의에서 해당 회의록 상세로 이동하게 한다.
- 변경 파일: `src/pages/minutes/MinutesPage.vue`, `src/components/minutes/MinuteDetail.vue`, `src/lib/minutes.js`, `src/lib/minutes-content.js`, `src/router/index.js`, `src/pages/meetings/MeetingsPage.vue`, `src/styles/main.css`, `test/minutes-content.test.js`, 이 작업 기록 파일.
- 동작 변경:
  `GET /minutes` 목록, `GET /meetings/{meetingId}/minutes` 상세, `PATCH /meetings/{meetingId}/minutes` 수정, `POST /meetings/{meetingId}/minutes/approve` 승인, 즐겨찾기 등록/해제를 실제 API로 호출한다.
  종료된 회의의 `내 회의록 보기`는 `/app/minutes/{meetingId}`로 이동한다.
  AI 회의록 본문은 `minutes.content` Tiptap JSON에서 평문을 추출해 표시하고, 원문 STT는 `GET /meetings/{meetingId}/transcripts`를 별도 버튼으로 조회해 분리했다.
- 제한 사항:
  Tiptap editor 패키지가 아직 없어 본문 편집은 Tiptap JSON textarea로 연결했다. 리치 텍스트 편집기는 별도 단계에서 붙여야 한다.
- 검증:
  통과: `npm run build`, `npm test`.

2026-06-23 회의록 Tiptap 리치 텍스트 편집기 도입

- 작업 목적: 회의록 본문 편집을 Tiptap JSON textarea에서 실제 리치 텍스트 editor로 교체한다.
- 변경 파일: `package.json`, `package-lock.json`, `src/components/minutes/MinutesEditor.vue`, `src/components/minutes/MinuteDetail.vue`, `src/lib/minutes-content.js`, `src/styles/main.css`, `test/minutes-content.test.js`, 이 작업 기록 파일.
- 동작 변경:
  `@tiptap/vue-3`, `@tiptap/starter-kit`을 추가하고 회의록 본문 편집 시 굵게/목록/제목 toolbar가 있는 editor를 표시한다.
  editor는 Tiptap JSON을 그대로 읽고 저장하므로 BE `minutes.content` 계약은 유지된다.
  editor chunk는 async component로 분리해 회의록 상세 보기만 할 때 초기 bundle에 Tiptap 본문 코드를 싣지 않는다.
  `npm audit fix`로 기존 Vite 취약점 패치 버전도 함께 반영했다.
- 검증:
  통과: `npm run build`, `npm test`, `npm audit --omit=dev`, `git diff --check`.

2026-06-25 회의록 조회 화면 Tiptap 서식 보존

- 작업 목적: AI가 생성한 heading, bold, 목록 서식이 회의록 조회 화면에서 평문으로 변환되어 소제목 굵기가 사라지는 문제를 해결한다.
- 변경 파일: `src/components/minutes/MinutesEditor.vue`, `src/components/minutes/MinuteDetail.vue`, `src/pages/minutes/MinutesPage.vue`, `src/styles/main.css`, 이 작업 기록 파일.
- 동작 변경:
  조회 화면도 `minutes.content` Tiptap JSON을 읽기 전용 editor로 렌더링한다.
  읽기 전용 모드에서는 편집 toolbar와 입력 동작을 숨기고, `h1`, `h2`, `h3`의 크기·굵기·간격을 명시적으로 적용한다.
  조회용 평문 추출 상태인 `contentText`와 `<pre>` 렌더링을 제거해 heading, bold mark, bullet list 구조를 보존한다.
- 검증:
  통과: `npm test` 101개, `npm run build`, `git diff --check`.
  브라우저 자동 화면 검증은 브라우저 연결 환경 오류로 수행하지 못했다.

2026-06-25 회의록 PDF 다운로드 구현

- 작업 목적: 회의록 상세 화면의 비활성 상태였던 `PDF 다운로드` 버튼을 실제 PDF 파일 생성·다운로드 기능으로 연결한다.
- 변경 파일: `package.json`, `package-lock.json`, `src/lib/minutes-pdf.js`, `src/components/minutes/MinuteDetail.vue`, `src/styles/main.css`, `test/minutes-pdf.test.js`, 이 작업 기록 파일.
- 동작 변경:
  현재 사용자가 조회한 회의 제목, 일시·시간·참석자·검토자 메타데이터, 요약과 Tiptap 본문을 브라우저에서 A4 PDF로 생성한다.
  한국어 글꼴 깨짐을 막기 위해 HTML을 고해상도 캔버스로 렌더링하고, 긴 문서는 A4 높이에 맞춰 여러 페이지로 분할한다.
  다운로드 파일명은 회의 제목을 사용하되 파일명 금지 문자를 제거하며, 생성 중에는 버튼 중복 클릭을 막고 실패 메시지를 화면에 표시한다.
  AI 기본 본문의 `회의록`, `회의 요약` preamble은 PDF 상단 정보와 중복되지 않도록 내보내기 복제본에서만 제거한다.
- 검증:
  통과: `npm test` 103개, `npm run build`, `git diff --check`.
  Playwright에서 한국어 샘플 PDF를 실제 다운로드했고 PDF 1.3/A4 1페이지 파일 생성을 확인했다.
  브라우저 PDF 뷰어로 제목, 메타데이터, 소제목 굵기, 한글 본문과 bullet list가 깨지지 않는 것을 시각 검증했다.

2026-06-25 회의록 상세 헤더 디자인 정리

- 작업 목적: 회의 제목 아래의 참여자·검토자 정보가 한 줄 텍스트로 뭉쳐 보이고, 우측 액션 버튼 높이가 과도한 문제를 개선한다.
- 변경 파일: `src/components/minutes/MinuteDetail.vue`, `src/styles/main.css`, 이 작업 기록 파일.
- 동작 변경:
  날짜와 회의 시간은 간결한 메타 텍스트로 유지하고, 참여자 수·검토자·상태는 구분되는 pill 형태로 재배치했다.
  즐겨찾기 버튼 크기를 줄이고 hover 배경을 추가했다.
  PDF 다운로드·수정·승인·내부 메일 공유 버튼을 30px 높이의 compact 스타일로 통일했으며, 모바일에서는 세로로 늘어나지 않고 자연스럽게 줄바꿈된다.
- 제한 사항: 현재 회의록 API는 참여자 이름 목록이 아닌 `attendeeCount`만 제공하므로 실제 이름 리스트는 표시하지 않는다.
- 검증: `npm test` 103개, `npm run build`, `git diff --check` 통과.

2026-06-25 회의록 참여자 상세 모달 연결

- 작업 목적: 회의록 상세의 참여자 수를 클릭했을 때 참여자 이름과 역할을 확인할 수 있도록 한다.
- 변경 파일: `src/components/minutes/MinutesParticipantsModal.vue`, `src/components/minutes/MinuteDetail.vue`, `src/styles/main.css`, 이 작업 기록 파일.
- 동작 변경:
  참여자 pill을 버튼으로 전환하고, 클릭 시 `GET /meetings/{meetingId}`로 등록 참석자와 역할을 조회한다.
  각 사용자 요약 API를 통해 이름, 계열사·부서·팀·직급, 이메일을 조립하며 주최자·참여자·검토자 badge를 표시한다.
  로딩, 빈 목록, 조회 실패와 재시도 상태를 모달 내부에서 처리하고 회의 선택이 바뀌면 이전 참여자 캐시를 초기화한다.
- 데이터 기준: 현재 서버에는 LiveKit 실제 접속 이력 원장이 없으므로 모달은 실제 접속자가 아니라 회의에 등록된 참여자를 표시하며 이를 안내 문구로 명시한다.
- 검증: `npm test` 103개, `npm run build`, `git diff --check` 통과.

2026-06-25 회의록 본문 문서형 레이아웃 전환

- 작업 목적: 회의록 요약 카드 안에 본문 카드가 중첩되고 주황색 배경이 적용되어 문서 가독성이 떨어지는 문제를 개선한다.
- 변경 파일: `src/components/minutes/MinuteDetail.vue`, `src/styles/main.css`, 이 작업 기록 파일.
- 동작 변경:
  조회 모드의 주황색 배경, 외곽 border, 내부 회의록 본문 박스를 모두 제거하고 전체 영역을 흰색 문서 레이아웃으로 변경했다.
  회의 요약과 회의록 본문은 독립된 제목과 얇은 구분선만 사용해 자연스럽게 이어지도록 구성했다.
  읽기 전용 Tiptap 본문도 투명/장식 카드가 아닌 흰 배경의 일반 문서처럼 표시한다.
  편집 모드는 입력 영역의 경계를 유지하고 상단에 `편집 중` 상태만 간결하게 표시한다.
- 검증: `npm test` 103개, `npm run build`, `git diff --check` 통과.

2026-06-25 회의록 Tiptap 편집 기능 확장

- 작업 목적: 최소 기능만 제공하던 회의록 편집기를 표를 포함한 실사용 편집기로 확장한다.
- 변경 파일: `package.json`, `package-lock.json`, `src/components/minutes/MinutesEditor.vue`, `src/styles/main.css`, `test/minutes-content.test.js`, 이 작업 기록 파일.
- 추가 기능:
  실행 취소·다시 실행, 본문/제목 1~3, 글자 크기·색상, 굵게·기울임·밑줄·취소선·형광펜, 좌/중앙/우 정렬을 지원한다.
  글머리·번호·체크 목록, 인용문, 구분선, 링크를 지원한다.
  3x3 표 삽입과 행/열 추가·삭제, 셀 병합/분할, 표 삭제를 지원한다.
- 저장 계약: 모든 확장 결과는 기존 `minutes.content` Tiptap JSON 문자열에 저장하므로 BE DB 계약은 변경하지 않는다.
- 조회/PDF: 읽기 전용 회의록과 PDF 출력에 표, 체크 목록, 인용문 스타일을 추가했다.
- 제외 범위: 이미지 삽입과 내부 메일 HTML 서식 보존은 포함하지 않았다.
- 검증: 프로덕션 빌드, 전체 테스트, `git diff --check` 통과. 표 노드의 JSON 유효성과 텍스트 추출 테스트를 추가했다.
