import { postJson } from './api-client.js'

export function changeInitialPassword(payload) {
  return postJson('/auth/password/change-initial', {
    newPassword: payload?.newPassword || '',
    newPasswordConfirm: payload?.newPasswordConfirm || '',
  })
}

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
