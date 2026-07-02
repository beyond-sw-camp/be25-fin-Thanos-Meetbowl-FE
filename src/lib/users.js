import { getJson } from './api-client'
import { useAuthStore } from '../stores/auth'

const failedSummaryUserIds = new Set()

function isSearchableMember(user) {
  const role = String(user?.role || '').toUpperCase()
  return role !== 'ADMIN' && role !== 'SYSTEM'
}

export function searchUsers({
  keyword = '',
  page = 1,
  size = 20,
  affiliateId: requestedAffiliateId,
  departmentId,
  teamId,
  positionId,
  status,
} = {}) {
  const params = new URLSearchParams()
  const auth = useAuthStore()
  if (keyword.trim()) params.set('keyword', keyword.trim())
  params.set('page', String(page))
  params.set('size', String(size))
  const affiliateId = requestedAffiliateId || auth.user?.affiliateId
  if (affiliateId) params.set('affiliateId', affiliateId)
  if (departmentId) params.set('departmentId', departmentId)
  if (teamId) params.set('teamId', teamId)
  if (positionId) params.set('positionId', positionId)
  if (status) params.set('status', String(status).toUpperCase())
  return getJson(`/users/search?${params.toString()}`)
    .then((data) => ({
      ...data,
      items: (data?.items || []).filter(isSearchableMember),
    }))
}

export function searchUserSuggestions({ keyword = '', size = 5 } = {}) {
  return searchUsers({
    keyword,
    page: 1,
    size,
  })
}

export function getUserSummary(userId) {
  if (!userId || failedSummaryUserIds.has(userId)) return Promise.resolve(null)
  return getJson(`/organization/users/${userId}/summary`)
    .catch((error) => {
      if (error?.status === 404) {
        failedSummaryUserIds.add(userId)
        return null
      }
      throw error
    })
}

export async function listUsersByScope({
  affiliateId,
  departmentId,
  teamId,
  positionId,
  keyword = '',
  status = 'ACTIVE',
  size = 100,
} = {}) {
  const items = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const data = await searchUsers({
      keyword,
      affiliateId,
      departmentId,
      teamId,
      positionId,
      status,
      page,
      size,
    })
    items.push(...(data?.items || []))
    totalPages = Math.max(1, Number(data?.totalPages) || 1)
    page += 1
  }

  return items
}
