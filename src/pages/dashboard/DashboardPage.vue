<script>
import { computed, defineComponent, onMounted, ref } from 'vue'
import { openMeetingWindow } from '../../lib/meeting-route'
import { useAuthStore } from '../../stores/auth'
import { getMeetings, getRooms } from '../../lib/reservations'
import { useUserNames } from '../../composables/useUserNames'
import { compareByEpochAsc, todayKst, utcToKstClock, utcToKstDate } from '../../utils/dateTime'
// 메일·회의록·개인 일정 카드는 이번 작업 범위 밖이라 아직 목업 데이터를 쓴다.
import { mails, minutes, myMeetings } from '../../data/mockData'

const statusLabel = {
  live: '진행 중',
  upcoming: '예정',
  ended: '종료',
  cancelled: '취소됨',
}

export default defineComponent({
  setup() {
    const auth = useAuthStore()
    const myUserId = computed(() => auth.user?.userId || '')
    const { nameMap, resolveNames } = useUserNames()

    const rawMeetings = ref([])
    const rooms = ref([])
    const selectedId = ref('')
    const loadError = ref(false)

    const roomNameMap = computed(() => {
      const map = {}
      for (const room of rooms.value) map[room.roomId] = room.name
      return map
    })

    // 백엔드 회의 응답 → 화면 표시용으로 변환(MeetingsPage와 동일한 상태 매핑 규칙).
    function mapMeeting(meeting) {
      const status =
        meeting.status === 'IN_PROGRESS'
          ? 'live'
          : meeting.status === 'ENDED'
            ? 'ended'
            : meeting.status === 'CANCELLED'
              ? 'cancelled'
              : 'upcoming'
      const attendees = meeting.attendees || []
      return {
        id: meeting.meetingId,
        title: meeting.title,
        status,
        role: meeting.hostUserId === myUserId.value ? 'host' : 'attendee',
        scheduledAt: meeting.scheduledAt,
        scheduledAtMs: new Date(meeting.scheduledAt).getTime(),
        dateKst: utcToKstDate(meeting.scheduledAt),
        startClock: utcToKstClock(meeting.scheduledAt),
        endClock: utcToKstClock(meeting.scheduledEndAt),
        room: meeting.meetingRoomId ? roomNameMap.value[meeting.meetingRoomId] || '회의실' : '원격',
        attendees: attendees.map((attendee) => nameMap[attendee.userId] || '이름 미확인'),
        attendeeCount: attendees.length,
      }
    }

    const meetings = computed(() => rawMeetings.value.map(mapMeeting))

    // 오늘(KST) 회의 — 타임라인용. 취소 제외, 시간순.
    const todays = computed(() =>
      meetings.value
        .filter((meeting) => meeting.dateKst === todayKst() && meeting.status !== 'cancelled')
        .sort((a, b) => compareByEpochAsc(a.scheduledAt, b.scheduledAt)),
    )
    // 현재 진행 중 — 날짜 무관, 모든 IN_PROGRESS.
    const liveMeetings = computed(() => meetings.value.filter((meeting) => meeting.status === 'live'))
    // 오늘 예정된 회의 — 오늘의 SCHEDULED(예정)만.
    const todayScheduledCount = computed(() => todays.value.filter((meeting) => meeting.status === 'upcoming').length)

    // 가장 가까운 '예정/진행중' 회의(전체 날짜 기준, scheduledAt 오름차순). 취소/종료는 후보에서 제외.
    const nextMeeting = computed(
      () =>
        meetings.value
          .filter((meeting) => meeting.status === 'upcoming' || meeting.status === 'live')
          .sort((a, b) => compareByEpochAsc(a.scheduledAt, b.scheduledAt))[0] || null,
    )

    // 회의 상세 표시 대상: 타임라인에서 고른 회의가 있으면 그것, 없으면 가장 가까운 예정 회의.
    // 단, 대상이 취소/종료 상태면 상세를 비운다(null) → 화면에 '예정된 회의가 없습니다'.
    const selected = computed(() => {
      const picked = selectedId.value
        ? todays.value.find((meeting) => meeting.id === selectedId.value)
        : null
      const target = picked || nextMeeting.value
      if (!target) return null
      return target.status === 'upcoming' || target.status === 'live' ? target : null
    })

    const todayLabel = computed(() => {
      const [year, month, day] = todayKst().split('-')
      return `${year}년 ${Number(month)}월 ${Number(day)}일`
    })

    const kpis = computed(() => [
      { label: '읽지 않은 메일', value: mails.filter((mail) => mail.unread).length, to: '/app/mail' },
      { label: '오늘 예정된 회의', value: todayScheduledCount.value, to: '/app/meetings?tab=active' },
      { label: '최근 내 회의록', value: minutes.length, to: '/app/minutes' },
      { label: '현재 진행 중', value: liveMeetings.value.length, to: '/app/meetings?tab=active' },
    ])

    async function load() {
      loadError.value = false
      try {
        const [meetingData, roomData] = await Promise.all([
          getMeetings({ role: 'all' }),
          getRooms({ page: 1, size: 100 }),
        ])
        rooms.value = roomData?.items || []
        rawMeetings.value = meetingData || []
        // 참석자 userId → 이름 배치 변환(N+1 회피).
        const ids = []
        for (const meeting of rawMeetings.value) {
          for (const attendee of meeting.attendees || []) ids.push(attendee.userId)
        }
        resolveNames(ids)
        // 기본 선택 없음(selectedId=''): 회의 상세는 '가장 가까운 예정 회의'(nextMeeting)로 표시된다.
        // 타임라인에서 회의를 클릭하면 그 회의로 바뀐다.
      } catch {
        // 조회 실패와 '회의 없음'을 구분하기 위해 에러 플래그를 세운다(빈 목록은 정상 상태일 수 있음).
        rawMeetings.value = []
        loadError.value = true
      }
    }
    onMounted(load)

    const openSelectedMeeting = () => {
      if (selected.value?.status !== 'live') return
      openMeetingWindow(selected.value.id, { scheduledAt: selected.value.scheduledAtMs })
    }

    return {
      user: auth.user,
      todays,
      selectedId,
      selected,
      kpis,
      myMeetings,
      todayLabel,
      statusLabel,
      loadError,
      openSelectedMeeting,
    }
  },
  template: `
    <section class="page">
      <header class="page-header"><h1>안녕하세요, {{ user?.name }}님</h1><p>오늘의 회의 일정과 업무 현황을 한 눈에 확인하세요.</p></header>
      <div class="metric-grid">
        <RouterLink v-for="kpi in kpis" :key="kpi.label" :to="kpi.to" class="metric-card">
          <span>{{ kpi.label }}</span><strong>{{ kpi.value }}</strong>
        </RouterLink>
      </div>
      <div class="split-grid">
        <article class="card tall">
          <div class="card-head"><div><h2>오늘의 회의 타임라인</h2><p>내가 참여·생성한 회의 · {{ todayLabel }}</p></div><RouterLink to="/app/meetings">전체 회의</RouterLink></div>
          <button v-for="meeting in todays" :key="meeting.id" class="timeline-row" :class="{ selected: selectedId === meeting.id }" @click="selectedId = meeting.id">
            <span>{{ meeting.startClock }}</span>
            <i :class="meeting.status"></i>
            <strong>{{ meeting.title }}</strong>
            <em>{{ meeting.room }}</em>
            <small>{{ meeting.role === 'host' ? '주최' : '참석' }}</small>
          </button>
          <p v-if="loadError" class="empty-text">회의 정보를 불러오지 못했습니다.</p>
          <p v-else-if="!todays.length" class="empty-text">오늘 예정된 회의가 없습니다.</p>
        </article>
        <aside class="stack">
          <article class="card"><div class="card-head"><h2>회의 상세</h2></div>
            <template v-if="selected">
              <dl class="detail-list">
                <div><dt>주제</dt><dd>{{ selected.title }}</dd></div>
                <div><dt>상태</dt><dd>{{ statusLabel[selected.status] }}</dd></div>
                <div><dt>일시</dt><dd>{{ selected.dateKst }} · {{ selected.startClock }} ~ {{ selected.endClock }}</dd></div>
                <div><dt>장소</dt><dd>{{ selected.room }}</dd></div>
                <div><dt>참여자</dt><dd>{{ selected.attendees.join(', ') || '-' }} ({{ selected.attendeeCount }}명)</dd></div>
              </dl>
              <button v-if="selected.status === 'live'" class="primary-button small" @click="openSelectedMeeting">회의 입장</button>
            </template>
            <p v-else-if="loadError" class="empty-text">회의 정보를 불러오지 못했습니다.</p>
            <p v-else class="empty-text">예정된 회의가 없습니다.</p>
          </article>
          <article class="card"><div class="card-head"><h2>개인 일정</h2></div>
            <ul class="compact-list"><li v-for="meeting in myMeetings.slice(0, 5)" :key="meeting.id"><strong>{{ meeting.title }}</strong><span>{{ meeting.start }}</span></li></ul>
          </article>
        </aside>
      </div>
    </section>
  `,
})
</script>
