<script setup>
import { computed, onMounted, ref } from 'vue'
import AdminAuditLogItem from '../../components/admin/AdminAuditLogItem.vue'
import AdminChartShell from '../../components/admin/AdminChartShell.vue'
import AdminInsightCard from '../../components/admin/AdminInsightCard.vue'
import { getAdminDashboardSummary } from '../../lib/admin-dashboard'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const loading = ref(true)
const errorMessage = ref('')
const forbidden = ref(false)
const summary = ref(null)

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const hourPartsFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  hour12: false,
})

const isAdmin = computed(() => auth.user?.role === 'ADMIN')
const recentAuditLogs = computed(() => summary.value?.recentAuditLogs || [])
const recentAuditLogRows = computed(() =>
  recentAuditLogs.value.slice(0, 5).map((log) => ({
    auditLogId: log.auditLogId,
    actorName: log.actorName || '-',
    actionType: log.actionType,
    targetType: log.targetType,
    targetName: log.targetName || '-',
    result: log.result,
    createdAt: log.createdAt,
    createdAtLabel: formatCompactDateTime(log.createdAt),
  })),
)
const mailRetentionPolicy = computed(() => summary.value?.mailRetentionPolicy || null)
const meetingRoomSummary = computed(() => summary.value?.meetingRoomSummary || null)
const reservationStartUsage = computed(() => meetingRoomSummary.value?.timeSlotUsage || [])
const occupancyUsage = computed(() => meetingRoomSummary.value?.timeSlotOccupancyUsage || [])
const visibleReservationStartUsage = computed(() =>
  reservationStartUsage.value.filter((item) => {
    const hour = kstHour(item.slotStartAt)
    return hour >= 9 && hour < 24
  }),
)
const mergedTimeSlotUsage = computed(() => {
  const slotMap = new Map()

  for (const item of reservationStartUsage.value) {
    const key = item.slotStartAt
    const existing = slotMap.get(key) || { slotStartAt: key, reservationStartCount: 0, occupancyCount: 0 }
    existing.reservationStartCount = Number(item.reservationCount) || 0
    slotMap.set(key, existing)
  }

  for (const item of occupancyUsage.value) {
    const key = item.slotStartAt
    const existing = slotMap.get(key) || { slotStartAt: key, reservationStartCount: 0, occupancyCount: 0 }
    existing.occupancyCount = Number(item.reservationCount) || 0
    slotMap.set(key, existing)
  }

  return Array.from(slotMap.values())
    .filter((item) => {
      const hour = kstHour(item.slotStartAt)
      return hour >= 9 && hour < 24
    })
    .sort((left, right) => new Date(left.slotStartAt) - new Date(right.slotStartAt))
})
const visibleOccupancyUsage = computed(() =>
  occupancyUsage.value.filter((item) => {
    const hour = kstHour(item.slotStartAt)
    return hour >= 9 && hour < 24
  }),
)
const siteBuildingUsage = computed(() => meetingRoomSummary.value?.siteBuildingUsage || [])
const visibleSiteBuildingUsage = computed(() => siteBuildingUsage.value.slice())
const weekdayReservationUsage = computed(() => meetingRoomSummary.value?.weekdayReservationUsage || [])
const weekdayLabels = ['월', '화', '수', '목', '금', '토', '일']
const visibleWeekdayReservationUsage = computed(() => {
  const usageByDay = new Map(weekdayReservationUsage.value.map((item) => [Number(item.dayOfWeek), item]))
  return weekdayLabels.map((label, index) => {
    const dayOfWeek = index + 1
    const item = usageByDay.get(dayOfWeek) || { dayOfWeek, weekdayLabel: label, reservationCount: 0 }
    return {
      dayOfWeek,
      weekdayLabel: item.weekdayLabel || label,
      reservationCount: Number(item.reservationCount) || 0,
    }
  })
})
const chartViewBoxWidth = 960
const chartViewBoxHeight = 280
const chartPadding = {
  top: 24,
  right: 24,
  bottom: 48,
  left: 44,
}
const maxMergedTimeSlotCount = computed(() => {
  const counts = mergedTimeSlotUsage.value.flatMap((item) => [item.reservationStartCount, item.occupancyCount])
  return counts.length ? Math.max(...counts, 1) : 1
})
const maxOccupancyCount = computed(() => {
  const counts = visibleOccupancyUsage.value.map((item) => item.reservationCount)
  return counts.length ? Math.max(...counts, 1) : 1
})
const usageChartInnerWidth = computed(() =>
  chartViewBoxWidth - chartPadding.left - chartPadding.right,
)
const usageChartInnerHeight = computed(() =>
  chartViewBoxHeight - chartPadding.top - chartPadding.bottom,
)
function createChartYTicks(maxValue) {
  const tickCount = Math.min(Math.max(maxValue, 2), 5)
  const rawTicks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = Math.round((maxValue / tickCount) * (tickCount - index))
    const y = chartPadding.top + (usageChartInnerHeight.value * index) / tickCount
    return { value, y }
  })

  return rawTicks.filter((tick, index) => index === 0 || tick.value !== rawTicks[index - 1].value)
}
function createChartPoints(items, maxValue, valueKey = 'reservationCount') {
  if (!items.length) return []
  const denominator = Math.max(items.length - 1, 1)
  return items.map((item, index) => {
    const x = chartPadding.left + (usageChartInnerWidth.value * index) / denominator
    const y =
      chartPadding.top
      + usageChartInnerHeight.value
      - (usageChartInnerHeight.value * item[valueKey]) / maxValue
    return {
      ...item,
      x,
      y,
      label: formatHour(item.slotStartAt),
      emphasized: true,
      showValue: index === 0 || index === items.length - 1 || item[valueKey] === maxValue,
    }
  })
}
function createChartPolyline(points) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}
function createChartArea(points) {
  if (!points.length) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return [
    `${first.x},${chartPadding.top + usageChartInnerHeight.value}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${last.x},${chartPadding.top + usageChartInnerHeight.value}`,
  ].join(' ')
}
const mergedTimeSlotChartYTicks = computed(() => createChartYTicks(maxMergedTimeSlotCount.value))
const mergedReservationStartChartPoints = computed(() =>
  createChartPoints(mergedTimeSlotUsage.value, maxMergedTimeSlotCount.value, 'reservationStartCount'),
)
const mergedOccupancyChartPoints = computed(() =>
  createChartPoints(mergedTimeSlotUsage.value, maxMergedTimeSlotCount.value, 'occupancyCount'),
)
const mergedReservationStartChartPolyline = computed(() =>
  createChartPolyline(mergedReservationStartChartPoints.value),
)
const mergedOccupancyChartPolyline = computed(() =>
  createChartPolyline(mergedOccupancyChartPoints.value),
)
const mergedReservationStartChartArea = computed(() =>
  createChartArea(mergedReservationStartChartPoints.value),
)
const mergedOccupancyChartArea = computed(() =>
  createChartArea(mergedOccupancyChartPoints.value),
)
const occupancyChartYTicks = computed(() => createChartYTicks(maxOccupancyCount.value))
const occupancyChartPoints = computed(() =>
  createChartPoints(visibleOccupancyUsage.value, maxOccupancyCount.value),
)
const occupancyChartPolyline = computed(() => createChartPolyline(occupancyChartPoints.value))
const occupancyChartArea = computed(() => createChartArea(occupancyChartPoints.value))
const peakOccupancy = computed(() => {
  if (!visibleOccupancyUsage.value.length) return null

  return visibleOccupancyUsage.value.reduce((top, item) => {
    if (!top || item.reservationCount > top.reservationCount) return item
    return top
  }, null)
})
const activeOccupancySlots = computed(() =>
  visibleOccupancyUsage.value.filter((item) => item.reservationCount > 0),
)
const activeOccupancyWindow = computed(() => {
  if (!activeOccupancySlots.value.length) return '-'
  const first = activeOccupancySlots.value[0]
  const last = activeOccupancySlots.value[activeOccupancySlots.value.length - 1]
  return `${formatHour(first.slotStartAt)} - ${formatHour(last.slotStartAt)}`
})
const averageOccupancyCount = computed(() => {
  if (!visibleOccupancyUsage.value.length) return 0
  const total = visibleOccupancyUsage.value.reduce((sum, item) => sum + item.reservationCount, 0)
  return total / visibleOccupancyUsage.value.length
})
const peakReservationStart = computed(() => {
  if (!visibleReservationStartUsage.value.length) return null

  return visibleReservationStartUsage.value.reduce((top, item) => {
    if (!top || item.reservationCount > top.reservationCount) return item
    return top
  }, null)
})
const activeReservationStartSlots = computed(() =>
  visibleReservationStartUsage.value.filter((item) => item.reservationCount > 0),
)
const activeReservationStartWindow = computed(() => {
  if (!activeReservationStartSlots.value.length) return '-'
  const first = activeReservationStartSlots.value[0]
  const last = activeReservationStartSlots.value[activeReservationStartSlots.value.length - 1]
  return `${formatHour(first.slotStartAt)} - ${formatHour(last.slotStartAt)}`
})
const averageReservationStartCount = computed(() => {
  if (!visibleReservationStartUsage.value.length) return 0
  const total = visibleReservationStartUsage.value.reduce((sum, item) => sum + item.reservationCount, 0)
  return total / visibleReservationStartUsage.value.length
})
const timeSlotInsightItems = computed(() => [
  {
    label: '가장 많은 예약 시작',
    value: peakReservationStart.value
      ? `${formatHour(peakReservationStart.value.slotStartAt)} · ${peakReservationStart.value.reservationCount}건`
      : '-',
    secondaryLabel: '시간당 평균 시작 예약',
    secondaryValue: `${averageReservationStartCount.value.toFixed(1)}건`,
  },
  {
    label: '예약 시작 구간',
    value: activeReservationStartWindow.value,
    secondaryLabel: '예약 시작이 발생한 시간대',
    secondaryValue: `${activeReservationStartSlots.value.length}개`,
  },
  {
    label: '가장 많이 점유된 시간',
    value: peakOccupancy.value
      ? `${formatHour(peakOccupancy.value.slotStartAt)} · ${peakOccupancy.value.reservationCount}개`
      : '-',
    secondaryLabel: '시간당 평균 점유 회의실',
    secondaryValue: `${averageOccupancyCount.value.toFixed(1)}개`,
  },
  {
    label: '점유 발생 구간',
    value: activeOccupancyWindow.value,
    secondaryLabel: '점유가 발생한 시간대',
    secondaryValue: `${activeOccupancySlots.value.length}개`,
  },
])
const maxUsedRoomCount = computed(() => {
  const counts = visibleSiteBuildingUsage.value.map((item) => Number(item.usedRooms) || 0)
  return counts.length ? Math.max(...counts, 1) : 1
})
const maxWeekdayReservationCount = computed(() => {
  const counts = visibleWeekdayReservationUsage.value.map((item) => item.reservationCount)
  return counts.length ? Math.max(...counts, 1) : 1
})
const siteUsageChartRows = computed(() =>
  visibleSiteBuildingUsage.value.map((item) => {
    const usedRooms = Number(item.usedRooms) || 0
    const usageRate = toPercentNumber(item.usageRate)
    const width = Math.max((usedRooms / maxUsedRoomCount.value) * 100, usedRooms > 0 ? 5 : 0)
    return {
      ...item,
      usageRate,
      usedRooms,
      width,
    }
  }),
)
const peakSiteUsage = computed(() => {
  if (!visibleSiteBuildingUsage.value.length) return null

  return visibleSiteBuildingUsage.value.reduce((top, item) => {
    if (!top || toPercentNumber(item.usageRate) > toPercentNumber(top.usageRate)) return item
    return top
  }, null)
})
const averageSiteUsageRate = computed(() => {
  if (!visibleSiteBuildingUsage.value.length) return 0
  const total = visibleSiteBuildingUsage.value.reduce((sum, item) => sum + toPercentNumber(item.usageRate), 0)
  return total / visibleSiteBuildingUsage.value.length
})
const siteUsageInsightItems = computed(() => [
  {
    label: '가장 많은 사용 중 회의실',
    value: peakSiteUsage.value
      ? `${peakSiteUsage.value.siteName} · ${peakSiteUsage.value.buildingName} · ${peakSiteUsage.value.usedRooms}개`
      : '-',
    secondaryLabel: '평균 사용률',
    secondaryValue: `${averageSiteUsageRate.value.toFixed(1)}%`,
  },
  {
    label: '평균 사용률',
    value: `${averageSiteUsageRate.value.toFixed(1)}%`,
    secondaryLabel: '사용률이 집계된 건물',
    secondaryValue: `${visibleSiteBuildingUsage.value.length}개`,
  },
  {
    label: '사용률이 집계된 건물',
    value: `${visibleSiteBuildingUsage.value.length}개`,
    secondaryLabel: '현재 사용 중 회의실',
    secondaryValue: `${meetingRoomSummary.value?.inUseMeetingRoomCount ?? 0}개`,
  },
  {
    label: '현재 사용 중 회의실',
    value: `${meetingRoomSummary.value?.inUseMeetingRoomCount ?? 0}개`,
    secondaryLabel: '가장 많은 사용 중 회의실',
    secondaryValue: peakSiteUsage.value
      ? `${peakSiteUsage.value.siteName} · ${peakSiteUsage.value.buildingName} · ${peakSiteUsage.value.usedRooms}개`
      : '-',
  },
])
const weekdayChartRows = computed(() =>
  visibleWeekdayReservationUsage.value.map((item) => ({
    ...item,
    height: Math.max((item.reservationCount / maxWeekdayReservationCount.value) * 100, item.reservationCount > 0 ? 8 : 0),
  })),
)
const peakWeekdayReservation = computed(() => {
  if (!visibleWeekdayReservationUsage.value.length) return null

  return visibleWeekdayReservationUsage.value.reduce((top, item) => {
    if (!top || item.reservationCount > top.reservationCount) return item
    return top
  }, null)
})
const weekdayAverageReservationCount = computed(() => {
  if (!visibleWeekdayReservationUsage.value.length) return 0
  const total = visibleWeekdayReservationUsage.value.reduce((sum, item) => sum + item.reservationCount, 0)
  return total / visibleWeekdayReservationUsage.value.length
})
const totalWeekdayReservationCount = computed(() =>
  visibleWeekdayReservationUsage.value.reduce((sum, item) => sum + item.reservationCount, 0),
)
const activeWeekdayCount = computed(() =>
  visibleWeekdayReservationUsage.value.filter((item) => item.reservationCount > 0).length,
)
const inactiveWeekdayCount = computed(() =>
  Math.max(visibleWeekdayReservationUsage.value.length - activeWeekdayCount.value, 0),
)
const peakWeekdayShare = computed(() => {
  const total = totalWeekdayReservationCount.value
  if (!peakWeekdayReservation.value || !total) return 0
  return (peakWeekdayReservation.value.reservationCount / total) * 100
})
const weekdayReservationInsightItems = computed(() => [
  {
    label: '가장 많은 요일',
    value: peakWeekdayReservation.value
      ? `${peakWeekdayReservation.value.weekdayLabel} · ${peakWeekdayReservation.value.reservationCount}건`
      : '-',
    secondaryLabel: '요일당 평균 예약',
    secondaryValue: `${weekdayAverageReservationCount.value.toFixed(1)}건`,
  },
  {
    label: '이번 주 총 예약',
    value: `${totalWeekdayReservationCount.value}건`,
    secondaryLabel: '집계 요일 수',
    secondaryValue: `${visibleWeekdayReservationUsage.value.length}일`,
  },
  {
    label: '예약이 발생한 요일',
    value: `${activeWeekdayCount.value}일`,
    secondaryLabel: '예약 없는 요일',
    secondaryValue: `${inactiveWeekdayCount.value}일`,
  },
  {
    label: '최다 요일 비중',
    value: `${peakWeekdayShare.value.toFixed(1)}%`,
    secondaryLabel: '최다 요일 예약',
    secondaryValue: peakWeekdayReservation.value ? `${peakWeekdayReservation.value.reservationCount}건` : '-',
  },
])
const usageLegendItems = computed(() => [
  { label: '예약 시작 빈도', tone: 'start' },
  { label: '상세 점유 현황', tone: 'occupancy' },
])
const kpis = computed(() => {
  if (!meetingRoomSummary.value || !mailRetentionPolicy.value) return []

  return [
    {
      label: '오늘 예약 수',
      value: meetingRoomSummary.value.todayReservationCount,
      sub: `운영 시간 상세 점유 ${visibleOccupancyUsage.value.length}개 시간대`,
    },
    {
      label: '현재 사용 중 회의실 수',
      value: meetingRoomSummary.value.inUseMeetingRoomCount,
      sub: `실시간 점유 기준 ${siteBuildingUsage.value.length}개 건물`,
    },
    {
      label: '현재 사용 가능한 회의실 수',
      value: meetingRoomSummary.value.availableMeetingRoomCount,
      sub: `현재 사용 중인 회의실 기준`,
    },
    {
      label: '메일 보관 기간',
      value: `${mailRetentionPolicy.value.retentionDays}일`,
      sub: mailRetentionPolicy.value.autoDeleteEnabled ? '자동 삭제 사용' : '자동 삭제 미사용',
    },
    {
      label: '최근 관리자 작업',
      value: recentAuditLogs.value.length,
      sub: recentAuditLogs.value[0]
        ? `${recentAuditLogs.value[0].actorName} · ${recentAuditLogs.value[0].actionType}`
        : '최근 이력 없음',
    },
  ]
})

