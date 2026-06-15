import { getJson } from './api-client.js'

export function getAdminDashboardSummary() {
  // 관리자 대시보드는 페이지 내부에서 403 상태를 직접 렌더링한다.
  return getJson('/admin/dashboard/summary', {
    skipForbiddenHandler: true,
  })
}
