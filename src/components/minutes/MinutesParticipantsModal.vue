<template>
  <ModalShell modal-class="minutes-participants-modal" @close="$emit('close')">
    <header>
      <div>
        <h2>회의 참여자</h2>
        <p>{{ meetingTitle }}</p>
      </div>
      <button type="button" aria-label="참여자 모달 닫기" @click="$emit('close')">✕</button>
    </header>

    <div class="minutes-participants-body">
      <div v-if="loading" class="minutes-participants-state">참여자 정보를 불러오는 중입니다.</div>
      <div v-else-if="error" class="minutes-participants-state error">
        <p>{{ error }}</p>
        <button type="button" class="secondary-button minute-action-button" @click="$emit('retry')">다시 시도</button>
      </div>
      <template v-else>
        <p class="minutes-participants-note">
          실제 접속 기록이 아닌 회의에 등록된 참여자 기준입니다.
        </p>
        <div v-if="participants.length" class="minutes-participants-list">
          <article v-for="participant in participants" :key="participant.userId" class="minutes-participant-row">
            <span class="minutes-participant-avatar">{{ initials(participant.name) }}</span>
            <div class="minutes-participant-copy">
              <strong>{{ participant.name }}</strong>
              <small>{{ organizationLabel(participant) }}</small>
              <span>{{ participant.email || participant.loginId || '연락처 정보 없음' }}</span>
            </div>
            <div class="minutes-participant-badges">
              <span v-if="participant.role === 'HOST'" class="badge success">주최자</span>
              <span v-else class="badge navy">참여자</span>
              <span v-if="participant.reviewer" class="badge warning">검토자</span>
            </div>
          </article>
        </div>
        <div v-else class="minutes-participants-state">등록된 참여자가 없습니다.</div>
      </template>
    </div>

    <footer>
      <span>총 {{ participants.length }}명</span>
      <button type="button" class="secondary-button minute-action-button" @click="$emit('close')">닫기</button>
    </footer>
  </ModalShell>
</template>

<script setup>
import ModalShell from '../common/ModalShell.vue'

defineProps({
  meetingTitle: { type: String, default: '회의록' },
  participants: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

defineEmits(['close', 'retry'])

function initials(name) {
  const value = String(name || '참여자').trim()
  return value.slice(0, 2) || '참'
}

function organizationLabel(participant) {
  return [
    participant.affiliate,
    participant.department,
    participant.team,
    participant.position,
  ].filter(Boolean).join(' · ') || '소속 정보 없음'
}
</script>
