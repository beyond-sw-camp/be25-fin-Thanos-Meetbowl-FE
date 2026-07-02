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
    <header class="page-header mail-page-header">
      <div>
        <h1>내부 메일</h1>
        <p>사내 구성원에게 메일을 보내고 받은 메일을 관리합니다.</p>
      </div>
      <ActionButton variant="primary" class="mail-compose-button" @click="compose = true">
        <PenSquare :size="16" />
        새 메일 작성
      </ActionButton>
    </header>

    <nav class="mailbox-tabs">
      <button
        v-for="item in tabs"
        :key="item.id"
        type="button"
        class="mailbox-tab"
        :class="{ active: tab === item.id }"
        @click="changeTab(item.id)"
      >
        <component :is="item.icon" :size="18" />
        <span>{{ item.label }}</span>
        <em>{{ mailboxCounts[item.id] }}</em>
      </button>
    </nav>

    <section class="card mail-board-card">
      <div class="mail-toolbar">
        <div class="mail-toolbar-left">
          <AppSelect v-model="sort" size="md" class="mail-sort-select">
            <option value="latest">최신순</option>
            <option value="oldest">오래된 순</option>
          </AppSelect>
          <label class="mail-toolbar-search">
            <Search :size="18" />
            <input v-model="q" placeholder="메일 검색">
          </label>
        </div>

        <div class="mail-toolbar-right">
          <ActionButton variant="secondary" @click="loadMails">
            <RefreshCw :size="15" />
            새로고침
          </ActionButton>
          <div v-if="selected.size > 0" class="mail-selection-actions">
            <span class="mail-selection-summary">선택 {{ selected.size }}건</span>
            <ActionButton variant="secondary" @click="backupSelectedAction">
              <Archive :size="15" />
              백업하기
            </ActionButton>
            <ActionButton variant="secondary" @click="deleteSelected">
              <Trash2 :size="15" />
              {{ tab === 'trash' ? '영구 삭제' : '삭제' }}
            </ActionButton>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="error-box mail-error-box">{{ errorMessage }}</div>

      <div class="mail-list-table" :class="{ busy: loading }">
        <div class="mail-list-head">
          <label class="mail-check-cell">
            <input type="checkbox" :checked="allChecked" @change="toggleAll">
          </label>
          <span>보낸 사람</span>
          <span>제목</span>
          <button type="button" class="mail-time-sort" @click="toggleSortDirection">
            받은 시간
            <ArrowDown :size="15" :class="{ asc: sort === 'oldest' }" />
          </button>
        </div>

        <button
          v-for="mail in pageItems"
          :key="mail.mailId"
          type="button"
          class="mail-list-row"
          :class="{ unread: !mail.read && tab === 'inbox' }"
          @click="openMail(mail)"
        >
          <span class="mail-list-cell mail-check-cell" @click.stop>
            <input type="checkbox" :checked="selected.has(mail.mailId)" @change="toggleOne(mail.mailId)">
          </span>

          <span class="mail-list-cell mail-sender-cell">
            <span class="mail-avatar">{{ senderInitial(mail) }}</span>
            <span class="mail-sender-copy">
              <strong>{{ mail.senderName || mail.senderUserId }}</strong>
              <small>{{ senderMetaLabel(mail) }}</small>
            </span>
          </span>

          <span class="mail-list-cell mail-subject-cell">
            <strong>
              {{ mail.subject || '(제목 없음)' }}
              <span v-if="mail.hasAttachments || mail.attachmentCount" class="mail-attachment-indicator">
                <Paperclip :size="13" />
              </span>
            </strong>
            <small>{{ mail.previewText || '내용 미리보기가 없습니다.' }}</small>
          </span>

          <span class="mail-list-cell mail-time-cell">
            <time>{{ mail.displayDateShort }}</time>
            <i class="mail-read-dot" :class="{ unread: !mail.read && tab === 'inbox' }"></i>
          </span>
        </button>

        <div v-if="!pageItems.length && !loading" class="empty-state mail-empty-state">메일이 없습니다.</div>
        <div v-if="loading" class="empty-state mail-empty-state">메일을 불러오는 중입니다.</div>
      </div>

      <div class="mail-board-footer">
        <span>전체 {{ totalElements }}개</span>

        <div class="mail-pagination">
          <button type="button" :disabled="pageNo <= 1" @click="pageNo = Math.max(1, pageNo - 1)">
            <ChevronLeft :size="16" />
          </button>
          <button
            v-for="page in visiblePageNumbers"
            :key="page"
            type="button"
            :class="{ active: page === pageNo }"
            @click="pageNo = page"
          >
            {{ page }}
          </button>
          <button type="button" :disabled="pageNo >= totalPages" @click="pageNo = Math.min(totalPages, pageNo + 1)">
            <ChevronRight :size="16" />
          </button>
        </div>

        <AppSelect v-model.number="pageSize" size="md" class="mail-page-size-select">
          <option :value="10">10개씩 보기</option>
          <option :value="20">20개씩 보기</option>
          <option :value="50">50개씩 보기</option>
        </AppSelect>
      </div>
    </section>
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
  <AppToastStack :items="toasts" @dismiss="dismissToast" />
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSelect from '../../components/common/AppSelect.vue'
import ActionButton from '../../components/common/ActionButton.vue'
import AppToastStack from '../../components/common/AppToastStack.vue'
import {
  Archive,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  PenSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from '@lucide/vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import ComposeModal from '../../components/mail/ComposeModal.vue'
import MailDetail from '../../components/mail/MailDetail.vue'
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
import { extractTiptapText } from '../../lib/minutes-content.js'
import { getUserSummary, searchUsers } from '../../lib/users'
import { formatKstDateTime } from '../../utils/dateTime'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
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
  { id: 'inbox', label: '받은 메일함', icon: Inbox },
  { id: 'sent', label: '보낸 메일함', icon: Send },
  { id: 'trash', label: '휴지통', icon: Trash2 },
]

