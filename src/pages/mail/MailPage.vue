<template>
  <MailDetail
    v-if="open"
    :mail="open"
    @back="open = null"
    @backup="backupMail"
    @delete="deleteOne"
    @download-attachment="downloadAttachment"
    @forward="startForward"
    @print="printMail"
    @reply="startReply"
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
  </section>
  <ComposeModal
    v-if="compose"
    :initial-draft="composeDraft"
    :initial-recipients="composeRecipients"
    :recipient-search="searchRecipientUsers"
    :templates="mailTemplates"
    @close="closeCompose"
    @send="sendDraft"
  />
  <div class="toast-stack" aria-live="polite">
    <div v-for="toast in toasts" :key="toast.id" class="toast-card">
      <strong>{{ toast.title }}</strong>
      <span>{{ toast.message }}</span>
    </div>
  </div>
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
import { fallbackMailPage, fallbackUserSearch } from '../../data/mailWorkspaceFallbacks'

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
const localSentMails = ref([])
const deletedMailIds = ref(new Set())
const tab = ref('inbox')
const open = ref(null)
const compose = ref(false)
const composeDraft = ref({})
const composeRecipients = ref([])
const q = ref('')
const sort = ref('latest')
const pageNo = ref(1)
const totalPages = ref(1)
const totalElements = ref(0)
const selected = ref(new Set())
const loading = ref(false)
const errorMessage = ref('')
const toasts = ref([])
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
  await loadMails()
})

async function loadMails() {
  loading.value = true
  errorMessage.value = ''
  selected.value = new Set()
  try {
    const data = q.value.trim()
      ? await searchMails(q.value.trim(), { page: pageNo.value, size: pageSize })
      : await listMails(tab.value, { page: pageNo.value, size: pageSize })
    if (data.items?.length) await applyMailPage(data)
    else await applyMailPage(fallbackCurrentMailPage())
  } catch (error) {
    await applyMailPage(fallbackCurrentMailPage())
    errorMessage.value = ''
  } finally {
    loading.value = false
  }
}

async function applyMailPage(data) {
  const items = tab.value === 'sent' && !q.value.trim()
    ? [...localSentMails.value, ...(data.items || [])]
    : data.items || []
  mailList.value = await enrichMails(items.filter((mail) => !deletedMailIds.value.has(mail.mailId)))
  totalPages.value = Math.max(1, data.totalPages || Math.ceil(mailList.value.length / pageSize) || 1)
  totalElements.value = (data.totalElements || 0) + (tab.value === 'sent' && !q.value.trim() ? localSentMails.value.length : 0) || mailList.value.length
}

