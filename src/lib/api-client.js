import { clearStoredAuthSession, readStoredAuthSession } from './auth-session.js'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

let onUnauthorized = null
let onForbidden = null

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function setApiClientAuthHandlers(handlers = {}) {
  onUnauthorized = handlers.onUnauthorized || null
  onForbidden = handlers.onForbidden || null
}

export function getJson(path, options = {}) {
  return requestJson(path, { ...options, method: 'GET' })
}

export function getBlob(path, options = {}) {
  // 엑셀 다운로드처럼 JSON 대신 바이너리 본문과 응답 헤더를 함께 써야 할 때 사용한다.
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
  const response = await fetch(buildApiUrl(path), buildRequestInit(options))
  const payload = await response.json().catch(() => null)
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
  const response = await fetch(buildApiUrl(path), buildRequestInit(options))
  const contentType = response.headers.get('Content-Type') || ''

  let errorPayload = null
  // 파일 응답이어도 실패 시에는 JSON 에러 본문이 올 수 있어 공통 에러 처리용으로 한 번 더 읽는다.
  if (!response.ok || contentType.includes('application/json')) {
    errorPayload = await response.clone().json().catch(() => null)
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

  const session = readStoredAuthSession()
  const token = options.token || session?.accessToken
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

function buildRequestInit(options) {
  // JSON/Blob 요청 모두 같은 인증 헤더와 body 구성을 재사용하도록 fetch 옵션을 모은다.
  return {
    method: options.method || 'GET',
    headers: buildHeaders(options),
    body: options.body,
  }
}

async function throwIfRequestFailed(response, options, payload = null) {
  if (response.ok && payload?.success !== false) return

  // 응답 형식이 달라도 401/403 및 공통 에러 메시지 처리는 기존 API client 규칙을 그대로 따른다.
  const firstDetailReason = payload?.error?.details?.[0]?.reason
  const message =
    firstDetailReason || payload?.error?.message || `요청이 실패했습니다. (${response.status})`
  const error = new ApiError(message, response.status, payload?.error?.details || [])

  if (response.status === 401) {
    clearStoredAuthSession()
    await onUnauthorized?.(error)
  } else if (response.status === 403 && !options.skipForbiddenHandler) {
    await onForbidden?.(error)
  }

  throw error
}

function buildApiUrl(path) {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}
