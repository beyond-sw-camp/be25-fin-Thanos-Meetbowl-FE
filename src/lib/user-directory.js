import { getJson } from './api-client.js'

const userDirectoryRequestOptions = {
  skipForbiddenHandler: true,
}

function isSearchableMember(user) {
  const role = String(user?.role || '').toUpperCase()
  return role !== 'ADMIN' && role !== 'SYSTEM'
}

export function searchUsers(params = {}) {
  const searchParams = new URLSearchParams()

  const keyword = `${params.keyword || ''}`.trim()
  // 이름/로그인 ID/이메일/부서/팀 검색어를 하나의 keyword로 전달한다.
  if (keyword) searchParams.set('keyword', keyword)

  if (params.affiliateId) searchParams.set('affiliateId', params.affiliateId)
  if (params.departmentId) searchParams.set('departmentId', params.departmentId)
  if (params.teamId) searchParams.set('teamId', params.teamId)
  if (params.positionId) searchParams.set('positionId', params.positionId)

  const status = `${params.status || ''}`.trim().toUpperCase()
  if (status && status !== 'ALL') searchParams.set('status', status)

  if (Number(params.page) > 0) searchParams.set('page', String(params.page))
  if (Number(params.size) > 0) searchParams.set('size', String(params.size))

  const query = searchParams.toString()
  const path = query ? `/users/search?${query}` : '/users/search'
  return getJson(path, userDirectoryRequestOptions)
    .then((data) => ({
      ...data,
      items: (data?.items || []).filter(isSearchableMember),
    }))
}

export function getOrganizationUserSummary(userId) {
  // 검색 결과나 조직도에서 클릭한 사용자의 요약 정보를 다시 조회한다.
  return getJson(`/organization/users/${userId}/summary`, userDirectoryRequestOptions)
}
