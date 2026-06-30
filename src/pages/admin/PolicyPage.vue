<script setup>
import { computed, onMounted, ref } from 'vue'
import { CalendarDays, Clock3, FileText, Mail, Save } from '@lucide/vue'
import AppSelect from '../../components/common/AppSelect.vue'
import {
  getAdminMailRetentionPolicy,
  updateAdminMailRetentionPolicy,
} from '../../lib/admin-mail-retention-policy.js'
import {
  formatRetentionPeriod,
  fromRetentionDays,
  MAX_DAYS,
  MAX_MONTHS,
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
const dayOptions = Array.from({ length: MAX_DAYS + 1 }, (_, value) => value)
const mailRetentionDaysTotal = computed(() => (
  toRetentionDays(
    mailForm.value.retentionYears,
    mailForm.value.retentionMonths,
    mailForm.value.retentionDays,
  )
))

const retentionPeriodText = computed(() => (
  formatRetentionPeriod(
    mailForm.value.retentionYears,
    mailForm.value.retentionMonths,
    mailForm.value.retentionDays,
  )
))
const overviewItems = computed(() => [
  {
    label: '회의록 보관',
    value: `${retentionPolicy.value.minutesRetentionDays}일`,
    description: '회의록 데이터 기준',
    icon: CalendarDays,
    tone: 'orange',
  },
  {
    label: '백업 문서 보관',
    value: `${retentionPolicy.value.backupRetentionDays}일`,
    description: '문서 백업 기준',
    icon: FileText,
    tone: 'blue',
  },
  {
    label: '메일 보관',
    value: `${mailRetentionDaysTotal.value}일`,
    description: mailForm.value.autoDeleteEnabled ? '자동 삭제 사용' : '자동 삭제 미사용',
    icon: Mail,
    tone: 'green',
  },
])

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
    mailForm.value.retentionDays,
  )
  if (validationMessage) {
    retentionDaysError.value = validationMessage
    return
  }

  const retentionDays = toRetentionDays(
    mailForm.value.retentionYears,
    mailForm.value.retentionMonths,
    mailForm.value.retentionDays,
  )

  pageSaving.value = true

  try {
    const savedPolicy = await updateAdminMailRetentionPolicy({
      retentionDays,
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
    retentionDays: retentionPeriod.days,
    autoDeleteEnabled: Boolean(result?.autoDeleteEnabled),
  }
}

function createEmptyMailForm() {
  return {
    retentionYears: 0,
    retentionMonths: 2,
    retentionDays: 0,
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

function onRetentionDaysChange(event) {
  mailForm.value.retentionDays = Number.parseInt(event?.target?.value || '0', 10)
  retentionDaysError.value = ''
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
  <section class="page admin-page settings-page policy-page">
    <header class="page-header policy-page-header">
      <div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <div class="policy-page-actions">
        <span class="badge primary policy-updated-badge">
          <Clock3 :size="14" />
          <span>마지막 수정</span>
          <strong>{{ formatDateTime(pageUpdatedAt) }}</strong>
        </span>
        <button
          type="button"
          class="primary-button policy-summary-save"
          :disabled="pageSaving"
          @click="saveAllPolicies"
        >
          <Save :size="16" />
          <span>{{ pageSaving ? '저장 중...' : '전체 저장' }}</span>
        </button>
      </div>
    </header>

    <article class="card policy-summary-card">
      <div class="policy-overview-grid">
        <article v-for="item in overviewItems" :key="item.label" class="policy-overview-item">
          <div :class="['policy-overview-icon', `tone-${item.tone}`]">
            <component :is="item.icon" :size="22" />
          </div>
          <div class="policy-overview-copy">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.description }}</small>
          </div>
        </article>
      </div>
      <p class="policy-summary-note">회의록, 백업 문서, 메일 데이터의 보관 기준을 한 화면에서 관리합니다.</p>
    </article>

    <div class="policy-card-grid">
      <article class="card policy-card">
        <div class="policy-card-head">
          <div>
            <h2>보관 정책</h2>
            <p>회의록과 백업 문서의 보관 기간, 검토 알림 기준을 설정합니다.</p>
          </div>
        </div>

        <div class="policy-section-group">
          <section class="policy-form-section policy-panel">
            <div class="policy-panel-head">
              <h3 class="policy-group-title">보관 기간</h3>
              <p>문서 종류별 보관 일수를 동일한 입력 리듬으로 관리합니다.</p>
            </div>
            <div class="policy-field-grid">
              <label class="policy-input-field">
                <span>회의록 보관 기간</span>
                <input v-model.number="retentionPolicy.minutesRetentionDays" type="number">
                <small>일 단위로 입력</small>
              </label>
              <label class="policy-input-field">
                <span>백업 문서 보관 기간</span>
                <input v-model.number="retentionPolicy.backupRetentionDays" type="number">
                <small>일 단위로 입력</small>
              </label>
            </div>
          </section>

          <section class="policy-form-section policy-panel policy-panel--lowered policy-form-section--split">
            <div class="policy-field-grid">
              <label class="policy-input-field">
                <span>검토 지연 알림</span>
                <input v-model.number="retentionPolicy.reviewHours" type="number">
                <small>시간 단위로 입력</small>
              </label>
              <div class="policy-input-field policy-check-field">
                <span>검토 완료 시 자동 공유 메일 발송</span>
                <div class="policy-choice-group" role="radiogroup" aria-label="자동 공유 메일 발송">
                  <button
                    type="button"
                    class="policy-choice"
                    :class="{ active: retentionPolicy.autoShare }"
                    :aria-pressed="retentionPolicy.autoShare"
                    @click="retentionPolicy.autoShare = true"
                  >
                    사용
                  </button>
                  <button
                    type="button"
                    class="policy-choice"
                    :class="{ active: !retentionPolicy.autoShare }"
                    :aria-pressed="!retentionPolicy.autoShare"
                    @click="retentionPolicy.autoShare = false"
                  >
                    미사용
                  </button>
                </div>
                <small class="policy-field-help">발송 여부를 선택합니다.</small>
              </div>
            </div>
          </section>

          <p v-if="retentionPolicySaved" class="settings-success">정책을 저장했습니다.</p>
          <p v-if="notificationPolicySaved" class="settings-success">정책을 저장했습니다.</p>
        </div>
      </article>

      <article class="card policy-card">
        <div class="policy-card-head">
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
            <section class="mail-policy-field mail-policy-panel">
              <div class="policy-panel-head">
                <label class="mail-policy-label" for="mail-retention-years">보관 기간</label>
                <p>보관 기간을 년/월/일 조합으로 설정합니다.</p>
              </div>
              <div class="mail-policy-help-group">
                <small class="mail-policy-help mail-policy-current">현재 설정: {{ retentionPeriodText }}</small>
              </div>
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
                  <option v-for="month in monthOptions" :key="`month-${month}`" :value="month">
                    {{ month }}월
                  </option>
                </AppSelect>
                <AppSelect
                  class="mail-policy-select"
                  :value="mailForm.retentionDays"
                  @change="onRetentionDaysChange"
                >
                  <option v-for="day in dayOptions" :key="`day-${day}`" :value="day">
                    {{ day }}일
                  </option>
                </AppSelect>
              </div>
              <small class="mail-policy-help">최대 10년까지 설정할 수 있습니다.</small>
              <div v-if="retentionDaysError" class="error-box mail-policy-field-error">{{ retentionDaysError }}</div>
            </section>

            <section class="mail-policy-field mail-policy-panel mail-policy-field--surface">
              <div class="policy-panel-head">
                <span class="mail-policy-label">자동 삭제</span>
              </div>
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
              <p class="mail-policy-description">보관 기간이 지난 메일을 자동으로 정리할지 선택합니다.</p>
            </section>
          </div>

          <p v-if="mailSuccessMessage" class="settings-success">{{ mailSuccessMessage }}</p>
          <div v-if="mailSaveErrorMessage" class="error-box mail-policy-submit-error">{{ mailSaveErrorMessage }}</div>
        </template>
      </article>
    </div>
  </section>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 22px;
  background: #fff;
}

.settings-page > .page-header {
  margin-bottom: 0;
}

.policy-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.policy-page-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.policy-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: stretch;
}