onMounted(() => {
  loadSummary()
})

async function loadSummary() {
  if (!isAdmin.value) {
    // USER가 직접 URL로 진입한 경우에도 화면에서 권한 없음 상태를 보여준다.
    forbidden.value = true
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = ''
  forbidden.value = false

  try {
    summary.value = await getAdminDashboardSummary()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    errorMessage.value = error?.message || '관리자 대시보드 요약 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return dateTimeFormatter.format(date)
}

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

function formatHour(value) {
  const hour = kstHour(value)
  if (hour < 0) return '-'
  return `${String(hour).padStart(2, '0')}:00`
}

function kstHour(value) {
  if (!value) return -1

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return -1

  const hourPart = hourPartsFormatter
    .formatToParts(date)
    .find((part) => part.type === 'hour')?.value
  const parsedHour = Number(hourPart)
  if (!Number.isFinite(parsedHour)) return -1
  return parsedHour === 24 ? 0 : parsedHour
}

function formatPercent(value) {
  const percent = toPercentNumber(value)
  return `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(1)}%`
}

function toPercentNumber(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  // 백엔드가 0.5처럼 비율로 주는 경우와 50처럼 퍼센트로 주는 경우를 모두 흡수한다.
  return numericValue <= 1 ? numericValue * 100 : numericValue
}

function resultBadgeClass(result) {
  return `${result}`.toUpperCase() === 'SUCCESS' ? 'success' : 'warning'
}
</script>

<template>
  <section class="page admin-page">
<!--    <div class="admin-eyebrow"><span></span>Admin Console</div>-->
    <header class="page-header">
      <h1>관리자 대시보드</h1>
      <p>운영 현황, 메일 정책, 회의실 사용 현황을 한 번에 확인합니다.</p>
    </header>

    <article v-if="loading" class="card empty-state">
      관리자 대시보드 요약 정보를 불러오는 중입니다.
    </article>

    <article v-else-if="forbidden" class="card empty-state">
      <h2>접근 권한 없음</h2>
      <p>이 화면은 관리자 계정만 확인할 수 있습니다.</p>
    </article>

    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions" style="margin-top: 12px;">
        <button class="secondary-button" @click="loadSummary">다시 시도</button>
      </div>
    </article>

    <template v-else>
      <div class="metric-grid admin-metric-grid">
        <article v-for="kpi in kpis" :key="kpi.label" class="metric-card admin-metric-card">
          <span>{{ kpi.label }}</span>
          <strong>{{ kpi.value }}</strong>
          <em>{{ kpi.sub }}</em>
        </article>
      </div>

      <div class="admin-dashboard-grid">
        <article class="card admin-chart-card">
          <div class="card-head">
            <div>
              <h2>시간대별 상세 점유 현황</h2>
              <p>운영 시간대별 회의실 점유 현황과 예약 빈도를 함꼐 비교할 수 있습니다.</p>
            </div>
            <span class="badge">{{ visibleOccupancyUsage.length }}개 시간대</span>
          </div>
          <p v-if="!mergedTimeSlotUsage.length" class="empty-text">표시할 시간대 데이터가 없습니다.</p>
          <div v-else class="admin-usage-detail-card">
            <AdminChartShell ariaLabel="시간대별 상세 점유 현황과 예약 시작 빈도 그래프">
              <div class="admin-chart-legend">
                <span v-for="item in usageLegendItems" :key="item.label" :class="['admin-chart-legend-item', item.tone]">
                  {{ item.label }}
                </span>
              </div>
              <svg
                class="admin-usage-chart"
                :viewBox="`0 0 ${chartViewBoxWidth} ${chartViewBoxHeight}`"
                preserveAspectRatio="none"
              >
                <g>
                  <line
                    v-for="tick in mergedTimeSlotChartYTicks"
                    :key="`merged-grid-${tick.value}-${tick.y}`"
                    class="admin-usage-grid-line"
                    :x1="chartPadding.left"
                    :x2="chartViewBoxWidth - chartPadding.right"
                    :y1="tick.y"
                    :y2="tick.y"
                  />
                  <text
                    v-for="tick in mergedTimeSlotChartYTicks"
                    :key="`merged-label-${tick.value}-${tick.y}`"
                    class="admin-usage-axis-label"
                    :x="chartPadding.left - 12"
                    :y="tick.y + 4"
                    text-anchor="end"
                  >
                    {{ tick.value }}
                  </text>
                </g>
                <polyline
                  v-if="mergedReservationStartChartPolyline"
                  class="admin-usage-line start"
                  :points="mergedReservationStartChartPolyline"
                />
                <polyline
                  v-if="mergedOccupancyChartPolyline"
                  class="admin-usage-line occupancy"
                  :points="mergedOccupancyChartPolyline"
                />
                <g v-for="point in mergedReservationStartChartPoints" :key="`start-${point.slotStartAt}`">
                  <circle class="admin-usage-dot start" :cx="point.x" :cy="point.y" r="5" />
                  <text
                    v-if="point.showValue && point.reservationStartCount > 0"
                    class="admin-usage-value start"
                    :x="point.x"
                    :y="point.y - 12"
                    text-anchor="middle"
                  >
                    {{ point.reservationStartCount }}
                  </text>
                  <text
                    v-if="point.emphasized"
                    class="admin-usage-axis-label"
                    :x="point.x"
                    :y="chartViewBoxHeight - 16"
                    text-anchor="middle"
                  >
                    {{ point.label }}
                  </text>
                </g>
                <g v-for="point in mergedOccupancyChartPoints" :key="`occupancy-${point.slotStartAt}`">
                  <circle class="admin-usage-dot occupancy" :cx="point.x" :cy="point.y" r="5" />
                </g>
              </svg>
            </AdminChartShell>
            <div class="admin-usage-insights admin-usage-insights-tight">
              <AdminInsightCard
                v-for="item in timeSlotInsightItems"
                :key="item.label"
                :label="item.label"
                :value="item.value"
                :secondary-label="item.secondaryLabel"
                :secondary-value="item.secondaryValue"
              />
            </div>
          </div>
        </article>

        <article class="card admin-chart-card">
          <div class="card-head">
            <div>
              <h2>요일별 예약 분포</h2>
              <p>이번 주 요일별로 예약이 얼마나 몰리는지 막대 그래프로 보여줍니다.</p>
            </div>
            <span class="badge">7일</span>
          </div>
          <p v-if="!visibleWeekdayReservationUsage.length" class="empty-text">집계된 요일별 예약 분포가 없습니다.</p>
          <div v-else class="admin-usage-detail-card">
            <AdminChartShell ariaLabel="요일별 예약 분포 그래프">
              <div class="admin-weekday-chart">
                <div v-for="day in weekdayChartRows" :key="day.dayOfWeek" class="admin-weekday-bar">
                  <div class="admin-weekday-bar-track">
                    <i :style="{ height: `${day.height}%` }"></i>
                  </div>
                  <strong>{{ day.weekdayLabel }}</strong>
                  <span>{{ day.reservationCount }}건</span>
                </div>
              </div>
            </AdminChartShell>
            <div class="admin-usage-insights admin-usage-insights-tight">
              <AdminInsightCard
                v-for="item in weekdayReservationInsightItems"
                :key="item.label"
                :label="item.label"
                :value="item.value"
                :secondary-label="item.secondaryLabel"
                :secondary-value="item.secondaryValue"
              />
            </div>
          </div>
        </article>

        <article class="card admin-chart-card">
          <div class="card-head">
            <div>
              <h2>현재 사용 중 회의실 분포</h2>
              <p>사이트와 건물별로 현재 사용 중인 회의실 수를 기준으로 분포를 보여줍니다.</p>
            </div>
            <span class="badge">{{ visibleSiteBuildingUsage.length }}개 건물</span>
          </div>
          <p v-if="!visibleSiteBuildingUsage.length" class="empty-text">집계된 현재 사용 중 회의실 분포가 없습니다.</p>
          <div v-else class="admin-usage-detail-card">
            <div class="admin-usage-bar-chart" role="img" aria-label="현재 사용 중 회의실 분포 그래프">
              <div v-for="site in siteUsageChartRows" :key="`${site.siteId}-${site.buildingId}`" class="admin-usage-bar-row">
                <div class="admin-usage-bar-meta">
                  <strong>{{ site.siteName }}</strong>
                  <span>{{ site.buildingName }} · 사용 {{ site.usedRooms }}/{{ site.totalRooms }}</span>
                </div>
                <div class="admin-usage-bar-track">
                  <i :style="{ width: `${site.width}%` }"></i>
                </div>
                <div class="admin-usage-bar-value">{{ site.usedRooms }}개</div>
              </div>
            </div>
            <div class="admin-usage-insights admin-usage-insights-tight">
              <AdminInsightCard
                v-for="item in siteUsageInsightItems"
                :key="item.label"
                :label="item.label"
                :value="item.value"
              />
            </div>
          </div>
        </article>

        <article class="card admin-table-card">
          <div class="card-head">
            <div>
              <h2>최근 관리자 작업 이력</h2>
              <p>가장 최근 감사 로그 5건을 표시합니다.</p>
            </div>
            <span class="badge">{{ recentAuditLogs.length }}건</span>
          </div>
          <ul v-if="recentAuditLogs.length" class="compact-list admin-audit-log-list">
            <AdminAuditLogItem v-for="log in recentAuditLogRows" :key="log.auditLogId" :log="log" />
          </ul>
          <p v-else class="empty-text">최근 관리자 작업 이력이 없습니다.</p>
        </article>
      </div>

      <article class="card">
        <div class="card-head">
          <div>
            <h2>보관 정책 요약</h2>
            <p>메일 보관 설정과 자동 삭제 상태를 확인합니다.</p>
          </div>
          <span :class="['badge', mailRetentionPolicy?.autoDeleteEnabled ? 'warning' : 'navy']">
            {{ mailRetentionPolicy?.autoDeleteEnabled ? '자동 삭제 사용' : '자동 삭제 미사용' }}
          </span>
        </div>
        <dl class="detail-list">
          <div>
            <dt>보관 기간</dt>
            <dd>{{ mailRetentionPolicy?.retentionDays ?? 0 }}일</dd>
          </div>
          <div>
            <dt>자동 삭제</dt>
            <dd>{{ mailRetentionPolicy?.autoDeleteEnabled ? '사용' : '미사용' }}</dd>
          </div>
          <div>
            <dt>수정 시각</dt>
            <dd>{{ formatDateTime(mailRetentionPolicy?.updatedAt) }}</dd>
          </div>
          <div>
            <dt>수정자</dt>
            <dd>{{ mailRetentionPolicy?.updatedBy || '-' }}</dd>
          </div>
        </dl>
      </article>
    </template>
  </section>
</template>
