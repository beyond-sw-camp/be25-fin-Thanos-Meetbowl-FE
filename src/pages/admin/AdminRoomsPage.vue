<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Activity,
  Ban,
  Building2,
  Calendar,
  CalendarCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorClosed,
  List,
  MapPin,
  Pencil,
  Plus,
  Search,
} from '@lucide/vue'
import ActionButton from '../../components/common/ActionButton.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import ModalShell from '../../components/common/ModalShell.vue'
import RoomTimelineRow from '../../components/rooms/RoomTimelineRow.vue'
import {
  changeMeetingRoomAvailability,
  createMeetingBuilding,
  createMeetingRoom,
  createRoomBlock,
  createSiteWithBuilding,
  deleteMeetingBuilding,
  deleteMeetingRoom,
  deleteMeetingSite,
  deleteRoomBlock,
  getMeetingBuildings,
  getMeetingRooms,
  getMeetingSites,
  updateMeetingBuilding,
  updateMeetingRoom,
  updateMeetingSite,
} from '../../lib/admin-rooms'
import { getMeeting, getMeetings, getRoomReservations } from '../../lib/reservations'
import { useAuthStore } from '../../stores/auth'
import { useUserNames } from '../../composables/useUserNames'
import {
  kstDayRangeUtc,
  kstMonthRangeUtc,
  kstToUtcIso,
  kstWeekday,
  kstWeekRangeUtc,
  shiftDateKst,
  timeToMinutes,
  todayKst,
  utcToKstClock,
  utcToKstDate,
} from '../../utils/dateTime'
import { TIMELINE, nowMarkerStyle, timelineHours } from '../../utils/timeline'

const auth = useAuthStore()
const { nameMap, resolveNames } = useUserNames()

const loading = ref(true)
const saving = ref(false)
const forbidden = ref(false)
const errorMessage = ref('')
const actionError = ref('')
const successMessage = ref('')

const rooms = ref([])
const sites = ref([])
const buildings = ref([])

// 예약 보드용 상태(타임라인/통계/우측 패널)
const blocksByRoom = ref({})
// 우측 패널 사용 빈도/가동률 통계용. 이번 주·달 union 기간의 회의실별 예약을 모아둔다.
const usageReservationsByRoom = ref({})
const usageRange = ref(null)
const date = ref(todayKst())
const viewMode = ref('timeline')
const siteFilter = ref('all')
const buildingFilter = ref('all')
const capacityFilter = ref('all')
const globalSearch = ref('')
const selectedRoomId = ref('')
const timelineCurrentPage = ref(1)
const timelinePageSize = 5
const sitePage = ref(1)
const sitePageSize = 6
const editMenu = ref(false)

// 회의 상세 모달
const detail = ref(null)
const detailFull = ref(null)
const detailRestricted = ref(false)

const roomModal = ref(false)
const siteModal = ref(false)
const blockModal = ref(false)
const blockForm = ref({ roomId: '', start: '', end: '', reason: '' })
const editingRoom = ref(null)

const roomForm = ref(createEmptyRoomForm())
const siteForm = ref({ siteName: '', buildingName: '' })
// 사이트 관리 모달 내 인라인 수정 상태. editingSite가 있으면 그 사이트 행이 수정 폼으로 바뀐다.
const editingSite = ref(null)
const siteEditForm = ref({ name: '', address: '' })
// 건물 인라인 수정 상태. editingBuilding이 있으면 그 건물 행이 수정 폼으로 바뀐다.
const editingBuilding = ref(null)
const buildingEditForm = ref({ name: '' })

const isAdmin = computed(() => auth.user?.role === 'ADMIN')

const capacityOptions = [
  { value: 'all', label: '수용 인원 (전체)' },
  { value: 'small', label: '1~10명' },
  { value: 'medium', label: '11~20명' },
  { value: 'large', label: '21명 이상' },
]

const buildingOptions = computed(() => {
  const options = [{ value: 'all', label: '전체 건물' }]
  for (const building of siteBuildingList.value) {
    options.push({ value: building.buildingId, label: `${building.siteName} - ${building.name}` })
  }
  return options
})

const roomMap = computed(() => {
  const map = {}
  for (const room of rooms.value) map[room.roomId] = room
  return map
})

// 필터(사이트/건물/수용인원)를 통과한 회의실. 검색은 보드/리스트에서 별도로 좁힌다.
const baseRooms = computed(() => rooms.value.filter((room) => roomMatchesFilters(room)))

// 리스트(회의실 관리 표)는 baseRooms를 그대로 보여준다.
const filteredRooms = computed(() => baseRooms.value)

// 타임라인 보드: 검색어로 회의실명 또는 예약 제목이 매칭되는 회의실만.
const boardRooms = computed(() => {
  const keyword = normalizeKeyword(globalSearch.value)
  if (!keyword) return baseRooms.value
  return baseRooms.value.filter((room) => {
    if (roomMatchesKeyword(room, keyword)) return true
    return (blocksByRoom.value[room.roomId] || []).some((block) => blockMatchesKeyword(block, keyword))
  })
})

const filteredBlocksByRoom = computed(() => {
  const keyword = normalizeKeyword(globalSearch.value)
  const next = {}
  for (const room of boardRooms.value) {
    const blocks = blocksByRoom.value[room.roomId] || []
    next[room.roomId] =
      !keyword || roomMatchesKeyword(room, keyword)
        ? blocks
        : blocks.filter((block) => blockMatchesKeyword(block, keyword))
  }
  return next
})

const timelinePageCount = computed(() => Math.max(1, Math.ceil(boardRooms.value.length / timelinePageSize)))
const pagedBoardRooms = computed(() => {
  const start = (timelineCurrentPage.value - 1) * timelinePageSize
  return boardRooms.value.slice(start, start + timelinePageSize)
})

// '현재' 세로 바: 오늘이고 표시할 행이 있을 때만, 타임라인 전체를 관통하는 단일 바로 그린다.
const showNowBar = computed(() => date.value === todayKst() && pagedBoardRooms.value.length > 0)
// 단일 바의 left = 회의실명 컬럼(190px) + 트랙 내 현재 시각 오프셋(행별 마커와 동일 기준).
function adminNowBarStyle() {
  return { left: `calc(190px + ${nowMarkerStyle().left})` }
}
const timelineVisiblePageNumbers = computed(() => {
  const total = timelinePageCount.value
  const safeStart = Math.max(1, Math.min(timelineCurrentPage.value - 2, total - 4))
  const end = Math.min(total, safeStart + 4)
  return Array.from({ length: end - safeStart + 1 }, (_, index) => safeStart + index)
})

const sitePageCount = computed(() => Math.max(1, Math.ceil(siteBuildingRows.value.length / sitePageSize)))
const pagedSiteRows = computed(() => {
  const start = (sitePage.value - 1) * sitePageSize
  return siteBuildingRows.value.slice(start, start + sitePageSize)
})
const siteVisiblePageNumbers = computed(() => {
  const total = sitePageCount.value
  const safeStart = Math.max(1, Math.min(sitePage.value - 2, total - 4))
  const end = Math.min(total, safeStart + 4)
  return Array.from({ length: end - safeStart + 1 }, (_, index) => safeStart + index)
})

