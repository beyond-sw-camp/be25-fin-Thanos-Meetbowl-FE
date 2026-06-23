<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Pagination from '../../components/common/Pagination.vue'
import { getAdminAuditLogDetail, getAdminAuditLogs } from '../../lib/admin-audit-logs'
import {
  AUDIT_ACTION_TYPE_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  extractAuditLogTargetDisplay,
  formatAuditResultLabel,
  getAuditActionDisplay,
  getAuditDisplayChangeItems,
  getAuditDisplayTitle,
  getAuditTargetTypeDisplay,
} from '../../lib/admin-audit-log-utils'
import {
  buildOrganizationNameMaps,
  getAdminAffiliates,
  getAdminDepartments,
  getAdminPositions,
  getAdminTeams,
} from '../../lib/admin-organizations'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const RESULT_OPTIONS = [
  { value: '', label: '전체 결과' },
  { value: 'SUCCESS', label: '성공' },
  { value: 'FAILED', label: '실패' },
]
const DATE_RANGE_OPTIONS = [
  { value: 'today', label: '오늘' },
  { value: 'last7Days', label: '최근 7일' },
  { value: 'last30Days', label: '최근 30일' },
  { value: 'custom', label: '직접 선택' },
]

const EMPTY_REFERENCE_MAPS = Object.freeze({
  affiliateId: new Map(),
  departmentId: new Map(),
  teamId: new Map(),
  positionId: new Map(),
})

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const loading = ref(true)
const forbidden = ref(false)
const errorMessage = ref('')

const logs = ref([])
const totalElements = ref(0)
const totalPages = ref(1)
const pageNo = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)

const filterForm = reactive({
  actionType: '',
  targetType: '',
  result: '',
  dateRange: 'last7Days',
  from: '',
  to: '',
})

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const selectedLog = ref(null)
const organizationReferenceMaps = ref(EMPTY_REFERENCE_MAPS)
const organizationLookupLoading = ref(false)

const isAdmin = computed(() => auth.user?.role === 'ADMIN')
const useCustomDateRange = computed(() => filterForm.dateRange === 'custom')
const hasFilters = computed(() =>
  Boolean(
    filterForm.actionType ||
      filterForm.targetType ||
      filterForm.result ||
      filterForm.from ||
      filterForm.to,
  ),
)
const emptyStateMessage = computed(() =>
  hasFilters.value
    ? '검색 조건에 맞는 관리자 작업 로그가 없습니다.'
    : '표시할 관리자 작업 로그가 없습니다.',
)
const changeSummary = computed(() =>
  selectedLog.value
    ? getAuditDisplayChangeItems(selectedLog.value, {
        referenceMaps: organizationReferenceMaps.value,
      })
    : [],
)
const detailSubtitle = computed(() => {
  if (detailLoading.value) return ''

  return [getAuditDisplayTitle(selectedLog.value), formatDateTime(selectedLog.value?.createdAt)]
    .filter((value) => value && value !== '-')
    .join(' · ')
})

onMounted(() => {
  applyDateRangePreset(filterForm.dateRange)
  loadLogs()
  loadOrganizationReferenceMaps()
})

watch(pageNo, () => {
  loadLogs()
})

watch(pageSize, (value, previousValue) => {
  if (value === previousValue) return
  if (pageNo.value !== 1) {
    pageNo.value = 1
    return
  }
  loadLogs()
})

watch(
  () => filterForm.dateRange,
  (value, previousValue) => {
    if (value === previousValue) return
    applyDateRangePreset(value)
  },
)

async function loadLogs() {
  if (!isAdmin.value) {
    forbidden.value = true
    loading.value = false
    return
  }

  loading.value = true
  forbidden.value = false
  errorMessage.value = ''

  try {
    const response = await getAdminAuditLogs({
      actionType: filterForm.actionType,
      targetType: filterForm.targetType,
      result: normalizeResultFilter(filterForm.result),
      from: toIsoUtc(filterForm.from),
      to: toIsoUtc(filterForm.to),
      page: pageNo.value,
      size: pageSize.value,
    })

    logs.value = (response?.items || []).map(normalizeAuditLog)
    totalElements.value = Number(response?.totalElements || 0)
    totalPages.value = Math.max(1, Number(response?.totalPages || 1))

    if (pageNo.value > totalPages.value) {
      pageNo.value = totalPages.value
    }
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    errorMessage.value =
      error?.message || '관리자 작업 로그를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    loading.value = false
  }
}