const mailList = ref([])
const mailboxCounts = ref({ inbox: 0, sent: 0, trash: 0 })
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
const pageSize = ref(10)
let loadRequestId = 0

const pageItems = computed(() => {
  const copied = [...mailList.value]
  copied.sort((a, b) => sort.value === 'latest'
    ? String(b.requestedAt || '').localeCompare(String(a.requestedAt || ''))
    : String(a.requestedAt || '').localeCompare(String(b.requestedAt || '')))
  return copied
})
const visiblePageNumbers = computed(() => {
  const total = totalPages.value
  const current = pageNo.value
  const start = Math.max(1, current - 2)
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})
const allChecked = computed(() => pageItems.value.length > 0 && pageItems.value.every((mail) => selected.value.has(mail.mailId)))

let searchTimer = null
watch(q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pageNo.value = 1
    syncQueryToRoute()
  }, 250)
})

watch([tab, pageNo], () => loadMails())
watch(pageSize, () => {
  if (pageNo.value !== 1) {
    pageNo.value = 1
    return
  }
  loadMails()
})
watch(() => route.query.q, () => {
  syncQueryFromRoute()
  if (pageNo.value !== 1) {
    pageNo.value = 1
    return
  }
  loadMails()
})

onMounted(async () => {
  syncQueryFromRoute()
  await refreshMailboxCounts()
  await loadMails()
})

async function loadMails() {
  const requestId = ++loadRequestId
  loading.value = true
  errorMessage.value = ''
  selected.value = new Set()
  try {
    const data = q.value.trim()
      ? await searchMails(q.value.trim(), { page: pageNo.value, size: pageSize.value })
      : await listMails(tab.value, { page: pageNo.value, size: pageSize.value })
    if (requestId !== loadRequestId) return
    await applyMailPage(data)
  } catch (error) {
    if (requestId !== loadRequestId) return
    errorMessage.value = error?.message || '메일을 불러오지 못했습니다.'
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false
    }
  }
}

async function applyMailPage(data) {
  const items = data.items || []
  mailList.value = await enrichMails(items)
  totalPages.value = Math.max(1, data.totalPages || Math.ceil(mailList.value.length / pageSize.value) || 1)
  totalElements.value = data.totalElements || mailList.value.length
}

