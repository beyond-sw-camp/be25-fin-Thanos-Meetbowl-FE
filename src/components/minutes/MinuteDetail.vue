<template>
  <article class="card minute-detail-panel">
    <header>
      <div class="minute-heading">
        <div class="minute-title-row">
          <h2>{{ minute.title }}</h2>
          <button class="minute-favorite-button" aria-label="즐겨찾기 전환" @click="$emit('toggle-favorite', minute.id)">
            {{ favorites[minute.id] ? '★' : '☆' }}
          </button>
        </div>
        <div class="minute-meta-list">
          <span class="minute-meta-item">{{ minute.date }}</span>
          <span class="minute-meta-item">{{ minute.duration }}</span>
          <button type="button" class="minute-meta-chip minute-meta-participants" @click="openParticipants">
            <small>참여자</small>
            <strong>{{ minute.attendees }}명</strong>
          </button>
          <span class="minute-meta-chip">
            <small>검토자</small>
            <strong>{{ minute.reviewer }}</strong>
          </span>
          <span class="minute-status">{{ minute.statusLabel }}</span>
        </div>
      </div>
      <div class="minute-actions">
        <button class="secondary-button minute-action-button" :disabled="pdfPending || editing" @click="downloadPdf">
          {{ pdfPending ? 'PDF 생성 중...' : 'PDF 다운로드' }}
        </button>
        <button v-if="!editing" class="secondary-button minute-action-button" :disabled="!canEdit || actionPending" @click="$emit('start-edit')">수정</button>
        <button class="primary-button minute-action-button" :disabled="!canApprove || actionPending" @click="$emit('approve')">승인</button>
        <button class="primary-button minute-action-button" :disabled="!canShare || actionPending" @click="$emit('share')">내부 메일 공유</button>
      </div>
    </header>
    <section class="ai-minutes-box">
      <template v-if="editing">
        <div class="minutes-section-heading">
          <span>AI 요약 회의록</span>
          <small>편집 중</small>
        </div>
        <label class="minute-edit-label">요약</label>
        <textarea v-model="localDraft.summary" rows="5"></textarea>
        <label class="minute-edit-label">본문</label>
        <MinutesEditor v-model="localDraft.content" :disabled="actionPending" />
        <div class="modal-actions minutes-edit-actions">
          <button class="secondary-button minutes-edit-action-button" :disabled="actionPending" @click="$emit('cancel-edit')">취소</button>
          <button class="primary-button minutes-edit-action-button" :disabled="actionPending" @click="$emit('save-edit', { ...localDraft })">수정 저장</button>
        </div>
      </template>
      <template v-else>
        <section class="minutes-document-section">
          <h3>회의 요약</h3>
          <p class="minutes-summary-text">{{ minute.summary || '요약이 없습니다.' }}</p>
        </section>
        <section ref="pdfContent" class="key-summary minutes-document-section">
          <h3>회의록 본문</h3>
          <MinutesEditor
            v-if="minute.content"
            :model-value="minute.content"
            readonly
          />
          <p v-else class="minutes-empty-content">본문이 없습니다.</p>
        </section>
        <p v-if="pdfError" class="minutes-pdf-error">{{ pdfError }}</p>
      </template>
    </section>
    <button class="secondary-button" :disabled="transcriptLoading" @click="$emit('toggle-transcript')">회의 원문 STT {{ transcriptOpen ? '닫기' : '보기' }}</button>
    <div v-if="transcriptError" class="empty-state">{{ transcriptError }}</div>
    <TranscriptBox v-if="transcriptOpen" :lines="transcript" />
    <MinutesParticipantsModal
      v-if="participantsOpen"
      :meeting-title="minute.title"
      :participants="participants"
      :loading="participantsLoading"
      :error="participantsError"
      @close="participantsOpen = false"
      @retry="loadParticipants"
    />
  </article>
</template>

<script setup>
import { defineAsyncComponent, reactive, ref, watch } from 'vue'
import { getMeeting } from '../../lib/reservations'
import { getUserSummary } from '../../lib/users'
import { downloadMinutesPdf } from '../../lib/minutes-pdf'
import MinutesParticipantsModal from './MinutesParticipantsModal.vue'
import TranscriptBox from './TranscriptBox.vue'

const MinutesEditor = defineAsyncComponent(() => import('./MinutesEditor.vue'))

const props = defineProps({
  minute: { type: Object, required: true },
  editing: { type: Boolean, default: false },
  favorites: { type: Object, default: () => ({}) },
  transcriptOpen: { type: Boolean, default: false },
  transcript: { type: Array, required: true },
  transcriptLoading: { type: Boolean, default: false },
  transcriptError: { type: String, default: '' },
  canEdit: { type: Boolean, default: false },
  canApprove: { type: Boolean, default: false },
  canShare: { type: Boolean, default: false },
  actionPending: { type: Boolean, default: false },
})

defineEmits(['toggle-favorite', 'start-edit', 'cancel-edit', 'save-edit', 'approve', 'toggle-transcript', 'share'])

const localDraft = reactive({ summary: props.minute.summary, content: props.minute.content })
const pdfContent = ref(null)
const pdfPending = ref(false)
const pdfError = ref('')
const participantsOpen = ref(false)
const participantsLoading = ref(false)
const participantsError = ref('')
const participants = ref([])

watch(() => props.minute, (minute) => {
  localDraft.summary = minute.summary
  localDraft.content = minute.content
  pdfError.value = ''
  participantsOpen.value = false
  participants.value = []
  participantsError.value = ''
})

async function openParticipants() {
  participantsOpen.value = true
  if (!participants.value.length && !participantsLoading.value) {
    await loadParticipants()
  }
}

async function loadParticipants() {
  participantsLoading.value = true
  participantsError.value = ''
  try {
    const meeting = await getMeeting(props.minute.meetingId)
    const attendees = meeting?.attendees || []
    const summaries = await Promise.all(
      attendees.map(async (attendee) => {
        try {
          return await getUserSummary(attendee.userId)
        } catch {
          return null
        }
      }),
    )
    participants.value = attendees
      .map((attendee, index) => ({
        ...attendee,
        ...(summaries[index] || {}),
        name: summaries[index]?.name || '이름 미확인',
      }))
      .sort((left, right) => {
        if (left.role === 'HOST' && right.role !== 'HOST') return -1
        if (right.role === 'HOST' && left.role !== 'HOST') return 1
        if (left.reviewer !== right.reviewer) return left.reviewer ? -1 : 1
        return left.name.localeCompare(right.name, 'ko')
      })
  } catch (error) {
    participants.value = []
    participantsError.value = error?.message || '참여자 정보를 불러오지 못했습니다.'
  } finally {
    participantsLoading.value = false
  }
}

async function downloadPdf() {
  if (pdfPending.value) return
  pdfPending.value = true
  pdfError.value = ''
  try {
    await downloadMinutesPdf({
      minute: props.minute,
      contentElement: pdfContent.value,
    })
  } catch (error) {
    pdfError.value = error?.message || 'PDF 파일을 생성하지 못했습니다.'
  } finally {
    pdfPending.value = false
  }
}
</script>
