import assert from 'node:assert/strict'
import test from 'node:test'

import {
  patchJson,
  postJson,
  setApiClientAuthHandlers,
} from '../src/lib/api-client.js'
import {
  readStoredAuthSession,
  writeStoredAuthSession,
} from '../src/lib/auth-session.js'

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
    headers: { 'Content-Type': 'application/json' },
  })
}

function jwtWithExpiration(exp) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode({ exp })}.signature`
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
      assert.equal(error.code, 'VALIDATION_FAILED')
      assert.equal(error.message, '새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.')
      assert.equal(error.details[0].field, 'newPasswordConfirm')
      return true
    },
  )
})

test('refreshes an expired access token and retries meeting join once', async () => {
  globalThis.localStorage = createStorage()
  writeStoredAuthSession({
    accessToken: 'expired-access',
    refreshToken: 'valid-refresh',
    tokenType: 'Bearer',
    accessTokenExpiresIn: 900,
    refreshTokenExpiresIn: 1209600,
    user: { userId: 'user-id', loginId: 'user1', name: '사용자', role: 'USER' },
  })

  const requests = []
  let refreshedHandlerSession = null
  setApiClientAuthHandlers({
    onSessionRefreshed(session) {
      refreshedHandlerSession = session
    },
  })
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), authorization: options.headers.Authorization })
    if (String(url).endsWith('/auth/token/refresh')) {
      assert.equal(options.headers.Authorization, undefined)
      assert.deepEqual(JSON.parse(options.body), { refreshToken: 'valid-refresh' })
      return jsonResponse({
        success: true,
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          tokenType: 'Bearer',
          accessTokenExpiresIn: 900,
          refreshTokenExpiresIn: 1209600,
        },
        message: null,
      })
    }
    if (options.headers.Authorization === 'Bearer expired-access') {
      return jsonResponse({
        success: false,
        error: { code: 'AUTH_TOKEN_EXPIRED', message: '토큰이 만료되었습니다.', details: [] },
      }, 401)
    }
    return jsonResponse({
      success: true,
      data: { token: 'livekit-token' },
      message: null,
    })
  }

  const result = await postJson('/meetings/meeting-id/join', {})

  assert.deepEqual(result, { token: 'livekit-token' })
  assert.deepEqual(
    requests.map((request) => request.authorization),
    ['Bearer expired-access', undefined, 'Bearer new-access'],
  )
  assert.equal(readStoredAuthSession().accessToken, 'new-access')
  assert.equal(readStoredAuthSession().refreshToken, 'new-refresh')
  assert.equal(refreshedHandlerSession.accessToken, 'new-access')
})

test('shares one refresh request across concurrent expired requests', async () => {
  globalThis.localStorage = createStorage()
  writeStoredAuthSession({
    accessToken: 'expired-access',
    refreshToken: 'valid-refresh',
    user: { userId: 'user-id', loginId: 'user1', name: '사용자', role: 'USER' },
  })
  setApiClientAuthHandlers()

  let refreshCount = 0
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/auth/token/refresh')) {
      refreshCount += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      return jsonResponse({
        success: true,
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          tokenType: 'Bearer',
          accessTokenExpiresIn: 900,
          refreshTokenExpiresIn: 1209600,
        },
      })
    }
    if (options.headers.Authorization === 'Bearer expired-access') {
      return jsonResponse({ success: false, error: { message: 'expired', details: [] } }, 401)
    }
    return jsonResponse({ success: true, data: { ok: true }, message: null })
  }

  const results = await Promise.all([
    postJson('/meetings/one/join', {}),
    postJson('/meetings/two/join', {}),
  ])

  assert.equal(refreshCount, 1)
  assert.deepEqual(results, [{ ok: true }, { ok: true }])
})

test('refreshes an expired JWT before sending meeting join', async () => {
  globalThis.localStorage = createStorage()
  writeStoredAuthSession({
    accessToken: jwtWithExpiration(Math.floor(Date.now() / 1000) - 1),
    refreshToken: 'valid-refresh',
    user: { userId: 'user-id', loginId: 'user1', name: '사용자', role: 'USER' },
  })
  setApiClientAuthHandlers()

  const requestPaths = []
  globalThis.fetch = async (url, options) => {
    requestPaths.push({ url: String(url), authorization: options.headers.Authorization })
    if (String(url).endsWith('/auth/token/refresh')) {
      return jsonResponse({
        success: true,
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          tokenType: 'Bearer',
          accessTokenExpiresIn: 900,
          refreshTokenExpiresIn: 1209600,
        },
      })
    }
    return jsonResponse({ success: true, data: { token: 'livekit-token' }, message: null })
  }

  await postJson('/meetings/meeting-id/join', {})

  assert.equal(requestPaths.length, 2)
  assert.match(requestPaths[0].url, /\/auth\/token\/refresh$/)
  assert.equal(requestPaths[1].authorization, 'Bearer new-access')
})

test('rejects an expired JWT without sending join when refresh is unavailable', async () => {
  globalThis.localStorage = createStorage()
  writeStoredAuthSession({
    accessToken: jwtWithExpiration(Math.floor(Date.now() / 1000) - 1),
    refreshToken: '',
    user: { userId: 'user-id', loginId: 'user1', name: '사용자', role: 'USER' },
  })

  let fetchCount = 0
  let unauthorizedCount = 0
  setApiClientAuthHandlers({
    onUnauthorized() {
      unauthorizedCount += 1
    },
  })
  globalThis.fetch = async () => {
    fetchCount += 1
    return jsonResponse({ success: true, data: {} })
  }

  await assert.rejects(
    () => postJson('/meetings/meeting-id/join', {}),
    (error) => error.code === 'AUTH_TOKEN_EXPIRED' && error.status === 401,
  )

  assert.equal(fetchCount, 0)
  assert.equal(unauthorizedCount, 1)
  assert.equal(readStoredAuthSession(), null)
})
