export function createEmptyOrganizationForm() {
  return {
    name: '',
    sortOrder: 1,
    status: 'ACTIVE',
    affiliateId: '',
    departmentId: '',
  }
}

export function createDepartmentForm(item) {
  return {
    name: item?.name || '',
    sortOrder: item?.sortOrder ?? 0,
    status: item?.status || 'ACTIVE',
    affiliateId: item?.affiliateId || '',
    departmentId: '',
  }
}

export function createTeamForm(item, affiliateId = '') {
  return {
    name: item?.name || '',
    sortOrder: item?.sortOrder ?? 0,
    status: item?.status || 'ACTIVE',
    affiliateId,
    departmentId: item?.departmentId || '',
  }
}

export function createPositionForm(item) {
  return {
    name: item?.name || '',
    sortOrder: item?.sortOrder ?? 0,
    status: item?.status || 'ACTIVE',
    affiliateId: item?.affiliateId || '',
    departmentId: '',
  }
}

// 부서/팀/직급 코드는 BE에서 자동 생성하므로 FE 요청 body에서는 code 필드를 제외한다.
export function buildDepartmentPayload(form, normalizeSortOrder) {
  return {
    name: form.name.trim(),
    status: form.status,
    sortOrder: normalizeSortOrder(form.sortOrder),
    affiliateId: form.affiliateId,
  }
}

// 부서/팀/직급 코드는 BE에서 자동 생성하므로 FE 요청 body에서는 code 필드를 제외한다.
export function buildTeamPayload(form, normalizeSortOrder) {
  return {
    name: form.name.trim(),
    status: form.status,
    sortOrder: normalizeSortOrder(form.sortOrder),
    departmentId: form.departmentId,
  }
}

// 부서/팀/직급 코드는 BE에서 자동 생성하므로 FE 요청 body에서는 code 필드를 제외한다.
export function buildPositionPayload(form, normalizeSortOrder) {
  return {
    name: form.name.trim(),
    status: form.status,
    sortOrder: normalizeSortOrder(form.sortOrder),
    affiliateId: form.affiliateId,
  }
}