const displayDateLabel = computed(() => {
  const target = new Date(`${date.value}T00:00:00+09:00`)
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(target)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${lookup.year}. ${lookup.month}. ${lookup.day}. (${lookup.weekday})`
})

// ── 통계 카드 4개 ──────────────────────────────────────────────
const allBlocks = computed(() => Object.values(blocksByRoom.value).flat())
const stats = computed(() => {
  const inUseRoomIds = new Set(
    allBlocks.value.filter((block) => block.tone === 'inuse').map((block) => block.roomId),
  )
  return {
    total: rooms.value.length,
    inUse: inUseRoomIds.size,
    todayReservations: allBlocks.value.length,
    unavailable: rooms.value.filter((room) => !room.isAvailable).length,
  }
})

// ── 사이트/건물 칩 ─────────────────────────────────────────────
// "사이트 - 건물" 목록(건물 단위). 데이터상 사이트는 1개여도 건물 수만큼 줄이 나온다(사이트명 반복).
const siteBuildingList = computed(() => {
  const siteNameOf = (siteId) => sites.value.find((site) => site.siteId === siteId)?.name || '-'
  return buildings.value
    .map((building) => ({
      buildingId: building.buildingId,
      siteId: building.siteId,
      siteName: siteNameOf(building.siteId),
      name: building.name,
    }))
    .sort((a, b) => a.siteName.localeCompare(b.siteName, 'ko') || a.name.localeCompare(b.name, 'ko'))
})

// 사이트/건물 관리 표의 행(건물 단위). 회의실 수·사용 가능 수·상태를 회의실 데이터에서 집계한다.
// 상태: 사이트/건물에 상태 필드가 없어 회의실 isAvailable에서 파생(회의실 있는데 가용 0=점검 중).
const siteBuildingRows = computed(() =>
  siteBuildingList.value.map((building) => {
    const roomCount = roomCountByBuilding(building.buildingId)
    const availableCount = rooms.value.filter(
      (room) => room.buildingId === building.buildingId && room.isAvailable,
    ).length
    return {
      ...building,
      roomCount,
      availableCount,
      status: roomCount > 0 && availableCount === 0 ? 'maintenance' : 'operating',
    }
  }),
)

// ── 우측 상세 패널 ─────────────────────────────────────────────
const selectedRoom = computed(() => rooms.value.find((room) => room.roomId === selectedRoomId.value) || null)
const selectedRoomBlocks = computed(() =>
  [...(blocksByRoom.value[selectedRoomId.value] || [])].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start),
  ),
)
const currentMeeting = computed(() => selectedRoomBlocks.value.find((block) => block.tone === 'inuse') || null)
const selectedRoomStatus = computed(() => {
  const room = selectedRoom.value
  if (!room) return 'available'
  if (!room.isAvailable) return 'unavailable'
  if (currentMeeting.value) return 'inuse'
  if (selectedRoomBlocks.value.length) return 'booked'
  return 'available'
})
const usageSegments = computed(() =>
  selectedRoomBlocks.value.map((block) => {
    const startMin = Math.max(0, timeToMinutes(block.start))
    const endMin = Math.min(1440, timeToMinutes(block.end) || startMin + 30)
    return {
      key: block.meetingId,
      tone: block.tone,
      left: `${(startMin / 1440) * 100}%`,
      width: `${(Math.max(endMin - startMin, 15) / 1440) * 100}%`,
    }
  }),
)

// 가동률 산정 기준: 평일(월~금) 운영 09~18시(540분). 이번 주 평일 5일 × 540분이 분모.
const OPERATING_OPEN_MIN = 9 * 60
const OPERATING_CLOSE_MIN = 18 * 60
const OPERATING_DAY_MIN = OPERATING_CLOSE_MIN - OPERATING_OPEN_MIN
const OPERATING_WEEKDAYS = 5

// 운영 시간(평일 09~18시)과 겹치는 예약 시간(분). 주말 예약은 가동률 집계에서 제외.
function operatingOverlapMinutes(reservation) {
  if (kstWeekday(reservation.scheduledAt) % 6 === 0) return 0 // 0=일, 6=토
  const startMin = timeToMinutes(utcToKstClock(reservation.scheduledAt))
  const endMin = timeToMinutes(utcToKstClock(reservation.scheduledEndAt)) || startMin
  const start = Math.max(startMin, OPERATING_OPEN_MIN)
  const end = Math.min(endMin, OPERATING_CLOSE_MIN)
  return Math.max(0, end - start)
}

// 선택된 회의실의 이번 주/달 예약 건수 + 이번 주 평일 가동률(%).
const selectedRoomUsage = computed(() => {
  const range = usageRange.value
  const list = usageReservationsByRoom.value[selectedRoomId.value] || []
  if (!range) return { weekCount: 0, monthCount: 0, utilization: 0, hasData: false }

  let weekCount = 0
  let monthCount = 0
  let reservedMin = 0
  for (const reservation of list) {
    const startMs = new Date(reservation.scheduledAt).getTime()
    if (startMs >= range.monthFrom && startMs < range.monthTo) monthCount += 1
    if (startMs >= range.weekFrom && startMs < range.weekTo) {
      weekCount += 1
      reservedMin += operatingOverlapMinutes(reservation)
    }
  }

  const denominator = OPERATING_WEEKDAYS * OPERATING_DAY_MIN
  const utilization = denominator ? Math.round((reservedMin / denominator) * 100) : 0
  return { weekCount, monthCount, utilization, hasData: list.length > 0 }
})

// 시간대별 사용 패턴(이번 주 평일, 운영 09~18시). 각 시간 슬롯과 겹치는 예약 수를 센다.
const HOURLY_SLOTS = Array.from(
  { length: OPERATING_DAY_MIN / 60 },
  (_, index) => OPERATING_OPEN_MIN / 60 + index,
)
const selectedRoomHourly = computed(() => {
  const range = usageRange.value
  const list = usageReservationsByRoom.value[selectedRoomId.value] || []
  const buckets = HOURLY_SLOTS.map((hour) => ({ hour, count: 0 }))
  if (range) {
    for (const reservation of list) {
      const startMs = new Date(reservation.scheduledAt).getTime()
      if (startMs < range.weekFrom || startMs >= range.weekTo) continue
      if (kstWeekday(reservation.scheduledAt) % 6 === 0) continue // 주말 제외
      const startMin = timeToMinutes(utcToKstClock(reservation.scheduledAt))
      const endMin = timeToMinutes(utcToKstClock(reservation.scheduledEndAt)) || startMin
      for (const bucket of buckets) {
        const slotStart = bucket.hour * 60
        if (startMin < slotStart + 60 && endMin > slotStart) bucket.count += 1
      }
    }
  }
  const max = buckets.reduce((acc, bucket) => Math.max(acc, bucket.count), 0)
  const total = buckets.reduce((acc, bucket) => acc + bucket.count, 0)
  return { buckets, max, total }
})

// 막대 높이(%). 0이면 보이지 않고, 작은 값도 최소 높이로 보이게 한다.
function hourlyBarHeight(count, max) {
  if (!count || !max) return '0%'
  return `${Math.max((count / max) * 100, 10)}%`
}

const statusMeta = {
  inuse: { label: '사용 중', badge: 'warning' },
  booked: { label: '예약됨', badge: 'navy' },
  unavailable: { label: '사용 불가', badge: 'muted' },
  available: { label: '사용 가능', badge: 'success' },
}
function blockStatusLabel(block) {
  if (block.tone === 'inuse') return '진행 중'
  if (block.tone === 'unavailable') return '점검'
  return '예정됨'
}

const detailDateLabel = computed(() => {
  const full = detailFull.value
  if (!full) return ''
  const startDate = utcToKstDate(full.scheduledAt)
  const endDate = utcToKstDate(full.scheduledEndAt)
  return startDate === endDate ? startDate : `${startDate} ~ ${endDate}`
})
const detailTimeLabel = computed(() => {
  const full = detailFull.value
  if (full) return `${utcToKstClock(full.scheduledAt)} ~ ${utcToKstClock(full.scheduledEndAt)}`
  return detail.value ? `${detail.value.start} ~ ${detail.value.end}` : ''
})
const detailHostName = computed(() => nameMap[detail.value?.hostUserId] || '-')
const detailAttendeeList = computed(() =>
  (detailFull.value?.attendees || []).map((attendee) => nameMap[attendee.userId] || '이름 미확인'),
)
// 관리자가 건 시간대 사용 제한(room_block)은 isBlock 플래그로 구분된다.
// 사용 제한엔 예약자·참석자 개념이 없으므로 모달에서 해당 항목을 숨긴다.
const isRestrictedDetail = computed(() => !!detail.value?.isBlock)

const formBuildings = computed(() =>
  buildings.value.filter((building) => building.siteId === roomForm.value.siteId),
)
const isRenamedBuilding = computed(() => {
  if (!editingRoom.value) return false
  const name = roomForm.value.buildingName.trim()
  if (!name) return false
  return !formBuildings.value.some((building) => building.name === name)
})

watch(
  () => roomForm.value.siteId,
  () => {
    if (editingRoom.value) {
      if (formBuildings.value.some((building) => building.name === roomForm.value.buildingName.trim())) return
      roomForm.value.buildingName = formBuildings.value[0]?.name || ''
    } else {
      if (formBuildings.value.some((building) => building.buildingId === roomForm.value.buildingId)) return
      roomForm.value.buildingId = formBuildings.value[0]?.buildingId || ''
    }
  },
)

watch(date, () => {
  loadDayData()
})
watch([globalSearch, siteFilter, buildingFilter, capacityFilter], () => {
  timelineCurrentPage.value = 1
})
watch(boardRooms, (nextRooms) => {
  const nextPageCount = Math.max(1, Math.ceil(nextRooms.length / timelinePageSize))
  if (timelineCurrentPage.value > nextPageCount) timelineCurrentPage.value = nextPageCount
})
watch(siteBuildingRows, (nextRows) => {
  const nextPageCount = Math.max(1, Math.ceil(nextRows.length / sitePageSize))
  if (sitePage.value > nextPageCount) sitePage.value = nextPageCount
})
// 툴바 '전체 건물' 선택 등으로 건물 필터가 풀리면 사이트 필터도 함께 초기화한다.
watch(buildingFilter, (value) => {
  if (value === 'all') siteFilter.value = 'all'
})
// 선택된 회의실이 필터/검색으로 사라지면 보이는 첫 회의실로 옮긴다.
watch(
  [boardRooms, rooms],
  () => {
    if (!rooms.value.length) {
      selectedRoomId.value = ''
      return
    }
    if (rooms.value.some((room) => room.roomId === selectedRoomId.value)) return
    selectedRoomId.value = boardRooms.value[0]?.roomId || rooms.value[0]?.roomId || ''
  },
  { immediate: true },
)

onMounted(() => {
  loadPage()
  window.addEventListener('click', closeEditMenu)
})
onBeforeUnmount(() => {
  window.removeEventListener('click', closeEditMenu)
})

async function loadPage() {
  if (!isAdmin.value) {
    forbidden.value = true
    loading.value = false
    return
  }
  loading.value = true
  await reloadAllData()
  loading.value = false
}

async function reloadAllData() {
  forbidden.value = false
  errorMessage.value = ''

  try {
    const [siteData, buildingData, roomData] = await Promise.all([
      getMeetingSites(),
      getMeetingBuildings(),
      fetchAllRooms(),
    ])

    sites.value = (siteData || []).map(normalizeSite)
    buildings.value = (buildingData || []).map(normalizeBuilding)
    rooms.value = roomData.map(normalizeRoom)
    await Promise.all([loadDayData(), loadUsageStats()])
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }
    errorMessage.value =
      error?.message || '회의실 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

// 선택한 날짜의 예약(타임라인 블록)을 불러온다. 회의실 CRUD와 별개로 예약 보드 전용 데이터.
async function loadDayData() {
  if (!isAdmin.value || !rooms.value.length) return
  const { from, to } = kstDayRangeUtc(date.value)
  const now = Date.now()
  const isToday = date.value === todayKst()

  try {
    const [reservationData, meetingData] = await Promise.all([
      getRoomReservations({ from, to }),
      getMeetings({ role: 'all', from, to }),
    ])

    // 회의별 참석 인원 수(블록의 "인원" 표시용)
    const attendeeCountByMeeting = {}
    for (const meeting of meetingData || []) {
      attendeeCountByMeeting[meeting.meetingId] = Array.isArray(meeting.attendees)
        ? meeting.attendees.length
        : 0
    }

    const hostIds = []
    const next = {}
    for (const boardRoom of reservationData || []) {
      const room = roomMap.value[boardRoom.roomId]
      const roomAvailable = room ? room.isAvailable : true
      const reservationBlocks = (boardRoom.reservations || []).map((reservation) => {
        hostIds.push(reservation.hostUserId)
        const startMs = new Date(reservation.scheduledAt).getTime()
        const endMs = new Date(reservation.scheduledEndAt).getTime()
        const tone = !roomAvailable
          ? 'unavailable'
          : isToday && startMs <= now && now < endMs
            ? 'inuse'
            : 'booked'
        const count = attendeeCountByMeeting[reservation.meetingId] || 0
        return {
          meetingId: reservation.meetingId,
          roomId: boardRoom.roomId,
          title: reservation.title,
          scheduledAt: reservation.scheduledAt,
          scheduledEndAt: reservation.scheduledEndAt,
          start: utcToKstClock(reservation.scheduledAt),
          end: utcToKstClock(reservation.scheduledEndAt),
          hostUserId: reservation.hostUserId,
          attendeeCount: count,
          metaLabel: count ? `${count}명` : '',
          tone,
          mine: false,
        }
      })

      // 관리자가 막아둔 시간대 차단(room_block)을 회색(사용 불가) 블록으로 함께 그린다.
      const blockBlocks = (boardRoom.blocks || []).map((block) => ({
        blockId: block.blockId,
        meetingId: block.blockId, // RoomTimelineRow/ReservationBlock의 key 재사용
        roomId: boardRoom.roomId,
        title: block.reason || '사용 제한',
        reason: block.reason || '',
        scheduledAt: block.startAt,
        scheduledEndAt: block.endAt,
        start: utcToKstClock(block.startAt),
        end: utcToKstClock(block.endAt),
        metaLabel: '',
        tone: 'unavailable',
        mine: false,
        isBlock: true,
      }))

      next[boardRoom.roomId] = [...reservationBlocks, ...blockBlocks]
    }
    blocksByRoom.value = next
    resolveNames(hostIds)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }
    // 예약 로딩 실패는 보드만 비우고 회의실 관리 기능은 유지한다.
    blocksByRoom.value = {}
  }
}

// 우측 패널 통계용 데이터. 오늘(KST) 기준 이번 주(월~일)+이번 달을 한 번에 묶어 조회하고,
// 회의실별 예약을 모아둔다. 보드 날짜 네비게이션과 무관하게 '현재' 주/달을 기준으로 한다.
async function loadUsageStats() {
  if (!isAdmin.value || !rooms.value.length) return
  const today = todayKst()
  const week = kstWeekRangeUtc(today)
  const month = kstMonthRangeUtc(today)
  const from = week.from < month.from ? week.from : month.from
  const to = week.to > month.to ? week.to : month.to

  try {
    const data = await getRoomReservations({ from, to })
    const map = {}
    for (const boardRoom of data || []) {
      map[boardRoom.roomId] = (boardRoom.reservations || []).map((reservation) => ({
        scheduledAt: reservation.scheduledAt,
        scheduledEndAt: reservation.scheduledEndAt,
      }))
    }
    usageReservationsByRoom.value = map
    usageRange.value = {
      weekFrom: new Date(week.from).getTime(),
      weekTo: new Date(week.to).getTime(),
      monthFrom: new Date(month.from).getTime(),
      monthTo: new Date(month.to).getTime(),
    }
  } catch (error) {
    // 통계 로딩 실패는 통계 카드만 비우고 나머지 화면은 유지한다.
    if (error?.status !== 403) {
      usageReservationsByRoom.value = {}
      usageRange.value = null
    }
  }
}

// 회의실 목록은 페이지네이션 응답이므로 관리 화면에서는 전체 페이지를 모아서 보여준다.
async function fetchAllRooms() {
  const all = []
  let page = 1
  const size = 100

  while (true) {
    const data = await getMeetingRooms({ page, size })
    const items = data?.items || []
    all.push(...items)

    const totalPages = data?.totalPages || 1
    if (page >= totalPages || items.length === 0) break
    page += 1
  }

  return all
}

function roomCountByBuilding(buildingId) {
  return rooms.value.filter((room) => room.buildingId === buildingId).length
}

function normalizeKeyword(value) {
  return String(value || '').trim().toLowerCase()
}
function roomLocationLabel(room) {
  return `${room.siteName} ${room.buildingName}${room.floor === null ? '' : ` ${room.floor}층`}`
}
function roomMatchesFilters(room) {
  if (siteFilter.value !== 'all' && room.siteId !== siteFilter.value) return false
  if (buildingFilter.value !== 'all' && room.buildingId !== buildingFilter.value) return false
  if (capacityFilter.value === 'small') return room.capacity <= 10
  if (capacityFilter.value === 'medium') return room.capacity >= 11 && room.capacity <= 20
  if (capacityFilter.value === 'large') return room.capacity >= 21
  return true
}
function roomMatchesKeyword(room, keyword) {
  return [room.name, room.siteName, room.buildingName, roomLocationLabel(room)]
    .join(' ')
    .toLowerCase()
    .includes(keyword)
}
function blockMatchesKeyword(block, keyword) {
  const hostName = nameMap[block.hostUserId] || ''
  return [block.title, hostName].join(' ').toLowerCase().includes(keyword)
}

function shiftDay(delta) {
  date.value = shiftDateKst(date.value, delta)
}

// 관리 표의 '수정' → 해당 행의 사이트를 사이트/건물 관리 모달에서 인라인 수정 상태로 연다.
function editSiteOfRow(row) {
  const site = sites.value.find((item) => item.siteId === row.siteId)
  if (site) openSiteModalForEdit(site)
}
function toggleBuildingFilter(building) {
  if (buildingFilter.value === building.buildingId) {
    // 해제 시 사이트 필터도 함께 초기화(칩 제거 후 사이트 필터가 남지 않도록).
    buildingFilter.value = 'all'
    siteFilter.value = 'all'
    return
  }
  buildingFilter.value = building.buildingId
  siteFilter.value = building.siteId
}

function selectRoom(room) {
  if (!room) return
  selectedRoomId.value = room.roomId
}

async function onBlockClick(block) {
  selectedRoomId.value = block.roomId
  // 차단(회색) 블록은 회의 상세 대신 해제를 묻고, 예약 블록은 회의 상세를 연다.
  if (block.isBlock) {
    await removeBlock(block)
    return
  }
  await openDetail(block)
}

// 빈 시간대를 드래그하면 그 회의실의 해당 구간을 사용 제한(차단)하는 모달을 연다.
function onTrackDrag(roomId, start, end) {
  selectedRoomId.value = roomId
  actionError.value = ''
  successMessage.value = ''
  blockForm.value = { roomId, start, end, reason: '' }
  blockModal.value = true
}

function closeBlockModal() {
  blockModal.value = false
}

async function saveBlock() {
  if (saving.value) return
  const { roomId, start, end, reason } = blockForm.value
  if (!roomId || !start || !end) {
    actionError.value = '차단할 시간을 확인해 주세요.'
    return
  }
  if (start >= end) {
    actionError.value = '종료 시간은 시작 시간보다 뒤여야 합니다.'
    return
  }

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    await createRoomBlock(roomId, {
      startAt: kstToUtcIso(date.value, start),
      endAt: kstToUtcIso(date.value, end),
      reason: reason.trim() || null,
    })
    successMessage.value = `${start} ~ ${end} 시간대를 사용 제한했습니다.`
    closeBlockModal()
    await loadDayData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeBlockModal()
      return
    }
    actionError.value = error?.message || '사용 제한 등록에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function removeBlock(block) {
  if (saving.value) return
  const reasonLabel = block.reason ? `'${block.reason}' ` : ''
  if (!window.confirm(`${block.start} ~ ${block.end} ${reasonLabel}사용 제한을 해제하시겠습니까?`)) return

  actionError.value = ''
  successMessage.value = ''

  try {
    await deleteRoomBlock(block.roomId, block.blockId)
    successMessage.value = '사용 제한을 해제했습니다.'
    await loadDayData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }
    actionError.value = error?.message || '사용 제한 해제에 실패했습니다.'
  }
}

async function openDetail(item) {
  if (!item) return
  detail.value = item
  detailFull.value = null
  detailRestricted.value = false
  resolveNames([item.hostUserId])

  try {
    const full = await getMeeting(item.meetingId)
    detailFull.value = full
    resolveNames([full.hostUserId, ...(full.attendees || []).map((attendee) => attendee.userId)])
  } catch {
    detailRestricted.value = true
  }
}
function closeDetail() {
  detail.value = null
  detailFull.value = null
  detailRestricted.value = false
}

function toggleEditMenu(event) {
  event.stopPropagation()
  editMenu.value = !editMenu.value
}
function closeEditMenu() {
  editMenu.value = false
}

// ── 회의실/사이트 CRUD (기존 기능 그대로 보존) ───────────────────
function openCreateRoom() {
  editingRoom.value = null
  actionError.value = ''
  successMessage.value = ''

  const firstSiteId = selectedRoom.value?.siteId || sites.value[0]?.siteId || ''
  const firstBuilding = buildings.value.find((building) => building.siteId === firstSiteId)

  roomForm.value = {
    name: '',
    siteId: firstSiteId,
    buildingId: firstBuilding?.buildingId || '',
    buildingName: '',
    floor: 1,
    capacity: 6,
    isAvailable: true,
  }
  roomModal.value = true
}

function openEditRoom(room) {
  if (!room) return
  editingRoom.value = room
  actionError.value = ''
  successMessage.value = ''

  roomForm.value = {
    name: room.name || '',
    siteId: room.siteId || '',
    buildingId: room.buildingId || '',
    buildingName: room.buildingName === '-' ? '' : room.buildingName || '',
    floor: room.floor ?? '',
    capacity: room.capacity ?? 0,
    isAvailable: room.isAvailable,
  }
  roomModal.value = true
}

function closeRoomModal() {
  roomModal.value = false
}

function openSiteModal() {
  actionError.value = ''
  successMessage.value = ''
  siteForm.value = { siteName: '', buildingName: '' }
  editingSite.value = null
  editingBuilding.value = null
  siteModal.value = true
}

// 칩/패널의 '사이트 수정' → 사이트 관리 모달을 열고 해당 사이트를 인라인 수정 상태로.
function openSiteModalForEdit(site) {
  openSiteModal()
  if (site) openEditSite(site)
}

function closeSiteModal() {
  siteModal.value = false
  editingSite.value = null
  editingBuilding.value = null
}

function openEditSite(site) {
  actionError.value = ''
  successMessage.value = ''
  editingBuilding.value = null // 건물 수정과 동시 편집 방지
  editingSite.value = site
  siteEditForm.value = {
    name: site.name && site.name !== '-' ? site.name : '',
    address: site.address || '',
  }
}

function cancelEditSite() {
  editingSite.value = null
  actionError.value = ''
}

async function saveSiteEdit() {
  if (saving.value || !editingSite.value) return
  const name = siteEditForm.value.name.trim()
  if (!name) {
    actionError.value = '사이트명을 입력해 주세요.'
    return
  }

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    await updateMeetingSite(editingSite.value.siteId, {
      name,
      address: siteEditForm.value.address.trim(),
    })
    successMessage.value = '사이트 정보를 수정했습니다.'
    editingSite.value = null
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeSiteModal()
      return
    }
    actionError.value = error?.message || '사이트 수정에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

function openEditBuilding(building) {
  actionError.value = ''
  successMessage.value = ''
  editingSite.value = null // 사이트 수정과 동시 편집 방지
  editingBuilding.value = building
  buildingEditForm.value = { name: building.name && building.name !== '-' ? building.name : '' }
}

function cancelEditBuilding() {
  editingBuilding.value = null
  actionError.value = ''
}

async function saveBuildingEdit() {
  if (saving.value || !editingBuilding.value) return
  const name = buildingEditForm.value.name.trim()
  if (!name) {
    actionError.value = '건물명을 입력해 주세요.'
    return
  }

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    await updateMeetingBuilding(editingBuilding.value.buildingId, {
      siteId: editingBuilding.value.siteId,
      name,
    })
    successMessage.value = '건물명을 수정했습니다.'
    editingBuilding.value = null
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeSiteModal()
      return
    }
    actionError.value = error?.message || '건물 수정에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

function buildingsOfSite(siteId) {
  return buildings.value.filter((building) => building.siteId === siteId)
}

async function removeSite(site) {
  if (saving.value) return

  const childBuildings = buildingsOfSite(site.siteId)
  if (childBuildings.length) {
    actionError.value = `'${site.name}' 사이트에 건물이 ${childBuildings.length}개 있어 삭제할 수 없습니다. 건물을 먼저 삭제하세요.`
    return
  }
  if (!window.confirm(`'${site.name}' 사이트를 삭제하시겠습니까?`)) return

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    await deleteMeetingSite(site.siteId)
    successMessage.value = '사이트를 삭제했습니다.'
    if (editingSite.value?.siteId === site.siteId) editingSite.value = null
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeSiteModal()
      return
    }
    actionError.value = error?.message || '사이트 삭제에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function removeBuilding(building) {
  if (saving.value) return

  const roomCount = roomCountByBuilding(building.buildingId)
  if (roomCount) {
    actionError.value = `'${building.name}' 건물에 회의실이 ${roomCount}개 있어 삭제할 수 없습니다. 회의실을 먼저 삭제하세요.`
    return
  }
  if (!window.confirm(`'${building.name}' 건물을 삭제하시겠습니까?`)) return

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    await deleteMeetingBuilding(building.buildingId)
    successMessage.value = '건물을 삭제했습니다.'
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeSiteModal()
      return
    }
    actionError.value = error?.message || '건물 삭제에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function saveRoom() {
  if (saving.value) return

  const siteId = roomForm.value.siteId
  if (!siteId) {
    actionError.value = '사이트를 먼저 선택해 주세요.'
    return
  }

  if (editingRoom.value) {
    if (!roomForm.value.buildingName.trim()) {
      actionError.value = '건물명을 입력해 주세요.'
      return
    }
  } else if (!roomForm.value.buildingId) {
    actionError.value = '건물을 선택해 주세요. 사이트에 건물이 없으면 사이트/건물을 추가하세요.'
    return
  }

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    const buildingId = editingRoom.value
      ? await resolveEditBuildingId(siteId, roomForm.value.buildingName.trim())
      : roomForm.value.buildingId

    const rawFloor = roomForm.value.floor
    const floorValue = rawFloor === '' || rawFloor === null || rawFloor === undefined ? null : Number(rawFloor)
    const payload = {
      buildingId,
      name: roomForm.value.name.trim(),
      floor: floorValue,
      capacity: Number(roomForm.value.capacity),
    }

    if (editingRoom.value) {
      await updateMeetingRoom(editingRoom.value.roomId, payload)
      if (roomForm.value.isAvailable !== editingRoom.value.isAvailable) {
        await changeMeetingRoomAvailability(editingRoom.value.roomId, roomForm.value.isAvailable)
      }
      successMessage.value = '회의실 정보를 수정했습니다.'
    } else {
      await createMeetingRoom({ ...payload, isAvailable: roomForm.value.isAvailable })
      successMessage.value = '회의실을 등록했습니다.'
    }

    closeRoomModal()
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeRoomModal()
      return
    }
    actionError.value = error?.message || '저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function resolveEditBuildingId(siteId, buildingName) {
  const current = buildings.value.find((building) => building.buildingId === editingRoom.value.buildingId)

  if (current && current.siteId === siteId && current.name === buildingName) {
    return current.buildingId
  }

  const sameNameBuilding = buildings.value.find(
    (building) => building.siteId === siteId && building.name === buildingName,
  )
  if (sameNameBuilding) return sameNameBuilding.buildingId

  if (current && current.siteId === siteId) {
    await updateMeetingBuilding(current.buildingId, { siteId, name: buildingName })
    return current.buildingId
  }

  const created = await createMeetingBuilding({ siteId, name: buildingName })
  return created.buildingId
}

async function removeRoom(room) {
  if (saving.value) return
  if (!window.confirm(`'${room.name}' 회의실을 삭제하시겠습니까?`)) return

  actionError.value = ''
  successMessage.value = ''

  try {
    await deleteMeetingRoom(room.roomId)
    successMessage.value = '회의실을 삭제했습니다.'
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }
    actionError.value = error?.message || '삭제에 실패했습니다.'
  }
}

async function saveSite() {
  if (saving.value) return

  const siteName = siteForm.value.siteName.trim()
  const buildingName = siteForm.value.buildingName.trim()
  if (!siteName || !buildingName) {
    actionError.value = '사이트명과 건물명을 입력해 주세요.'
    return
  }

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    const existingSite = sites.value.find(
      (site) => site.name.trim().toLowerCase() === siteName.toLowerCase(),
    )
    if (existingSite) {
      await createMeetingBuilding({ siteId: existingSite.siteId, name: buildingName })
      successMessage.value = `'${existingSite.name}' 사이트에 '${buildingName}' 건물을 추가했습니다.`
    } else {
      await createSiteWithBuilding({ siteName, buildingName })
      successMessage.value = '사이트와 건물을 추가했습니다.'
    }
    closeSiteModal()
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeSiteModal()
      return
    }
    actionError.value = error?.message || '추가에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

function createEmptyRoomForm() {
  return { name: '', siteId: '', buildingId: '', buildingName: '', floor: 1, capacity: 6, isAvailable: true }
}

function normalizeRoom(item) {
  return {
    roomId: item?.roomId || '',
    name: item?.name || '-',
    siteId: item?.siteId || '',
    siteName: item?.siteName || '-',
    buildingId: item?.buildingId || '',
    buildingName: item?.buildingName || '-',
    floor: item?.floor ?? null,
    capacity: item?.capacity ?? 0,
    isAvailable: (item?.isAvailable ?? item?.available) !== false,
  }
}

function normalizeSite(item) {
  return {
    siteId: item?.siteId || '',
    name: item?.name || '-',
    address: item?.address || '',
  }
}

function normalizeBuilding(item) {
  return {
    buildingId: item?.buildingId || '',
    siteId: item?.siteId || '',
    name: item?.name || '-',
  }
}
</script>

<template>
  <section class="page admin-page admin-rooms-page">
    <header class="page-header rooms-header admin-rooms-topbar">
      <div>
        <h1>회의실 관리</h1>
        <p>사이트·건물을 등록하고 회의실 운영 상태를 관리합니다.</p>
      </div>
      <div class="admin-actions admin-rooms-actions">
        <ActionButton variant="secondary" @click="openSiteModal">
          <Building2 :size="16" /> 사이트/건물 추가
        </ActionButton>
        <ActionButton variant="primary" @click="openCreateRoom">
          <Plus :size="16" /> 회의실 등록
        </ActionButton>
        <div class="admin-edit-menu" @click.stop>
          <!-- <ActionButton variant="secondary" @click="toggleEditMenu">
            <Activity :size="16" /> 편집 관리 <ChevronDown :size="14" />
          </ActionButton> -->
          <div v-if="editMenu" class="admin-edit-menu-list">
            <button type="button" @click="openSiteModal(); closeEditMenu()">사이트 / 건물 관리</button>
            <button type="button" @click="viewMode = 'list'; closeEditMenu()">회의실 목록(리스트)</button>
          </div>
        </div>
      </div>
    </header>

    <article v-if="loading" class="card empty-state">회의실 데이터를 불러오는 중입니다.</article>

    <article v-else-if="forbidden" class="card empty-state">
      <h2>접근 권한 없음</h2>
      <p>이 화면은 관리자 계정만 확인할 수 있습니다.</p>
    </article>

    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions retry-actions">
        <ActionButton variant="secondary" @click="loadPage">다시 시도</ActionButton>
      </div>
    </article>

    <template v-else>
      <div v-if="successMessage" class="card feedback-card">
        <p class="settings-success">{{ successMessage }}</p>
      </div>
      <div v-if="actionError" class="card feedback-card">
        <div class="error-box">{{ actionError }}</div>
      </div>

      <!-- 통계 카드 4개 (전체폭, 그대로) -->
      <div class="admin-stat-grid">
        <article class="card admin-stat-card">
          <span class="admin-stat-icon total"><DoorClosed :size="22" /></span>
          <div class="admin-stat-copy"><span>전체 회의실</span><strong>{{ stats.total }}</strong><em>등록된 전체 회의실 수</em></div>
        </article>
        <article class="card admin-stat-card">
          <span class="admin-stat-icon inuse"><Activity :size="22" /></span>
          <div class="admin-stat-copy"><span>현재 사용 중</span><strong>{{ stats.inUse }}</strong><em>지금 사용 중인 회의실</em></div>
        </article>
        <article class="card admin-stat-card">
          <span class="admin-stat-icon booked"><CalendarCheck2 :size="22" /></span>
          <div class="admin-stat-copy"><span>오늘 예약</span><strong>{{ stats.todayReservations }}</strong><em>오늘 예정된 예약 수</em></div>
        </article>
        <article class="card admin-stat-card">
          <span class="admin-stat-icon unavailable"><Ban :size="22" /></span>
          <div class="admin-stat-copy"><span>사용 불가</span><strong>{{ stats.unavailable }}</strong><em>점검·비활성 회의실</em></div>
        </article>
      </div>

      <div class="admin-rooms-layout">
        <div class="admin-rooms-main">
          <!-- 사이트 / 건물 관리 (표) -->
          <article class="card admin-site-table-card">
            <div class="admin-site-table-head">
              <strong>사이트 / 건물 관리</strong>
              <!-- <ActionButton variant="secondary" @click="openSiteModal">
                <Plus :size="16" /> 사이트/건물 추가
              </ActionButton> -->
            </div>
            <div class="table-card admin-site-table">
              <table>
                <thead>
                  <tr>
                    <th>사이트</th>
                    <th>건물</th>
                    <th>회의실 수</th>
                    <th>사용 가능</th>
                    <th>상태</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in pagedSiteRows"
                    :key="row.buildingId"
                    :class="{ 'is-selected': buildingFilter === row.buildingId }"
                    @click="toggleBuildingFilter(row)"
                  >
                    <td><span class="admin-site-cell"><MapPin :size="14" /> {{ row.siteName }}</span></td>
                    <td>{{ row.name }}</td>
                    <td>{{ row.roomCount }}개</td>
                    <td><span class="admin-site-available">{{ row.availableCount }}개</span></td>
                    <td>
                      <span :class="['badge', 'admin-room-status-badge', row.status === 'operating' ? 'success' : 'warning']">
                        {{ row.status === 'operating' ? '운영 중' : '점검 중' }}
                      </span>
                    </td>
                    <td class="admin-room-action-cell">
                      <button class="icon-text admin-room-action-button" type="button" @click.stop="editSiteOfRow(row)">수정</button>
                      <button class="icon-text danger admin-room-action-button admin-room-action-button--danger" type="button" @click.stop="removeBuilding(row)">삭제</button>
                    </td>
                  </tr>
                  <tr v-if="!siteBuildingRows.length">
                    <td colspan="6" class="empty-state-inline">등록된 사이트 / 건물이 없습니다.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="sitePageCount > 1" class="admin-board-footer">
              <span>총 {{ siteBuildingRows.length }}개 건물</span>
              <div class="admin-pagination">
                <button type="button" :disabled="sitePage <= 1" @click="sitePage = Math.max(1, sitePage - 1)"><ChevronLeft :size="16" /></button>
                <button v-for="page in siteVisiblePageNumbers" :key="page" type="button" :class="{ active: page === sitePage }" @click="sitePage = page">{{ page }}</button>
                <button type="button" :disabled="sitePageCount <= sitePage" @click="sitePage = Math.min(sitePageCount, sitePage + 1)"><ChevronRight :size="16" /></button>
              </div>
            </div>
          </article>

          <!-- 툴바: 날짜 / 필터 / 검색 -->
          <article class="card admin-board-toolbar">
            <div class="admin-date-control">
              <button class="admin-nav-button" type="button" aria-label="이전 날짜" @click="shiftDay(-1)"><ChevronLeft :size="18" /></button>
              <span class="admin-date-pill"><Calendar :size="16" /> {{ displayDateLabel }}</span>
              <button class="admin-nav-button" type="button" aria-label="다음 날짜" @click="shiftDay(1)"><ChevronRight :size="18" /></button>
              <button class="admin-today-button" type="button" @click="date = todayKst()">오늘</button>
            </div>
            <div class="admin-board-filters">
              <AppSelect v-model="buildingFilter" class="admin-board-select">
                <option v-for="option in buildingOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </AppSelect>
              <AppSelect v-model="capacityFilter" class="admin-board-select">
                <option v-for="option in capacityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </AppSelect>
              <label class="admin-search-field">
                <Search :size="18" />
                <input v-model="globalSearch" type="search" placeholder="회의실 검색" />
              </label>
            </div>
          </article>

          <!-- 타임라인 / 리스트 토글 + 범례 -->
          <div class="admin-board-head">
            <div class="admin-view-tabs">
              <button type="button" class="admin-view-tab" :class="{ active: viewMode === 'timeline' }" @click="viewMode = 'timeline'">
                <Clock3 :size="16" /> 타임라인
              </button>
              <button type="button" class="admin-view-tab" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
                <List :size="16" /> 리스트
              </button>
            </div>
            <div class="admin-legend">
              <span><i class="inuse"></i>사용 중</span>
              <span><i class="booked"></i>예약됨</span>
              <span><i class="unavailable"></i>사용 불가</span>
              <span><i class="available"></i>사용 가능</span>
            </div>
          </div>

          <!-- 타임라인 보드 -->
          <section v-if="viewMode === 'timeline'" class="card admin-board-card admin-timeline">
            <div class="room-timeline-scroll" :style="{ '--hour-px': TIMELINE.hourPx + 'px' }">
              <div class="room-time-header admin-time-header">
                <div class="room-name-spacer admin-name-spacer">회의실</div>
                <div class="room-hours">
                  <span v-for="hour in timelineHours" :key="hour">{{ String(hour).padStart(2, '0') }}:00</span>
                </div>
              </div>

              <div class="admin-timeline-body">
                <div
                  v-for="(room, index) in pagedBoardRooms"
                  :key="room.roomId"
                  class="admin-timeline-row"
                  @click="selectRoom(room)"
                >
                  <RoomTimelineRow
                    :room="room"
                    :blocks="filteredBlocksByRoom[room.roomId] || []"
                    :name-map="nameMap"
                    :date="date"
                    :compact-meta="true"
                    :show-empty-label="false"
                    :show-now-label="index === 0"
                    :selected="room.roomId === selectedRoomId"
                    @block-click="onBlockClick"
                    @track-drag="onTrackDrag"
                  />
                </div>
                <!-- 행들을 관통하는 단일 '현재' 세로 바(행별 마커는 CSS로 숨김 → 끊김 없이 일직선) -->
                <span v-if="showNowBar" class="admin-now-bar" :style="adminNowBarStyle()"><em>현재</em></span>
              </div>

              <div v-if="!boardRooms.length" class="empty-state-inline board-empty-state">표시할 회의실이 없습니다.</div>
            </div>

            <div v-if="boardRooms.length" class="admin-board-footer">
              <span>총 {{ boardRooms.length }}개 회의실</span>
              <div class="admin-pagination">
                <button type="button" :disabled="timelineCurrentPage <= 1" @click="timelineCurrentPage = Math.max(1, timelineCurrentPage - 1)"><ChevronLeft :size="16" /></button>
                <button v-for="page in timelineVisiblePageNumbers" :key="page" type="button" :class="{ active: page === timelineCurrentPage }" @click="timelineCurrentPage = page">{{ page }}</button>
                <button type="button" :disabled="timelinePageCount <= timelineCurrentPage" @click="timelineCurrentPage = Math.min(timelinePageCount, timelineCurrentPage + 1)"><ChevronRight :size="16" /></button>
              </div>
            </div>
          </section>

          <!-- 리스트(회의실 관리 표) -->
          <div v-else class="table-card admin-data-table">
            <table>
              <thead>
                <tr>
                  <th>회의실</th>
                  <th>사이트</th>
                  <th>건물</th>
                  <th>층</th>
                  <th>정원</th>
                  <th>상태</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="room in filteredRooms" :key="room.roomId" :class="{ 'is-selected': room.roomId === selectedRoomId }" @click="selectRoom(room)">
                  <td>{{ room.name }}</td>
                  <td>{{ room.siteName }}</td>
                  <td>{{ room.buildingName }}</td>
                  <td>{{ room.floor === null ? '-' : `${room.floor}F` }}</td>
                  <td>{{ room.capacity }}명</td>
                  <td>
                    <span :class="['badge', 'admin-room-status-badge', room.isAvailable ? 'success' : 'warning']">
                      {{ room.isAvailable ? '운영 중' : '사용 제한' }}
                    </span>
                  </td>
                  <td class="admin-room-action-cell">
                    <button class="icon-text admin-room-action-button" type="button" @click.stop="openEditRoom(room)">수정</button>
                    <button class="icon-text danger admin-room-action-button admin-room-action-button--danger" type="button" @click.stop="removeRoom(room)">삭제</button>
                  </td>
                </tr>
                <tr v-if="!filteredRooms.length">
                  <td colspan="7" class="empty-state-inline">표시할 회의실이 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 우측 상세 패널 -->
        <aside class="card admin-detail-panel">
          <template v-if="selectedRoom">
            <div class="admin-detail-header">
              <h2>{{ selectedRoom.name }}</h2>
              <span :class="['badge', statusMeta[selectedRoomStatus].badge]">{{ statusMeta[selectedRoomStatus].label }}</span>
            </div>

            <div class="admin-detail-edit-actions">
              <button type="button" @click="openEditRoom(selectedRoom)"><Pencil :size="13" /> 회의실 수정</button>
            </div>

            <h3 class="admin-detail-subtitle">관리 정보</h3>
            <dl class="admin-detail-info">
              <div><dt>사이트명</dt><dd>{{ selectedRoom.siteName }}</dd></div>
              <div><dt>건물명</dt><dd>{{ selectedRoom.buildingName }}</dd></div>
              <div><dt>회의실명</dt><dd>{{ selectedRoom.name }}</dd></div>
              <div><dt>층</dt><dd>{{ selectedRoom.floor === null ? '-' : `${selectedRoom.floor}층` }}</dd></div>
              <div><dt>수용 인원</dt><dd>1 ~ {{ selectedRoom.capacity }}명</dd></div>
              <div><dt>상태</dt><dd><span class="admin-state-dot" :class="selectedRoom.isAvailable ? 'on' : 'off'"></span>{{ selectedRoom.isAvailable ? '운영 중' : '사용 제한' }}</dd></div>
            </dl>

            <template v-if="currentMeeting">
              <h3 class="admin-detail-subtitle">현재 회의</h3>
              <div class="admin-detail-current">
                <div>
                  <strong>{{ currentMeeting.title }}</strong>
                  <span>{{ currentMeeting.start }} - {{ currentMeeting.end }}</span>
                </div>
                <button type="button" class="admin-detail-ghost" @click="openDetail(currentMeeting)">상세 보기</button>
              </div>
            </template>

            <div class="admin-detail-subtitle-row">
              <h3 class="admin-detail-subtitle">오늘 일정</h3>
              <span class="admin-detail-count">{{ selectedRoomBlocks.length }}건</span>
            </div>
            <ul v-if="selectedRoomBlocks.length" class="admin-detail-schedule">
              <li v-for="block in selectedRoomBlocks" :key="block.meetingId" @click="openDetail(block)">
                <i :class="block.tone"></i>
                <span class="admin-schedule-time">{{ block.start }} - {{ block.end }}</span>
                <span class="admin-schedule-title">{{ block.title }}</span>
                <em :class="block.tone">{{ blockStatusLabel(block) }}</em>
              </li>
            </ul>
            <p v-else class="admin-detail-empty">오늘 예약된 회의가 없습니다.</p>

            <h3 class="admin-detail-subtitle">사용 현황 (오늘)</h3>
            <div class="admin-usage-bar">
              <span v-for="seg in usageSegments" :key="seg.key" class="admin-usage-seg" :class="seg.tone" :style="{ left: seg.left, width: seg.width }"></span>
            </div>
            <div class="admin-usage-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
            <div class="admin-legend admin-usage-legend">
              <span><i class="inuse"></i>사용 중</span>
              <span><i class="booked"></i>예약됨</span>
              <span><i class="unavailable"></i>사용 불가</span>
              <span><i class="available"></i>사용 가능</span>
            </div>

            <!-- 사용 빈도/가동률: "사용 현황 (오늘)"과 분리된 별도 섹션(카드) -->
            <section class="admin-usage-section">
              <div class="admin-detail-subtitle-row">
                <h3 class="admin-detail-subtitle">사용 빈도</h3>
                <span class="admin-detail-count">평일 09–18시 기준</span>
              </div>
              <div class="admin-usage-stats">
                <div class="admin-usage-stat">
                  <span class="admin-usage-stat-label">이번 주 예약</span>
                  <strong class="admin-usage-stat-value">{{ selectedRoomUsage.weekCount }}<em>건</em></strong>
                </div>
                <div class="admin-usage-stat">
                  <span class="admin-usage-stat-label">이번 달 예약</span>
                  <strong class="admin-usage-stat-value">{{ selectedRoomUsage.monthCount }}<em>건</em></strong>
                </div>
                <div class="admin-usage-stat">
                  <span class="admin-usage-stat-label">평균 가동률</span>
                  <strong class="admin-usage-stat-value">{{ selectedRoomUsage.utilization }}<em>%</em></strong>
                </div>
              </div>
              <p class="admin-usage-stat-note">가동률 = 이번 주 평일 예약 시간 ÷ 운영 시간(평일 09–18시)</p>
            </section>

            <!-- 시간대별 사용 패턴: 가동률 통계와 동일 기간(이번 주 평일) 막대 그래프 -->
            <section class="admin-usage-section admin-hourly-section">
              <div class="admin-detail-subtitle-row">
                <h3 class="admin-detail-subtitle">시간대별 사용</h3>
                <span class="admin-detail-count">이번 주 · 평일</span>
              </div>
              <div v-if="selectedRoomHourly.total" class="admin-hourly-chart">
                <div
                  v-for="bucket in selectedRoomHourly.buckets"
                  :key="bucket.hour"
                  class="admin-hourly-col"
                  :title="`${String(bucket.hour).padStart(2, '0')}시 ${bucket.count}건`"
                >
                  <div class="admin-hourly-track">
                    <span
                      class="admin-hourly-bar"
                      :class="{ peak: bucket.count === selectedRoomHourly.max }"
                      :style="{ height: hourlyBarHeight(bucket.count, selectedRoomHourly.max) }"
                    ></span>
                  </div>
                  <span class="admin-hourly-axis">{{ String(bucket.hour).padStart(2, '0') }}</span>
                </div>
              </div>
              <p v-else class="admin-detail-empty">이번 주 예약 데이터가 없습니다.</p>
            </section>

            <!-- <button type="button" class="admin-detail-refresh" @click="reloadAllData">
              <ExternalLink :size="15" /> 최신 정보 보기
            </button> -->
          </template>
          <p v-else class="admin-detail-empty">회의실을 선택하면 상세 정보가 표시됩니다.</p>
        </aside>
      </div>

      <!-- 회의 상세 모달 -->
      <ModalShell v-if="detail" modal-class="detail-modal" @close="closeDetail">
        <header>
          <div><h2>{{ detail.title }}</h2></div>
          <button class="modal-close" type="button" aria-label="닫기" @click="closeDetail">×</button>
        </header>
        <div class="detail-body">
          <dl class="detail-list">
            <div><dt>날짜 / 시간</dt><dd>{{ detailDateLabel ? detailDateLabel + '  ' : '' }}{{ detailTimeLabel }}</dd></div>
            <div><dt>회의실</dt><dd>{{ selectedRoom ? `${selectedRoom.siteName} · ${selectedRoom.buildingName}` : '-' }}</dd></div>
            <div v-if="isRestrictedDetail && detail.reason"><dt>사유</dt><dd>{{ detail.reason }}</dd></div>
            <template v-if="!isRestrictedDetail">
              <div><dt>예약자</dt><dd>{{ detailHostName }}</dd></div>
              <div>
                <dt>참석자</dt>
                <dd v-if="detailFull && detailAttendeeList.length" class="detail-chip-group">
                  <span v-for="(name, index) in detailAttendeeList" :key="index" class="detail-chip">{{ name }}</span>
                </dd>
                <dd v-else>-</dd>
              </div>
            </template>
          </dl>
          <p v-if="detailRestricted && !isRestrictedDetail" class="detail-note">상세 정보를 불러올 수 없습니다.</p>
        </div>
      </ModalShell>

      <!-- 회의실 등록/수정 모달 (기존 유지) -->
      <!-- 시간대 사용 제한(차단) 등록 모달 -->
      <ModalShell v-if="blockModal" modal-class="admin-modal" @close="closeBlockModal">
        <header class="admin-modal-header">
          <div class="admin-modal-title">
            <h2>시간대 사용 제한</h2>
            <p class="admin-modal-subtitle">선택한 회의실의 특정 시간대를 예약 불가로 막습니다.</p>
          </div>
          <button type="button" class="admin-modal-close" @click="closeBlockModal">닫기</button>
        </header>
        <form class="admin-modal-form" @submit.prevent="saveBlock">
          <div class="admin-modal-body">
            <p v-if="actionError" class="admin-modal-inline-error">{{ actionError }}</p>
            <label>회의실<input :value="selectedRoom ? selectedRoom.name : ''" disabled></label>
            <label>날짜<input :value="displayDateLabel" disabled></label>
            <div class="form-row two">
              <label>시작<input type="time" v-model="blockForm.start" required></label>
              <label>종료<input type="time" v-model="blockForm.end" required></label>
            </div>
            <label>사유 (선택)<input v-model="blockForm.reason" placeholder="예: 시설 점검" maxlength="200"></label>
          </div>
          <footer class="admin-modal-footer">
            <div class="admin-modal-actions-left"></div>
            <div class="admin-modal-actions-right">
              <ActionButton variant="secondary" type="button" @click="closeBlockModal">취소</ActionButton>
              <ActionButton variant="primary" type="submit" :disabled="saving">{{ saving ? '등록 중...' : '사용 제한' }}</ActionButton>
            </div>
          </footer>
        </form>
      </ModalShell>

      <ModalShell v-if="roomModal" modal-class="admin-modal" @close="closeRoomModal">
        <header class="admin-modal-header">
          <div class="admin-modal-title">
            <h2>{{ editingRoom ? '회의실 정보 수정' : '회의실 등록' }}</h2>
            <p class="admin-modal-subtitle">회의실 이름과 위치, 정원·운영 상태를 입력해 주세요.</p>
          </div>
          <button type="button" class="admin-modal-close" @click="closeRoomModal">닫기</button>
        </header>
        <form class="admin-modal-form" @submit.prevent="saveRoom">
          <div class="admin-modal-body">
            <p v-if="actionError" class="admin-modal-inline-error">{{ actionError }}</p>
            <label>회의실 이름<input v-model="roomForm.name" required></label>
            <div class="form-row two">
              <label>
                사이트
                <AppSelect v-model="roomForm.siteId">
                  <option v-for="site in sites" :key="site.siteId" :value="site.siteId">{{ site.name }}</option>
                </AppSelect>
              </label>
              <label>
                건물
                <AppSelect v-if="!editingRoom" v-model="roomForm.buildingId">
                  <option v-for="building in formBuildings" :key="building.buildingId" :value="building.buildingId">
                    {{ building.name }}
                  </option>
                </AppSelect>
                <input v-else v-model="roomForm.buildingName" placeholder="건물명 입력">
              </label>
            </div>
            <p v-if="!editingRoom && !formBuildings.length" class="admin-modal-note">
              선택한 사이트에 등록된 건물이 없습니다. 먼저 사이트/건물을 추가하세요.
            </p>
            <p v-else-if="isRenamedBuilding" class="admin-modal-note">
              건물 이름이 '{{ roomForm.buildingName.trim() }}'(으)로 변경됩니다 (해당 건물을 쓰는 다른 회의실에도 반영).
            </p>
            <div class="form-row two">
              <label>층<input type="number" v-model.number="roomForm.floor"></label>
              <label>정원<input type="number" min="1" v-model.number="roomForm.capacity"></label>
            </div>
            <label class="admin-toggle-row">
              <span>운영 중</span>
              <input type="checkbox" v-model="roomForm.isAvailable">
            </label>
          </div>
          <footer class="admin-modal-footer">
            <div class="admin-modal-actions-left"></div>
            <div class="admin-modal-actions-right">
              <ActionButton variant="secondary" type="button" @click="closeRoomModal">취소</ActionButton>
              <ActionButton variant="primary" type="submit" :disabled="saving">{{ saving ? '저장 중...' : '저장' }}</ActionButton>
            </div>
          </footer>
        </form>
      </ModalShell>

      <!-- 사이트/건물 관리 모달 (기존 유지) -->
      <ModalShell v-if="siteModal" modal-class="admin-modal" @close="closeSiteModal">
        <header class="admin-modal-header">
          <div class="admin-modal-title">
            <h2>사이트 / 건물 관리</h2>
            <p class="admin-modal-subtitle">사이트와 건물을 추가하거나 기존 항목을 수정·삭제합니다.</p>
          </div>
          <button type="button" class="admin-modal-close" @click="closeSiteModal">닫기</button>
        </header>

        <div class="admin-modal-body">
          <p v-if="actionError" class="admin-modal-inline-error">{{ actionError }}</p>

          <form class="site-add-form" @submit.prevent="saveSite">
            <div class="form-row two">
              <label>사이트<input v-model="siteForm.siteName" required placeholder="예: 판교"></label>
              <label>건물<input v-model="siteForm.buildingName" required placeholder="예: 본관"></label>
            </div>
            <div class="admin-modal-actions-right">
              <ActionButton variant="secondary" type="button" @click="closeSiteModal">취소</ActionButton>
              <ActionButton variant="primary" type="submit" :disabled="saving">{{ saving ? '추가 중...' : '추가' }}</ActionButton>
            </div>
          </form>

          <div class="site-manage">
            <h3 class="site-manage-title">사이트 목록</h3>
            <p v-if="!sites.length" class="empty-text">등록된 사이트가 없습니다.</p>
            <ul v-else class="site-manage-list">
              <li v-for="site in sites" :key="site.siteId" class="site-item">
                <div class="site-row">
                  <form
                    v-if="editingSite && editingSite.siteId === site.siteId"
                    class="site-edit-form"
                    @submit.prevent="saveSiteEdit"
                  >
                    <input v-model="siteEditForm.name" required placeholder="사이트명">
                    <input v-model="siteEditForm.address" placeholder="주소(선택)">
                    <button class="primary-button small" type="submit" :disabled="saving">{{ saving ? '저장 중...' : '저장' }}</button>
                    <button class="secondary-button small" type="button" @click="cancelEditSite">취소</button>
                  </form>
                  <template v-else>
                    <div class="site-row-info">
                      <strong>{{ site.name }}</strong>
                      <span class="site-row-address">{{ site.address || '주소 미등록' }}</span>
                    </div>
                    <div class="site-row-actions">
                      <button class="secondary-button small" type="button" @click="openEditSite(site)">수정</button>
                      <button class="secondary-button small danger" type="button" :disabled="saving" @click="removeSite(site)">삭제</button>
                    </div>
                  </template>
                </div>

                <ul class="building-sublist">
                  <li
                    v-for="building in buildingsOfSite(site.siteId)"
                    :key="building.buildingId"
                    class="building-row"
                  >
                    <form
                      v-if="editingBuilding && editingBuilding.buildingId === building.buildingId"
                      class="site-edit-form"
                      @submit.prevent="saveBuildingEdit"
                    >
                      <input v-model="buildingEditForm.name" required placeholder="건물명">
                      <button class="primary-button small" type="submit" :disabled="saving">{{ saving ? '저장 중...' : '저장' }}</button>
                      <button class="secondary-button small" type="button" @click="cancelEditBuilding">취소</button>
                    </form>
                    <template v-else>
                      <span class="building-name">{{ building.name }}</span>
                      <span class="building-room-count">회의실 {{ roomCountByBuilding(building.buildingId) }}개</span>
                      <button class="secondary-button small" type="button" @click="openEditBuilding(building)">수정</button>
                      <button class="secondary-button small danger" type="button" :disabled="saving" @click="removeBuilding(building)">삭제</button>
                    </template>
                  </li>
                  <li v-if="!buildingsOfSite(site.siteId).length" class="building-empty">등록된 건물이 없습니다.</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </ModalShell>
    </template>
  </section>
</template>

<style scoped>
/* ── 상단 헤더 / 액션 ───────────────────────────────────────── */
.admin-rooms-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.admin-rooms-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.admin-edit-menu {
  position: relative;
}
.admin-edit-menu-list {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 12;
  min-width: 180px;
  display: grid;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}
.admin-edit-menu-list button {
  text-align: left;
  padding: 11px 14px;
  background: white;
  border: 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.admin-edit-menu-list button:hover {
  background: #fff5ec;
  color: var(--primary-dark);
}

/* ── 통계 카드 ─────────────────────────────────────────────── */
.admin-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.admin-stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 96px;
}
.admin-stat-icon {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
}
.admin-stat-icon.total { background: #eef3ff; color: #3b82f6; }
.admin-stat-icon.inuse { background: #ecfdf5; color: var(--success); }
.admin-stat-icon.booked { background: #fff4ec; color: var(--primary); }
.admin-stat-icon.unavailable { background: #f1f5f9; color: #64748b; }
.admin-stat-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.admin-stat-copy span { color: var(--muted-foreground); font-size: 13px; }
.admin-stat-copy strong { font-size: 28px; line-height: 1; }
.admin-stat-copy em { color: var(--muted-foreground); font-size: 12px; font-style: normal; }

/* ── 2단 레이아웃 ──────────────────────────────────────────── */
/* 위 통계 카드와 동일한 4열 트랙(repeat(4,1fr)+gap 14px)으로 깔아, 좌측 메인=카드 3개 폭(1~3열),
   우측 패널=4번째(사용 불가) 카드 폭(4열)에 정확히 세로 정렬되게 한다. */
.admin-rooms-layout {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}
.admin-rooms-main {
  grid-column: 1 / 4;
  min-width: 0;
  display: grid;
  gap: 14px;
}
.admin-detail-panel {
  grid-column: 4 / 5;
}

/* ── 사이트/건물 관리 표 ───────────────────────────────────── */
.admin-site-table-card { padding: 16px 18px; }
.admin-site-table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.admin-site-table-head strong { font-size: 15px; }
/* 표 자체는 공용 .admin-data-table 스타일을 재사용하되, 카드 내부라 테두리/여백만 조정 */
.admin-site-table { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.admin-site-table table { table-layout: fixed; }
.admin-site-table th:nth-child(1), .admin-site-table td:nth-child(1) { width: 22%; }
.admin-site-table th:nth-child(2), .admin-site-table td:nth-child(2) { width: 18%; }
.admin-site-table th:nth-child(3), .admin-site-table td:nth-child(3) { width: 13%; }
.admin-site-table th:nth-child(4), .admin-site-table td:nth-child(4) { width: 13%; }
.admin-site-table th:nth-child(5), .admin-site-table td:nth-child(5) { width: 16%; }
.admin-site-table th:nth-child(6), .admin-site-table td:nth-child(6) { width: 18%; }
.admin-site-table tbody tr { cursor: pointer; }
.admin-site-table tbody tr.is-selected { background: #fff8f3; }
/* 사이트 셀: 핀 아이콘 + 사이트명 */
.admin-site-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}
.admin-site-cell svg { color: var(--primary); flex: 0 0 auto; }
/* 사용 가능 수: 초록 강조 */
.admin-site-available { color: var(--success); font-weight: 800; }

/* ── 툴바 ──────────────────────────────────────────────────── */
/* 날짜 컨트롤 + 필터를 한 줄에 고정(nowrap). 필터 묶음이 남은 폭을 차지하고,
   폭이 빠듯하면 셀렉트·검색창이 줄어들어 줄바꿈 없이 한 줄을 유지한다. */
.admin-board-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  padding: 14px 18px;
}
.admin-date-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.admin-nav-button,
.admin-today-button {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  color: var(--foreground);
  padding: 0 12px;
  font-weight: 700;
  cursor: pointer;
}
.admin-nav-button { width: 44px; padding: 0; color: var(--muted-foreground); }
.admin-date-pill {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  padding: 0 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.admin-board-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
}
.admin-board-select { flex: 0 1 auto; min-width: 120px; }
/* 세 요소 높이 통일 기준값. AppSelect의 <select>는 자식 컴포넌트 내부 요소라
   :deep로 직접 잡아야 하고, input/select의 box-sizing 차이를 없애려 border-box로 통일한다. */
.admin-board-filters :deep(.app-select),
.admin-search-field input {
  box-sizing: border-box;
  height: 40px;
  min-height: 40px;
}
.admin-search-field {
  position: relative;
  flex: 1 1 0;
  min-width: 120px;
}
.admin-search-field svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted-foreground);
  pointer-events: none;
}
.admin-search-field input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 14px 0 38px;
  background: white;
  outline: none;
}

/* ── 토글 + 범례 ───────────────────────────────────────────── */
.admin-board-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.admin-view-tabs {
  display: inline-flex;
  gap: 8px;
}
.admin-view-tab {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: white;
  padding: 0 14px;
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.admin-view-tab.active {
  border-color: rgba(243, 115, 33, 0.5);
  background: #fff8f3;
  color: var(--primary);
}
.admin-legend {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: var(--muted-foreground);
}
.admin-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.admin-legend i {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: #2563eb;
}
.admin-legend i.inuse { background: var(--primary); }
.admin-legend i.booked { background: #2563eb; }
.admin-legend i.unavailable { background: #94a3b8; }
.admin-legend i.available { background: white; border: 1px solid var(--border); }

/* ── 타임라인 보드 ─────────────────────────────────────────── */
.admin-board-card { padding: 0; overflow: hidden; }
.admin-time-header .admin-name-spacer {
  display: flex;
  align-items: center;
  padding: 0 18px;
  font-size: 15px;
  font-weight: 800;
}
.admin-timeline-row { cursor: pointer; }
/* 행별 '현재' 마커는 숨기고(행 경계 border로 끊겨 보임) 전체를 관통하는 단일 바로 대체 */
.admin-timeline :deep(.now-marker) { display: none; }
/* 행과 동일한 최소 너비 → 가로 스크롤 시 바가 행과 함께 이동(정렬 유지) */
.admin-timeline-body { position: relative; min-width: calc(190px + var(--hour-px) * 15); }
.admin-now-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ff5b16;
  z-index: 4;
  pointer-events: none;
}
.admin-now-bar em {
  position: absolute;
  top: 6px;
  left: 6px;
  border-radius: 10px;
  background: #ff5b16;
  color: white;
  padding: 4px 9px;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}
/* 블록을 칸 높이에 맞춰 채우고(베이스의 align-content:center가 내용을 세로 중앙 정렬) 모든 블록을 동일 높이로 통일한다.
   compact 기본값이 top:8px·bottom:auto라 내용 적은 회색 차단 블록이 위로 쏠리던 것을 바로잡는다. */
.admin-timeline :deep(.reservation-block) { bottom: 8px; }
.admin-timeline :deep(.reservation-block.tone-inuse) { background: var(--primary); }
.admin-timeline :deep(.reservation-block.tone-booked) { background: #2563eb; }
.admin-timeline :deep(.reservation-block.tone-unavailable) { background: #94a3b8; box-shadow: none; }
.board-empty-state { padding: 48px 16px; }
/* 텍스트(좌) / 페이지네이션(가운데) / 빈 칸(우) 3분할 → 페이지네이션이 영역 정중앙에 온다. */
.admin-board-footer {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding: 12px 18px;
}
.admin-board-footer > span { color: var(--muted-foreground); font-size: 13px; font-weight: 700; }
.admin-board-footer .admin-pagination { justify-self: center; }
.admin-pagination {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.admin-pagination button {
  min-width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: white;
  color: var(--muted-foreground);
  font-weight: 700;
  cursor: pointer;
}
.admin-pagination button.active { border-color: rgba(243, 115, 33, 0.45); color: var(--primary); background: #fff8f3; }
.admin-pagination button:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── 우측 상세 패널 ────────────────────────────────────────── */
.admin-detail-panel {
  position: sticky;
  top: 16px;
  padding: 18px;
  display: grid;
  gap: 12px;
  align-content: start;
}
.admin-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.admin-detail-header h2 { margin: 0; font-size: 18px; }
.admin-detail-edit-actions {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}
.admin-detail-edit-actions button {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  min-height: 32px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: white;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--foreground);
  cursor: pointer;
}
.admin-detail-edit-actions button:hover { border-color: var(--primary); color: var(--primary); }
.admin-detail-subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 800;
  color: var(--muted-foreground);
}
.admin-detail-subtitle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}
.admin-detail-subtitle-row .admin-detail-subtitle { margin: 0; }
.admin-detail-count { color: var(--muted-foreground); font-size: 12px; }
.admin-detail-info {
  display: grid;
  gap: 8px;
  margin: 0;
}
.admin-detail-info > div {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 10px;
}
.admin-detail-info dt { color: var(--muted-foreground); font-size: 13px; }
.admin-detail-info dd { margin: 0; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
.admin-state-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); }
.admin-state-dot.off { background: #94a3b8; }
.admin-detail-current {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
}
.admin-detail-current strong { display: block; font-size: 14px; }
.admin-detail-current span { color: var(--muted-foreground); font-size: 12px; }
.admin-detail-ghost {
  min-height: 32px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: white;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.admin-detail-schedule {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.admin-detail-schedule li {
  display: grid;
  grid-template-columns: 8px auto 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 8px;
  cursor: pointer;
}
.admin-detail-schedule li:hover { background: #f8fafc; }
.admin-detail-schedule i { width: 8px; height: 8px; border-radius: 50%; background: #2563eb; }
.admin-detail-schedule i.inuse { background: var(--primary); }
.admin-detail-schedule i.unavailable { background: #94a3b8; }
.admin-schedule-time { color: var(--muted-foreground); font-size: 12px; font-variant-numeric: tabular-nums; }
.admin-schedule-title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.admin-detail-schedule em { font-style: normal; font-size: 12px; font-weight: 700; color: #2563eb; }
.admin-detail-schedule em.inuse { color: var(--primary); }
.admin-detail-schedule em.unavailable { color: #64748b; }
.admin-detail-empty { color: var(--muted-foreground); font-size: 13px; margin: 4px 0; }
.admin-usage-bar {
  position: relative;
  height: 16px;
  border-radius: 6px;
  background: #f1f5f9;
  overflow: hidden;
}
.admin-usage-seg { position: absolute; top: 0; bottom: 0; background: #2563eb; }
.admin-usage-seg.inuse { background: var(--primary); }
.admin-usage-seg.unavailable { background: #94a3b8; }
.admin-usage-axis {
  display: flex;
  justify-content: space-between;
  color: var(--muted-foreground);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
/* 범례 2+2 배치: 2열 그리드로 [사용 중][예약됨] / [사용 불가][사용 가능] */
.admin-usage-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}
/* "사용 현황 (오늘)"과 분리된 별도 통계 섹션. 자체 테두리 카드 + 위쪽 여백으로 띄워 분리. */
.admin-usage-section {
  margin-top: 8px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: white;
  display: grid;
  gap: 10px;
}
/* 사용 빈도/가동률 작은 통계 카드 3개(가로, 좁으면 줄바꿈) */
.admin-usage-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.admin-usage-stat {
  display: grid;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 8px;
  text-align: center;
  background: #f8fafc;
}
.admin-usage-stat-label { color: var(--muted-foreground); font-size: 11.5px; font-weight: 700; }
.admin-usage-stat-value { font-size: 22px; line-height: 1; font-variant-numeric: tabular-nums; }
.admin-usage-stat-value em { font-size: 12px; font-weight: 700; font-style: normal; color: var(--muted-foreground); margin-left: 2px; }
.admin-usage-stat-note { margin: 2px 0 0; color: var(--muted-foreground); font-size: 11px; line-height: 1.4; }
/* 시간대별 사용 막대 그래프 */
.admin-hourly-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
}
.admin-hourly-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.admin-hourly-track {
  width: 100%;
  height: 64px;
  display: flex;
  align-items: flex-end;
  background: #f1f5f9;
  border-radius: 5px;
  overflow: hidden;
}
.admin-hourly-bar {
  width: 100%;
  min-height: 2px;
  background: #93b4f5;
  border-radius: 5px 5px 0 0;
  transition: height 0.2s ease;
}
.admin-hourly-bar.peak { background: var(--primary); }
.admin-hourly-axis { font-size: 9.5px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
.admin-detail-refresh {
  margin-top: 4px;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.admin-detail-refresh:hover { border-color: var(--primary); color: var(--primary); }

/* ── 피드백 카드 ───────────────────────────────────────────── */
.feedback-card {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px;
}
.feedback-card > * { margin: 0 !important; }

/* ── 리스트(회의실 관리 표) ────────────────────────────────── */
.admin-data-table table { table-layout: fixed; }
.admin-data-table th:nth-child(1), .admin-data-table td:nth-child(1) { width: 24%; }
.admin-data-table th:nth-child(2), .admin-data-table td:nth-child(2) { width: 15%; }
.admin-data-table th:nth-child(3), .admin-data-table td:nth-child(3) { width: 15%; }
.admin-data-table th:nth-child(4), .admin-data-table td:nth-child(4) { width: 8%; }
.admin-data-table th:nth-child(5), .admin-data-table td:nth-child(5) { width: 8%; }
.admin-data-table th:nth-child(6), .admin-data-table td:nth-child(6) { width: 14%; }
.admin-data-table th:nth-child(7), .admin-data-table td:nth-child(7) { width: 16%; }
.admin-data-table tbody tr { cursor: pointer; }
.admin-data-table tbody tr.is-selected { background: #fff8f3; }
.admin-room-status-badge {
  min-height: 32px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  padding: 0 12px;
}
.admin-room-action-cell { white-space: nowrap; }
.admin-room-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
  background: transparent;
  color: var(--primary-dark);
  cursor: pointer;
}
.admin-room-action-button:hover { color: var(--primary); text-decoration: underline; }
.admin-room-action-button + .admin-room-action-button { margin-left: 8px; }
.admin-room-action-button--danger { color: var(--danger); }
.admin-room-action-button--danger:hover { color: #b91c1c; }

/* ── 모달(기존 스타일 유지) ───────────────────────────────── */
.site-add-form { display: grid; gap: 14px; }
.site-add-form .admin-modal-actions-right { display: flex; justify-content: flex-end; gap: 8px; }
.admin-modal-body > label.admin-toggle-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}
.admin-toggle-row > input[type='checkbox'] {
  width: 16px;
  height: 16px;
  min-height: 0;
  flex: 0 0 auto;
  margin: 0;
  cursor: pointer;
}
.site-manage { margin-top: 4px; border-top: 1px solid var(--border); padding-top: 16px; }
.site-manage-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; }
.site-manage-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.site-item { border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
.site-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.site-row-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.site-row-address { color: var(--muted-foreground); font-size: 12px; }
.site-row-actions { display: flex; gap: 6px; flex-shrink: 0; }
.building-sublist {
  list-style: none;
  margin: 8px 0 0;
  padding: 8px 0 0;
  border-top: 1px dashed var(--border);
  display: grid;
  gap: 6px;
}
.building-row { display: flex; align-items: center; gap: 8px; padding-left: 10px; }
.building-name { font-size: 13px; font-weight: 600; }
.building-room-count { color: var(--muted-foreground); font-size: 12px; margin-left: auto; }
.building-empty { padding-left: 10px; color: var(--muted-foreground); font-size: 12px; }
.secondary-button.danger { color: var(--destructive, #dc2626); border-color: var(--destructive, #dc2626); }
.site-edit-form { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; width: 100%; }
.site-edit-form input { flex: 1 1 120px; min-width: 0; }
.site-row .secondary-button,
.building-row .secondary-button,
.site-edit-form button { padding: 6px 12px; font-size: 13px; }

/* ── 반응형 ────────────────────────────────────────────────── */
@media (max-width: 1180px) {
  .admin-rooms-layout { grid-template-columns: minmax(0, 1fr); }
  /* 1단으로 떨어지면 4열 스팬을 풀어 위아래로 쌓이게 한다. */
  .admin-rooms-main,
  .admin-detail-panel { grid-column: auto; }
  .admin-detail-panel { position: static; }
  .admin-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .admin-stat-grid { grid-template-columns: 1fr; }
  .admin-board-toolbar { flex-direction: column; align-items: stretch; }
}
</style>

