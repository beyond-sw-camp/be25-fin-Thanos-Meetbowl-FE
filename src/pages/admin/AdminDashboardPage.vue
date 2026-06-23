<script setup>
import { computed, onMounted, ref } from 'vue'
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

const hourFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const isAdmin = computed(() => auth.user?.role === 'ADMIN')
const recentAuditLogs = computed(() => summary.value?.recentAuditLogs || [])
const mailRetentionPolicy = computed(() => summary.value?.mailRetentionPolicy || null)
const meetingRoomSummary = computed(() => summary.value?.meetingRoomSummary || null)
const timeSlotUsage = computed(() => meetingRoomSummary.value?.timeSlotUsage || [])
const visibleTimeSlotUsage = computed(() =>
  timeSlotUsage.value.filter((item) => {
    const hour = kstHour(item.slotStartAt)
    return hour >= 9 && hour < 24
  }),
)
const siteBuildingUsage = computed(() => meetingRoomSummary.value?.siteBuildingUsage || [])
const maxReservationCount = computed(() => {
  const counts = visibleTimeSlotUsage.value.map((item) => item.reservationCount)
  return counts.length ? Math.max(...counts, 1) : 1
})
const peakUsage = computed(() => {
  if (!visibleTimeSlotUsage.value.length) return null

  // 화면에 표시하는 운영 시간대 안에서 최고 예약 시간대를 계산한다.
  return visibleTimeSlotUsage.value.reduce((top, item) => {
    if (!top || item.reservationCount > top.reservationCount) return item
    return top
  }, null)
})
const busiestSiteBuilding = computed(() => {
  if (!siteBuildingUsage.value.length) return null

  // usageRate가 0~1 또는 0~100으로 와도 같은 기준으로 비교할 수 있게 맞춘다.
  return siteBuildingUsage.value.reduce((top, item) => {
    if (!top || toPercentNumber(item.usageRate) > toPercentNumber(top.usageRate)) return item
    return top
  }, null)
})
const kpis = computed(() => {
  if (!meetingRoomSummary.value || !mailRetentionPolicy.value) return []

  return [
    {
      label: '오늘 예약 수',
      value: meetingRoomSummary.value.todayReservationCount,
      sub: `운영 시간 집계 ${visibleTimeSlotUsage.value.length}건`,
    },
    {
      label: '현재 사용 중 회의실 수',
      value: meetingRoomSummary.value.inUseMeetingRoomCount,
      sub: `전체 분석 ${siteBuildingUsage.value.length}개 건물`,
    },
    {
      label: '현재 사용 가능한 회의실 수',
      value: meetingRoomSummary.value.availableMeetingRoomCount,
      sub: `사용률 최고 ${formatPeakLocation(busiestSiteBuilding.value)}`,
    },
    {
      label: '메일 보관 기간',
      value: `${mailRetentionPolicy.value.retentionDays}일`,
      sub: mailRetentionPolicy.value.autoDeleteEnabled ? '자동 삭제 사용' : '자동 삭제 미사용',
    },
    {
      label: '최근 관리자 작업',
      value: recentAuditLogs.value.length,
      sub: recentAuditLogs.value[0] ? `${recentAuditLogs.value[0].actorName} · ${recentAuditLogs.value[0].actionType}` : '최근 이력 없음',
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

function formatHour(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return hourFormatter.format(date).replace(':00', '')
}

function kstHour(value) {
  if (!value) return -1

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return -1

  return Number(
    new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      hour12: false,
    }).format(date),
  )
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

function formatPeakLocation(item) {
  if (!item) return '-'
  return `${item.siteName} ${item.buildingName}`
}

function resultBadgeClass(result) {
  return `${result}`.toUpperCase() === 'SUCCESS' ? 'success' : 'warning'
}
</script>

<template>
  <section class="page admin-page">
    <div class="admin-eyebrow"><span></span>Admin Console</div>
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
      <article class="card">
        <div class="card-head">
          <div>
            <h2>메일 보관 정책 요약</h2>
            <p>현재 적용 중인 보관 및 자동 삭제 설정입니다.</p>
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

      <div class="metric-grid">
        <article v-for="kpi in kpis" :key="kpi.label" class="metric-card">
          <span>{{ kpi.label }}</span>
          <strong>{{ kpi.value }}</strong>
          <em>{{ kpi.sub }}</em>
        </article>
      </div>

      <div class="admin-dashboard-grid">
        <article class="card admin-chart-card">
          <div class="card-head">
            <div>
              <h2>시간대별 회의실 사용 빈도</h2>
              <p>오늘 예약된 회의실의 시간대별 예약 수입니다. 운영 시간인 09:00부터 24:00 전까지를 막대그래프로 보여줍니다.</p>
            </div>
            <span class="badge">{{ visibleTimeSlotUsage.length }}개 시간대</span>
          </div>
          <p v-if="!visibleTimeSlotUsage.length" class="empty-text">집계된 시간대 사용 정보가 없습니다.</p>
          <div v-else class="admin-bar-chart">
            <div v-for="item in visibleTimeSlotUsage" :key="item.slotStartAt" class="admin-bar-item">
              <div class="admin-bar-track">
                <i :style="{ height: `${(item.reservationCount / maxReservationCount) * 100}%` }"></i>
              </div>
              <span>{{ formatHour(item.slotStartAt) }}</span>
              <small>{{ item.reservationCount }}</small>
            </div>
          </div>
        </article>

        <article class="card admin-site-card">
          <div class="card-head">
            <div>
              <h2>사이트·건물별 회의실 사용률</h2>
              <p>현재 사용 중인 회의실 수를 기준으로 계산한 사용률입니다.</p>
            </div>
            <span class="badge">{{ siteBuildingUsage.length }}개 건물</span>
          </div>
          <ul v-if="siteBuildingUsage.length" class="admin-progress-list">
            <li v-for="site in siteBuildingUsage" :key="`${site.siteId}-${site.buildingId}`">
              <div>
                <strong>{{ site.siteName }}</strong>
                <span>{{ site.buildingName }} · 사용 {{ site.usedRooms }}/{{ site.totalRooms }} · {{ formatPercent(site.usageRate) }}</span>
              </div>
              <b><i :style="{ width: formatPercent(site.usageRate) }"></i></b>
            </li>
          </ul>
          <p v-else class="empty-text">집계된 사이트·건물 사용률 정보가 없습니다.</p>
          <p v-if="peakUsage">
            가장 예약이 많은 시간대는 <strong>{{ formatHour(peakUsage.slotStartAt) }}</strong> 입니다.
          </p>
        </article>
      </div>

      <div class="admin-dashboard-grid">
        <article class="card admin-table-card wide">
          <div class="card-head">
            <div>
              <h2>사이트·건물별 상세 사용 현황</h2>
              <p>회의실 총 개수와 현재 사용 중인 개수를 함께 표시합니다.</p>
            </div>
            <span class="badge">실시간 요약</span>
          </div>
          <div class="table-card embedded-table">
            <table>
              <thead>
                <tr>
                  <th>사이트</th>
                  <th>건물</th>
                  <th>총 회의실 수</th>
                  <th>사용 중</th>
                  <th>사용 가능</th>
                  <th>사용률</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!siteBuildingUsage.length">
                  <td colspan="6"><div class="empty-state">표시할 회의실 사용 현황이 없습니다.</div></td>
                </tr>
                <tr v-for="site in siteBuildingUsage" :key="`${site.siteId}-${site.buildingId}-table`">
                  <td>{{ site.siteName }}</td>
                  <td>{{ site.buildingName }}</td>
                  <td>{{ site.totalRooms }}</td>
                  <td>{{ site.usedRooms }}</td>
                  <td>{{ Math.max(site.totalRooms - site.usedRooms, 0) }}</td>
                  <td>
                    <span class="progress-cell"><i :style="{ width: formatPercent(site.usageRate) }"></i></span>
                    {{ formatPercent(site.usageRate) }}
                  </td>
                </tr>
              </tbody>
            </table>
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
          <ul v-if="recentAuditLogs.length" class="compact-list">
            <li v-for="log in recentAuditLogs.slice(0, 5)" :key="log.auditLogId">
              <div>
                <strong>{{ log.actionType }}</strong>
                <span>{{ log.actorName }} · {{ log.targetType }} · {{ formatDateTime(log.createdAt) }}</span>
                <span>{{ log.targetId || '-' }}</span>
              </div>
              <span :class="['badge', resultBadgeClass(log.result)]">{{ log.result }}</span>
            </li>
          </ul>
          <p v-else class="empty-text">최근 관리자 작업 이력이 없습니다.</p>
        </article>
      </div>
    </template>
  </section>
</template>
