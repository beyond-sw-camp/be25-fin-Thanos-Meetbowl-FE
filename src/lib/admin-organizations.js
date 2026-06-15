import { getJson } from './api-client'

const adminRequestOptions = {
  skipForbiddenHandler: true,
}

export function getAdminAffiliates() {
  return getJson('/admin/organizations/affiliates', adminRequestOptions)
}

export function getAdminDepartments() {
  return getJson('/admin/organizations/departments', adminRequestOptions)
}

export function getAdminTeams() {
  return getJson('/admin/organizations/teams', adminRequestOptions)
}

export function getAdminPositions() {
  return getJson('/admin/organizations/positions', adminRequestOptions)
}
