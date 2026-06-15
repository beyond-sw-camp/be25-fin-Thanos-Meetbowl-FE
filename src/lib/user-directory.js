import { getJson } from './api-client.js'

const userDirectoryRequestOptions = {
  skipForbiddenHandler: true,
}

export function searchUsers(params = {}) {
  const searchParams = new URLSearchParams()

  const keyword = `${params.keyword || ''}`.trim()
  if (keyword) searchParams.set('keyword', keyword)

  if (params.affiliateId) searchParams.set('affiliateId', params.affiliateId)
  if (params.departmentId) searchParams.set('departmentId', params.departmentId)
  if (params.teamId) searchParams.set('teamId', params.teamId)
  if (params.positionId) searchParams.set('positionId', params.positionId)

  const status = `${params.status || ''}`.trim().toUpperCase()
  if (status) searchParams.set('status', status)

  if (Number(params.page) > 0) searchParams.set('page', String(params.page))
  if (Number(params.size) > 0) searchParams.set('size', String(params.size))

  const query = searchParams.toString()
  const path = query ? `/users/search?${query}` : '/users/search'
  return getJson(path, userDirectoryRequestOptions)
}

export function getOrganizationUserSummary(userId) {
  return getJson(`/organization/users/${userId}/summary`, userDirectoryRequestOptions)
}
