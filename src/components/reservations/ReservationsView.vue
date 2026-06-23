<template>
  <section class="page my-reservations-page">
    <header class="page-header"><h1>{{ headerTitle }}</h1><p>{{ headerDescription }}</p></header>

    <article v-if="loading" class="card empty-state">예약 현황을 불러오는 중입니다.</article>

    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions retry-actions">
        <button class="secondary-button" type="button" @click="load">다시 시도</button>
      </div>
    </article>

    <template v-else>
      <div class="count-grid">
        <article class="card count-card"><span>{{ countLabel }}</span><strong>{{ countAll }}</strong></article>
        <article class="card count-card"><span>이번 주</span><strong>{{ countWeek }}</strong></article>
        <article class="card count-card"><span>이번 달</span><strong>{{ countMonth }}</strong></article>
      </div>

      <div v-if="actionError" class="card feedback-card"><div class="error-box">{{ actionError }}</div></div>

      <div class="card my-res-toolbar">
        <div class="toolbar">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="chip"
            :class="{ active: activeTab === tab.key }"
            type="button"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>회의 제목</th><th>날짜</th><th>시간</th><th>회의실</th><th>상태</th>
              <th v-if="allowCancel">수정 · 취소</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in displayedMeetings" :key="item.meetingId" :class="{ inactive: isInactive(item) }">
              <td>{{ item.title }}</td>
              <td>{{ item.date }}</td>
              <td>{{ item.start }} ~ {{ item.end }}</td>
              <td>{{ item.roomName }}</td>
              <td><span :class="['badge', statusMeta(item.status).tone]">{{ statusMeta(item.status).label }}</span></td>
              <td v-if="allowCancel">
                <template v-if="item.mine">
                  <button class="icon-text" type="button" :disabled="!canEdit(item) || saving" @click="openEdit(item)">수정</button>
                  <button class="icon-text danger" type="button" :disabled="!canCancel(item) || saving" @click="cancel(item)">예약 취소</button>
                </template>
                <span v-else class="muted-text">-</span>
              </td>
            </tr>
            <tr v-if="!displayedMeetings.length">
              <td :colspan="allowCancel ? 6 : 5" class="empty-state-inline">표시할 예약이 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <ReservationModal
      v-if="editTarget"
      mode="edit"
      :meeting="editTarget"
      :rooms="rooms"
      @close="editTarget = null"
      @saved="onEditSaved"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import ReservationModal from '../rooms/ReservationModal.vue'
import { cancelMeeting, getMeetings, getRooms } from '../../lib/reservations'
import { compareByDistanceTo, shiftDateKst, todayKst, utcToKstClock, utcToKstDate } from '../../utils/dateTime'

const props = defineProps({
  // 데이터 기준: 'host'(내가 주최/예약) | 'invited'(내가 참석자로 지정)
  role: { type: String, default: 'host' },
  headerTitle: { type: String, required: true },
  headerDescription: { type: String, default: '' },
  // 첫 번째 카운트 카드 라벨("예약된 회의" / "참석 회의")
  countLabel: { type: String, required: true },
  // 수정·취소 컬럼/버튼 노출 여부. 취소는 host만 가능하므로 invited 페이지는 false.
  allowCancel: { type: Boolean, default: false },
})

const auth = useAuthStore()
const myUserId = computed(() => auth.user?.userId || '')

const loading = ref(true)
const errorMessage = ref('')
const actionError = ref('')
const saving = ref(false)

const rooms = ref([])
const meetings = ref([])
const activeTab = ref('all')
const editTarget = ref(null)

const tabs = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'cancelled', label: '취소된 회의' },
]

const STATUS = {
  SCHEDULED: { label: '예정', tone: 'primary' },
  IN_PROGRESS: { label: '진행 중', tone: 'success' },
  ENDED: { label: '종료', tone: '' },
  CANCELLED: { label: '취소됨', tone: 'danger' },
}

// 다가오는 예약 — 표 노출용. "아직 안 끝난"(종료시각 >= now) 기준. 진행 중 회의 포함,
// 완전히 끝난 회의는 제외. 종료(ENDED)는 회색 이력으로 남기되, 취소(CANCELLED)는 '취소' 탭에서
// 따로 보여주므로 전체/기간 탭에서는 제외한다.
const upcomingMeetings = computed(() => {
  const now = Date.now()
  return meetings.value
    .filter((meeting) => meeting.status !== 'CANCELLED')
    .filter((meeting) => new Date(meeting.scheduledEndAt).getTime() >= now)
    // 날짜순(가까운 예약부터) 정렬.
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
})
// 취소된 예약 — '취소' 탭 전용. 기간/미종료 제한 없이 취소된 예약 전체를,
// 오늘(now)에 가장 가까운 예정일(과거·미래 무관)부터 위로 보여준다.
const cancelledMeetings = computed(() => {
  const compare = compareByDistanceTo(Date.now())
  return meetings.value
    .filter((meeting) => meeting.status === 'CANCELLED')
    .sort((a, b) => compare(a.scheduledAt, b.scheduledAt))
})
// 카운트 전용 — 다가오는 예약 ∩ 활성(SCHEDULED/IN_PROGRESS). 취소/종료는 유효 예약 수에서 제외한다.
const activeUpcomingMeetings = computed(() => upcomingMeetings.value.filter(isActive))

