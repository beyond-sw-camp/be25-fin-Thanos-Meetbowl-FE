import { getJson } from './api-client.js'

export function getAdminDashboardSummary() {
  return getJson('/admin/dashboard/summary', {
    skipForbiddenHandler: true,
  })
}
