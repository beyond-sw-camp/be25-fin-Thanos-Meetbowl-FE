import { addMinutes, timeToMinutes, utcToKstClock } from './dateTime.js'

// 회의실 예약 운영 시간은 KST 09:00~24:00 구간을 사용한다.
export const TIMELINE = {
  startHour: 9,
  endHour: 24,
  hourPx: 64,
}

export const timelineHours = Array.from(
  { length: TIMELINE.endHour - TIMELINE.startHour },
  (_, index) => TIMELINE.startHour + index,
)

const WINDOW_START = TIMELINE.startHour * 60
const WINDOW_END = TIMELINE.endHour * 60
const clamp = (value, lo, hi) => Math.min(Math.max(value, lo), hi)

// 'HH:MM' 시작/종료 → 막대 좌표(px). 윈도 밖(06시 이전·24시 이후·자정 종료)은 잘라 트랙을 벗어나지 않게 한다.
export function blockStyle(start, end) {
  const rawStart = timeToMinutes(start)
  let rawEnd = timeToMinutes(end)
  if (rawEnd <= rawStart) rawEnd = WINDOW_END // 자정(00:00) 종료 방어
  const startPx = clamp(rawStart, WINDOW_START, WINDOW_END)
  const endPx = clamp(rawEnd, WINDOW_START, WINDOW_END)
  return {
    left: `${((startPx - WINDOW_START) / 60) * TIMELINE.hourPx}px`,
    width: `${Math.max(((endPx - startPx) / 60) * TIMELINE.hourPx, 36)}px`,
  }
}

// 트랙 내 클릭 위치(px) → 30분 단위로 스냅한 'HH:MM'
export function slotTimeFromOffset(offsetPx, snap = 'start') {
  const isEndSnap = snap === 'end'
  const maxHours = TIMELINE.endHour - TIMELINE.startHour - (isEndSnap ? 0 : 0.5)
  const raw = clamp(offsetPx / TIMELINE.hourPx, 0, maxHours)
  const roundedSlots = isEndSnap ? Math.ceil(raw * 2) : Math.floor(raw * 2)
  const minutes = WINDOW_START + roundedSlots * 30
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0')
  const minute = String(minutes % 60).padStart(2, '0')
  return `${hour}:${minute}`
}

// 두 px 지점(드래그 시작~끝) → 30분 단위로 스냅한 {start, end} 'HH:MM'.
// 방향 무관(좌/우 드래그 모두), 같은 슬롯이면 최소 30분으로 보정한다.
export function slotRangeFromOffsets(px1, px2) {
  const start = slotTimeFromOffset(Math.min(px1, px2))
  const end = slotTimeFromOffset(Math.max(px1, px2), 'end')
  return { start, end: end === start ? addMinutes(start, 30) : end }
}

// 현재(KST) 시각 세로 마커 위치
export function nowMarkerStyle() {
  const minutes = clamp(timeToMinutes(utcToKstClock(new Date().toISOString())), WINDOW_START, WINDOW_END)
  return { left: `${((minutes - WINDOW_START) / 60) * TIMELINE.hourPx}px` }
}
