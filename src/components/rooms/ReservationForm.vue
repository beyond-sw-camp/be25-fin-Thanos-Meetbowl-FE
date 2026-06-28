<template>
  <form class="form-grid" @submit.prevent="$emit('submit')">
    <label>회의 제목<input v-model="form.title" required placeholder="회의 제목"></label>
    <div v-if="allowRemote && !roomUsageEnabled" class="room-usage-cta">
      <p>원격 회의로 진행 중입니다.</p>
      <button type="button" class="secondary-button" @click="$emit('enable-room-usage')">
        회의실 사용
      </button>
    </div>
    <template v-else>
      <div v-if="allowRemote" class="room-usage-bar">
        <span>회의실을 사용하려면 아래 현황을 확인하세요.</span>
        <button type="button" class="secondary-button small" @click="$emit('disable-room-usage')">
          원격 회의로 전환
        </button>
      </div>
      <label>
        회의실
        <AppSelect v-model="form.roomId">
          <option v-if="allowRemote" value="">회의실 없음 (원격)</option>
          <option v-for="room in rooms" :key="room.roomId" :value="room.roomId" :disabled="!room.isAvailable">
            {{ room.name }}{{ room.isAvailable ? '' : ' (사용 제한)' }}
          </option>
        </AppSelect>
      </label>
    </template>
    <div class="form-row two">
      <label>
        시작 날짜
        <input type="date" v-model="form.date" @input="$emit('schedule-field-edited', 'date')">
      </label>
      <label>
        종료 날짜
        <input type="date" v-model="form.endDate" @input="$emit('schedule-field-edited', 'endDate')">
      </label>
    </div>
    <div class="form-row two">
      <label>
        시작 시간
        <input type="time" v-model="form.start" @input="$emit('schedule-field-edited', 'start')">
      </label>
      <label>
        종료 시간
        <input type="time" v-model="form.end" @input="$emit('schedule-field-edited', 'end')">
      </label>
    </div>

    <UserSearchPicker
      v-model="form.attendees"
      :fixed-user-ids="hostUserId ? [hostUserId] : []"
      :validate-add="attendeeValidate"
      :warning="attendeeWarning"
      @reject="$emit('attendee-reject', $event)"
    />

    <label>
      회의록 검토자
      <AppSelect v-model="form.reviewerUserId">
        <option value="">검토자 미지정</option>
        <option
          v-for="attendee in reviewerOptions"
          :key="attendee.userId"
          :value="attendee.userId"
        >
          {{ attendee.name }}
        </option>
      </AppSelect>
      <small>참석자 중 회의록을 검토할 1명을 지정합니다.</small>
    </label>

    <div class="external-invitee-section">
      <div class="external-invitee-header">
        <strong>외부 초대</strong>
      </div>
      <div class="external-invitee-inputs">
        <label>
          이름
          <input
            :value="form.externalInviteeName"
            type="text"
            placeholder="외부 참석자 이름"
            @input="$emit('update:external-invitee-name', $event.target.value)"
            @keydown.enter.prevent="$emit('add-external-invitee')"
          >
        </label>
        <label>
          이메일
          <input
            :value="form.externalInviteeEmail"
            type="email"
            placeholder="guest@example.com"
            @input="$emit('update:external-invitee-email', $event.target.value)"
            @keydown.enter.prevent="$emit('add-external-invitee')"
          >
        </label>
        <button type="button" class="secondary-button" @click="$emit('add-external-invitee')">
          추가
        </button>
      </div>
      <div v-if="form.externalInvitees?.length" class="external-invitee-chips">
        <span
          v-for="invitee in form.externalInvitees"
          :key="`${invitee.email}-${invitee.name}`"
          class="external-invitee-chip"
        >
          {{ invitee.name }}
          <small>&lt;{{ invitee.email }}&gt;</small>
          <button type="button" aria-label="외부 참석자 제거" @click="$emit('remove-external-invitee', invitee.email)">
            ×
          </button>
        </span>
      </div>
    </div>

    <label>회의 내용<textarea v-model="form.content" rows="4" placeholder="회의 목적과 안건"></textarea></label>
    <slot name="actions" />
  </form>
</template>

<script setup>
import { computed } from 'vue'
import AppSelect from '../common/AppSelect.vue'
import UserSearchPicker from './UserSearchPicker.vue'

const props = defineProps({
  form: { type: Object, required: true },
  rooms: { type: Array, default: () => [] },
  myUserId: { type: String, default: '' },
  hostUserId: { type: String, default: '' },
  roomUsageEnabled: { type: Boolean, default: false },
  // 원격 회의 토글 노출 여부. 회의 페이지에서만 true, 회의실 예약에서는 false.
  allowRemote: { type: Boolean, default: false },
  // 참석자 추가 직전 비동기 검증 훅(시간 겹침 검사). UserSearchPicker로 그대로 전달한다.
  attendeeValidate: { type: Function, default: null },
  // 참석자 겹침 경고 문구. '참석자 검색' 라벨 위 오버레이로 표시한다.
  attendeeWarning: { type: String, default: '' },
})
defineEmits([
  'submit',
  'enable-room-usage',
  'disable-room-usage',
  'attendee-reject',
  'add-external-invitee',
  'remove-external-invitee',
  'update:external-invitee-name',
  'update:external-invitee-email',
  'schedule-field-edited',
])
const reviewerOptions = computed(() => props.form.attendees.filter((attendee) => attendee.userId))
</script>

<style scoped>
.room-usage-cta {
  display: grid;
  gap: 10px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: #fff7ed;
  padding: 14px;
}
.room-usage-cta p {
  margin: 0;
  color: var(--foreground);
  font-size: 13px;
  line-height: 1.5;
}
.room-usage-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--muted);
  padding: 10px 12px;
  color: var(--muted-foreground);
  font-size: 12px;
}
.room-usage-bar span {
  min-width: 0;
}
.external-invitee-section {
  display: grid;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface, #fff);
  padding: 14px;
}
.external-invitee-header {
  display: grid;
  gap: 4px;
}
.external-invitee-header strong {
  font-size: 14px;
}
.external-invitee-header small {
  color: var(--muted-foreground);
}
.external-invitee-inputs {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: end;
}
.external-invitee-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.external-invitee-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: #f3f4f6;
  color: var(--foreground);
  padding: 8px 12px;
  font-size: 13px;
  white-space: nowrap;
}
.external-invitee-chip small {
  color: var(--muted-foreground);
}
.external-invitee-chip button {
  border: 0;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}
@media (max-width: 720px) {
  .external-invitee-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
