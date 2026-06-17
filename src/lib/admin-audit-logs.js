import { getJson } from './api-client.js'

const adminRequestOptions = {
  // 관리자 화면은 자체적으로 403 상태를 처리하므로 전역 권한 핸들러는 건너뛴다.
  skipForbiddenHandler: true,
}

export function getAdminAuditLogs(params = {}) {
  return getJson(`/admin/audit-logs${buildQuery(params)}`, adminRequestOptions)
}

export function getAdminAuditLogDetail(auditLogId) {
  return getJson(`/admin/audit-logs/${auditLogId}`, adminRequestOptions)
}

function buildQuery(params = {}) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.append(key, value)
  }

  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}
