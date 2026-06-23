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
      <article v-for="meeting in paged" :key="meeting.id" class="meeting-row meeting-row-clickable" :class="{ 'meeting-row-cancelled': meeting.status === 'cancelled' }" @click="openMeetingDetail(meeting)">
        <div class="meeting-row-main">
          <div class="meeting-title-row">
            <h2>{{ meeting.title }}</h2>
            <span :class="['badge', statusTone(meeting.status)]">{{ statusLabel[meeting.status] }}</span>
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
          <button v-if="canCancel(meeting)" class="secondary-button small" @click.stop="openEdit(meeting)">수정</button>
          <button v-if="meeting.status !== 'cancelled'" class="primary-button small" @click.stop="enterMeeting(meeting)">{{ meeting.status === 'ended' ? '내 회의록 보기' : '입장' }}</button>
          <span v-else class="cancelled-note">취소된 회의</span>
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
      @close="closeModal"
      @saved="onSaved"
    />

    <ModalShell v-if="detailMeeting" modal-class="detail-modal" @close="closeMeetingDetail">
      <header>
        <div class="meeting-title-row">
          <h2>{{ detailMeeting.title }}</h2>
          <span :class="['badge', statusTone(detailMeeting.status)]">{{ statusLabel[detailMeeting.status] }}</span>
          <span :class="['badge', detailMeeting.role === 'host' ? 'success' : 'navy']">{{ detailMeeting.role === 'host' ? '주최자' : '참석자' }}</span>
        </div>
        <button class="modal-close" type="button" aria-label="닫기" @click="closeMeetingDetail">×</button>
      </header>
      <div class="detail-body">
        <dl class="detail-list">
          <div><dt>일시</dt><dd>{{ detailMeeting.startLabel }} - {{ detailMeeting.endLabel }}</dd></div>
          <div><dt>회의실</dt><dd>{{ detailMeeting.room }}</dd></div>
          <div><dt>주최자</dt><dd>{{ detailHostName }}</dd></div>
          <div>
            <dt>참석자</dt>
            <dd v-if="detailFull && detailAttendeeNames.length" class="detail-chip-group">
              <span v-for="(name, index) in detailAttendeeNames" :key="index" class="detail-chip">{{ name }}</span>
            </dd>
            <dd v-else>-</dd>
          </div>
          <div><dt>검토자</dt><dd>{{ detailMeeting.reviewer || '-' }}</dd></div>
          <div v-if="detailFull && detailFull.description"><dt>회의 내용</dt><dd>{{ detailFull.description }}</dd></div>
        </dl>
        <p v-if="detailError" class="detail-note">{{ detailError }}</p>
      </div>
      <div class="modal-actions">
        <button
          v-if="canCancel(detailMeeting)"
          class="secondary-button cancel-button"
          type="button"
          :disabled="cancelling"
          @click="cancelFromDetail"
        >{{ cancelling ? '취소 중...' : '회의 취소하기' }}</button>
        <button v-if="canCancel(detailMeeting)" class="secondary-button" type="button" @click="editFromDetail">수정</button>
        <button v-if="detailMeeting.status !== 'cancelled'" class="primary-button" type="button" @click="enterFromDetail">{{ detailMeeting.status === 'ended' ? '내 회의록 보기' : '입장' }}</button>
        <span v-else class="cancelled-note">취소된 회의입니다</span>
      </div>
    </ModalShell>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Pagination from '../../components/common/Pagination.vue'
import ModalShell from '../../components/common/ModalShell.vue'
import ReservationModal from '../../components/rooms/ReservationModal.vue'
import { openMeetingWindow } from '../../lib/meeting-route'
import { cancelMeeting, getMeeting, getMeetings, getRooms } from '../../lib/reservations'
import { useAuthStore } from '../../stores/auth'
import { useUserNames } from '../../composables/useUserNames'
import { utcToKstClock, utcToKstDate } from '../../utils/dateTime'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const myUserId = computed(() => auth.user?.userId || '')
const { nameMap, resolveNames } = useUserNames()

const statusLabel = { live: '진행 중', upcoming: '예정', ended: '종료', cancelled: '취소됨' }

// 상태 배지 색상. 진행중=빨강, 예정=파랑, 종료/취소=회색(라벨로 구분).
function statusTone(status) {
  if (status === 'live') return 'danger'
  if (status === 'upcoming') return 'primary'
  return 'muted' // ended, cancelled
}
// 취소 가능: 주최자 + 예정/진행중(종료·취소는 백엔드도 409로 거부).
function canCancel(meeting) {
  return meeting?.role === 'host' && (meeting.status === 'upcoming' || meeting.status === 'live')
}
const tabs = [{ key: 'all', label: '전체' }, { key: 'host', label: '내가 주최한 회의' }, { key: 'attendee', label: '초대된 회의' }, { key: 'active', label: '예정·진행중' }]

