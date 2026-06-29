<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  BellRing,
  Eye,
  EyeOff,
  LockKeyhole,
  PencilLine,
  Save,
  Settings as SettingsIcon,
  UserRound,
} from '@lucide/vue'
import ActionButton from '../../components/common/ActionButton.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import { useRouter } from 'vue-router'
import { changeInitialPassword } from '../../lib/auth'
import {
  changeMyPassword,
  getMyProfile,
  getMySettings,
  updateMyProfile,
  updateMySettings,
} from '../../lib/my-profile'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  forcePasswordChange: {
    type: Boolean,
    default: false,
  },
})

const router = useRouter()
const auth = useAuthStore()

const loading = ref(!props.forcePasswordChange)
const profileSaving = ref(false)
const settingsSaving = ref(false)
const passwordSaving = ref(false)
const forbidden = ref(false)
const errorMessage = ref('')

const profile = ref(null)
const profileForm = ref({
  name: '',
  email: '',
})
const settingsForm = ref({
  meetingStartReminderMinutes: 10,
  minutesReviewReminderMinutes: 60,
})
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  newPasswordConfirm: '',
})
const passwordVisibility = ref({
  currentPassword: false,
  newPassword: false,
  newPasswordConfirm: false,
})

const profileMessage = ref('')
const profileError = ref('')
const settingsMessage = ref('')
const settingsError = ref('')
const passwordMessage = ref('')
const passwordError = ref('')

const roleLabelMap = {
  USER: '사용자',
  ADMIN: '관리자',
}

const statusLabelMap = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
}

const reminderOptions = [
  { value: 0, label: '알림 없음' },
  { value: 10, label: '10분 전' },
  { value: 15, label: '15분 전' },
  { value: 20, label: '20분 전' },
  { value: 30, label: '30분 전' },
]

const minutesReviewReminderOptions = [
  { value: 60, label: '1시간마다' },
  { value: 120, label: '2시간마다' },
  { value: 180, label: '3시간마다' },
  { value: 240, label: '4시간마다' },
]

const canEditProfile = computed(() => Boolean(auth.user))

onMounted(() => {
  if (props.forcePasswordChange) {
    // 강제 변경 모드에서는 프로필/개인설정 조회 없이 비밀번호 섹션만 바로 보여준다.
    loading.value = false
    return
  }

  loadPage()
})

async function loadPage() {
  loading.value = true
  forbidden.value = false
  errorMessage.value = ''
  profileMessage.value = ''
  profileError.value = ''
  settingsMessage.value = ''
  settingsError.value = ''

  try {
    const [profileData, settingsData] = await Promise.all([getMyProfile(), getMySettings()])

    profile.value = profileData
    auth.updateProfile(profileData)
    profileForm.value = {
      name: profileData?.name || '',
      email: profileData?.email || '',
    }

    settingsForm.value = {
      meetingStartReminderMinutes: Number(settingsData?.meetingStartReminderMinutes ?? 10),
      minutesReviewReminderMinutes: Number(settingsData?.minutesReviewReminderMinutes ?? 60),
    }
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      errorMessage.value = error?.message || '접근 권한이 없습니다.'
      return
    }

    errorMessage.value = error?.message || '내 정보와 개인 설정을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (!canEditProfile.value || profileSaving.value) return

  profileSaving.value = true
  profileMessage.value = ''
  profileError.value = ''

  try {
    const savedProfile = await updateMyProfile({
      name: profileForm.value.name.trim(),
      email: profileForm.value.email.trim(),
    })

    profile.value = savedProfile
    auth.updateProfile(savedProfile)
    profileForm.value = {
      name: savedProfile?.name || '',
      email: savedProfile?.email || '',
    }
    profileMessage.value = '내 정보를 저장했습니다.'
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
    }
    profileError.value = error?.message || '내 정보 저장에 실패했습니다.'
  } finally {
    profileSaving.value = false
  }
}

