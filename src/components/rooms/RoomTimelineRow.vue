<template>
  <div class="room-row" :class="{ restricted: !room.isAvailable, selected }">
    <div class="room-row-meta">
      <strong>{{ room.name }}</strong>
      <small>{{ room.siteName }} · {{ room.buildingName }} · {{ room.floor === null ? '-' : room.floor + '층' }} · {{ room.capacity }}명</small>
      <em v-if="!room.isAvailable" class="badge warning">사용 제한</em>
      <em v-else-if="showAvailability" class="badge" :class="available ? 'success' : 'danger'">{{ available ? '가능' : '불가' }}</em>
    </div>
    <div class="room-track" @click="onTrackClick">
      <span v-for="hour in timelineHours" :key="hour" class="hour-line"></span>
      <span class="now-marker" :style="nowMarkerStyle()"><em>현재</em></span>
      <ReservationBlock
        v-for="block in blocks"
        :key="block.meetingId"
        :block="block"
        :name-map="nameMap"
        @select="$emit('block-click', block)"
      />
      <span v-if="!blocks.length" class="room-track-empty" :class="{ restricted: !room.isAvailable }">
        {{ room.isAvailable ? '예약 없음' : '사용 제한' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ReservationBlock from './ReservationBlock.vue'
import { nowMarkerStyle, slotTimeFromOffset, timelineHours } from '../../utils/timeline'
import { overlaps } from '../../utils/dateTime'

const props = defineProps({
  room: { type: Object, required: true },
  blocks: { type: Array, default: () => [] },
  nameMap: { type: Object, default: () => ({}) },
  showAvailability: { type: Boolean, default: false },
  selectedRange: { type: Object, default: null },
  selected: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
})
const emit = defineEmits(['block-click', 'track-click', 'select'])

// 폼이 고른 시간대(selectedRange)와 겹치는 예약이 없으면 '가능'. start/end만 바뀌어도 즉시 재계산된다.
const available = computed(() => {
  if (!props.selectedRange) return true
  return !props.blocks.some((block) =>
    overlaps(props.selectedRange.start, props.selectedRange.end, block.start, block.end),
  )
})

function onTrackClick(event) {
  if (props.selectable) {
    emit('select', props.room.roomId)
    return
  }
  const rect = event.currentTarget.getBoundingClientRect()
  emit('track-click', props.room.roomId, slotTimeFromOffset(event.clientX - rect.left))
}
</script>

<style scoped>
/* 사용 가능 회의실 행 */
.room-row:not(.restricted) {
  background: #ffffff;
}
/* 사용 제한 회의실 */
.room-row.selected:not(.restricted) {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
  border-radius: 8px;
}
/* 가능/사용 제한 뱃지 */
.room-row-meta .badge {
  justify-self: start;
}
.badge.danger {
  background: #fef2f2;
  color: var(--danger);
}
.room-track-empty {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  text-align: center;
  color: var(--muted-foreground);
  font-size: 16px;
  font-weight: 500;
}
/* 사용 제한 회의실 트랙 안내 */
.room-track-empty.restricted {
  color: var(--warning);
  font-weight: 600;
}
</style>
