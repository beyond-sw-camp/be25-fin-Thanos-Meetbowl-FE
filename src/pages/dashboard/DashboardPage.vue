<script>
import { computed, defineComponent, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  FileText,
  Mail,
  MapPin,
  MoreVertical,
  Users,
} from '@lucide/vue'
import { getMeetingJoinBlockedMessage, openMeetingWindow } from '../../lib/meeting-route'
import { useAuthStore } from '../../stores/auth'
import { getMeetings, getRooms } from '../../lib/reservations'
import { getWorkspaceCalendar } from '../../lib/workspace'
import { listMails } from '../../lib/mail'
import { listMinutes } from '../../lib/minutes'
import { useUserNames } from '../../composables/useUserNames'
import { compareByEpochAsc, todayKst, utcToKstClock, utcToKstDate } from '../../utils/dateTime'

const statusLabel = {
  live: '진행 중',
  upcoming: '예정',
  ended: '종료',
  cancelled: '취소됨',
}

export default defineComponent({
  components: {
    Calendar,
    CalendarCheck2,
    CalendarDays,
    Clock3,
    FileText,
    Mail,
    MapPin,
    MoreVertical,
    Users,
  },
  setup() {
    const auth = useAuthStore()
    const router = useRouter()
    const myUserId = computed(() => auth.user?.userId || '')
    const { nameMap, resolveNames } = useUserNames()

    const rawMeetings = ref([])
    const workspaceEvents = ref([])
    const rooms = ref([])
    const selectedId = ref('')
    const timelineExpanded = ref(false)
    const unreadMailCount = ref(0)
    const minuteItems = ref([])
    const loadError = ref(false)
    const scheduleLoadError = ref(false)

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
        attendeeLabel: `${attendees.length ? attendees.map((attendee) => nameMap[attendee.userId] || '이름 미확인')[0] : '참석자 없음'} 외 ${Math.max(attendees.length - 1, 0)}명`,
      }
    }

    const meetings = computed(() => rawMeetings.value.map(mapMeeting))

    // 오늘(KST) 회의 — 타임라인용. 취소 제외, 시간순.
    const todays = computed(() =>
      meetings.value
        .filter((meeting) => meeting.dateKst === todayKst() && meeting.status !== 'cancelled')
        .sort((a, b) => compareByEpochAsc(a.scheduledAt, b.scheduledAt)),
    )
    const hasMoreTodays = computed(() => todays.value.length > 3)
    const visibleTodays = computed(() =>
      timelineExpanded.value ? todays.value : todays.value.slice(0, 3),
    )
    const reviewNeededMinutesCount = computed(() =>
      minuteItems.value.filter((minute) =>
        minute?.reviewerUserId === myUserId.value && minute?.status === 'IN_REVIEW',
      ).length,
    )
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

    const personalSchedules = computed(() =>
      dedupeWorkspaceEvents(workspaceEvents.value)
        .slice()
        .sort((a, b) => compareByEpochAsc(a.startedAt, b.startedAt))
        .slice(0, 5)
        .map((event) => ({
          id: event.eventId,
          title: event.title,
          timeLabel: `${utcToKstDate(event.startedAt)} ${utcToKstClock(event.startedAt)} - ${utcToKstClock(event.endedAt)}`,
          description: event.description || '',
          badgeLabel: event.source === 'MEETING' ? '회의' : '개인',
          badgeTone: event.source === 'MEETING' ? 'navy' : 'primary',
        })),
    )

    function dedupeWorkspaceEvents(events) {
      const seen = new Set()
      const unique = []
      for (const event of events || []) {
        const key = [
          event.sourceId || '',
          event.eventId || '',
          event.source || '',
          event.meetingId || '',
          event.relatedMeetingId || '',
          event.ownerUserId || '',
          event.title || '',
          event.startedAt || '',
          event.endedAt || '',
          event.description || '',
        ].join(':')
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(event)
      }
      return unique
    }

    const todayLabel = computed(() => {
      const [year, month, day] = todayKst().split('-')
      return `${year}년 ${Number(month)}월 ${Number(day)}일`
    })

    const kpis = computed(() => [
      {
        label: '읽지 않은 메일',
        value: unreadMailCount.value,
        note: '개의 새 메일',
        to: '/app/mail',
        icon: Mail,
        tone: 'mail',
      },
      {
        label: '오늘 예정된 회의',
        value: todayScheduledCount.value,
        note: '개의 일정',
        to: '/app/meetings?tab=active',
        icon: CalendarCheck2,
        tone: 'schedule',
      },
      {
        label: '최근 내 회의록',
        value: minuteItems.value.length,
        note: '최근 7일 기준',
        to: '/app/minutes',
        icon: FileText,
        tone: 'minutes',
      },
      {
        label: '검토해야 하는 회의록',
        value: reviewNeededMinutesCount.value,
        note: '건 검토 대기',
        to: '/app/minutes',
        icon: FileText,
        tone: 'live',
      },
    ])

    async function load() {
      loadError.value = false
      scheduleLoadError.value = false
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

      const today = todayKst()
      const from = new Date(`${today}T00:00:00+09:00`).toISOString()
      const to = new Date(`${today}T24:00:00+09:00`).toISOString()
      try {
        workspaceEvents.value = await getWorkspaceCalendar(from, to)
      } catch {
        workspaceEvents.value = []
        scheduleLoadError.value = true
      }

      const [mailResult, minutesResult] = await Promise.allSettled([
        listMails('inbox', { page: 1, size: 100 }),
        listMinutes(),
      ])
      unreadMailCount.value = mailResult.status === 'fulfilled'
        ? (mailResult.value.items || []).filter((mail) => !mail.read).length
        : 0
      minuteItems.value = minutesResult.status === 'fulfilled' ? minutesResult.value : []
    }
    onMounted(load)

    function timelineActionLabel(meeting) {
      if (meeting.status === 'upcoming' && getMeetingJoinBlockedMessage(meeting.scheduledAtMs)) {
        return '입장 대기'
      }
      return meeting.status === 'ended' ? '회의록 보기' : '입장하기'
    }

    function timelineBadgeLabel(meeting) {
      if (meeting.status === 'live') return '진행 중'
      if (meeting.status === 'ended') return '종료'
      return '예정'
    }

    function openMeetingFromTimeline(meeting) {
      if (!meeting) return
      if (meeting.status === 'ended') {
        router.push(`/app/minutes/${meeting.id}`)
        return
      }
      openMeetingWindow(meeting.id, {
        scheduledAt: meeting.scheduledAtMs,
        title: meeting.title,
      })
    }

    function toggleTimelineExpanded() {
      if (!hasMoreTodays.value) return
      timelineExpanded.value = !timelineExpanded.value
    }

    return {
      user: auth.user,
      todays,
      visibleTodays,
      hasMoreTodays,
      timelineExpanded,
      selectedId,
      selected,
      kpis,
      personalSchedules,
      todayLabel,
      statusLabel,
      loadError,
      scheduleLoadError,
      getMeetingJoinBlockedMessage,
      timelineActionLabel,
      timelineBadgeLabel,
      openMeetingFromTimeline,
      toggleTimelineExpanded,
    }
  },
  template: `
    <section class="page dashboard-page">
      <header class="page-header dashboard-hero">
        <div>
          <h1>안녕하세요, {{ user?.name }}님 <span class="dashboard-wave">👋</span></h1>
          <p>오늘도 효율적인 회의와 협업을 시작해볼까요?</p>
        </div>
      </header>
      <div class="metric-grid dashboard-metric-grid">
        <RouterLink v-for="kpi in kpis" :key="kpi.label" :to="kpi.to" class="metric-card dashboard-metric-card">
          <span :class="['dashboard-kpi-icon', kpi.tone]"><component :is="kpi.icon" :size="24" /></span>
          <div class="dashboard-kpi-copy">
            <span>{{ kpi.label }}</span>
            <div class="dashboard-kpi-value-row">
              <strong>{{ kpi.value }}</strong>
              <em>{{ kpi.note }}</em>
            </div>
          </div>
        </RouterLink>
      </div>
      <div class="split-grid dashboard-main-grid">
        <article class="card tall dashboard-timeline-card">
          <div class="card-head">
            <div class="dashboard-section-heading">
              <span class="dashboard-section-icon"><Calendar :size="20" /></span>
              <div><h2>오늘의 회의 타임라인</h2><p>{{ todayLabel }}</p></div>
            </div>
            <RouterLink to="/app/meetings" class="dashboard-card-button">전체 회의 보기</RouterLink>
          </div>
          <article
            v-for="meeting in visibleTodays"
            :key="meeting.id"
            class="dashboard-timeline-entry"
            :class="{ selected: selectedId === meeting.id }"
            @click="selectedId = meeting.id"
          >
            <div class="dashboard-timeline-time">
              <strong>{{ meeting.startClock }}</strong>
              <span :class="['badge', meeting.status === 'ended' ? 'muted' : 'primary']">{{ timelineBadgeLabel(meeting) }}</span>
            </div>
            <div class="dashboard-timeline-line">
              <i :class="meeting.status"></i>
            </div>
            <div class="dashboard-timeline-main">
              <strong>{{ meeting.title }}</strong>
              <div class="dashboard-timeline-meta">
                <span><CalendarDays :size="14" /> {{ meeting.room }}</span>
                <span><Users :size="14" /> {{ meeting.attendeeLabel }}</span>
              </div>
            </div>
            <div class="dashboard-timeline-actions">
              <button
                v-if="meeting.status === 'ended' || meeting.status === 'live' || !getMeetingJoinBlockedMessage(meeting.scheduledAtMs)"
                class="ghost-button dashboard-timeline-action"
                type="button"
                @click.stop="openMeetingFromTimeline(meeting)"
              >{{ timelineActionLabel(meeting) }}</button>
              <button
                v-else
                class="ghost-button dashboard-timeline-action"
                type="button"
                disabled
                title="회의 시작 15분 전부터 입장할 수 있습니다"
              >{{ timelineActionLabel(meeting) }}</button>
              <button class="dashboard-timeline-more" type="button" @click.stop="selectedId = meeting.id"><MoreVertical :size="18" /></button>
            </div>
          </article>
          <p v-if="loadError" class="empty-text">회의 정보를 불러오지 못했습니다.</p>
          <p v-else-if="!visibleTodays.length" class="empty-text">오늘 예정된 회의가 없습니다.</p>
          <div v-if="hasMoreTodays" class="dashboard-timeline-footer">
            <button type="button" class="dashboard-card-button dashboard-expand-button" @click="toggleTimelineExpanded">
              {{ timelineExpanded ? '접기' : '내 회의 더 보기' }}
            </button>
          </div>
        </article>
        <aside class="stack dashboard-side-stack">
          <article class="card dashboard-detail-card">
            <div class="card-head">
              <div class="dashboard-section-heading">
                <span class="dashboard-section-icon"><CalendarDays :size="18" /></span>
                <div><h2>회의 상세</h2></div>
              </div>
              <RouterLink to="/app/meetings" class="dashboard-card-button dashboard-more-button">더 보기</RouterLink>
            </div>
            <template v-if="selected">
              <div class="dashboard-detail-title-row">
                <strong>{{ selected.title }}</strong>
                <span class="badge primary">{{ selected.status === 'live' ? '진행 중' : '예정' }}</span>
              </div>
              <dl class="dashboard-detail-list">
                <div><dt><Clock3 :size="15" /> 상태</dt><dd>{{ statusLabel[selected.status] }}</dd></div>
                <div><dt><Calendar :size="15" /> 일시</dt><dd>{{ selected.dateKst }} {{ selected.startClock }} - {{ selected.endClock }}</dd></div>
                <div><dt><MapPin :size="15" /> 장소</dt><dd>{{ selected.room }}</dd></div>
                <div><dt><Users :size="15" /> 참석자</dt><dd>{{ selected.attendees.join(', ') || '-' }} ({{ selected.attendeeCount }}명)</dd></div>
              </dl>
            </template>
            <p v-else-if="loadError" class="empty-text">회의 정보를 불러오지 못했습니다.</p>
            <p v-else class="empty-text">예정된 회의가 없습니다.</p>
          </article>
          <article class="card dashboard-schedule-card">
            <div class="card-head">
              <div class="dashboard-section-heading">
                <span class="dashboard-section-icon"><Calendar :size="18" /></span>
                <div><h2>개인 일정</h2></div>
              </div>
            </div>
            <ul v-if="personalSchedules.length" class="compact-list dashboard-schedule-list"><li v-for="event in personalSchedules" :key="event.id"><div class="dashboard-schedule-row"><div class="dashboard-schedule-main"><strong>{{ event.title }}</strong><span>{{ event.timeLabel }}</span></div><span :class="['badge', event.badgeTone]">{{ event.badgeLabel }}</span></div><small v-if="event.description" class="dashboard-schedule-note">{{ event.description }}</small></li></ul>
            <p v-else-if="scheduleLoadError" class="empty-text">일정 정보를 불러오지 못했습니다.</p>
            <p v-else class="empty-text">표시할 개인 일정이 없습니다.</p>
          </article>
        </aside>
      </div>
    </section>
  `,
})
</script>
