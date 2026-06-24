export const ORGANIZATION_SORT_ORDER_DUPLICATE_CODE = 'ORGANIZATION_SORT_ORDER_DUPLICATED'
export const ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE =
  '이미 사용 중인 순서입니다. 다른 순서를 입력해 주세요.'
export const ORGANIZATION_SORT_ORDER_REQUIRED_MESSAGE = '순서를 입력해 주세요.'
export const ORGANIZATION_SORT_ORDER_NUMBER_MESSAGE = '순서는 숫자만 입력해 주세요.'
export const ORGANIZATION_SORT_ORDER_MIN_MESSAGE = '순서는 0 이상의 숫자를 입력해 주세요.'

export function validateOrganizationSortOrder({
  tab,
  form,
  editingItem,
  departments = [],
  teams = [],
  positions = [],
} = {}) {
  const normalizedSortOrder = normalizeCandidateSortOrder(form?.sortOrder)

  if (form?.sortOrder === '' || form?.sortOrder === null || form?.sortOrder === undefined) {
    return ORGANIZATION_SORT_ORDER_REQUIRED_MESSAGE
  }

  if (normalizedSortOrder === null) {
    return ORGANIZATION_SORT_ORDER_NUMBER_MESSAGE
  }

  if (normalizedSortOrder < 0) {
    return ORGANIZATION_SORT_ORDER_MIN_MESSAGE
  }

  if (tab === 'team') {
    // 팀 순서는 상위 부서가 달라도 같은 계열사 전체에서 유일해야 한다.
    const duplicated = teams.some((team) => {
      if (team?.teamId && team.teamId === editingItem?.teamId) return false

      const department = departments.find((item) => item?.departmentId === team?.departmentId)
      return (
        department?.affiliateId === form?.affiliateId &&
        normalizeExistingSortOrder(team?.sortOrder) === normalizedSortOrder
      )
    })

    return duplicated ? ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE : ''
  }

  if (tab === 'position') {
    const duplicated = positions.some((position) => {
      if (position?.positionId && position.positionId === editingItem?.positionId) return false
      return normalizeExistingSortOrder(position?.sortOrder) === normalizedSortOrder
    })

    return duplicated ? ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE : ''
  }

  const duplicated = departments.some((department) => {
    if (department?.departmentId && department.departmentId === editingItem?.departmentId) return false

    return (
      department?.affiliateId === form?.affiliateId &&
      normalizeExistingSortOrder(department?.sortOrder) === normalizedSortOrder
    )
  })

  return duplicated ? ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE : ''
}

export function getOrganizationSortOrderConflictMessage(error) {
  if (!isOrganizationSortOrderConflict(error)) return ''
  return ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE
}

export function isOrganizationSortOrderConflict(error) {
  if (!error) return false
  if (error.code === ORGANIZATION_SORT_ORDER_DUPLICATE_CODE) return true
  if (error.status !== 409) return false

  const message = String(error.message || '')
  return (
    message.includes('이미 사용 중인 순서입니다') ||
    message.includes('sort order') ||
    message.includes('sortOrder')
  )
}

function normalizeCandidateSortOrder(value) {
  if (value === '' || value === null || value === undefined) return null
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) return null
  return normalized
}

function normalizeExistingSortOrder(value) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}
