import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import { setApiClientAuthHandlers } from './lib/api-client'
import { useAuthStore } from './stores/auth'
import './styles/main.css'

const app = createApp(App)
const auth = useAuthStore(pinia)

setApiClientAuthHandlers({
  onSessionRefreshed(session) {
    auth.applySession(session)
  },
  async onUnauthorized() {
    const refreshed = await auth.refreshSession()
    if (refreshed) {
      return true
    }

    auth.clearSession()
    if (router.currentRoute.value.path !== '/login') {
      await router.push('/login')
    }
    return false
  },
  async onForbidden(error) {
    window.alert(error?.message || '접근 권한이 없습니다.')
  },
})

window.addEventListener('focus', () => {
  void auth.ensureSessionFresh()
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void auth.ensureSessionFresh()
  }
})

app.use(pinia).use(router)

auth.initialize()
  .catch((error) => {
    if (error?.status === 401) {
      auth.clearSession()
    }
  })
  .finally(() => {
    app.mount('#app')
  })
