<template>
  <section class="page rooms-page reservation-board-page">
    <header class="page-header rooms-header reservation-board-header">
      <div>
        <h1>회의실 예약</h1>
        <p>회의실 예약 현황을 시간 단위로 확인하고 예약할 수 있습니다.</p>
      </div>
      <ActionButton variant="primary" @click="openCreate(activeRoomId)">
        <Calendar :size="18" />
        새 예약
      </ActionButton>
    </header>

    <nav class="page-route-tabs reservation-route-tabs">
      <RouterLink to="/app/rooms" class="page-route-tab" active-class="active">전체 예약 현황</RouterLink>
      <RouterLink to="/app/my-reservations" class="page-route-tab" active-class="active">내 예약</RouterLink>
      <RouterLink to="/app/my-attending" class="page-route-tab" active-class="active">참석 회의</RouterLink>
    </nav>

    <article v-if="loading" class="card empty-state">회의실 예약 현황을 불러오는 중입니다.</article>

    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions retry-actions">
        <button class="secondary-button" type="button" @click="loadAll">다시 시도</button>
      </div>
    </article>

    <template v-else>
      <div class="card rooms-toolbar rooms-toolbar-card reservation-toolbar-card">
        <div class="reservation-toolbar-main">
          <div class="room-date-control">
            <button class="room-nav-button" type="button" aria-label="이전 날짜" @click="shiftDay(-1)">
              <ChevronLeft :size="18" />
            </button>
            <button class="room-date-pill" type="button">
              <Calendar :size="18" />
              <span>{{ displayDateLabel }}</span>
            </button>
            <button class="room-nav-button" type="button" aria-label="다음 날짜" @click="shiftDay(1)">
              <ChevronRight :size="18" />
            </button>
            <button class="room-today-button" type="button" @click="date = todayKst()">오늘</button>
          </div>

          <div class="reservation-filter-select reservation-filter-select-building with-leading-icon">
            <Building2 :size="16" class="reservation-filter-icon" />
            <AppSelect class="room-board-select room-building-select" v-model="buildingFilter">
              <option v-for="option in buildingOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </AppSelect>
          </div>

          <div class="reservation-filter-select reservation-filter-select-capacity with-leading-icon">
            <Users :size="16" class="reservation-filter-icon" />
            <AppSelect class="room-board-select room-capacity-select" v-model="capacityFilter">
              <option v-for="option in capacityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </AppSelect>
          </div>

          <label class="reservation-search-field">
            <Search :size="18" />
            <input v-model="globalSearch" type="search" placeholder="회의실 검색" />
          </label>
        </div>
      </div>

      <div class="metric-grid reservation-metric-grid">
        <article v-for="metric in reservationMetrics" :key="metric.label" class="metric-card reservation-metric-card">
          <span :class="['reservation-metric-icon', metric.tone]"><component :is="metric.icon" :size="22" /></span>
          <div class="reservation-metric-copy">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <em>{{ metric.note }}</em>
          </div>
        </article>
      </div>

      <section class="card reservation-board-switch-card">
        <div class="reservation-board-head">
          <div class="reservation-view-tabs">
            <button
              type="button"
              class="reservation-view-tab"
              :class="{ active: viewMode === 'timeline' }"
              @click="viewMode = 'timeline'"
            >
              <Clock3 :size="16" />
              타임라인
            </button>
            <button
              type="button"
              class="reservation-view-tab"
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              <List :size="16" />
              리스트
            </button>
          </div>
          <div class="room-legend reservation-legend reservation-switch-legend">
            <span><i class="mine"></i>내 예약</span>
            <span><i></i>예약됨</span>
            <span><i class="available"></i>사용 가능</span>
          </div>
        </div>
      </section>

      <div class="reservation-board-grid" :class="`view-${viewMode}`">
        <aside v-if="viewMode === 'list'" class="card reservation-room-list-card">
          <div class="reservation-room-list-head">
            <h2>회의실 목록</h2>
          </div>

          <div class="reservation-room-list-search">
            <label class="reservation-search-field compact">
              <Search :size="17" />
              <input v-model="roomListSearch" type="search" placeholder="회의실 검색" />
            </label>
            <button class="reservation-icon-button" type="button" aria-label="회의실 필터">
              <SlidersHorizontal :size="16" />
            </button>
          </div>

          <div class="reservation-room-list">
            <button
              v-for="room in sidebarRooms"
              :key="room.roomId"
              type="button"
              class="reservation-room-item"
              :class="{ selected: selectedRoomId === room.roomId }"
              @click="selectedRoomId = room.roomId"
            >
              <span class="reservation-room-item-icon"><DoorClosed :size="18" /></span>
              <span class="reservation-room-item-copy">
                <strong>{{ room.name }}</strong>
                <small><Users :size="13" /> 1~{{ room.capacity }}명</small>
                <small><MapPin :size="13" /> {{ roomLocationLabel(room) }}</small>
              </span>
              <span v-if="selectedRoomId === room.roomId" class="reservation-room-item-check"><Check :size="14" /></span>
            </button>

            <p v-if="!sidebarRooms.length" class="empty-state-inline">표시할 회의실이 없습니다.</p>
          </div>
        </aside>

        <section class="card reservation-board-card" :class="{ 'timeline-mode': viewMode === 'timeline' }">
          <div v-if="viewMode === 'timeline'" class="room-timeline-card reservation-timeline-card">
            <div class="room-timeline-scroll reservation-timeline-scroll" :style="{ '--hour-px': TIMELINE.hourPx + 'px' }">
              <div class="room-time-header reservation-time-header">
                <div class="room-name-spacer">회의실</div>
                <div class="room-hours">
                  <span v-for="hour in timelineHours" :key="hour">{{ String(hour).padStart(2, '0') }}:00</span>
                </div>
              </div>

              <RoomTimelineRow
                v-for="(room, index) in boardRooms"
                :key="room.roomId"
                :room="room"
                :blocks="filteredBlocksByRoom[room.roomId] || []"
                :name-map="nameMap"
                :date="date"
                :compact-meta="true"
                :show-empty-label="false"
                :show-now-label="index === 0"
                @block-click="openDetail"
                @track-click="openCreate"
                @track-drag="openCreateRange"
              />

              <div v-if="boardRooms.length && !timelineHasReservations" class="reservation-timeline-empty">
                <Calendar :size="42" />
                <strong>예약 없음</strong>
                <p>선택한 날짜에 예약된 회의가 없습니다.</p>
              </div>

              <div v-if="!boardRooms.length" class="empty-state-inline board-empty-state">표시할 회의실이 없습니다.</div>
            </div>
          </div>

          <div v-else class="reservation-list-shell">
            <div class="reservation-list-content">
              <table v-if="pagedListItems.length" class="reservation-list-table">
                <thead>
                  <tr>
                    <th>회의명</th>
                    <th>회의실</th>
                    <th>시간</th>
                    <th>참석 인원</th>
                    <th>상태</th>
                    <th>예약자</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in pagedListItems" :key="item.meetingId" @click="openDetail(item)">
                    <td>{{ item.title }}</td>
                    <td>{{ item.roomName }}</td>
                    <td>{{ item.start }} - {{ item.end }}</td>
                    <td>{{ item.attendeeCount }}명</td>
                    <td>
                      <span class="reservation-status-badge" :class="item.mine ? 'mine' : 'booked'">
                        {{ item.mine ? '내 예약' : '예약됨' }}
                      </span>
                    </td>
                    <td>{{ item.bookerName }}</td>
                  </tr>
                </tbody>
              </table>

              <div v-else class="reservation-list-empty">
                <p>표시할 예약이 없습니다.</p>
              </div>
            </div>

            <div class="reservation-list-footer">
              <span>총 {{ filteredListItems.length }}건</span>
              <div class="reservation-list-footer-controls">
                <div class="reservation-list-pagination">
                  <button type="button" :disabled="currentPage <= 1" @click="currentPage = Math.max(1, currentPage - 1)">
                    <ChevronLeft :size="16" />
                  </button>
                  <button
                    v-for="page in visiblePageNumbers"
                    :key="page"
                    type="button"
                    :class="{ active: page === currentPage }"
                    @click="currentPage = page"
                  >
                    {{ page }}
                  </button>
                  <button
                    type="button"
                    :disabled="currentPage >= pageCount"
                    @click="currentPage = Math.min(pageCount, currentPage + 1)"
                  >
                    <ChevronRight :size="16" />
                  </button>
                </div>

                <AppSelect v-model.number="pageSize" size="sm" class="reservation-page-size-select">
                  <option :value="20">20개씩 보기</option>
                  <option :value="50">50개씩 보기</option>
                </AppSelect>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <ReservationModal
      v-if="modal"
      :rooms="rooms"
      :initial-room-id="pendingRoomId"
      :initial-date="date"
      :initial-start="pendingStart"
      :initial-end="pendingEnd"
      @close="modal = false"
      @saved="onSaved"
    />

    <ModalShell v-if="detail" modal-class="detail-modal" @close="closeDetail">
      <header>
        <div><h2>{{ detail.title }}</h2></div>
        <button class="modal-close" type="button" aria-label="닫기" @click="closeDetail">×</button>
      </header>
      <div class="detail-body">
        <dl class="detail-list">
          <div><dt>날짜 / 시간</dt><dd>{{ detailDateLabel ? detailDateLabel + '  ' : '' }}{{ detailTimeLabel }}</dd></div>
          <div><dt>회의실</dt><dd>{{ detailRoomLabel }}</dd></div>
          <div><dt>예약자</dt><dd>{{ detailHostName }}</dd></div>
          <div>
            <dt>참석자</dt>
            <dd v-if="detailFull && detailAttendeeList.length" class="detail-chip-group">
              <span v-for="(name, index) in detailAttendeeList" :key="index" class="detail-chip">{{ name }}</span>
            </dd>
            <dd v-else>-</dd>
          </div>
          <div><dt>상태</dt><dd><span class="detail-chip">{{ detail.mine ? '내 예약' : '예약됨' }}</span></dd></div>
        </dl>
        <p v-if="detailRestricted" class="detail-note">참여한 회의만 상세 정보를 볼 수 있습니다.</p>
      </div>
      <p v-if="actionError" class="warning-text">{{ actionError }}</p>
      <p v-if="detailEnded" class="detail-note">이미 종료된 회의입니다.</p>
      <div class="modal-actions">
        <button v-if="detail.mine" class="danger-button" :disabled="saving || detailEnded" @click="cancelReservation(detail.meetingId)">예약 취소</button>
        <button v-if="!detailEnded" class="primary-button" type="button" @click="enterMeeting(detail.meetingId)">회의 입장</button>
        <button v-else class="primary-button" type="button" disabled>회의 입장</button>
      </div>
    </ModalShell>

    <ConfirmDialog v-if="confirmDialog" v-bind="confirmDialog" @cancel="cancelConfirm" @confirm="acceptConfirm" />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  Building2,
  Calendar,
  CalendarCheck2,
  Check,
  Clock3,
  DoorClosed,
  List,
  MapPin,
  Search,
  SlidersHorizontal,
  UserRound,
  Users,
  ChevronLeft,
  ChevronRight,
} from '@lucide/vue'
import AppSelect from '../../components/common/AppSelect.vue'
import ActionButton from '../../components/common/ActionButton.vue'
import ModalShell from '../../components/common/ModalShell.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import RoomTimelineRow from '../../components/rooms/RoomTimelineRow.vue'
import ReservationModal from '../../components/rooms/ReservationModal.vue'
import { useAuthStore } from '../../stores/auth'
import { cancelMeeting, getMeeting, getMeetings, getRoomReservations, getRooms } from '../../lib/reservations'
import { openMeetingWindow } from '../../lib/meeting-route'
import { useUserNames } from '../../composables/useUserNames'
import { kstDayRangeUtc, shiftDateKst, todayKst, utcToKstClock, utcToKstDate } from '../../utils/dateTime'
import { TIMELINE, timelineHours } from '../../utils/timeline'

