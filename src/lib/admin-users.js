import { getJson, patchJson, postJson } from './api-client'

const adminRequestOptions = {
  skipForbiddenHandler: true,
}

export function getAdminUsers(params = {}) {
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set('page', String(params.page))
  if (params.size) searchParams.set('size', String(params.size))

  // 목록 검색은 현재 BE가 keyword 하나로 받으므로 화면 검색어를 그대로 매핑한다.
  const keyword = `${params.keyword || ''}`.trim()
  if (keyword) searchParams.set('keyword', keyword)

  const query = searchParams.toString()
  const path = query ? `/admin/users?${query}` : '/admin/users'
  return getJson(path, adminRequestOptions)
}

export function getAdminUser(userId) {
  return getJson(`/admin/users/${userId}`, adminRequestOptions)
}

export function createAdminUser(payload) {
  return postJson('/admin/users', payload, adminRequestOptions)
}

export function updateAdminUser(userId, payload) {
  return patchJson(`/admin/users/${userId}`, payload, adminRequestOptions)
}

export function updateAdminUserStatus(userId, status) {
  return patchJson(`/admin/users/${userId}/status`, { status }, adminRequestOptions)
}