async function refreshMailboxCounts() {
  try {
    const [inbox, sent, trash] = await Promise.all([
      listMails('inbox', { page: 1, size: 1 }),
      listMails('sent', { page: 1, size: 1 }),
      listMails('trash', { page: 1, size: 1 }),
    ])
    mailboxCounts.value = {
      inbox: inbox?.totalElements || 0,
      sent: sent?.totalElements || 0,
      trash: trash?.totalElements || 0,
    }
  } catch {
    mailboxCounts.value = { inbox: 0, sent: 0, trash: 0 }
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

async function searchRecipientUsers(options) {
  try {
    return await searchUsers(options)
  } catch {
    return { items: [], page: 1, size: options?.size || 8, totalElements: 0, totalPages: 1 }
  }
}

function normalizeMail(mail, sender) {
  const previewText = extractMailText(mail.body).replace(/\s+/g, ' ').trim()
  return {
    ...mail,
    senderName: sender?.name || mail.senderName || '',
    senderMeta: [sender?.department, sender?.team, sender?.position].filter(Boolean).join(' · ') || mail.senderMeta || '',
    senderEmail: sender?.email || mail.senderEmail || '',
    previewText,
    displayDate: mail.requestedAt ? formatKstDateTime(mail.requestedAt) : '',
    displayDateTime: mail.requestedAt ? formatKstDateTime(mail.requestedAt, { second: '2-digit' }) : '',
    displayDateShort: formatMailListDate(mail.requestedAt),
  }
}

function changeTab(value) {
  if (tab.value === value && pageNo.value === 1 && !open.value) return
  tab.value = value
  selected.value = new Set()
  pageNo.value = 1
  open.value = null
}

function syncQueryFromRoute() {
  const nextQuery = typeof route.query.q === 'string' ? route.query.q : ''
  if (q.value !== nextQuery) {
    q.value = nextQuery
  }
}

function syncQueryToRoute() {
  const nextQuery = q.value.trim()
  const currentQuery = typeof route.query.q === 'string' ? route.query.q : ''
  if (nextQuery === currentQuery) return
  router.replace({
    path: '/app/mail',
    query: nextQuery ? { q: nextQuery } : {},
  })
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

function senderInitial(mail) {
  return String(mail.senderName || mail.senderUserId || '?').trim().slice(0, 1)
}

function senderMetaLabel(mail) {
  return mail.senderMeta || '사내 사용자'
}

function formatMailListDate(instant) {
  if (!instant) return '-'
  return formatKstDateTime(instant)
}

function toggleSortDirection() {
  sort.value = sort.value === 'latest' ? 'oldest' : 'latest'
}

async function backupSelectedAction() {
  if (selected.value.size === 0) return
  await backupSelected()
  await refreshMailboxCounts()
  await loadMails()
}

async function openMail(mail) {
  const wasRead = Boolean(mail.read)
  try {
    const detail = await getMail(mail.mailId)
    if (tab.value === 'inbox') mail.read = true
    const recipients = await buildRecipients(detail, mail)
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
      notifyMailRead(mail.mailId)
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

async function buildRecipients(detail, mail) {
  const externalRecipients = (detail.externalRecipients || mail.externalRecipients || []).map((recipient) => ({
    userId: `external:${recipient.email}`,
    name: recipient.name || recipient.email,
    email: recipient.email || '',
    meta: '외부 초대',
    external: true,
  }))
  const internalRecipientIds = (detail.recipientUserIds || mail.recipientUserIds || [])
    .filter((userId) => !(externalRecipients.length && userId === detail.senderUserId))
  const internalRecipients = await enrichRecipients(internalRecipientIds)
  return [...internalRecipients, ...externalRecipients]
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
  await refreshMailboxCounts()
  await loadMails()
  showToast('삭제 완료', `${ids.length}개의 메일을 정리했어요.`)
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
  await refreshMailboxCounts()
  await loadMails()
  showToast('삭제 완료', '선택한 메일을 정리했어요.')
}

async function restoreOne(mailId) {
  await restoreMail(mailId)
  open.value = null
  await refreshMailboxCounts()
  await loadMails()
}

async function backupSelected() {
  const ids = [...selected.value]
  await backupMails(ids)
  selected.value = new Set()
  showToast('백업 완료', `${ids.length}개의 메일을 백업했어요.`)
}

async function backupSelectedAction() {
  if (selected.value.size === 0) return
  await backupSelected()
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
    await refreshMailboxCounts()
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
    body: buildQuotedMailBody('원본 메일', mail),
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
    body: buildQuotedMailBody('전달 메일', mail),
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

function buildQuotedMailBody(label, mail) {
  const bodyText = extractMailText(mail.body)
  return `\n\n----- ${label} -----\n보낸 사람: ${mail.senderName || mail.senderUserId || '-'}\n제목: ${mail.subject || '-'}\n\n${bodyText}`
}

function extractMailText(value) {
  return extractTiptapText(value) || String(value || '')
}

function notifyMailRead(mailId) {
  if (typeof window === 'undefined' || !mailId) return
  window.dispatchEvent(new CustomEvent('meetbowl:mail-read', { detail: { mailId } }))
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

function dismissToast(id) {
  toasts.value = toasts.value.filter((item) => item.id !== id)
}

</script>

<style scoped>
.mail-page-full {
  max-width: 1320px;
}

.mail-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.mail-compose-button {
  min-width: 156px;
  min-height: 46px;
  border-radius: 14px;
}

.mailbox-tabs {
  display: flex;
  align-items: center;
  gap: 22px;
  border-bottom: 1px solid #e9edf5;
  margin-bottom: 22px;
  padding: 0 2px 14px;
}

.mailbox-tab {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 0 12px 14px;
  color: #69758c;
  font-size: 15px;
  font-weight: 800;
}

.mailbox-tab em {
  min-width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f3f6fb;
  color: inherit;
  font-style: normal;
  font-size: 13px;
}

.mailbox-tab.active {
  border-bottom-color: var(--primary);
  color: var(--primary);
}

.mailbox-tab.active em {
  background: #fff1e8;
}

.mail-board-card {
  border-radius: 22px;
  padding: 0;
  overflow: hidden;
}

.mail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid #edf1f7;
}

.mail-toolbar-left,
.mail-toolbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mail-selection-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.mail-selection-summary {
  color: #69758c;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.mail-sort-select {
  width: 142px;
}

.mail-toolbar-search {
  width: min(392px, 100%);
  min-width: 280px;
  position: relative;
  display: flex;
  align-items: center;
}

.mail-toolbar-search svg {
  position: absolute;
  left: 14px;
  color: var(--muted-foreground);
  pointer-events: none;
}

.mail-toolbar-search input {
  width: 100%;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: white;
  padding: 0 14px 0 42px;
  font: inherit;
}

.mail-toolbar-search input:focus {
  outline: none;
  border-color: rgba(243, 115, 33, 0.5);
  box-shadow: 0 0 0 3px rgba(243, 115, 33, 0.12);
}

.mail-error-box {
  margin: 16px 20px 0;
}

.mail-list-table {
  display: grid;
  position: relative;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.mail-list-table.busy {
  opacity: 0.72;
  transform: translateY(2px);
}

.mail-list-head,
.mail-list-row {
  display: grid;
  grid-template-columns: 56px minmax(220px, 320px) minmax(0, 1fr) 170px;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
}

.mail-list-head {
  min-height: 52px;
  color: #69758c;
  font-size: 13px;
  font-weight: 800;
}

.mail-list-row {
  min-height: 66px;
  border-top: 1px solid #edf1f7;
  background: white;
  text-align: left;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
  outline: none;
  appearance: none;
}

.mail-list-row:hover {
  background: #fbfcfe;
}

.mail-list-row:focus,
.mail-list-row:focus-visible {
  outline: none;
  box-shadow: none;
}

.mail-list-row.unread {
  background: #fffdfa;
}

.mail-check-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mail-check-cell input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

.mail-sender-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.mail-avatar {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff1e8, #fff9f4);
  color: #2d3748;
  font-size: 14px;
  font-weight: 800;
}

.mail-sender-copy,
.mail-subject-cell {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.mail-sender-copy strong,
.mail-subject-cell strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-sender-copy strong {
  font-size: 14px;
}

.mail-sender-copy small,
.mail-subject-cell small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted-foreground);
  font-size: 13px;
}

.mail-subject-cell strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
}

.mail-list-row.unread .mail-subject-cell strong {
  font-weight: 900;
}

.mail-attachment-indicator {
  display: inline-flex;
  align-items: center;
  color: #94a3b8;
}

.mail-time-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  color: #69758c;
  font-size: 13px;
}

.mail-time-cell time {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.mail-read-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #d6dce7;
}

.mail-read-dot.unread {
  background: var(--primary);
}

.mail-time-sort {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.mail-time-sort :deep(svg.asc) {
  transform: rotate(180deg);
}

.mail-empty-state {
  padding: 48px 20px;
}

.mail-board-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid #edf1f7;
  padding: 16px 20px;
  color: #69758c;
  font-size: 14px;
}

.mail-pagination {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mail-pagination button {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  color: var(--foreground);
  font-size: 14px;
  font-weight: 800;
}

.mail-pagination button.active {
  border-color: var(--primary);
  background: var(--primary);
  color: white;
}

.mail-pagination button:disabled {
  opacity: 0.45;
}

.mail-page-size-select {
  width: 132px;
}

@media (max-width: 1100px) {
  .mail-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .mail-toolbar-left,
  .mail-toolbar-right {
    flex-wrap: wrap;
  }

  .mail-toolbar-search {
    min-width: 0;
    width: 100%;
  }

  .mail-list-head,
  .mail-list-row {
    grid-template-columns: 56px minmax(0, 1fr) 120px;
  }

  .mail-sender-cell {
    grid-column: 2;
  }

  .mail-subject-cell {
    grid-column: 2;
  }
}

@media (max-width: 760px) {
  .mail-page-header,
  .mail-board-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .mailbox-tabs {
    overflow-x: auto;
    padding-bottom: 10px;
  }

  .mail-list-head {
    display: none;
  }

  .mail-list-row {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 10px;
    padding: 14px 16px;
  }

  .mail-time-cell {
    grid-column: 2;
    justify-content: flex-start;
  }

  .mail-pagination {
    justify-content: center;
  }
}
</style>
