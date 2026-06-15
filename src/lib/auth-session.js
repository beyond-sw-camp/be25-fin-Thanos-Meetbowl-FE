const STORAGE_KEY = 'meetbowl.auth.session'

function toUpperRole(role) {
  return typeof role === 'string' ? role.toUpperCase() : ''
}

function buildAvatar(name, loginId) {
  const source = `${name || ''}`.trim() || `${loginId || ''}`.trim()
  return source ? source[0].toUpperCase() : '?'
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
    user: normalizeUser(session?.user),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSession))
  return normalizedSession
}

export function clearStoredAuthSession() {
  localStorage.removeItem(STORAGE_KEY)
}
