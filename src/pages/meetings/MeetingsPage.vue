<template>
  <section class="page meetings-page">
    <header class="page-header rooms-header">
      <div><h1>회의</h1><p>내가 주최하거나 초대된 회의를 확인하고 새 회의를 생성합니다.</p></div>
      <ActionButton variant="primary" @click="openCreate">내 회의 생성</ActionButton>
    </header>

    <div class="card meetings-filter-card">
      <div class="toolbar">
        <button v-for="item in tabs" :key="item.key" class="chip" :class="{ active: tab === item.key }" @click="changeTab(item.key)">{{ item.label }}</button>
      </div>
      <div class="meeting-filter-controls">
        <AppSelect v-model="range" class="meeting-filter-select"><option value="all">전체 기간</option><option value="3m">최근 3개월</option><option value="6m">최근 6개월</option></AppSelect>
        <AppSelect v-model="sort" class="meeting-filter-select"><option value="latest">최신순</option><option value="oldest">오래된순</option></AppSelect>
        <span class="meeting-filter-count">총 {{ filtered.length }}건</span>
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
          <!-- 상세 모달과 동일한 시점×역할 매트릭스. 좁은 행이라 안내문 대신 비활성 입장 버튼+툴팁으로 처리. -->
          <!-- 종료: 회의록 보기만 -->
          <button v-if="meeting.status === 'ended'" class="primary-button small" @click.stop="enterMeeting(meeting)">회의록 보기</button>
          <!-- 취소됨 -->
          <span v-else-if="meeting.status === 'cancelled'" class="cancelled-note">취소된 회의</span>
          <template v-else>
            <!-- 수정: 주최자 & 예정 -->
            <button v-if="canEdit(meeting)" class="secondary-button small" @click.stop="openEdit(meeting)">수정</button>
            <!-- 취소: 주최자 & 예정 & 15분 이상 남음 -->
            <button
              v-if="canCancelMeeting(meeting)"
              class="secondary-button small cancel-button"
              type="button"
              :disabled="cancelling"
              @click.stop="requestCancelMeeting(meeting)"
            >{{ cancelling ? '취소 중' : '취소' }}</button>
            <!-- 입장(활성): 진행중 또는 예정 & 15분 이내 -->
            <button v-if="meetingJoinAllowed(meeting)" class="primary-button small" @click.stop="enterMeeting(meeting)">입장</button>
            <!-- 입장 대기(비활성): 참석자 & 예정 & 15분 이상 남음(툴팁으로 안내) -->
            <button
              v-else-if="meeting.role !== 'host' && meetingFarUpcoming(meeting)"
              class="primary-button small"
              type="button"
              disabled
              title="아직 입장 시간이 아닙니다"
            >입장</button>
          </template>
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
        <!-- 종료: 수정/입장/취소 숨김, '회의록 보기'만 -->
        <template v-if="detailStatus === 'ended'">
          <button class="primary-button" type="button" @click="enterFromDetail">회의록 보기</button>
        </template>
        <!-- 취소된 회의 -->
        <template v-else-if="detailStatus === 'cancelled'">
          <span class="cancelled-note">취소된 회의입니다</span>
        </template>
        <template v-else>
          <!-- 수정: 주최자 & 예정(진행중·종료엔 없음) -->
          <button v-if="detailIsHost && detailStatus === 'upcoming'" class="secondary-button" type="button" @click="editFromDetail">수정</button>
          <!-- 취소: 주최자 & 예정 & 시작 15분 이상 남음(임박 취소 방지) -->
          <button
            v-if="detailIsHost && detailFarUpcoming"
            class="secondary-button cancel-button"
            type="button"
            :disabled="cancelling"
            @click="requestCancelMeeting(detailMeeting)"
          >{{ cancelling ? '취소 중...' : '회의 취소하기' }}</button>
          <!-- 입장(활성): 진행중 또는 예정 & 시작 15분 이내 -->
          <button v-if="detailJoinAllowed" class="primary-button" type="button" @click="enterFromDetail">입장</button>
          <!-- 입장 대기(비활성)+안내: 참석자 & 예정 & 15분 이상 남음 -->
          <template v-else-if="!detailIsHost && detailFarUpcoming">
            <button class="primary-button" type="button" disabled>입장</button>
            <span class="join-wait-note">아직 입장 시간이 아닙니다</span>
          </template>
        </template>
      </div>
    </ModalShell>
    <ConfirmDialog v-if="confirmDialog" v-bind="confirmDialog" @cancel="cancelConfirm" @confirm="acceptConfirm" />
  </section>
</template>

<script setup>

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ActionButton from '../../components/common/ActionButton.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import { useRoute, useRouter } from 'vue-router'
import Pagination from '../../components/common/Pagination.vue'
import ModalShell from '../../components/common/ModalShell.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import ReservationModal from '../../components/rooms/ReservationModal.vue'
  
import { getMeetingJoinBlockedMessage, openMeetingWindow } from '../../lib/meeting-route'
import { cancelMeeting, getMeeting, getMeetings, getRooms } from '../../lib/reservations'
import { useAuthStore } from '../../stores/auth'
import { useUserNames } from '../../composables/useUserNames'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import { utcToKstClock, utcToKstDate } from '../../utils/dateTime'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const myUserId = computed(() => auth.user?.userId || '')
const { nameMap, resolveNames } = useUserNames()
const { confirmDialog, requestConfirm, cancelConfirm, acceptConfirm } = useConfirmDialog()

const statusLabel = { live: '진행 중', upcoming: '예정', ended: '종료', cancelled: '취소됨' }