async function loadOrganizationReferenceMaps() {
  if (!isAdmin.value || organizationLookupLoading.value) return

  organizationLookupLoading.value = true

  try {
    const [affiliateData, departmentData, teamData, positionData] = await Promise.all([
      getAdminAffiliates(),
      getAdminDepartments(),
      getAdminTeams(),
      getAdminPositions(),
    ])

    organizationReferenceMaps.value = buildOrganizationNameMaps({
      affiliates: affiliateData?.items || [],
      departments: departmentData?.items || [],
      teams: teamData?.items || [],
      positions: positionData?.items || [],
    })
  } catch {
    organizationReferenceMaps.value = EMPTY_REFERENCE_MAPS
  } finally {
    organizationLookupLoading.value = false
  }
}

function submitFilters() {
  if (pageNo.value !== 1) {
    pageNo.value = 1
    return
  }
  loadLogs()
}

function resetFilters() {
  filterForm.actionType = ''
  filterForm.targetType = ''
  filterForm.result = ''
  filterForm.dateRange = 'last7Days'
  applyDateRangePreset(filterForm.dateRange)
  const shouldLoadImmediately = pageNo.value === 1 && pageSize.value === DEFAULT_PAGE_SIZE

  if (pageSize.value !== DEFAULT_PAGE_SIZE) {
    pageSize.value = DEFAULT_PAGE_SIZE
    return
  }

  if (pageNo.value !== 1) {
    pageNo.value = 1
    return
  }

  if (shouldLoadImmediately) {
    loadLogs()
  }
}

async function openDetail(log) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  selectedLog.value = null

  try {
    const [detailResponse] = await Promise.all([
      getAdminAuditLogDetail(log.auditLogId),
      loadOrganizationReferenceMaps(),
    ])

    selectedLog.value = normalizeAuditLog(detailResponse)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      detailOpen.value = false
      return
    }

    detailError.value = error?.message || '관리자 작업 로그 상세 정보를 불러오지 못했습니다.'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
  detailLoading.value = false
  detailError.value = ''
  selectedLog.value = null
}

function normalizeAuditLog(item) {
  const targetDisplay = extractAuditLogTargetDisplay(
    item || {},
    item?.beforeSnapshot ?? null,
    item?.afterSnapshot ?? null,
  )

  return {
    auditLogId: item?.auditLogId || '',
    actorName: item?.actorName || '-',
    ipAddress: item?.ipAddress || '',
    actionType: item?.actionType || '-',
    actionLabel: item?.actionLabel || '',
    targetType: item?.targetType || '-',
    targetTypeLabel: item?.targetTypeLabel || '',
    targetId: item?.targetId || '',
    targetLoginId: targetDisplay.loginId,
    targetName: targetDisplay.name,
    result: item?.result || '',
    reason: item?.reason || '',
    createdAt: item?.createdAt || '',
    displayTitle: item?.displayTitle || '',
    displayChangeItems: Array.isArray(item?.displayChangeItems) ? item.displayChangeItems : [],
    beforeSnapshot: item?.beforeSnapshot ?? null,
    afterSnapshot: item?.afterSnapshot ?? null,
  }
}

function normalizeResultFilter(result) {
  return result === 'FAILURE' ? 'FAILED' : result
}

function applyDateRangePreset(value) {
  if (value === 'custom') {
    if (!filterForm.from || !filterForm.to) {
      const range = createPresetDateRange('last7Days')
      filterForm.from = range.from
      filterForm.to = range.to
    }
    return
  }

  const range = createPresetDateRange(value)
  filterForm.from = range.from
  filterForm.to = range.to
}

function createPresetDateRange(preset) {
  const now = new Date()
  const end = now

  if (preset === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return {
      from: toDateTimeLocalValue(start),
      to: toDateTimeLocalValue(end),
    }
  }

  const days = preset === 'last30Days' ? 30 : 7
  const start = new Date(now)
  start.setDate(start.getDate() - days)

  return {
    from: toDateTimeLocalValue(start),
    to: toDateTimeLocalValue(end),
  }
}

function toDateTimeLocalValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return dateTimeFormatter.format(date)
}

function formatAuxiliaryId(value) {
  return value || '-'
}

function formatActorName(value) {
  return value || '-'
}

function formatIpAddress(value) {
  return value || '-'
}

function normalizeInlineValue(value) {
  if (value === null || value === undefined) return ''
  const normalized = String(value).trim()
  return normalized && normalized !== '-' ? normalized : ''
}

function buildAuditTargetSummary(log) {
  const loginId = normalizeInlineValue(log?.targetLoginId)
  const targetName = normalizeInlineValue(log?.targetName)

  if (!loginId && !targetName) return '-'
  if (loginId && targetName) return `${loginId} · ${targetName}`
  return loginId || targetName || '-'
}

function buildAuditTargetTooltip(log) {
  return [getAuditTargetTypeDisplay(log) || '-', buildAuditTargetSummary(log)].join('\n')
}

function resultBadgeClass(result) {
  const normalized = `${result || ''}`.toUpperCase()
  if (normalized === 'SUCCESS') return 'success'
  if (normalized === 'FAILED' || normalized === 'FAILURE') return 'warning'
  return 'navy'
}

function toIsoUtc(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString()
}
</script>

<template>
  <section class="page admin-page admin-logs-page">
    <header class="page-header">
      <div>
        <h1>관리자 작업 로그</h1>
        <p>관리자 권한 변경, 정책 변경, 운영 작업 이력을 실제 감사 로그 기준으로 조회합니다.</p>
      </div>
    </header>

    <article v-if="loading" class="card empty-state">관리자 작업 로그를 불러오는 중입니다.</article>

    <article v-else-if="forbidden" class="card empty-state">
      <h2>접근 권한 없음</h2>
      <p>이 화면은 관리자 계정만 확인할 수 있습니다.</p>
    </article>

    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions retry-actions">
        <button class="secondary-button" type="button" @click="loadLogs">다시 시도</button>
      </div>
    </article>

    <template v-else>
      <article class="card admin-toolbar admin-log-toolbar">
        <form class="admin-log-filter-form" @submit.prevent="submitFilters">
          <select v-model="filterForm.actionType" aria-label="작업 유형">
            <option
              v-for="option in AUDIT_ACTION_TYPE_OPTIONS"
              :key="option.value || 'all-action'"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <select v-model="filterForm.targetType" aria-label="대상 유형">
            <option
              v-for="option in AUDIT_TARGET_TYPE_OPTIONS"
              :key="option.value || 'all-target'"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <select v-model="filterForm.result" aria-label="결과">
            <option
              v-for="option in RESULT_OPTIONS"
              :key="option.value || 'all-result'"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <select v-model="filterForm.dateRange" aria-label="기간 빠른 선택">
            <option v-for="option in DATE_RANGE_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>

          <template v-if="useCustomDateRange">
            <input v-model="filterForm.from" type="datetime-local" aria-label="시작 기간" />
            <input v-model="filterForm.to" type="datetime-local" aria-label="종료 기간" />
          </template>

          <select v-model.number="pageSize" aria-label="페이지 크기">
            <option v-for="size in PAGE_SIZE_OPTIONS" :key="size" :value="size">
              {{ size }}개씩 보기
            </option>
          </select>

          <button class="secondary-button" type="button" @click="resetFilters">초기화</button>
          <button class="primary-button" type="submit">검색</button>
        </form>
      </article>

      <div class="table-card admin-data-table admin-log-table">
        <table>
          <thead>
            <tr>
              <th>작업 일시</th>
              <th>작업 내용</th>
              <th>대상</th>
              <th>작업자</th>
              <th>작업자 IP</th>
              <th>결과</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!logs.length">
              <td colspan="7">
                <div class="empty-state-inline">
                  {{ emptyStateMessage }}
                </div>
              </td>
            </tr>
            <tr v-for="log in logs" :key="log.auditLogId">
              <td class="date-cell" :title="formatDateTime(log.createdAt)">
                {{ formatDateTime(log.createdAt) }}
              </td>
              <td class="ellipsis-cell" :title="getAuditActionDisplay(log)">
                {{ getAuditActionDisplay(log) }}
              </td>
              <td class="target-cell" :title="buildAuditTargetTooltip(log)">
                <strong>{{ getAuditTargetTypeDisplay(log) }}</strong>
                <small>{{ buildAuditTargetSummary(log) }}</small>
              </td>
              <td class="actor-cell" :title="formatActorName(log.actorName)">
                {{ formatActorName(log.actorName) }}
              </td>
              <td class="ip-cell" :title="formatIpAddress(log.ipAddress)">
                {{ formatIpAddress(log.ipAddress) }}
              </td>
              <td>
                <span :class="['badge', resultBadgeClass(log.result)]">
                  {{ formatAuditResultLabel(log.result) }}
                </span>
              </td>
              <td class="detail-cell">
                <button class="detail-link-button" type="button" @click="openDetail(log)">상세 보기</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="admin-log-footer">
        <p class="admin-log-count">총 {{ totalElements }}건</p>
        <Pagination v-model="pageNo" :total-pages="totalPages" />
      </div>

      <div v-if="detailOpen" class="modal-backdrop" @click.self="closeDetail">
        <article class="card write-modal detail-modal audit-log-detail-modal">
          <header>
            <div>
              <h2>{{ detailLoading ? '작업 로그 상세 조회 중' : '작업 로그 상세' }}</h2>
              <p v-if="!detailLoading && detailSubtitle" class="detail-subtitle">
                {{ detailSubtitle }}
              </p>
            </div>
            <button type="button" @click="closeDetail">닫기</button>
          </header>

          <div v-if="detailLoading" class="empty-state">작업 로그 상세 정보를 불러오는 중입니다.</div>
          <div v-else-if="detailError" class="error-box">{{ detailError }}</div>
          <template v-else-if="selectedLog">
            <section class="detail-section">
              <h3>작업 내용</h3>
              <div class="detail-section-body">
                <ul v-if="changeSummary.length" class="change-summary-list prominent">
                  <li v-for="change in changeSummary" :key="change.key" :title="change.title || ''">
                    <strong>{{ change.label }}</strong>
                    <span>{{ change.text }}</span>
                  </li>
                </ul>
                <p v-else class="empty-change-text">표시할 작업 내용이 없습니다.</p>
              </div>
            </section>

            <div class="detail-grid">
              <section class="detail-section">
                <h3>작업 정보</h3>
                <dl class="detail-list">
                  <div><dt>작업 내용</dt><dd>{{ getAuditDisplayTitle(selectedLog) }}</dd></div>
                  <div><dt>결과</dt><dd>{{ formatAuditResultLabel(selectedLog.result) }}</dd></div>
                  <div><dt>작업 일시</dt><dd>{{ formatDateTime(selectedLog.createdAt) }}</dd></div>
                  <div><dt>작업자 IP</dt><dd>{{ selectedLog.ipAddress || '-' }}</dd></div>
                  <div><dt>작업자</dt><dd>{{ selectedLog.actorName || '-' }}</dd></div>
                </dl>
              </section>

              <section class="detail-section">
                <h3>대상 정보</h3>
                <dl class="detail-list">
                  <div><dt>대상 유형</dt><dd>{{ getAuditTargetTypeDisplay(selectedLog) }}</dd></div>
                  <div><dt>대상 ID</dt><dd>{{ formatAuxiliaryId(selectedLog.targetId) }}</dd></div>
                  <div><dt>대상 로그인 ID</dt><dd>{{ selectedLog.targetLoginId || '-' }}</dd></div>
                  <div><dt>변경 대상 이름</dt><dd>{{ selectedLog.targetName || '-' }}</dd></div>
                </dl>
              </section>
            </div>

            <section class="detail-section">
              <h3>추가 정보</h3>
              <dl class="detail-list">
                <div><dt>사유 또는 메시지</dt><dd>{{ selectedLog.reason || '-' }}</dd></div>
                <div><dt>감사 로그 ID</dt><dd>{{ formatAuxiliaryId(selectedLog.auditLogId) }}</dd></div>
              </dl>
            </section>
          </template>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
