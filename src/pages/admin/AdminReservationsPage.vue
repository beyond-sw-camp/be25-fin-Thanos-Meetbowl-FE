<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { cancelMeeting, getMeeting, getRoomReservations, getRooms } from '../../lib/reservations'

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const detailErrorMessage = ref('')
const site = ref('전체')
const status = ref('전체')
const date = ref(todayInputValue())
const rooms = ref([])
const reservations = ref([])
const selected = ref(null)
const selectedDetail = ref(null)

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const sites = computed(() => ['전체', ...new Set(rooms.value.map((room) => room.siteName).filter(Boolean))])
const roomById = computed(() => Object.fromEntries(rooms.value.map((room) => [room.roomId, room])))
const filtered = computed(() =>
  reservations.value.filter((reservation) => {
    const room = roomById.value[reservation.roomId]
    const siteMatch = site.value === '전체' || room?.siteName === site.value
    const statusMatch = status.value === '전체' || reservation.status === status.value
    return siteMatch && statusMatch
  }),
)

watch(date, () => {
  void loadReservations()
})

onMounted(async () => {
  await loadRooms()
  await loadReservations()
})

async function loadRooms() {
  try {
    const data = await getRooms({ page: 1, size: 100 })
    rooms.value = (data?.items || []).map((item) => ({
      roomId: item.roomId,
      name: item.name,
      siteName: item.siteName || '',
      buildingName: item.buildingName || '',
    }))
  } catch (error) {
    rooms.value = []
    throw error
  }
}

