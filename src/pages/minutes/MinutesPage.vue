<template>
  <section class="page minutes-page-full">
    <header class="page-header">
      <h1>내 회의록</h1>
      <p>AI가 자동 생성한 내 회의록을 확인·수정하고 승인 후 내부 메일로 공유하세요.</p>
    </header>

    <article v-if="loading" class="card empty-state">회의록을 불러오는 중입니다.</article>
    <article v-else-if="loadError" class="card empty-state">
      <p>{{ loadError }}</p>
      <button class="secondary-button" type="button" @click="loadMinutes">다시 시도</button>
    </article>
    <article v-else-if="minuteItems.length === 0" class="card empty-state">표시할 회의록이 없습니다.</article>

    <div v-else class="minute-layout">
      <MinuteList v-model:query="q" :items="filtered" :selected-id="selectedId" :favorites="favorites" @select="selectMinute" />
      <article v-if="detailLoading" class="card minute-detail-panel empty-state">회의록 상세를 불러오는 중입니다.</article>
      <article v-else-if="detailError" class="card minute-detail-panel empty-state">
        <p>{{ detailError }}</p>
        <button class="secondary-button" type="button" @click="loadSelectedDetail">다시 시도</button>
      </article>
      <MinuteDetail
        v-else-if="selected"
        :minute="selected"
        :editing="editing"
        :favorites="favorites"
        :transcript-open="transcriptOpen"
        :transcript="transcriptLines"
        :transcript-loading="transcriptLoading"
        :transcript-error="transcriptError"
        :can-edit="canEditSelected"
        :can-approve="canApproveSelected"
        :action-pending="actionPending"
        :can-share="canShareSelected"
        @toggle-favorite="toggleFavorite"
        @start-edit="editing = true"
        @cancel-edit="editing = false"
        @save-edit="saveEdit"
        @approve="approveSelected"
        @toggle-transcript="toggleTranscript"
        @share="openShare"
      />
    </div>

    <ShareMailModal v-if="shareOpen" :draft="share" @close="closeShare" @send="sendShare" />
    <AppToastStack :items="toasts" @dismiss="dismissToast" />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MinuteDetail from '../../components/minutes/MinuteDetail.vue'
import MinuteList from '../../components/minutes/MinuteList.vue'
import ShareMailModal from '../../components/minutes/ShareMailModal.vue'
import AppToastStack from '../../components/common/AppToastStack.vue'
import {
  addMinutesFavorite,
  approveMeetingMinutes,
  getMeetingMinutes,
  getMeetingTranscript,
  listMinutes,
  removeMinutesFavorite,
  reviseMeetingMinutes,
  shareMeetingMinutes,
} from '../../lib/minutes'
import { extractTiptapText, isValidTiptapDocument } from '../../lib/minutes-content'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const minuteItems = ref([])
const detailByMeetingId = ref({})
const selectedId = ref('')
const q = ref('')
const loading = ref(false)
const loadError = ref('')
const detailLoading = ref(false)
const detailError = ref('')
const actionPending = ref(false)
const shareOpen = ref(false)
const transcriptOpen = ref(false)
const transcriptLoading = ref(false)
const transcriptError = ref('')
const transcriptLines = ref([])
const editing = ref(false)
const favorites = ref({})
const toasts = ref([])
const share = ref({ recipients: [], query: '', subject: '', body: '', error: '', sending: false })

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

const filtered = computed(() => {
  const keyword = q.value.trim().toLowerCase()
  if (!keyword) return minuteItems.value
  return minuteItems.value.filter((minute) => `${minute.title} ${minute.summary}`.toLowerCase().includes(keyword))
})

const selectedListItem = computed(() => minuteItems.value.find((minute) => minute.id === selectedId.value) || minuteItems.value[0] || null)
const selected = computed(() => {
  if (!selectedListItem.value) return null
  const detail = detailByMeetingId.value[selectedListItem.value.meetingId]
  return normalizeMinute(detail || selectedListItem.value)
})
const selectedStatus = computed(() => selected.value?.rawStatus || '')
const canEditSelected = computed(() => {
  if (!selected.value || !['DRAFT', 'IN_REVIEW', 'APPROVED', 'SHARED'].includes(selectedStatus.value)) return false
  return selected.value.reviewerUserId === auth.user?.userId
})
const canApproveSelected = computed(() => {
  if (!selected.value || !['DRAFT', 'IN_REVIEW'].includes(selectedStatus.value)) return false
  return selected.value.reviewerUserId === auth.user?.userId
})
const canShareSelected = computed(() => Boolean(selected.value && ['APPROVED', 'SHARED'].includes(selectedStatus.value)))

