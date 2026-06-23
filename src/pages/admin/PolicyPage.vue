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

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const mailLoading = ref(true)
const mailSaving = ref(false)
const mailForbidden = ref(false)
const mailErrorMessage = ref('')
const mailSuccessMessage = ref('')
const mailSaveErrorMessage = ref('')
const retentionDaysError = ref('')

const mailPolicy = ref(null)
const mailForm = ref(createEmptyMailForm())
const retentionPolicy = ref(createRetentionPolicy())
const retentionPolicySaved = ref(false)
const notificationPolicySaved = ref(false)

const yearOptions = Array.from({ length: MAX_YEARS + 1 }, (_, value) => value)
const monthOptions = Array.from({ length: MAX_MONTHS + 1 }, (_, value) => value)
const weekOptions = Array.from({ length: MAX_WEEKS + 1 }, (_, value) => value)

const retentionPeriodText = computed(() => (
  formatRetentionPeriod(
    mailForm.value.retentionYears,
    mailForm.value.retentionMonths,
    mailForm.value.retentionWeeks,
  )
))

onMounted(() => {
  loadMailPolicy()
})

async function loadMailPolicy() {
  mailSuccessMessage.value = ''
  mailSaveErrorMessage.value = ''
  retentionDaysError.value = ''
  mailErrorMessage.value = ''
  mailForbidden.value = false
  mailLoading.value = true

  try {
    const result = await getAdminMailRetentionPolicy()
    applyMailPolicy(result)
  } catch (error) {
    if (error?.status === 403) {
      mailForbidden.value = true
      mailErrorMessage.value = error?.message || '접근 권한이 없습니다.'
      return
    }

    mailErrorMessage.value = error?.message || '메일 보관 정책을 불러오지 못했습니다.'
  } finally {
    mailLoading.value = false
  }
}

async function saveMailPolicy() {
  if (mailSaving.value) return

  mailSuccessMessage.value = ''
  mailSaveErrorMessage.value = ''
  retentionDaysError.value = ''

  const validationMessage = validateRetentionPeriod(
    mailForm.value.retentionYears,
    mailForm.value.retentionMonths,
    mailForm.value.retentionWeeks,
  )
  if (validationMessage) {
    retentionDaysError.value = validationMessage
    return
  }

  mailSaving.value = true

  try {
    const savedPolicy = await updateAdminMailRetentionPolicy({
      retentionDays: toRetentionDays(
        mailForm.value.retentionYears,
        mailForm.value.retentionMonths,
        mailForm.value.retentionWeeks,
      ),
      autoDeleteEnabled: mailForm.value.autoDeleteEnabled,
    })

    applyMailPolicy(savedPolicy)
    mailSuccessMessage.value = '메일 보관 정책을 저장했습니다.'
  } catch (error) {
    if (error?.status === 403) {
      mailForbidden.value = true
      mailErrorMessage.value = error?.message || '접근 권한이 없습니다.'
      return
    }

    const nextErrorMessage = buildSaveErrorMessage(error)
    if (hasRetentionDaysValidationError(error)) {
      retentionDaysError.value = nextErrorMessage
    } else {
      mailSaveErrorMessage.value = nextErrorMessage
    }
  } finally {
    mailSaving.value = false
  }
}

function applyMailPolicy(result) {
  // 메일 정책은 기존 API를 그대로 재사용하고, 통합 화면에서도 카드별 저장 상태를 따로 유지한다.
  const retentionPeriod = fromRetentionDays(result?.retentionDays)
  mailPolicy.value = result || null
  mailForm.value = {
    retentionYears: retentionPeriod.years,
    retentionMonths: retentionPeriod.months,
    retentionWeeks: retentionPeriod.weeks,
    autoDeleteEnabled: Boolean(result?.autoDeleteEnabled),
  }
}

function createEmptyMailForm() {
  return {
    retentionYears: 0,
    retentionMonths: 0,
    retentionWeeks: 0,
    autoDeleteEnabled: false,
  }
}