// 다른 화면(대시보드 등)에서 ?tab= 으로 진입하면 해당 탭으로 시작한다(all/host/attendee/active).
const tab = ref(['all', 'host', 'attendee', 'active'].includes(route.query.tab) ? route.query.tab : 'all')
const range = ref('all')
// 기본 정렬: 가까운 날짜순(scheduledAt 오름차순) — 다가오는 회의가 위로.
const sort = ref('oldest')
const pageNo = ref(1)
const pageSize = 10

const rooms = ref([])
const rawMeetings = ref([])
const loading = ref(false)
const loadError = ref('')

const modal = ref(false)
const modalMode = ref('create')
const editingMeeting = ref(null)

// 회의 상세 모달: 목록 행 클릭 시 GET /meetings/{id}로 전체 정보(참석자 전원·내용)를 받아 표시한다.
const detailMeeting = ref(null) // 클릭한 목록 항목(라벨/상태/역할 등 표시값 포함)
const detailFull = ref(null) // getMeeting 응답(attendees 전원·description)
const detailError = ref('')
const cancelling = ref(false)

const detailHostName = computed(() => nameMap[detailFull.value?.hostUserId] || '-')
const detailAttendeeNames = computed(() =>
  (detailFull.value?.attendees || []).map((attendee) => nameMap[attendee.userId] || '이름 미확인'),
)

// 프론트 탭키 → 백엔드 role 파라미터. attendee→invited.
// 상태 탭(active)은 역할 무관이라 전체(all)에서 받아 클라이언트에서 예정·진행중만 필터한다.
const roleParam = computed(() => {
  if (tab.value === 'attendee') return 'invited'
  if (tab.value === 'active') return 'all'
  return tab.value
})

const roomNameMap = computed(() => {
  const map = {}
  for (const room of rooms.value) map[room.roomId] = room.name
  return map
})

