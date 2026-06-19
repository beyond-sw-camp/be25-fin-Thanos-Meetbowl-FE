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
  실패(기존 브랜치 이슈): `npm test`
  실패 대상: `test/admin-audit-logs.test.js`, `test/admin-dashboard.test.js`, `test/admin-mail-retention-policy.test.js`, `test/admin-organizations.test.js`, `test/api-client.test.js`
  실패 원인: 이번 회의 입장 수정과 무관한 기존 API client/admin 테스트 기대값 불일치다.
