import { getJson, patchJson, postJson } from './api-client.js'

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

  const status = `${params.status || ''}`.trim().toUpperCase()
  if (status) searchParams.set('status', status)

  const query = searchParams.toString()
  const path = query ? `/admin/users?${query}` : '/admin/users'
  return getJson(path, adminRequestOptions)
}

export function searchAdminUserSuggestions({ keyword = '', size = 5 } = {}) {
  return getAdminUsers({
    keyword,
    page: 1,
    size,
  })
}

export async function getAllAdminUsers(params = {}) {
  const size = Number(params.size) > 0 ? Number(params.size) : 100
  const firstPage = await getAdminUsers({
    ...params,
    page: 1,
    size,
  })

  // 조직도 화면은 부서/팀별 사용자 집계를 위해 전체 목록이 필요해서 마지막 페이지까지 순차적으로 모은다.
  const totalPages = Math.max(1, Number(firstPage?.totalPages || 1))
  const items = [...(firstPage?.items || [])]

  for (let page = 2; page <= totalPages; page += 1) {
    const pageData = await getAdminUsers({
      ...params,
      page,
      size,
    })
    items.push(...(pageData?.items || []))
  }

  return {
    ...firstPage,
    items,
    totalPages,
    totalElements: Number(firstPage?.totalElements || items.length),
  }
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

export function resetAdminUserPassword(userId) {
  return postJson(`/admin/users/${userId}/password/reset`, {}, adminRequestOptions)
}