.admin-logs-page {
  display: grid;
  gap: 18px;
}

.retry-actions {
  margin-top: 12px;
}

.admin-log-toolbar {
  margin-bottom: 0;
}

.admin-log-filter-form {
  width: 100%;
  display: flex;
  gap: 10px;
}

.admin-log-filter-form input,
.admin-log-filter-form select {
  flex: 1;
  min-width: 0;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  padding: 0 12px;
  font: inherit;
}

.admin-log-filter-form button {
  flex: 0 0 80px;
  height: 38px;
  border-radius: 8px;
}

.admin-log-table table {
  table-layout: fixed;
}

.admin-log-table th:nth-child(1),
.admin-log-table td:nth-child(1) {
  width: 17%;
}

.admin-log-table th:nth-child(2),
.admin-log-table td:nth-child(2) {
  width: 19%;
}

.admin-log-table th:nth-child(3),
.admin-log-table td:nth-child(3) {
  width: 24%;
}

.admin-log-table th:nth-child(4),
.admin-log-table td:nth-child(4) {
  width: 10%;
}

.admin-log-table th:nth-child(5),
.admin-log-table td:nth-child(5) {
  width: 12%;
}

.admin-log-table th:nth-child(6),
.admin-log-table td:nth-child(6) {
  width: 8%;
}

