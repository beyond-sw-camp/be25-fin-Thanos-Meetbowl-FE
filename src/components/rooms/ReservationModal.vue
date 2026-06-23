<template>
  <ModalShell :modal-class="['room-modal', { 'has-timeline': roomTimelineVisible, compact: !roomTimelineVisible }]" @close="$emit('close')">
    <template #overlay>
      <div v-if="actionError" class="reservation-warning-overlay">{{ actionError }}</div>
    </template>
    <header>
      <div><h2>{{ isEdit ? '회의 수정' : '새 회의 예약' }}</h2></div>
      <button class="modal-close" type="button" aria-label="닫기" @click="$emit('close')">×</button>
    </header>
    <div class="room-modal-grid">
      <ReservationForm
        :form="form"
        :rooms="rooms"
        :my-user-id="myUserId"
        :host-user-id="myUserId"
        :room-usage-enabled="roomUsageEnabled"
        :allow-remote="allowRemote"
        @submit="save"
        @enable-room-usage="enableRoomUsage"
        @disable-room-usage="disableRoomUsage"
      >
        <template #actions>
          <div class="modal-actions">
            <button type="button" class="secondary-button" @click="$emit('close')">취소</button>
            <button class="primary-button" :disabled="saving || loading">{{ submitLabel }}</button>
          </div>
        </template>
      </ReservationForm>

      <ReservationTimeline
        v-if="roomTimelineVisible"
        :rooms="rooms"
        :blocks-by-room="blocksByRoom"
        :name-map="nameMap"
        :range="timelineRange"
        :selected-room-id="form.roomId"
        :preview-block="timelinePreviewBlock"
        @select-room="selectRoom"
        @select-range="applyTimelineRange"
      />
    </div>
  </ModalShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ModalShell from '../common/ModalShell.vue'
import ReservationForm from './ReservationForm.vue'
import ReservationTimeline from './ReservationTimeline.vue'
import { useAuthStore } from '../../stores/auth'
import { createMeeting, getMeeting, getRoomReservations, updateMeeting } from '../../lib/reservations'
import { useUserNames } from '../../composables/useUserNames'
import { addMinutes, kstDayRangeUtc, kstToUtcIso, shiftDateKst, todayKst, utcToKstClock, utcToKstDate } from '../../utils/dateTime'

const props = defineProps({
  rooms: { type: Array, default: () => [] },
  initialRoomId: { type: String, default: '' },
  initialDate: { type: String, default: '' },
  initialStart: { type: String, default: '09:00' },
  // 드래그로 종료시간까지 prefill할 때 사용(없으면 시작+60분).
  initialEnd: { type: String, default: '' },
  // 'create'(신규 예약) | 'edit'(기존 회의 수정)
  mode: { type: String, default: 'create' },
  // 수정 대상 회의(meetingId 필수). mode='edit'일 때만 사용.
  meeting: { type: Object, default: null },
  // 원격(회의실 없음) 토글 노출 여부. 회의 페이지에서만 true, 회의실 예약에서는 false.
  allowRemote: { type: Boolean, default: false },
  // 생성(create) 시 원격 기본값. 원격 전용 회의 페이지에서 true로 열면 기본 원격으로 시작한다.
  initialRemote: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'saved'])

const auth = useAuthStore()
const myUserId = computed(() => auth.user?.userId || '')
const hostAttendee = computed(() => {
  if (!auth.user?.userId) return null
  return {
    userId: auth.user.userId,
    name: auth.user.name || '나',
  }
})
const { nameMap, resolveNames } = useUserNames()

const isEdit = computed(() => props.mode === 'edit')
const roomUsageEnabled = ref(!props.allowRemote || Boolean(props.initialRoomId) || Boolean(props.meeting?.meetingRoomId))
const saving = ref(false)
const loading = ref(false)
const actionError = ref('')
const blocksByRoom = ref({})
let errorOverlayTimerId = null

const submitLabel = computed(() => {
  if (saving.value) return isEdit.value ? '수정 중...' : '예약 중...'
  return isEdit.value ? '회의 수정하기' : '회의 예약하기'
})
const timelineRange = computed(() => ({
  start: form.value.start,
  end:
    form.value.endDate > form.value.date && form.value.end === '00:00'
      ? '24:00'
      : form.value.end,
}))
const timelinePreviewBlock = computed(() => {
  if (!roomUsageEnabled.value || !form.value.roomId || !timelineRange.value.start || !timelineRange.value.end) return null
  return {
    label: form.value.title.trim() || '내 예약',
    start: timelineRange.value.start,
    end: timelineRange.value.end,
  }
})
const roomTimelineVisible = computed(() => !props.allowRemote || roomUsageEnabled.value)

