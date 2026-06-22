<template>
  <section class="realtime-feedback-panel" aria-labelledby="realtime-feedback-title">
    <header class="realtime-feedback-header">
      <div>
        <span class="realtime-feedback-eyebrow">Meetbowl AI</span>
        <h2 id="realtime-feedback-title">실시간 피드백</h2>
      </div>
      <span v-if="feedbacks.length" class="realtime-feedback-count">
        {{ feedbacks.length }}건
      </span>
    </header>

    <div
      v-if="feedbacks.length"
      class="realtime-feedback-list"
      aria-live="polite"
      aria-relevant="additions"
    >
      <article
        v-for="(feedback, index) in feedbacks"
        :key="feedback.feedbackId"
        class="realtime-feedback-card"
        :class="{ latest: index === 0 }"
      >
        <div class="realtime-feedback-meta">
          <span class="realtime-feedback-type">
            {{ feedbackTypeLabel(feedback.feedbackType) }}
          </span>
          <time :datetime="feedback.generatedAt">
            {{ formatKstTime(feedback.generatedAt) }}
          </time>
        </div>

        <p class="realtime-feedback-message">{{ feedback.message }}</p>

        <details v-if="feedback.sources.length" class="realtime-feedback-sources">
          <summary>근거 회의록 {{ feedback.sources.length }}건</summary>
          <ul>
            <li v-for="source in feedback.sources" :key="source.minutesId">
              <div class="realtime-feedback-source-heading">
                <strong>{{ source.title || '관련 회의록' }}</strong>
                <time v-if="source.meetingDate" :datetime="source.meetingDate">
                  {{ source.meetingDate }}
                </time>
              </div>
              <p v-if="source.snippet">{{ source.snippet }}</p>
            </li>
          </ul>
        </details>
      </article>
    </div>

    <p v-else class="realtime-feedback-empty" role="status">
      <template v-if="connected">
        관련된 이전 논의가 감지되면 이곳에 피드백이 표시됩니다.
      </template>
      <template v-else>
        회의 연결이 완료되면 실시간 피드백을 받을 수 있습니다.
      </template>
    </p>
  </section>
</template>

<script setup>
import { formatKstTime } from '../../utils/dateTime'

defineProps({
  feedbacks: { type: Array, default: () => [] },
  connected: { type: Boolean, default: false },
})

const FEEDBACK_TYPE_LABELS = {
  DECISION_REMINDER: '이전 결정',
  DUPLICATE_DISCUSSION: '유사 논의',
  RESOLVED_TOPIC: '해결된 안건',
}

function feedbackTypeLabel(type) {
  return FEEDBACK_TYPE_LABELS[type] || '회의 참고'
}
</script>

<style scoped>
.realtime-feedback-panel {
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(243, 115, 33, .34);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(243, 115, 33, .12), rgba(255, 255, 255, .04));
}

.realtime-feedback-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, .08);
  padding: 12px 14px;
}

.realtime-feedback-header div {
  display: grid;
  gap: 2px;
}

.realtime-feedback-eyebrow {
  color: rgba(255, 255, 255, .48);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.realtime-feedback-header h2 {
  margin: 0;
  color: white;
  font-size: 14px;
}

.realtime-feedback-count {
  border-radius: 999px;
  background: rgba(243, 115, 33, .2);
  padding: 4px 8px;
  color: #fdba74;
  font-size: 11px;
  font-weight: 800;
}

.realtime-feedback-list {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 10px;
  overflow-y: auto;
  padding: 10px;
  scrollbar-gutter: stable;
}

.realtime-feedback-card {
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 10px;
  background: rgba(9, 9, 11, .46);
  padding: 12px;
}

.realtime-feedback-card.latest {
  border-color: rgba(243, 115, 33, .42);
  box-shadow: inset 3px 0 0 rgba(243, 115, 33, .8);
}

.realtime-feedback-meta,
.realtime-feedback-source-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.realtime-feedback-meta time,
.realtime-feedback-source-heading time {
  flex: 0 0 auto;
  color: rgba(255, 255, 255, .4);
  font-size: 10px;
}

.realtime-feedback-type {
  color: #fdba74;
  font-size: 11px;
  font-weight: 800;
}

.realtime-feedback-message {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, .9);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.realtime-feedback-sources {
  margin-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, .08);
  padding-top: 9px;
}

.realtime-feedback-sources summary {
  color: rgba(255, 255, 255, .58);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}

.realtime-feedback-sources ul {
  display: grid;
  gap: 8px;
  margin: 9px 0 0;
  padding: 0;
  list-style: none;
}

.realtime-feedback-sources li {
  border-radius: 8px;
  background: rgba(255, 255, 255, .05);
  padding: 9px;
}

.realtime-feedback-source-heading strong {
  min-width: 0;
  overflow: hidden;
  color: rgba(255, 255, 255, .78);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.realtime-feedback-sources li p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, .52);
  font-size: 11px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.realtime-feedback-empty {
  align-self: center;
  margin: 0;
  padding: 18px 14px;
  color: rgba(255, 255, 255, .48);
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}
</style>
