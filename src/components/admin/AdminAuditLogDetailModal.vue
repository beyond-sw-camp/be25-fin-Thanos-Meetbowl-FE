<script setup>
import { computed, onUnmounted, watch } from 'vue'
import {
  formatActionTypeLabel,
  formatAuditResultLabel,
  formatTargetTypeLabel,
} from '../../lib/admin-audit-log-utils'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  log: { type: Object, default: null },
})

const emit = defineEmits(['close'])

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

const detailSubtitle = computed(() => {
  if (!props.log?.createdAt) return ''
  return [props.log.displayTitle || formatActionTypeLabel(props.log.actionType), formatDateTime(props.log.createdAt)]
    .filter(Boolean)
    .join(' · ')
})

const changeSummary = computed(() => Array.isArray(props.log?.displayChangeItems) ? props.log.displayChangeItems : [])

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return dateTimeFormatter.format(date)
}

function formatInline(value) {
  if (value === null || value === undefined) return '-'
  const normalized = String(value).trim()
  return normalized || '-'
}

function formatChangeTitle(change) {
  const before = formatInline(change?.before)
  const after = formatInline(change?.after)
  return `${change?.label || '변경 항목'}: ${before} → ${after}`
}

watch(() => props.open, (nextOpen) => {
  if (!nextOpen) return
  document.body.style.overflow = 'hidden'
})

watch(() => props.open, (nextOpen, previousOpen) => {
  if (previousOpen && !nextOpen) {
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <article class="card write-modal detail-modal audit-log-detail-modal">
      <header class="audit-log-detail-header admin-modal-header">
        <div class="admin-modal-title">
          <h2>{{ loading ? '작업 로그 상세 조회 중' : '작업 로그 상세' }}</h2>
          <p v-if="!loading && detailSubtitle" class="detail-subtitle admin-modal-subtitle">
            {{ detailSubtitle }}
          </p>
        </div>
        <button type="button" class="detail-close-button admin-modal-close" @click="emit('close')">닫기</button>
      </header>

      <div class="detail-modal-body">
        <div v-if="loading" class="detail-feedback empty-state">작업 로그 상세 정보를 불러오는 중입니다.</div>
        <div v-else-if="error" class="detail-feedback error-box">{{ error }}</div>
        <template v-else-if="log">
          <section class="detail-section detail-section-compact">
            <h3>작업 내용</h3>
            <div class="detail-section-body">
              <ul v-if="changeSummary.length" class="change-summary-list prominent">
                <li v-for="(change, index) in changeSummary" :key="`${change.label || 'change'}-${index}`" :title="formatChangeTitle(change)">
                  <strong>{{ change.label || '변경 항목' }}</strong>
                  <span>{{ formatInline(change.before) }} → {{ formatInline(change.after) }}</span>
                </li>
              </ul>
              <p v-else class="empty-change-text">표시할 작업 내용이 없습니다.</p>
            </div>
          </section>

          <div class="detail-grid">
            <section class="detail-section">
              <h3>기본 정보</h3>
              <dl class="detail-list detail-kv-list">
                <div><dt>작업 유형</dt><dd>{{ formatActionTypeLabel(log.actionType) }}</dd></div>
                <div><dt>결과</dt><dd>{{ formatAuditResultLabel(log.result) }}</dd></div>
                <div><dt>발생 일시</dt><dd>{{ formatDateTime(log.createdAt) }}</dd></div>
                <div><dt>작업자</dt><dd>{{ formatInline(log.actorName) }}</dd></div>
                <div><dt>작업자 IP</dt><dd>{{ formatInline(log.ipAddress) }}</dd></div>
              </dl>
            </section>

            <section class="detail-section">
              <h3>대상 정보</h3>
              <dl class="detail-list detail-kv-list">
                <div><dt>대상 유형</dt><dd>{{ formatTargetTypeLabel(log.targetType) }}</dd></div>
                <div><dt>대상 ID</dt><dd>{{ formatInline(log.targetId) }}</dd></div>
                <div><dt>대상 로그인 ID</dt><dd>{{ formatInline(log.targetLoginId) }}</dd></div>
                <div><dt>변경 대상 이름</dt><dd>{{ formatInline(log.targetName) }}</dd></div>
                <div v-if="log.reason"><dt>사유 또는 메시지</dt><dd>{{ log.reason }}</dd></div>
              </dl>
            </section>
          </div>
        </template>
      </div>
    </article>
  </div>
</template>

<style scoped>
.audit-log-detail-modal {
  width: min(900px, calc(100vw - 32px));
  max-height: min(82vh, 760px);
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.audit-log-detail-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
}

.audit-log-detail-header h2 {
  font-size: 18px;
}

.detail-subtitle {
  margin-top: 4px;
}

.detail-modal-body {
  display: grid;
  gap: 18px;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px 32px;
}

.detail-feedback {
  margin: 0;
}

.detail-grid {
  display: grid;
  gap: 18px;
}

.detail-section {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fcfcfd;
}

.detail-section-compact {
  padding-top: 12px;
  padding-bottom: 12px;
}

.detail-section h3 {
  margin: 0 0 10px;
  font-size: 14px;
}

.detail-section-body {
  display: grid;
  gap: 10px;
}

.change-summary-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
}

.change-summary-list li {
  line-height: 1.5;
  word-break: break-word;
}

.change-summary-list.prominent li {
  display: grid;
  gap: 2px;
}

.change-summary-list.prominent strong {
  font-size: 13px;
}

.change-summary-list.prominent span {
  color: var(--muted-foreground);
  font-size: 13px;
}

.empty-change-text {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
}

.detail-list dd,
.detail-section-body span {
  word-break: break-word;
  overflow-wrap: anywhere;
}
</style>
