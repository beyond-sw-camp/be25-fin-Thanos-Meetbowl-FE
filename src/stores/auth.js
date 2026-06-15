import { defineStore } from 'pinia'
import { getJson, postJson } from '../lib/api-client'
import {
  clearStoredAuthSession,
  normalizeUser,
  readStoredAuthSession,
  writeStoredAuthSession,
} from '../lib/auth-session'

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

export const useAuthStore = defineStore('auth', {
  state: createState,
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken && state.user),
    homePath: (state) => (state.user?.role === 'ADMIN' ? '/admin/dashboard' : '/app/dashboard'),
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
      const data = await postJson('/auth/login', {
        loginId: loginId.trim(),
        password,
      })

      this.applySession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenType: data.tokenType,
        accessTokenExpiresIn: data.accessTokenExpiresIn,
        refreshTokenExpiresIn: data.refreshTokenExpiresIn,
        user: data.user,
      })

      return this.fetchCurrentUser()
    },
    async fetchCurrentUser() {
      const profile = await getJson('/users/me')
      this.user = normalizeUser({
        ...this.user,
        ...profile,
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
          })
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
  },
})