async function saveSettings() {
  if (settingsSaving.value) return

  settingsSaving.value = true
  settingsMessage.value = ''
  settingsError.value = ''

  try {
    const savedSettings = await updateMySettings({
      meetingStartReminderMinutes: Number(settingsForm.value.meetingStartReminderMinutes),
      minutesReviewReminderMinutes: Number(settingsForm.value.minutesReviewReminderMinutes),
    })

    settingsForm.value = {
      meetingStartReminderMinutes: Number(savedSettings?.meetingStartReminderMinutes ?? 10),
      minutesReviewReminderMinutes: Number(savedSettings?.minutesReviewReminderMinutes ?? 60),
    }
    settingsMessage.value = '개인 설정을 저장했습니다.'
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
    }
    settingsError.value = error?.message || '개인 설정 저장에 실패했습니다.'
  } finally {
    settingsSaving.value = false
  }
}

async function savePassword() {
  if (passwordSaving.value) return

  passwordMessage.value = ''
  passwordError.value = ''

  const currentPassword = passwordForm.value.currentPassword
  const newPassword = passwordForm.value.newPassword
  const newPasswordConfirm = passwordForm.value.newPasswordConfirm

  if (!props.forcePasswordChange && !currentPassword.trim()) {
    passwordError.value = '현재 비밀번호를 입력해 주세요.'
    return
  }

  if (!newPassword.trim()) {
    passwordError.value = '새 비밀번호를 입력해 주세요.'
    return
  }

  if (newPassword.length < 8 || newPassword.length > 100) {
    passwordError.value = '새 비밀번호는 8자 이상 100자 이하여야 합니다.'
    return
  }

  if (newPassword !== newPasswordConfirm) {
    passwordError.value = '새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.'
    return
  }

  passwordSaving.value = true

  try {
    if (props.forcePasswordChange) {
      await changeInitialPassword({
        newPassword,
        newPasswordConfirm,
      })
    } else {
      await changeMyPassword({
        currentPassword,
        newPassword,
        newPasswordConfirm,
      })
    }

    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      newPasswordConfirm: '',
    }
    // 비밀번호 변경 직후 새 비밀번호로 세션을 다시 받아 initialPasswordChangeRequired와 사용자 정보를 함께 갱신한다.
    await auth.refreshSessionWithPassword(newPassword)
    passwordMessage.value = '비밀번호가 변경되었습니다.'
    auth.clearInitialPasswordChangeRequired()

    if (props.forcePasswordChange) {
      // 강제 변경 흐름에서는 갱신된 세션의 역할을 기준으로 ADMIN/USER 기본 화면으로 바로 보낸다.
      await router.replace(auth.homePath)
    }
  } catch (error) {
    // BE validation details가 내려오면 첫 번째 reason을 우선 노출하고, 없으면 공통 message를 그대로 사용한다.
    passwordError.value = error?.details?.[0]?.reason || error?.message || '비밀번호 변경에 실패했습니다.'
  } finally {
    passwordSaving.value = false
  }
}

function roleLabel(role) {
  const normalizedRole = `${role || ''}`.toUpperCase()
  return roleLabelMap[normalizedRole] || normalizedRole || '-'
}

function statusLabel(status) {
  const normalizedStatus = `${status || ''}`.toUpperCase()
  return statusLabelMap[normalizedStatus] || normalizedStatus || '-'
}

function togglePasswordVisibility(field) {
  passwordVisibility.value[field] = !passwordVisibility.value[field]
}
</script>

