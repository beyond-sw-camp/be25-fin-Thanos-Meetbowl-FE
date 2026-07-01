<script>
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarCheck2, Eye, FileText, LockKeyhole, Sparkles, User } from '@lucide/vue'
import ModalShell from '../../components/common/ModalShell.vue'
import { requestPasswordReset } from '../../lib/auth.js'
import { clearRememberedLoginId, readRememberedLoginId, writeRememberedLoginId } from '../../lib/auth-session'
import { useAuthStore } from '../../stores/auth'

export default defineComponent({
  components: {
    ModalShell,
    CalendarCheck2,
    Eye,
    FileText,
    LockKeyhole,
    Sparkles,
    User,
  },
  setup() {
    const auth = useAuthStore()
    const router = useRouter()
    const quickLoginAccounts = [
      { label: '한화시스템 조창희 프로님', loginId: 'testuser100', password: '12341234' },
      { label: '한화시스템 임재철 프로님', loginId: 'testuser101', password: '12341234' },
      { label: '문인수 강사님', loginId: 'testuser102', password: '12341234' },
      { label: 'Admin', loginId: 'admin', password: '1234' },
    ]
    const rememberedLoginId = readRememberedLoginId()
    const loginId = ref(rememberedLoginId)
    const password = ref('')
    const rememberLoginId = ref(Boolean(rememberedLoginId))
    const error = ref('')
    const loading = ref(false)
    const passwordVisible = ref(false)
    const passwordResetOpen = ref(false)
    const passwordResetLoading = ref(false)
    const passwordResetError = ref('')
    const passwordResetMessage = ref('')
    const passwordResetForm = ref({
      loginId: rememberedLoginId,
      email: '',
    })

    async function submit() {
      error.value = ''
      loading.value = true

      try {
        // 로그인 요청 전에 체크 상태를 반영해야 실패 후에도 아이디 저장 UX가 자연스럽게 유지된다.
        if (rememberLoginId.value) {
          writeRememberedLoginId(loginId.value)
        } else {
          clearRememberedLoginId()
        }

        await auth.login(loginId.value, password.value)
        // 최초 비밀번호 변경 대상은 일반 화면이 아니라 강제 변경 화면으로 보내야 한다.
        router.push(auth.postLoginPath)
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }

    function applyQuickLogin(account) {
      loginId.value = account.loginId
      password.value = account.password
      passwordVisible.value = false
      error.value = ''
    }

    function openPasswordReset() {
      passwordResetOpen.value = true
      passwordResetError.value = ''
      passwordResetMessage.value = ''
      passwordResetForm.value = {
        loginId: loginId.value.trim(),
        email: '',
      }
    }

    function closePasswordReset() {
      if (passwordResetLoading.value) return

      passwordResetOpen.value = false
      passwordResetError.value = ''
      passwordResetMessage.value = ''
      passwordResetForm.value = {
        loginId: loginId.value.trim(),
        email: '',
      }
    }

    async function submitPasswordReset() {
      if (passwordResetLoading.value) return

      passwordResetError.value = ''
      passwordResetMessage.value = ''

      const normalizedLoginId = passwordResetForm.value.loginId.trim()
      const normalizedEmail = passwordResetForm.value.email.trim()

      if (!normalizedLoginId) {
        passwordResetError.value = '아이디를 입력해 주세요.'
        return
      }

      if (!normalizedEmail) {
        passwordResetError.value = '이메일을 입력해 주세요.'
        return
      }

      passwordResetLoading.value = true

      try {
        await requestPasswordReset({
          loginId: normalizedLoginId,
          email: normalizedEmail,
        })
        // 계정 존재 여부를 유추할 수 없도록 성공 안내 문구는 항상 같은 문구만 보여준다.
        passwordResetMessage.value =
          '비밀번호 재설정 요청이 접수되었습니다.\n관리자 확인 후 초기 비밀번호로 재설정됩니다.'
        passwordResetForm.value = {
          loginId: normalizedLoginId,
          email: '',
        }
      } catch (err) {
        passwordResetError.value = err.message
      } finally {
        passwordResetLoading.value = false
      }
    }

    return {
      loginId,
      password,
      passwordVisible,
      rememberLoginId,
      error,
      loading,
      quickLoginAccounts,
      applyQuickLogin,
      submit,
      passwordResetOpen,
      passwordResetLoading,
      passwordResetError,
      passwordResetMessage,
      passwordResetForm,
      openPasswordReset,
      closePasswordReset,
      submitPasswordReset,
    }
  },
  template: `
    <main class="login-page">
      <section class="login-brand">
        <div class="brand large login-brand-marking"><span class="brand-mark">M</span><span>Meetbowl</span></div>
        <div class="login-brand-copy">
          <h1>
            <span class="login-headline-line">회의실 <em>예약</em>부터</span>
            <span class="login-headline-line">자동 <em>회의록</em>까지</span>
            <span class="login-headline-line">회의의 <em>모든 과정</em>을 하나로</span>
          </h1>
          <p>예약, 화상회의, 자동 회의록, 메일 공유까지 하나의 흐름으로 연결되는 업무 플랫폼입니다.</p>
          <div class="login-tags">
            <span><CalendarCheck2 :size="16" /> 회의실 예약</span>
            <span><Sparkles :size="16" /> AI 회의록</span>
            <span><FileText :size="16" /> AI 요약</span>
          </div>
        </div>
<!--        <div class="login-brand-illustration" aria-hidden="true">-->
<!--          <div class="login-illus-card login-illus-main"></div>-->
<!--          <div class="login-illus-bubble"></div>-->
<!--          <div class="login-illus-calendar"></div>-->
<!--        </div>-->
        <small class="login-copyright">© 2026 Meetbowl Inc.</small>
      </section>
      <section class="login-form-wrap">
        <form class="login-card" @submit.prevent="submit">
          <div class="login-card-icon"><LockKeyhole :size="28" /></div>
          <h2>로그인</h2>
          <p>사내 업무 플랫폼에 접속해 주세요.</p>
          <label>
            아이디
            <span class="login-input-wrap">
              <User :size="18" />
              <input v-model="loginId" placeholder="아이디를 입력하세요" autofocus>
            </span>
          </label>
          <label>
            비밀번호
            <span class="login-input-wrap">
              <LockKeyhole :size="18" />
              <input v-model="password" :type="passwordVisible ? 'text' : 'password'" placeholder="비밀번호를 입력하세요">
              <button class="login-input-action" type="button" aria-label="비밀번호 표시 전환" @click="passwordVisible = !passwordVisible"><Eye :size="18" /></button>
            </span>
          </label>
          <section class="demo-box">
            <div class="demo-box-copy">
              <strong>심사위원 빠른 입력</strong>
              <p>버튼을 누르면 로그인 정보가 자동으로 입력됩니다.</p>
            </div>
            <div class="demo-grid">
              <button
                v-for="account in quickLoginAccounts"
                :key="account.loginId"
                type="button"
                @click="applyQuickLogin(account)"
              >
                <strong>{{ account.label }}</strong>
                <small>{{ account.loginId }} / {{ account.password }}</small>
              </button>
            </div>
          </section>
          <div class="login-form-actions">
            <label class="checkbox-field">
              <input v-model="rememberLoginId" type="checkbox">
              <span>아이디 저장</span>
            </label>
            <button class="text-button" type="button" @click="openPasswordReset">비밀번호 재설정 요청</button>
          </div>
          <div v-if="error" class="error-box">{{ error }}</div>
          <button class="primary-button" :disabled="loading">{{ loading ? '로그인 중...' : '로그인' }}</button>
        </form>
      </section>
      <ModalShell v-if="passwordResetOpen" modal-class="password-reset-modal" @close="closePasswordReset">
        <form class="password-reset-form" @submit.prevent="submitPasswordReset">
          <header>
            <div>
              <h2>비밀번호 재설정 요청</h2>
              <p class="modal-note">관리자 확인 후 초기 비밀번호 재설정이 진행됩니다.</p>
            </div>
            <button class="modal-close" type="button" aria-label="닫기" @click="closePasswordReset">×</button>
          </header>
          <label>로그인 ID<input v-model="passwordResetForm.loginId" autofocus></label>
          <label>이메일<input v-model="passwordResetForm.email" type="email"></label>
          <p v-if="passwordResetMessage" class="login-reset-success">{{ passwordResetMessage }}</p>
          <div v-if="passwordResetError" class="error-box">{{ passwordResetError }}</div>
          <footer>
            <div class="password-reset-actions">
              <button class="secondary-button" type="button" :disabled="passwordResetLoading" @click="closePasswordReset">취소</button>
              <button class="primary-button" :disabled="passwordResetLoading">
                {{ passwordResetLoading ? '요청 중...' : '재설정 요청' }}
              </button>
            </div>
          </footer>
        </form>
      </ModalShell>
    </main>
  `,
})
</script>
