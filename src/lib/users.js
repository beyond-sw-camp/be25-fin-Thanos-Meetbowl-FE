import { getJson } from './api-client'

export function searchUsers({ keyword = '', page = 1, size = 20 } = {}) {
  const params = new URLSearchParams()
  if (keyword.trim()) params.set('keyword', keyword.trim())
  params.set('page', String(page))
  params.set('size', String(size))
  return getJson(`/users/search?${params.toString()}`)
}

export function getUserSummary(userId) {
  return getJson(`/organization/users/${userId}/summary`)
}
