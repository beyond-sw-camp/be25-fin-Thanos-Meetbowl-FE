<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  getAdminMailRetentionPolicy,
  updateAdminMailRetentionPolicy,
} from '../../lib/admin-mail-retention-policy.js'
import {
  formatRetentionPeriod,
  fromRetentionDays,
  MAX_MONTHS,
  MAX_WEEKS,
  MAX_YEARS,
  toRetentionDays,
  validateRetentionPeriod,
} from '../../lib/admin-mail-retention-policy-format.js'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  kind: { type: String, default: 'mail' },
})

const auth = useAuthStore()

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const isMailPolicy = computed(() => props.kind === 'mail')
const isAdmin = computed(() => auth.user?.role === 'ADMIN')

const loading = ref(true)
const saving = ref(false)
const forbidden = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const saveErrorMessage = ref('')
const retentionDaysError = ref('')

const policy = ref(null)
const form = ref(createEmptyForm())
const legacyPolicy = ref(
  props.kind === 'mail'
    ? createLegacyPolicy('mail')
    : createLegacyPolicy('minute'),
)
const legacySaved = ref(false)

const yearOptions = Array.from({ length: MAX_YEARS + 1 }, (_, value) => value)
const monthOptions = Array.from({ length: MAX_MONTHS + 1 }, (_, value) => value)
const weekOptions = Array.from({ length: MAX_WEEKS + 1 }, (_, value) => value)

const retentionPeriodText = computed(() => (
  formatRetentionPeriod(
    form.value.retentionYears,
    form.value.retentionMonths,
    form.value.retentionWeeks,
  )
))

onMounted(() => {
  loadPage()
})

async function loadPage() {
  successMessage.value = ''
  saveErrorMessage.value = ''
  retentionDaysError.value = ''
  errorMessage.value = ''
  forbidden.value = false
  loading.value = true

  if (!isMailPolicy.value) {
    loading.value = false
    return
  }

  if (!isAdmin.value) {
    forbidden.value = true
    errorMessage.value = '이 화면은 관리자 계정만 사용할 수 있습니다.'
    loading.value = false
    return
  }

  try {
    const result = await getAdminMailRetentionPolicy()
    applyPolicy(result)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      errorMessage.value = error?.message || '접근 권한이 없습니다.'
      return
    }

    errorMessage.value = error?.message || '메일 보관 정책을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function saveMailPolicy() {
  if (!isMailPolicy.value || saving.value) return

  successMessage.value = ''
  saveErrorMessage.value = ''
  retentionDaysError.value = ''

  // 화면에서는 년/개월/주를 선택하지만, 저장 직전에는 BE 계약에 맞춰 retentionDays로 검증한다.
  const validationMessage = validateRetentionPeriod(
    form.value.retentionYears,
    form.value.retentionMonths,
    form.value.retentionWeeks,
  )
  if (validationMessage) {
    retentionDaysError.value = validationMessage
    return
  }

  saving.value = true

  try {
    // API 스펙은 유지하고 FE에서만 년/개월/주 -> 일수 변환을 수행한다.
    const savedPolicy = await updateAdminMailRetentionPolicy({
      retentionDays: toRetentionDays(
        form.value.retentionYears,
        form.value.retentionMonths,
        form.value.retentionWeeks,
      ),
      autoDeleteEnabled: form.value.autoDeleteEnabled,
    })

    applyPolicy(savedPolicy)
    successMessage.value = '메일 보관 정책을 저장했습니다.'
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      errorMessage.value = error?.message || '접근 권한이 없습니다.'
      return
    }

    const nextErrorMessage = buildSaveErrorMessage(error)
    if (hasRetentionDaysValidationError(error)) {
      retentionDaysError.value = nextErrorMessage
    } else {
      saveErrorMessage.value = nextErrorMessage
    }
  } finally {
    saving.value = false
  }
}

function applyPolicy(result) {
  // GET 응답의 retentionDays를 가장 가까운 년/개월/주 드롭다운 값으로 환산해 초기값으로 사용한다.
  const retentionPeriod = fromRetentionDays(result?.retentionDays)
  policy.value = result || null
  form.value = {
    retentionYears: retentionPeriod.years,
    retentionMonths: retentionPeriod.months,
    retentionWeeks: retentionPeriod.weeks,
    autoDeleteEnabled: Boolean(result?.autoDeleteEnabled),
  }
}

function createEmptyForm() {
  return {
    retentionYears: 0,
    retentionMonths: 0,
    retentionWeeks: 0,
    autoDeleteEnabled: false,
  }
}

function createLegacyPolicy(kind) {
  return kind === 'mail'
    ? {
        retainDays: 90,
        trashDays: 14,
        backupDays: 180,
        reviewHours: 24,
        autoShare: true,
        guestAccess: false,
      }
    : {
        retainDays: 60,
        trashDays: 14,
        backupDays: 90,
        reviewHours: 24,
        autoShare: false,
        guestAccess: false,
      }
}

