<template>
  <article class="card recording-detail-panel">
    <header>
      <div>
        <div class="recording-title-row">
          <input v-if="editing" v-model="localDraft.title">
          <h2 v-else>{{ recording.title }}</h2>
          <button @click="$emit('toggle-favorite', recording.id)">{{ favorites[recording.id] ? '★' : '☆' }}</button>
        </div>
        <p>{{ recording.date }} · {{ recording.duration }} · 참석자 {{ recording.attendees }}명 · 검토자 {{ recording.reviewer }}</p>
      </div>
      <div class="recording-actions">
        <button class="secondary-button small">PDF 다운로드</button>
        <button v-if="!editing" class="secondary-button small" @click="$emit('start-edit')">수정</button>
        <button class="primary-button small" @click="$emit('share')">내부 메일 공유</button>
      </div>
    </header>
    <section class="ai-minutes-box">
      <strong>AI 요약 회의록 {{ editing ? '· 편집 중' : '' }}</strong>
      <template v-if="editing">
        <textarea v-model="localDraft.summary" rows="10"></textarea>
        <div class="modal-actions"><button class="secondary-button" @click="$emit('cancel-edit')">취소</button><button class="primary-button" @click="$emit('save-edit', localDraft)">수정 저장</button></div>
      </template>
      <template v-else>
        <p>{{ recording.summary }}</p>
        <div class="key-summary"><strong>핵심 요약</strong><ul><li>Q2 우선순위를 캠페인 일정 조정과 신규 제품 라인 PoC로 재정렬했습니다.</li><li>예산은 보수적으로 산정하되 디자인 리소스 영향 분석을 선행하기로 했습니다.</li><li>박서연 책임이 리소스 영향 분석 결과를 공유합니다.</li></ul></div>
      </template>
    </section>
    <button class="secondary-button" @click="$emit('toggle-transcript')">회의 원문 STT {{ transcriptOpen ? '닫기' : '보기' }}</button>
    <TranscriptBox v-if="transcriptOpen" :lines="transcript" />
  </article>
</template>

<script setup>
import { reactive, watch } from 'vue'
import TranscriptBox from './TranscriptBox.vue'

const props = defineProps({
  recording: { type: Object, required: true },
  editing: { type: Boolean, default: false },
  favorites: { type: Object, default: () => ({}) },
  transcriptOpen: { type: Boolean, default: false },
  transcript: { type: Array, required: true },
})

defineEmits(['toggle-favorite', 'start-edit', 'cancel-edit', 'save-edit', 'toggle-transcript', 'share'])

const localDraft = reactive({ title: props.recording.title, summary: props.recording.summary })

watch(() => props.recording, (recording) => {
  localDraft.title = recording.title
  localDraft.summary = recording.summary
})
</script>
