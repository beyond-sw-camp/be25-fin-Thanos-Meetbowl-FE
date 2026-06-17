export function timeToMinutes(time) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

export function minutesToTime(minutes) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0')
  const minute = String(minutes % 60).padStart(2, '0')
  return `${hour}:${minute}`
}

export function addMinutes(time, minutes) {
  return minutesToTime(timeToMinutes(time) + minutes)
}

export function overlaps(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB)
}

export function toDateTimeInput(value) {
  return value.replace(' ', 'T')
}

export function fromDateTimeInput(value) {
  return value.replace('T', ' ')
}

export function addOneHour(value) {
  const date = new Date(value)
  date.setHours(date.getHours() + 1)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export function meetingEnd(meeting) {
  return fromDateTimeInput(addOneHour(toDateTimeInput(meeting.start)))
}

export function formatKstDateTime(value, options = {}) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  }).format(new Date(value))
}

export function formatKstTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

// 백엔드는 UTC Instant(ISO-8601), 화면은 KST(UTC+9, DST 없음) 기준이라 변환 헬퍼를 둔다.

// KST 'YYYY-MM-DD' + 'HH:MM' → UTC ISO-8601 (예약 생성 시 scheduledAt/scheduledEndAt)
export function kstToUtcIso(date, time) {
  return new Date(`${date}T${time}:00+09:00`).toISOString()
}

// KST 'YYYY-MM-DD' 하루를 UTC ISO 반개구간 [from, to) 로 (예약 현황 조회 from/to)
export function kstDayRangeUtc(date) {
  const start = new Date(`${date}T00:00:00+09:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { from: start.toISOString(), to: end.toISOString() }
}

// UTC ISO → KST 'YYYY-MM-DD'
export function utcToKstDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(value))
}

// UTC ISO → KST 'HH:MM' (타임라인 계산용, 항상 콜론 형식 보장)
export function utcToKstClock(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

// KST 'YYYY-MM-DD' 를 delta일 이동한 'YYYY-MM-DD' (날짜 네비게이터 < >)
export function shiftDateKst(date, deltaDays) {
  const base = new Date(`${date}T00:00:00+09:00`)
  const moved = new Date(base.getTime() + deltaDays * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(moved)
}

// 오늘(KST) 'YYYY-MM-DD'
export function todayKst() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}
