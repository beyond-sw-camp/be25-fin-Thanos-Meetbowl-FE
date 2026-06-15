import assert from 'node:assert/strict'
import test from 'node:test'

import { writeStoredAuthSession } from '../src/lib/auth-session.js'
import { getAllAdminUsers } from '../src/lib/admin-users.js'

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

test('getAllAdminUsers follows the paged admin user API until all items are collected', async () => {
  globalThis.localStorage = createStorage()

  writeStoredAuthSession({
    accessToken: 'admin-user-token',
    user: { role: 'ADMIN', name: 'Admin', loginId: 'admin' },
  })

  const requests = []

  globalThis.fetch = async (url, options) => {
    requests.push({
      url,
      method: options?.method,
      auth: options?.headers?.Authorization,
    })

    // 테스트에서는 page/size 쿼리를 다시 읽어, 다음 페이지 요청이 제대로 이어지는지 검증한다.
    const currentUrl = new URL(`https://example.test${url}`)
    const page = Number(currentUrl.searchParams.get('page') || '1')
    const size = Number(currentUrl.searchParams.get('size') || '100')

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            items: [{ userId: `user-${page}`, name: `User ${page}` }],
            page,
            size,
            totalElements: 3,
            totalPages: 3,
          },
        }
      },
    }
  }

  const result = await getAllAdminUsers({ size: 100 })

  assert.deepEqual(
    requests.map((request) => request.url),
    [
      '/api/v1/admin/users?page=1&size=100',
      '/api/v1/admin/users?page=2&size=100',
      '/api/v1/admin/users?page=3&size=100',
    ],
  )
  assert.ok(requests.every((request) => request.method === 'GET'))
  assert.ok(requests.every((request) => request.auth === 'Bearer admin-user-token'))
  assert.equal(result.totalElements, 3)
  assert.equal(result.totalPages, 3)
  assert.deepEqual(
    result.items.map((item) => item.userId),
    ['user-1', 'user-2', 'user-3'],
  )
})
