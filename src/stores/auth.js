import { defineStore } from 'pinia'
import { getJson, postJson } from '../lib/api-client.js'
import {
  clearStoredAuthSession,
  normalizeUser,
  readStoredAuthSession,
  writeStoredAuthSession,
} from '../lib/auth-session.js'

const ACCESS_TOKEN_REFRESH_SAFETY_WINDOW_MS = 60 * 1000
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1'

function buildApiUrl(path) {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}

function createState() {
  const session = readStoredAuthSession()

  return {
    accessToken: session?.accessToken || '',
    refreshToken: session?.refreshToken || '',
    tokenType: session?.tokenType || 'Bearer',
    accessTokenExpiresIn: session?.accessTokenExpiresIn || 0,
    refreshTokenExpiresIn: session?.refreshTokenExpiresIn || 0,
    accessTokenExpiresAt: session?.accessTokenExpiresAt || 0,
    refreshTokenExpiresAt: session?.refreshTokenExpiresAt || 0,
    user: session?.user || null,
  }
}

function getRoleHomePath(role) {
  return role === 'ADMIN' ? '/admin/dashboard' : '/app/dashboard'
}

export const useAuthStore = defineStore('auth', {
  state: createState,
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken && state.user),
    homePath: (state) => getRoleHomePath(state.user?.role),
    requiresInitialPasswordChange: (state) => Boolean(state.user?.initialPasswordChangeRequired),
    postLoginPath() {
      return this.requiresInitialPasswordChange ? '/password/change' : this.homePath
    },
  },
  actions: {
    persistSession() {
      writeStoredAuthSession({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenType: this.tokenType,
        accessTokenExpiresIn: this.accessTokenExpiresIn,
        refreshTokenExpiresIn: this.refreshTokenExpiresIn,
        accessTokenExpiresAt: this.accessTokenExpiresAt,
        refreshTokenExpiresAt: this.refreshTokenExpiresAt,
        user: this.user,
      })
    },
    applySession(session) {
      const now = Date.now()
      this.accessToken = session?.accessToken || ''
      this.refreshToken = session?.refreshToken || ''
      this.tokenType = session?.tokenType || 'Bearer'
      this.accessTokenExpiresIn = session?.accessTokenExpiresIn || 0
      this.refreshTokenExpiresIn = session?.refreshTokenExpiresIn || 0
      this.accessTokenExpiresAt =
        Number(session?.accessTokenExpiresAt) > 0
          ? Number(session.accessTokenExpiresAt)
          : this.accessTokenExpiresIn > 0
            ? now + (this.accessTokenExpiresIn * 1000)
            : 0
      this.refreshTokenExpiresAt =
        Number(session?.refreshTokenExpiresAt) > 0
          ? Number(session.refreshTokenExpiresAt)
          : this.refreshTokenExpiresIn > 0
            ? now + (this.refreshTokenExpiresIn * 1000)
            : 0
      this.user = normalizeUser(session?.user)
      this.persistSession()
      this.scheduleTokenRefresh()
    },
    clearSession() {
      this.accessToken = ''
      this.refreshToken = ''
      this.tokenType = 'Bearer'
      this.accessTokenExpiresIn = 0
      this.refreshTokenExpiresIn = 0
      this.accessTokenExpiresAt = 0
      this.refreshTokenExpiresAt = 0
      this.user = null
      this.clearTokenRefreshTimer()
      this.refreshSessionPromise = null
      clearStoredAuthSession()
    },
    async initialize() {
      if (!this.accessToken) return

      await this.ensureSessionFresh()

      try {
        await this.fetchCurrentUser()
      } catch (error) {
        if (error?.status !== 401) throw error
      }
    },
    async login(loginId, password) {
      const data = await postJson(
        '/auth/login',
        {
          loginId: loginId.trim(),
          password,
        },
        { skipAuth: true, skipAuthRefresh: true },
      )

      this.applySession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenType: data.tokenType,
        accessTokenExpiresIn: data.accessTokenExpiresIn,
        refreshTokenExpiresIn: data.refreshTokenExpiresIn,
        user: data.user,
      })

      // 초기 비밀번호 변경 대상은 로그인 응답만으로도 강제 이동을 결정할 수 있다.
      if (data.user?.initialPasswordChangeRequired) {
        return this.user
      }

      return this.fetchCurrentUser()
    },
    async fetchCurrentUser() {
      const profile = await getJson('/users/me')
      this.user = normalizeUser({
        ...this.user,
        ...profile,
        // 로그인 응답에서 받은 최초 변경 필요 여부는 /users/me 응답이 없더라도 유지해야 한다.
        initialPasswordChangeRequired: this.user?.initialPasswordChangeRequired,
      })
      this.persistSession()
      return this.user
    },
    clearTokenRefreshTimer() {
      if (this.tokenRefreshTimerId) {
        globalThis.clearTimeout(this.tokenRefreshTimerId)
        this.tokenRefreshTimerId = null
      }
    },
    scheduleTokenRefresh() {
      this.clearTokenRefreshTimer()

      if (!this.accessToken || !this.refreshToken || !this.accessTokenExpiresAt) return

      const refreshAt = Math.max(
        Date.now() + 1000,
        this.accessTokenExpiresAt - ACCESS_TOKEN_REFRESH_SAFETY_WINDOW_MS,
      )
      const delay = Math.max(1000, refreshAt - Date.now())
      this.tokenRefreshTimerId = globalThis.setTimeout(() => {
        void this.ensureSessionFresh()
      }, delay)
      this.tokenRefreshTimerId?.unref?.()
    },
    async refreshSession() {
      if (!this.refreshToken) return false
      if (this.refreshSessionPromise) return this.refreshSessionPromise

      this.refreshSessionPromise = (async () => {
        try {
          const response = await fetch(buildApiUrl('/auth/token/refresh'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: this.refreshToken }),
          })
          const payload = await response.json().catch(() => null)
          if (!response.ok || !payload?.success) {
            return false
          }

          this.applySession({
            ...payload.data,
            user: this.user,
          })
          return true
        } catch {
          return false
        } finally {
          this.refreshSessionPromise = null
        }
      })()

      return this.refreshSessionPromise
    },
    async ensureSessionFresh() {
      if (!this.accessToken || !this.refreshToken) return false
      if (!this.accessTokenExpiresAt) {
        this.scheduleTokenRefresh()
        return true
      }

      const remainingMs = this.accessTokenExpiresAt - Date.now()
      if (remainingMs <= ACCESS_TOKEN_REFRESH_SAFETY_WINDOW_MS) {
        return this.refreshSession()
      }

      this.scheduleTokenRefresh()
      return true
    },
    async logout() {
      try {
        if (this.accessToken && this.refreshToken) {
          await postJson('/auth/logout', {
            refreshToken: this.refreshToken,
          }, { skipAuthRefresh: true })
        }
      } catch (error) {
        if (error?.status !== 401 && error?.status !== 403) {
          throw error
        }
      } finally {
        this.clearSession()
      }
    },
    updateProfile(profile) {
      if (!this.user) return

      this.user = normalizeUser({ ...this.user, ...profile })
      this.persistSession()
    },
    clearInitialPasswordChangeRequired() {
      if (!this.user) return

      this.user = normalizeUser({
        ...this.user,
        // 비밀번호 변경 성공 직후에는 다음 라우팅 판단이 바로 풀리도록 세션 플래그를 즉시 내린다.
        initialPasswordChangeRequired: false,
      })
      this.persistSession()
    },
    async refreshSessionWithPassword(password) {
      if (!this.user?.loginId) return null

      // 비밀번호 변경 직후 새 비밀번호로 다시 로그인해 토큰 claim과 세션 사용자 정보를 함께 갱신한다.
      return this.login(this.user.loginId, password)
    },
  },
})