<template>
  <section class="page settings-page" :class="{ 'force-password-page': forcePasswordChange }">
    <header class="page-header settings-hero">
      <span class="settings-hero-icon"><SettingsIcon :size="28" /></span>
      <div>
        <h1>{{ forcePasswordChange ? '비밀번호 변경' : '설정' }}</h1>
        <p v-if="forcePasswordChange">
          초기 비밀번호를 변경해 주세요. 계정 보안을 위해 최초 로그인 후 비밀번호 변경이 필요합니다.
        </p>
        <p v-else>내 정보와 개인 설정을 관리합니다.</p>
      </div>
    </header>

    <article v-if="forcePasswordChange" class="card settings-card">
      <h2>최초 로그인 안내</h2>
      <p>초기 비밀번호를 변경하기 전에는 주요 서비스에 진입할 수 없습니다.</p>
      <div class="settings-alert">
        계정 보안을 위해 현재 비밀번호와 새 비밀번호를 입력하고 비밀번호를 변경해 주세요.
      </div>
    </article>

    <article v-if="loading" class="card empty-state">
      내 정보와 개인 설정을 불러오는 중입니다.
    </article>

    <article v-else-if="forbidden" class="card empty-state">
      <h2>접근 권한 없음</h2>
      <p>{{ errorMessage || '이 화면에 접근할 권한이 없습니다.' }}</p>
    </article>

    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions" style="margin-top: 12px;">
        <button class="secondary-button" type="button" @click="loadPage">다시 시도</button>
      </div>
    </article>

    <template v-else>
      <article class="card settings-card">
        <div class="settings-card-head">
          <div class="settings-card-title">
            <span class="settings-card-icon"><LockKeyhole :size="18" /></span>
            <div>
              <h2>비밀번호 변경</h2>
              <p>보안 강화를 위해 비밀번호를 주기적으로 변경해 주세요.</p>
            </div>
          </div>
          <ActionButton
            variant="primary"
            :disabled="passwordSaving"
            @click="savePassword"
          >
            {{ passwordSaving ? '저장 중...' : '비밀번호 변경' }}
          </ActionButton>
        </div>
        <div class="settings-form-grid password-form-grid">
          <label v-if="!forcePasswordChange">
            현재 비밀번호
            <span class="settings-password-field">
              <input
                v-model="passwordForm.currentPassword"
                :type="passwordVisibility.currentPassword ? 'text' : 'password'"
                autocomplete="current-password"
              >
              <button type="button" class="settings-visibility-button" @click="togglePasswordVisibility('currentPassword')">
                <component :is="passwordVisibility.currentPassword ? EyeOff : Eye" :size="18" />
              </button>
            </span>
          </label>
          <label>
            새 비밀번호
            <span class="settings-password-field">
              <input
                v-model="passwordForm.newPassword"
                :type="passwordVisibility.newPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="새 비밀번호를 입력하세요"
              >
              <button type="button" class="settings-visibility-button" @click="togglePasswordVisibility('newPassword')">
                <component :is="passwordVisibility.newPassword ? EyeOff : Eye" :size="18" />
              </button>
            </span>
          </label>
          <label>
            새 비밀번호 확인
            <span class="settings-password-field">
              <input
                v-model="passwordForm.newPasswordConfirm"
                :type="passwordVisibility.newPasswordConfirm ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="새 비밀번호를 다시 입력하세요"
              >
              <button type="button" class="settings-visibility-button" @click="togglePasswordVisibility('newPasswordConfirm')">
                <component :is="passwordVisibility.newPasswordConfirm ? EyeOff : Eye" :size="18" />
              </button>
            </span>
          </label>
        </div>
        <p v-if="passwordMessage" class="settings-success">{{ passwordMessage }}</p>
        <div v-if="passwordError" class="error-box" style="margin-top: 12px;">{{ passwordError }}</div>
      </article>

      <template v-if="!forcePasswordChange">
        <article class="card settings-card">
          <div class="settings-card-head">
            <div class="settings-card-title">
              <span class="settings-card-icon"><UserRound :size="18" /></span>
              <div>
                <h2>내 정보</h2>
              </div>
            </div>
            <ActionButton
              variant="secondary"
              :disabled="!canEditProfile || profileSaving"
              @click="saveProfile"
            >
              <PencilLine :size="15" />
              {{ profileSaving ? '저장 중...' : '수정' }}
            </ActionButton>
          </div>
          <div class="settings-form-grid">
            <label>이름<input v-model="profileForm.name"></label>
            <label>이메일<input v-model="profileForm.email" type="email"></label>
            <label>계열사<input :value="profile?.affiliate || '-'" readonly class="readonly"></label>
            <label>부서<input :value="profile?.department || '-'" readonly class="readonly"></label>
            <label>팀<input :value="profile?.team || '-'" readonly class="readonly"></label>
            <label>직급<input :value="profile?.position || '-'" readonly class="readonly"></label>
            <label>권한<input :value="roleLabel(profile?.role)" readonly class="readonly"></label>
            <label>상태<input :value="statusLabel(profile?.status)" readonly class="readonly"></label>
          </div>
          <p v-if="profileMessage" class="settings-success">{{ profileMessage }}</p>
          <div v-if="profileError" class="error-box" style="margin-top: 12px;">{{ profileError }}</div>
        </article>

        <article class="card settings-card">
          <div class="settings-card-head">
            <div class="settings-card-title">
              <span class="settings-card-icon"><BellRing :size="18" /></span>
              <div>
                <h2>개인 설정</h2>
              </div>
            </div>
            <ActionButton
              variant="secondary"
              :disabled="settingsSaving"
              @click="saveSettings"
            >
              <Save :size="15" />
              {{ settingsSaving ? '저장 중...' : '저장' }}
            </ActionButton>
          </div>
          <div class="settings-notification-row">
            <div class="settings-notification-copy">
              <strong>회의 시작 전 알림</strong>
              <small>회의 시작 전에 알림을 받을 시간을 설정합니다.</small>
            </div>
            <AppSelect v-model.number="settingsForm.meetingStartReminderMinutes">
              <option
                v-for="option in reminderOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </AppSelect>
          </div>
          <div class="settings-notification-row">
            <div class="settings-notification-copy">
              <strong>회의록 미검토 알림</strong>
              <small>읽지 않은 회의록에 대한 알림 주기를 설정합니다.</small>
            </div>
            <AppSelect v-model.number="settingsForm.minutesReviewReminderMinutes">
              <option
                v-for="option in minutesReviewReminderOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </AppSelect>
          </div>
          <p v-if="settingsMessage" class="settings-success">{{ settingsMessage }}</p>
          <div v-if="settingsError" class="error-box" style="margin-top: 12px;">{{ settingsError }}</div>
        </article>
      </template>
    </template>
  </section>
