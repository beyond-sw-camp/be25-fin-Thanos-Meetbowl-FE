import assert from 'node:assert/strict'
import test from 'node:test'

import { setApiClientAuthHandlers } from '../src/lib/api-client.js'
import { writeStoredAuthSession } from '../src/lib/auth-session.js'
import { getAdminDashboardSummary } from '../src/lib/admin-dashboard.js'

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

test('getAdminDashboardSummary uses the stored access token in Authorization header', async () => {
  globalThis.localStorage = createStorage()

  writeStoredAuthSession({
    accessToken: 'admin-access-token',
    user: { role: 'ADMIN', name: 'Admin', loginId: 'admin' },
  })

  let requestUrl = ''
  let requestOptions = null

  globalThis.fetch = async (url, options) => {
    requestUrl = url
    requestOptions = options

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            recentAuditLogs: [],
            mailRetentionPolicy: {
              retentionDays: 365,
              autoDeleteEnabled: true,
              updatedAt: '2026-06-15T00:00:00Z',
              updatedBy: '00000000-0000-0000-0000-000000000001',
            },
            meetingRoomSummary: {
              todayReservationCount: 3,
              inUseMeetingRoomCount: 2,
              availableMeetingRoomCount: 4,
              timeSlotUsage: [],
              timeSlotOccupancyUsage: [],
              weekdayReservationUsage: [],
              siteBuildingUsage: [],
            },
          },
        }
      },
    }
  }

  const result = await getAdminDashboardSummary()

  assert.equal(requestUrl, '/api/v1/admin/dashboard/summary')
  assert.equal(requestOptions?.method, 'GET')
  assert.equal(requestOptions?.headers?.Authorization, 'Bearer admin-access-token')
  assert.equal(result.mailRetentionPolicy.retentionDays, 365)
})

test('getAdminDashboardSummary handles 403 without calling the global forbidden handler', async () => {
  globalThis.localStorage = createStorage()

  let forbiddenHandlerCalled = 0
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

  await assert.rejects(() => getAdminDashboardSummary(), {
    name: 'ApiError',
    status: 403,
  })
  assert.equal(forbiddenHandlerCalled, 0)

  setApiClientAuthHandlers({})
})
