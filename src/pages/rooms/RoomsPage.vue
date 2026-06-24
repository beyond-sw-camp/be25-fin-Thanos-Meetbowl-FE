<template>
  <section class="page rooms-page">
    <header class="page-header rooms-header">
      <div><h1>회의실 예약 현황</h1><p>회의실별 예약 시간을 확인하고 빈 시간대를 바로 예약합니다.</p></div>
      <button class="primary-button" @click="openCreate(filteredRooms[0]?.roomId || '')">회의실 사용</button>
    </header>

    <article v-if="loading" class="card empty-state">회의실 예약 현황을 불러오는 중입니다.</article>

    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions retry-actions">
        <button class="secondary-button" type="button" @click="loadAll">다시 시도</button>
      </div>
    </article>

    <template v-else>
      <div class="reservation-summary-grid">
        <article class="card reservation-summary">
          <div class="card-head"><h2>내가 예약한 회의</h2><RouterLink to="/app/my-reservations" class="card-head-link">전체 보기</RouterLink></div>
          <button v-for="item in myBooked" :key="item.meetingId" @click="router.push('/app/my-reservations')">
            <strong>{{ item.title }}</strong><span>{{ item.start }}-{{ item.end }} · {{ item.roomName }}</span>
          </button>
          <p v-if="!myBooked.length">예약한 회의가 없습니다.</p>
        </article>
        <article class="card reservation-summary">
          <div class="card-head"><h2>내가 참석해야 하는 회의</h2><RouterLink to="/app/my-attending" class="card-head-link">전체 보기</RouterLink></div>
          <button v-for="item in myInvited" :key="item.meetingId" @click="openDetail(item)">
            <strong>{{ item.title }}</strong><span>{{ item.start }}-{{ item.end }} · {{ item.roomName }}</span>
          </button>
          <p v-if="!myInvited.length">참석 예정 회의가 없습니다.</p>
        </article>
      </div>

      <div class="card rooms-toolbar">
        <div class="room-date-control">
          <button class="secondary-button" type="button" @click="shiftDay(-1)">‹</button>
          <input type="date" v-model="date">
          <button class="secondary-button" type="button" @click="shiftDay(1)">›</button>
          <button class="secondary-button" @click="date = todayKst()">오늘</button>
        </div>
        <div class="room-legend">
          <select class="room-site-select" v-model="site">
            <option v-for="item in sites" :key="item" :value="item">{{ item }}</option>
          </select>
          <span><i class="mine"></i>내 예약</span>
          <span><i></i>예약됨</span>
          <span><i class="restricted"></i>사용 제한</span>
        </div>
      </div>

      <div class="card room-timeline-card">
        <div class="room-timeline-scroll" :style="{ '--hour-px': TIMELINE.hourPx + 'px' }">
          <div class="room-time-header">
            <div class="room-name-spacer">회의실</div>
            <div class="room-hours"><span v-for="hour in timelineHours" :key="hour">{{ String(hour).padStart(2, '0') }}:00</span></div>
          </div>
          <RoomTimelineRow
            v-for="room in filteredRooms"
            :key="room.roomId"
            :room="room"
            :blocks="blocksByRoom[room.roomId] || []"
            :name-map="nameMap"
            :date="date"
            @block-click="openDetail"
            @track-click="openCreate"
            @track-drag="openCreateRange"
          />
          <div v-if="!filteredRooms.length" class="empty-state-inline">표시할 회의실이 없습니다.</div>
        </div>
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
import { useRouter } from 'vue-router'
import ModalShell from '../../components/common/ModalShell.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import RoomTimelineRow from '../../components/rooms/RoomTimelineRow.vue'
import ReservationModal from '../../components/rooms/ReservationModal.vue'
import { useAuthStore } from '../../stores/auth'
import { cancelMeeting, getMeeting, getMyReservations, getRoomReservations, getRooms } from '../../lib/reservations'
import { openMeetingWindow } from '../../lib/meeting-route'
import { useUserNames } from '../../composables/useUserNames'
import { kstDayRangeUtc, shiftDateKst, todayKst, utcToKstClock, utcToKstDate } from '../../utils/dateTime'
import { TIMELINE, timelineHours } from '../../utils/timeline'

