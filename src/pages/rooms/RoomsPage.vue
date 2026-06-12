<template>
  <section class="page rooms-page">
    <header class="page-header rooms-header">
      <div><h1>회의실 예약 현황</h1><p>회의실별 예약 시간을 확인하고 빈 시간대를 바로 예약합니다.</p></div>
      <button class="primary-button" @click="openReservation(filteredRooms[0]?.id || selectedRoom.id)">회의/회의실 예약</button>
    </header>

    <div class="reservation-summary-grid">
      <article class="card reservation-summary">
        <div class="card-head"><h2>내가 예약한 회의</h2><span>{{ myBooked.length }}건</span></div>
        <button v-for="item in myBooked" :key="item.id" @click="detail = item">
          <strong>{{ item.title }}</strong><span>{{ item.start }}-{{ item.end }} · {{ roomName(item.roomId) }}</span>
        </button>
        <p v-if="!myBooked.length">예약한 회의가 없습니다.</p>
      </article>
      <article class="card reservation-summary">
        <div class="card-head"><h2>내가 참석해야 하는 회의</h2><span>{{ myInvited.length }}건</span></div>
        <button v-for="item in myInvited" :key="item.id" @click="detail = item">
          <strong>{{ item.title }}</strong><span>{{ item.start }}-{{ item.end }} · {{ item.owner }}</span>
        </button>
        <p v-if="!myInvited.length">참석 예정 회의가 없습니다.</p>
      </article>
    </div>

    <div class="card rooms-toolbar">
      <div class="room-date-control">
        <input type="date" v-model="date">
        <button class="secondary-button" @click="date = todayDate">오늘</button>
      </div>
      <div class="toolbar">
        <button v-for="item in sites" :key="item" class="chip" :class="{ active: site === item }" @click="site = item">{{ item }}</button>
      </div>
      <div class="room-legend"><span><i class="mine"></i>내 예약</span><span><i></i>예약됨</span><span><i class="restricted"></i>사용 제한</span></div>
    </div>

    <div class="card room-timeline-card">
      <div class="room-timeline-scroll" :style="{ '--hour-px': roomHourPx + 'px' }">
        <div class="room-time-header">
          <div class="room-name-spacer"></div>
          <div class="room-hours"><span v-for="hour in roomHours" :key="hour">{{ String(hour).padStart(2, '0') }}:00</span></div>
        </div>
        <div v-for="room in filteredRooms" :key="room.id" class="room-row" :class="{ restricted: room.restricted }">
          <div class="room-row-meta">
            <strong>{{ room.name }}</strong>
            <small>{{ room.site }} · {{ room.floor }}층 · {{ room.capacity }}명</small>
            <em v-if="room.restricted">{{ room.restrictReason }}</em>
          </div>
          <div class="room-track" @click="!room.restricted && openReservation(room.id, slotTime($event))">
            <span v-for="hour in roomHours" :key="hour" class="hour-line"></span>
            <span class="now-marker" :style="nowMarkerStyle()"><em>현재</em></span>
            <button
              v-for="item in reservations.filter((res) => res.roomId === room.id && res.date === date)"
              :key="item.id"
              type="button"
              :class="['reservation-block', item.status]"
              :style="reservationStyle(item)"
              @click.stop="detail = item"
            >
              <strong>{{ item.title }}</strong><span>{{ item.start }}-{{ item.end }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <ModalShell v-if="modal" modal-class="room-modal" @close="modal = false">
      <header><div><h2>회의/회의실 예약</h2><p>참석자와 검토자를 지정하고 회의실 충돌 여부를 확인합니다.</p></div><button @click="modal = false">닫기</button></header>
      <div class="room-modal-grid">
        <form class="form-grid" @submit.prevent="saveReservation">
          <label>회의 제목<input v-model="form.title" required placeholder="회의 제목"></label>
          <label>회의실<select v-model="form.roomId"><option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option></select></label>
          <div class="form-row two"><label>시작일<input type="date" v-model="form.date"></label><label>종료일<input type="date" v-model="form.endDate"></label></div>
          <div class="form-row two"><label>시작 시간<input type="time" v-model="form.start"></label><label>종료 시간<input type="time" v-model="form.end"></label></div>
          <MemberPicker :members="members" :selected-names="form.attendees" exclude-name="이지연" label="참석자 검색" @select="addAttendee($event.name)" />
          <div class="participant-chips"><span v-for="name in form.attendees" :key="name">{{ name }}<button type="button" @click="removeAttendee(name)">×</button></span></div>
          <label>회의록 검토자<select v-model="form.reviewer"><option value="">선택 안 함</option><option v-for="name in form.attendees" :key="name" :value="name">{{ name }}</option></select></label>
          <label>회의 내용<textarea v-model="form.content" rows="4" placeholder="회의 목적과 안건"></textarea></label>
          <p v-if="selectedRoom?.restricted" class="warning-text">해당 회의실은 {{ selectedRoom.restrictReason }} 사유로 {{ selectedRoom.restrictUntil }}까지 사용 제한 중입니다.</p>
          <p v-else-if="conflict" class="warning-text">선택한 시간에 이미 예약이 있습니다. 다른 시간을 선택하세요.</p>
          <div class="modal-actions"><button type="button" class="secondary-button" @click="modal = false">취소</button><button class="primary-button" :disabled="conflict || selectedRoom?.restricted">예약 저장</button></div>
        </form>
        <RoomSchedulePanel :room="selectedRoom" :room-name="selectedRoom?.name || ''" :reservations="roomReservations" title="선택일 예약" />
      </div>
    </ModalShell>

    <ModalShell v-if="detail" modal-class="detail-modal" @close="detail = null">
      <header><div><h2>{{ detail.title }}</h2><p>{{ detail.start }}-{{ detail.end }} · {{ roomName(detail.roomId) }}</p></div><button @click="detail = null">닫기</button></header>
      <dl class="detail-list">
        <div><dt>예약자</dt><dd>{{ detail.owner }}</dd></div>
        <div><dt>상태</dt><dd>{{ statusLabel[detail.status] }}</dd></div>
        <div><dt>참석자</dt><dd>{{ detail.attendees.join(', ') || '-' }}</dd></div>
        <div><dt>검토자</dt><dd>{{ detail.reviewer || '-' }}</dd></div>
      </dl>
      <p v-if="detail.content">{{ detail.content }}</p>
      <div class="modal-actions"><button v-if="detail.status === 'mine'" class="danger-button" @click="cancelReservation(detail.id)">예약 취소</button><RouterLink :to="meetingRoute()" class="primary-button">회의 입장</RouterLink></div>
    </ModalShell>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import ModalShell from '../../components/common/ModalShell.vue'
import MemberPicker from '../../components/common/MemberPicker.vue'
import RoomSchedulePanel from '../../components/rooms/RoomSchedulePanel.vue'
import { members, rooms, todayReservations } from '../../data/mockData'
import { meetingRoute } from '../../lib/meeting-route'
import { addMinutes, minutesToTime, overlaps, timeToMinutes } from '../../utils/dateTime'

const statusLabel = { mine: '내 예약', booked: '예약됨' }
const todayDate = '2026-05-22'
const roomHours = Array.from({ length: 18 }, (_, index) => index + 6)
const roomHourPx = 70
const reservations = ref(todayReservations.map((item) => ({ date: todayDate, endDate: todayDate, reviewer: item.attendees[0] || '', content: '', ...item })))
const site = ref('전체')
const date = ref(todayDate)
const modal = ref(false)
const detail = ref(null)
const form = ref({ title: '', roomId: rooms[0]?.id || '', date: todayDate, endDate: todayDate, start: '09:00', end: '10:00', attendees: [], reviewer: '', content: '' })

const sites = ['전체', ...new Set(rooms.map((room) => room.site))]
const filteredRooms = computed(() => site.value === '전체' ? rooms : rooms.filter((room) => room.site === site.value))
const myBooked = computed(() => reservations.value.filter((item) => item.status === 'mine'))
const myInvited = computed(() => reservations.value.filter((item) => item.status !== 'mine' && item.attendees.includes('이지연')))
const selectedRoom = computed(() => rooms.find((room) => room.id === form.value.roomId) || rooms[0])
const roomReservations = computed(() => reservations.value.filter((item) => item.roomId === form.value.roomId && item.date === form.value.date))
const conflict = computed(() => reservations.value.some((item) => item.roomId === form.value.roomId && item.date === form.value.date && overlaps(form.value.start, form.value.end, item.start, item.end)))

function roomName(roomId) {
  return rooms.find((room) => room.id === roomId)?.name || ''
}

function openReservation(roomId, start = '09:00') {
  form.value = { title: '', roomId, date: date.value, endDate: date.value, start, end: addMinutes(start, 60), attendees: [], reviewer: '', content: '' }
  modal.value = true
}

function addAttendee(name) {
  form.value.attendees.push(name)
  if (!form.value.reviewer) form.value.reviewer = name
}

function removeAttendee(name) {
  form.value.attendees = form.value.attendees.filter((item) => item !== name)
  if (form.value.reviewer === name) form.value.reviewer = form.value.attendees[0] || ''
}

function saveReservation() {
  if (!form.value.title.trim() || conflict.value || selectedRoom.value?.restricted) return
  reservations.value.push({ id: `new-${Date.now()}`, status: 'mine', owner: '이지연', ...form.value, title: form.value.title.trim() })
  modal.value = false
}

function cancelReservation(id) {
  reservations.value = reservations.value.filter((item) => item.id !== id)
  detail.value = null
}

function reservationStyle(item) {
  const left = ((timeToMinutes(item.start) - 360) / 60) * roomHourPx
  const width = ((timeToMinutes(item.end) - timeToMinutes(item.start)) / 60) * roomHourPx
  return { left: `${left}px`, width: `${Math.max(width, 36)}px` }
}

function nowMarkerStyle() {
  return { left: `${((timeToMinutes('13:30') - 360) / 60) * roomHourPx}px` }
}

function slotTime(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const raw = Math.max(0, Math.min(17.5, (event.clientX - rect.left) / roomHourPx))
  return minutesToTime(360 + Math.floor(raw * 2) * 30)
}
</script>
