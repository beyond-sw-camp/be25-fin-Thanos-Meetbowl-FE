<script>
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearRememberedLoginId, readRememberedLoginId, writeRememberedLoginId } from '../../lib/auth-session'
import { useAuthStore } from '../../stores/auth'

export default defineComponent({
  setup() {
    const auth = useAuthStore()
    const router = useRouter()
    const rememberedLoginId = readRememberedLoginId()
    const loginId = ref(rememberedLoginId)
    const password = ref('')
    const rememberLoginId = ref(Boolean(rememberedLoginId))
    const error = ref('')
    const loading = ref(false)

    async function submit() {
      error.value = ''
      loading.value = true

      try {
        // 로그인 요청 전에 체크 상태를 반영해, 실패 후 재진입해도 아이디 저장 UX가 일관되게 유지되게 한다.
        if (rememberLoginId.value) {
          writeRememberedLoginId(loginId.value)
        } else {
          clearRememberedLoginId()
        }

        await auth.login(loginId.value, password.value)
        // 최초 비밀번호 변경 대상은 일반 홈이 아니라 강제 변경 화면으로 보내야 한다.
        router.push(auth.postLoginPath)
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }

    return { loginId, password, rememberLoginId, error, loading, submit }
  },
  template: `
    <main class="login-page">
      <section class="login-brand">
        <div class="brand large"><span class="brand-mark">M</span><span>Meetbowl</span></div>
        <div>
          <h1>회의에서 결정으로,<br>결정에서 실행으로.</h1>
          <p>예약, 화상회의, 자동 회의록, 메일 공유까지 하나의 흐름으로 연결되는 업무 플랫폼입니다.</p>
          <div class="login-tags"><span>회의실 예약</span><span>AI 회의록</span><span>AI 요약</span></div>
        </div>
        <small>© 2026 Meetbowl Inc.</small>
      </section>
      <section class="login-form-wrap">
        <form class="login-card" @submit.prevent="submit">
          <h2>로그인</h2>
          <p>사내 업무 플랫폼에 접속해 주세요.</p>
          <label>아이디<input v-model="loginId" autofocus></label>
          <label>비밀번호<input v-model="password" type="password"></label>
          <label class="checkbox-field"><input v-model="rememberLoginId" type="checkbox">아이디 저장</label>
          <div v-if="error" class="error-box">{{ error }}</div>
          <button class="primary-button" :disabled="loading">{{ loading ? '로그인 중...' : '로그인' }}</button>
        </form>
      </section>
    </main>
  `,
})
</script>
