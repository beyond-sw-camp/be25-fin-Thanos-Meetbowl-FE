import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrganizationMemberLabel,
  buildOrganizationSummaryText,
  buildOrganizationUserHeadline,
  isLocalAdminAccount,
  normalizeOrganizationUserDisplay,
} from '../src/lib/admin-organization-user-display.js'

test('organization summary text joins only meaningful values with spaces', () => {
  assert.equal(buildOrganizationSummaryText('경영지원부', '', '-', '이사'), '경영지원부 이사')
  assert.equal(buildOrganizationSummaryText('', '플랫폼팀', undefined), '플랫폼팀')
  assert.equal(buildOrganizationSummaryText('', ' ', '-'), '')
})

test('local admin detection only matches the shared local admin account', () => {
  assert.equal(
    isLocalAdminAccount({
      role: 'ADMIN',
      loginId: 'admin',
      email: 'admin@local.meetbowl',
    }),
    true,
  )

  assert.equal(
    isLocalAdminAccount({
      role: 'ADMIN',
      loginId: 'park-admin',
      email: 'admin@meetbowl.com',
    }),
    false,
  )
})

test('normalizeOrganizationUserDisplay clears org fields only for the shared local admin account', () => {
  assert.deepEqual(
    normalizeOrganizationUserDisplay({
      role: 'ADMIN',
      loginId: 'admin',
      email: 'admin@local.meetbowl',
      department: '경영지원부',
      team: '운영팀',
      position: '부장',
    }),
    {
      role: 'ADMIN',
      loginId: 'admin',
      email: 'admin@local.meetbowl',
      department: '',
      team: '',
      position: '',
    },
  )

  assert.deepEqual(
    normalizeOrganizationUserDisplay({
      role: 'ADMIN',
      loginId: 'leader',
      email: 'leader@meetbowl.com',
      department: '경영지원부',
      team: '운영팀',
      position: '부장',
    }),
    {
      role: 'ADMIN',
      loginId: 'leader',
      email: 'leader@meetbowl.com',
      department: '경영지원부',
      team: '운영팀',
      position: '부장',
    },
  )
})

test('organization headline and member label stay readable without broken separators', () => {
  assert.equal(
    buildOrganizationUserHeadline({
      department: '경영지원부',
      team: '',
      position: '이사',
    }),
    '경영지원부 이사',
  )

  assert.equal(
    buildOrganizationMemberLabel(
      {
        name: '철수',
        position: '',
      },
      '이사',
    ),
    '철수 이사',
  )
})
