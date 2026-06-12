<template>
  <section class="page minutes-page-full">
    <header class="page-header">
      <h1>내 회의록</h1>
      <p>AI가 자동 생성한 회의록 본문을 확인하고 수정한 뒤 내부 메일로 공유하세요.</p>
    </header>
    <div class="minute-layout">
      <MinuteList
        v-model:query="q"
        :items="filtered"
        :selected-id="selectedId"
        :favorites="favorites"
        @select="selectMinute"
      />
      <MinuteDetail
        v-if="selected"
        :minute="selected"
        :editing="editing"
        :favorites="favorites"
        :transcript-open="transcriptOpen"
        :transcript="mockTranscript"
        :loading="loading"
        :saving="saving"
        :error="error"
        :status-label="statusMeta.label"
        :status-tone="statusMeta.tone"
        @toggle-favorite="toggleFavorite"
        @start-edit="editing = true"
        @cancel-edit="cancelEdit"
        @save-edit="saveEdit"
        @toggle-transcript="transcriptOpen = !transcriptOpen"
        @share="openShare"
      />
    </div>
    <ShareMailModal v-if="shareOpen" :draft="share" :members="members" @close="shareOpen = false" @send="shareOpen = false" />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { fetchMinuteDetail, reviseMinuteDetail } from '../../api/minutes'
import MinuteDetail from '../../components/minutes/MinuteDetail.vue'
import MinuteList from '../../components/minutes/MinuteList.vue'
import ShareMailModal from '../../components/minutes/ShareMailModal.vue'
import { members, minutes, reviewMeta } from '../../data/mockData'

const mockTranscript = [
  { t: '00:00:08', who: '이지연', text: '오늘은 OKR 점검과 Q2 우선순위 재정렬을 진행하겠습니다.' },
  { t: '00:00:42', who: '박서연', text: '프로덕트팀 KR-1은 진행률 78%로, 6월 첫 주 완료 가능합니다.' },
  { t: '00:01:21', who: '정도현', text: '마케팅 측에서는 캠페인 일정을 한 주 당기는 것을 제안합니다.' },
  { t: '00:02:03', who: '이지연', text: '좋습니다. 일정 변경에 따른 리소스 영향은 박서연 책임이 정리해 주세요.' },
]

const minuteItems = ref(minutes.map((minute) => ({ ...minute })))
const selectedId = ref(minutes[0].id)
const q = ref('')
const shareOpen = ref(false)
const transcriptOpen = ref(false)
const editing = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const favorites = ref({ min1: true })
const share = ref({ recipients: members.slice(4, 7), query: '', subject: '', body: '' })
const detail = ref(null)

const filtered = computed(() => minuteItems.value.filter((minute) => minute.title.toLowerCase().includes(q.value.toLowerCase())))
const selectedMeta = computed(() => minuteItems.value.find((minute) => minute.id === selectedId.value) || minuteItems.value[0])
const selected = computed(() => {
  if (!selectedMeta.value) return null
  if (!detail.value || detail.value.meetingId !== selectedMeta.value.meetingId) return selectedMeta.value
  return { ...selectedMeta.value, ...detail.value }
})
const statusMeta = computed(() => reviewMeta[statusKey(selected.value?.status, selected.value?.reviewStatus)] || reviewMeta.draft)

watch(selectedId, async () => {
  editing.value = false
  await loadSelected()
})

onMounted(loadSelected)

async function loadSelected() {
  if (!selectedMeta.value) return
  loading.value = true
  error.value = ''
  try {
    detail.value = await fetchMinuteDetail(selectedMeta.value.meetingId)
    patchMinuteSummary(detail.value.summary)
  } catch (loadError) {
    error.value = loadError.message
  } finally {
    loading.value = false
  }
}

function selectMinute(id) {
  selectedId.value = id
}

function cancelEdit() {
  editing.value = false
  if (detail.value) {
    detail.value = { ...detail.value }
  }
}

async function saveEdit(draft) {
  if (!selectedMeta.value) return
  saving.value = true
  error.value = ''
  try {
    const saved = await reviseMinuteDetail(selectedMeta.value.meetingId, {
      summary: draft.summary,
      content: draft.content,
    })
    detail.value = { ...detail.value, ...saved }
    patchMinuteSummary(saved.summary)
    editing.value = false
  } catch (saveError) {
    error.value = saveError.message
  } finally {
    saving.value = false
  }
}

function patchMinuteSummary(summary) {
  minuteItems.value = minuteItems.value.map((minute) => (
    minute.id === selectedMeta.value.id
      ? { ...minute, summary, reviewStatus: statusKey(detail.value?.status, minute.reviewStatus) }
      : minute
  ))
}

function toggleFavorite(id) {
  favorites.value = { ...favorites.value, [id]: !favorites.value[id] }
}

function openShare() {
  if (!selected.value) return
  share.value.subject = `[회의록 공유] ${selected.value.title}`
  share.value.body = `안녕하세요,\n\n${selected.value.title} 회의록을 공유드립니다.\n\n[AI 요약]\n${selected.value.summary}\n\n확인 부탁드립니다.`
  shareOpen.value = true
}

function statusKey(status, fallback = 'draft') {
  return {
    DRAFT: 'draft',
    IN_REVIEW: 'reviewing',
    APPROVED: 'approved',
    SHARED: 'sent',
    DELETION_SCHEDULED: 'scheduled',
  }[status] || fallback
}
</script>
