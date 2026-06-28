import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDepartmentPayload,
  buildPositionPayload,
  buildTeamPayload,
  createDepartmentForm,
  createEmptyOrganizationForm,
  createPositionForm,
  createTeamForm,
} from '../src/lib/admin-organization-form.js'

function normalizeSortOrder(value) {
  return Number(value)
}

test('organization form builders omit code fields from create and update payloads', () => {
  const departmentPayload = buildDepartmentPayload(
    {
      name: ' Platform ',
      code: 'D999',
      status: 'ACTIVE',
      sortOrder: '2',
      affiliateId: 'affiliate-1',
      departmentCode: 'D001',
    },
    normalizeSortOrder,
  )

  const teamPayload = buildTeamPayload(
    {
      name: ' Core Team ',
      code: 'T999',
      status: 'INACTIVE',
      sortOrder: '3',
      departmentId: 'department-1',
      teamCode: 'T001',
    },
    normalizeSortOrder,
  )

  const positionPayload = buildPositionPayload(
    {
      name: ' Manager ',
      code: 'P999',
      status: 'ACTIVE',
      sortOrder: '4',
      affiliateId: 'affiliate-2',
      positionCode: 'P001',
    },
    normalizeSortOrder,
  )

  assert.deepEqual(departmentPayload, {
    name: 'Platform',
    status: 'ACTIVE',
    sortOrder: 2,
    affiliateId: 'affiliate-1',
  })
  assert.ok(!('code' in departmentPayload))
  assert.ok(!('departmentCode' in departmentPayload))

  assert.deepEqual(teamPayload, {
    name: 'Core Team',
    status: 'INACTIVE',
    sortOrder: 3,
    departmentId: 'department-1',
  })
  assert.ok(!('code' in teamPayload))
  assert.ok(!('teamCode' in teamPayload))

  assert.deepEqual(positionPayload, {
    name: 'Manager',
    status: 'ACTIVE',
    sortOrder: 4,
    affiliateId: 'affiliate-2',
  })
  assert.ok(!('code' in positionPayload))
  assert.ok(!('positionCode' in positionPayload))
})

test('organization form defaults and edit forms do not keep editable code state', () => {
  assert.deepEqual(createEmptyOrganizationForm(), {
    name: '',
    sortOrder: 1,
    status: 'ACTIVE',
    affiliateId: '',
    departmentId: '',
  })

  assert.deepEqual(
    createDepartmentForm({
      name: 'Platform',
      code: 'D001',
      sortOrder: 2,
      status: 'ACTIVE',
      affiliateId: 'affiliate-1',
    }),
    {
      name: 'Platform',
      sortOrder: 2,
      status: 'ACTIVE',
      affiliateId: 'affiliate-1',
      departmentId: '',
    },
  )

  assert.deepEqual(
    createTeamForm(
      {
        name: 'Core',
        code: 'T001',
        sortOrder: 3,
        status: 'INACTIVE',
        departmentId: 'department-1',
      },
      'affiliate-2',
    ),
    {
      name: 'Core',
      sortOrder: 3,
      status: 'INACTIVE',
      affiliateId: 'affiliate-2',
      departmentId: 'department-1',
    },
  )

  assert.deepEqual(
    createPositionForm({
      name: 'Manager',
      code: 'P001',
      sortOrder: 4,
      status: 'ACTIVE',
      affiliateId: 'affiliate-3',
    }),
    {
      name: 'Manager',
      sortOrder: 4,
      status: 'ACTIVE',
      affiliateId: 'affiliate-3',
      departmentId: '',
    },
  )
})