const auth = useAuthStore()
const { confirmDialog, requestConfirm, cancelConfirm, acceptConfirm } = useConfirmDialog()
const myUserId = computed(() => auth.user?.userId || '')
const { nameMap, resolveNames } = useUserNames()

const loading = ref(true)
const errorMessage = ref('')
const actionError = ref('')
const saving = ref(false)

const rooms = ref([])
const blocksByRoom = ref({})
const meetings = ref([])

const date = ref(todayKst())
const viewMode = ref('timeline')
const buildingFilter = ref('all')
const capacityFilter = ref('all')
const globalSearch = ref('')
const roomListSearch = ref('')
const selectedRoomId = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

const modal = ref(false)
const detail = ref(null)
const detailFull = ref(null)
const detailRestricted = ref(false)
const pendingRoomId = ref('')
const pendingStart = ref('09:00')
const pendingEnd = ref('')

const displayDateLabel = computed(() => {
  const target = new Date(`${date.value}T00:00:00+09:00`)
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(target)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${lookup.year}. ${lookup.month}. ${lookup.day}. (${lookup.weekday})`
})

const buildingOptions = computed(() => {
  const seen = new Set()
  const options = [{ value: 'all', label: '전체 건물' }]
  for (const room of rooms.value) {
    const value = `${room.siteId || 'none'}:${room.buildingId || 'none'}`
    if (seen.has(value)) continue
    seen.add(value)
    options.push({
      value,
      label: `${room.siteName} ${room.buildingName}`,
    })
  }
  return options
})

const capacityOptions = [
  { value: 'all', label: '인원 (전체)' },
  { value: 'small', label: '인원 (1~10명)' },
  { value: 'medium', label: '인원 (11~20명)' },
  { value: 'large', label: '인원 (21명 이상)' },
]

const roomMap = computed(() => {
  const map = {}
  for (const room of rooms.value) map[room.roomId] = room
  return map
})

const baseRooms = computed(() => rooms.value.filter((room) => roomMatchesFilters(room)))
const sidebarRooms = computed(() => {
  const keyword = normalizeKeyword(roomListSearch.value)
  if (!keyword) return baseRooms.value
  return baseRooms.value.filter((room) => roomMatchesKeyword(room, keyword))
})

const boardRooms = computed(() => {
  const keyword = normalizeKeyword(globalSearch.value)
  if (!keyword) return baseRooms.value
  return baseRooms.value.filter((room) => {
    if (roomMatchesKeyword(room, keyword)) return true
    return (blocksByRoom.value[room.roomId] || []).some((block) => blockMatchesKeyword(block, keyword))
  })
})

const filteredBlocksByRoom = computed(() => {
  const keyword = normalizeKeyword(globalSearch.value)
  const next = {}
  for (const room of boardRooms.value) {
    const blocks = blocksByRoom.value[room.roomId] || []
    next[room.roomId] = !keyword || roomMatchesKeyword(room, keyword)
      ? blocks
      : blocks.filter((block) => blockMatchesKeyword(block, keyword))
  }
  return next
})

const timelineHasReservations = computed(() =>
  boardRooms.value.some((room) => (filteredBlocksByRoom.value[room.roomId] || []).length > 0),
)

const listItems = computed(() =>
  meetings.value
    .filter((meeting) => {
      const room = roomMap.value[meeting.roomId]
      if (!room || !roomMatchesFilters(room)) return false
      const keyword = normalizeKeyword(globalSearch.value)
      if (!keyword) return true
      return meetingMatchesKeyword(meeting, keyword) || roomMatchesKeyword(room, keyword)
    })
    .map((meeting) => ({
      ...meeting,
      bookerName: nameMap[meeting.hostUserId] || (meeting.hostUserId === myUserId.value ? '나' : '예약자'),
    }))
    .sort((a, b) => a.startMs - b.startMs),
)

const filteredListItems = computed(() => listItems.value)
const pageCount = computed(() => Math.max(1, Math.ceil(filteredListItems.value.length / pageSize.value)))
const pagedListItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredListItems.value.slice(start, start + pageSize.value)
})
const visiblePageNumbers = computed(() =>
  Array.from({ length: pageCount.value }, (_, index) => index + 1).slice(0, 5),
)

const totalReservationCount = computed(() => filteredListItems.value.length)
const myReservationCount = computed(() => filteredListItems.value.filter((item) => item.mine).length)
const availableRoomCount = computed(() =>
  baseRooms.value.filter((room) => room.isAvailable).length,
)

const reservationMetrics = computed(() => [
  {
    label: '총 예약',
    value: totalReservationCount.value,
    note: '오늘 전체 예약 수',
    tone: 'total',
    icon: CalendarCheck2,
  },
  {
    label: '내 예약',
    value: myReservationCount.value,
    note: '오늘 내 예약 수',
    tone: 'mine',
    icon: UserRound,
  },
  {
    label: '사용 가능',
    value: availableRoomCount.value,
    note: '오늘 사용 가능한 회의실',
    tone: 'available',
    icon: Calendar,
  },
])

const activeRoomId = computed(() => selectedRoomId.value || sidebarRooms.value[0]?.roomId || baseRooms.value[0]?.roomId || '')

const detailRoomLabel = computed(() => {
  const room = rooms.value.find((item) => item.roomId === detailFull.value?.meetingRoomId)
  if (room) return `${room.siteName} · ${room.buildingName}`
  return detail.value?.roomName || '-'
})
const detailDateLabel = computed(() => {
  const full = detailFull.value
  if (!full) return ''
  const startDate = utcToKstDate(full.scheduledAt)
  const endDate = utcToKstDate(full.scheduledEndAt)
  return startDate === endDate ? startDate : `${startDate} ~ ${endDate}`
})
const detailTimeLabel = computed(() => {
  const full = detailFull.value
  if (full) return `${utcToKstClock(full.scheduledAt)} ~ ${utcToKstClock(full.scheduledEndAt)}`
  return detail.value ? `${detail.value.start} ~ ${detail.value.end}` : ''
})
const detailHostName = computed(() => nameMap[detail.value?.hostUserId] || (detail.value?.mine ? '나' : '-'))
const detailAttendeeList = computed(() =>
  (detailFull.value?.attendees || []).map((attendee) => nameMap[attendee.userId] || '이름 미확인'),
)
const detailEnded = computed(() => {
  const status = String(detailFull.value?.status || '').toUpperCase()
  return status === 'ENDED' || status === 'CANCELLED'
})

onMounted(loadAll)

watch(date, loadDayData)
watch(sidebarRooms, (nextRooms) => {
  if (!nextRooms.length) {
    selectedRoomId.value = ''
    return
  }
  if (!nextRooms.some((room) => room.roomId === selectedRoomId.value)) {
    selectedRoomId.value = nextRooms[0].roomId
  }
}, { immediate: true })
watch([globalSearch, buildingFilter, capacityFilter, pageSize], () => {
  currentPage.value = 1
})

async function loadAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    const roomData = await getRooms({ page: 1, size: 100 })
    rooms.value = (roomData?.items || []).map(normalizeRoom)
    await loadDayData()
  } catch (error) {
    errorMessage.value = error?.message || '회의실 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    loading.value = false
  }
}

async function loadDayData() {
  const { from, to } = kstDayRangeUtc(date.value)
  try {
    const [reservationData, meetingData] = await Promise.all([
      getRoomReservations({ from, to }),
      getMeetings({ role: 'all', from, to }),
    ])

    const hostIds = []
    const reservationMap = {}
    for (const room of reservationData || []) {
      reservationMap[room.roomId] = (room.reservations || []).map((reservation) => {
        hostIds.push(reservation.hostUserId)
        return {
          meetingId: reservation.meetingId,
          roomId: room.roomId,
          title: reservation.title,
          scheduledAt: reservation.scheduledAt,
          scheduledEndAt: reservation.scheduledEndAt,
          start: utcToKstClock(reservation.scheduledAt),
          end: utcToKstClock(reservation.scheduledEndAt),
          hostUserId: reservation.hostUserId,
          mine: reservation.hostUserId === myUserId.value,
          roomName: room.name,
        }
      })
    }
    blocksByRoom.value = reservationMap

    meetings.value = (meetingData || [])
      .filter((meeting) => meeting.meetingRoomId)
      .filter((meeting) => meeting.status !== 'CANCELLED')
      .map((meeting) => normalizeMeeting(meeting))

    resolveNames(hostIds.concat(meetings.value.map((meeting) => meeting.hostUserId)))
  } catch (error) {
    errorMessage.value = error?.message || '예약 현황을 불러오지 못했습니다.'
  }
}

function normalizeRoom(item) {
  return {
    roomId: item?.roomId || '',
    name: item?.name || '-',
    siteId: item?.siteId || '',
    siteName: item?.siteName || '-',
    buildingId: item?.buildingId || '',
    buildingName: item?.buildingName || '-',
    floor: item?.floor ?? null,
    capacity: item?.capacity ?? 0,
    isAvailable: (item?.isAvailable ?? item?.available) !== false,
  }
}

function normalizeMeeting(item) {
  const room = roomMap.value[item.meetingRoomId]
  return {
    meetingId: item.meetingId,
    roomId: item.meetingRoomId,
    roomName: room?.name || '회의실',
    title: item.title || '-',
    scheduledAt: item.scheduledAt,
    scheduledEndAt: item.scheduledEndAt,
    start: utcToKstClock(item.scheduledAt),
    end: utcToKstClock(item.scheduledEndAt),
    startMs: new Date(item.scheduledAt).getTime(),
    hostUserId: item.hostUserId,
    attendeeCount: Array.isArray(item.attendees) ? item.attendees.length : 0,
    mine: item.hostUserId === myUserId.value,
  }
}

function normalizeKeyword(value) {
  return String(value || '').trim().toLowerCase()
}

function roomLocationLabel(room) {
  return `${room.siteName} ${room.buildingName}${room.floor === null ? '' : ` ${room.floor}층`}`
}

function roomMatchesFilters(room) {
  if (buildingFilter.value !== 'all') {
    const target = `${room.siteId || 'none'}:${room.buildingId || 'none'}`
    if (target !== buildingFilter.value) return false
  }

  if (capacityFilter.value === 'small') return room.capacity <= 10
  if (capacityFilter.value === 'medium') return room.capacity >= 11 && room.capacity <= 20
  if (capacityFilter.value === 'large') return room.capacity >= 21
  return true
}

function roomMatchesKeyword(room, keyword) {
  return [room.name, room.siteName, room.buildingName, roomLocationLabel(room)]
    .join(' ')
    .toLowerCase()
    .includes(keyword)
}

function blockMatchesKeyword(block, keyword) {
  const hostName = nameMap[block.hostUserId] || ''
  return [block.title, block.roomName, hostName].join(' ').toLowerCase().includes(keyword)
}

function meetingMatchesKeyword(meeting, keyword) {
  const bookerName = nameMap[meeting.hostUserId] || (meeting.hostUserId === myUserId.value ? '나' : '예약자')
  return [meeting.title, meeting.roomName, bookerName].join(' ').toLowerCase().includes(keyword)
}

function shiftDay(delta) {
  date.value = shiftDateKst(date.value, delta)
}

function openCreate(roomId, start = '09:00') {
  pendingRoomId.value = roomId || activeRoomId.value
  pendingStart.value = start
  pendingEnd.value = ''
  modal.value = true
}

function openCreateRange(roomId, start, end) {
  pendingRoomId.value = roomId || activeRoomId.value
  pendingStart.value = start
  pendingEnd.value = end
  modal.value = true
}

async function onSaved() {
  modal.value = false
  await loadDayData()
}

async function openDetail(item) {
  detail.value = item
  detailFull.value = null
  detailRestricted.value = false
  resolveNames([item.hostUserId])

  try {
    const full = await getMeeting(item.meetingId)
    detailFull.value = full
    resolveNames([full.hostUserId, ...(full.attendees || []).map((attendee) => attendee.userId)])
  } catch {
    detailRestricted.value = true
  }
}

function closeDetail() {
  detail.value = null
  detailFull.value = null
  detailRestricted.value = false
  actionError.value = ''
}

function enterMeeting(targetMeetingId) {
  const normalizedMeetingId = String(targetMeetingId || '').trim()
  if (!normalizedMeetingId) return

  const scheduledAt = detailFull.value?.scheduledAt || detail.value?.scheduledAt
  const scheduledAtMs = scheduledAt ? new Date(scheduledAt).getTime() : null
  if (detailEnded.value) {
    window.alert('해당 회의는 종료되었습니다.')
    return
  }
  if (scheduledAtMs && Date.now() < scheduledAtMs - (15 * 60 * 1000)) {
    window.alert('회의 시작 15분 전부터 입장할 수 있습니다.')
    return
  }

  closeDetail()
  openMeetingWindow(normalizedMeetingId, {
    scheduledAt,
    title: detailFull.value?.title || detail.value?.title || '',
  })
}

async function cancelReservation(meetingId) {
  if (saving.value) return
  const confirmed = await requestConfirm({
    title: '예약을 취소할까요?',
    message: '선택한 회의실 예약을 취소합니다. 참석자가 있다면 일정 변경을 확인해 주세요.',
    confirmLabel: '예약 취소',
  })
  if (!confirmed) return

  saving.value = true
  actionError.value = ''
  try {
    await cancelMeeting(meetingId)
    detail.value = null
    detailFull.value = null
    await loadDayData()
  } catch (error) {
    actionError.value = error?.message || '예약 취소에 실패했습니다.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.reservation-route-tabs {
  margin-bottom: 20px;
}

.reservation-board-header {
  margin-bottom: 10px;
}

.reservation-toolbar-card {
  margin-bottom: 16px;
  overflow: hidden;
}

.reservation-toolbar-main {
  display: grid;
  grid-template-columns:
    52px
    minmax(180px, 1.12fr)
    52px
    84px
    minmax(170px, 0.82fr)
    minmax(150px, 0.72fr)
    minmax(220px, 1fr)
    auto;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.reservation-toolbar-main .room-date-control {
  display: contents;
}

.reservation-toolbar-main .room-date-control .room-date-pill {
  min-width: 0;
}

.reservation-toolbar-main .room-date-control .room-nav-button,
.reservation-toolbar-main .room-date-control .room-today-button,
.reservation-toolbar-main .room-date-control .room-date-pill {
  width: 100%;
}

.reservation-filter-select {
  position: relative;
  min-width: 0;
  flex: 0 0 auto;
}

.reservation-filter-select.with-leading-icon :deep(.app-select) {
  min-height: 52px;
  border-radius: 14px;
  padding-left: 40px;
}

.reservation-filter-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  z-index: 1;
  transform: translateY(-50%);
  color: var(--muted-foreground);
  pointer-events: none;
}

.room-board-select {
  width: 100%;
}

.reservation-filter-select-building {
  width: 100%;
}

.reservation-filter-select-capacity {
  width: 100%;
}

.reservation-search-field {
  position: relative;
  min-width: 0;
  width: 100%;
}

.reservation-search-field svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted-foreground);
  pointer-events: none;
}

.reservation-search-field input {
  min-height: 52px;
  padding-left: 42px;
  padding-right: 40px;
  border-radius: 14px;
  width: 100%;
}

.reservation-toolbar-main .room-nav-button,
.reservation-toolbar-main .room-date-pill,
.reservation-toolbar-main .room-today-button,
.reservation-toolbar-main .reservation-search-field input,
.reservation-toolbar-main .reservation-filter-select :deep(.app-select) {
  min-height: 52px;
}

.reservation-search-field.compact {
  flex: 1 1 auto;
  min-width: 0;
}

.reservation-search-field.compact input {
  min-height: 44px;
  border-radius: 12px;
}

.reservation-legend {
  flex: 0 0 auto;
  justify-content: flex-end;
  align-self: center;
  white-space: nowrap;
  gap: 16px;
  font-size: 12px;
}

.reservation-switch-legend {
  margin-left: auto;
}

.reservation-legend i.available {
  background: white;
  border: 1px solid var(--border);
}

.reservation-metric-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 18px;
}

.reservation-metric-card {
  min-height: 96px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.reservation-metric-icon {
  width: 58px;
  height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
}

.reservation-metric-icon.total,
.reservation-metric-icon.mine {
  background: #fff4ec;
  color: var(--primary);
}

.reservation-metric-icon.available {
  background: #eef3ff;
  color: #3b82f6;
}

.reservation-metric-copy {
  display: grid;
  gap: 4px;
}

.reservation-metric-copy span,
.reservation-metric-copy em {
  color: var(--muted-foreground);
  font-size: 13px;
  font-style: normal;
}

.reservation-metric-copy strong {
  font-size: 22px;
  line-height: 1;
}

.reservation-board-grid {
  display: grid;
  gap: 16px;
  align-items: start;
}

.reservation-board-switch-card {
  padding: 0;
  margin-bottom: 16px;
  overflow: hidden;
  border-radius: 22px;
  box-shadow: var(--soft-shadow);
}

.reservation-board-grid.view-timeline {
  grid-template-columns: minmax(0, 1fr);
}

.reservation-board-grid.view-list {
  grid-template-columns: 290px minmax(0, 1fr);
}

.reservation-room-list-card,
.reservation-board-card {
  border-radius: 22px;
  box-shadow: var(--soft-shadow);
}

.reservation-room-list-card {
  padding: 16px;
}

.reservation-room-list-head h2 {
  margin: 0;
  font-size: 18px;
}

.reservation-room-list-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  margin-bottom: 12px;
}

.reservation-icon-button {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  color: var(--muted-foreground);
}

.reservation-room-list {
  display: grid;
  gap: 8px;
}

.reservation-room-item {
  width: 100%;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: white;
  padding: 12px 14px;
  text-align: left;
}

.reservation-room-item.selected {
  border-color: rgba(243, 115, 33, 0.65);
  background: #fff8f3;
  box-shadow: inset 0 0 0 1px rgba(243, 115, 33, 0.15);
}

.reservation-room-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.reservation-room-item-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.reservation-room-item-copy strong,
.reservation-room-item-copy small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reservation-room-item-copy strong {
  font-size: 15px;
}

.reservation-room-item-copy small {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-foreground);
  font-size: 12px;
}

.reservation-room-item-check {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--primary);
  color: white;
}

.reservation-board-card {
  padding: 0;
  overflow: hidden;
}

.reservation-board-card.timeline-mode {
  width: 100%;
}

.reservation-board-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 18px;
}

.reservation-view-tabs {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.reservation-view-tab {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: white;
  padding: 0 12px;
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 700;
}

.reservation-view-tab.active {
  border-color: rgba(243, 115, 33, 0.5);
  background: #fff8f3;
  color: var(--primary);
}

.reservation-timeline-card {
  border-radius: 0;
  box-shadow: none;
}

.reservation-timeline-scroll {
  position: relative;
  min-height: 560px;
}

.reservation-time-header {
  top: 0;
}

.reservation-time-header .room-name-spacer {
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: var(--foreground);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
}

.reservation-time-header .room-hours span {
  place-items: center;
  padding-left: 0;
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.board-empty-state {
  padding: 48px 16px;
}

.reservation-timeline-empty {
  position: absolute;
  inset: 53px 0 0 190px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  color: var(--muted-foreground);
  text-align: center;
  pointer-events: none;
}

.reservation-timeline-empty strong {
  color: var(--foreground);
  font-size: 28px;
  line-height: 1.1;
}

.reservation-timeline-empty p {
  margin: 0;
  font-size: 15px;
}

.reservation-list-shell {
  display: grid;
  min-height: 490px;
}

.reservation-list-content {
  min-height: 380px;
}

.reservation-list-table {
  width: 100%;
  border-collapse: collapse;
}

.reservation-list-table th,
.reservation-list-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  font-size: 14px;
}

.reservation-list-table th {
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 800;
  background: #fcfdff;
}

.reservation-list-table tbody tr {
  cursor: pointer;
}

.reservation-list-table tbody tr:hover {
  background: #fffaf6;
}

.reservation-status-badge {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 800;
}

.reservation-status-badge.mine {
  border: 1px solid rgba(243, 115, 33, 0.5);
  background: #fff8f3;
  color: var(--primary);
}

.reservation-status-badge.booked {
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: #f3f7ff;
  color: #3b82f6;
}

.reservation-list-empty {
  min-height: 380px;
  display: grid;
  place-items: center;
  color: var(--muted-foreground);
  font-size: 15px;
}

.reservation-list-empty p {
  margin: 0;
}

.reservation-list-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
}

.reservation-list-footer span {
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 700;
}

.reservation-list-footer-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reservation-list-pagination {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.reservation-list-pagination button {
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: white;
  color: var(--muted-foreground);
  font-weight: 700;
}

.reservation-list-pagination button.active {
  border-color: rgba(243, 115, 33, 0.45);
  color: var(--primary);
  background: #fff8f3;
}

.reservation-list-pagination button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.reservation-page-size-select {
  min-width: 126px;
}

.empty-state-inline {
  padding: 28px 16px;
  color: var(--muted-foreground);
  text-align: center;
  font-size: 15px;
}

.modal-actions .primary-button:disabled,
.modal-actions .danger-button:disabled {
  background: var(--muted);
  color: var(--muted-foreground);
  cursor: not-allowed;
}

@media (max-width: 1200px) {
  .reservation-toolbar-main {
    grid-template-columns:
      48px
      minmax(160px, 1fr)
      48px
      76px
      minmax(150px, 0.82fr)
      minmax(136px, 0.72fr)
      minmax(170px, 1fr)
      auto;
  }

  .reservation-board-grid.view-list {
    grid-template-columns: 1fr;
  }

  .reservation-legend {
    gap: 12px;
  }
}

@media (max-width: 900px) {
  .reservation-board-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .reservation-switch-legend {
    margin-left: 0;
  }

  .reservation-metric-grid {
    grid-template-columns: 1fr;
  }

  .reservation-list-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .reservation-list-footer-controls {
    justify-content: space-between;
  }
}
</style>
