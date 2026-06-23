import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession,
} from './auth-session.js'

export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1'

let onUnauthorized = null
let onForbidden = null
let onSessionRefreshed = null
let refreshPromise = null

export class ApiError extends Error {
  constructor(message, status, details, code = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.code = code
  }
}

export function setApiClientAuthHandlers(handlers = {}) {
  onUnauthorized = handlers.onUnauthorized || null
  onForbidden = handlers.onForbidden || null
  onSessionRefreshed = handlers.onSessionRefreshed || null
}

export function getJson(path, options = {}) {
  return requestJson(path, { ...options, method: 'GET' })
}

export function getBlob(path, options = {}) {
  // 파일 다운로드처럼 JSON 대신 바이너리 본문과 응답 헤더를 함께 써야 할 때 사용한다.
  return requestBlob(path, { ...options, method: 'GET' })
}

export function postJson(path, body, options = {}) {
  return requestJson(path, { ...options, method: 'POST', body })
}

export function patchJson(path, body, options = {}) {
  return requestJson(path, { ...options, method: 'PATCH', body })
}

export function deleteJson(path, options = {}) {
  return requestJson(path, { ...options, method: 'DELETE' })
}

export function postForm(path, formData, options = {}) {
  return request(path, { ...options, method: 'POST', body: formData })
}

export async function requestJson(path, options = {}) {
  return request(path, {
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    jsonBody: options.body !== undefined,
  })
}

export async function request(path, options = {}) {
  const response = await fetchWithAuthRetry(path, options)
  const payload = await response.json().catch(() => null)

  if (response.status === 401 && !options._retriedAfterUnauthorized) {
    const recovered = await handleUnauthorized(response, options, payload)
    if (recovered) {
      return request(path, { ...options, _retriedAfterUnauthorized: true })
    }
  }

  if (!response.ok || !payload?.success) {
    const message = payload?.error?.message || `요청에 실패했습니다. (${response.status})`
    const error = new Error(message)
    error.code = payload?.error?.code || null
    error.status = response.status
    throw error
  }

  await throwIfRequestFailed(response, options, payload)

  return payload.data
}

export async function requestBlob(path, options = {}) {
  const response = await fetchWithAuthRetry(path, options)
  const contentType = response.headers.get('Content-Type') || ''

  let errorPayload = null
  // 파일 응답이어도 실패 시에는 JSON 에러 본문이 올 수 있어 공통 에러 처리로 넘긴다.
  if (!response.ok || contentType.includes('application/json')) {
    errorPayload = await response.clone().json().catch(() => null)
  }

  if (response.status === 401 && !options._retriedAfterUnauthorized) {
    const recovered = await handleUnauthorized(response, options, errorPayload)
    if (recovered) {
      return requestBlob(path, { ...options, _retriedAfterUnauthorized: true })
    }
  }

  await throwIfRequestFailed(response, options, errorPayload)

  return {
    blob: await response.blob(),
    headers: response.headers,
  }
}

function buildHeaders(options) {
  const headers = {
    ...(options.headers || {}),
  }

  if (options.jsonBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const session = options.skipAuth ? null : readStoredAuthSession()
  const token = options.skipAuth ? null : options.token || session?.accessToken
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

async function fetchWithAuthRetry(path, options) {
  const url = buildApiUrl(path)
  let requestOptions = options
  if (!options.skipAuth && !options.skipAuthRefresh) {
    const session = readStoredAuthSession()
    if (session && shouldRefreshAccessToken(session.accessToken)) {
      if (!session.refreshToken) return rejectExpiredSession()
      const refreshedSession = await refreshAuthSession(session)
      if (!refreshedSession?.accessToken) return rejectExpiredSession()
      requestOptions = { ...options, token: refreshedSession.accessToken }
    }
  }

  const response = await fetch(url, buildRequestInit(requestOptions))
  if (response.status !== 401 || options.skipAuth || options.skipAuthRefresh) {
    return response
  }

  const session = readStoredAuthSession()
  if (!session?.refreshToken) return response

  const refreshedSession = await refreshAuthSession(session)
  if (!refreshedSession?.accessToken) return response

  return fetch(url, buildRequestInit({
    ...options,
    token: refreshedSession.accessToken,
  }))
}

async function rejectExpiredSession() {
  const error = new ApiError(
    '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.',
    401,
    [],
    'AUTH_TOKEN_EXPIRED',
  )
  clearStoredAuthSession()
  await onUnauthorized?.(error)
  throw error
}

function shouldRefreshAccessToken(accessToken, nowMs = Date.now()) {
  const payload = parseJwtPayload(accessToken)
  if (!Number.isFinite(payload?.exp)) return false
  const refreshBeforeMs = 30 * 1000
  return payload.exp * 1000 <= nowMs + refreshBeforeMs
}

function parseJwtPayload(token) {
  try {
    const encodedPayload = String(token || '').split('.')[1]
    if (!encodedPayload) return null
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

async function refreshAuthSession(session) {
  if (refreshPromise) return refreshPromise

  const pending = performTokenRefresh(session)
  refreshPromise = pending
  try {
    return await pending
  } finally {
    if (refreshPromise === pending) refreshPromise = null
  }
}

async function performTokenRefresh(session) {
  try {
    const response = await fetch(buildApiUrl('/auth/token/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success || !payload.data?.accessToken) return null

    const refreshedSession = writeStoredAuthSession({
      ...session,
      ...payload.data,
      user: session.user,
    })
    await onSessionRefreshed?.(refreshedSession)
    return refreshedSession
  } catch {
    return null
  }
}

function buildRequestInit(options) {
  // JSON/Blob 요청 모두 같은 인증 헤더와 body 구성을 재사용하도록 fetch 옵션을 모은다.
  return {
    method: options.method || 'GET',
    headers: buildHeaders(options),
    body: options.body,
    keepalive: Boolean(options.keepalive),
  }
}

async function throwIfRequestFailed(response, options, payload = null) {
  if (response.ok && payload?.success !== false) return

  // 401/403과 validation details를 한 경로에서 처리해야 로그인 이동과 메시지 표시가 일관된다.
  const firstDetailReason = payload?.error?.details?.[0]?.reason
  const message =
    firstDetailReason || payload?.error?.message || `요청이 실패했습니다. (${response.status})`
  const error = new ApiError(
    message,
    response.status,
    payload?.error?.details || [],
    payload?.error?.code || null,
  )

  if (response.status === 401) {
    clearStoredAuthSession()
    await onUnauthorized?.(error)
  } else if (response.status === 403 && !options.skipForbiddenHandler) {
    await onForbidden?.(error)
  }

  throw error
}

async function handleUnauthorized(response, options, payload = null) {
  if (response.status !== 401 || options.skipUnauthorizedHandler) {
    return false
  }

  const firstDetailReason = payload?.error?.details?.[0]?.reason
  const message =
    firstDetailReason || payload?.error?.message || `요청이 실패했습니다. (${response.status})`
  const error = new ApiError(message, response.status, payload?.error?.details || [])
  return Boolean(await onUnauthorized?.(error))
}

function buildApiUrl(path) {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}
