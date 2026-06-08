<script>
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

export default defineComponent({
  setup() {
    const auth = useAuthStore()
    const router = useRouter()
    const username = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)

    async function submit() {
      error.value = ''
      loading.value = true
      try {
        const user = auth.login(username.value, password.value)
        router.push(user.role === 'admin' ? '/admin/dashboard' : '/app/dashboard')
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }

    function quick(value) {
      username.value = value
      password.value = value
    }

    return { username, password, error, loading, submit, quick }
  },
  template: `
    <main class="login-page">
      <section class="login-brand">
        <div class="brand large"><span class="brand-mark">M</span><span>Meetbowl</span></div>
        <div>
          <h1>회의에서 결정으로,<br>결정에서 실행으로.</h1>
          <p>예약, 화상회의, 자동 회의록, 내부 공유까지 하나의 흐름으로 연결된 사내 업무 플랫폼.</p>
          <div class="login-tags"><span>회의실 예약</span><span>AI 회의록</span><span>AI 요약</span></div>
        </div>
        <small>© 2026 Meetbowl Inc.</small>
      </section>
      <section class="login-form-wrap">
        <form class="login-card" @submit.prevent="submit">
          <h2>로그인</h2>
          <p>사내 업무 플랫폼에 접속하세요.</p>
          <label>아이디<input v-model="username" autofocus></label>
          <label>비밀번호<input v-model="password" type="password"></label>
          <div v-if="error" class="error-box">{{ error }}</div>
          <button class="primary-button" :disabled="loading">{{ loading ? '로그인 중...' : '로그인' }}</button>
          <div class="demo-box">
            <strong>데모 계정</strong>
            <div class="demo-grid">
              <button type="button" @click="quick('admin')"><small>Admin</small><span>admin / admin</span></button>
              <button type="button" @click="quick('user')"><small>User</small><span>user / user</span></button>
            </div>
            <p>Admin 계정은 인사팀 공유 계정으로, 데모에서는 관리자 화면 확인용으로만 사용합니다.</p>
          </div>
        </form>
      </section>
    </main>
  `,
})
</script>
