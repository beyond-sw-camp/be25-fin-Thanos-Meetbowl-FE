import { postJson } from './api-client.js'

export function requestPasswordReset(payload) {
  return postJson(
    '/auth/password-reset/request',
    {
      loginId: `${payload?.loginId || ''}`.trim(),
      email: `${payload?.email || ''}`.trim(),
    },
    { skipAuth: true, skipAuthRefresh: true },
  )
}
