<template>
  <form class="form-grid reservation-form-grid" @submit.prevent="$emit('submit')">
    <label>회의 제목<input v-model="form.title" required placeholder="회의 제목을 입력하세요"></label>
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
      <span v-if="reviewerWarning" class="reservation-inline-warning" role="alert">
        <span class="reservation-inline-warning__icon">!</span>
        <span>{{ reviewerWarning }}</span>
      </span>
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

    <label>회의 내용 <span class="field-optional">(선택)</span><textarea v-model="form.content" rows="4" placeholder="회의의 목적, 주요 의제, 참고 사항을 입력하세요"></textarea></label>
    <div class="reservation-form-footer">
      <div v-if="generalWarning" class="reservation-inline-warning reservation-inline-warning--footer" role="alert">
        <span class="reservation-inline-warning__icon">!</span>
        <span>{{ generalWarning }}</span>
      </div>
      <slot name="actions" />
    </div>
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
  generalWarning: { type: String, default: '' },
  reviewerWarning: { type: String, default: '' },
})
defineEmits([
  'submit',
  'enable-room-usage',
  'disable-room-usage',
  'attendee-reject',
  'schedule-field-edited',
])
const reviewerOptions = computed(() => props.form.attendees.filter((attendee) => attendee.userId))
</script>

<style scoped>
.reservation-form-grid {
  gap: 16px;
}

.reservation-inline-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #fdba74;
  border-radius: 12px;
  background: #fff7ed;
  color: #c2410c;
  padding: 11px 13px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}

.reservation-inline-warning__icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.12);
  color: #ea580c;
  font-size: 12px;
  font-weight: 900;
  flex-shrink: 0;
}

.reservation-inline-warning--footer {
  max-width: min(520px, 100%);
}

.reservation-form-grid > label,
.reservation-form-grid :deep(.member-picker) {
  display: grid;
  gap: 8px;
}

.reservation-form-grid > label {
  color: var(--foreground);
  font-size: 14px;
  font-weight: 700;
}

.reservation-form-grid > label .field-optional {
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 500;
}

.reservation-form-grid > label input,
.reservation-form-grid > label textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 12px 14px;
  color: var(--foreground);
  font: inherit;
}

.reservation-form-grid > label input {
  min-height: 46px;
}

.reservation-form-grid > label textarea {
  min-height: 116px;
  resize: vertical;
}

.reservation-form-grid > label :deep(.app-select-wrap) {
  width: 100%;
}

.reservation-form-grid > label :deep(.app-select) {
  min-height: 46px;
  border-radius: 12px;
}

.reservation-form-grid > label small {
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 500;
}

.reservation-form-grid .form-row.two {
  gap: 14px;
}

.reservation-form-grid .modal-actions {
  padding-top: 8px;
  margin-left: auto;
}

.reservation-form-grid .modal-actions .secondary-button,
.reservation-form-grid .modal-actions .primary-button {
  min-width: 132px;
  min-height: 46px;
  border-radius: 12px;
}

.reservation-form-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-top: 8px;
}

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
  border-radius: 14px;
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
.external-invitee-header strong span {
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 500;
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
  .reservation-form-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .reservation-inline-warning--footer {
    max-width: none;
  }

  .reservation-form-grid .modal-actions {
    margin-left: 0;
  }

  .external-invitee-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
