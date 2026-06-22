import { defineStore } from 'pinia'
import { getJson, postJson } from '../lib/api-client.js'
import {
  clearStoredAuthSession,
  normalizeUser,
  readStoredAuthSession,
  writeStoredAuthSession,
} from '../lib/auth-session.js'

function createState() {
  const session = readStoredAuthSession()

  return {
    accessToken: session?.accessToken || '',
    refreshToken: session?.refreshToken || '',
    tokenType: session?.tokenType || 'Bearer',
    accessTokenExpiresIn: session?.accessTokenExpiresIn || 0,
    refreshTokenExpiresIn: session?.refreshTokenExpiresIn || 0,
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
        user: this.user,
      })
    },
    applySession(session) {
      this.accessToken = session?.accessToken || ''
      this.refreshToken = session?.refreshToken || ''
      this.tokenType = session?.tokenType || 'Bearer'
      this.accessTokenExpiresIn = session?.accessTokenExpiresIn || 0
      this.refreshTokenExpiresIn = session?.refreshTokenExpiresIn || 0
      this.user = normalizeUser(session?.user)
      this.persistSession()
    },
    clearSession() {
      this.accessToken = ''
      this.refreshToken = ''
      this.tokenType = 'Bearer'
      this.accessTokenExpiresIn = 0
      this.refreshTokenExpiresIn = 0
      this.user = null
      clearStoredAuthSession()
    },
    async initialize() {
      if (!this.accessToken) return

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
    async logout() {
      try {
        if (this.accessToken && this.refreshToken) {
          await postJson('/auth/logout', {
            refreshToken: this.refreshToken,
          }, { skipAuthRefresh: true })
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
