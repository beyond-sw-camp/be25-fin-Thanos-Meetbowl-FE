<template>
  <section class="page meetings-page">
    <header class="page-header rooms-header">
      <div><h1>회의</h1><p>내가 주최하거나 초대된 회의를 확인하고 새 회의를 생성합니다.</p></div>
      <button class="primary-button" @click="openCreate">내 회의 생성</button>
    </header>

    <div class="card meetings-filter-card">
      <div class="toolbar">
        <button v-for="item in tabs" :key="item.key" class="chip" :class="{ active: tab === item.key }" @click="changeTab(item.key)">{{ item.label }}</button>
      </div>
      <div class="meeting-filter-controls">
        <select v-model="range"><option value="all">전체 기간</option><option value="3m">최근 3개월</option><option value="6m">최근 6개월</option></select>
        <select v-model="sort"><option value="latest">최신순</option><option value="oldest">오래된순</option></select>
        <span>총 {{ filtered.length }}건</span>
      </div>
    </div>

    <div class="card meeting-list-card">
      <p v-if="loadError" class="warning-text">{{ loadError }}</p>
      <article v-for="meeting in paged" :key="meeting.id" class="meeting-row">
        <div class="meeting-row-main">
          <div class="meeting-title-row">
            <h2>{{ meeting.title }}</h2>
            <span :class="['badge', meeting.status === 'live' ? 'danger' : meeting.status === 'ended' ? 'muted' : 'primary']">{{ statusLabel[meeting.status] }}</span>
            <span :class="['badge', meeting.role === 'host' ? 'success' : 'navy']">{{ meeting.role === 'host' ? '주최자' : '참석자' }}</span>
          </div>
          <div class="meeting-meta-grid">
            <span>{{ meeting.startLabel }} - {{ meeting.endLabel }}</span>
            <span>{{ meeting.room }}</span>
            <span>참석자: {{ meeting.attendees.join(', ') || '-' }}</span>
            <span>검토자: {{ meeting.reviewer || '-' }}</span>
          </div>
        </div>
        <div class="row-actions">
          <button v-if="meeting.role === 'host' && meeting.status !== 'ended'" class="secondary-button small" @click="openEdit(meeting)">수정</button>
          <button class="primary-button small" @click="enterMeeting(meeting)">{{ meeting.status === 'ended' ? '내 회의록 보기' : '입장' }}</button>
        </div>
      </article>
      <p v-if="!paged.length && !loading" class="empty-text">조건에 맞는 회의가 없습니다.</p>
      <p v-else-if="loading && !paged.length" class="empty-text">불러오는 중...</p>
    </div>

    <Pagination v-model="pageNo" :total-pages="totalPages" />

    <ReservationModal
      v-if="modal"
      :rooms="rooms"
      :mode="modalMode"
      :meeting="editingMeeting"
      :allow-remote="true"
      :initial-remote="true"
      @close="modal = false"
      @saved="onSaved"
    />
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Pagination from '../../components/common/Pagination.vue'
import ReservationModal from '../../components/rooms/ReservationModal.vue'
import { getMeetingJoinBlockedMessage, openMeetingWindow } from '../../lib/meeting-route'
import { getMeetings, getRooms } from '../../lib/reservations'
import { useAuthStore } from '../../stores/auth'
import { useUserNames } from '../../composables/useUserNames'
import { utcToKstClock, utcToKstDate } from '../../utils/dateTime'

const router = useRouter()
const auth = useAuthStore()
const myUserId = computed(() => auth.user?.userId || '')
const { nameMap, resolveNames } = useUserNames()

const statusLabel = { live: '진행 중', upcoming: '예정', ended: '종료' }
const tabs = [{ key: 'all', label: '전체' }, { key: 'host', label: '내가 주최한 회의' }, { key: 'attendee', label: '초대된 회의' }]

const tab = ref('all')
const range = ref('all')
// 기본 정렬: 가까운 날짜순(scheduledAt 오름차순) — 다가오는 회의가 위로.
const sort = ref('oldest')
const pageNo = ref(1)
const pageSize = 15

const rooms = ref([])
const rawMeetings = ref([])
const loading = ref(false)
const loadError = ref('')

const modal = ref(false)
const modalMode = ref('create')
const editingMeeting = ref(null)

// 프론트 탭키 attendee → 백엔드 role 파라미터 invited 로 매핑.
const roleParam = computed(() => (tab.value === 'attendee' ? 'invited' : tab.value))

const roomNameMap = computed(() => {
  const map = {}
  for (const room of rooms.value) map[room.roomId] = room.name
  return map
})

