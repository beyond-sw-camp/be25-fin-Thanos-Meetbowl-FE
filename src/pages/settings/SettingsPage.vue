<script setup>
import { computed, onMounted, ref } from 'vue'
import { getMyProfile, getMySettings, updateMyProfile, updateMySettings } from '../../lib/my-profile'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const loading = ref(true)
const profileSaving = ref(false)
const settingsSaving = ref(false)
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

const profileMessage = ref('')
const profileError = ref('')
const settingsMessage = ref('')
const settingsError = ref('')
const passwordMessage = ref('비밀번호 변경은 별도 인증 흐름에서 제공하고, 현재 화면에서는 연결하지 않습니다.')

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
    // 프로필과 개인 설정은 서로 독립적이므로 초기 진입 시 함께 조회한다.
    const [profileData, settingsData] = await Promise.all([getMyProfile(), getMySettings()])

    profile.value = profileData
    auth.updateProfile(profileData)
    profileForm.value = {
      name: profileData?.name || '',
      email: profileData?.email || '',
    }

    // 응답값을 셀렉트에 바로 바인딩할 수 있도록 숫자형으로 정규화한다.
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
    // BE에서 허용하는 수정 필드인 name, email만 전송한다.
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
    // BE 개인 설정 PATCH DTO와 동일한 필드명으로 저장 요청을 보낸다.
    const savedSettings = await updateMySettings({
      meetingStartReminderMinutes: Number(settingsForm.value.meetingStartReminderMinutes),
      minutesReviewReminderMinutes: Number(settingsForm.value.minutesReviewReminderMinutes),
    })

    // 저장 후에는 BE 응답값으로 다시 맞춰 화면 상태를 동기화한다.
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

function roleLabel(role) {
  const normalizedRole = `${role || ''}`.toUpperCase()
  return roleLabelMap[normalizedRole] || normalizedRole || '-'
}

function statusLabel(status) {
  const normalizedStatus = `${status || ''}`.toUpperCase()
  return statusLabelMap[normalizedStatus] || normalizedStatus || '-'
}
</script>

<template>
  <section class="page settings-page">
    <header class="page-header">
      <h1>설정</h1>
      <p>내 정보와 개인 설정을 관리합니다.</p>
    </header>

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
          <h2>내 정보</h2>
          <button
            type="button"
            class="primary-button small"
            :disabled="!canEditProfile || profileSaving"
            @click="saveProfile"
          >
            {{ profileSaving ? '저장 중...' : '저장' }}
          </button>
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
        <h2>비밀번호 변경</h2>
        <p>비밀번호 변경은 별도 인증 흐름에서 제공합니다.</p>
        <div class="settings-alert">{{ passwordMessage }}</div>
      </article>

      <article class="card settings-card">
        <div class="settings-card-head">
          <h2>개인 설정</h2>
          <button
            type="button"
            class="primary-button small"
            :disabled="settingsSaving"
            @click="saveSettings"
          >
            {{ settingsSaving ? '저장 중...' : '저장' }}
          </button>
        </div>
        <div class="settings-notification-row">
          <span>회의 시작 전 알림</span>
          <select v-model.number="settingsForm.meetingStartReminderMinutes">
            <option
              v-for="option in reminderOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="settings-notification-row">
          <span>회의록 미검토 알림</span>
          <select v-model.number="settingsForm.minutesReviewReminderMinutes">
            <option
              v-for="option in minutesReviewReminderOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
        <p v-if="settingsMessage" class="settings-success">{{ settingsMessage }}</p>
        <div v-if="settingsError" class="error-box" style="margin-top: 12px;">{{ settingsError }}</div>
      </article>
    </template>
  </section>
</template>
