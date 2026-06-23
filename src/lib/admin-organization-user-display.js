function normalizeDisplayPart(value) {
  const normalized = `${value || ''}`.trim()
  return normalized && normalized !== '-' ? normalized : ''
}

export function isLocalAdminAccount(user) {
  return (
    `${user?.role || ''}`.trim().toUpperCase() === 'ADMIN' &&
    `${user?.loginId || ''}`.trim().toLowerCase() === 'admin' &&
    `${user?.email || ''}`.trim().toLowerCase() === 'admin@local.meetbowl'
  )
}

export function buildOrganizationSummaryText(...parts) {
  return parts.map(normalizeDisplayPart).filter(Boolean).join(' ')
}

export function normalizeOrganizationUserDisplay(user = {}) {
  const isLocalAdmin = isLocalAdminAccount(user)

  return {
    ...user,
    department: isLocalAdmin ? '' : normalizeDisplayPart(user.department),
    team: isLocalAdmin ? '' : normalizeDisplayPart(user.team),
    position: isLocalAdmin ? '' : normalizeDisplayPart(user.position),
  }
}

export function buildOrganizationUserHeadline(user = {}) {
  const normalizedUser = normalizeOrganizationUserDisplay(user)
  return buildOrganizationSummaryText(
    normalizedUser.department,
    normalizedUser.team,
    normalizedUser.position,
  )
}

export function buildOrganizationMemberLabel(user = {}, positionName = '') {
  const normalizedUser = normalizeOrganizationUserDisplay(user)
  const resolvedPosition = normalizeDisplayPart(positionName) || normalizedUser.position
  return buildOrganizationSummaryText(normalizedUser.name, resolvedPosition)
}