function buildSaveErrorMessage(error) {
  const details = Array.isArray(error?.details) ? error.details : []
  const retentionDetail = details.find((detail) => detail?.field === 'retentionDays')
  if (retentionDetail?.reason) return retentionDetail.reason
  return error?.message || '메일 보관 정책 저장에 실패했습니다.'
}

function hasRetentionDaysValidationError(error) {
  const details = Array.isArray(error?.details) ? error.details : []
  return details.some((detail) => detail?.field === 'retentionDays')
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return dateTimeFormatter.format(date)
}

function onRetentionYearsChange(event) {
  form.value.retentionYears = Number.parseInt(event?.target?.value || '0', 10)
  retentionDaysError.value = ''
}

function onRetentionMonthsChange(event) {
  form.value.retentionMonths = Number.parseInt(event?.target?.value || '0', 10)
  retentionDaysError.value = ''
}

function onRetentionWeeksChange(event) {
  form.value.retentionWeeks = Number.parseInt(event?.target?.value || '0', 10)
  retentionDaysError.value = ''
}

function isMonthOptionDisabled(month) {
  // 10년 초과 조합은 FE에서 미리 막아 3650일 상한을 넘지 않도록 한다.
  return toRetentionDays(form.value.retentionYears, month, form.value.retentionWeeks) > 3650
}

function isWeekOptionDisabled(week) {
  // 주 단위까지 합산했을 때도 최종 저장 상한 3650일을 넘지 않도록 한다.
  return toRetentionDays(form.value.retentionYears, form.value.retentionMonths, week) > 3650
}

function selectAutoDeleteOption(value) {
  form.value.autoDeleteEnabled = value
}

function saveLegacyPolicy() {
  legacySaved.value = true
  window.setTimeout(() => {
    legacySaved.value = false
  }, 1800)
}
</script>

<template>
  <section class="page admin-page settings-page">
    <header class="page-header">
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </header>

    <article v-if="loading" class="card empty-state">
      메일 보관 정책을 불러오는 중입니다.
    </article>

    <article v-else-if="isMailPolicy && forbidden" class="card empty-state">
      <h2>접근 권한 없음</h2>
      <p>{{ errorMessage || '이 화면에 접근할 권한이 없습니다.' }}</p>
    </article>

    <article v-else-if="isMailPolicy && errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions" style="margin-top: 12px;">
        <button class="secondary-button" type="button" @click="loadPage">다시 시도</button>
      </div>
    </article>

    <template v-else-if="isMailPolicy">
      <article class="card settings-card">
        <div class="settings-card-head">
          <div>
            <h2>메일 보관 정책</h2>
            <p>메일 데이터의 보관 기간과 자동 삭제 여부를 설정합니다.</p>
          </div>
        </div>

        <div class="mail-policy-grid">
          <div class="mail-policy-field">
            <label class="mail-policy-label" for="mail-retention-years">보관 기간</label>
            <div class="mail-policy-input-row">
              <select
                id="mail-retention-years"
                class="mail-policy-select"
                :value="form.retentionYears"
                @change="onRetentionYearsChange"
              >
                <option v-for="year in yearOptions" :key="`year-${year}`" :value="year">
                  {{ year }}년
                </option>
              </select>

              <select
                class="mail-policy-select"
                :value="form.retentionMonths"
                @change="onRetentionMonthsChange"
              >
                <option
                  v-for="month in monthOptions"
                  :key="`month-${month}`"
                  :value="month"
                  :disabled="isMonthOptionDisabled(month)"
                >
                  {{ month }}개월
                </option>
              </select>

              <select
                class="mail-policy-select"
                :value="form.retentionWeeks"
                @change="onRetentionWeeksChange"
              >
                <option
                  v-for="week in weekOptions"
                  :key="`week-${week}`"
                  :value="week"
                  :disabled="isWeekOptionDisabled(week)"
                >
                  {{ week }}주
                </option>
              </select>
            </div>
            <small class="mail-policy-help">메일 보관 기간을 년/개월/주 단위로 선택합니다.</small>
            <small class="mail-policy-help">현재 보관 기간: {{ retentionPeriodText }}</small>
            <div v-if="retentionDaysError" class="error-box mail-policy-field-error">{{ retentionDaysError }}</div>
          </div>

          <div class="mail-policy-field">
            <span class="mail-policy-label">자동 삭제</span>
            <div class="mail-policy-choice-group" role="radiogroup" aria-label="자동 삭제">
              <button
                type="button"
                class="mail-policy-choice"
                :class="{ active: form.autoDeleteEnabled }"
                :aria-pressed="form.autoDeleteEnabled"
                @click="selectAutoDeleteOption(true)"
              >
                사용
              </button>
              <button
                type="button"
                class="mail-policy-choice"
                :class="{ active: !form.autoDeleteEnabled }"
                :aria-pressed="!form.autoDeleteEnabled"
                @click="selectAutoDeleteOption(false)"
              >
                사용 안 함
              </button>
            </div>
          </div>
        </div>

        <div class="mail-policy-meta">
          <div class="mail-policy-meta-item">
            <span class="mail-policy-meta-label">최종 수정일</span>
            <strong class="mail-policy-meta-value">{{ formatDateTime(policy?.updatedAt) }}</strong>
          </div>
        </div>

        <p v-if="successMessage" class="settings-success">{{ successMessage }}</p>
        <div v-if="saveErrorMessage" class="error-box mail-policy-submit-error">{{ saveErrorMessage }}</div>

        <div class="mail-policy-actions">
          <button
            type="button"
            class="primary-button"
            :disabled="saving"
            @click="saveMailPolicy"
          >
            {{ saving ? '저장 중...' : '저장' }}
          </button>
        </div>
      </article>
    </template>

    <template v-else>
      <article class="card settings-card">
        <div class="settings-card-head">
          <h2>보관 정책</h2>
          <button class="primary-button small" type="button" @click="saveLegacyPolicy">저장</button>
        </div>
        <div class="settings-form-grid">
          <label>기본 보관 기간<input v-model.number="legacyPolicy.retainDays" type="number"></label>
          <label>휴지통 보관 기간<input v-model.number="legacyPolicy.trashDays" type="number"></label>
          <label>백업 문서 보관 기간<input v-model.number="legacyPolicy.backupDays" type="number"></label>
          <label>검토 지연 알림<input v-model.number="legacyPolicy.reviewHours" type="number"></label>
        </div>
        <p v-if="legacySaved" class="settings-success">정책을 저장했습니다.</p>
      </article>
      <article class="card settings-card">
        <h2>알림 / 권한 기준</h2>
        <label class="settings-toggle-row">
          <span>검토 완료 시 자동 공유 메일 발송</span>
          <input v-model="legacyPolicy.autoShare" type="checkbox">
        </label>
        <label class="settings-toggle-row">
          <span>게스트 외부 접근 허용</span>
          <input v-model="legacyPolicy.guestAccess" type="checkbox">
        </label>
        <div class="settings-alert">
          Master 권한은 일반 Admin이 변경할 수 없으며, 정책 변경 이력은 관리자 작업 로그에 남깁니다.
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
.mail-policy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;
  align-items: start;
}