.policy-card {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.policy-summary-card {
  display: grid;
  gap: 14px;
  margin-bottom: 0;
  padding: 20px;
}

.policy-card-head h2 {
  margin: 0;
  font-size: 17px;
  line-height: 1.35;
}

.policy-card-head p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
}

.policy-overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.policy-overview-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #fffdfa 100%);
  padding: 18px 20px;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.04);
}

.policy-overview-icon {
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
}

.policy-overview-icon.tone-orange {
  background: linear-gradient(180deg, #fff2e8, #ffe3d0);
  color: #f97316;
}

.policy-overview-icon.tone-blue {
  background: linear-gradient(180deg, #eef4ff, #dbeafe);
  color: #2563eb;
}

.policy-overview-icon.tone-green {
  background: linear-gradient(180deg, #ecfdf5, #d1fae5);
  color: #16a34a;
}

.policy-overview-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.policy-overview-item span {
  color: #475467;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.policy-overview-item strong {
  color: var(--foreground);
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.04em;
  white-space: nowrap;
}

.policy-overview-item small {
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
  white-space: nowrap;
}

.policy-updated-badge {
  min-height: 42px;
  padding-inline: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fff7ef;
  color: #c2410c;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.policy-updated-badge strong {
  font-weight: 800;
}

.policy-summary-save {
  min-height: 42px;
  padding-inline: 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  white-space: nowrap;
}

.policy-summary-note {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.policy-section-group {
  display: grid;
  gap: 18px;
  flex: 1;
  grid-auto-rows: min-content;
  padding: 18px;
}

.policy-card-head {
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--border);
}

.policy-form-section {
  display: grid;
  gap: 12px;
}

.policy-panel {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.02);
}

.policy-panel--lowered .policy-field-grid {
  margin-top: 18px;
}

.policy-panel-head {
  display: grid;
  gap: 4px;
}

.policy-panel-head p {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
}

.policy-form-section + .policy-form-section {
  padding-top: 0;
  border-top: 0;
}

.policy-group-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--foreground);
  line-height: 1.4;
}

