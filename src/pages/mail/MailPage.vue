<template>
  <MailDetail
    v-if="open"
    :mail="open"
    @back="open = null"
    @backup="backupMail"
    @delete="deleteOne"
    @restore="restoreOne"
  />

  <section v-else class="page mail-page-full">
    <header class="page-header rooms-header">
      <div><h1>내부 메일</h1><p>사내 사용자에게 메일을 보내고 받은 메일을 관리합니다.</p></div>
      <button class="primary-button" @click="compose = true"><PenSquare :size="16" /> 새 메일 작성</button>
    </header>

    <div class="mail-tabs">
      <button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" @click="changeTab(item.id)">{{ item.label }}</button>
      <select v-model="sort"><option value="latest">최신순</option><option value="oldest">오래된 순</option></select>
      <label class="toolbar-search mail-search">
        <Search :size="15" />
        <input v-model="q" placeholder="메일 검색">
      </label>
      <button type="button" class="secondary-button small" @click="loadMails"><RefreshCw :size="14" /> 새로고침</button>
    </div>

    <div class="mail-bulkbar">
      <label><input type="checkbox" :checked="allChecked" @change="toggleAll"> 전체 선택</label>
      <template v-if="selected.size > 0">
        <span>{{ selected.size }}개 선택</span>
        <button @click="backupSelected"><Archive :size="14" /> 백업하기</button>
        <button class="danger-text" @click="deleteSelected"><Trash2 :size="14" /> {{ tab === 'trash' ? '영구 삭제' : '삭제' }}</button>
      </template>
      <em v-if="loading">불러오는 중...</em>
      <em v-else>총 {{ totalElements }}건</em>
    </div>

    <div v-if="errorMessage" class="error-box">{{ errorMessage }}</div>
    <MailList :items="pageItems" :selected-ids="selected" @open="openMail" @toggle="toggleOne" />
    <Pagination v-model="pageNo" :total-pages="totalPages" />
    <ComposeModal v-if="compose" :members="members" :templates="mailTemplates" @close="compose = false" @send="sendDraft" />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Archive, PenSquare, RefreshCw, Search, Trash2 } from '@lucide/vue'
import Pagination from '../../components/common/Pagination.vue'
import ComposeModal from '../../components/mail/ComposeModal.vue'
import MailDetail from '../../components/mail/MailDetail.vue'
import MailList from '../../components/mail/MailList.vue'
import {
  backupMails,
  changeMailRead,
  getMail,
  listMails,
  moveMailToTrash,
  permanentlyDeleteMail,
  restoreMail,
  searchMails,
  sendMail,
} from '../../lib/mail'
import { getUserSummary, searchUsers } from '../../lib/users'
import { formatKstDateTime } from '../../utils/dateTime'

const mailTemplates = [
  { id: 'meeting', label: '회의 요청', subject: '[회의 요청] {주제} 일정 협의', body: '안녕하세요,\n\n아래와 같이 회의를 요청드립니다.\n\n- 안건: \n- 일시: YYYY-MM-DD HH:MM\n- 장소: \n- 참석자: \n\n참석 가능 여부 회신 부탁드립니다.\n\n감사합니다.' },
  { id: 'minutes', label: '회의록 공유', subject: '[회의록 공유] {회의명}', body: '안녕하세요,\n\n{회의명} 회의록을 공유드립니다.\n\n[AI 요약]\n- \n\n[액션 아이템]\n- \n\n확인 부탁드립니다.' },
  { id: 'vacation', label: '휴가 신청', subject: '[휴가 신청] {이름} / {기간}', body: '안녕하세요,\n\n아래와 같이 휴가를 신청합니다.\n\n- 사유: \n- 기간: YYYY-MM-DD ~ YYYY-MM-DD\n- 업무 인수인계: \n- 비상 연락처: \n\n승인 부탁드립니다.' },
  { id: 'cowork', label: '업무 협조 요청', subject: '[협조 요청] {업무명}', body: '안녕하세요,\n\n아래 업무에 대한 협조를 요청드립니다.\n\n- 요청 내용: \n- 회신 기한: \n- 참고 자료: \n\n바쁘시겠지만 검토 부탁드립니다.' },
]

const tabs = [
  { id: 'inbox', label: '받은 메일함' },
  { id: 'sent', label: '보낸 메일함' },
  { id: 'trash', label: '휴지통' },
]