// 상태 배지 색상. 진행중=빨강, 예정=파랑, 종료/취소=회색(라벨로 구분).
function statusTone(status) {
  if (status === 'live') return 'danger'
  if (status === 'upcoming') return 'primary'
  return 'muted' // ended, cancelled
}
// 시점×역할 버튼 매트릭스 판정(목록 행·상세 모달 공용). 같은 함수를 양쪽에서 재사용한다(중복 구현 없음).
// 입장 차단(시작 15분 전 규칙)은 getMeetingJoinBlockedMessage로 본다 — 비어있으면 입장 가능 시점이다.
function meetingFarUpcoming(meeting) {
  // 예정 + 시작 15분 이상 남음(아직 입장 불가). 주최자 취소 가능/참석자 입장 대기 시점.
  return meeting?.status === 'upcoming' && Boolean(getMeetingJoinBlockedMessage(meeting.scheduledAt))
}
function meetingJoinAllowed(meeting) {
  // 활성 입장 가능: 진행중, 또는 예정 & 시작 15분 이내.
  if (meeting?.status === 'live') return true
  return meeting?.status === 'upcoming' && !getMeetingJoinBlockedMessage(meeting.scheduledAt)
}
// 수정 가능: 주최자 + 예정(upcoming)만. 진행중·종료·취소는 수정 불가.
function canEdit(meeting) {
  return meeting?.role === 'host' && meeting.status === 'upcoming'
}
// 취소 가능: 주최자 + 예정 & 시작 15분 이상 남음(임박·진행중·종료는 불가).
function canCancelMeeting(meeting) {
  return meeting?.role === 'host' && meetingFarUpcoming(meeting)
}
const tabs = [{ key: 'all', label: '전체' }, { key: 'host', label: '내가 주최한 회의' }, { key: 'attendee', label: '초대된 회의' }, { key: 'active', label: '예정·진행중' }]

// 다른 화면(대시보드 등)에서 ?tab= 으로 진입하면 해당 탭으로 시작한다(all/host/attendee/active).
const tab = ref(['all', 'host', 'attendee', 'active'].includes(route.query.tab) ? route.query.tab : 'all')
const range = ref('all')
// 기본 정렬: 최신순(scheduledAt 내림차순) — 최근/다가오는 회의가 위로.
const sort = ref('latest')
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

// 상세 모달 버튼 매트릭스용. 목록 행과 동일한 판정 함수(meetingJoinAllowed/meetingFarUpcoming)를 재사용한다.
const detailIsHost = computed(() => detailMeeting.value?.role === 'host')
const detailStatus = computed(() => detailMeeting.value?.status || '')
const detailJoinAllowed = computed(() => meetingJoinAllowed(detailMeeting.value))
const detailFarUpcoming = computed(() => meetingFarUpcoming(detailMeeting.value))

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
  await Promise.all([loadRooms(), loadMeetings()])
  openMeetingFromQuery()
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

watch(sort, () => {
  pageNo.value = 1
})

watch(totalPages, (nextTotalPages) => {
  if (pageNo.value > nextTotalPages) {
    pageNo.value = nextTotalPages
  }
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

async function openMeetingDetail(meeting) {
  detailMeeting.value = meeting
  detailFull.value = null
  detailError.value = ''
  try {
    const full = await getMeeting(meeting.meetingId)
    detailFull.value = full
    resolveNames([full.hostUserId, ...(full.attendees || []).map((attendee) => attendee.userId)])
  } catch (error) {
    detailError.value = error?.message || '회의 상세 정보를 불러오지 못했습니다.'
  }
}

function closeMeetingDetail() {
  detailMeeting.value = null
  detailFull.value = null
  detailError.value = ''
  cancelling.value = false
}

async function editFromDetail() {
  if (!detailMeeting.value) return
  const meeting = detailMeeting.value
  closeMeetingDetail()
  await nextTick()
  openEdit(meeting)
}

function enterFromDetail() {
  if (!detailMeeting.value) return
  enterMeeting(detailMeeting.value)
}

async function requestCancelMeeting(meeting) {
  const target = meeting || detailMeeting.value
  if (!target || cancelling.value || !canCancelMeeting(target)) return
  if (!window.confirm(`'${target.title}' 회의를 취소하시겠습니까?`)) return

  cancelling.value = true
  detailError.value = ''
  try {
    await cancelMeeting(target.meetingId)
    closeMeetingDetail()
    await loadMeetings()
  } catch (error) {
    detailError.value = error?.message || '회의 취소에 실패했습니다.'
  } finally {
    cancelling.value = false
  }
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
  if (meeting.status === 'ended') {
    router.push(`/app/minutes/${meeting.id}`)
    return
  }

  const blockedMessage = getMeetingJoinBlockedMessage(meeting.scheduledAt)
  if (blockedMessage) {
    window.alert(blockedMessage)
    return
  }
  // 진행중/예정: 회의방 팝업. 시작 15분 전 이전이면 openMeetingWindow가 안내 후 막는다(중복 판정 제거).
  openMeetingWindow(meeting.id, { scheduledAt: meeting.scheduledAt, title: meeting.title })
}

function handleWindowFocus() {
  void loadMeetings()
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  void loadMeetings()
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
.meeting-filter-count {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}
/* 입장 대기(참석자, 시작 15분 이상 남음): 비활성 입장 버튼 + 안내 문구. */
.modal-actions .primary-button:disabled,
.row-actions .primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.join-wait-note {
  align-self: center;
  color: var(--muted-foreground);
  font-size: 13px;
}
/* 행 버튼 영역: 좁은 행에서 버튼이 줄바꿈/넘침 없이 한 줄로. */
.row-actions {
  display: flex;
  flex-wrap: nowrap;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
}
</style>
