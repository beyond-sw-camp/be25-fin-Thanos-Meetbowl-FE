import assert from 'node:assert/strict'
import test from 'node:test'

import {
  adminUserStatusLabel,
  adminUserStatusTone,
  resolveAdminUserStatus,
} from '../src/lib/admin-user-status.js'

test('resolveAdminUserStatus uses the BE status field as the source of truth', () => {
  assert.equal(
    resolveAdminUserStatus({
      status: 'INACTIVE',
      activeEndDate: '2026-06-21T00:00:00Z',
    }),
    'INACTIVE',
  )

  assert.equal(
    resolveAdminUserStatus({
      status: 'ACTIVE',
      activeEndDate: '2026-06-21T00:00:00Z',
    }),
    'ACTIVE',
  )
})

test('resolveAdminUserStatus falls back to legacy status-like fields only when status is absent', () => {
  assert.equal(resolveAdminUserStatus({ effectiveStatus: 'LOCKED' }), 'LOCKED')
  assert.equal(resolveAdminUserStatus({ accountStatus: 'inactive' }), 'INACTIVE')
})

test('admin user status helpers return the expected badge label and tone', () => {
  assert.equal(adminUserStatusLabel('ACTIVE'), '활성')
  assert.equal(adminUserStatusLabel('INACTIVE'), '비활성')
  assert.equal(adminUserStatusLabel('LOCKED'), '잠김')
  assert.equal(adminUserStatusTone('ACTIVE'), 'success')
  assert.equal(adminUserStatusTone('INACTIVE'), 'warning')
  assert.equal(adminUserStatusTone('LOCKED'), 'danger')
})
