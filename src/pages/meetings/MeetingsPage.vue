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
        <select v-model="range" @change="pageNo = 1"><option value="all">전체 기간</option><option value="3m">최근 3개월</option><option value="6m">최근 6개월</option></select>
        <select v-model="sort"><option value="latest">최신순</option><option value="oldest">오래된순</option></select>
        <span>총 {{ filtered.length }}건</span>
      </div>
    </div>

    <div class="card meeting-list-card">
      <article v-for="meeting in paged" :key="meeting.id" class="meeting-row">
        <div class="meeting-row-main">
          <div class="meeting-title-row">
            <h2>{{ meeting.title }}</h2>
            <span :class="['badge', meeting.status === 'live' ? 'danger' : meeting.status === 'ended' ? 'muted' : 'primary']">{{ statusLabel[meeting.status] }}</span>
            <span :class="['badge', meeting.role === 'host' ? 'success' : 'navy']">{{ meeting.role === 'host' ? '주최자' : '참석자' }}</span>
          </div>
          <div class="meeting-meta-grid">
            <span>{{ meeting.start }} - {{ meeting.end?.split(' ')[1] }}</span>
            <span>{{ meeting.room }}</span>
            <span>참석자 {{ meeting.attendees.join(', ') || '-' }}</span>
            <span>검토자 {{ meeting.reviewer || '-' }}</span>
          </div>
        </div>
        <div class="row-actions">
          <button v-if="meeting.role === 'host' && meeting.status !== 'ended'" class="secondary-button small" @click="openEdit(meeting)">수정</button>
          <button class="primary-button small" @click="enterMeeting(meeting)">{{ meeting.status === 'ended' ? '내 회의록 보기' : '입장' }}</button>
        </div>
      </article>
      <p v-if="!paged.length" class="empty-text">조건에 맞는 회의가 없습니다.</p>
    </div>

    <Pagination v-model="pageNo" :total-pages="totalPages" />

    <ModalShell v-if="modal" modal-class="meeting-modal" @close="modal = false">
      <header><div><h2>{{ mode === 'create' ? '내 회의 생성' : '회의 수정' }}</h2><p v-if="mode === 'edit'">참석자에게 변경 알림이 발송됩니다.</p></div><button @click="modal = false">닫기</button></header>
      <div class="meeting-modal-grid">
        <form class="form-grid" @submit.prevent="saveMeeting">
          <label>회의 제목<input v-model="form.title" required placeholder="회의 제목"></label>
          <div class="form-row two"><label>시작<input type="datetime-local" v-model="form.start"></label><label>종료<input type="datetime-local" v-model="form.end"></label></div>
          <label>회의실<select v-model="form.room"><option v-for="room in roomNames" :key="room" :value="room">{{ room }}</option></select></label>
          <MemberPicker :members="members" :selected-names="form.attendees" exclude-name="이지연" label="참석자 검색" @select="addAttendee($event.name)" />
          <div class="participant-chips"><span v-for="name in form.attendees" :key="name">{{ name }}<button type="button" @click="removeAttendee(name)">×</button></span></div>
          <label>회의록 검토자<select v-model="form.reviewer"><option value="">선택 안 함</option><option v-for="name in form.attendees" :key="name" :value="name">{{ name }}</option></select></label>
          <label>회의 내용<textarea v-model="form.content" rows="4" placeholder="회의 목적과 안건"></textarea></label>
          <div v-if="mode === 'edit'" class="copy-box">https://meetbowl.local/join/{{ form.id }}</div>
          <div class="modal-actions"><button type="button" class="secondary-button" @click="modal = false">취소</button><button class="primary-button">저장</button></div>
        </form>
        <RoomSchedulePanel :room="selectedRoom" :room-name="form.room" :reservations="selectedRoomReservations" />
      </div>
    </ModalShell>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MemberPicker from '../../components/common/MemberPicker.vue'
import ModalShell from '../../components/common/ModalShell.vue'
import Pagination from '../../components/common/Pagination.vue'
import RoomSchedulePanel from '../../components/rooms/RoomSchedulePanel.vue'
import { members, myMeetings, rooms, todayReservations } from '../../data/mockData'
import { fromDateTimeInput, meetingEnd, toDateTimeInput } from '../../utils/dateTime'

const router = useRouter()
const statusLabel = { live: '진행 중', upcoming: '예정', ended: '종료' }
const tabs = [{ key: 'all', label: '전체' }, { key: 'host', label: '내가 주최한 회의' }, { key: 'attendee', label: '초대된 회의' }]
const items = ref(myMeetings.map((meeting) => ({ ...meeting, end: meetingEnd(meeting), content: '' })))
const tab = ref('all')
const range = ref('all')
const sort = ref('latest')
const pageNo = ref(1)
const modal = ref(false)
const mode = ref('create')
const form = ref({ id: '', title: '', start: '2026-05-22T10:00', end: '2026-05-22T11:00', room: rooms[0]?.name || '원격', attendees: [], reviewer: '', content: '' })
const pageSize = 15
const roomNames = ['원격', ...rooms.map((room) => room.name)]

const filtered = computed(() => {
  const now = new Date('2026-06-01T00:00:00')
  const cutoff = range.value === '3m' ? new Date('2026-03-01T00:00:00') : range.value === '6m' ? new Date('2025-12-01T00:00:00') : null
  return items.value
    .filter((meeting) => tab.value === 'all' || meeting.role === tab.value)
    .filter((meeting) => !cutoff || new Date(toDateTimeInput(meeting.start)) >= cutoff && new Date(toDateTimeInput(meeting.start)) <= now)
    .sort((a, b) => sort.value === 'latest' ? new Date(toDateTimeInput(b.start)) - new Date(toDateTimeInput(a.start)) : new Date(toDateTimeInput(a.start)) - new Date(toDateTimeInput(b.start)))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => filtered.value.slice((pageNo.value - 1) * pageSize, pageNo.value * pageSize))
const selectedRoom = computed(() => rooms.find((room) => room.name === form.value.room))
const selectedRoomReservations = computed(() => selectedRoom.value ? todayReservations.filter((item) => item.roomId === selectedRoom.value.id) : [])

function changeTab(value) {
  tab.value = value
  pageNo.value = 1
}

function openCreate() {
  mode.value = 'create'
  form.value = { id: '', title: '', start: '2026-05-22T10:00', end: '2026-05-22T11:00', room: rooms[0]?.name || '원격', attendees: [], reviewer: '', content: '' }
  modal.value = true
}

function openEdit(meeting) {
  mode.value = 'edit'
  form.value = { id: meeting.id, title: meeting.title, start: toDateTimeInput(meeting.start), end: toDateTimeInput(meeting.end || meetingEnd(meeting)), room: meeting.room, attendees: [...meeting.attendees], reviewer: meeting.reviewer || '', content: meeting.content || '' }
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

function saveMeeting() {
  const payload = { title: form.value.title.trim(), start: fromDateTimeInput(form.value.start), end: fromDateTimeInput(form.value.end), room: form.value.room, attendees: [...form.value.attendees], reviewer: form.value.reviewer, content: form.value.content }
  if (!payload.title) return
  if (mode.value === 'edit') items.value = items.value.map((item) => item.id === form.value.id ? { ...item, ...payload } : item)
  else items.value.unshift({ id: `mt-${Date.now()}`, role: 'host', status: 'upcoming', ...payload })
  modal.value = false
}

function enterMeeting(meeting) {
  if (meeting.status === 'ended') router.push('/app/minutes')
  else router.push('/app/meeting')
}
</script>
