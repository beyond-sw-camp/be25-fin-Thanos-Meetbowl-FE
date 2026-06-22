import { getJson } from './api-client.js'

const adminRequestOptions = {
  // 관리자 화면은 자체적으로 403 상태를 처리하므로 전역 권한 핸들러는 건너뛴다.
  skipForbiddenHandler: true,
}

/**
 * 관리자 작업 로그 목록을 조회합니다.
 * @param {Object} params - 검색 필터 및 페이징 파라미터 (예: actionType, page, size 등)
 * @returns {Promise<Object>} 작업 로그 목록 데이터
 */
export function getAdminAuditLogs(params = {}) {
  return getJson(`/admin/audit-logs${buildQuery(params)}`, adminRequestOptions)
}

/**
 * 특정 관리자 작업 로그의 상세 정보를 조회합니다.
 * @param {string} auditLogId - 상세 조회할 작업 로그의 ID
 * @returns {Promise<Object>} 작업 로그 상세 데이터 (변경 전/후 스냅샷 포함)
 */
export function getAdminAuditLogDetail(auditLogId) {
  return getJson(`/admin/audit-logs/${auditLogId}`, adminRequestOptions)
}

/**
 * 주어진 객체를 기반으로 URL 쿼리 문자열을 생성합니다.
 * 빈 값(undefined, null, 빈 문자열)은 쿼리 파라미터에서 제외됩니다.
 * @param {Object} params - 쿼리로 변환할 파라미터 객체
 * @returns {string} 완성된 쿼리 문자열 (예: "?page=1&size=20")
 */
function buildQuery(params = {}) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.append(key, value)
  }

  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}
