import { defineStore } from 'pinia'

const STORAGE_KEY = 'meetbowl.demo.user'

const accounts = {
  user: {
    password: 'user',
    user: {
      id: 'u-user',
      username: 'user',
      name: '이지연',
      role: 'user',
      department: '전략기획팀',
      position: '선임',
      email: 'user@meetbowl.co',
      avatar: '이',
    },
  },
  admin: {
    password: 'admin',
    user: {
      id: 'u-admin',
      username: 'admin',
      name: '박관리',
      role: 'admin',
      department: 'IT운영팀',
      position: '팀장',
      email: 'admin@meetbowl.co',
      avatar: '박',
    },
  },
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: readStoredUser(),
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    homePath: (state) => (state.user?.role === 'admin' ? '/admin/dashboard' : '/app/dashboard'),
  },
  actions: {
    login(username, password) {
      const key = username.trim().toLowerCase()
      const account = accounts[key]
      if (!account || account.password !== password) {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
      }
      this.user = account.user
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account.user))
      return account.user
    },
    logout() {
      this.user = null
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})
