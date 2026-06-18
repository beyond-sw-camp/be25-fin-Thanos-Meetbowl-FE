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
