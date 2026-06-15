<script>
import { computed, defineComponent, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

export default defineComponent({
  setup() {
    const auth = useAuthStore()
    const user = computed(() => auth.user)
    const isAdmin = computed(() => user.value?.role === 'ADMIN')
    const form = ref({
      name: user.value?.name || '',
      email: user.value?.email || '',
      company: user.value?.company || '',
      department: user.value?.department || '',
      position: user.value?.position || '',
    })
    const password = ref({ current: '', next: '', confirm: '' })
    const passwordVerified = ref(false)
    const passwordMessage = ref('')
    const meetingAlarm = ref('10')
    const notice = ref('')

    function saveProfile() {
      auth.updateProfile(form.value)
      notice.value = '프로필 정보를 저장했습니다.'
    }

    function verifyCurrentPassword() {
      if (!password.value.current) {
        passwordMessage.value = '현재 비밀번호를 입력하세요.'
        passwordVerified.value = false
        return
      }
      if (password.value.current === user.value?.loginId) {
        passwordVerified.value = true
        passwordMessage.value = '현재 비밀번호가 확인되었습니다.'
      } else {
        passwordVerified.value = false
        passwordMessage.value = '현재 비밀번호가 일치하지 않습니다.'
      }
    }

    function changePassword() {
      if (!passwordVerified.value) {
        passwordMessage.value = '현재 비밀번호 확인이 필요합니다.'
        return
      }
      if (password.value.next.length < 4) {
        passwordMessage.value = '새 비밀번호는 4자 이상이어야 합니다.'
        return
      }
      if (password.value.next !== password.value.confirm) {
        passwordMessage.value = '새 비밀번호가 일치하지 않습니다.'
        return
      }
      password.value = { current: '', next: '', confirm: '' }
      passwordVerified.value = false
      passwordMessage.value = '비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용하세요.'
    }

    return {
      user,
      isAdmin,
      form,
      password,
      passwordVerified,
      passwordMessage,
      meetingAlarm,
      notice,
      saveProfile,
      verifyCurrentPassword,
      changePassword,
    }
  },
  template: `
    <section class="page settings-page">
      <header class="page-header">
        <h1>설정</h1>
        <p>개인 정보와 알림 환경을 관리합니다.</p>
      </header>

      <article class="card settings-card">
        <div class="settings-card-head">
          <h2>프로필</h2>
          <button v-if="isAdmin" type="button" class="primary-button small" @click="saveProfile">저장</button>
          <span v-else class="readonly-label">읽기 전용</span>
        </div>
        <div v-if="!isAdmin" class="settings-alert">
          프로필 정보는 관리자만 수정할 수 있습니다. 변경이 필요하면 인사 담당 관리자에게 요청하세요.
        </div>
        <div class="settings-form-grid">
          <label>이름<input v-model="form.name" :readonly="!isAdmin" :class="{ readonly: !isAdmin }"></label>
          <label>이메일<input v-model="form.email" :readonly="!isAdmin" :class="{ readonly: !isAdmin }"></label>
          <label>계열사<input v-model="form.company" :readonly="!isAdmin" :class="{ readonly: !isAdmin }"></label>
          <label>부서<input v-model="form.department" :readonly="!isAdmin" :class="{ readonly: !isAdmin }"></label>
          <label>직급<input v-model="form.position" :readonly="!isAdmin" :class="{ readonly: !isAdmin }"></label>
        </div>
        <p v-if="notice" class="settings-success">{{ notice }}</p>
      </article>

      <article class="card settings-card">
        <h2>비밀번호 변경</h2>
        <p>최초 발급된 초기 비밀번호는 보안을 위해 변경하는 것을 권장합니다.</p>
        <div class="password-box">
          <label>현재 비밀번호
            <div class="password-current-row">
              <input v-model="password.current" type="password" placeholder="••••••" @input="passwordVerified = false">
              <button type="button" :class="{ verified: passwordVerified }" @click="verifyCurrentPassword">{{ passwordVerified ? '확인됨' : '확인' }}</button>
            </div>
          </label>
          <div :class="['password-next-fields', { disabled: !passwordVerified }]">
            <label>새 비밀번호<input v-model="password.next" type="password" placeholder="••••••"></label>
            <label>새 비밀번호 확인<input v-model="password.confirm" type="password" placeholder="••••••"></label>
          </div>
          <button type="button" class="primary-button small" :disabled="!passwordVerified" @click="changePassword">비밀번호 변경</button>
          <p v-if="passwordMessage" class="settings-message">{{ passwordMessage }}</p>
        </div>
      </article>

      <article class="card settings-card">
        <h2>알림</h2>
        <div class="settings-notification-row">
          <span>회의 시작 전 알림</span>
          <select v-model="meetingAlarm">
            <option value="10">10분 전</option>
            <option value="20">20분 전</option>
            <option value="30">30분 전</option>
          </select>
        </div>
        <label class="settings-toggle-row"><span>회의록 생성 완료 알림</span><input type="checkbox" checked></label>
        <label class="settings-toggle-row"><span>새 내부 메일 알림</span><input type="checkbox" checked></label>
      </article>
    </section>
  `,
})
</script>