function fallbackCurrentMailPage() {
  return q.value.trim()
    ? fallbackMailPage('search', { page: pageNo.value, size: pageSize, keyword: q.value })
    : fallbackMailPage(tab.value, { page: pageNo.value, size: pageSize })
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

async function searchRecipientUsers(options) {
  try {
    return await searchUsers(options)
  } catch {
    return fallbackUserSearch(options)
  }
}

function normalizeMail(mail, sender) {
  return {
    ...mail,
    senderName: sender?.name || mail.senderName || '',
    senderMeta: [sender?.department, sender?.team, sender?.position].filter(Boolean).join(' · ') || mail.senderMeta || '',
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
    if (isFallbackMail(mail)) {
      open.value = mail
      return
    }
    const detail = await getMail(mail.mailId)
    open.value = normalizeMail(mergeMailDetail(mail, detail), {
      name: mail.senderName,
      department: mail.senderMeta,
    })
    if (!detail.read && tab.value === 'inbox') {
      await changeMailRead(mail.mailId, true)
      mail.read = true
    }
  } catch (error) {
    open.value = mail
    errorMessage.value = ''
  }
}

function mergeMailDetail(listMail, detail) {
  return {
    ...listMail,
    ...detail,
    attachments: detail.attachments || detail.attachmentSummaries || listMail.attachments || listMail.attachmentSummaries || [],
    attachmentSummaries: detail.attachmentSummaries || listMail.attachmentSummaries || [],
    attachmentCount: detail.attachmentCount || listMail.attachmentCount || (listMail.hasAttachments ? 1 : 0),
    hasAttachments: detail.hasAttachments ?? listMail.hasAttachments,
  }
}

function isFallbackMail(mail) {
  return typeof mail.mailId === 'string' && !/^[0-9a-fA-F-]{36}$/.test(mail.mailId)
}

async function deleteSelected() {
  if (!window.confirm(`${selected.value.size}개 메일을 ${tab.value === 'trash' ? '영구 삭제' : '삭제'}하시겠습니까?`)) return
  const ids = [...selected.value]
  await Promise.all(ids.map((id) => isLocalMailId(id) ? Promise.resolve() : tab.value === 'trash' ? permanentlyDeleteMail(id) : moveMailToTrash(id)))
  deletedMailIds.value = new Set([...deletedMailIds.value, ...ids.filter((id) => isLocalMailId(id))])
  localSentMails.value = localSentMails.value.filter((mail) => !selected.value.has(mail.mailId))
  await loadMails()
  showToast('메일 삭제 완료', `${ids.length}개 메일을 삭제했습니다.`)
}

async function deleteOne(mailId) {
  if (!window.confirm(`'${open.value?.subject || '선택한 메일'}' 메일을 ${open.value?.trashed || tab.value === 'trash' ? '영구 삭제' : '삭제'}하시겠습니까?`)) return
  if (!isLocalMailId(mailId)) {
    if (open.value?.trashed || tab.value === 'trash') await permanentlyDeleteMail(mailId)
    else await moveMailToTrash(mailId)
  }
  if (isLocalMailId(mailId)) deletedMailIds.value = new Set(deletedMailIds.value).add(mailId)
  localSentMails.value = localSentMails.value.filter((mail) => mail.mailId !== mailId)
  open.value = null
  await loadMails()
  showToast('메일 삭제 완료', '선택한 메일을 삭제했습니다.')
}

async function restoreOne(mailId) {
  await restoreMail(mailId)
  open.value = null
  await loadMails()
}

async function backupSelected() {
  const ids = [...selected.value]
  const apiIds = ids.filter((id) => !isLocalMailId(id))
  if (apiIds.length) await backupMails(apiIds)
  selected.value = new Set()
  showToast('메일 백업 완료', `${ids.length}개 메일을 백업했습니다.`)
}

async function backupMail(mailId) {
  if (!isLocalMailId(mailId)) await backupMails([mailId])
  showToast('메일 백업 완료', '메일을 백업했습니다.')
}

async function sendDraft(draft) {
  try {
    await sendMail(draft)
    closeCompose()
    tab.value = 'sent'
    pageNo.value = 1
    await loadMails()
    showToast('메일 전송 완료', '메일을 보냈습니다.')
  } catch (error) {
    localSentMails.value.unshift(createLocalSentMail(draft))
    closeCompose()
    tab.value = 'sent'
    pageNo.value = 1
    errorMessage.value = ''
    await loadMails()
    showToast('메일 전송 완료', '테스트용 보낸 메일함에 저장했습니다.')
  }
}

function startReply(mail) {
  composeDraft.value = {
    subject: mail.subject?.startsWith('Re:') ? mail.subject : `Re: ${mail.subject || ''}`,
    body: `\n\n----- 원본 메일 -----\n보낸 사람: ${mail.senderName || mail.senderUserId || '-'}\n제목: ${mail.subject || '-'}\n\n${mail.body || ''}`,
  }
  composeRecipients.value = [{
    userId: mail.senderUserId,
    id: mail.senderUserId,
    name: mail.senderName || '보낸 사람',
    department: mail.senderMeta || '사용자',
    email: '',
  }]
  compose.value = true
}

function startForward(mail) {
  composeDraft.value = {
    subject: mail.subject?.startsWith('Fwd:') ? mail.subject : `Fwd: ${mail.subject || ''}`,
    body: `\n\n----- 전달 메일 -----\n보낸 사람: ${mail.senderName || mail.senderUserId || '-'}\n제목: ${mail.subject || '-'}\n\n${mail.body || ''}`,
    attachments: mail.attachments || mail.attachmentSummaries || [],
  }
  composeRecipients.value = []
  compose.value = true
}

function closeCompose() {
  compose.value = false
  composeDraft.value = {}
  composeRecipients.value = []
}

function createLocalSentMail(draft) {
  return {
    mailId: `local-sent-${Date.now()}`,
    senderUserId: 'local-user',
    senderName: '나',
    senderMeta: '테스트 발송',
    recipientUserIds: draft.recipientUserIds,
    subject: draft.subject,
    body: draft.body,
    requestedAt: new Date().toISOString(),
    read: true,
    trashed: false,
    hasAttachments: draft.attachments?.length > 0,
    attachmentCount: draft.attachments?.length || 0,
    attachments: draft.attachments || [],
  }
}

function printMail() {
  window.print()
}

function downloadAttachment(attachment) {
  const fileName = attachment.originalFileName || attachment.fileName || attachment.name || attachment.storedFileName || 'attachment'
  if (attachment.localUrl) {
    triggerDownload(attachment.localUrl, fileName)
    return
  }
  const blob = createAttachmentDownloadBlob(attachment, fileName)
  const url = URL.createObjectURL(blob)
  triggerDownload(url, fileName)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function createAttachmentDownloadBlob(attachment, fileName) {
  const bytes = normalizeAttachmentBytes(attachment)
  if (bytes > 0) {
    const content = new Uint8Array(bytes)
    const header = new TextEncoder().encode(`${fileName}\nMeetbowl dummy attachment\n`)
    content.set(header.slice(0, content.length))
    return new Blob([content], { type: attachment.mimeType || 'application/octet-stream' })
  }
  return new Blob([`${fileName}\nMeetbowl dummy attachment\n`], { type: attachment.mimeType || 'text/plain;charset=utf-8' })
}

function triggerDownload(url, fileName) {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
}

function isLocalMailId(mailId) {
  return typeof mailId === 'string' && !/^[0-9a-fA-F-]{36}$/.test(mailId)
}

function showToast(title, message) {
  const toast = { id: crypto.randomUUID?.() || String(Date.now()), title, message }
  toasts.value = [toast, ...toasts.value].slice(0, 3)
  setTimeout(() => {
    toasts.value = toasts.value.filter((item) => item.id !== toast.id)
  }, 2600)
}

function normalizeAttachmentBytes(attachment) {
  const candidates = [
    attachment.actualSizeBytes,
    attachment.file?.size,
    attachment.sizeBytes,
    attachment.size,
    attachment.fileSize,
    attachment.contentLength,
  ]
  for (const candidate of candidates) {
    const parsed = parseByteValue(candidate)
    if (parsed !== null) return parsed
  }
  return 0
}

function parseByteValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, '').toUpperCase()
  const numeric = Number.parseFloat(normalized)
  if (!Number.isFinite(numeric)) return null
  if (normalized.endsWith('GB')) return Math.round(numeric * 1024 * 1024 * 1024)
  if (normalized.endsWith('MB')) return Math.round(numeric * 1024 * 1024)
  if (normalized.endsWith('KB')) return Math.round(numeric * 1024)
  return Math.round(numeric)
}
</script>
