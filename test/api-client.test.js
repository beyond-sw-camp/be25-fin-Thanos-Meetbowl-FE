import assert from 'node:assert/strict'
import test from 'node:test'

import { patchJson } from '../src/lib/api-client.js'

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
  }
}

test('api client prefers first validation detail reason for 400 responses', async () => {
  globalThis.localStorage = createStorage()
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: '요청 값이 올바르지 않습니다.',
          details: [
            {
              field: 'newPasswordConfirm',
              reason: '새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.',
            },
          ],
        },
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

  await assert.rejects(
    () => patchJson('/users/me/password', {}),
    (error) => {
      assert.equal(error.status, 400)
      assert.equal(error.message, '새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.')
      assert.equal(error.details[0].field, 'newPasswordConfirm')
      return true
    },
  )
})
