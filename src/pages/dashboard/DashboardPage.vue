<script>
import { computed, defineComponent, ref } from 'vue'
import { meetingRoute, openMeetingWindow } from '../../lib/meeting-route'
import { useAuthStore } from '../../stores/auth'
import { mails, myMeetings, minutes, todayReservations } from '../../data/mockData'

const statusLabel = {
  live: '진행 중',
  upcoming: '예정',
  ended: '종료',
  mine: '내 예약',
  booked: '예약됨',
}

export default defineComponent({
  setup() {
    const auth = useAuthStore()
    const todays = myMeetings.filter((meeting) => meeting.start.startsWith('2026-05-22'))
    const selectedId = ref(todays[0]?.id || myMeetings[0].id)
    const selected = computed(() => myMeetings.find((meeting) => meeting.id === selectedId.value) || myMeetings[0])
    const liveMeetingPath = computed(() => meetingRoute(myMeetings.find((meeting) => meeting.status === 'live')?.id))
    const kpis = [
      { label: '읽지 않은 메일', value: mails.filter((mail) => mail.unread).length, to: '/app/mail' },
      { label: '오늘 예정된 회의', value: todays.length, to: '/app/meetings' },
      { label: '최근 내 회의록', value: minutes.length, to: '/app/minutes' },
      { label: '현재 진행 중', value: myMeetings.filter((meeting) => meeting.status === 'live').length, to: liveMeetingPath.value },
    ]
    const openSelectedMeeting = () => {
      if (selected.value?.status !== 'live') return
      openMeetingWindow(selected.value.id)
    }

    return { user: auth.user, todays, selectedId, selected, kpis, myMeetings, todayReservations, statusLabel, meetingRoute, openSelectedMeeting }
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
          <div class="card-head"><div><h2>오늘의 회의 타임라인</h2><p>내가 참여·생성한 회의 · 2026년 5월 22일</p></div><RouterLink to="/app/meetings">전체 회의</RouterLink></div>
          <button v-for="meeting in todays" :key="meeting.id" class="timeline-row" :class="{ selected: selectedId === meeting.id }" @click="selectedId = meeting.id">
            <span>{{ meeting.start.split(' ')[1] }}</span>
            <i :class="meeting.status"></i>
            <strong>{{ meeting.title }}</strong>
            <em>{{ meeting.room }}</em>
            <small>{{ meeting.role === 'host' ? '주최' : '참석' }}</small>
          </button>
        </article>
        <aside class="stack">
          <article class="card"><div class="card-head"><h2>회의 상세</h2></div>
            <dl class="detail-list">
              <div><dt>주제</dt><dd>{{ selected.title }}</dd></div>
              <div><dt>일시</dt><dd>{{ selected.start.replace(' ', ' · ') }}</dd></div>
              <div><dt>장소</dt><dd>{{ selected.room }}</dd></div>
              <div><dt>참여자</dt><dd>{{ selected.attendees.join(', ') }} ({{ selected.attendees.length }}명)</dd></div>
            </dl>
            <button v-if="selected.status === 'live'" class="primary-button small" @click="openSelectedMeeting">회의 입장</button>
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
