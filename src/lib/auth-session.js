const STORAGE_KEY = 'meetbowl.auth.session'
const REMEMBERED_LOGIN_ID_KEY = 'meetbowl.auth.rememberedLoginId'

function toUpperRole(role) {
  return typeof role === 'string' ? role.toUpperCase() : ''
}

function buildAvatar(name, loginId) {
  const source = `${name || ''}`.trim() || `${loginId || ''}`.trim()
  return source ? source[0].toUpperCase() : '?'
}

function decodeBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')

  if (typeof atob === 'function') {
    return atob(padded)
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('binary')
  }
  return ''
}

function readJwtExpirationAt(token) {
  const parts = String(token || '').split('.')
  if (parts.length < 2) return 0

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]))
    const expiresAt = Number(payload?.exp || 0) * 1000
    return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : 0
  } catch {
    return 0
  }
}

export function normalizeUser(user) {
  if (!user) return null

  const role = toUpperRole(user.role)
  const userId = user.userId || user.id || null
  const loginId = user.loginId || user.username || ''
  const name = user.name || ''

  return {
    ...user,
    id: userId,
    userId,
    username: loginId,
    loginId,
    role,
    affiliate: user.affiliate || user.company || '',
    company: user.company || user.affiliate || '',
    department: user.department || '',
    team: user.team || '',
    position: user.position || '',
    email: user.email || '',
    status: user.status || '',
    name,
    avatar: user.avatar || buildAvatar(name, loginId),
    initialPasswordChangeRequired: Boolean(user.initialPasswordChangeRequired),
  }
}

export function readStoredAuthSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.accessToken) return null

    return {
      ...parsed,
      accessTokenExpiresAt:
        Number(parsed.accessTokenExpiresAt) > 0
          ? Number(parsed.accessTokenExpiresAt)
          : readJwtExpirationAt(parsed.accessToken),
      refreshTokenExpiresAt: Number(parsed.refreshTokenExpiresAt) > 0 ? Number(parsed.refreshTokenExpiresAt) : 0,
      user: normalizeUser(parsed.user),
    }
  } catch {
    return null
  }
}

export function writeStoredAuthSession(session) {
  const normalizedSession = {
    accessToken: session?.accessToken || '',
    refreshToken: session?.refreshToken || '',
    tokenType: session?.tokenType || 'Bearer',
    accessTokenExpiresIn: session?.accessTokenExpiresIn || 0,
    refreshTokenExpiresIn: session?.refreshTokenExpiresIn || 0,
    accessTokenExpiresAt: Number(session?.accessTokenExpiresAt) > 0 ? Number(session.accessTokenExpiresAt) : 0,
    refreshTokenExpiresAt: Number(session?.refreshTokenExpiresAt) > 0 ? Number(session.refreshTokenExpiresAt) : 0,
    user: normalizeUser(session?.user),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSession))
  return normalizedSession
}

export function clearStoredAuthSession() {
  localStorage.removeItem(STORAGE_KEY)
}

export function readRememberedLoginId() {
  try {
    return localStorage.getItem(REMEMBERED_LOGIN_ID_KEY) || ''
  } catch {
    return ''
  }
}

export function writeRememberedLoginId(loginId) {
  const normalizedLoginId = `${loginId || ''}`.trim()
  if (!normalizedLoginId) {
    clearRememberedLoginId()
    return ''
  }

  // 아이디 저장은 loginId만 남기고 비밀번호나 토큰류는 기존 세션 저장소와 분리한다.
  localStorage.setItem(REMEMBERED_LOGIN_ID_KEY, normalizedLoginId)
  return normalizedLoginId
}

export function clearRememberedLoginId() {
  localStorage.removeItem(REMEMBERED_LOGIN_ID_KEY)
}
