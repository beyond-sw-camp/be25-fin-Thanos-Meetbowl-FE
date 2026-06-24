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
      <AppSelect v-model="sort" size="sm"><option value="latest">최신순</option><option value="oldest">오래된 순</option></AppSelect>
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
    :self-recipient="selfRecipient"
    :templates="mailTemplates"
    @close="closeCompose"
    @send="sendDraft"
  />
  <ConfirmDialog v-if="confirmDialog" v-bind="confirmDialog" @cancel="cancelConfirm" @confirm="acceptConfirm" />
  <div class="toast-stack" aria-live="polite">
    <div v-for="toast in toasts" :key="toast.id" class="toast-card">
      <strong>{{ toast.title }}</strong>
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
import AppSelect from '../../components/common/AppSelect.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { Archive, PenSquare, RefreshCw, Search, Trash2 } from '@lucide/vue'
import Pagination from '../../components/common/Pagination.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import ComposeModal from '../../components/mail/ComposeModal.vue'
import MailDetail from '../../components/mail/MailDetail.vue'
import MailList from '../../components/mail/MailList.vue'
import {
  backupMails,
  changeMailRead,
  downloadMailAttachment,
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
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const selfRecipient = computed(() => auth.user ? {
  ...auth.user,
  userId: auth.user.userId,
  name: auth.user.name || auth.user.loginId,
} : null)

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
const { confirmDialog, requestConfirm, cancelConfirm, acceptConfirm } = useConfirmDialog()
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
    await applyMailPage(data)
  } catch (error) {
    await applyMailPage({ items: [], page: 1, size: pageSize, totalElements: 0, totalPages: 1 })
    errorMessage.value = error?.message || '메일을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function applyMailPage(data) {
  const items = data.items || []
  mailList.value = await enrichMails(items)
  totalPages.value = Math.max(1, data.totalPages || Math.ceil(mailList.value.length / pageSize) || 1)
  totalElements.value = data.totalElements || mailList.value.length
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
    return { items: [], page: 1, size: options?.size || 8, totalElements: 0, totalPages: 1 }
  }
}

function normalizeMail(mail, sender) {
  return {
    ...mail,
    senderName: sender?.name || mail.senderName || '',
    senderMeta: [sender?.department, sender?.team, sender?.position].filter(Boolean).join(' · ') || mail.senderMeta || '',
    senderEmail: sender?.email || mail.senderEmail || '',
    displayDate: mail.requestedAt ? formatKstDateTime(mail.requestedAt) : '',
    displayDateTime: mail.requestedAt ? formatKstDateTime(mail.requestedAt, { second: '2-digit' }) : '',
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
  const wasRead = Boolean(mail.read)
  try {
    const detail = await getMail(mail.mailId)
    if (tab.value === 'inbox') mail.read = true
    const recipients = await enrichRecipients(detail.recipientUserIds || mail.recipientUserIds || [])
    open.value = normalizeMail({
      ...mergeMailDetail(mail, detail),
      recipients,
      read: tab.value === 'inbox' ? true : detail.read,
    }, {
      name: mail.senderName,
      department: mail.senderMeta,
    })
    if (!detail.read && tab.value === 'inbox') {
      await changeMailRead(mail.mailId, true)
    }
  } catch (error) {
    mail.read = wasRead
    open.value = null
    errorMessage.value = error?.message || '메일 상세를 불러오지 못했습니다.'
  }
}

async function enrichRecipients(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  return Promise.all(ids.map(async (userId) => {
    const user = await getUserSummary(userId).catch(() => null)
    return {
      userId,
      name: user?.name || userId,
      email: user?.email || '',
      meta: [user?.department, user?.team, user?.position].filter(Boolean).join(' · '),
    }
  }))
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

async function deleteSelected() {
  const permanently = tab.value === 'trash'
  const confirmed = await requestConfirm({
    title: permanently ? '메일을 영구 삭제할까요?' : '메일을 삭제할까요?',
    message: permanently
      ? `선택한 ${selected.value.size}개 메일은 영구 삭제되며 복구할 수 없습니다.`
      : `선택한 ${selected.value.size}개 메일을 휴지통으로 이동합니다.`,
    confirmLabel: permanently ? '영구 삭제' : '삭제',
  })
  if (!confirmed) return
  const ids = [...selected.value]
  await Promise.all(ids.map((id) => tab.value === 'trash' ? permanentlyDeleteMail(id) : moveMailToTrash(id)))
  await loadMails()
  showToast('메일 삭제 완료', `${ids.length}개 메일을 삭제했습니다.`)
}

async function deleteOne(mailId) {
  const permanently = Boolean(open.value?.trashed || tab.value === 'trash')
  const confirmed = await requestConfirm({
    title: permanently ? '메일을 영구 삭제할까요?' : '메일을 삭제할까요?',
    message: permanently
      ? `'${open.value?.subject || '선택한 메일'}'은 영구 삭제되며 복구할 수 없습니다.`
      : `'${open.value?.subject || '선택한 메일'}'을 휴지통으로 이동합니다.`,
    confirmLabel: permanently ? '영구 삭제' : '삭제',
  })
  if (!confirmed) return
  if (open.value?.trashed || tab.value === 'trash') await permanentlyDeleteMail(mailId)
  else await moveMailToTrash(mailId)
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
  await backupMails(ids)
  selected.value = new Set()
  showToast('메일 백업 완료', `${ids.length}개 메일을 백업했습니다.`)
}

async function backupMail(mailId) {
  await backupMails([mailId])
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
    errorMessage.value = error?.message || '메일을 전송하지 못했습니다.'
    showToast('메일 전송 실패', errorMessage.value)
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

function printMail() {
  window.print()
}

async function downloadAttachment(attachment) {
  const fileName = attachment.originalFileName || attachment.fileName || attachment.name || attachment.storedFileName || 'attachment'
  // 작성 중 로컬 첨부(미전송)는 메모리 URL로 바로 받는다.
  if (attachment.localUrl) {
    triggerDownload(attachment.localUrl, fileName)
    return
  }
  const attachmentId = attachment.attachmentId || attachment.id
  const mailId = open.value?.mailId
  if (!mailId || !attachmentId) return
  try {
    const { blob } = await downloadMailAttachment(mailId, attachmentId)
    const url = URL.createObjectURL(blob)
    triggerDownload(url, fileName)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error('첨부 다운로드 실패:', error)
    showToast('첨부 다운로드 실패', '첨부파일을 받지 못했습니다.')
  }
}

function triggerDownload(url, fileName) {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
}

function showToast(title, message) {
  const toast = { id: crypto.randomUUID?.() || String(Date.now()), title, message }
  toasts.value = [toast, ...toasts.value].slice(0, 3)
  setTimeout(() => {
    toasts.value = toasts.value.filter((item) => item.id !== toast.id)
  }, 2600)
}

</script>
