<script setup>
import { computed } from 'vue'
import {
  formatActionTypeLabel,
  formatAuditResultLabel,
  formatTargetTypeLabel,
} from '../../lib/admin-audit-log-utils'

const props = defineProps({
  log: { type: Object, required: true },
})

const actionLabel = computed(() => formatActionTypeLabel(props.log.actionType))
const targetLabel = computed(() => formatTargetTypeLabel(props.log.targetType))
const targetName = computed(() => props.log.targetName || '-')
const resultLabel = computed(() => formatAuditResultLabel(props.log.result))
const createdAt = computed(() => props.log.createdAtLabel || formatCompactDateTime(props.log.createdAt))
const resultTone = computed(() => `${String(props.log.result || '').toUpperCase() === 'SUCCESS' ? 'success' : 'warning'}`)

function formatCompactDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const month = parts.find((part) => part.type === 'month')?.value || '--'
  const day = parts.find((part) => part.type === 'day')?.value || '--'
  const hour = parts.find((part) => part.type === 'hour')?.value || '--'
  const minute = parts.find((part) => part.type === 'minute')?.value || '--'
  return `${month}.${day} ${hour}:${minute}`
}
</script>

<template>
  <li class="admin-audit-log-item">
    <!-- 대시보드 최근 작업 이력 카드에서는 관리자명 반복 노출을 숨긴다. -->
    <div class="admin-audit-log-summary">
      <span class="admin-audit-log-action">{{ actionLabel }}</span>
      <span class="admin-audit-log-target">{{ targetLabel }}</span>
      <span class="admin-audit-log-field">{{ targetName }}</span>
      <span :class="['badge', resultTone]">{{ resultLabel }}</span>
      <span class="admin-audit-log-time">{{ createdAt }}</span>
      <RouterLink to="/admin/logs" class="admin-audit-log-link">상세 보기</RouterLink>
    </div>
  </li>
</template>