// 참석자는 응답의 attendees(userId/role)로 오고, userId→이름은 클라이언트에서 배치 변환한다(useUserNames).
// 회의실명은 응답에 없어 getRooms→roomNameMap으로 매핑한다.
const mapped = computed(() =>
  rawMeetings.value
    // 회의실 점유/원격 구분 없이 내가 참여하는 모든 회의를 표시한다(취소된 회의도 '취소됨'으로 노출).
    .map((meeting) => {
      const role = meeting.hostUserId === myUserId.value ? 'host' : 'attendee'
      const status =
        meeting.status === 'IN_PROGRESS'
          ? 'live'
          : meeting.status === 'ENDED'
            ? 'ended'
            : meeting.status === 'CANCELLED'
              ? 'cancelled'
              : 'upcoming'
      // 참석자 = 선택한 전원(주최자 본인 포함). 주최자는 HOST 1행으로 저장되므로 그대로 노출한다.
      // 검토자는 신분(role)과 무관한 reviewer 플래그로 식별한다(주최자가 검토자일 수도 있음).
      const participants = meeting.attendees || []
      const reviewer = (meeting.attendees || []).find((attendee) => attendee.reviewer)
      return {
        id: meeting.meetingId,
        meetingId: meeting.meetingId,
        title: meeting.title,
        role,
        status,
        scheduledAtMs: new Date(meeting.scheduledAt).getTime(),
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
  let list = [...mapped.value]
  // '예정·진행중' 탭: 예정(upcoming)·진행중(live)만 보여주고 종료/취소는 제외한다.
  if (tab.value === 'active') {
    list = list.filter((meeting) => meeting.status === 'upcoming' || meeting.status === 'live')
  }
  list.sort((a, b) => (sort.value === 'latest' ? b.scheduledAtMs - a.scheduledAtMs : a.scheduledAtMs - b.scheduledAtMs))
  return list
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => filtered.value.slice((pageNo.value - 1) * pageSize, pageNo.value * pageSize))

// 워크스페이스 달력에서 editMeetingId/from=workspace로 진입한 경우, 닫을 때 워크스페이스로 되돌린다.
const shouldReturnWorkspace = computed(() => route.query.from === 'workspace' || Boolean(route.query.editMeetingId))

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

onMounted(async () => {
  loadRooms()
  await loadMeetings()
  openMeetingFromQuery()
})

// 탭(역할)·기간이 바뀌면 서버에서 다시 조회한다.
watch([tab, range], () => {
  pageNo.value = 1
  loadMeetings()
})

// 워크스페이스에서 회의 수정으로 직접 진입하는 쿼리 변화를 감시한다.
watch(() => route.query.editMeetingId, openMeetingFromQuery)

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

// 워크스페이스 달력에서 넘어온 editMeetingId를 찾아 수정 모달을 연다(내가 주최한 종료 전 회의만).
function openMeetingFromQuery() {
  const editMeetingId = route.query.editMeetingId
  if (!editMeetingId) return
  if (route.query.tab === 'host') tab.value = 'host'
  const meeting = filtered.value.find((item) => item.id === editMeetingId && item.role === 'host' && item.status !== 'ended')
  if (meeting) openEdit(meeting)
}

function closeModal() {
  modal.value = false
  if (shouldReturnWorkspace.value) router.push('/app/workspace')
}

async function onSaved() {
  modal.value = false
  await loadMeetings()
  if (shouldReturnWorkspace.value) router.push('/app/workspace')
}

function enterMeeting(meeting) {
  // 취소된 회의는 입장/회의록 대상이 아니다(버튼도 숨기지만 방어적으로 막는다).
  if (meeting.status === 'cancelled') return
  // 종료 회의: 회의록 보기. 회의록 팀의 meetingId 라우트 확정 전까지 기존 임시 연결 유지.
  // TODO(회의록 팀 라우트 확정 시): meetingId 전달해 해당 회의 회의록으로 이동.
  if (meeting.status === 'ended') router.push('/app/minutes')
  else openMeetingWindow(meeting.id, { scheduledAt: meeting.scheduledAtMs })
}

async function openMeetingDetail(meeting) {
  detailMeeting.value = meeting
  detailFull.value = null
  detailError.value = ''
  try {
    const full = await getMeeting(meeting.meetingId)
    detailFull.value = full
    resolveNames([full.hostUserId, ...(full.attendees || []).map((attendee) => attendee.userId)])
  } catch (error) {
    detailError.value = error?.message || '회의 상세를 불러오지 못했습니다.'
  }
}

function closeMeetingDetail() {
  detailMeeting.value = null
  detailFull.value = null
  detailError.value = ''
}

// 상세 모달에서 '수정'/'입장' — 모달을 닫고 기존 흐름을 재사용한다.
function editFromDetail() {
  const meeting = detailMeeting.value
  closeMeetingDetail()
  openEdit(meeting)
}

function enterFromDetail() {
  const meeting = detailMeeting.value
  closeMeetingDetail()
  enterMeeting(meeting)
}

// 상세 모달에서 '회의 취소하기' — 주최자만. 성공 시 목록을 갱신하고, 모달은 갱신된
// '취소됨' 항목으로 교체해 그대로 열어둔다(배지·버튼 비활성이 즉시 반영된다).
async function cancelFromDetail() {
  const meeting = detailMeeting.value
  if (!meeting || cancelling.value || !canCancel(meeting)) return
  if (!window.confirm(`'${meeting.title}' 회의를 취소하시겠습니까? 참석자에게도 취소됩니다.`)) return

  cancelling.value = true
  detailError.value = ''
  try {
    await cancelMeeting(meeting.meetingId)
    await loadMeetings()
    // 갱신된 목록에서 같은 회의를 찾아 모달 상태를 교체(없으면 모달 닫기).
    const updated = filtered.value.find((item) => item.meetingId === meeting.meetingId)
    if (updated) detailMeeting.value = updated
    else closeMeetingDetail()
  } catch (error) {
    if (error?.status === 403) detailError.value = '회의 주최자만 취소할 수 있습니다.'
    else if (error?.status === 409) detailError.value = '이미 종료되었거나 취소된 회의입니다.'
    else detailError.value = error?.message || '회의 취소에 실패했습니다.'
  } finally {
    cancelling.value = false
  }
}
</script>

<style scoped>
/* 목록 행 전체를 클릭하면 상세 모달이 열린다(액션 버튼은 @click.stop). */
.meeting-row-clickable {
  cursor: pointer;
}
.meeting-row-clickable:hover {
  background: var(--muted);
}
/* 취소된 회의는 흐리게 표시(클릭으로 상세는 여전히 열림). */
.meeting-row-cancelled {
  opacity: 0.6;
}
.meeting-row-cancelled h2 {
  text-decoration: line-through;
}
.cancel-button {
  color: var(--danger);
  border-color: #fecaca;
}
.cancel-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cancelled-note {
  color: var(--muted-foreground);
  font-size: 13px;
  align-self: center;
}
</style>