</template>

<style scoped>
.settings-page {
  max-width: 1120px;
}

.settings-hero {
  display: flex;
  align-items: center;
  gap: 18px;
}

.settings-hero-icon,
.settings-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: #fff4ec;
  color: var(--primary);
}

.settings-hero-icon {
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
}

.settings-hero h1 {
  margin-bottom: 4px;
}

.settings-card {
  border-radius: 24px;
  padding: 20px 22px;
}

.settings-card-title {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.settings-card-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border-radius: 16px;
}

.settings-card-head {
  margin-bottom: 20px;
}

.settings-card-head h2 {
  margin: 0 0 4px;
  font-size: 16px;
}

.settings-card-head p {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.5;
}

.password-form-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.settings-password-field {
  position: relative;
  display: block;
}

.settings-password-field input {
  padding-right: 44px;
}

.settings-visibility-button {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--muted-foreground);
  padding: 0;
}

.settings-notification-row {
  min-height: 72px;
  padding: 14px 0;
  border-top: 1px solid #eef2f7;
}

.settings-notification-row:first-of-type {
  border-top: 0;
  padding-top: 4px;
}

.settings-notification-copy {
  display: grid;
  gap: 4px;
}

.settings-notification-copy strong {
  font-size: 15px;
}

.settings-notification-copy small {
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.5;
}

.settings-form-grid label,
.password-form-grid label {
  display: grid;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
}

.settings-form-grid input.readonly {
  background: #f8fafc;
  color: #64748b;
}

.settings-success {
  margin-top: 14px !important;
}

@media (max-width: 900px) {
  .password-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
