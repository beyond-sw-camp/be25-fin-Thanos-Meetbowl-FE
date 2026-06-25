const STATUS_LABELS = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  LOCKED: '잠김',
}

const STATUS_TONES = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  LOCKED: 'danger',
}

export function resolveAdminUserStatus(user) {
  const resolvedStatus = user?.status || user?.effectiveStatus || user?.accountStatus || ''
  return `${resolvedStatus}`.trim().toUpperCase() || 'INACTIVE'
}

export function adminUserStatusLabel(status) {
  const normalizedStatus = `${status || ''}`.trim().toUpperCase()
  return STATUS_LABELS[normalizedStatus] || normalizedStatus || '-'
}

export function adminUserStatusTone(status) {
  const normalizedStatus = `${status || ''}`.trim().toUpperCase()
  return STATUS_TONES[normalizedStatus] || 'warning'
}
