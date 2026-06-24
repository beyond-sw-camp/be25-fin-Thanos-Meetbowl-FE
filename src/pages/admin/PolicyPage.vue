<script setup>
import { computed, onMounted, ref } from 'vue'
import AppSelect from '../../components/common/AppSelect.vue'
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

defineProps({
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
const pageSaving = ref(false)
const mailForbidden = ref(false)
const mailErrorMessage = ref('')
const mailSuccessMessage = ref('')
const mailSaveErrorMessage = ref('')
const retentionDaysError = ref('')
const pageUpdatedAt = ref(null)

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
    pageUpdatedAt.value = result?.updatedAt || pageUpdatedAt.value
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

async function saveAllPolicies() {
  if (pageSaving.value) return

  mailSuccessMessage.value = ''
  mailSaveErrorMessage.value = ''
  retentionDaysError.value = ''
  mailErrorMessage.value = ''

  const validationMessage = validateRetentionPeriod(
    mailForm.value.retentionYears,
    mailForm.value.retentionMonths,
    mailForm.value.retentionWeeks,
  )
  if (validationMessage) {
    retentionDaysError.value = validationMessage
    return
  }

  pageSaving.value = true

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
    pageUpdatedAt.value = new Date().toISOString()
    mailSuccessMessage.value = '메일 보관 정책을 저장했습니다.'
    flashSavedState(retentionPolicySaved)
    flashSavedState(notificationPolicySaved)
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
    pageSaving.value = false
  }
}

function applyMailPolicy(result) {
  const retentionPeriod = fromRetentionDays(result?.retentionDays)
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
</script>

<template>
  <section class="page admin-page settings-page">
    <header class="page-header">
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </header>

    <article class="card settings-card policy-summary-card">
      <div class="settings-card-head">
        <div>
          <h2>페이지 최종 수정</h2>
          <p>보관 정책 페이지 전체의 마지막 변경 시각입니다.</p>
        </div>
        <div class="policy-summary-meta">
          <strong class="policy-updated-at">{{ formatDateTime(pageUpdatedAt) }}</strong>
          <button
            type="button"
            class="primary-button"
            :disabled="pageSaving"
            @click="saveAllPolicies"
          >
            {{ pageSaving ? '저장 중...' : '전체 저장' }}
          </button>
        </div>
      </div>
      <p class="policy-summary-note">회의록과 백업 문서, 메일 데이터의 보관 기준을 한 화면에서 관리합니다.</p>
    </article>

    <div class="policy-card-grid">
      <article class="card settings-card policy-card">
        <div class="settings-card-head">
          <div>
            <h2>보관 정책</h2>
            <p>회의록과 백업 문서의 보관 기간, 검토 알림 기준을 설정합니다.</p>
          </div>
        </div>

        <div class="policy-section-group">
          <div class="policy-form-section">
            <h3 class="policy-group-title">보관 기간</h3>
            <div class="policy-field-grid">
              <label class="policy-input-field">
                <span>회의록 보관 기간</span>
                <input v-model.number="retentionPolicy.minutesRetentionDays" type="number">
              </label>
              <label class="policy-input-field">
                <span>백업 문서 보관 기간</span>
                <input v-model.number="retentionPolicy.backupRetentionDays" type="number">
              </label>
            </div>
          </div>

          <div class="policy-form-section policy-form-section--split">
            <h3 class="policy-group-title">검토/공유 설정</h3>
            <div class="policy-field-grid">
              <label class="policy-input-field">
                <span>검토 지연 알림</span>
                <input v-model.number="retentionPolicy.reviewHours" type="number">
              </label>
              <label class="policy-input-field policy-check-field">
                <span>검토 완료 시 자동 공유 메일 발송</span>
                <input v-model="retentionPolicy.autoShare" type="checkbox">
              </label>
            </div>
          </div>

          <p v-if="retentionPolicySaved" class="settings-success">정책을 저장했습니다.</p>
          <p v-if="notificationPolicySaved" class="settings-success">정책을 저장했습니다.</p>
        </div>
      </article>

      <article class="card settings-card policy-card">
        <div class="settings-card-head">
          <div>
            <h2>메일 보관 설정</h2>
            <p>메일 데이터 보관 기간과 자동 삭제 여부를 설정합니다.</p>
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
          <div class="admin-actions mail-policy-retry">
            <button class="secondary-button" type="button" @click="loadMailPolicy">다시 시도</button>
          </div>
        </div>

        <template v-else>
          <div class="mail-policy-grid">
            <div class="mail-policy-field">
              <label class="mail-policy-label" for="mail-retention-years">보관 기간</label>
              <div class="mail-policy-input-row">
                <AppSelect
                  id="mail-retention-years"
                  class="mail-policy-select"
                  :value="mailForm.retentionYears"
                  @change="onRetentionYearsChange"
                >
                  <option v-for="year in yearOptions" :key="`year-${year}`" :value="year">
                    {{ year }}년
                  </option>
                </AppSelect>

                <AppSelect
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
                </AppSelect>

                <AppSelect
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
                </AppSelect>
              </div>
              <div class="mail-policy-help-group">
                <small class="mail-policy-help">메일 보관 기간을 년/개월/주 단위로 선택합니다.</small>
                <small class="mail-policy-help mail-policy-current">현재 설정: {{ retentionPeriodText }}</small>
              </div>
              <div v-if="retentionDaysError" class="error-box mail-policy-field-error">{{ retentionDaysError }}</div>
            </div>

            <div class="mail-policy-field mail-policy-field--surface">
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

          <p v-if="mailSuccessMessage" class="settings-success">{{ mailSuccessMessage }}</p>
          <div v-if="mailSaveErrorMessage" class="error-box mail-policy-submit-error">{{ mailSaveErrorMessage }}</div>
        </template>
      </article>
    </div>
  </section>
</template>

<style scoped>
.policy-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: stretch;
}

.policy-card-grid > .settings-card + .settings-card {
  margin-top: 0;
}

.policy-card {
  align-self: stretch;
  display: flex;
  flex-direction: column;
}

.policy-summary-card {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}

.policy-summary-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.policy-updated-at {
  color: var(--primary-dark);
  font-size: 16px;
  font-weight: 800;
  white-space: nowrap;
}

.policy-summary-note {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 13px;
}

.policy-section-group {
  display: grid;
  gap: 18px;
  flex: 1;
  grid-auto-rows: min-content;
}

.policy-form-section {
  display: grid;
  gap: 10px;
}

.policy-form-section + .policy-form-section {
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.policy-group-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--foreground);
  line-height: 1.35;
}