const auth = useAuthStore()
const router = useRouter()
const { confirmDialog, requestConfirm, cancelConfirm, acceptConfirm } = useConfirmDialog()
const myUserId = computed(() => auth.user?.userId || '')
const { nameMap, resolveNames } = useUserNames()

const loading = ref(true)
const errorMessage = ref('')
const actionError = ref('')
const saving = ref(false)

const rooms = ref([])
const blocksByRoom = ref({})
const myBooked = ref([])
const myInvited = ref([])

const site = ref('전체')
const date = ref(todayKst())
const modal = ref(false)
const detail = ref(null)
const detailFull = ref(null)
const detailRestricted = ref(false)
const pendingRoomId = ref('')
const pendingStart = ref('09:00')
const pendingEnd = ref('')

const sites = computed(() => ['전체', ...new Set(rooms.value.map((room) => room.siteName).filter(Boolean))])
const filteredRooms = computed(() =>
  site.value === '전체' ? rooms.value : rooms.value.filter((room) => room.siteName === site.value),
)

// 상세 모달 표시값 — 상세 조회(detailFull)가 있으면 전체, 없으면 블록 기본정보로 채운다.
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
const detailHostName = computed(
  () => nameMap[detail.value?.hostUserId] || (detail.value?.mine ? '나' : '-'),
)
// 주최자가 본인을 참석자로 넣은 경우도 그대로 보여준다(선택한 참석자 전원 노출). 주최자는 HOST 1행으로 저장되므로 여기 포함된다.
const detailAttendeeList = computed(() =>
  (detailFull.value?.attendees || []).map(
    (attendee) => nameMap[attendee.userId] || '이름 미확인',
  ),
)
// 종료 여부는 백엔드 status 기준으로만 판단한다. 예정 종료 시각은 입장 차단 기준으로 쓰지 않는다.
const detailEnded = computed(() => {
  const status = String(detailFull.value?.status || '').toUpperCase()
  if (status === 'ENDED' || status === 'CANCELLED') return true
  return false
})

onMounted(loadAll)

watch(date, loadReservations)

async function loadAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    const roomData = await getRooms({ page: 1, size: 100 })
    rooms.value = (roomData?.items || []).map(normalizeRoom)
    await Promise.all([loadReservations(), loadMyReservations()])
  } catch (error) {
    errorMessage.value = error?.message || '회의실 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    loading.value = false
  }
}

async function loadReservations() {
  const { from, to } = kstDayRangeUtc(date.value)
  try {
    const data = await getRoomReservations({ from, to })
    const map = {}
    const hosts = []
    for (const room of data || []) {
      map[room.roomId] = (room.reservations || []).map((reservation) => {
        hosts.push(reservation.hostUserId)
        return {
          meetingId: reservation.meetingId,
          title: reservation.title,
          start: utcToKstClock(reservation.scheduledAt),
          end: utcToKstClock(reservation.scheduledEndAt),
          scheduledEndAt: reservation.scheduledEndAt,
          hostUserId: reservation.hostUserId,
          mine: reservation.hostUserId === myUserId.value,
          roomName: room.name,
        }
      })
    }
    blocksByRoom.value = map
    resolveNames(hosts)
  } catch (error) {
    errorMessage.value = error?.message || '예약 현황을 불러오지 못했습니다.'
  }
}

