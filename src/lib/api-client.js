const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'

/**
 * meetbowl-be 공통 응답 Envelope를 해석하는 최소 API 클라이언트다.
 *
 * 현재 화면은 mock 기반이 많지만, 회의 입장처럼 보안상 브라우저가 직접 처리하면 안 되는 기능은 이 클라이언트를 통해 BE만 호출한다.
 */
export async function postJson(path, body) {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) {
    const message = payload?.error?.message || `요청에 실패했습니다. (${response.status})`
    throw new Error(message)
  }

  return payload.data
}

function buildApiUrl(path) {
  const normalizedBaseUrl = DEFAULT_API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}
