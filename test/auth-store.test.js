import assert from 'node:assert/strict'
import test from 'node:test'

import { createPinia, setActivePinia } from 'pinia'

import { useAuthStore } from '../src/stores/auth.js'

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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

test('login keeps login response user when initial password change is required', async () => {
  globalThis.localStorage = createStorage()
  setActivePinia(createPinia())

  const requests = []
  globalThis.fetch = async (url) => {
    requests.push(String(url))
    return jsonResponse({
      success: true,
      data: {
        accessToken: 'restricted-token',
        refreshToken: null,
        tokenType: 'Bearer',
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 0,
        user: {
          loginId: 'user1',
          name: '사용자',
          role: 'USER',
          initialPasswordChangeRequired: true,
        },
      },
    })
  }

  const auth = useAuthStore()
  await auth.login('user1', '1234')

  assert.equal(requests.length, 1)
  assert.match(requests[0], /\/auth\/login$/)
  assert.equal(auth.user.loginId, 'user1')
  assert.equal(auth.user.initialPasswordChangeRequired, true)
})

test('refreshSessionWithPassword reuses current login id and refreshes the session', async () => {
  globalThis.localStorage = createStorage()
  setActivePinia(createPinia())

  const requests = []
  globalThis.fetch = async (url) => {
    requests.push(String(url))

    if (String(url).endsWith('/auth/login')) {
      return jsonResponse({
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          tokenType: 'Bearer',
          accessTokenExpiresIn: 900,
          refreshTokenExpiresIn: 1209600,
          user: {
            loginId: 'user1',
            name: '사용자',
            role: 'USER',
            initialPasswordChangeRequired: false,
          },
        },
      })
    }

    return jsonResponse({
      success: true,
      data: {
        loginId: 'user1',
        name: '사용자',
        email: 'user1@example.com',
        role: 'USER',
        status: 'ACTIVE',
      },
    })
  }

  const auth = useAuthStore()
  auth.applySession({
    accessToken: 'old-access-token',
    refreshToken: null,
    tokenType: 'Bearer',
    accessTokenExpiresIn: 900,
    refreshTokenExpiresIn: 0,
    user: {
      loginId: 'user1',
      name: '사용자',
      role: 'USER',
      initialPasswordChangeRequired: true,
    },
  })

  await auth.refreshSessionWithPassword('new-password-123')

  assert.deepEqual(
    requests.map((url) => url.replace(/^.*\/api\/v1/, '')),
    ['/auth/login', '/users/me'],
  )
  assert.equal(auth.user.initialPasswordChangeRequired, false)
  assert.equal(auth.user.email, 'user1@example.com')
})
