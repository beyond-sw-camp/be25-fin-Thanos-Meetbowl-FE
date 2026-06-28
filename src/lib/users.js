import { getJson } from './api-client'
import { useAuthStore } from '../stores/auth'

const failedSummaryUserIds = new Set()

function isSearchableMember(user) {
  const role = String(user?.role || '').toUpperCase()
  return role !== 'ADMIN' && role !== 'SYSTEM'
}

export function searchUsers({ keyword = '', page = 1, size = 20 } = {}) {
  const params = new URLSearchParams()
  const auth = useAuthStore()
  if (keyword.trim()) params.set('keyword', keyword.trim())
  params.set('page', String(page))
  params.set('size', String(size))
  if (auth.user?.affiliateId) params.set('affiliateId', auth.user.affiliateId)
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
