import { getJson, postJson } from './api-client.js'

const adminRequestOptions = {
  skipForbiddenHandler: true,
}

export function getPendingPasswordResetRequestCount() {
  return getJson('/admin/notifications/count', adminRequestOptions)
}

export function getAdminPasswordResetRequests({ status } = {}) {
  const searchParams = new URLSearchParams()
  const normalizedStatus = `${status || ''}`.trim().toUpperCase()

  if (normalizedStatus) searchParams.set('status', normalizedStatus)

  const query = searchParams.toString()
  const path = query ? `/admin/password-reset-requests?${query}` : '/admin/password-reset-requests'
  return getJson(path, adminRequestOptions)
}

export function approveAdminPasswordResetRequest(requestId) {
  return postJson(`/admin/password-reset-requests/${requestId}/approve`, {}, adminRequestOptions)
}

export function rejectAdminPasswordResetRequest(requestId) {
  return postJson(`/admin/password-reset-requests/${requestId}/reject`, {}, adminRequestOptions)
}