.policy-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.policy-input-field {
  min-width: 0;
  display: grid;
  gap: 6px;
  align-content: start;
}

.policy-input-field > span {
  color: var(--foreground);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.policy-input-field > small {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.45;
}

.policy-input-field > input {
  width: 100%;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  padding: 0 10px;
  box-sizing: border-box;
  font: inherit;
  line-height: 36px;
  appearance: textfield;
  -moz-appearance: textfield;
}

.policy-input-field > input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(243, 115, 33, 0.15);
}

.policy-input-field > input::-webkit-outer-spin-button,
.policy-input-field > input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.policy-check-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 8px;
}

.policy-field-help {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.45;
}

.policy-choice-group {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.policy-choice {
  min-height: 38px;
  min-width: 96px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: white;
  padding: 0 14px;
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 700;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.policy-choice.active {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, white);
  color: var(--primary);
}

.mail-policy-grid {
  display: grid;
  gap: 18px;
  align-content: start;
  flex: 1;
  grid-auto-rows: min-content;
  padding: 18px;
}

.mail-policy-state {
  padding: 18px;
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

.mail-policy-panel {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.02);
}

.mail-policy-field--surface {
  padding-top: 14px;
}

.mail-policy-label {
  color: var(--foreground);
  font-size: 13px;
  font-weight: 700;
}

.mail-policy-input-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 2px;
  align-items: center;
}

.mail-policy-input-row :deep(.app-select),
.mail-policy-input-row .mail-policy-select {
  min-width: 0;
  width: 100%;
}

.mail-policy-input-row :deep(select) {
  height: 36px;
  padding: 0 10px;
}

.mail-policy-select {
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  padding: 0 30px 0 10px;
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
  margin-top: 2px;
}

.mail-policy-help {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.45;
}

.mail-policy-current {
  font-weight: 600;
}

.mail-policy-description {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.45;
}

.mail-policy-choice-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  margin-top: 2px;
}

.mail-policy-choice {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  min-height: 38px;
  padding: 0 14px;
  background: white;
  color: var(--muted-foreground);
  font-size: 13px;
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

@media (max-width: 960px) {
  .policy-card-grid {
    grid-template-columns: 1fr;
  }

  .policy-overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .policy-page-header {
    flex-direction: column;
  }

  .policy-page-actions {
    justify-content: flex-start;
  }

  .policy-field-grid,
  .mail-policy-input-row {
    grid-template-columns: 1fr;
  }

  .mail-policy-choice-group {
    grid-template-columns: 1fr;
  }

  .mail-policy-choice {
    width: 100%;
  }
}
</style>
