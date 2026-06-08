<template>
  <MailDetail v-if="open" :mail="open" @back="open = null" @backup="backupMail" />

  <section v-else class="page mail-page-full">
    <header class="page-header rooms-header">
      <div><h1>내부 메일</h1><p>사내 내부 사용자 및 부서 간 메일 시스템</p></div>
      <button class="primary-button" @click="compose = true">새 메일 작성</button>
    </header>

    <div class="mail-tabs">
      <button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" @click="changeTab(item.id)">{{ item.label }}</button>
      <select v-model="sort"><option value="latest">최신순</option><option value="oldest">오래된 순</option></select>
      <input v-model="q" placeholder="메일 검색">
    </div>

    <div class="mail-bulkbar">
      <label><input type="checkbox" :checked="allChecked" @change="toggleAll"> 전체 선택</label>
      <template v-if="selected.size > 0">
        <span>{{ selected.size }}개 선택</span>
        <button @click="backupSelected">백업하기</button>
        <button class="danger-text" @click="deleteSelected">{{ tab === 'trash' ? '영구 삭제' : '삭제' }}</button>
      </template>
      <em>총 {{ filtered.length }}건</em>
    </div>

    <MailList :items="pageItems" :selected-ids="selected" @open="open = $event" @toggle="toggleOne" />
    <Pagination v-model="pageNo" :total-pages="totalPages" />
    <ComposeModal v-if="compose" :members="members" :templates="mailTemplates" @close="compose = false" @send="sendMail" />
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import Pagination from '../../components/common/Pagination.vue'
import ComposeModal from '../../components/mail/ComposeModal.vue'
import MailDetail from '../../components/mail/MailDetail.vue'
import MailList from '../../components/mail/MailList.vue'
import { mails, members } from '../../data/mockData'

const mailTemplates = [
  { id: 'meeting', label: '회의 요청', subject: '[회의 요청] {주제} 일정 협의', body: '안녕하세요,\n\n아래와 같이 회의를 요청드립니다.\n\n- 안건: \n- 일시: YYYY-MM-DD HH:MM\n- 장소: \n- 참석자: \n\n참석 가능 여부 회신 부탁드립니다.\n\n감사합니다.' },
  { id: 'minutes', label: '회의록 공유', subject: '[회의록 공유] {회의명}', body: '안녕하세요,\n\n{회의명} 회의록을 공유드립니다.\n\n[AI 요약]\n- \n\n[액션 아이템]\n- \n\n확인 부탁드립니다.' },
  { id: 'vacation', label: '휴가 신청', subject: '[휴가 신청] {이름} / {기간}', body: '안녕하세요,\n\n아래와 같이 휴가를 신청합니다.\n\n- 사유: \n- 기간: YYYY-MM-DD ~ YYYY-MM-DD\n- 업무 인수인계: \n- 비상 연락처: \n\n승인 부탁드립니다.' },
  { id: 'cowork', label: '업무 협조 요청', subject: '[협조 요청] {업무명}', body: '안녕하세요,\n\n아래 업무에 대한 협조를 요청드립니다.\n\n- 요청 내용: \n- 회신 기한: \n- 참고 자료: \n\n바쁘시겠지만 검토 부탁드립니다.' },
]

const mailList = ref(mails.map((mail) => ({ ...mail })))
const tab = ref('inbox')
const open = ref(null)
const compose = ref(false)
const q = ref('')
const sort = ref('latest')
const pageNo = ref(1)
const selected = ref(new Set())
const pageSize = 15
const tabs = [
  { id: 'inbox', label: '받은 메일함' },
  { id: 'sent', label: '보낸 메일함' },
  { id: 'trash', label: '휴지통' },
  { id: 'backup', label: '백업' },
  { id: 'notice', label: '공지' },
]

const filtered = computed(() => mailList.value
  .filter((mail) => mail.category === tab.value && (!q.value || `${mail.subject} ${mail.from} ${mail.dept}`.toLowerCase().includes(q.value.toLowerCase())))
  .sort((a, b) => sort.value === 'latest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageItems = computed(() => filtered.value.slice((pageNo.value - 1) * pageSize, pageNo.value * pageSize))
const allChecked = computed(() => pageItems.value.length > 0 && pageItems.value.every((mail) => selected.value.has(mail.id)))

function changeTab(value) {
  tab.value = value
  selected.value = new Set()
  pageNo.value = 1
  open.value = null
}

function toggleAll() {
  const next = new Set(selected.value)
  if (allChecked.value) pageItems.value.forEach((mail) => next.delete(mail.id))
  else pageItems.value.forEach((mail) => next.add(mail.id))
  selected.value = next
}

function toggleOne(id) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}

function deleteSelected() {
  if (tab.value === 'trash') mailList.value = mailList.value.filter((mail) => !selected.value.has(mail.id))
  else mailList.value = mailList.value.map((mail) => selected.value.has(mail.id) ? { ...mail, category: 'trash' } : mail)
  selected.value = new Set()
}

function backupSelected() {
  mailList.value = mailList.value.map((mail) => selected.value.has(mail.id) ? { ...mail, category: 'backup' } : mail)
  selected.value = new Set()
}

function backupMail(id) {
  mailList.value = mailList.value.map((mail) => mail.id === id ? { ...mail, category: 'backup' } : mail)
  open.value = null
}

function sendMail(draft) {
  mailList.value.unshift({
    id: `mail-${Date.now()}`,
    from: '이지연',
    dept: '전략기획팀',
    subject: draft.subject || '(제목 없음)',
    preview: draft.body.slice(0, 70),
    date: '2026-05-22',
    unread: false,
    hasAttachment: draft.attachments.length > 0,
    category: 'sent',
    body: draft.body,
  })
  compose.value = false
}
</script>