// 참석자는 응답의 attendees(userId/role)로 오고, userId→이름은 클라이언트에서 배치 변환한다(useUserNames).
// 회의실명은 응답에 없어 getRooms→roomNameMap으로 매핑한다.
const mapped = computed(() =>
  rawMeetings.value
    // 취소된 회의는 참여 대상이 아니므로 목록에서 숨긴다.
    // 회의실 점유/원격 구분 없이 내가 참여하는 모든 회의를 표시한다(회의실명은 아래 매핑).
    .filter((meeting) => meeting.status !== 'CANCELLED')
    .map((meeting) => {
      const role = meeting.hostUserId === myUserId.value ? 'host' : 'attendee'
      const status = meeting.status === 'IN_PROGRESS' ? 'live' : meeting.status === 'ENDED' ? 'ended' : 'upcoming'
      // 참석자 = 주최자(HOST) 제외 전원(PARTICIPANT + REVIEWER), 검토자 = REVIEWER 1명을 별도 표기.
      // 검토자도 참석 대상이므로 참석자 목록에 포함한다(검토자만 초대된 회의도 참석자가 보이도록).
      const participants = (meeting.attendees || []).filter((attendee) => attendee.role !== 'HOST')
      const reviewer = (meeting.attendees || []).find((attendee) => attendee.role === 'REVIEWER')
      return {
        id: meeting.meetingId,
        meetingId: meeting.meetingId,
        title: meeting.title,
        role,
        status,
        scheduledAt: meeting.scheduledAt,
        scheduledEndAt: meeting.scheduledEndAt,
        scheduledAtMs: new Date(meeting.scheduledAt).getTime(),
        scheduledEndAtMs: new Date(meeting.scheduledEndAt).getTime(),
        startLabel: `${utcToKstDate(meeting.scheduledAt)} ${utcToKstClock(meeting.scheduledAt)}`,
        endLabel: utcToKstClock(meeting.scheduledEndAt),
        room: meeting.meetingRoomId ? roomNameMap.value[meeting.meetingRoomId] || '회의실' : '원격',
        attendees: participants.map((attendee) => nameMap[attendee.userId] || '이름 미확인'),
        reviewer: reviewer ? nameMap[reviewer.userId] || '이름 미확인' : '',
      }
    }),
)

// 정렬은 클라이언트 처리(기본 오래된순=scheduledAt 오름차순=가까운 날짜순, 최신순=내림차순). 기간·역할은 서버 재조회.
const filtered = computed(() => {
  const list = [...mapped.value]
  list.sort((a, b) => (sort.value === 'latest' ? b.scheduledAtMs - a.scheduledAtMs : a.scheduledAtMs - b.scheduledAtMs))
  return list
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => filtered.value.slice((pageNo.value - 1) * pageSize, pageNo.value * pageSize))

// 기간(최근 N개월)은 scheduledAt 하한(from)만 둔다. 상한 없이 예정 회의까지 보이게 한다.
function rangeToFromTo() {
  if (range.value === 'all') return {}
  const months = range.value === '3m' ? 3 : 6
  const from = new Date()
  from.setMonth(from.getMonth() - months)
  return { from: from.toISOString() }
}

async function loadMeetings() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await getMeetings({ role: roleParam.value, ...rangeToFromTo() })
    rawMeetings.value = data || []
    const ids = []
    for (const meeting of rawMeetings.value) {
      for (const attendee of meeting.attendees || []) ids.push(attendee.userId)
    }
    resolveNames(ids)
  } catch (error) {
    loadError.value = error?.message || '회의 목록을 불러오지 못했습니다.'
    rawMeetings.value = []
  } finally {
    loading.value = false
  }
}

async function loadRooms() {
  try {
    const data = await getRooms({ page: 1, size: 100 })
    rooms.value = data?.items || []
  } catch {
    rooms.value = []
  }
}

onMounted(() => {
  loadRooms()
  loadMeetings()
  window.addEventListener('focus', handleWindowFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 탭(역할)·기간이 바뀌면 서버에서 다시 조회한다.
watch([tab, range], () => {
  pageNo.value = 1
  loadMeetings()
})

function changeTab(value) {
  tab.value = value
}

function openCreate() {
  modalMode.value = 'create'
  editingMeeting.value = null
  modal.value = true
}

function openEdit(meeting) {
  modalMode.value = 'edit'
  editingMeeting.value = { meetingId: meeting.meetingId }
  modal.value = true
}

async function onSaved() {
  modal.value = false
  await loadMeetings()
}

function enterMeeting(meeting) {
  // 종료 회의: 회의록 보기. 회의록 팀의 meetingId 라우트 확정 전까지 기존 임시 연결 유지.
  // TODO(회의록 팀 라우트 확정 시): meetingId 전달해 해당 회의 회의록으로 이동.
  if (meeting.status === 'ended') {
    router.push('/app/minutes')
    return
  }

  const blockedMessage = getMeetingJoinBlockedMessage(meeting.scheduledAt)
  if (blockedMessage) {
    window.alert(blockedMessage)
    return
  }

  openMeetingWindow(meeting.id, {
    scheduledAt: meeting.scheduledAt,
  })
}

function handleWindowFocus() {
  void loadMeetings()
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  void loadMeetings()
}
</script>
