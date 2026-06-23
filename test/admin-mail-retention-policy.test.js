import assert from 'node:assert/strict'
import test from 'node:test'

import { setApiClientAuthHandlers } from '../src/lib/api-client.js'
import { writeStoredAuthSession } from '../src/lib/auth-session.js'
import {
  getAdminMailRetentionPolicy,
  updateAdminMailRetentionPolicy,
} from '../src/lib/admin-mail-retention-policy.js'

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

test('mail retention policy APIs use the stored access token and actual admin paths', async () => {
  globalThis.localStorage = createStorage()

  // 관리자 정책 API도 공통 인증 세션에서 access token을 읽어야 한다.
  writeStoredAuthSession({
    accessToken: 'admin-mail-policy-token',
    user: { role: 'ADMIN', name: 'Admin', loginId: 'admin' },
  })

  const requests = []

  globalThis.fetch = async (url, options) => {
    requests.push({
      url,
      method: options?.method,
      headers: options?.headers,
      body: options?.body,
    })

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            retentionDays: 365,
            autoDeleteEnabled: true,
            updatedAt: '2026-06-17T00:00:00Z',
            updatedBy: '00000000-0000-0000-0000-000000000001',
          },
        }
      },
    }
  }

  const policy = await getAdminMailRetentionPolicy()
  const updated = await updateAdminMailRetentionPolicy({
    retentionDays: 180,
    autoDeleteEnabled: false,
  })

  assert.equal(requests[0]?.url, '/api/v1/admin/mail/retention-policy')
  assert.equal(requests[0]?.method, 'GET')
  assert.equal(requests[0]?.headers?.Authorization, 'Bearer admin-mail-policy-token')
  assert.equal(policy.retentionDays, 365)

  assert.equal(requests[1]?.url, '/api/v1/admin/mail/retention-policy')
  assert.equal(requests[1]?.method, 'PATCH')
  assert.deepEqual(JSON.parse(requests[1]?.body || '{}'), {
    retentionDays: 180,
    autoDeleteEnabled: false,
  })
  assert.equal(updated.autoDeleteEnabled, true)
})

test('mail retention policy APIs skip the global forbidden handler for 403 responses', async () => {
  globalThis.localStorage = createStorage()

  let forbiddenHandlerCalled = 0
  // 정책 화면은 페이지 내부에서 403을 직접 그리므로 전역 alert 흐름을 타면 안 된다.
  setApiClientAuthHandlers({
    onForbidden() {
      forbiddenHandlerCalled += 1
    },
  })

  globalThis.fetch = async () => ({
    ok: false,
    status: 403,
    async json() {
      return {
        success: false,
        error: {
          message: '접근 권한이 없습니다.',
          details: [],
        },
      }
    },
  })

  await assert.rejects(() => getAdminMailRetentionPolicy(), {
    name: 'ApiError',
    status: 403,
  })

  assert.equal(forbiddenHandlerCalled, 0)

  setApiClientAuthHandlers({})
})
