<template>
  <aside class="reservation-timeline">
    <header class="reservation-timeline-head">
      <div class="reservation-timeline-copy">
        <h3>회의실 예약 현황</h3>
        <p>선택한 시간대의 회의실 이용 가능 여부를 확인하세요.</p>
      </div>
      <span class="reservation-timeline-range">{{ range.start }} ~ {{ range.end }} 선택 기준</span>
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
        v-for="(room, index) in filteredRooms"
        :key="room.roomId"
        :room="room"
        :blocks="blocksByRoom[room.roomId] || []"
        :name-map="nameMap"
        :date="date"
        show-availability
        selectable
        :selected-range="range"
        :preview-block="room.roomId === selectedRoomId ? previewBlock : null"
        :show-empty-label="false"
        :show-now-label="index === 0"
        show-now-time
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
  // 타임라인이 보고 있는 날짜(KST 'YYYY-MM-DD'). '현재' 마커를 오늘일 때만 표시하기 위해 자식에 전달.
  date: { type: String, default: '' },
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
  gap: 0;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: #fff;
  overflow: hidden;
}
.reservation-timeline-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 22px 22px 14px;
}
.reservation-timeline-copy {
  display: grid;
  gap: 6px;
}
.reservation-timeline-head h3 {
  margin: 0;
  font-size: 18px;
}
.reservation-timeline-head p {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 13px;
}
.reservation-timeline-range {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.toolbar {
  display: flex;
  gap: 10px;
  padding: 0 22px 14px;
}
.chip {
  min-height: 34px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  padding: 0 14px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}
.chip.active {
  border-color: rgba(243, 115, 33, 0.5);
  background: #fff7ed;
  color: var(--primary);
}
.reservation-timeline :deep(.room-timeline-scroll) {
  border-top: 1px solid var(--border);
  background: #fff;
}
.reservation-timeline :deep(.room-hours span) {
  place-items: center;
  padding-left: 0;
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  min-height: 48px;
}
.reservation-timeline :deep(.room-row-meta) {
  min-height: 152px;
  gap: 8px;
  padding: 18px 18px 16px;
}
.reservation-timeline :deep(.room-row-meta strong) {
  font-size: 15px;
  line-height: 1.3;
}
.reservation-timeline :deep(.room-row-meta small),
.reservation-timeline :deep(.room-row-meta em) {
  font-size: 12px;
  gap: 6px;
}
.reservation-timeline :deep(.room-track) {
  min-height: 152px;
}
.reservation-timeline :deep(.reservation-block) {
  top: calc(50% - 28px);
  transform: none;
  min-height: 56px;
  padding: 8px 10px;
  border-radius: 10px;
}
.reservation-timeline :deep(.drag-selection) {
  top: calc(50% - 28px);
  bottom: auto;
  height: 56px;
  transform: none;
}
.reservation-timeline :deep(.reservation-block strong) {
  font-size: 12px;
}
.reservation-timeline :deep(.reservation-block span) {
  font-size: 11px;
}
.reservation-timeline :deep(.now-marker em) {
  top: 8px;
}
.room-name-spacer {
  display: flex;
  align-items: center;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted-foreground);
}

@media (max-width: 900px) {
  .reservation-timeline-head {
    flex-direction: column;
  }

  .reservation-timeline-range {
    white-space: normal;
  }
}
</style>
