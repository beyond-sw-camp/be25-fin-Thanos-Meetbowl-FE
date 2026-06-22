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
    auth.clearSession()
    if (router.currentRoute.value.path !== '/login') {
      await router.push('/login')
    }
  },
  async onForbidden(error) {
    window.alert(error?.message || '접근 권한이 없습니다.')
  },
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