.admin-log-table th:nth-child(7),
.admin-log-table td:nth-child(7) {
  width: 10%;
}

.admin-log-table th,
.admin-log-table td {
  padding-top: 16px;
  padding-bottom: 16px;
  vertical-align: middle;
}

.date-cell,
.actor-cell,
.ip-cell,
.detail-cell {
  white-space: nowrap;
}

.date-cell {
  color: var(--foreground);
  font-weight: 600;
}

.target-cell {
  min-width: 0;
}

.target-cell strong,
.target-cell small {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.target-cell strong {
  color: var(--foreground);
  font-size: 13px;
  font-weight: 700;
}

.target-cell small {
  margin-top: 4px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.actor-cell {
  color: var(--foreground);
  font-weight: 600;
}

.ip-cell {
  color: var(--muted-foreground);
  font-weight: 500;
}

.ellipsis-cell {
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-link-button {
  min-height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 0;
  color: var(--primary-dark);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.detail-link-button:hover {
  color: var(--primary);
  text-decoration: underline;
}

.detail-list dd,
.detail-section-body span {
  word-break: break-word;
  overflow-wrap: anywhere;
}

.admin-log-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 4px 2px;
  border-top: 1px solid var(--border);
  margin-bottom: 84px;
}

.admin-log-count {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 600;
}

.admin-log-footer :deep(.pagination) {
  margin-top: 0;
  justify-content: flex-end;
  gap: 8px;
}

.admin-log-footer :deep(.pagination button) {
  min-width: 42px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  background: white;
  color: var(--foreground);
  font-weight: 700;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.admin-log-footer :deep(.pagination button:hover:not(:disabled)) {
  background: var(--muted);
  transform: translateY(-1px);
}

.admin-log-footer :deep(.pagination span) {
  min-width: 54px;
  color: var(--foreground);
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.audit-log-detail-modal {
  width: min(980px, calc(100vw - 32px));
}

.detail-subtitle {
  margin: 6px 0 0;
  color: var(--muted-foreground);
  font-size: 13px;
}

.detail-grid {
  display: grid;
  gap: 16px;
}

.detail-section {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fcfcfd;
}

.detail-section:first-of-type {
  margin-top: 0;
}

.detail-section h3 {
  margin: 0 0 14px;
  font-size: 15px;
}

.detail-section-body {
  display: grid;
  gap: 12px;
}

.change-summary-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
}

.change-summary-list li {
  line-height: 1.6;
  word-break: break-word;
}

.change-summary-list.prominent li {
  display: grid;
  gap: 2px;
}

.change-summary-list.prominent span {
  color: var(--muted-foreground);
}

.empty-change-text {
  margin: 0;
  color: var(--muted-foreground);
}

@media (min-width: 960px) {
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 959px) {
  .admin-log-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin-bottom: 32px;
  }

  .admin-log-footer :deep(.pagination) {
    justify-content: flex-start;
  }
}
</style>