const initialDate = props.initialDate || todayKst()
const normalizedInitialEnd = props.initialEnd === '24:00' ? '00:00' : props.initialEnd
const normalizedInitialEndDate =
  props.initialEnd === '24:00' ? shiftDateKst(initialDate, 1) : initialDate
const form = ref({
  title: '',
  // 회의실 선택값이 곧 meetingRoomId(미선택 ''=원격). 원격 토글은 roomId로부터 파생된다(별도 상태 없음).
  // initialRemote면 기본 미선택('')으로 시작(회의 모달). 회의실 예약은 첫 회의실을 기본 선택.
  roomId: props.initialRoomId || (props.initialRemote ? '' : props.rooms[0]?.roomId || ''),
  date: initialDate,
  endDate: normalizedInitialEndDate,
  start: props.initialStart,
  end: normalizedInitialEnd || addMinutes(props.initialStart, 60),
  attendees: hostAttendee.value ? [hostAttendee.value] : [],
  reviewerUserId: '',
  content: '',
})

onMounted(async () => {
  if (isEdit.value && props.meeting) await prefillFromMeeting()
  if (!props.allowRemote) roomUsageEnabled.value = true
  if (props.allowRemote && props.initialRemote) roomUsageEnabled.value = false
  await loadDay()
})

// 수정 모드: 상세 조회로 기존 값(회의실·참석자·검토자·내용 포함)을 폼에 채운다.
// 목록 응답엔 description·attendees가 없어 GET /meetings/{id}가 필요하다.
async function prefillFromMeeting() {
  loading.value = true
  try {
    const full = await getMeeting(props.meeting.meetingId)
    const participants = (full.attendees || []).filter(
      (attendee) => attendee.role !== 'HOST' || attendee.userId === myUserId.value,
    )
    await resolveNames(participants.map((attendee) => attendee.userId))
    form.value = {
      title: full.title || '',
      // 회의실 선택값으로 복원(없으면 ''=원격). 토글은 roomId에서 파생되므로 별도 복원 불필요.
      roomId: full.meetingRoomId || '',
      date: utcToKstDate(full.scheduledAt),
      endDate: utcToKstDate(full.scheduledEndAt),
      start: utcToKstClock(full.scheduledAt),
      end: utcToKstClock(full.scheduledEndAt),
      attendees: normalizeAttendees(
        participants.map((attendee) => ({
          userId: attendee.userId,
          name:
            attendee.userId === myUserId.value
              ? auth.user?.name || '나'
              : nameMap[attendee.userId] || '이름 미확인',
        })),
      ),
      reviewerUserId: full.attendees?.find((attendee) => attendee.reviewer)?.userId || '',
      content: full.description || '',
    }
  } catch (error) {
    actionError.value = error?.message || '회의 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

// 시작 날짜를 바꾸면 그날 예약 현황만 다시 불러온다(시간 변경은 재조회 없이 computed로 처리).
watch(() => form.value.date, loadDay)

watch(
  hostAttendee,
  (host) => {
    if (!host) return
    form.value.attendees = normalizeAttendees(form.value.attendees)
  },
  { immediate: true },
)

watch(actionError, (message) => {
  if (errorOverlayTimerId) {
    window.clearTimeout(errorOverlayTimerId)
    errorOverlayTimerId = null
  }
  if (!message) return
  errorOverlayTimerId = window.setTimeout(() => {
    actionError.value = ''
    errorOverlayTimerId = null
  }, 3000)
})

// 참석자에서 빠진 사용자가 검토자였다면 검토자 선택을 비운다.
watch(
  () => form.value.attendees,
  (attendees) => {
    if (form.value.reviewerUserId && !attendees.some((a) => a.userId === form.value.reviewerUserId)) {
      form.value.reviewerUserId = ''
      return
    }
    if (form.value.reviewerUserId && form.value.reviewerUserId === myUserId.value) {
      form.value.reviewerUserId = ''
    }
  },
  { deep: true },
)

async function loadDay() {
  const { from, to } = kstDayRangeUtc(form.value.date)
  try {
    const data = await getRoomReservations({ from, to })
    const map = {}
    const hosts = []
    for (const room of data || []) {
      map[room.roomId] = (room.reservations || [])
        // 수정 중인 회의 자신은 충돌 미리보기에서 제외한다(자기 자신과의 겹침 표시 방지).
        .filter((reservation) => reservation.meetingId !== props.meeting?.meetingId)
        .map((reservation) => {
        hosts.push(reservation.hostUserId)
        return {
          meetingId: reservation.meetingId,
          title: reservation.title,
          start: utcToKstClock(reservation.scheduledAt),
          end: utcToKstClock(reservation.scheduledEndAt),
          hostUserId: reservation.hostUserId,
          mine: reservation.hostUserId === myUserId.value,
        }
      })
    }
    blocksByRoom.value = map
    resolveNames(hosts)
  } catch (error) {
    actionError.value = error?.message || '예약 현황을 불러오지 못했습니다.'
  }
}

// 타임라인에서 회의실을 고르면 그 회의실로 지정한다(원격 토글은 roomId에서 파생).
function selectRoom(roomId) {
  form.value.roomId = roomId
  if (roomId) roomUsageEnabled.value = true
}

function applyTimelineRange(roomId, start, end) {
  form.value.roomId = roomId
  if (roomId) roomUsageEnabled.value = true
  form.value.start = start
  if (end === '24:00') {
    form.value.endDate = shiftDateKst(form.value.date, 1)
    form.value.end = '00:00'
    return
  }
  form.value.endDate = form.value.date
  form.value.end = end
}

function enableRoomUsage() {
  roomUsageEnabled.value = true
}

function disableRoomUsage() {
  roomUsageEnabled.value = false
  form.value.roomId = ''
}

function normalizeAttendees(attendees = []) {
  const normalized = []
  const seen = new Set()
  if (hostAttendee.value?.userId) {
    normalized.push(hostAttendee.value)
    seen.add(hostAttendee.value.userId)
  }
  for (const attendee of attendees) {
    if (!attendee?.userId || seen.has(attendee.userId)) continue
    normalized.push({
      userId: attendee.userId,
      name: attendee.name || nameMap[attendee.userId] || '이름 미확인',
    })
    seen.add(attendee.userId)
  }
  return normalized
}

async function save() {
  if (saving.value) return
  actionError.value = ''

  const title = form.value.title.trim()
  if (!title) {
    actionError.value = '회의 제목을 입력해 주세요.'
    return
  }
  // 회의실 예약(allowRemote=false)은 회의실 필수. 회의 모달(allowRemote)은 미선택=원격을 허용.
  if (!props.allowRemote && !form.value.roomId) {
    actionError.value = '회의실을 선택해 주세요.'
    return
  }
  if (!form.value.attendees.length) {
    actionError.value = '참석자를 최소 1명 선택해 주세요.'
    return
  }
  if (!form.value.reviewerUserId) {
    actionError.value = '회의록 검토자를 선택해 주세요.'
    return
  }

  const scheduledAt = kstToUtcIso(form.value.date, form.value.start)
  const scheduledEndAt = kstToUtcIso(form.value.endDate, form.value.end)
  if (new Date(scheduledEndAt) <= new Date(scheduledAt)) {
    actionError.value = '종료 시각은 시작 시각보다 뒤여야 합니다.'
    return
  }

  const payload = {
    title,
    scheduledAt,
    scheduledEndAt,
    meetingRoomId: form.value.roomId || null,
    attendeeUserIds: form.value.attendees.map((attendee) => attendee.userId),
    reviewerUserId: form.value.reviewerUserId,
    description: form.value.content.trim() || null,
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await updateMeeting(props.meeting.meetingId, payload)
    } else {
      await createMeeting(payload)
    }
    emit('saved')
  } catch (error) {
    // 서버 거부 메시지를 그대로 노출한다.
    // 409 MEETING_ROOM_ALREADY_RESERVED(시간 겹침), MEETING_ROOM_UNAVAILABLE(사용제한 회의실) 등.
    actionError.value = error?.message || (isEdit.value ? '회의 수정에 실패했습니다.' : '예약에 실패했습니다.')
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  if (errorOverlayTimerId) {
    window.clearTimeout(errorOverlayTimerId)
    errorOverlayTimerId = null
  }
})
</script>

<style scoped>
.modal-close {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
.modal-close:hover {
  background: var(--muted);
  color: var(--foreground);
}
.reservation-warning-overlay {
  position: absolute;
  left: 50%;
  top: calc(50% - 360px);
  z-index: 2;
  width: min(860px, calc(100vw - 64px));
  transform: translateX(-50%);
  border: 1px solid #fdba74;
  border-radius: 10px;
  background: #fff7ed;
  color: #c2410c;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 12px 28px rgba(194, 65, 12, 0.16);
  pointer-events: none;
}
</style>