/* 정책 카드의 입력 필드를 균형 있게 묶어 좌우 밀도를 맞춘다. */
.policy-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.policy-input-field {
  min-width: 0;
  align-content: start;
}

.policy-input-field > span {
  color: var(--foreground);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.policy-check-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding-top: 30px;
}

.policy-check-field input {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  accent-color: var(--primary);
}

.mail-policy-grid {
  display: grid;
  gap: 18px;
  align-content: start;
  flex: 1;
  grid-auto-rows: min-content;
}

.mail-policy-state {
  margin-top: 8px;
}

.mail-policy-retry {
  margin-top: 12px;
}

.mail-policy-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.mail-policy-field--surface {
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.mail-policy-label {
  color: var(--foreground);
  font-size: 14px;
  font-weight: 700;
}

.mail-policy-input-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 2px;
}

.mail-policy-select {
  width: 100%;
  min-width: 0;
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

.mail-policy-help-group {
  display: grid;
  gap: 3px;
  margin-top: -2px;
}

.mail-policy-help {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.45;
}

.mail-policy-current {
  font-weight: 600;
}

.mail-policy-choice-group {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
  align-self: flex-start;
  margin-top: 2px;
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

.mail-policy-field-error,
.mail-policy-submit-error {
  margin-top: 0;
}

.settings-card {
  padding: 16px 18px;
}

.settings-card-head {
  margin-bottom: 16px;
}

.settings-card-head > div {
  max-width: 520px;
}

.settings-card-head h2 {
  line-height: 1.35;
}

.settings-card-head p {
  line-height: 1.5;
}

@media (max-width: 960px) {
  .policy-card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .policy-field-grid,
  .mail-policy-input-row {
    grid-template-columns: 1fr;
  }

  .policy-summary-meta {
    justify-content: flex-start;
  }

  .mail-policy-choice {
    width: auto;
  }
}
</style>
