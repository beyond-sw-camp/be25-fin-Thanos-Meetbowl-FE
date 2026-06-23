<template>
  <aside class="reservation-timeline">
    <header class="reservation-timeline-head">
      <h3>회의실 예약 현황</h3>
      <p>{{ range.start }}~{{ range.end }} 선택 기준</p>
    </header>

    <div class="toolbar">
      <button
        v-for="tab in siteTabs"
        :key="tab"
        class="chip"
        :class="{ active: siteFilter === tab }"
        type="button"
        @click="siteFilter = tab"
      >
        {{ tab }}
      </button>
    </div>

    <div class="room-timeline-scroll" :style="{ '--hour-px': TIMELINE.hourPx + 'px' }">
      <div class="room-time-header">
        <div class="room-name-spacer">회의실</div>
        <div class="room-hours"><span v-for="hour in timelineHours" :key="hour">{{ String(hour).padStart(2, '0') }}:00</span></div>
      </div>
      <RoomTimelineRow
        v-for="room in filteredRooms"
        :key="room.roomId"
        :room="room"
        :blocks="blocksByRoom[room.roomId] || []"
        :name-map="nameMap"
        show-availability
        selectable
        :selected-range="range"
        :preview-block="room.roomId === selectedRoomId ? previewBlock : null"
        :show-empty-label="false"
        :selected="room.roomId === selectedRoomId"
        @select="$emit('select-room', $event)"
        @select-range="forwardSelectRange"
      />
      <div v-if="!filteredRooms.length" class="empty-state-inline">표시할 회의실이 없습니다.</div>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import RoomTimelineRow from './RoomTimelineRow.vue'
import { TIMELINE, timelineHours } from '../../utils/timeline'

const props = defineProps({
  rooms: { type: Array, default: () => [] },
  blocksByRoom: { type: Object, default: () => ({}) },
  nameMap: { type: Object, default: () => ({}) },
  range: { type: Object, required: true },
  selectedRoomId: { type: String, default: '' },
  previewBlock: { type: Object, default: null },
})
const emit = defineEmits(['select-room', 'select-range'])

const siteFilter = ref('전체')
const siteTabs = computed(() => ['전체', ...new Set(props.rooms.map((room) => room.siteName).filter(Boolean))])
const filteredRooms = computed(() =>
  siteFilter.value === '전체' ? props.rooms : props.rooms.filter((room) => room.siteName === siteFilter.value),
)

function forwardSelectRange(roomId, start, end) {
  emit('select-range', roomId, start, end)
}
</script>

<style scoped>
.reservation-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--muted);
  padding: 16px;
}
.reservation-timeline-head h3 {
  margin: 0;
  font-size: 15px;
}
.reservation-timeline-head p {
  margin: 4px 0 0;
  color: var(--muted-foreground);
  font-size: 13px;
}
.room-name-spacer {
  display: flex;
  align-items: center;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted-foreground);
}
</style>