onMounted(loadMinutes)

watch(() => route.params.meetingId, () => {
  selectFromRoute()
})

watch(selectedId, async () => {
  editing.value = false
  transcriptOpen.value = false
  transcriptLines.value = []
  transcriptError.value = ''
  await loadSelectedDetail()
})

async function loadMinutes() {
  loading.value = true
  loadError.value = ''
  try {
    const rows = await listMinutes()
    minuteItems.value = (rows || []).map(normalizeMinute)
    favorites.value = Object.fromEntries(minuteItems.value.map((minute) => [minute.id, minute.favorite]))
    selectFromRoute()
    if (!selectedId.value && minuteItems.value.length > 0) selectedId.value = minuteItems.value[0].id
  } catch (error) {
    loadError.value = error?.message || '회의록 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function selectFromRoute() {
  const meetingId = route.params.meetingId
  if (!meetingId || minuteItems.value.length === 0) return
  const matched = minuteItems.value.find((minute) => minute.meetingId === meetingId)
  if (matched) selectedId.value = matched.id
}

function selectMinute(id) {
  const item = minuteItems.value.find((minute) => minute.id === id)
  selectedId.value = id
  if (item?.meetingId && route.params.meetingId !== item.meetingId) {
    router.push(`/app/minutes/${item.meetingId}`)
  }
}

async function loadSelectedDetail() {
  if (!selectedListItem.value?.meetingId) return
  const meetingId = selectedListItem.value.meetingId
  detailLoading.value = true
  detailError.value = ''
  try {
    const detail = await getMeetingMinutes(meetingId)
    detailByMeetingId.value = { ...detailByMeetingId.value, [meetingId]: detail }
    replaceListItem(normalizeMinute(detail))
  } catch (error) {
    detailError.value = error?.message || '회의록 상세를 불러오지 못했습니다.'
  } finally {
    detailLoading.value = false
  }
}

async function saveEdit(draft) {
  if (!selected.value) return
  if (!isValidTiptapDocument(draft.content)) {
    detailError.value = '본문은 type=doc, content 배열을 가진 Tiptap JSON이어야 합니다.'
    return
  }
  actionPending.value = true
  detailError.value = ''
  try {
    const updated = await reviseMeetingMinutes(selected.value.meetingId, {
      summary: draft.summary,
      content: draft.content,
    })
    detailByMeetingId.value = { ...detailByMeetingId.value, [updated.meetingId]: updated }
    replaceListItem(normalizeMinute(updated))
    editing.value = false
  } catch (error) {
    detailError.value = error?.message || '회의록 수정 저장에 실패했습니다.'
  } finally {
    actionPending.value = false
  }
}

async function approveSelected() {
  if (!selected.value) return
  actionPending.value = true
  detailError.value = ''
  try {
    const approved = await approveMeetingMinutes(selected.value.meetingId)
    detailByMeetingId.value = { ...detailByMeetingId.value, [approved.meetingId]: approved }
    replaceListItem(normalizeMinute(approved))
    editing.value = false
  } catch (error) {
    detailError.value = error?.message || '회의록 승인에 실패했습니다.'
  } finally {
    actionPending.value = false
  }
}

async function toggleFavorite(id) {
  const item = minuteItems.value.find((minute) => minute.id === id)
  if (!item) return
  const next = !favorites.value[id]
  favorites.value = { ...favorites.value, [id]: next }
  replaceListItem({ ...item, favorite: next })
  try {
    if (next) await addMinutesFavorite(id)
    else await removeMinutesFavorite(id)
  } catch (error) {
    // 낙관적 갱신을 되돌리되, 실패를 조용히 묻지 않고 토스트로 알려 "해제했는데 그대로 남는" 오인을 막는다.
    favorites.value = { ...favorites.value, [id]: !next }
    replaceListItem({ ...item, favorite: !next })
    showToast(
      next ? '즐겨찾기 추가 실패' : '즐겨찾기 해제 실패',
      error?.message || '회의록 즐겨찾기 상태를 변경하지 못했습니다.',
    )
  }
}

async function toggleTranscript() {
  if (!selected.value) return
  transcriptOpen.value = !transcriptOpen.value
  if (!transcriptOpen.value || transcriptLines.value.length > 0) return
  transcriptLoading.value = true
  transcriptError.value = ''
  try {
    const transcript = await getMeetingTranscript(selected.value.meetingId)
    transcriptLines.value = (transcript?.segments || []).map((segment) => ({
      t: formatOffset(segment.startedAtMs),
      who: `#${segment.sequence}`,
      text: segment.sourceText,
    }))
  } catch (error) {
    transcriptError.value = error?.message || '회의 원문 STT를 불러오지 못했습니다.'
  } finally {
    transcriptLoading.value = false
  }
}

function openShare() {
  if (!selected.value) return
  if (!canShareSelected.value) {
    detailError.value = '승인된 회의록만 추가 공유할 수 있습니다.'
    return
  }
  share.value = {
    recipients: [],
    query: '',
    subject: `[회의록 공유] ${selected.value.title}`,
    body: buildMinutesShareBody(selected.value),
    error: '',
    sending: false,
  }
  shareOpen.value = true
}

function closeShare() {
  if (share.value.sending) return
  shareOpen.value = false
}

async function sendShare() {
  if (!selected.value || share.value.sending) return
  const recipientUserIds = share.value.recipients.map((recipient) => recipient.userId)
  if (recipientUserIds.length === 0) {
    share.value.error = '받는 사람을 1명 이상 선택하세요.'
    return
  }
  share.value.sending = true
  share.value.error = ''
  try {
    const shared = await shareMeetingMinutes(selected.value.meetingId, {
      recipientUserIds,
      subject: share.value.subject,
      body: share.value.body,
      idempotencyKey: randomUuid(),
    })
    detailByMeetingId.value = { ...detailByMeetingId.value, [shared.meetingId]: shared }
    replaceListItem(normalizeMinute(shared))
    shareOpen.value = false
  } catch (error) {
    share.value.error = error?.message || '회의록 공유 메일 발송에 실패했습니다.'
  } finally {
    share.value.sending = false
  }
}

function replaceListItem(next) {
  minuteItems.value = minuteItems.value.map((minute) => minute.meetingId === next.meetingId ? { ...minute, ...next } : minute)
}

function buildMinutesShareBody(minute) {
  const summary = String(minute?.summary || '').trim() || '요약이 없습니다.'
  const content = readableMinutesContent(minute?.content)
  return `안녕하세요,

${minute?.title || '회의록'} 회의록을 공유드립니다.

[회의 요약]
${summary}

[회의록 본문]
${content}`
}

function readableMinutesContent(value) {
  const text = extractTiptapText(value)
  if (text) return text
  return String(value || '').trim() || '본문이 없습니다.'
}

function normalizeMinute(raw) {
  const startedAt = raw.meetingStartedAt || null
  const endedAt = raw.meetingEndedAt || null
  const title = raw.meetingTitle || '회의록'
  return {
    id: raw.minutesId,
    minutesId: raw.minutesId,
    meetingId: raw.meetingId,
    reviewerUserId: raw.reviewerUserId,
    title,
    date: formatDate(startedAt || raw.approvedAt),
    duration: formatDuration(startedAt, endedAt),
    attendees: Number(raw.attendeeCount || 0),
    summary: raw.summary || '',
    content: raw.content || '',
    reviewer: raw.reviewerName || raw.reviewerDepartment || '-',
    reviewerDepartment: raw.reviewerDepartment || '',
    rawStatus: raw.status,
    statusLabel: statusLabel(raw.status),
    approvedAt: raw.approvedAt || null,
    favorite: Boolean(raw.favorite ?? favorites.value?.[raw.minutesId]),
  }
}

function statusLabel(status) {
  return {
    DRAFT: '초안',
    IN_REVIEW: '검토중',
    APPROVED: '승인됨',
    SHARED: '공유됨',
    DELETION_SCHEDULED: '삭제 예정',
  }[status] || status || '-'
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return '-'
  const minutes = Math.max(1, Math.round((new Date(endedAt) - new Date(startedAt)) / 60000))
  if (minutes < 60) return `${minutes}분`
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`
}

function formatOffset(ms) {
  if (!Number.isFinite(Number(ms))) return '--:--'
  const totalSeconds = Math.floor(Number(ms) / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function randomUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) => {
    const random = globalThis.crypto.getRandomValues(new Uint8Array(1))[0]
    return (Number(char) ^ (random & (15 >> (Number(char) / 4)))).toString(16)
  })
}
</script>