const displayedMeetings = computed(() => {
  if (activeTab.value === 'cancelled') return cancelledMeetings.value
  return activeTab.value === 'all'
    ? upcomingMeetings.value
    : upcomingMeetings.value.filter((meeting) => inPeriod(meeting, activeTab.value))
})
const countAll = computed(() => activeUpcomingMeetings.value.length)
const countWeek = computed(() => activeUpcomingMeetings.value.filter((meeting) => inPeriod(meeting, 'week')).length)
const countMonth = computed(() => activeUpcomingMeetings.value.filter((meeting) => inPeriod(meeting, 'month')).length)

onMounted(load)

async function load() {
  loading.value = true
  errorMessage.value = ''
  actionError.value = ''
  try {
    const [roomData, meetingData] = await Promise.all([
      getRooms({ page: 1, size: 100 }),
      getMeetings({ role: props.role }),
    ])
    rooms.value = roomData?.items || []
    // 회의실 예약 현황이므로 회의실이 지정된 회의만 다룬다(화상회의만 진행하는 회의 제외).
    meetings.value = (meetingData || [])
      .filter((meeting) => meeting.meetingRoomId)
      .map(normalizeMeeting)
  } catch (error) {
    errorMessage.value = error?.message || '예약 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    loading.value = false
  }
}

function normalizeMeeting(item) {
  const room = rooms.value.find((candidate) => candidate.roomId === item.meetingRoomId)
  return {
    meetingId: item.meetingId,
    title: item.title || '-',
    scheduledAt: item.scheduledAt,
    scheduledEndAt: item.scheduledEndAt,
    date: utcToKstDate(item.scheduledAt),
    start: utcToKstClock(item.scheduledAt),
    end: utcToKstClock(item.scheduledEndAt),
    roomName: room?.name || '-',
    status: item.status,
    mine: item.hostUserId === myUserId.value,
  }
}

function statusMeta(status) {
  return STATUS[status] || { label: status || '-', tone: '' }
}
function isActive(meeting) {
  return meeting.status === 'SCHEDULED' || meeting.status === 'IN_PROGRESS'
}
function isInactive(meeting) {
  return meeting.status === 'CANCELLED' || meeting.status === 'ENDED'
}
function canCancel(meeting) {
  return meeting.mine && (meeting.status === 'SCHEDULED' || meeting.status === 'IN_PROGRESS')
}
// 수정 가능: 본인 주최 + 활성(취소/종료 제외). 표는 미종료만 노출하므로 종료건은 애초에 안 보인다.
function canEdit(meeting) {
  return meeting.mine && isActive(meeting)
}
function openEdit(meeting) {
  if (!canEdit(meeting)) return
  editTarget.value = meeting
}
async function onEditSaved() {
  editTarget.value = null
  await load()
}

async function cancel(meeting) {
  if (saving.value || !canCancel(meeting)) return
  if (!window.confirm(`'${meeting.title}' 예약을 취소하시겠습니까?`)) return

  saving.value = true
  actionError.value = ''
  try {
    await cancelMeeting(meeting.meetingId)
    await load()
  } catch (error) {
    if (error?.status === 403) {
      actionError.value = '본인이 예약한 회의만 취소할 수 있습니다.'
    } else {
      actionError.value = error?.message || '예약 취소에 실패했습니다.'
    }
  } finally {
    saving.value = false
  }
}

// 기간 필터/집계 — KST(UTC+9, 월요일 시작) 기준 경계를 UTC 인스턴트로 만들어 비교한다.
function kstStart(dateStr) {
  return new Date(`${dateStr}T00:00:00+09:00`)
}
function kstWeekdayMon0(dateStr) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', weekday: 'short' }).format(kstStart(dateStr))
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday)
}
function periodRange(period) {
  const today = todayKst()
  if (period === 'today') {
    return { from: kstStart(today), to: kstStart(shiftDateKst(today, 1)) }
  }
  if (period === 'week') {
    const monday = shiftDateKst(today, -kstWeekdayMon0(today))
    return { from: kstStart(monday), to: kstStart(shiftDateKst(monday, 7)) }
  }
  if (period === 'month') {
    const first = `${today.slice(0, 8)}01`
    const [year, month] = first.split('-').map(Number)
    const nextFirst = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
    return { from: kstStart(first), to: kstStart(nextFirst) }
  }
  return { from: null, to: null }
}
function inPeriod(meeting, period) {
  const { from, to } = periodRange(period)
  const time = new Date(meeting.scheduledAt).getTime()
  if (from && time < from.getTime()) return false
  if (to && time >= to.getTime()) return false
  return true
}
</script>

<style scoped>
.count-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.count-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.count-card span {
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 600;
}
.count-card strong {
  font-size: 26px;
}
.my-res-toolbar {
  margin-bottom: 16px;
}
.feedback-card {
  margin-bottom: 16px;
}
/* 취소·종료된 예약은 회색으로 구분 */
.inactive {
  color: var(--muted-foreground);
}
.icon-text.danger {
  color: var(--danger);
}
.icon-text:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.muted-text {
  color: var(--muted-foreground);
}
@media (max-width: 640px) {
  .count-grid {
    grid-template-columns: 1fr;
  }
}
</style>
