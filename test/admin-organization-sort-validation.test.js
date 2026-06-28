import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getOrganizationSortOrderConflictMessage,
  isOrganizationSortOrderConflict,
  ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE,
  validateOrganizationSortOrder,
} from '../src/lib/admin-organization-sort-validation.js'

const departments = [
  { departmentId: 'department-1', affiliateId: 'affiliate-1', sortOrder: 1, status: 'ACTIVE' },
  { departmentId: 'department-2', affiliateId: 'affiliate-1', sortOrder: 2, status: 'INACTIVE' },
  { departmentId: 'department-3', affiliateId: 'affiliate-2', sortOrder: 1, status: 'ACTIVE' },
]

const teams = [
  { teamId: 'team-1', departmentId: 'department-1', sortOrder: 1, status: 'ACTIVE' },
  { teamId: 'team-2', departmentId: 'department-2', sortOrder: 2, status: 'INACTIVE' },
  { teamId: 'team-3', departmentId: 'department-3', sortOrder: 1, status: 'ACTIVE' },
]

const positions = [
  { positionId: 'position-1', affiliateId: 'affiliate-1', sortOrder: 1, status: 'ACTIVE' },
  { positionId: 'position-2', affiliateId: 'affiliate-1', sortOrder: 2, status: 'INACTIVE' },
  { positionId: 'position-3', affiliateId: 'affiliate-2', sortOrder: 2, status: 'ACTIVE' },
]

test('department sort order validation blocks duplicates within the same affiliate', () => {
  const message = validateOrganizationSortOrder({
    tab: 'department',
    form: { affiliateId: 'affiliate-1', sortOrder: 1 },
    departments,
  })

  assert.equal(message, ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE)
})

test('team sort order validation blocks duplicates within the same affiliate even across departments', () => {
  const message = validateOrganizationSortOrder({
    tab: 'team',
    form: { affiliateId: 'affiliate-1', departmentId: 'department-2', sortOrder: 1 },
    departments,
    teams,
  })

  assert.equal(message, ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE)
})

test('position sort order validation blocks duplicates including inactive items', () => {
  const message = validateOrganizationSortOrder({
    tab: 'position',
    form: { affiliateId: 'affiliate-1', sortOrder: 2 },
    positions,
  })

  assert.equal(message, ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE)
})

test('edit mode allows keeping the current item sort order', () => {
  const departmentMessage = validateOrganizationSortOrder({
    tab: 'department',
    form: { affiliateId: 'affiliate-1', sortOrder: 1 },
    editingItem: { departmentId: 'department-1' },
    departments,
  })

  const teamMessage = validateOrganizationSortOrder({
    tab: 'team',
    form: { affiliateId: 'affiliate-1', departmentId: 'department-1', sortOrder: 1 },
    editingItem: { teamId: 'team-1' },
    departments,
    teams,
  })

  const positionMessage = validateOrganizationSortOrder({
    tab: 'position',
    form: { affiliateId: 'affiliate-1', sortOrder: 1 },
    editingItem: { positionId: 'position-1' },
    positions,
  })

  assert.equal(departmentMessage, '')
  assert.equal(teamMessage, '')
  assert.equal(positionMessage, '')
})

test('changing to another item sort order is blocked in edit mode', () => {
  const message = validateOrganizationSortOrder({
    tab: 'team',
    form: { affiliateId: 'affiliate-1', departmentId: 'department-1', sortOrder: 2 },
    editingItem: { teamId: 'team-1' },
    departments,
    teams,
  })

  assert.equal(message, ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE)
})

test('position sort order can be reused in another affiliate', () => {
  const message = validateOrganizationSortOrder({
    tab: 'position',
    form: { affiliateId: 'affiliate-2', sortOrder: 1 },
    positions,
  })

  assert.equal(message, '')
})

test('deleted items are excluded because only listed items are checked', () => {
  const message = validateOrganizationSortOrder({
    tab: 'department',
    form: { affiliateId: 'affiliate-1', sortOrder: 9 },
    departments,
  })

  assert.equal(message, '')
})

test('backend duplicate conflict is normalized to the same user-facing message', () => {
  assert.equal(
    getOrganizationSortOrderConflictMessage({
      status: 409,
      code: 'ORGANIZATION_SORT_ORDER_DUPLICATED',
      message: '이미 사용 중인 순서입니다. 다른 순서를 입력해 주세요.',
    }),
    ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE,
  )

  assert.equal(
    isOrganizationSortOrderConflict({
      status: 409,
      message: 'sortOrder conflict',
    }),
    true,
  )
})
