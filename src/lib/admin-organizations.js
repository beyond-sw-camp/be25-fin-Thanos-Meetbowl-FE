import { getBlob, getJson, patchJson, postForm, postJson } from './api-client.js'

const adminRequestOptions = {
  // 조직 관리 화면은 자체적으로 권한 오류 메시지를 렌더링하므로 전역 403 핸들러는 건너뛴다.
  skipForbiddenHandler: true,
}

export function getAdminAffiliates() {
  return getJson('/admin/organizations/affiliates', adminRequestOptions)
}

export function createAdminAffiliate(payload) {
  return postJson('/admin/organizations/affiliates', payload, adminRequestOptions)
}

export function updateAdminAffiliate(affiliateId, payload) {
  return patchJson(`/admin/organizations/affiliates/${affiliateId}`, payload, adminRequestOptions)
}

export function updateAdminAffiliateStatus(affiliateId, status) {
  return patchJson(
    `/admin/organizations/affiliates/${affiliateId}/status`,
    { status },
    adminRequestOptions,
  )
}

export function getAdminDepartments() {
  return getJson('/admin/organizations/departments', adminRequestOptions)
}

export function createAdminDepartment(payload) {
  return postJson('/admin/organizations/departments', payload, adminRequestOptions)
}

export function updateAdminDepartment(departmentId, payload) {
  return patchJson(`/admin/organizations/departments/${departmentId}`, payload, adminRequestOptions)
}

export function updateAdminDepartmentStatus(departmentId, status) {
  return patchJson(
    `/admin/organizations/departments/${departmentId}/status`,
    { status },
    adminRequestOptions,
  )
}

export function getAdminTeams() {
  return getJson('/admin/organizations/teams', adminRequestOptions)
}

export function createAdminTeam(payload) {
  return postJson('/admin/organizations/teams', payload, adminRequestOptions)
}

export function updateAdminTeam(teamId, payload) {
  return patchJson(`/admin/organizations/teams/${teamId}`, payload, adminRequestOptions)
}

export function updateAdminTeamStatus(teamId, status) {
  return patchJson(`/admin/organizations/teams/${teamId}/status`, { status }, adminRequestOptions)
}

export function getAdminPositions() {
  return getJson('/admin/organizations/positions', adminRequestOptions)
}

export function createAdminPosition(payload) {
  return postJson('/admin/organizations/positions', payload, adminRequestOptions)
}

export function updateAdminPosition(positionId, payload) {
  return patchJson(`/admin/organizations/positions/${positionId}`, payload, adminRequestOptions)
}

export function updateAdminPositionStatus(positionId, status) {
  return patchJson(
    `/admin/organizations/positions/${positionId}/status`,
    { status },
    adminRequestOptions,
  )
}

export async function downloadOrganizationMembersExcel() {
  // Blob 응답과 Content-Disposition 파일명을 함께 다뤄야 해서 헤더까지 반환받는다.
  const { blob, headers } = await getBlob('/admin/organization-members/excel', adminRequestOptions)

  return {
    blob,
    fileName:
      extractFileNameFromDisposition(headers.get('Content-Disposition')) ||
      'meetbowl_organization_members.xlsx',
  }
}

export function importOrganizationMembersExcel(file) {
  // multipart/form-data 업로드는 FormData에 file 필드만 담아 BE 계약을 그대로 따른다.
  const form = new FormData()
  form.append('file', file)
  return postForm('/admin/organization-members/excel/import', form, adminRequestOptions)
}

export function buildOrganizationNameMaps({
  affiliates = [],
  departments = [],
  teams = [],
  positions = [],
} = {}) {
  return {
    affiliateId: buildNameMap(affiliates, 'affiliateId'),
    departmentId: buildNameMap(departments, 'departmentId'),
    teamId: buildNameMap(teams, 'teamId'),
    positionId: buildNameMap(positions, 'positionId'),
  }
}

function extractFileNameFromDisposition(contentDisposition) {
  if (!contentDisposition) return ''

  // RFC 5987 형식 filename*=UTF-8''... 이 오면 우선 사용해 한글 파일명도 보존한다.
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/^"(.*)"$/, '$1'))
  }

  // 일반 filename="..." 헤더만 내려와도 기본 다운로드 파일명으로 쓸 수 있게 파싱한다.
  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return basicMatch?.[1] || ''
}

function buildNameMap(items, idKey) {
  const entries = items
    .map((item) => [item?.[idKey], item?.name])
    .filter(([id, name]) => Boolean(id) && Boolean(name))

  return new Map(entries)
}
