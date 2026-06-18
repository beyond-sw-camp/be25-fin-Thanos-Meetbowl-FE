<template>
  <div class="room-row" :class="{ restricted: !room.isAvailable, selected }">
    <div class="room-row-meta">
      <strong>{{ room.name }}</strong>
      <small>{{ room.siteName }} · {{ room.buildingName }} · {{ room.floor === null ? '-' : room.floor + '층' }} · {{ room.capacity }}명</small>
      <em v-if="!room.isAvailable" class="badge warning">사용 제한</em>
      <em v-else-if="showAvailability" class="badge" :class="available ? 'success' : 'danger'">{{ available ? '가능' : '불가' }}</em>
    </div>
    <div ref="trackEl" class="room-track" @mousedown="onTrackMouseDown">
      <span v-for="hour in timelineHours" :key="hour" class="hour-line"></span>
      <span class="now-marker" :style="nowMarkerStyle()"><em>현재</em></span>
      <span v-if="dragRange" class="drag-selection" :class="{ invalid: dragInvalid }" :style="dragStyle"></span>
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
import { computed, ref } from 'vue'
import ReservationBlock from './ReservationBlock.vue'
import { blockStyle, nowMarkerStyle, slotRangeFromOffsets, slotTimeFromOffset, timelineHours } from '../../utils/timeline'
import { addMinutes, kstToUtcIso, overlaps } from '../../utils/dateTime'

const props = defineProps({
  room: { type: Object, required: true },
  blocks: { type: Array, default: () => [] },
  nameMap: { type: Object, default: () => ({}) },
  showAvailability: { type: Boolean, default: false },
  selectedRange: { type: Object, default: null },
  selected: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  // 타임라인이 보고 있는 날짜(KST 'YYYY-MM-DD'). 과거 판정에 날짜를 포함하기 위해 사용.
  date: { type: String, default: '' },
})
const emit = defineEmits(['block-click', 'track-click', 'track-drag', 'select'])

// 폼이 고른 시간대(selectedRange)와 겹치는 예약이 없으면 '가능'. start/end만 바뀌어도 즉시 재계산된다.
const available = computed(() => {
  if (!props.selectedRange) return true
  return !props.blocks.some((block) =>
    overlaps(props.selectedRange.start, props.selectedRange.end, block.start, block.end),
  )
})

// ── 빈 시간대 드래그 → 예약 생성 ───────────────────────────────
const trackEl = ref(null)
const drag = ref(null) // 드래그 중: { rect, startPx, currentPx } / 아니면 null

const dragRange = computed(() =>
  drag.value ? slotRangeFromOffsets(drag.value.startPx, drag.value.currentPx) : null,
)
const dragStyle = computed(() => (dragRange.value ? blockStyle(dragRange.value.start, dragRange.value.end) : {}))
const dragInvalid = computed(() => (dragRange.value ? isInvalidRange(dragRange.value) : false))

// 보고 있는 날짜(date) + 시각(HH:MM)을 합친 실제 KST 시점이 현재보다 이전이면 과거.
// 시:분만 보던 기존 방식과 달리 날짜를 포함하므로, 미래 날짜의 오전 시간대는 막히지 않는다.
function isPastTime(time) {
  if (!props.date) return false
  return new Date(kstToUtcIso(props.date, time)).getTime() <= Date.now()
}

// 선택 구간이 기존 예약과 겹치거나, 종료 시점이 이미 과거면 무효.
function isInvalidRange(range) {
  const overlapsBlock = props.blocks.some((block) => overlaps(range.start, range.end, block.start, block.end))
  return overlapsBlock || isPastTime(range.end)
}

function onTrackMouseDown(event) {
  // 모달 룸선택 모드: 누르면 회의실 선택(드래그 생성 비활성)
  if (props.selectable) {
    emit('select', props.room.roomId)
    return
  }
  if (!props.room.isAvailable) return // 사용 제한 회의실은 드래그 예약 비활성
  if (event.target.closest('.reservation-block')) return // 기존 블록 위에서는 시작 안 함(빈 칸에서만)
  const rect = trackEl.value.getBoundingClientRect()
  const px = event.clientX - rect.left
  drag.value = { rect, startPx: px, currentPx: px }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
  event.preventDefault()
}

function onDragMove(event) {
  if (!drag.value) return
  drag.value = { ...drag.value, currentPx: event.clientX - drag.value.rect.left }
}

function onDragEnd(event) {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  const d = drag.value
  drag.value = null
  if (!d) return

  const endPx = event.clientX - d.rect.left
  // 거의 안 움직였으면 기존 단일 클릭 생성과 동일하게 처리
  if (Math.abs(endPx - d.startPx) < 6) {
    const start = slotTimeFromOffset(d.startPx)
    // 클릭도 드래그와 같은 기준: 슬롯(시작+30분)이 이미 과거면 막는다.
    if (isPastTime(addMinutes(start, 30))) return
    emit('track-click', props.room.roomId, start)
    return
  }
  const range = slotRangeFromOffsets(d.startPx, endPx)
  if (isInvalidRange(range)) return // 겹침/과거면 모달 안 열고 무시
  emit('track-drag', props.room.roomId, range.start, range.end)
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
/* 드래그 중 텍스트 선택 방지 */
.room-track {
  user-select: none;
}
/* 드래그 선택 영역(반투명 박스) */
.drag-selection {
  position: absolute;
  top: 6px;
  bottom: 6px;
  border-radius: 6px;
  background: rgba(243, 115, 33, 0.22);
  border: 1px solid var(--primary);
  pointer-events: none;
}
.drag-selection.invalid {
  background: rgba(220, 38, 38, 0.2);
  border-color: var(--danger);
}
</style>
