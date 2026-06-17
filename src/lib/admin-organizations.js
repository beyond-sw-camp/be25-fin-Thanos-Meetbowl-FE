import { getJson, patchJson, postJson } from './api-client.js'

const adminRequestOptions = {
  // 관리자 화면은 자체적으로 403 상태를 처리하므로 전역 권한 핸들러는 건너뛴다.
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

function buildNameMap(items, idKey) {
  const entries = items
    .map((item) => [item?.[idKey], item?.name])
    .filter(([id, name]) => Boolean(id) && Boolean(name))

  return new Map(entries)
}