function createRetentionPolicy() {
  return {
    minutesRetentionDays: 60,
    backupRetentionDays: 90,
    reviewHours: 24,
    autoShare: false,
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
  mailForm.value.retentionYears = Number.parseInt(event?.target?.value || '0', 10)
  retentionDaysError.value = ''
}

function onRetentionMonthsChange(event) {
  mailForm.value.retentionMonths = Number.parseInt(event?.target?.value || '0', 10)
  retentionDaysError.value = ''
}

function onRetentionWeeksChange(event) {
  mailForm.value.retentionWeeks = Number.parseInt(event?.target?.value || '0', 10)
  retentionDaysError.value = ''
}

function isMonthOptionDisabled(month) {
  return toRetentionDays(mailForm.value.retentionYears, month, mailForm.value.retentionWeeks) > 3650
}

function isWeekOptionDisabled(week) {
  return toRetentionDays(mailForm.value.retentionYears, mailForm.value.retentionMonths, week) > 3650
}

function selectAutoDeleteOption(value) {
  mailForm.value.autoDeleteEnabled = value
}

function flashSavedState(target) {
  target.value = true
  window.setTimeout(() => {
    target.value = false
  }, 1800)
}

function saveRetentionPolicy() {
  flashSavedState(retentionPolicySaved)
}

function saveNotificationPolicy() {
  flashSavedState(notificationPolicySaved)
}
</script>

<template>
  <section class="page admin-page settings-page">
    <header class="page-header">
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </header>

    <article class="card settings-card">
      <div class="settings-card-head">
        <h2>보관 정책</h2>
        <button class="primary-button small" type="button" @click="saveRetentionPolicy">저장</button>
      </div>
      <div class="settings-form-grid">
        <label>회의록 보관 기간<input v-model.number="retentionPolicy.minutesRetentionDays" type="number"></label>
        <label>백업 문서 보관 기간<input v-model.number="retentionPolicy.backupRetentionDays" type="number"></label>
        <label>검토 지연 알림<input v-model.number="retentionPolicy.reviewHours" type="number"></label>
      </div>
      <p v-if="retentionPolicySaved" class="settings-success">정책을 저장했습니다.</p>
    </article>

    <article class="card settings-card">
      <div class="settings-card-head">
        <div>
          <h2>알림 기준</h2>
          <p>정책 변경 이력은 관리자 작업 로그에 남깁니다.</p>
        </div>
        <button class="primary-button small" type="button" @click="saveNotificationPolicy">저장</button>
      </div>
      <label class="settings-toggle-row">
        <span>검토 완료 시 자동 공유 메일 발송</span>
        <input v-model="retentionPolicy.autoShare" type="checkbox">
      </label>
      <p v-if="notificationPolicySaved" class="settings-success">정책을 저장했습니다.</p>
    </article>

    <article class="card settings-card">
      <div class="settings-card-head">
        <div>
          <h2>메일 보관 정책</h2>
          <p>메일 데이터의 보관 기간과 자동 삭제 여부를 설정합니다.</p>
        </div>
      </div>

      <div v-if="mailLoading" class="empty-state mail-policy-state">
        메일 보관 정책을 불러오는 중입니다.
      </div>

      <div v-else-if="mailForbidden" class="empty-state mail-policy-state">
        <h3>접근 권한 없음</h3>
        <p>{{ mailErrorMessage || '메일 보관 정책에 접근할 권한이 없습니다.' }}</p>
      </div>

      <div v-else-if="mailErrorMessage" class="mail-policy-state">
        <div class="error-box">{{ mailErrorMessage }}</div>
        <div class="admin-actions" style="margin-top: 12px;">
          <button class="secondary-button" type="button" @click="loadMailPolicy">다시 시도</button>
        </div>
      </div>

      <template v-else>
        <div class="mail-policy-grid">
          <div class="mail-policy-field">
            <label class="mail-policy-label" for="mail-retention-years">보관 기간</label>
            <div class="mail-policy-input-row">
              <select
                id="mail-retention-years"
                class="mail-policy-select"
                :value="mailForm.retentionYears"
                @change="onRetentionYearsChange"
              >
                <option v-for="year in yearOptions" :key="`year-${year}`" :value="year">
                  {{ year }}년
                </option>
              </select>

              <select
                class="mail-policy-select"
                :value="mailForm.retentionMonths"
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
                :value="mailForm.retentionWeeks"
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
                :class="{ active: mailForm.autoDeleteEnabled }"
                :aria-pressed="mailForm.autoDeleteEnabled"
                @click="selectAutoDeleteOption(true)"
              >
                사용
              </button>
              <button
                type="button"
                class="mail-policy-choice"
                :class="{ active: !mailForm.autoDeleteEnabled }"
                :aria-pressed="!mailForm.autoDeleteEnabled"
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
            <strong class="mail-policy-meta-value">{{ formatDateTime(mailPolicy?.updatedAt) }}</strong>
          </div>
        </div>

        <p v-if="mailSuccessMessage" class="settings-success">{{ mailSuccessMessage }}</p>
        <div v-if="mailSaveErrorMessage" class="error-box mail-policy-submit-error">{{ mailSaveErrorMessage }}</div>

        <div class="mail-policy-actions">
          <button
            type="button"
            class="primary-button"
            :disabled="mailSaving"
            @click="saveMailPolicy"
          >
            {{ mailSaving ? '저장 중...' : '저장' }}
          </button>
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.mail-policy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;
  align-items: start;
}

.mail-policy-state {
  margin-top: 8px;
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