async function loadMyReservations() {
  try {
    const [hostData, invitedData] = await Promise.all([
      getMyReservations('host'),
      getMyReservations('invited'),
    ])
    // 백엔드가 활성 회의만 내려주므로, 프론트에서 예정 종료 시각으로 추가 필터링하지 않는다.
    myBooked.value = (hostData || []).map((item) => normalizeMine(item, true))
    myInvited.value = (invitedData || []).map((item) => normalizeMine(item, false))
  } catch {
    // 요약 카드는 보조 정보라 실패해도 화면 전체를 막지 않는다.
  }
}

function normalizeMine(item, mine) {
  return {
    meetingId: item.meetingId,
    roomName: item.roomName || '',
    title: item.title,
    start: utcToKstClock(item.scheduledAt),
    end: utcToKstClock(item.scheduledEndAt),
    scheduledEndAt: item.scheduledEndAt,
    hostUserId: item.hostUserId,
    mine,
  }
}

function normalizeRoom(item) {
  return {
    roomId: item?.roomId || '',
    name: item?.name || '-',
    siteName: item?.siteName || '-',
    buildingName: item?.buildingName || '-',
    floor: item?.floor ?? null,
    capacity: item?.capacity ?? 0,
    isAvailable: (item?.isAvailable ?? item?.available) !== false,
  }
}

function shiftDay(delta) {
  date.value = shiftDateKst(date.value, delta)
}

function openCreate(roomId, start = '09:00') {
  pendingRoomId.value = roomId || rooms.value[0]?.roomId || ''
  pendingStart.value = start
  pendingEnd.value = ''
  modal.value = true
}

// 타임라인 빈 시간대 드래그 → 회의실·시작·종료를 prefill한 채 예약 모달을 연다.
function openCreateRange(roomId, start, end) {
  pendingRoomId.value = roomId || rooms.value[0]?.roomId || ''
  pendingStart.value = start
  pendingEnd.value = end
  modal.value = true
}

async function onSaved() {
  modal.value = false
  await Promise.all([loadReservations(), loadMyReservations()])
}

async function openDetail(item) {
  detail.value = item
  detailFull.value = null
  detailRestricted.value = false
  // 예약자 이름은 기본정보(타인 회의 포함)에서도 보여줄 수 있게 먼저 조회한다.
  resolveNames([item.hostUserId])

  try {
    const full = await getMeeting(item.meetingId)
    detailFull.value = full
    resolveNames([full.hostUserId, ...(full.attendees || []).map((attendee) => attendee.userId)])
  } catch {
    // 403 등(참여하지 않은 회의)은 상세를 못 보므로 기본정보만 표시한다.
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
    await Promise.all([loadReservations(), loadMyReservations()])
  } catch (error) {
    actionError.value = error?.message || '예약 취소에 실패했습니다.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>

.empty-state-inline {
  padding: 18px 16px;
  color: var(--muted-foreground);
  text-align: center;
  font-size: 17px;
}
/* 날짜 컨트롤 버튼 */
.room-date-control button {
  white-space: nowrap;
  flex: 0 0 auto;
}
/* 지점 필터 select */
.room-site-select {
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  padding: 0 10px;
  font: inherit;
  font-weight: 400;
  color: var(--foreground);
}
.room-name-spacer {
  display: grid;
  align-items: center;
  padding-left: 15px;
  font-weight: 600;
}
/* 내가 예약한 회의 */
.card-head-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}
/* 종료된 회의 상세 모달 버튼 */
.modal-actions .primary-button:disabled,
.modal-actions .danger-button:disabled {
  background: var(--muted);
  color: var(--muted-foreground);
  cursor: not-allowed;
}

.reservation-summary {
  align-content: start;
}
/* 두 요약 카드 헤더 높이 통일  */
.reservation-summary .card-head {
  min-height: 56px;
  flex-wrap: nowrap;
}
.reservation-summary .card-head h2 {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.reservation-summary .card-head .card-head-link {
  flex: 0 0 auto;
}
/* 카드 안 회의 항목 높이 통일 */
.reservation-summary button {
  min-height: 56px;
  align-content: center;
}
.reservation-summary button strong,
.reservation-summary button span {
  display: block;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
