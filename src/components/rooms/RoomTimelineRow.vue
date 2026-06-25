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
      <span v-if="isToday" class="now-marker" :style="nowMarkerStyle()"><em>현재</em></span>
      <span v-if="dragRange" class="drag-selection" :class="{ invalid: dragInvalid }" :style="dragStyle"></span>
      <span
        v-if="displayPreviewBlock"
        class="reservation-block mine preview"
        :class="{ invalid: previewResizeInvalid }"
        :style="previewStyle"
      >
        <strong>{{ displayPreviewBlock.label }}</strong>
        <span>{{ displayPreviewBlock.start }}-{{ displayPreviewBlock.end }}</span>
        <button
          v-if="selectable"
          type="button"
          class="preview-resize-handle start"
          aria-label="예약 시작 시각 조절"
          @mousedown.stop.prevent="onPreviewResizeStart($event, 'start')"
        />
        <button
          v-if="selectable"
          type="button"
          class="preview-resize-handle"
          aria-label="예약 종료 시각 조절"
          @mousedown.stop.prevent="onPreviewResizeStart($event, 'end')"
        />
      </span>
      <ReservationBlock
        v-for="block in blocks"
        :key="block.meetingId"
        :block="block"
        :name-map="nameMap"
        @select="$emit('block-click', block)"
      />
      <span
        v-if="showEmptyLabel && !blocks.length && !displayPreviewBlock"
        class="room-track-empty"
        :class="{ restricted: !room.isAvailable }"
      >
        {{ room.isAvailable ? '예약 없음' : '사용 제한' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import ReservationBlock from './ReservationBlock.vue'
import { blockStyle, nowMarkerStyle, slotRangeFromOffsets, slotTimeFromOffset, timelineHours } from '../../utils/timeline'
import { addMinutes, kstToUtcIso, overlaps, todayKst } from '../../utils/dateTime'

const props = defineProps({
  room: { type: Object, required: true },
  blocks: { type: Array, default: () => [] },
  nameMap: { type: Object, default: () => ({}) },
  showAvailability: { type: Boolean, default: false },
  selectedRange: { type: Object, default: null },
  previewBlock: { type: Object, default: null },
  showEmptyLabel: { type: Boolean, default: true },
  selected: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  // 타임라인이 보고 있는 날짜(KST 'YYYY-MM-DD'). 과거 판정에 날짜를 포함하기 위해 사용.
  date: { type: String, default: '' },
})
const emit = defineEmits(['block-click', 'track-click', 'track-drag', 'select', 'select-range'])

// '현재' 세로 마커는 보고 있는 날짜가 오늘(KST)일 때만. 다른 날짜를 봐도 현재 시각 위치에 뜨던 버그 방지.
// date 미지정 시(타임라인이 날짜 개념 없이 쓰이는 경우)는 기존처럼 표시한다.
const isToday = computed(() => !props.date || props.date === todayKst())

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
const previewResize = ref(null)
const displayPreviewBlock = computed(() => {
  if (!props.previewBlock) return null
  if (!previewResize.value) return props.previewBlock
  return {
    ...props.previewBlock,
    start: previewResize.value.start,
    end: previewResize.value.end,
  }
})
const previewStyle = computed(() =>
  displayPreviewBlock.value
    ? blockStyle(displayPreviewBlock.value.start, displayPreviewBlock.value.end)
    : {},
)
const previewResizeInvalid = computed(() =>
  displayPreviewBlock.value && previewResize.value ? isInvalidRange(displayPreviewBlock.value) : false,
)

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
    if (props.selectable) {
      emit('select', props.room.roomId)
      emit('select-range', props.room.roomId, start, addMinutes(start, 60))
      return
    }
    emit('track-click', props.room.roomId, start)
    return
  }
  const range = slotRangeFromOffsets(d.startPx, endPx)
  if (isInvalidRange(range)) return // 겹침/과거면 모달 안 열고 무시
  if (props.selectable) {
    emit('select', props.room.roomId)
    emit('select-range', props.room.roomId, range.start, range.end)
    return
  }
  emit('track-drag', props.room.roomId, range.start, range.end)
}

function onPreviewResizeStart(event, edge) {
  if (!props.selectable || !props.previewBlock || !trackEl.value) return
  const rect = trackEl.value.getBoundingClientRect()
  previewResize.value = {
    rect,
    edge,
    start: props.previewBlock.start,
    end: props.previewBlock.end,
  }
  window.addEventListener('mousemove', onPreviewResizeMove)
  window.addEventListener('mouseup', onPreviewResizeEnd)
  event.preventDefault()
}

function onPreviewResizeMove(event) {
  if (!previewResize.value || !props.previewBlock) return
  if (previewResize.value.edge === 'start') {
    let start = slotTimeFromOffset(event.clientX - previewResize.value.rect.left, 'start')
    if (start >= props.previewBlock.end) {
      start = addMinutes(props.previewBlock.end, -30)
    }
    previewResize.value = { ...previewResize.value, start }
    return
  }
  let end = slotTimeFromOffset(event.clientX - previewResize.value.rect.left, 'end')
  if (end <= props.previewBlock.start) {
    end = addMinutes(props.previewBlock.start, 30)
  }
  previewResize.value = { ...previewResize.value, end }
}

function onPreviewResizeEnd() {
  window.removeEventListener('mousemove', onPreviewResizeMove)
  window.removeEventListener('mouseup', onPreviewResizeEnd)
  if (!previewResize.value || !props.previewBlock) {
    previewResize.value = null
    return
  }
  const range = {
    start: previewResize.value.start,
    end: previewResize.value.end,
  }
  if (!isInvalidRange(range)) {
    emit('select-range', props.room.roomId, range.start, range.end)
  }
  previewResize.value = null
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  window.removeEventListener('mousemove', onPreviewResizeMove)
  window.removeEventListener('mouseup', onPreviewResizeEnd)
})
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
.reservation-block.preview {
  z-index: 3;
  opacity: 0.92;
  cursor: default;
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.24);
}
.reservation-block.preview.invalid {
  background: #dc2626;
}
.preview-resize-handle {
  position: absolute;
  top: 0;
  right: -1px;
  width: 12px;
  height: 100%;
  border: 0;
  border-radius: 0 8px 8px 0;
  background: rgba(255, 255, 255, 0.32);
  cursor: ew-resize;
}
.preview-resize-handle.start {
  left: -1px;
  right: auto;
  border-radius: 8px 0 0 8px;
}
</style>