.mail-policy-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.mail-policy-label {
  color: var(--foreground);
  font-size: 14px;
  font-weight: 700;
}

.mail-policy-input-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.mail-policy-select {
  width: 132px;
  min-width: 120px;
  max-width: 140px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  padding: 0 34px 0 12px;
  color: var(--foreground);
  font: inherit;
  font-size: 14px;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--muted-foreground) 50%),
    linear-gradient(135deg, var(--muted-foreground) 50%, transparent 50%);
  background-position:
    calc(100% - 18px) calc(50% - 2px),
    calc(100% - 12px) calc(50% - 2px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  box-sizing: border-box;
}

.mail-policy-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(243, 115, 33, 0.15);
}

.mail-policy-select:disabled {
  background-color: var(--muted);
  color: var(--muted-foreground);
  cursor: not-allowed;
}

.mail-policy-help {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.45;
}

.mail-policy-choice-group {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
  align-self: flex-start;
}

.mail-policy-choice {
  min-width: 96px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  background: var(--card);
  color: var(--muted-foreground);
  font-size: 14px;
  font-weight: 700;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.mail-policy-choice.active {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, white);
  color: var(--primary);
}

.mail-policy-meta {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.mail-policy-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 240px;
}

.mail-policy-meta-label {
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 700;
}

.mail-policy-meta-value {
  color: var(--foreground);
  font-size: 15px;
  font-weight: 700;
  word-break: break-all;
}

.mail-policy-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.mail-policy-field-error,
.mail-policy-submit-error {
  margin-top: 0;
}

.settings-card {
  padding: 16px 18px;
}

.settings-card-head {
  margin-bottom: 12px;
}

.settings-card-head > div {
  max-width: 520px;
}

@media (max-width: 768px) {
  .mail-policy-grid,
  .mail-policy-meta {
    grid-template-columns: 1fr;
  }

  .mail-policy-input-row {
    gap: 8px;
  }

  .mail-policy-choice {
    width: auto;
  }

  .mail-policy-select {
    flex: 1 1 140px;
    max-width: none;
  }

  .mail-policy-meta-item {
    max-width: none;
  }
}
</style>