async function loadReservations() {
  loading.value = true
  errorMessage.value = ''
  selected.value = null
  selectedDetail.value = null

  try {
    const from = startOfKstDayIso(date.value)
    const to = nextDayStartOfKstIso(date.value)
    const data = await getRoomReservations({ from, to })
    reservations.value = flattenReservations(data || [])
  } catch (error) {
    reservations.value = []
    errorMessage.value = error?.message || '회의실 예약 현황을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function flattenReservations(board) {
  const now = Date.now()
  return board
    .flatMap((room) =>
      (room.reservations || []).map((reservation) => {
        const startMs = new Date(reservation.scheduledAt).getTime()
        const endMs = new Date(reservation.scheduledEndAt).getTime()
        const statusValue =
          startMs <= now && now < endMs ? 'inUse' : 'booked'

        return {
          id: reservation.meetingId,
          roomId: room.roomId,
          roomName: room.name,
          title: reservation.title,
          owner: reservation.hostUserId || '-',
          hostUserId: reservation.hostUserId || '',
          startAt: reservation.scheduledAt,
          endAt: reservation.scheduledEndAt,
          date: formatDate(reservation.scheduledAt),
          start: formatTime(reservation.scheduledAt),
          end: formatTime(reservation.scheduledEndAt),
          status: statusValue,
        }
      }),
    )
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
}

async function openDetail(item) {
  selected.value = item
  selectedDetail.value = null
  detailErrorMessage.value = ''

  try {
    selectedDetail.value = await getMeeting(item.id)
  } catch (error) {
    detailErrorMessage.value = error?.message || '예약 상세 정보를 불러오지 못했습니다.'
  }
}

async function cancel(id) {
  if (saving.value) return

  saving.value = true
  detailErrorMessage.value = ''
  try {
    await cancelMeeting(id)
    reservations.value = reservations.value.filter((reservation) => reservation.id !== id)
    if (selected.value?.id === id) {
      selected.value = null
      selectedDetail.value = null
    }
  } catch (error) {
    detailErrorMessage.value = error?.message || '예약을 취소하지 못했습니다.'
  } finally {
    saving.value = false
  }
}

function formatDate(value) {
  if (!value) return '-'
  const dateValue = new Date(value)
  if (Number.isNaN(dateValue.getTime())) return '-'
  return dateFormatter.format(dateValue).replace(/\.\s?$/u, '')
}

function formatTime(value) {
  if (!value) return '-'
  const dateValue = new Date(value)
  if (Number.isNaN(dateValue.getTime())) return '-'
  return timeFormatter.format(dateValue)
}

function statusLabel(value) {
  if (value === 'inUse') return '사용 중'
  if (value === 'booked') return '예약됨'
  return '-'
}

function statusBadgeClass(value) {
  return value === 'inUse' ? 'primary' : 'navy'
}

function todayInputValue() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function startOfKstDayIso(dayValue) {
  return `${dayValue}T00:00:00+09:00`
}

function nextDayStartOfKstIso(dayValue) {
  const base = new Date(`${dayValue}T00:00:00+09:00`)
  base.setUTCDate(base.getUTCDate() + 1)
  const year = base.getUTCFullYear()
  const month = String(base.getUTCMonth() + 1).padStart(2, '0')
  const day = String(base.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}T00:00:00+09:00`
}
</script>

<template>
  <section class="page admin-page">
    <header class="page-header">
      <h1>예약 현황 관리</h1>
      <p>전사 회의실 예약을 조회하고 필요 시 강제 취소합니다.</p>
    </header>

    <div class="card admin-toolbar">
      <div class="toolbar">
        <input v-model="date" class="room-date-input" type="date" />
      </div>
      <div class="toolbar">
        <button
          v-for="item in sites"
          :key="item"
          class="chip"
          :class="{ active: site === item }"
          @click="site = item"
        >
          {{ item }}
        </button>
      </div>
      <div class="toolbar">
        <button
          v-for="item in ['전체', 'booked', 'inUse']"
          :key="item"
          class="chip"
          :class="{ active: status === item }"
          @click="status = item"
        >
          {{ item === '전체' ? '전체 상태' : statusLabel(item) }}
        </button>
      </div>
    </div>

    <article v-if="loading" class="card empty-state">
      회의실 예약 현황을 불러오는 중입니다.
    </article>
    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions" style="margin-top: 12px;">
        <button class="secondary-button" @click="loadReservations">다시 시도</button>
      </div>
    </article>
    <div v-else class="table-card admin-data-table">
      <table>
        <thead>
          <tr>
            <th>회의 제목</th>
            <th>주최자</th>
            <th>회의실</th>
            <th>날짜</th>
            <th>시간</th>
            <th>상태</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.id" @click="openDetail(item)">
            <td>{{ item.title }}</td>
            <td>{{ item.owner }}</td>
            <td>{{ item.roomName }}</td>
            <td>{{ item.date }}</td>
            <td>{{ item.start }}-{{ item.end }}</td>
            <td>
              <span :class="['badge', statusBadgeClass(item.status)]">
                {{ statusLabel(item.status) }}
              </span>
            </td>
            <td>
              <button class="icon-text danger-text" :disabled="saving" @click.stop="cancel(item.id)">
                강제 취소
              </button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="7" class="empty-text">선택한 날짜와 조건에 해당하는 예약이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
      <article class="card write-modal detail-modal">
        <header>
          <div>
            <h2>{{ selected.title }}</h2>
            <p>{{ selected.start }}-{{ selected.end }} · {{ selected.roomName }}</p>
          </div>
          <button @click="selected = null">닫기</button>
        </header>
        <dl class="detail-list">
          <div>
            <dt>주최자</dt>
            <dd>{{ selected.owner }}</dd>
          </div>
          <div>
            <dt>상태</dt>
            <dd>{{ statusLabel(selected.status) }}</dd>
          </div>
          <div>
            <dt>회의실</dt>
            <dd>{{ roomById[selected.roomId]?.siteName || '-' }} · {{ roomById[selected.roomId]?.buildingName || '-' }}</dd>
          </div>
          <div>
            <dt>참석자</dt>
            <dd>
              {{
                selectedDetail?.attendees?.length
                  ? selectedDetail.attendees.map((attendee) => attendee.name || attendee.email || attendee.userId).join(', ')
                  : detailErrorMessage || '-'
              }}
            </dd>
          </div>
        </dl>
        <div class="modal-actions">
          <button class="danger-button" :disabled="saving" @click="cancel(selected.id)">강제 취소</button>
        </div>
      </article>
    </div>
  </section>
</template>
