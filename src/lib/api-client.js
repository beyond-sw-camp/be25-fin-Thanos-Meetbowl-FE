import { clearStoredAuthSession, readStoredAuthSession } from './auth-session.js'

// 배포 환경은 환경변수를 우선하고, 로컬 개발은 Vite 프록시 경로를 기본값으로 쓴다.
const DEFAULT_API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1'

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

export function postJson(path, body, options = {}) {
  return requestJson(path, { ...options, method: 'POST', body })
}

export function patchJson(path, body, options = {}) {
  return requestJson(path, { ...options, method: 'PATCH', body })
}

export async function requestJson(path, options = {}) {
  const response = await fetch(buildApiUrl(path), {
    method: options.method || 'GET',
    headers: buildHeaders(options),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) {
    const message = payload?.error?.message || `요청에 실패했습니다. (${response.status})`
    const error = new ApiError(message, response.status, payload?.error?.details || [])

    if (response.status === 401) {
      clearStoredAuthSession()
      await onUnauthorized?.(error)
    } else if (response.status === 403 && !options.skipForbiddenHandler) {
      await onForbidden?.(error)
    }

    throw error
  }

  return payload.data
}

function buildHeaders(options) {
  const headers = {
    ...(options.headers || {}),
  }

  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const session = readStoredAuthSession()
  const token = options.token || session?.accessToken
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

function buildApiUrl(path) {
  const normalizedBaseUrl = DEFAULT_API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}