const mailList = ref([])
const members = ref([])
const tab = ref('inbox')
const open = ref(null)
const compose = ref(false)
const q = ref('')
const sort = ref('latest')
const pageNo = ref(1)
const totalPages = ref(1)
const totalElements = ref(0)
const selected = ref(new Set())
const loading = ref(false)
const errorMessage = ref('')
const pageSize = 15

const pageItems = computed(() => {
  const copied = [...mailList.value]
  copied.sort((a, b) => sort.value === 'latest'
    ? String(b.requestedAt || '').localeCompare(String(a.requestedAt || ''))
    : String(a.requestedAt || '').localeCompare(String(b.requestedAt || '')))
  return copied
})
const allChecked = computed(() => pageItems.value.length > 0 && pageItems.value.every((mail) => selected.value.has(mail.mailId)))

watch(pageNo, () => loadMails())
let searchTimer = null
watch(q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pageNo.value = 1
    loadMails()
  }, 250)
})

onMounted(async () => {
  await Promise.all([loadMails(), loadMembers()])
})

async function loadMails() {
  loading.value = true
  errorMessage.value = ''
  selected.value = new Set()
  try {
    const data = q.value.trim()
      ? await searchMails(q.value.trim(), { page: pageNo.value, size: pageSize })
      : await listMails(tab.value, { page: pageNo.value, size: pageSize })
    mailList.value = await enrichMails(data.items || [])
    totalPages.value = Math.max(1, data.totalPages || 1)
    totalElements.value = data.totalElements || mailList.value.length
  } catch (error) {
    errorMessage.value = error?.message || '메일을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function loadMembers() {
  try {
    const data = await searchUsers({ page: 1, size: 50 })
    members.value = data.items || []
  } catch {
    members.value = []
  }
}

async function enrichMails(items) {
  const senderIds = [...new Set(items.map((mail) => mail.senderUserId).filter(Boolean))]
  const summaries = await Promise.all(senderIds.map(async (userId) => {
    try {
      const user = await getUserSummary(userId)
      return [userId, user]
    } catch {
      return [userId, null]
    }
  }))
  const userMap = new Map(summaries)
  return items.map((mail) => normalizeMail(mail, userMap.get(mail.senderUserId)))
}

function normalizeMail(mail, sender) {
  return {
    ...mail,
    senderName: sender?.name || '',
    senderMeta: [sender?.department, sender?.team, sender?.position].filter(Boolean).join(' · '),
    displayDate: mail.requestedAt ? formatKstDateTime(mail.requestedAt) : '',
  }
}

function changeTab(value) {
  tab.value = value
  selected.value = new Set()
  pageNo.value = 1
  open.value = null
  q.value = ''
  loadMails()
}

function toggleAll() {
  const next = new Set(selected.value)
  if (allChecked.value) pageItems.value.forEach((mail) => next.delete(mail.mailId))
  else pageItems.value.forEach((mail) => next.add(mail.mailId))
  selected.value = next
}

function toggleOne(id) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}

async function openMail(mail) {
  try {
    const detail = await getMail(mail.mailId)
    open.value = normalizeMail(detail, {
      name: mail.senderName,
      department: mail.senderMeta,
    })
    if (!detail.read && tab.value === 'inbox') {
      await changeMailRead(mail.mailId, true)
      mail.read = true
    }
  } catch (error) {
    errorMessage.value = error?.message || '메일 상세를 불러오지 못했습니다.'
  }
}

async function deleteSelected() {
  const ids = [...selected.value]
  await Promise.all(ids.map((id) => tab.value === 'trash' ? permanentlyDeleteMail(id) : moveMailToTrash(id)))
  await loadMails()
}

async function deleteOne(mailId) {
  if (open.value?.trashed || tab.value === 'trash') await permanentlyDeleteMail(mailId)
  else await moveMailToTrash(mailId)
  open.value = null
  await loadMails()
}

async function restoreOne(mailId) {
  await restoreMail(mailId)
  open.value = null
  await loadMails()
}

async function backupSelected() {
  await backupMails([...selected.value])
  selected.value = new Set()
}

async function backupMail(mailId) {
  await backupMails([mailId])
}

async function sendDraft(draft) {
  try {
    await sendMail(draft)
    compose.value = false
    tab.value = 'sent'
    pageNo.value = 1
    await loadMails()
  } catch (error) {
    errorMessage.value = error?.message || '메일을 전송하지 못했습니다.'
  }
}
</script>
