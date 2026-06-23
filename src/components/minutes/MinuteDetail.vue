<template>
  <article class="card minute-detail-panel">
    <header>
      <div>
        <div class="minute-title-row">
          <h2>{{ minute.title }}</h2>
          <button @click="$emit('toggle-favorite', minute.id)">{{ favorites[minute.id] ? '★' : '☆' }}</button>
        </div>
        <p>{{ minute.date }} · {{ minute.duration }} · 참석자 {{ minute.attendees }}명 · 검토자 {{ minute.reviewer }}</p>
        <small class="minute-status">상태: {{ minute.statusLabel }}</small>
      </div>
      <div class="minute-actions">
        <button class="secondary-button small">PDF 다운로드</button>
        <button v-if="!editing" class="secondary-button small" :disabled="!canEdit || actionPending" @click="$emit('start-edit')">수정</button>
        <button class="primary-button small" :disabled="!canApprove || actionPending" @click="$emit('approve')">승인</button>
        <button class="primary-button small" @click="$emit('share')">내부 메일 공유</button>
      </div>
    </header>
    <section class="ai-minutes-box">
      <strong>AI 요약 회의록 {{ editing ? '· 편집 중' : '' }}</strong>
      <template v-if="editing">
        <label class="minute-edit-label">요약</label>
        <textarea v-model="localDraft.summary" rows="5"></textarea>
        <label class="minute-edit-label">본문</label>
        <MinutesEditor v-model="localDraft.content" :disabled="actionPending" />
        <div class="modal-actions">
          <button class="secondary-button" :disabled="actionPending" @click="$emit('cancel-edit')">취소</button>
          <button class="primary-button" :disabled="actionPending" @click="$emit('save-edit', { ...localDraft })">수정 저장</button>
        </div>
      </template>
      <template v-else>
        <p>{{ minute.summary }}</p>
        <div class="key-summary">
          <strong>회의록 본문</strong>
          <pre>{{ minute.contentText || '본문이 없습니다.' }}</pre>
        </div>
      </template>
    </section>
    <button class="secondary-button" :disabled="transcriptLoading" @click="$emit('toggle-transcript')">회의 원문 STT {{ transcriptOpen ? '닫기' : '보기' }}</button>
    <div v-if="transcriptError" class="empty-state">{{ transcriptError }}</div>
    <TranscriptBox v-if="transcriptOpen" :lines="transcript" />
  </article>
</template>

<script setup>
import { defineAsyncComponent, reactive, watch } from 'vue'
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
  actionPending: { type: Boolean, default: false },
})

defineEmits(['toggle-favorite', 'start-edit', 'cancel-edit', 'save-edit', 'approve', 'toggle-transcript', 'share'])

const localDraft = reactive({ summary: props.minute.summary, content: props.minute.content })

watch(() => props.minute, (minute) => {
  localDraft.summary = minute.summary
  localDraft.content = minute.content
})
</script>
