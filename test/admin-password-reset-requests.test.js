import assert from 'node:assert/strict'
import test from 'node:test'

import { writeStoredAuthSession } from '../src/lib/auth-session.js'
import {
  approveAdminPasswordResetRequest,
  getAdminPasswordResetRequests,
  getPendingPasswordResetRequestCount,
  rejectAdminPasswordResetRequest,
} from '../src/lib/admin-password-reset-requests.js'

function createStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
    clear() {
      values.clear()
    },
  }
}

function seedAdminSession() {
  globalThis.localStorage = createStorage()
  writeStoredAuthSession({
    accessToken: 'admin-access-token',
    user: { role: 'ADMIN', name: 'Admin', loginId: 'admin' },
  })
}

test('getPendingPasswordResetRequestCount calls the admin count endpoint', async () => {
  seedAdminSession()

  let request = null
  globalThis.fetch = async (url, options) => {
    request = {
      url,
      method: options?.method,
      auth: options?.headers?.Authorization,
    }

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            pendingPasswordResetRequestCount: 3,
          },
        }
      },
    }
  }

  const result = await getPendingPasswordResetRequestCount()

  assert.deepEqual(request, {
    url: '/api/v1/admin/notifications/count',
    method: 'GET',
    auth: 'Bearer admin-access-token',
  })
  assert.equal(result.pendingPasswordResetRequestCount, 3)
})

test('getAdminPasswordResetRequests requests pending items for the admin notification dropdown', async () => {
  seedAdminSession()

  let request = null
  globalThis.fetch = async (url, options) => {
    request = {
      url,
      method: options?.method,
      auth: options?.headers?.Authorization,
    }

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            items: [
              {
                requestId: '00000000-0000-0000-0000-000000000003',
                name: 'User One',
                loginId: 'user1',
                email: 'user1@example.com',
                requestedAt: '2026-06-23T00:00:00Z',
                status: 'PENDING',
              },
            ],
          },
        }
      },
    }
  }

  const result = await getAdminPasswordResetRequests({ status: 'pending' })

  assert.deepEqual(request, {
    url: '/api/v1/admin/password-reset-requests?status=PENDING',
    method: 'GET',
    auth: 'Bearer admin-access-token',
  })
  assert.equal(result.items[0].loginId, 'user1')
})

test('approveAdminPasswordResetRequest posts to the approve endpoint', async () => {
  seedAdminSession()

  let request = null
  globalThis.fetch = async (url, options) => {
    request = {
      url,
      method: options?.method,
      auth: options?.headers?.Authorization,
      body: options?.body,
    }

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            status: 'APPROVED',
          },
        }
      },
    }
  }

  const result = await approveAdminPasswordResetRequest('request-123')

  assert.deepEqual(request, {
    url: '/api/v1/admin/password-reset-requests/request-123/approve',
    method: 'POST',
    auth: 'Bearer admin-access-token',
    body: '{}',
  })
  assert.equal(result.status, 'APPROVED')
})

test('rejectAdminPasswordResetRequest posts to the reject endpoint', async () => {
  seedAdminSession()

  let request = null
  globalThis.fetch = async (url, options) => {
    request = {
      url,
      method: options?.method,
      auth: options?.headers?.Authorization,
      body: options?.body,
    }

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            status: 'REJECTED',
          },
        }
      },
    }
  }

  const result = await rejectAdminPasswordResetRequest('request-456')

  assert.deepEqual(request, {
    url: '/api/v1/admin/password-reset-requests/request-456/reject',
    method: 'POST',
    auth: 'Bearer admin-access-token',
    body: '{}',
  })
  assert.equal(result.status, 'REJECTED')
})
