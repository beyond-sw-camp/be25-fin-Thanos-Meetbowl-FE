<template>
  <article class="card minute-detail-panel">
    <header>
      <div>
        <div class="minute-title-row">
          <input v-if="editing" v-model="localDraft.title">
          <h2 v-else>{{ minute.title }}</h2>
          <span class="badge" :class="statusTone">{{ statusLabel }}</span>
          <button @click="$emit('toggle-favorite', minute.id)">{{ favorites[minute.id] ? '★' : '☆' }}</button>
        </div>
        <p>{{ minute.date }} · {{ minute.duration }} · 참석자 {{ minute.attendees }}명 · 검토자 {{ minute.reviewer }}</p>
      </div>
      <div class="minute-actions">
        <button class="secondary-button small" disabled>PDF 다운로드</button>
        <button v-if="!editing" class="secondary-button small" :disabled="loading" @click="$emit('start-edit')">수정</button>
        <button class="primary-button small" :disabled="loading" @click="$emit('share')">내부 메일 공유</button>
      </div>
    </header>

    <div v-if="error" class="error-box minute-error-box">{{ error }}</div>

    <section class="ai-minutes-box">
      <div class="minutes-section-head">
        <strong>AI 회의록 {{ editing ? '· 편집 중' : '' }}</strong>
        <small>승인 시 이 본문이 저장되고 AI 색인으로 전달됩니다.</small>
      </div>

      <label class="minutes-summary-field">
        <span>요약</span>
        <textarea v-if="editing" v-model="localDraft.summary" rows="4"></textarea>
        <p v-else>{{ minute.summary }}</p>
      </label>

      <div v-if="loading" class="minute-loading-state">회의록 본문을 불러오는 중입니다.</div>
      <MinutesDocumentEditor v-else v-model="localDraft.content" :editable="editing" />

      <div v-if="editing" class="modal-actions">
        <button class="secondary-button" :disabled="saving" @click="$emit('cancel-edit')">취소</button>
        <button class="primary-button" :disabled="saving" @click="$emit('save-edit', localDraft)">
          {{ saving ? '저장 중...' : '수정 저장' }}
        </button>
      </div>
    </section>

    <button class="secondary-button" @click="$emit('toggle-transcript')">회의 원문 STT {{ transcriptOpen ? '닫기' : '보기' }}</button>
    <TranscriptBox v-if="transcriptOpen" :lines="transcript" />
  </article>
</template>

<script setup>
import { reactive, watch } from 'vue'
import MinutesDocumentEditor from './MinutesDocumentEditor.vue'
import TranscriptBox from './TranscriptBox.vue'

const props = defineProps({
  minute: { type: Object, required: true },
  editing: { type: Boolean, default: false },
  favorites: { type: Object, default: () => ({}) },
  transcriptOpen: { type: Boolean, default: false },
  transcript: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
  statusLabel: { type: String, default: '초안' },
  statusTone: { type: String, default: '' },
})

defineEmits(['toggle-favorite', 'start-edit', 'cancel-edit', 'save-edit', 'toggle-transcript', 'share'])

const localDraft = reactive({ title: props.minute.title, summary: props.minute.summary, content: props.minute.content || '' })

watch(() => props.minute, (minute) => {
  localDraft.title = minute.title
  localDraft.summary = minute.summary
  localDraft.content = minute.content || ''
}, { deep: true })
</script>
