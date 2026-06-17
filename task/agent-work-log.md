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
