import { computed, defineComponent, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  adminLogs,
  communityPosts,
  companies,
  mails,
  members,
  myMeetings,
  recordings,
  reviewMeta,
  rooms,
  todayReservations,
  workspaceDocs,
} from '../data/mockData'

const statusLabel = {
  live: '진행 중',
  upcoming: '예정',
  ended: '종료',
  mine: '내 예약',
  booked: '예약됨',
}

const roomHours = Array.from({ length: 18 }, (_, index) => index + 6)
const roomHourPx = 70
const activeUserName = '이지연'
const todayDate = '2026-05-22'

function timeToMinutes(time) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function minutesToTime(minutes) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0')
  const minute = String(minutes % 60).padStart(2, '0')
  return `${hour}:${minute}`
}

function addMinutes(time, minutes) {
  return minutesToTime(timeToMinutes(time) + minutes)
}

function overlaps(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB)
}

function toDateTimeInput(value) {
  return value.replace(' ', 'T')
}

function fromDateTimeInput(value) {
  return value.replace('T', ' ')
}

function addOneHour(value) {
  const date = new Date(value)
  date.setHours(date.getHours() + 1)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

function meetingEnd(meeting) {
  const input = toDateTimeInput(meeting.start)
  return fromDateTimeInput(addOneHour(input))
}

const mailTemplates = [
  { id: 'meeting', label: '회의 요청', subject: '[회의 요청] {주제} 일정 협의', body: '안녕하세요,\n\n아래와 같이 회의를 요청드립니다.\n\n- 안건: \n- 일시: YYYY-MM-DD HH:MM\n- 장소: \n- 참석자: \n\n참석 가능 여부 회신 부탁드립니다.\n\n감사합니다.' },
  { id: 'minutes', label: '회의록 공유', subject: '[회의록 공유] {회의명}', body: '안녕하세요,\n\n{회의명} 회의록을 공유드립니다.\n\n[AI 요약]\n- \n\n[액션 아이템]\n- \n\n확인 부탁드립니다.' },
  { id: 'vacation', label: '휴가 신청', subject: '[휴가 신청] {이름} / {기간}', body: '안녕하세요,\n\n아래와 같이 휴가를 신청합니다.\n\n- 사유: \n- 기간: YYYY-MM-DD ~ YYYY-MM-DD\n- 업무 인수인계: \n- 비상 연락처: \n\n승인 부탁드립니다.' },
  { id: 'cowork', label: '업무 협조 요청', subject: '[협조 요청] {업무명}', body: '안녕하세요,\n\n아래 업무에 대한 협조를 요청드립니다.\n\n- 요청 내용: \n- 회신 기한: \n- 참고 자료: \n\n바쁘시겠지만 검토 부탁드립니다.' },
]

const mockTranscript = [
  { t: '00:00:08', who: '이지연', text: '오늘은 OKR 점검과 Q2 우선순위 재정렬을 진행하겠습니다.' },
  { t: '00:00:42', who: '박서연', text: '프로덕트팀 KR-1은 진행률 78%로, 6월 첫 주 완료 가능합니다.' },
  { t: '00:01:21', who: '정도현', text: '마케팅 측에서는 캠페인 일정을 한 주 당기는 것을 제안합니다.' },
  { t: '00:02:03', who: '이지연', text: '좋습니다. 일정 변경에 따른 리소스 영향은 박서연 책임이 정리해 주세요.' },
]

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else quoted = false
      } else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') field += char
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function page(title, description) {
  return { title, description }
}

const WorkspaceList = defineComponent({
  props: ['docs', 'title', 'description'],
  template: `<section class="page"><header class="page-header"><h1>{{ title }}</h1><p>{{ description }}</p></header><div class="doc-grid"><article v-for="doc in docs" :key="doc.id" class="card"><h2>{{ doc.title }}</h2><p>{{ doc.type }} · {{ doc.owner }} · {{ doc.updatedAt }}</p><div class="tag-row"><span v-for="tag in doc.tags" :key="tag">{{ tag }}</span></div></article></div></section>`,
})

const workspaceEvents = [
  { date: '2026-05-21', start: '09:00', end: '10:00', title: '주간 전략 회의', where: '오로라 (12F)', address: '서울 중구 세종대로 110', who: '나', kind: 'mine' },
  { date: '2026-05-21', start: '11:30', end: '12:00', title: '1:1 박서연', where: '한라 (10F)', who: '나', kind: 'mine' },
  { date: '2026-05-21', start: '15:00', end: '16:00', title: '제품 디자인 리뷰', where: '오로라 (12F)', who: '나', kind: 'mine' },
  { date: '2026-05-21', start: '14:00', end: '15:00', title: '스프린트 리뷰', who: '박서연', kind: 'team' },
  { date: '2026-05-22', start: '10:00', end: '11:30', title: 'Q2 캠페인 킥오프', where: '에버레스트', who: '나', kind: 'mine' },
  { date: '2026-05-22', start: '16:00', end: '17:00', title: '광고 운영 미팅', who: '정도현', kind: 'team' },
  { date: '2026-05-25', start: '09:30', end: '10:30', title: '월간 OKR 리뷰', where: '백두 (10F)', who: '나', kind: 'mine' },
  { date: '2026-05-25', start: '13:00', end: '14:00', title: '사용성 테스트', who: '김민수', kind: 'team' },
  { date: '2026-05-27', start: '11:00', end: '12:00', title: '디자인 시스템 워크샵', who: '나', kind: 'mine' },
  { date: '2026-05-28', start: '15:00', end: '16:30', title: '고객 인터뷰', who: '박서연', kind: 'team' },
  { date: '2026-05-29', start: '10:00', end: '11:00', title: '전사 공유회', where: '백두 (10F)', who: '나', kind: 'mine' },
]

const workspaceBackupMails = [
  { id: 'bm1', from: '박서연', title: '[회의록 공유] 5월 전략 회의', date: '2026-05-20', preview: '5월 전략 회의 회의록 AI 요약을 공유드립니다.' },
  { id: 'bm2', from: '정도현', title: 'Q2 캠페인 후속 액션', date: '2026-05-19', preview: 'Q2 캠페인 킥오프 후속 액션 아이템과 일정 정리해 드립니다.' },
  { id: 'bm3', from: '김지연', title: '[HR] 2분기 평가 기준 안내', date: '2026-05-10', preview: '2분기 평가 기준 변경 사항을 안내드립니다.' },
]

const workspaceDriveFiles = [
  { name: 'OKR_Q2_2026.xlsx', size: '1.2MB', time: '오늘' },
  { name: '디자인_시안_v3.fig', size: '8.4MB', time: '어제' },
  { name: '회의록_5월_3주차.pdf', size: '320KB', time: '5/19' },
  { name: '캠페인_브리프.pdf', size: '2.1MB', time: '5/15' },
]

const colleagueInfo = {
  박서연: { dept: '프로덕트팀', position: '선임', email: 'seo@meetbowl.co', phone: '010-2841-9023', status: 'online' },
  정도현: { dept: '마케팅팀', position: '책임', email: 'doh@meetbowl.co', phone: '010-7720-1158', status: 'busy' },
  김민수: { dept: '디자인팀', position: '선임', email: 'min@meetbowl.co', phone: '010-3392-4471', status: 'away' },
  윤정윤: { dept: '전략기획팀', position: '주임', email: 'yjy@meetbowl.co', phone: '010-1124-3344', status: 'online' },
  최정훈: { dept: '영업팀', position: '팀장', email: 'choi@meetbowl.co', phone: '010-6021-8893', status: 'online' },
  한유진: { dept: 'HR팀', position: '선임', email: 'han@meetbowl.co', phone: '010-3322-1188', status: 'away' },
}

const favoriteRecordings = [
  { title: '월간 전사 공유 회의록', meta: '5/2 · 47명' },
  { title: '임원 라운드 테이블', meta: '5/12 · 12명' },
  { title: '주간 전략 회의', meta: '5/20 · 5명' },
]

const initialMemos = [
  { id: 'm1', title: 'Q2 캠페인 메모', body: '- 타겟: 30대 직장인\n- 채널: 인스타, 네이버, 카카오\n- 런칭: 6월 1일\n- 예산: 1.2억', updated: '2026-05-20 15:32', pinned: true },
  { id: 'm2', title: '주간 회의 액션', body: '1. OKR 재정렬\n2. 디자인 시스템 v3 토큰화\n3. 사용자 인터뷰 일정 잡기', updated: '2026-05-19 09:12', pinned: false },
  { id: 'm3', title: '면담 노트', body: '박서연 선임: 사이드 프로젝트 관심. 기술 사례 공유 요청.', updated: '2026-05-15 17:00', pinned: false },
]

const sharedInitialDocs = [
  {
    id: 'd1',
    title: 'Q2 OKR 마스터 시트',
    type: 'sheet',
    dept: '전략기획팀',
    author: '이지연',
    uploaded: '2026-04-01',
    updated: '2026-05-21 09:18',
    version: 'v4.2',
    size: '1.2MB',
    preview: 'Objective 1 | KR 1.1 | 진행률 78% ...',
    history: [
      { v: 'v4.2', author: '이지연', date: '2026-05-21 09:18', note: '5월 셋째주 진행률 반영' },
      { v: 'v4.1', author: '박서연', date: '2026-05-18 14:00', note: '프로덕트 OKR 항목 추가' },
      { v: 'v4.0', author: '이지연', date: '2026-05-10 10:00', note: 'Q2 KR 재정렬' },
    ],
  },
  {
    id: 'd2',
    title: '디자인 시스템 가이드',
    type: 'doc',
    dept: '디자인팀',
    author: '김민수',
    uploaded: '2026-03-12',
    updated: '2026-05-19 18:32',
    version: 'v2.0',
    size: '640KB',
    preview: '색상, 타이포, 간격은 모두 의미 기반 토큰으로 ...',
    history: [
      { v: 'v2.0', author: '김민수', date: '2026-05-19 18:32', note: '토큰 구조 v3 정리' },
      { v: 'v1.4', author: '김민수', date: '2026-04-22 11:14', note: '컴포넌트 가이드 보강' },
    ],
  },
  {
    id: 'd3',
    title: 'Q2 캠페인 브리프',
    type: 'slide',
    dept: '마케팅팀',
    author: '정도현',
    uploaded: '2026-05-05',
    updated: '2026-05-19 11:02',
    version: 'v1.3',
    size: '4.4MB',
    preview: 'Q2 캠페인 / 타겟 / 채널 / KPI ...',
    history: [
      { v: 'v1.3', author: '정도현', date: '2026-05-19 11:02', note: 'A안 채택 반영' },
      { v: 'v1.2', author: '최정훈', date: '2026-05-12 16:48', note: '예산 항목 정정' },
    ],
  },
  {
    id: 'd4',
    title: '회의실 운영 매뉴얼',
    type: 'pdf',
    dept: 'IT운영팀',
    author: '박관리',
    uploaded: '2026-02-08',
    updated: '2026-05-10 09:00',
    version: 'v1.0',
    size: '820KB',
    preview: '예약 방법, 입장 절차, 장비 사용법 ...',
    history: [{ v: 'v1.0', author: '박관리', date: '2026-05-10 09:00', note: '최초 배포' }],
  },
]

const sharedInitialProjects = [
  { id: 'all', label: '전체 문서', docIds: sharedInitialDocs.map((doc) => doc.id) },
  { id: 'q2', label: 'Q2 캠페인', docIds: ['d1', 'd3'], participants: ['이지연', '정도현'] },
  { id: 'strategy', label: '전략 운영', docIds: ['d1'], participants: ['이지연'] },
  { id: 'product', label: '제품 개선', docIds: ['d1', 'd2'], participants: ['박서연', '김민수'] },
  { id: 'design', label: '디자인 시스템', docIds: ['d2'], participants: ['김민수'] },
  { id: 'marketing', label: '마케팅 캠페인', docIds: ['d3'], participants: ['정도현'] },
  { id: 'ops', label: '회의실 운영', docIds: ['d4'], participants: ['박관리'] },
]

const sharedTeams = ['전략기획팀', '마케팅팀', '디자인팀', '프로덕트팀', 'IT운영팀', 'HR팀']

const sharedTypeLabels = {
  doc: '문서',
  sheet: '스프레드시트',
  slide: '프레젠테이션',
  pdf: 'PDF',
}

function nextSharedVersion(version) {
  const [major = '1', minor = '0'] = version.replace(/^v/i, '').split('.')
  return `v${Number(major)}.${Number(minor) + 1}`
}

function workspaceDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function workspaceMonthCells(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start)
    d.setDate(start.getDate() + index)
    return d
  })
}

function workspaceNow() {
  return '2026-05-21 10:00'
}

export const LoginPage = defineComponent({
  setup() {
    const auth = useAuthStore()
    const router = useRouter()
    const username = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)

    async function submit() {
      error.value = ''
      loading.value = true
      try {
        const user = auth.login(username.value, password.value)
        router.push(user.role === 'admin' ? '/admin/dashboard' : '/app/dashboard')
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }

    function quick(value) {
      username.value = value
      password.value = value
    }

    return { username, password, error, loading, submit, quick }
  },
  template: `
    <main class="login-page">
      <section class="login-brand">
        <div class="brand large"><span class="brand-mark">M</span><span>Meetbowl</span></div>
        <div>
          <h1>회의에서 결정으로,<br>결정에서 실행으로.</h1>
          <p>예약, 화상회의, 자동 회의록, 내부 공유까지 하나의 흐름으로 연결된 사내 업무 플랫폼.</p>
          <div class="login-tags"><span>회의실 예약</span><span>AI 회의록</span><span>AI 요약</span></div>
        </div>
        <small>© 2026 Meetbowl Inc.</small>
      </section>
      <section class="login-form-wrap">
        <form class="login-card" @submit.prevent="submit">
          <h2>로그인</h2>
          <p>사내 업무 플랫폼에 접속하세요.</p>
          <label>아이디<input v-model="username" autofocus></label>
          <label>비밀번호<input v-model="password" type="password"></label>
          <div v-if="error" class="error-box">{{ error }}</div>
          <button class="primary-button" :disabled="loading">{{ loading ? '로그인 중...' : '로그인' }}</button>
          <div class="demo-box">
            <strong>데모 계정</strong>
            <div class="demo-grid">
              <button type="button" @click="quick('admin')"><small>Admin</small><span>admin / admin</span></button>
              <button type="button" @click="quick('user')"><small>User</small><span>user / user</span></button>
            </div>
            <p>Admin 계정은 인사팀 공유 계정으로, 데모에서는 관리자 화면 확인용으로만 사용합니다.</p>
          </div>
        </form>
      </section>
    </main>
  `,
})

export const DashboardPage = defineComponent({
  setup() {
    const auth = useAuthStore()
    const todays = myMeetings.filter((meeting) => meeting.start.startsWith('2026-05-22'))
    const selectedId = ref(todays[0]?.id || myMeetings[0].id)
    const selected = computed(() => myMeetings.find((meeting) => meeting.id === selectedId.value) || myMeetings[0])
    const kpis = [
      { label: '읽지 않은 메일', value: mails.filter((mail) => mail.unread).length, to: '/app/mail' },
      { label: '오늘 예정된 회의', value: todays.length, to: '/app/meetings' },
      { label: '최근 내 회의록', value: recordings.length, to: '/app/recordings' },
      { label: '현재 진행 중', value: myMeetings.filter((meeting) => meeting.status === 'live').length, to: '/app/meeting' },
    ]
    return { user: auth.user, todays, selectedId, selected, kpis, myMeetings, todayReservations, statusLabel }
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
            <RouterLink v-if="selected.status === 'live'" to="/app/meeting" class="primary-button small">회의 입장</RouterLink>
          </article>
          <article class="card"><div class="card-head"><h2>개인 일정</h2></div>
            <ul class="compact-list"><li v-for="meeting in myMeetings.slice(0, 5)" :key="meeting.id"><strong>{{ meeting.title }}</strong><span>{{ meeting.start }}</span></li></ul>
          </article>
        </aside>
      </div>
    </section>
  `,
})

export const RoomsPage = defineComponent({
  setup() {
    const reservations = ref(todayReservations.map((item) => ({ date: todayDate, endDate: todayDate, reviewer: item.attendees[0] || '', content: '', ...item })))
    const site = ref('전체')
    const date = ref(todayDate)
    const modal = ref(false)
    const detail = ref(null)
    const attendeeQuery = ref('')
    const form = ref({
      title: '',
      roomId: rooms[0]?.id || '',
      date: todayDate,
      endDate: todayDate,
      start: '09:00',
      end: '10:00',
      attendees: [],
      reviewer: '',
      content: '',
    })
    const sites = ['전체', ...new Set(rooms.map((room) => room.site))]
    const filteredRooms = computed(() => site.value === '전체' ? rooms : rooms.filter((room) => room.site === site.value))
    const myBooked = computed(() => reservations.value.filter((item) => item.status === 'mine'))
    const myInvited = computed(() => reservations.value.filter((item) => item.status !== 'mine' && item.attendees.includes(activeUserName)))
    const memberOptions = computed(() => {
      const query = attendeeQuery.value.trim().toLowerCase()
      return members
        .filter((member) => member.name !== activeUserName)
        .filter((member) => !form.value.attendees.includes(member.name))
        .filter((member) => !query || `${member.name} ${member.dept} ${member.email}`.toLowerCase().includes(query))
        .slice(0, 6)
    })
    const selectedRoom = computed(() => rooms.find((room) => room.id === form.value.roomId) || rooms[0])
    const roomReservations = computed(() => reservations.value.filter((item) => item.roomId === form.value.roomId && item.date === form.value.date))
    const conflict = computed(() => reservations.value.some((item) => item.roomId === form.value.roomId && item.date === form.value.date && overlaps(form.value.start, form.value.end, item.start, item.end)))

    function openReservation(roomId, start = '09:00') {
      const end = addMinutes(start, 60)
      form.value = { title: '', roomId, date: date.value, endDate: date.value, start, end, attendees: [], reviewer: '', content: '' }
      attendeeQuery.value = ''
      modal.value = true
    }
    function addAttendee(name) {
      form.value.attendees.push(name)
      if (!form.value.reviewer) form.value.reviewer = name
      attendeeQuery.value = ''
    }
    function removeAttendee(name) {
      form.value.attendees = form.value.attendees.filter((item) => item !== name)
      if (form.value.reviewer === name) form.value.reviewer = form.value.attendees[0] || ''
    }
    function saveReservation() {
      if (!form.value.title.trim() || conflict.value || selectedRoom.value?.restricted) return
      reservations.value.push({
        id: `new-${Date.now()}`,
        status: 'mine',
        owner: activeUserName,
        ...form.value,
        title: form.value.title.trim(),
      })
      modal.value = false
    }
    function cancelReservation(id) {
      reservations.value = reservations.value.filter((item) => item.id !== id)
      detail.value = null
    }
    function reservationStyle(item) {
      const left = ((timeToMinutes(item.start) - 360) / 60) * roomHourPx
      const width = ((timeToMinutes(item.end) - timeToMinutes(item.start)) / 60) * roomHourPx
      return { left: `${left}px`, width: `${Math.max(width, 36)}px` }
    }
    function nowMarkerStyle() {
      return { left: `${((timeToMinutes('13:30') - 360) / 60) * roomHourPx}px` }
    }
    function slotTime(event) {
      const rect = event.currentTarget.getBoundingClientRect()
      const raw = Math.max(0, Math.min(17.5, (event.clientX - rect.left) / roomHourPx))
      const minutes = 360 + Math.floor(raw * 2) * 30
      return minutesToTime(minutes)
    }
    return {
      activeUserName,
      addAttendee,
      cancelReservation,
      conflict,
      date,
      detail,
      filteredRooms,
      form,
      memberOptions,
      modal,
      myBooked,
      myInvited,
      nowMarkerStyle,
      openReservation,
      removeAttendee,
      reservationStyle,
      reservations,
      rooms,
      roomHourPx,
      roomHours,
      roomReservations,
      saveReservation,
      selectedRoom,
      site,
      sites,
      slotTime,
      statusLabel,
      attendeeQuery,
    }
  },
  template: `
    <section class="page rooms-page">
      <header class="page-header rooms-header">
        <div><h1>회의실 예약 현황</h1><p>회의실별 예약 시간을 확인하고 빈 시간대를 바로 예약합니다.</p></div>
        <button class="primary-button" @click="openReservation(filteredRooms[0]?.id || selectedRoom.id)">회의/회의실 예약</button>
      </header>

      <div class="reservation-summary-grid">
        <article class="card reservation-summary">
          <div class="card-head"><h2>내가 예약한 회의</h2><span>{{ myBooked.length }}건</span></div>
          <button v-for="item in myBooked" :key="item.id" @click="detail = item">
            <strong>{{ item.title }}</strong><span>{{ item.start }}-{{ item.end }} · {{ filteredRooms.find((room) => room.id === item.roomId)?.name || rooms.find((room) => room.id === item.roomId)?.name }}</span>
          </button>
          <p v-if="!myBooked.length">예약한 회의가 없습니다.</p>
        </article>
        <article class="card reservation-summary">
          <div class="card-head"><h2>내가 참석해야 하는 회의</h2><span>{{ myInvited.length }}건</span></div>
          <button v-for="item in myInvited" :key="item.id" @click="detail = item">
            <strong>{{ item.title }}</strong><span>{{ item.start }}-{{ item.end }} · {{ item.owner }}</span>
          </button>
          <p v-if="!myInvited.length">참석 예정 회의가 없습니다.</p>
        </article>
      </div>

      <div class="card rooms-toolbar">
        <div class="room-date-control">
          <input type="date" v-model="date">
          <button class="secondary-button" @click="date = '2026-05-22'">오늘</button>
        </div>
        <div class="toolbar">
          <button v-for="item in sites" :key="item" class="chip" :class="{ active: site === item }" @click="site = item">{{ item }}</button>
        </div>
        <div class="room-legend"><span><i class="mine"></i>내 예약</span><span><i></i>예약됨</span><span><i class="restricted"></i>사용 제한</span></div>
      </div>

      <div class="card room-timeline-card">
        <div class="room-timeline-scroll" :style="{ '--hour-px': roomHourPx + 'px' }">
          <div class="room-time-header">
            <div class="room-name-spacer"></div>
            <div class="room-hours">
              <span v-for="hour in roomHours" :key="hour">{{ String(hour).padStart(2, '0') }}:00</span>
            </div>
          </div>
          <div v-for="room in filteredRooms" :key="room.id" class="room-row" :class="{ restricted: room.restricted }">
            <div class="room-row-meta">
              <strong>{{ room.name }}</strong>
              <small>{{ room.site }} · {{ room.floor }}층 · {{ room.capacity }}명</small>
              <em v-if="room.restricted">{{ room.restrictReason }}</em>
            </div>
            <div class="room-track" @click="!room.restricted && openReservation(room.id, slotTime($event))">
              <span v-for="hour in roomHours" :key="hour" class="hour-line"></span>
              <span class="now-marker" :style="nowMarkerStyle()"><em>현재</em></span>
              <button
                v-for="item in reservations.filter((res) => res.roomId === room.id && res.date === date)"
                :key="item.id"
                type="button"
                :class="['reservation-block', item.status]"
                :style="reservationStyle(item)"
                @click.stop="detail = item"
              >
                <strong>{{ item.title }}</strong><span>{{ item.start }}-{{ item.end }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="modal" class="modal-backdrop" @click.self="modal = false">
        <article class="card write-modal room-modal">
          <header><div><h2>회의/회의실 예약</h2><p>참석자와 검토자를 지정하고 회의실 충돌 여부를 확인합니다.</p></div><button @click="modal = false">닫기</button></header>
          <div class="room-modal-grid">
            <form class="form-grid" @submit.prevent="saveReservation">
              <label>회의 제목<input v-model="form.title" required placeholder="회의 제목"></label>
              <label>회의실<select v-model="form.roomId"><option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option></select></label>
              <div class="form-row two"><label>시작일<input type="date" v-model="form.date"></label><label>종료일<input type="date" v-model="form.endDate"></label></div>
              <div class="form-row two"><label>시작 시간<input type="time" v-model="form.start"></label><label>종료 시간<input type="time" v-model="form.end"></label></div>
              <label>참석자 검색<input v-model="attendeeQuery" placeholder="이름, 부서, 이메일"></label>
              <div class="member-picker-results"><button v-for="member in memberOptions" :key="member.id" type="button" @click="addAttendee(member.name)"><strong>{{ member.name }}</strong><span>{{ member.dept }} · {{ member.email }}</span></button></div>
              <div class="participant-chips"><span v-for="name in form.attendees" :key="name">{{ name }}<button type="button" @click="removeAttendee(name)">×</button></span></div>
              <label>회의록 검토자<select v-model="form.reviewer"><option value="">선택 안 함</option><option v-for="name in form.attendees" :key="name" :value="name">{{ name }}</option></select></label>
              <label>회의 내용<textarea v-model="form.content" rows="4" placeholder="회의 목적과 안건"></textarea></label>
              <p v-if="selectedRoom?.restricted" class="warning-text">해당 회의실은 {{ selectedRoom.restrictReason }} 사유로 {{ selectedRoom.restrictUntil }}까지 사용 제한 중입니다.</p>
              <p v-else-if="conflict" class="warning-text">선택한 시간에 이미 예약이 있습니다. 다른 시간을 선택하세요.</p>
              <div class="modal-actions"><button type="button" class="secondary-button" @click="modal = false">취소</button><button class="primary-button" :disabled="conflict || selectedRoom?.restricted">예약 저장</button></div>
            </form>
            <aside class="room-side-panel">
              <h3>{{ selectedRoom?.name }}</h3>
              <p>{{ selectedRoom?.site }} · {{ selectedRoom?.floor }}층 · {{ selectedRoom?.capacity }}명</p>
              <div class="tag-row"><span v-for="item in selectedRoom?.equipment || []" :key="item">{{ item }}</span></div>
              <h4>선택일 예약</h4>
              <ul class="compact-list">
                <li v-for="item in roomReservations" :key="item.id"><strong>{{ item.start }}-{{ item.end }} {{ item.title }}</strong><span>{{ item.owner }}</span></li>
                <li v-if="!roomReservations.length"><span>예약 없음</span></li>
              </ul>
            </aside>
          </div>
        </article>
      </div>

      <div v-if="detail" class="modal-backdrop" @click.self="detail = null">
        <article class="card write-modal detail-modal">
          <header><div><h2>{{ detail.title }}</h2><p>{{ detail.start }}-{{ detail.end }} · {{ rooms.find((room) => room.id === detail.roomId)?.name }}</p></div><button @click="detail = null">닫기</button></header>
          <dl class="detail-list">
            <div><dt>예약자</dt><dd>{{ detail.owner }}</dd></div>
            <div><dt>상태</dt><dd>{{ statusLabel[detail.status] }}</dd></div>
            <div><dt>참석자</dt><dd>{{ detail.attendees.join(', ') || '-' }}</dd></div>
            <div><dt>검토자</dt><dd>{{ detail.reviewer || '-' }}</dd></div>
          </dl>
          <p v-if="detail.content">{{ detail.content }}</p>
          <div class="modal-actions"><button v-if="detail.status === 'mine'" class="danger-button" @click="cancelReservation(detail.id)">예약 취소</button><RouterLink to="/app/meeting" class="primary-button">회의 입장</RouterLink></div>
        </article>
      </div>
    </section>
  `,
})

export const MyReservationsPage = defineComponent({
  setup: () => ({ reservations: todayReservations.filter((reservation) => reservation.status === 'mine'), rooms }),
  template: `
    <section class="page">
      <header class="page-header"><h1>내 회의실 예약 현황</h1><p>내가 예약한 회의실과 참석자, 시간을 확인합니다.</p></header>
      <div class="table-card"><table><thead><tr><th>회의</th><th>회의실</th><th>시간</th><th>참석자</th><th>상태</th></tr></thead>
      <tbody><tr v-for="item in reservations" :key="item.id"><td>{{ item.title }}</td><td>{{ rooms.find((room) => room.id === item.roomId)?.name }}</td><td>{{ item.start }}-{{ item.end }}</td><td>{{ item.attendees.join(', ') || '-' }}</td><td><span class="badge primary">내 예약</span></td></tr></tbody></table></div>
    </section>
  `,
})

export const MeetingsPage = defineComponent({
  setup() {
    const router = useRouter()
    const items = ref(myMeetings.map((meeting) => ({ ...meeting, end: meetingEnd(meeting), content: '' })))
    const tab = ref('all')
    const range = ref('all')
    const sort = ref('latest')
    const pageNo = ref(1)
    const modal = ref(false)
    const mode = ref('create')
    const attendeeQuery = ref('')
    const form = ref({
      id: '',
      title: '',
      start: '2026-05-22T10:00',
      end: '2026-05-22T11:00',
      room: rooms[0]?.name || '원격',
      attendees: [],
      reviewer: '',
      content: '',
    })
    const pageSize = 15
    const filtered = computed(() => {
      const now = new Date('2026-06-01T00:00:00')
      const cutoff = range.value === '3m' ? new Date('2026-03-01T00:00:00') : range.value === '6m' ? new Date('2025-12-01T00:00:00') : null
      return items.value
        .filter((meeting) => tab.value === 'all' || meeting.role === tab.value)
        .filter((meeting) => !cutoff || new Date(toDateTimeInput(meeting.start)) >= cutoff && new Date(toDateTimeInput(meeting.start)) <= now)
        .sort((a, b) => sort.value === 'latest'
          ? new Date(toDateTimeInput(b.start)) - new Date(toDateTimeInput(a.start))
          : new Date(toDateTimeInput(a.start)) - new Date(toDateTimeInput(b.start)))
    })
    const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
    const paged = computed(() => filtered.value.slice((pageNo.value - 1) * pageSize, pageNo.value * pageSize))
    const selectedRoom = computed(() => rooms.find((room) => room.name === form.value.room))
    const selectedRoomReservations = computed(() => selectedRoom.value ? todayReservations.filter((item) => item.roomId === selectedRoom.value.id) : [])
    const memberOptions = computed(() => {
      const query = attendeeQuery.value.trim().toLowerCase()
      return members
        .filter((member) => member.name !== activeUserName)
        .filter((member) => !form.value.attendees.includes(member.name))
        .filter((member) => !query || `${member.name} ${member.dept} ${member.email}`.toLowerCase().includes(query))
        .slice(0, 6)
    })
    function changeTab(value) {
      tab.value = value
      pageNo.value = 1
    }
    function openCreate() {
      mode.value = 'create'
      form.value = { id: '', title: '', start: '2026-05-22T10:00', end: '2026-05-22T11:00', room: rooms[0]?.name || '원격', attendees: [], reviewer: '', content: '' }
      attendeeQuery.value = ''
      modal.value = true
    }
    function openEdit(meeting) {
      mode.value = 'edit'
      form.value = {
        id: meeting.id,
        title: meeting.title,
        start: toDateTimeInput(meeting.start),
        end: toDateTimeInput(meeting.end || meetingEnd(meeting)),
        room: meeting.room,
        attendees: [...meeting.attendees],
        reviewer: meeting.reviewer || '',
        content: meeting.content || '',
      }
      attendeeQuery.value = ''
      modal.value = true
    }
    function addAttendee(name) {
      form.value.attendees.push(name)
      if (!form.value.reviewer) form.value.reviewer = name
      attendeeQuery.value = ''
    }
    function removeAttendee(name) {
      form.value.attendees = form.value.attendees.filter((item) => item !== name)
      if (form.value.reviewer === name) form.value.reviewer = form.value.attendees[0] || ''
    }
    function saveMeeting() {
      const payload = {
        title: form.value.title.trim(),
        start: fromDateTimeInput(form.value.start),
        end: fromDateTimeInput(form.value.end),
        room: form.value.room,
        attendees: [...form.value.attendees],
        reviewer: form.value.reviewer,
        content: form.value.content,
      }
      if (!payload.title) return
      if (mode.value === 'edit') {
        items.value = items.value.map((item) => item.id === form.value.id ? { ...item, ...payload } : item)
      } else {
        items.value.unshift({ id: `mt-${Date.now()}`, role: 'host', status: 'upcoming', ...payload })
      }
      modal.value = false
    }
    function enterMeeting(meeting) {
      if (meeting.status === 'ended') router.push('/app/recordings')
      else router.push('/app/meeting')
    }
    return {
      addAttendee,
      attendeeQuery,
      changeTab,
      enterMeeting,
      filtered,
      form,
      memberOptions,
      modal,
      mode,
      openCreate,
      openEdit,
      pageNo,
      paged,
      range,
      removeAttendee,
      roomNames: ['원격', ...rooms.map((room) => room.name)],
      saveMeeting,
      selectedRoom,
      selectedRoomReservations,
      sort,
      statusLabel,
      tab,
      totalPages,
    }
  },
  template: `
    <section class="page meetings-page">
      <header class="page-header rooms-header">
        <div><h1>회의</h1><p>내가 주최하거나 초대된 회의를 확인하고 새 회의를 생성합니다.</p></div>
        <button class="primary-button" @click="openCreate">내 회의 생성</button>
      </header>

      <div class="card meetings-filter-card">
        <div class="toolbar">
          <button v-for="item in [{key:'all',label:'전체'},{key:'host',label:'내가 주최한 회의'},{key:'attendee',label:'초대된 회의'}]" :key="item.key" class="chip" :class="{ active: tab === item.key }" @click="changeTab(item.key)">{{ item.label }}</button>
        </div>
        <div class="meeting-filter-controls">
          <select v-model="range" @change="pageNo = 1"><option value="all">전체 기간</option><option value="3m">최근 3개월</option><option value="6m">최근 6개월</option></select>
          <select v-model="sort"><option value="latest">최신순</option><option value="oldest">오래된순</option></select>
          <span>총 {{ filtered.length }}건</span>
        </div>
      </div>

      <div class="card meeting-list-card">
        <article v-for="meeting in paged" :key="meeting.id" class="meeting-row">
          <div class="meeting-row-main">
            <div class="meeting-title-row">
              <h2>{{ meeting.title }}</h2>
              <span :class="['badge', meeting.status === 'live' ? 'danger' : meeting.status === 'ended' ? 'muted' : 'primary']">{{ statusLabel[meeting.status] }}</span>
              <span :class="['badge', meeting.role === 'host' ? 'success' : 'navy']">{{ meeting.role === 'host' ? '주최자' : '참석자' }}</span>
            </div>
            <div class="meeting-meta-grid">
              <span>{{ meeting.start }} - {{ meeting.end?.split(' ')[1] }}</span>
              <span>{{ meeting.room }}</span>
              <span>참석자 {{ meeting.attendees.join(', ') || '-' }}</span>
              <span>검토자 {{ meeting.reviewer || '-' }}</span>
            </div>
          </div>
          <div class="row-actions">
            <button v-if="meeting.role === 'host' && meeting.status !== 'ended'" class="secondary-button small" @click="openEdit(meeting)">수정</button>
            <button class="primary-button small" @click="enterMeeting(meeting)">{{ meeting.status === 'ended' ? '내 회의록 보기' : '입장' }}</button>
          </div>
        </article>
        <p v-if="!paged.length" class="empty-text">조건에 맞는 회의가 없습니다.</p>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button :disabled="pageNo === 1" @click="pageNo--">이전</button>
        <span>{{ pageNo }} / {{ totalPages }}</span>
        <button :disabled="pageNo === totalPages" @click="pageNo++">다음</button>
      </div>

      <div v-if="modal" class="modal-backdrop" @click.self="modal = false">
        <article class="card write-modal meeting-modal">
          <header><div><h2>{{ mode === 'create' ? '내 회의 생성' : '회의 수정' }}</h2><p v-if="mode === 'edit'">참석자에게 변경 알림이 발송됩니다.</p></div><button @click="modal = false">닫기</button></header>
          <div class="meeting-modal-grid">
            <form class="form-grid" @submit.prevent="saveMeeting">
              <label>회의 제목<input v-model="form.title" required placeholder="회의 제목"></label>
              <div class="form-row two"><label>시작<input type="datetime-local" v-model="form.start"></label><label>종료<input type="datetime-local" v-model="form.end"></label></div>
              <label>회의실<select v-model="form.room"><option v-for="room in roomNames" :key="room" :value="room">{{ room }}</option></select></label>
              <label>참석자 검색<input v-model="attendeeQuery" placeholder="이름, 부서, 이메일"></label>
              <div class="member-picker-results"><button v-for="member in memberOptions" :key="member.id" type="button" @click="addAttendee(member.name)"><strong>{{ member.name }}</strong><span>{{ member.dept }} · {{ member.email }}</span></button></div>
              <div class="participant-chips"><span v-for="name in form.attendees" :key="name">{{ name }}<button type="button" @click="removeAttendee(name)">×</button></span></div>
              <label>회의록 검토자<select v-model="form.reviewer"><option value="">선택 안 함</option><option v-for="name in form.attendees" :key="name" :value="name">{{ name }}</option></select></label>
              <label>회의 내용<textarea v-model="form.content" rows="4" placeholder="회의 목적과 안건"></textarea></label>
              <div v-if="mode === 'edit'" class="copy-box">https://meetbowl.local/join/{{ form.id }}</div>
              <div class="modal-actions"><button type="button" class="secondary-button" @click="modal = false">취소</button><button class="primary-button">저장</button></div>
            </form>
            <aside class="room-side-panel">
              <h3>{{ form.room }}</h3>
              <p v-if="selectedRoom">{{ selectedRoom.site }} · {{ selectedRoom.floor }}층 · {{ selectedRoom.capacity }}명</p>
              <p v-else>원격 회의</p>
              <div v-if="selectedRoom" class="tag-row"><span v-for="item in selectedRoom.equipment" :key="item">{{ item }}</span></div>
              <h4>오늘 예약</h4>
              <ul class="compact-list">
                <li v-for="item in selectedRoomReservations" :key="item.id"><strong>{{ item.start }}-{{ item.end }} {{ item.title }}</strong><span>{{ item.owner }}</span></li>
                <li v-if="!selectedRoomReservations.length"><span>예약 없음</span></li>
              </ul>
            </aside>
          </div>
        </article>
      </div>
    </section>
  `,
})

export const MeetingPage = defineComponent({
  setup() {
    const router = useRouter()
    const inLobby = ref(true)
    const mic = ref(true)
    const cam = ref(true)
    const tab = ref('stt')
    const lang = ref('kor')
    const chatInput = ref('')
    const chat = ref([{ who: '박서연', text: '회의록 공유 부탁드려요!' }, { who: '정도현', text: '안건 자료 채팅에 올렸습니다.' }])
    const transcripts = {
      kor: ['오늘 안건은 Q2 캠페인 일정 확정과 예산 재분배입니다.', '디자인 리소스 일정은 5월 마지막 주에 마무리될 것 같습니다.', '광고 채널별 분배안은 두 가지로 압축했고, A안을 추천합니다.', '좋습니다. A안으로 진행하되 예산은 10% 보수적으로 잡죠.'],
      eng: ['Today agenda is to confirm the Q2 campaign schedule and redistribute the budget.', 'The design resource schedule should wrap up in the last week of May.', 'We narrowed the media allocation plan down to two options and recommend option A.', 'Let us proceed with option A, but keep the budget 10% conservative.'],
    }
    function sendChat() {
      if (!chatInput.value.trim()) return
      chat.value.push({ who: '나', text: chatInput.value.trim() })
      chatInput.value = ''
    }
    return { router, inLobby, mic, cam, tab, lang, chatInput, chat, transcripts, sendChat }
  },
  template: `
    <section v-if="inLobby" class="page narrow">
      <article class="card lobby-card"><div class="card-head"><div><h2>화상회의 입장 준비</h2><p>Q2 캠페인 킥오프 · 진행 중</p></div></div>
        <div class="lobby-grid"><div class="camera-preview"><span>이</span><div><button class="control" @click="mic = !mic">{{ mic ? 'Mic On' : 'Mic Off' }}</button><button class="control" @click="cam = !cam">{{ cam ? 'Cam On' : 'Cam Off' }}</button></div></div>
        <div class="stack"><label class="toggle-row"><span>입장 시 카메라 ON</span><input type="checkbox" v-model="cam"></label><div class="copy-box">https://meetbowl.local/join/Q2-KICK-0522</div><button class="primary-button" @click="inLobby = false">회의 입장</button></div></div>
      </article>
    </section>
    <section v-else class="meeting-room">
      <div class="meeting-main"><header><strong>Q2 캠페인 킥오프</strong><span>01:24:08</span></header><div class="video-grid"><div v-for="name in ['이지연','박서연','정도현','김민수','최정훈']" :key="name" class="video-tile"><span>{{ name[0] }}</span><em>{{ name }}</em></div></div><footer><button class="control" @click="mic = !mic">{{ mic ? '마이크' : '음소거' }}</button><button class="control" @click="cam = !cam">{{ cam ? '카메라' : '카메라 꺼짐' }}</button><button class="control">화면 공유</button><button class="danger-button" @click="router.push('/app/recordings')">회의 종료</button></footer></div>
      <aside class="meeting-side"><nav><button :class="{ active: tab === 'stt' }" @click="tab = 'stt'">회의 원문</button><button :class="{ active: tab === 'people' }" @click="tab = 'people'">참석자</button><button :class="{ active: tab === 'chat' }" @click="tab = 'chat'">채팅</button></nav>
        <div v-if="tab === 'stt'" class="side-body"><div class="toolbar"><button class="chip" :class="{ active: lang === 'kor' }" @click="lang = 'kor'">Kor</button><button class="chip" :class="{ active: lang === 'eng' }" @click="lang = 'eng'">Eng</button></div><p v-for="(line, index) in transcripts[lang]" :key="line" class="transcript"><small>13:4{{ index }}:0{{ index }}</small>{{ line }}</p><div class="ai-box"><strong>AI 실시간 피드백</strong><p>이전 결정과 충돌 가능성이 있습니다. 예산 증액 논의는 리스크 근거 확인 후 결정하는 편이 좋습니다.</p></div></div>
        <div v-else-if="tab === 'people'" class="side-body"><p v-for="name in ['이지연','박서연','정도현','김민수','최정훈']" :key="name" class="people-row">{{ name }}<span>참석 중</span></p></div>
        <div v-else class="side-body chat-body"><p v-for="item in chat" :key="item.text" class="chat-line"><strong>{{ item.who }}</strong>{{ item.text }}</p><div class="chat-input"><input v-model="chatInput" @keydown.enter="sendChat"><button @click="sendChat">전송</button></div></div>
      </aside>
    </section>
  `,
})

export const MailPage = defineComponent({
  setup() {
    const mailList = ref(mails.map((mail) => ({ ...mail })))
    const tab = ref('inbox')
    const open = ref(null)
    const compose = ref(false)
    const q = ref('')
    const sort = ref('latest')
    const pageNo = ref(1)
    const selected = ref(new Set())
    const pageSize = 15
    const tabs = [
      { id: 'inbox', label: '받은 메일함' },
      { id: 'sent', label: '보낸 메일함' },
      { id: 'trash', label: '휴지통' },
      { id: 'backup', label: '백업' },
      { id: 'notice', label: '공지' },
    ]
    const filtered = computed(() => mailList.value
      .filter((mail) => mail.category === tab.value && (!q.value || `${mail.subject} ${mail.from} ${mail.dept}`.toLowerCase().includes(q.value.toLowerCase())))
      .sort((a, b) => sort.value === 'latest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
    const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
    const pageItems = computed(() => filtered.value.slice((pageNo.value - 1) * pageSize, pageNo.value * pageSize))
    const allChecked = computed(() => pageItems.value.length > 0 && pageItems.value.every((mail) => selected.value.has(mail.id)))

    const recipients = ref([])
    const recipientQuery = ref('')
    const composeDraft = ref({ subject: '', body: '', attachments: [] })
    const templateOpen = ref(false)
    const recipientMatches = computed(() => {
      const query = recipientQuery.value.toLowerCase()
      return members
        .filter((member) => !recipients.value.some((item) => item.id === member.id))
        .filter((member) => !query || `${member.name} ${member.company} ${member.dept} ${member.position} ${member.email}`.toLowerCase().includes(query))
        .slice(0, 8)
    })

    function changeTab(value) {
      tab.value = value
      selected.value = new Set()
      pageNo.value = 1
      open.value = null
    }
    function toggleAll() {
      const next = new Set(selected.value)
      if (allChecked.value) pageItems.value.forEach((mail) => next.delete(mail.id))
      else pageItems.value.forEach((mail) => next.add(mail.id))
      selected.value = next
    }
    function toggleOne(id) {
      const next = new Set(selected.value)
      next.has(id) ? next.delete(id) : next.add(id)
      selected.value = next
    }
    function deleteSelected() {
      if (tab.value === 'trash') mailList.value = mailList.value.filter((mail) => !selected.value.has(mail.id))
      else mailList.value = mailList.value.map((mail) => selected.value.has(mail.id) ? { ...mail, category: 'trash' } : mail)
      selected.value = new Set()
    }
    function backupSelected() {
      mailList.value = mailList.value.map((mail) => selected.value.has(mail.id) ? { ...mail, category: 'backup' } : mail)
      selected.value = new Set()
    }
    function backupMail(id) {
      mailList.value = mailList.value.map((mail) => mail.id === id ? { ...mail, category: 'backup' } : mail)
      open.value = null
    }
    function applyTemplate(template) {
      composeDraft.value.subject = template.subject
      composeDraft.value.body = template.body
      templateOpen.value = false
    }
    function addRecipient(member) {
      recipients.value.push(member)
      recipientQuery.value = ''
    }
    function removeRecipient(id) {
      recipients.value = recipients.value.filter((member) => member.id !== id)
    }
    function addAttachment() {
      composeDraft.value.attachments.push(`첨부파일_${composeDraft.value.attachments.length + 1}.pdf`)
    }
    function sendMail() {
      mailList.value.unshift({
        id: `mail-${Date.now()}`,
        from: activeUserName,
        dept: '전략기획팀',
        subject: composeDraft.value.subject || '(제목 없음)',
        preview: composeDraft.value.body.slice(0, 70),
        date: '2026-05-22',
        unread: false,
        hasAttachment: composeDraft.value.attachments.length > 0,
        category: 'sent',
        body: composeDraft.value.body,
      })
      compose.value = false
      recipients.value = []
      composeDraft.value = { subject: '', body: '', attachments: [] }
    }
    return {
      addAttachment,
      addRecipient,
      allChecked,
      applyTemplate,
      backupMail,
      backupSelected,
      changeTab,
      compose,
      composeDraft,
      deleteSelected,
      filtered,
      mailTemplates,
      open,
      pageItems,
      pageNo,
      q,
      recipientMatches,
      recipientQuery,
      recipients,
      removeRecipient,
      selected,
      sendMail,
      sort,
      tab,
      tabs,
      templateOpen,
      toggleAll,
      toggleOne,
      totalPages,
    }
  },
  template: `
    <section v-if="!open" class="page mail-page-full">
      <header class="page-header rooms-header"><div><h1>내부 메일</h1><p>사내 내부 사용자 및 부서 간 메일 시스템</p></div><button class="primary-button" @click="compose = true">새 메일 작성</button></header>
      <div class="mail-tabs">
        <button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" @click="changeTab(item.id)">{{ item.label }}</button>
        <select v-model="sort"><option value="latest">최신순</option><option value="oldest">오래된 순</option></select>
        <input v-model="q" placeholder="메일 검색">
      </div>
      <div class="mail-bulkbar">
        <label><input type="checkbox" :checked="allChecked" @change="toggleAll"> 전체 선택</label>
        <template v-if="selected.size > 0">
          <span>{{ selected.size }}개 선택</span>
          <button @click="backupSelected">백업하기</button>
          <button class="danger-text" @click="deleteSelected">{{ tab === 'trash' ? '영구 삭제' : '삭제' }}</button>
        </template>
        <em>총 {{ filtered.length }}건</em>
      </div>
      <div class="card mail-row-list">
        <button v-for="mail in pageItems" :key="mail.id" class="mail-row-button" @click="open = mail">
          <input type="checkbox" :checked="selected.has(mail.id)" @click.stop @change="toggleOne(mail.id)">
          <span class="mail-from" :class="{ unread: mail.unread }">{{ mail.from }} <small>/ {{ mail.dept }}</small></span>
          <i :class="{ unread: mail.unread }"></i>
          <strong :class="{ unread: mail.unread }">{{ mail.subject }} <small v-if="mail.hasAttachment">첨부</small></strong>
          <time>{{ mail.date }}</time>
        </button>
        <p v-if="!pageItems.length" class="empty-text">메일이 없습니다.</p>
      </div>
      <div v-if="totalPages > 1" class="pagination"><button :disabled="pageNo === 1" @click="pageNo--">이전</button><span>{{ pageNo }} / {{ totalPages }}</span><button :disabled="pageNo === totalPages" @click="pageNo++">다음</button></div>

      <div v-if="compose" class="modal-backdrop" @click.self="compose = false">
        <article class="card write-modal compose-modal">
          <header><h2>새 메일</h2><div class="template-menu"><button type="button" class="secondary-button small" @click="templateOpen = !templateOpen">템플릿</button><div v-if="templateOpen" class="template-list"><button v-for="tpl in mailTemplates" :key="tpl.id" @click="applyTemplate(tpl)">{{ tpl.label }}</button></div><button @click="compose = false">닫기</button></div></header>
          <div class="compose-body">
            <label>받는 사람</label>
            <div class="recipient-box">
              <span v-for="member in recipients" :key="member.id">{{ member.name }} · {{ member.dept }}<button @click="removeRecipient(member.id)">×</button></span>
              <input v-model="recipientQuery" placeholder="이름, 계열사, 부서/팀, 이메일로 검색">
            </div>
            <div v-if="recipientQuery || recipientMatches.length" class="recipient-results">
              <button v-for="member in recipientMatches" :key="member.id" @click="addRecipient(member)"><strong>{{ member.name }}</strong><small>{{ member.company }} · {{ member.dept }} · {{ member.email }}</small></button>
            </div>
            <input v-model="composeDraft.subject" placeholder="제목">
            <textarea v-model="composeDraft.body" rows="10" placeholder="내용을 입력하세요..."></textarea>
            <button class="upload-zone-small" @click="addAttachment">파일 첨부 추가</button>
            <div class="attachment-chips"><span v-for="name in composeDraft.attachments" :key="name">{{ name }}<button @click="composeDraft.attachments = composeDraft.attachments.filter((item) => item !== name)">×</button></span></div>
          </div>
          <footer><small>수신자 {{ recipients.length }}명</small><div><button class="secondary-button" @click="compose = false">취소</button><button class="primary-button" @click="sendMail">전송</button></div></footer>
        </article>
      </div>
    </section>

    <section v-else class="page mail-detail-page">
      <div class="mail-detail-toolbar"><button @click="open = null">뒤로</button><button @click="backupMail(open.id)">백업</button><button>삭제</button><button>인쇄</button><button>더보기</button></div>
      <article class="card mail-message-card">
        <header><h1>{{ open.subject }}</h1><button @click="backupMail(open.id)">백업</button></header>
        <div class="mail-sender-line"><span class="table-avatar">{{ open.from[0] }}</span><div><strong>{{ open.from }}</strong><small>{{ open.dept }} · 받는 사람: 나 · {{ open.date }}</small></div></div>
        <pre>{{ open.body || open.preview }}</pre>
        <div v-if="open.hasAttachment" class="mail-attachments"><strong>첨부파일 (2)</strong><button>회의록.pdf <small>240KB</small></button><button>녹음.mp3 <small>42.1MB</small></button></div>
        <div class="modal-actions"><button class="secondary-button">답장</button><button class="secondary-button">전달</button></div>
      </article>
    </section>
  `,
})

export const RecordingsPage = defineComponent({
  setup() {
    const recs = ref(recordings.map((recording) => ({ ...recording })))
    const selectedId = ref(recordings[0].id)
    const q = ref('')
    const shareOpen = ref(false)
    const transcriptOpen = ref(false)
    const editing = ref(false)
    const favorites = ref({ rec1: true })
    const draft = ref({ title: '', summary: '' })
    const share = ref({ recipients: members.slice(4, 7), query: '', subject: '', body: '' })
    const filtered = computed(() => recs.value.filter((recording) => recording.title.toLowerCase().includes(q.value.toLowerCase())))
    const selected = computed(() => recs.value.find((recording) => recording.id === selectedId.value) || recs.value[0])
    const shareMatches = computed(() => members.filter((member) => !share.value.recipients.some((item) => item.id === member.id)).filter((member) => !share.value.query || `${member.name} ${member.dept} ${member.company} ${member.email}`.toLowerCase().includes(share.value.query.toLowerCase())))
    function selectRecording(id) {
      selectedId.value = id
      editing.value = false
    }
    function startEdit() {
      draft.value = { title: selected.value.title, summary: selected.value.summary }
      editing.value = true
    }
    function saveEdit() {
      recs.value = recs.value.map((recording) => recording.id === selected.value.id ? { ...recording, title: draft.value.title || recording.title, summary: draft.value.summary } : recording)
      editing.value = false
    }
    function toggleFavorite(id) {
      favorites.value = { ...favorites.value, [id]: !favorites.value[id] }
    }
    function openShare() {
      share.value.subject = `[회의록 공유] ${selected.value.title}`
      share.value.body = `안녕하세요,\n\n${selected.value.title} 회의록을 공유드립니다.\n\n[AI 요약]\n${selected.value.summary}\n\n확인 부탁드립니다.`
      shareOpen.value = true
    }
    return { draft, editing, favorites, filtered, mockTranscript, openShare, q, recs, reviewMeta, saveEdit, selectRecording, selected, selectedId, share, shareMatches, shareOpen, startEdit, transcriptOpen, toggleFavorite }
  },
  template: `
    <section class="page recordings-page-full">
      <header class="page-header"><h1>내 회의록</h1><p>AI가 자동 생성한 내 회의록을 확인·수정하고 내부 메일로 공유하세요.</p></header>
      <div class="recording-layout">
        <aside class="card recording-list-panel">
          <input v-model="q" placeholder="내 회의록 검색">
          <button v-for="recording in filtered" :key="recording.id" :class="{ active: selectedId === recording.id }" @click="selectRecording(recording.id)">
            <strong><span v-if="favorites[recording.id]">★</span>{{ recording.title }}</strong>
            <small>{{ recording.date }} · {{ recording.duration }} · 참석 {{ recording.attendees }}명</small>
          </button>
        </aside>
        <article class="card recording-detail-panel">
          <header>
            <div>
              <div class="recording-title-row">
                <input v-if="editing" v-model="draft.title">
                <h2 v-else>{{ selected.title }}</h2>
                <button @click="toggleFavorite(selected.id)">{{ favorites[selected.id] ? '★' : '☆' }}</button>
              </div>
              <p>{{ selected.date }} · {{ selected.duration }} · 참석자 {{ selected.attendees }}명 · 검토자 {{ selected.reviewer }}</p>
            </div>
            <div class="recording-actions"><button class="secondary-button small">PDF 다운로드</button><button v-if="!editing" class="secondary-button small" @click="startEdit">수정</button><button class="primary-button small" @click="openShare">내부 메일 공유</button></div>
          </header>
          <section class="ai-minutes-box">
            <strong>AI 요약 회의록 {{ editing ? '· 편집 중' : '' }}</strong>
            <template v-if="editing"><textarea v-model="draft.summary" rows="10"></textarea><div class="modal-actions"><button class="secondary-button" @click="editing = false">취소</button><button class="primary-button" @click="saveEdit">수정 저장</button></div></template>
            <template v-else><p>{{ selected.summary }}</p><div class="key-summary"><strong>핵심 요약</strong><ul><li>Q2 우선순위를 캠페인 일정 조정과 신규 제품 라인 PoC로 재정렬했습니다.</li><li>예산은 보수적으로 산정하되 디자인 리소스 영향 분석을 선행하기로 했습니다.</li><li>박서연 책임이 리소스 영향 분석 결과를 공유합니다.</li></ul></div></template>
          </section>
          <button class="secondary-button" @click="transcriptOpen = !transcriptOpen">회의 원문 STT {{ transcriptOpen ? '닫기' : '보기' }}</button>
          <section v-if="transcriptOpen" class="transcript-box"><div class="watermark">Generated by Meetbowl</div><p v-for="line in mockTranscript" :key="line.t"><time>{{ line.t }}</time><strong>{{ line.who }}</strong><span>{{ line.text }}</span></p></section>
        </article>
      </div>
      <div v-if="shareOpen" class="modal-backdrop" @click.self="shareOpen = false">
        <article class="card write-modal share-mail-modal">
          <header><h2>새 메일 · 회의록 공유</h2><button @click="shareOpen = false">닫기</button></header>
          <div class="compose-body">
            <label>받는 사람</label>
            <div class="recipient-box"><span v-for="member in share.recipients" :key="member.id">{{ member.name }} · {{ member.dept }}<button @click="share.recipients = share.recipients.filter((item) => item.id !== member.id)">×</button></span><input v-model="share.query" placeholder="이름, 부서/팀으로 검색"></div>
            <div v-if="share.query" class="recipient-results"><button v-for="member in shareMatches" :key="member.id" @click="share.recipients.push(member); share.query = ''"><strong>{{ member.name }}</strong><small>{{ member.company }} · {{ member.dept }} · {{ member.email }}</small></button></div>
            <input v-model="share.subject" placeholder="제목">
            <textarea v-model="share.body" rows="10"></textarea>
          </div>
          <footer><small>받는 사람 {{ share.recipients.length }}명</small><div><button class="secondary-button" @click="shareOpen = false">취소</button><button class="primary-button" @click="shareOpen = false">보내기</button></div></footer>
        </article>
      </div>
    </section>
  `,
})

export const WorkspacePage = defineComponent({
  setup() {
    const tabs = [
      { id: 'calendar', label: '일정' },
      { id: 'memo', label: '개인 메모장' },
      { id: 'favorites', label: '회의록' },
      { id: 'mail-backup', label: '백업한 메일' },
      { id: 'drive', label: '개인 드라이브' },
    ]
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    const weekNames = ['일', '월', '화', '수', '목', '금', '토']
    const activeTab = ref('calendar')
    const cursor = ref(new Date(2026, 4, 1))
    const selected = ref('2026-05-21')
    const filter = ref('all')
    const monthPickerOpen = ref(false)
    const extraEvents = ref([])
    const addEventOpen = ref(false)
    const addColleagueOpen = ref(false)
    const eventDraft = ref({ title: '', date: selected.value, start: '09:00', end: '10:00', place: '', address: '', desc: '' })
    const colleagueName = ref('')
    const colleagues = ref({ 박서연: true, 정도현: true, 김민수: true })
    const hoveredColleague = ref('')
    const backupMails = ref(workspaceBackupMails.map((mail) => ({ ...mail })))
    const driveFiles = ref(workspaceDriveFiles.map((file) => ({ ...file })))
    const memos = ref(initialMemos.map((memo) => ({ ...memo })))
    const activeMemoId = ref(initialMemos[0].id)

    const cells = computed(() => workspaceMonthCells(cursor.value.getFullYear(), cursor.value.getMonth()).map((date) => ({
      date,
      key: workspaceDateKey(date),
      day: date.getDate(),
      weekday: date.getDay(),
      inMonth: date.getMonth() === cursor.value.getMonth(),
    })))

    const allEvents = computed(() => [...workspaceEvents, ...extraEvents.value])
    const eventsByDate = computed(() => {
      const map = {}
      allEvents.value
        .filter((event) => filter.value === 'all' || event.kind === filter.value)
        .filter((event) => event.kind === 'mine' || colleagues.value[event.who])
        .forEach((event) => {
          if (!map[event.date]) map[event.date] = []
          map[event.date].push(event)
        })
      return map
    })

    const selectedEvents = computed(() => (eventsByDate.value[selected.value] || []).slice().sort((a, b) => a.start.localeCompare(b.start)))
    const visibleMemos = computed(() => memos.value.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated.localeCompare(a.updated)))
    const activeMemo = computed(() => memos.value.find((memo) => memo.id === activeMemoId.value))

    function moveMonth(offset) {
      cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + offset, 1)
    }

    function moveYear(offset) {
      cursor.value = new Date(cursor.value.getFullYear() + offset, cursor.value.getMonth(), 1)
    }

    function goToday() {
      cursor.value = new Date(2026, 4, 1)
      selected.value = '2026-05-21'
    }

    function selectMonth(index) {
      cursor.value = new Date(cursor.value.getFullYear(), index, 1)
      selected.value = workspaceDateKey(cursor.value)
      monthPickerOpen.value = false
    }

    function resetEventDraft() {
      eventDraft.value = { title: '', date: selected.value, start: '09:00', end: '10:00', place: '', address: '', desc: '' }
      addEventOpen.value = true
    }

    function saveEvent() {
      if (!eventDraft.value.title.trim()) return
      extraEvents.value.push({
        date: eventDraft.value.date,
        start: eventDraft.value.start,
        end: eventDraft.value.end,
        title: eventDraft.value.title.trim(),
        where: eventDraft.value.place.trim() || undefined,
        address: eventDraft.value.address.trim() || undefined,
        who: '나',
        kind: 'mine',
      })
      selected.value = eventDraft.value.date
      addEventOpen.value = false
    }

    function saveColleague() {
      const name = colleagueName.value.trim()
      if (!name || colleagues.value[name]) return
      colleagues.value = { ...colleagues.value, [name]: true }
      colleagueName.value = ''
      addColleagueOpen.value = false
    }

    function removeBackupMail(id) {
      backupMails.value = backupMails.value.filter((mail) => mail.id !== id)
    }

    function addDriveMock() {
      driveFiles.value.unshift({ name: `업로드_문서_${driveFiles.value.length + 1}.pdf`, size: '640KB', time: '방금' })
    }

    function createMemo() {
      const id = `m${Date.now()}`
      memos.value.unshift({ id, title: '새 메모', body: '', updated: workspaceNow(), pinned: false })
      activeMemoId.value = id
    }

    function updateMemo(patch) {
      if (!activeMemo.value) return
      Object.assign(activeMemo.value, patch, { updated: workspaceNow() })
    }

    function deleteMemo() {
      if (!activeMemo.value) return
      const id = activeMemo.value.id
      memos.value = memos.value.filter((memo) => memo.id !== id)
      activeMemoId.value = memos.value[0]?.id || ''
    }

    return {
      tabs,
      monthNames,
      weekNames,
      activeTab,
      cursor,
      selected,
      filter,
      monthPickerOpen,
      addEventOpen,
      addColleagueOpen,
      eventDraft,
      colleagueName,
      colleagues,
      colleagueInfo,
      hoveredColleague,
      backupMails,
      driveFiles,
      favoriteRecordings,
      cells,
      eventsByDate,
      selectedEvents,
      visibleMemos,
      activeMemo,
      activeMemoId,
      moveMonth,
      moveYear,
      goToday,
      selectMonth,
      resetEventDraft,
      saveEvent,
      saveColleague,
      removeBackupMail,
      addDriveMock,
      createMemo,
      updateMemo,
      deleteMemo,
    }
  },
  template: `
    <section class="page workspace-page">
      <header class="page-header">
        <h1>개인 워크스페이스</h1>
        <p>나의 일정과 메모, 자료를 한 곳에서 관리하세요.</p>
      </header>

      <nav class="workspace-tabs">
        <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          {{ tab.label }}
        </button>
      </nav>

      <div v-if="activeTab === 'calendar'" class="workspace-calendar-grid">
        <article class="card workspace-calendar-card">
          <div class="workspace-calendar-toolbar">
            <div class="workspace-month">
              <button type="button" class="workspace-month-button" @click="monthPickerOpen = !monthPickerOpen">
                {{ cursor.getFullYear() }}년 {{ monthNames[cursor.getMonth()] }}
              </button>
              <div v-if="monthPickerOpen" class="workspace-month-picker">
                <div class="workspace-year-row">
                  <button type="button" @click="moveYear(-1)">‹</button>
                  <strong>{{ cursor.getFullYear() }}년</strong>
                  <button type="button" @click="moveYear(1)">›</button>
                </div>
                <div class="workspace-month-grid">
                  <button v-for="(month, index) in monthNames" :key="month" type="button" :class="{ active: cursor.getMonth() === index }" @click="selectMonth(index)">
                    {{ month }}
                  </button>
                </div>
              </div>
              <div class="workspace-prev-next">
                <button type="button" @click="moveMonth(-1)">‹</button>
                <button type="button" @click="goToday">오늘</button>
                <button type="button" @click="moveMonth(1)">›</button>
              </div>
            </div>
            <div class="workspace-calendar-actions">
              <div class="segmented">
                <button type="button" :class="{ active: filter === 'all' }" @click="filter = 'all'">전체</button>
                <button type="button" :class="{ active: filter === 'mine' }" @click="filter = 'mine'">내 일정</button>
                <button type="button" :class="{ active: filter === 'team' }" @click="filter = 'team'">동료</button>
              </div>
              <button type="button" class="primary-button small" @click="resetEventDraft">일정 추가</button>
            </div>
          </div>

          <div class="calendar-week-row">
            <div v-for="(week, index) in weekNames" :key="week" :class="{ sun: index === 0, sat: index === 6 }">{{ week }}</div>
          </div>
          <div class="calendar-grid">
            <button v-for="cell in cells" :key="cell.key" type="button" class="calendar-cell" :class="{ muted: !cell.inMonth, today: cell.key === '2026-05-21', selected: selected === cell.key, sun: cell.weekday === 0, sat: cell.weekday === 6 }" @click="selected = cell.key">
              <div class="calendar-date-row">
                <span>{{ cell.day }}</span>
                <small v-if="eventsByDate[cell.key]?.length">{{ eventsByDate[cell.key].length }}</small>
              </div>
              <div class="calendar-event-stack">
                <span v-for="event in (eventsByDate[cell.key] || []).slice(0, 3)" :key="event.title + event.start" :class="['calendar-event-pill', event.kind]">
                  {{ event.start }} {{ event.title }}
                </span>
                <em v-if="(eventsByDate[cell.key] || []).length > 3">+{{ eventsByDate[cell.key].length - 3 }}건</em>
              </div>
            </button>
          </div>
        </article>

        <aside class="card workspace-day-card">
          <div class="workspace-day-head">
            <div>
              <small>선택한 날짜</small>
              <strong>{{ selected.replace('-', '. ').replace('-', '. ') }}</strong>
            </div>
            <span class="badge primary">{{ selectedEvents.length }}건</span>
          </div>
          <div class="workspace-event-list">
            <div v-for="event in selectedEvents" :key="event.title + event.start" :class="['workspace-event-item', event.kind]">
              <div>
                <strong>{{ event.title }}</strong>
                <span>{{ event.start }} - {{ event.end }} <template v-if="event.where">· {{ event.where }}</template></span>
              </div>
              <span :class="['badge', event.kind === 'mine' ? 'primary' : 'navy']">{{ event.kind === 'mine' ? '내 일정' : event.who }}</span>
            </div>
            <div v-if="selectedEvents.length === 0" class="empty-state">예정된 일정이 없습니다.</div>
          </div>

          <div class="workspace-colleagues">
            <div class="workspace-colleague-title">
              <strong>구독한 동료</strong>
              <small>클릭하여 일정 토글</small>
            </div>
            <div v-for="(_, name) in colleagues" :key="name" class="workspace-colleague-wrap" @mouseenter="hoveredColleague = name" @mouseleave="hoveredColleague = ''">
              <button type="button" class="workspace-colleague-row" :class="{ inactive: !colleagues[name] }" @click="colleagues[name] = !colleagues[name]">
                <span class="workspace-check">{{ colleagues[name] ? '✓' : '' }}</span>
                <span>{{ name }}</span>
                <i :class="colleagueInfo[name]?.status || 'away'"></i>
              </button>
              <div v-if="hoveredColleague === name && colleagueInfo[name]" class="workspace-colleague-card">
                <div class="workspace-profile-row">
                  <span class="avatar">{{ name[0] }}</span>
                  <div><strong>{{ name }}</strong><small>{{ colleagueInfo[name].dept }} · {{ colleagueInfo[name].position }}</small></div>
                </div>
                <p>{{ colleagueInfo[name].email }}</p>
                <p>{{ colleagueInfo[name].phone }}</p>
              </div>
            </div>
            <button type="button" class="dashed-button" @click="addColleagueOpen = true">동료 구독 추가</button>
          </div>
        </aside>
      </div>

      <div v-else-if="activeTab === 'memo'" class="workspace-memo-grid">
        <aside class="card workspace-memo-list">
          <div class="workspace-panel-head"><h2>최근 메모</h2><button type="button" @click="createMemo">+</button></div>
          <button v-for="memo in visibleMemos" :key="memo.id" type="button" class="workspace-memo-item" :class="{ active: activeMemoId === memo.id }" @click="activeMemoId = memo.id">
            <strong>{{ memo.title }}</strong>
            <span>{{ memo.body.split('\\n')[0] || '내용 없음' }}</span>
            <small>{{ memo.updated }}</small>
            <em v-if="memo.pinned">고정</em>
          </button>
        </aside>
        <article class="card workspace-memo-editor">
          <template v-if="activeMemo">
            <div class="workspace-memo-title-row">
              <input :value="activeMemo.title" @input="updateMemo({ title: $event.target.value })">
              <button type="button" :class="{ active: activeMemo.pinned }" @click="updateMemo({ pinned: !activeMemo.pinned })">고정</button>
              <button type="button" class="danger-text" @click="deleteMemo">삭제</button>
            </div>
            <textarea :value="activeMemo.body" placeholder="메모를 작성하세요..." @input="updateMemo({ body: $event.target.value })"></textarea>
            <small>최근 수정: {{ activeMemo.updated }}</small>
          </template>
          <div v-else class="empty-state">메모를 선택하거나 새로 만들어 보세요.</div>
        </article>
      </div>

      <article v-else-if="activeTab === 'favorites'" class="card workspace-panel">
        <div class="workspace-panel-head"><h2>즐겨찾기한 회의록</h2><span>총 {{ favoriteRecordings.length }}건</span></div>
        <RouterLink v-for="item in favoriteRecordings" :key="item.title" to="/app/recordings" class="workspace-file-row">
          <span class="workspace-file-icon">문서</span>
          <div><strong>{{ item.title }}</strong><small>{{ item.meta }}</small></div>
          <em>북마크</em>
        </RouterLink>
      </article>

      <article v-else-if="activeTab === 'mail-backup'" class="card workspace-panel">
        <div class="workspace-panel-head"><h2>백업한 메일</h2><span>총 {{ backupMails.length }}건</span></div>
        <div v-for="mail in backupMails" :key="mail.id" class="workspace-mail-row">
          <RouterLink :to="'/app/backup/' + mail.id">
            <strong>{{ mail.title }}</strong>
            <small>{{ mail.from }} · {{ mail.date }} · {{ mail.preview }}</small>
          </RouterLink>
          <button type="button" @click="removeBackupMail(mail.id)">해제</button>
        </div>
        <div v-if="backupMails.length === 0" class="empty-state">백업한 메일이 없습니다.</div>
      </article>

      <article v-else class="card workspace-panel">
        <div class="workspace-panel-head"><h2>개인 드라이브</h2><button type="button" @click="addDriveMock">업로드</button></div>
        <button type="button" class="workspace-upload-zone" @click="addDriveMock">
          <strong>파일을 끌어다 놓거나 클릭해 업로드</strong>
          <span>문서·이미지·압축 파일 등 · HWP / HWPX 형식은 제외</span>
        </button>
        <div class="table-card">
          <table>
            <thead><tr><th>파일명</th><th>크기</th><th>수정</th></tr></thead>
            <tbody><tr v-for="file in driveFiles" :key="file.name + file.time"><td>{{ file.name }}</td><td>{{ file.size }}</td><td>{{ file.time }}</td></tr></tbody>
          </table>
        </div>
      </article>

      <div v-if="addEventOpen" class="modal-backdrop" @click="addEventOpen = false">
        <form class="write-modal" @submit.prevent="saveEvent" @click.stop>
          <header><h2>일정 추가</h2><button type="button" @click="addEventOpen = false">닫기</button></header>
          <input v-model="eventDraft.title" placeholder="일정 제목">
          <div class="workspace-event-form-grid">
            <input v-model="eventDraft.date" type="date">
            <input v-model="eventDraft.start" type="time">
            <input v-model="eventDraft.end" type="time">
          </div>
          <input v-model="eventDraft.place" placeholder="장소">
          <input v-model="eventDraft.address" placeholder="주소">
          <textarea v-model="eventDraft.desc" rows="3" placeholder="설명"></textarea>
          <footer><button type="button" class="ghost-button" @click="addEventOpen = false">취소</button><button type="submit" class="primary-button small">일정 추가</button></footer>
        </form>
      </div>

      <div v-if="addColleagueOpen" class="modal-backdrop" @click="addColleagueOpen = false">
        <form class="write-modal" @submit.prevent="saveColleague" @click.stop>
          <header><h2>동료 구독 추가</h2><button type="button" @click="addColleagueOpen = false">닫기</button></header>
          <input v-model="colleagueName" placeholder="이름 또는 이메일">
          <p class="modal-note">정확한 이름 또는 사내 이메일로 검색됩니다.</p>
          <footer><button type="button" class="ghost-button" @click="addColleagueOpen = false">취소</button><button type="submit" class="primary-button small">구독</button></footer>
        </form>
      </div>
    </section>
  `,
})

export const SharedDocsPage = defineComponent({
  setup() {
    const projects = ref(sharedInitialProjects.map((project) => ({ ...project, docIds: [...project.docIds], participants: project.participants ? [...project.participants] : undefined })))
    const docs = ref(sharedInitialDocs.map((doc) => ({ ...doc, history: doc.history.map((history) => ({ ...history })) })))
    const activeProject = ref('all')
    const keyword = ref('')
    const openId = ref(null)
    const createOpen = ref(false)
    const uploadOpen = ref(false)
    const projectDraft = ref({ name: '', query: '', participants: [] })
    const uploadDraft = ref({ mode: 'new', docId: sharedInitialDocs[0]?.id || '', title: '', dept: sharedTeams[0], note: '' })

    const filteredDocs = computed(() => docs.value.filter((doc) => {
      const project = projects.value.find((item) => item.id === activeProject.value)
      const inProject = activeProject.value === 'all' || (project?.docIds || []).includes(doc.id)
      return inProject && (!keyword.value.trim() || doc.title.includes(keyword.value.trim()))
    }))
    const openDoc = computed(() => docs.value.find((doc) => doc.id === openId.value))
    const projectCandidates = computed(() => members
      .filter((member) => !projectDraft.value.participants.includes(member.name))
      .filter((member) => {
        const q = projectDraft.value.query.trim().toLowerCase()
        return !q || `${member.name} ${member.company} ${member.dept} ${member.position} ${member.email}`.toLowerCase().includes(q)
      })
      .slice(0, 6))
    const uploadTarget = computed(() => docs.value.find((doc) => doc.id === uploadDraft.value.docId))

    function projectCount(project) {
      return project.id === 'all' ? docs.value.length : project.docIds.filter((id) => docs.value.some((doc) => doc.id === id)).length
    }

    function docTypeClass(type) {
      return `shared-type-${type}`
    }

    function resetCreateProject() {
      projectDraft.value = { name: '', query: '', participants: [] }
      createOpen.value = true
    }

    function addProjectParticipant(name) {
      if (!projectDraft.value.participants.includes(name)) {
        projectDraft.value.participants.push(name)
      }
      projectDraft.value.query = ''
    }

    function createProject() {
      const name = projectDraft.value.name.trim()
      if (!name) return
      const id = `proj${Date.now()}`
      projects.value.push({ id, label: name, docIds: [], participants: [...projectDraft.value.participants] })
      activeProject.value = id
      createOpen.value = false
    }

    function resetUpload() {
      uploadDraft.value = { mode: 'new', docId: docs.value[0]?.id || '', title: '', dept: sharedTeams[0], note: '' }
      uploadOpen.value = true
    }

    function uploadDocument() {
      const now = '2026-06-01 10:00'
      if (uploadDraft.value.mode === 'new') {
        const title = uploadDraft.value.title.trim()
        if (!title) return
        const id = `d${Date.now()}`
        docs.value.unshift({
          id,
          title,
          type: 'doc',
          dept: uploadDraft.value.dept,
          author: '이지연',
          uploaded: now,
          updated: now,
          version: 'v1.0',
          size: '0.1MB',
          preview: '(새 문서)',
          history: [{ v: 'v1.0', author: '이지연', date: now, note: uploadDraft.value.note.trim() || '최초 업로드' }],
        })
        if (activeProject.value !== 'all') {
          const project = projects.value.find((item) => item.id === activeProject.value)
          project?.docIds.unshift(id)
        }
      } else {
        const target = uploadTarget.value
        if (!target) return
        const version = nextSharedVersion(target.version)
        target.version = version
        target.updated = now
        target.history.unshift({ v: version, author: '이지연', date: now, note: uploadDraft.value.note.trim() || '새 버전 업로드' })
      }
      uploadOpen.value = false
    }

    return {
      projects,
      docs,
      activeProject,
      keyword,
      openId,
      createOpen,
      uploadOpen,
      projectDraft,
      uploadDraft,
      sharedTeams,
      sharedTypeLabels,
      filteredDocs,
      openDoc,
      projectCandidates,
      uploadTarget,
      nextSharedVersion,
      projectCount,
      docTypeClass,
      resetCreateProject,
      addProjectParticipant,
      createProject,
      resetUpload,
      uploadDocument,
    }
  },
  template: `
    <section class="page shared-page">
      <header class="page-header shared-header">
        <div>
          <h1>공유 워크스페이스</h1>
          <p>프로젝트별 공유 문서와 버전 관리를 한 곳에서 확인하세요.</p>
        </div>
        <div class="shared-header-actions">
          <button type="button" class="ghost-button" @click="resetCreateProject">프로젝트 생성</button>
          <button type="button" class="primary-button small" @click="resetUpload">문서 업로드</button>
        </div>
      </header>

      <div class="shared-layout">
        <aside class="card shared-projects">
          <div class="shared-section-title">공유 스페이스</div>
          <button v-for="project in projects" :key="project.id" type="button" class="shared-project-row" :class="{ active: activeProject === project.id }" @click="activeProject = project.id">
            <span>
              <strong>{{ project.label }}</strong>
              <small v-if="project.participants?.length">참여자 {{ project.participants.length }}명</small>
            </span>
            <em>{{ projectCount(project) }}</em>
          </button>
        </aside>

        <main class="shared-main">
          <div class="shared-toolbar">
            <label class="shared-search">
              <span>문서 검색</span>
              <input v-model="keyword" placeholder="문서 검색">
            </label>
            <small>총 {{ filteredDocs.length }}건</small>
          </div>

          <div class="table-card shared-table-card">
            <table>
              <thead>
                <tr>
                  <th>문서</th>
                  <th>부서</th>
                  <th>작성자</th>
                  <th>버전</th>
                  <th>최근 수정</th>
                  <th>더보기</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in filteredDocs" :key="doc.id" @click="openId = doc.id">
                  <td>
                    <div class="shared-doc-cell">
                      <span :class="['shared-doc-icon', docTypeClass(doc.type)]">{{ sharedTypeLabels[doc.type] }}</span>
                      <div><strong>{{ doc.title }}</strong><small>{{ sharedTypeLabels[doc.type] }} · {{ doc.size }}</small></div>
                    </div>
                  </td>
                  <td>{{ doc.dept }}</td>
                  <td>{{ doc.author }}</td>
                  <td><span class="badge primary">{{ doc.version }}</span></td>
                  <td>{{ doc.updated }}</td>
                  <td><button type="button" class="more-button" @click.stop="openId = doc.id">•••</button></td>
                </tr>
                <tr v-if="filteredDocs.length === 0"><td colspan="6"><div class="empty-state">문서가 없습니다.</div></td></tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>

      <div v-if="openDoc" class="drawer-backdrop" @click="openId = null">
        <aside class="shared-drawer" @click.stop>
          <header>
            <span :class="['shared-doc-icon', docTypeClass(openDoc.type)]">{{ sharedTypeLabels[openDoc.type] }}</span>
            <div>
              <strong>{{ openDoc.title }}</strong>
              <small>{{ openDoc.dept }} · {{ openDoc.author }} · {{ openDoc.version }}</small>
            </div>
            <button type="button" class="ghost-button">다운로드</button>
            <button type="button" class="drawer-close" @click="openId = null">닫기</button>
          </header>
          <section>
            <h2>버전 이력</h2>
            <article v-for="history in openDoc.history" :key="history.v" class="version-card">
              <div><span class="badge primary">{{ history.v }}</span><strong>{{ history.note }}</strong><small>{{ history.date }}</small></div>
              <p>{{ history.author }} · 이 버전으로 복원</p>
            </article>
          </section>
        </aside>
      </div>

      <div v-if="createOpen" class="modal-backdrop" @click="createOpen = false">
        <form class="write-modal" @submit.prevent="createProject" @click.stop>
          <header><h2>프로젝트 생성</h2><button type="button" @click="createOpen = false">닫기</button></header>
          <label>프로젝트 이름<input v-model="projectDraft.name" placeholder="예: Q3 신제품 TF"></label>
          <div class="participant-box">
            <div class="participant-chips">
              <span v-for="name in projectDraft.participants" :key="name">{{ name }} <button type="button" @click="projectDraft.participants = projectDraft.participants.filter((item) => item !== name)">×</button></span>
              <input v-model="projectDraft.query" placeholder="이름, 부서/팀 검색...">
            </div>
            <div v-if="projectDraft.query && projectCandidates.length" class="participant-results">
              <button v-for="candidate in projectCandidates" :key="candidate.id" type="button" @click="addProjectParticipant(candidate.name)">
                <strong>{{ candidate.name }} <small>{{ candidate.position }}</small></strong>
                <span>{{ candidate.company }} · {{ candidate.dept }} · {{ candidate.email }}</span>
              </button>
            </div>
          </div>
          <footer><button type="button" class="ghost-button" @click="createOpen = false">취소</button><button type="submit" class="primary-button small">생성</button></footer>
        </form>
      </div>

      <div v-if="uploadOpen" class="modal-backdrop" @click="uploadOpen = false">
        <form class="write-modal" @submit.prevent="uploadDocument" @click.stop>
          <header><h2>{{ uploadDraft.mode === 'new' ? '문서 등록' : '새 버전 업로드' }}</h2><button type="button" @click="uploadOpen = false">닫기</button></header>
          <div class="upload-mode-grid">
            <button type="button" :class="{ active: uploadDraft.mode === 'new' }" @click="uploadDraft.mode = 'new'"><strong>새 문서 등록</strong><span>처음 올리는 문서</span></button>
            <button type="button" :class="{ active: uploadDraft.mode === 'existing' }" @click="uploadDraft.mode = 'existing'"><strong>기존 문서 업데이트</strong><span>새 버전으로 추가</span></button>
          </div>
          <label v-if="uploadDraft.mode === 'existing'">업데이트할 문서
            <select v-model="uploadDraft.docId">
              <option v-for="doc in docs" :key="doc.id" :value="doc.id">{{ doc.title }} (현재 {{ doc.version }})</option>
            </select>
            <small v-if="uploadTarget">덮어쓰지 않고 {{ nextSharedVersion(uploadTarget.version) }}로 버전을 쌓습니다.</small>
          </label>
          <button type="button" class="shared-upload-zone"><strong>파일을 드래그하거나 클릭해 업로드</strong><span>DOC, XLSX, PDF, PPTX 지원 · 최대 50MB</span></button>
          <template v-if="uploadDraft.mode === 'new'">
            <label>문서 제목<input v-model="uploadDraft.title" placeholder="예: 신규 정책 안내"></label>
            <label>부서<select v-model="uploadDraft.dept"><option v-for="team in sharedTeams" :key="team">{{ team }}</option></select></label>
          </template>
          <label>변경 내용<textarea v-model="uploadDraft.note" rows="2" placeholder="이번 버전에서 바뀐 내용을 적어주세요"></textarea></label>
          <footer><button type="button" class="ghost-button" @click="uploadOpen = false">취소</button><button type="submit" class="primary-button small">{{ uploadDraft.mode === 'new' ? '문서 등록' : '새 버전 업로드' }}</button></footer>
        </form>
      </div>
    </section>
  `,
})

export const BackupDetailPage = defineComponent({
  setup() {
    const route = useRoute()
    const mail = computed(() => workspaceBackupMails.find((item) => item.id === route.params.id))
    return { mail }
  },
  template: `
    <section class="page backup-detail-page">
      <RouterLink to="/app/workspace" class="back-button">개인 워크스페이스로</RouterLink>
      <article v-if="mail" class="card backup-mail-card">
        <div class="backup-mail-head">
          <h1>{{ mail.title }}</h1>
          <span class="badge primary">메일 백업</span>
        </div>
        <div class="backup-sender-row">
          <span class="avatar">{{ mail.from[0] }}</span>
          <div>
            <strong>{{ mail.from }}</strong>
            <small>백업 보관</small>
            <p>받는 사람: 나 · {{ mail.date }}</p>
          </div>
        </div>
        <div class="backup-body">
          {{ mail.preview }}

본 메일은 개인 워크스페이스에 백업된 사본입니다. 원본 메일은 메일함에서 확인하실 수 있습니다.
        </div>
      </article>
      <article v-else class="card empty-state">
        백업 자료를 찾을 수 없습니다.
      </article>
    </section>
  `,
})

export const SettingsPage = defineComponent({
  setup() {
    const auth = useAuthStore()
    const user = computed(() => auth.user)
    const isAdmin = computed(() => user.value?.role === 'admin')
    const form = ref({
      name: user.value?.name || '',
      email: user.value?.email || '',
      company: user.value?.company || '',
      department: user.value?.department || '',
      position: user.value?.position || '',
    })
    const password = ref({ current: '', next: '', confirm: '' })
    const passwordVerified = ref(false)
    const passwordMessage = ref('')
    const meetingAlarm = ref('10')
    const notice = ref('')

    function saveProfile() {
      auth.updateProfile(form.value)
      notice.value = '프로필 정보를 저장했습니다.'
    }

    function verifyCurrentPassword() {
      if (!password.value.current) {
        passwordMessage.value = '현재 비밀번호를 입력하세요.'
        passwordVerified.value = false
        return
      }
      if (password.value.current === user.value?.username) {
        passwordVerified.value = true
        passwordMessage.value = '현재 비밀번호가 확인되었습니다.'
      } else {
        passwordVerified.value = false
        passwordMessage.value = '현재 비밀번호가 일치하지 않습니다.'
      }
    }

    function changePassword() {
      if (!passwordVerified.value) {
        passwordMessage.value = '현재 비밀번호 확인이 필요합니다.'
        return
      }
      if (password.value.next.length < 4) {
        passwordMessage.value = '새 비밀번호는 4자 이상이어야 합니다.'
        return
      }
      if (password.value.next !== password.value.confirm) {
        passwordMessage.value = '새 비밀번호가 일치하지 않습니다.'
        return
      }
      password.value = { current: '', next: '', confirm: '' }
      passwordVerified.value = false
      passwordMessage.value = '비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용하세요.'
    }

    return {
      user,
      isAdmin,
      form,
      password,
      passwordVerified,
      passwordMessage,
      meetingAlarm,
      notice,
      saveProfile,
      verifyCurrentPassword,
      changePassword,
    }
  },
  template: `
    <section class="page settings-page">
      <header class="page-header">
        <h1>설정</h1>
        <p>개인 정보와 알림 환경을 관리합니다.</p>
      </header>

      <article class="card settings-card">
        <div class="settings-card-head">
          <h2>프로필</h2>
          <button v-if="isAdmin" type="button" class="primary-button small" @click="saveProfile">저장</button>
          <span v-else class="readonly-label">읽기 전용</span>
        </div>
        <div v-if="!isAdmin" class="settings-alert">
          프로필 정보는 관리자만 수정할 수 있습니다. 변경이 필요하면 인사 담당 관리자에게 요청하세요.
        </div>
        <div class="settings-form-grid">
          <label>이름<input v-model="form.name" :readonly="!isAdmin" :class="{ readonly: !isAdmin }"></label>
          <label>이메일<input v-model="form.email" :readonly="!isAdmin" :class="{ readonly: !isAdmin }"></label>
          <label>계열사<input v-model="form.company" :readonly="!isAdmin" :class="{ readonly: !isAdmin }"></label>
          <label>부서<input v-model="form.department" :readonly="!isAdmin" :class="{ readonly: !isAdmin }"></label>
          <label>직급<input v-model="form.position" :readonly="!isAdmin" :class="{ readonly: !isAdmin }"></label>
        </div>
        <p v-if="notice" class="settings-success">{{ notice }}</p>
      </article>

      <article class="card settings-card">
        <h2>비밀번호 변경</h2>
        <p>최초 발급된 초기 비밀번호는 보안을 위해 변경하는 것을 권장합니다.</p>
        <div class="password-box">
          <label>현재 비밀번호
            <div class="password-current-row">
              <input v-model="password.current" type="password" placeholder="••••••" @input="passwordVerified = false">
              <button type="button" :class="{ verified: passwordVerified }" @click="verifyCurrentPassword">{{ passwordVerified ? '확인됨' : '확인' }}</button>
            </div>
          </label>
          <div :class="['password-next-fields', { disabled: !passwordVerified }]">
            <label>새 비밀번호<input v-model="password.next" type="password" placeholder="••••••"></label>
            <label>새 비밀번호 확인<input v-model="password.confirm" type="password" placeholder="••••••"></label>
          </div>
          <button type="button" class="primary-button small" :disabled="!passwordVerified" @click="changePassword">비밀번호 변경</button>
          <p v-if="passwordMessage" class="settings-message">{{ passwordMessage }}</p>
        </div>
      </article>

      <article class="card settings-card">
        <h2>알림</h2>
        <div class="settings-notification-row">
          <span>회의 시작 전 알림</span>
          <select v-model="meetingAlarm">
            <option value="10">10분 전</option>
            <option value="20">20분 전</option>
            <option value="30">30분 전</option>
          </select>
        </div>
        <label class="settings-toggle-row"><span>회의록 생성 완료 알림</span><input type="checkbox" checked></label>
        <label class="settings-toggle-row"><span>새 내부 메일 알림</span><input type="checkbox" checked></label>
      </article>
    </section>
  `,
})

export const SimpleDocsPage = defineComponent({
  props: ['title', 'description'],
  setup(props) {
    return { props, docs: workspaceDocs, mails, recordings }
  },
  template: `<section class="page"><header class="page-header"><h1>{{ title }}</h1><p>{{ description }}</p></header><div class="metric-grid"><div class="metric-card"><span>문서</span><strong>{{ docs.length }}</strong></div><div class="metric-card"><span>메일</span><strong>{{ mails.length }}</strong></div><div class="metric-card"><span>회의록</span><strong>{{ recordings.length }}</strong></div></div><div class="doc-grid"><article v-for="doc in docs" :key="doc.id" class="card"><h2>{{ doc.title }}</h2><p>{{ doc.owner }} · {{ doc.updatedAt }}</p></article></div></section>`,
})

export const CommunityPage = defineComponent({
  setup() {
    const categories = ['전체', '자유', '회사생활', '익명제보', '취미', '맛집']
    const posts = ref(communityPosts.map((post) => ({ ...post, comments: post.comments.map((comment) => ({ ...comment })) })))
    const tab = ref('latest')
    const category = ref('전체')
    const keyword = ref('')
    const openId = ref(null)
    const writing = ref(false)
    const likedPostIds = ref(new Set())
    const commentText = ref('')
    const editingCommentId = ref(null)
    const editText = ref('')
    const draft = ref({ title: '', body: '', category: '자유' })

    const score = (post) => post.likes * 3 + post.comments.length * 5 + post.views * 0.05
    const hotPosts = computed(() => posts.value.slice().sort((a, b) => score(b) - score(a)).slice(0, 3))
    const filteredPosts = computed(() => {
      let result = posts.value.slice()
      if (category.value !== '전체') result = result.filter((post) => post.category === category.value)
      const q = keyword.value.trim()
      if (q) result = result.filter((post) => post.title.includes(q) || post.body.includes(q))
      return result.sort((a, b) => (tab.value === 'hot' ? score(b) - score(a) : b.createdAt.localeCompare(a.createdAt)))
    })
    const openPost = computed(() => posts.value.find((post) => post.id === openId.value))

    function nowText() {
      const now = new Date()
      const pad = (value) => String(value).padStart(2, '0')
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    }

    function openPostDetail(post) {
      openId.value = post.id
      const target = posts.value.find((item) => item.id === post.id)
      if (target) target.views += 1
      commentText.value = ''
      editingCommentId.value = null
    }

    function closeDetail() {
      openId.value = null
      commentText.value = ''
      editingCommentId.value = null
    }

    function toggleLike(post) {
      const next = new Set(likedPostIds.value)
      if (next.has(post.id)) {
        post.likes -= 1
        next.delete(post.id)
      } else {
        post.likes += 1
        next.add(post.id)
      }
      likedPostIds.value = next
    }

    function addComment() {
      if (!openPost.value || !commentText.value.trim()) return
      openPost.value.comments.push({
        id: `c${Date.now()}`,
        text: commentText.value.trim(),
        createdAt: nowText(),
        likes: 0,
        mine: true,
      })
      commentText.value = ''
    }

    function startEditComment(comment) {
      editingCommentId.value = comment.id
      editText.value = comment.text
    }

    function saveEditComment(comment) {
      const text = editText.value.trim()
      if (text) comment.text = text
      editingCommentId.value = null
      editText.value = ''
    }

    function openWriteModal() {
      draft.value = { title: '', body: '', category: '자유' }
      writing.value = true
    }

    function savePost() {
      const title = draft.value.title.trim()
      const body = draft.value.body.trim()
      if (!title || !body) return
      posts.value.unshift({
        id: `p${Date.now()}`,
        title,
        body,
        category: draft.value.category,
        createdAt: nowText(),
        views: 0,
        likes: 0,
        comments: [],
      })
      writing.value = false
    }

    return {
      categories,
      posts,
      tab,
      category,
      keyword,
      writing,
      likedPostIds,
      commentText,
      editingCommentId,
      editText,
      draft,
      hotPosts,
      filteredPosts,
      openPost,
      score,
      openPostDetail,
      closeDetail,
      toggleLike,
      addComment,
      startEditComment,
      saveEditComment,
      openWriteModal,
      savePost,
    }
  },
  template: `
    <section v-if="!openPost" class="page community-page">
      <header class="page-header community-header">
        <div>
          <h1>도파민</h1>
          <p>익명으로 자유롭게 의견을 나누는 공간입니다. 인신공격과 비방은 금지됩니다.</p>
        </div>
        <button class="primary-button small" type="button" @click="openWriteModal">글쓰기</button>
      </header>

      <article class="card community-hot">
        <div class="community-section-title">
          <span class="hot-icon">HOT</span>
          <h2>HOT 게시글</h2>
          <small>실시간 인기</small>
        </div>
        <div class="hot-grid">
          <button v-for="(post, index) in hotPosts" :key="post.id" class="hot-card" type="button" @click="openPostDetail(post)">
            <div class="hot-meta"><strong>#{{ index + 1 }}</strong><span class="badge warning">{{ post.category }}</span></div>
            <h3>{{ post.title }}</h3>
            <div class="community-stats">
              <span>조회 {{ post.views.toLocaleString() }}</span>
              <span>좋아요 {{ post.likes }}</span>
              <span>댓글 {{ post.comments.length }}</span>
            </div>
          </button>
        </div>
      </article>

      <div class="community-controls">
        <div class="segmented">
          <button type="button" :class="{ active: tab === 'latest' }" @click="tab = 'latest'">최신순</button>
          <button type="button" :class="{ active: tab === 'hot' }" @click="tab = 'hot'">인기순</button>
        </div>
        <div class="category-row">
          <button v-for="item in categories" :key="item" type="button" class="chip" :class="{ active: category === item }" @click="category = item">{{ item }}</button>
        </div>
        <label class="community-search">
          <span>검색</span>
          <input v-model="keyword" placeholder="게시글 검색">
        </label>
      </div>

      <article class="card community-list">
        <button v-for="post in filteredPosts" :key="post.id" class="community-row" type="button" @click="openPostDetail(post)">
          <div class="community-row-main">
            <div class="community-row-top">
              <span class="badge">{{ post.category }}</span>
              <span v-if="score(post) > 200" class="hot-dot">인기</span>
            </div>
            <strong>{{ post.title }}</strong>
            <p>{{ post.body }}</p>
            <small>익명 · {{ post.createdAt }}</small>
          </div>
          <div class="community-row-stats">
            <span>조회<br><strong>{{ post.views.toLocaleString() }}</strong></span>
            <span>좋아요<br><strong>{{ post.likes }}</strong></span>
            <span>댓글<br><strong>{{ post.comments.length }}</strong></span>
          </div>
        </button>
        <div v-if="filteredPosts.length === 0" class="empty-state">게시글이 없습니다.</div>
      </article>

      <div v-if="writing" class="modal-backdrop" @click="writing = false">
        <form class="write-modal" @submit.prevent="savePost" @click.stop>
          <header>
            <h2>새 글 작성 (익명)</h2>
            <button type="button" @click="writing = false">닫기</button>
          </header>
          <select v-model="draft.category">
            <option v-for="item in categories.filter((item) => item !== '전체')" :key="item">{{ item }}</option>
          </select>
          <input v-model="draft.title" placeholder="제목">
          <textarea v-model="draft.body" rows="8" placeholder="내용을 입력하세요. 작성자는 익명으로 표시됩니다."></textarea>
          <p class="modal-note">비방·인신공격 게시물은 관리자에 의해 삭제될 수 있습니다.</p>
          <footer>
            <button type="button" class="ghost-button" @click="writing = false">취소</button>
            <button type="submit" class="primary-button small">등록</button>
          </footer>
        </form>
      </div>
    </section>

    <section v-else class="page community-detail">
      <button class="back-button" type="button" @click="closeDetail">목록으로</button>

      <article class="card post-detail-card">
        <span class="badge">{{ openPost.category }}</span>
        <h1>{{ openPost.title }}</h1>
        <div class="post-meta">
          <span>익명</span>
          <span>{{ openPost.createdAt }}</span>
          <span>조회 {{ openPost.views.toLocaleString() }}</span>
          <span>댓글 {{ openPost.comments.length }}</span>
        </div>
        <p class="post-body">{{ openPost.body }}</p>
        <div class="like-row">
          <button type="button" class="like-button" :class="{ active: likedPostIds.has(openPost.id) }" @click="toggleLike(openPost)">
            좋아요 {{ openPost.likes }}
          </button>
        </div>
      </article>

      <article class="card comments-card">
        <div class="card-head"><h2>댓글 {{ openPost.comments.length }}</h2></div>
        <ul class="comment-list">
          <li v-for="comment in openPost.comments" :key="comment.id">
            <div class="comment-meta">
              <strong>익명</strong>
              <span>{{ comment.createdAt }}</span>
              <button v-if="comment.mine && editingCommentId !== comment.id" type="button" @click="startEditComment(comment)">수정</button>
            </div>
            <div v-if="editingCommentId === comment.id" class="comment-edit">
              <input v-model="editText" @keydown.enter="saveEditComment(comment)">
              <button type="button" class="primary-button small" @click="saveEditComment(comment)">저장</button>
              <button type="button" class="ghost-button" @click="editingCommentId = null">취소</button>
            </div>
            <p v-else>{{ comment.text }}</p>
            <small>좋아요 {{ comment.likes }}</small>
          </li>
          <li v-if="openPost.comments.length === 0" class="empty-state">첫 댓글을 남겨보세요.</li>
        </ul>
        <div class="comment-composer">
          <input v-model="commentText" placeholder="익명으로 댓글 작성" @keydown.enter="addComment">
          <button type="button" class="primary-button small" @click="addComment">전송</button>
        </div>
      </article>
    </section>
  `,
})

const adminHourlyUsage = [
  { hour: '09', count: 12 },
  { hour: '10', count: 24 },
  { hour: '11', count: 21 },
  { hour: '12', count: 7 },
  { hour: '13', count: 15 },
  { hour: '14', count: 27 },
  { hour: '15', count: 23 },
  { hour: '16', count: 19 },
  { hour: '17', count: 13 },
  { hour: '18', count: 6 },
]

const adminSites = [
  { name: '테헤란로', building: '본관' },
  { name: '봉은사로', building: '별관' },
  { name: '안양', building: '연구동' },
]

const adminRoomUsage = [
  { room: '테헤란로(대 회의실)', site: '테헤란로', building: '본관', floor: '12F', rate: 88, hours: 126, peak: '14:00' },
  { room: '테헤란로(중 회의실)', site: '테헤란로', building: '본관', floor: '12F', rate: 81, hours: 114, peak: '10:00' },
  { room: '테헤란로(소 회의실)', site: '테헤란로', building: '본관', floor: '12F', rate: 73, hours: 98, peak: '16:00' },
  { room: '봉은사로(회의실 1)', site: '봉은사로', building: '별관', floor: '5F', rate: 67, hours: 82, peak: '15:00' },
  { room: '봉은사로(회의실 3)', site: '봉은사로', building: '별관', floor: '5F', rate: 61, hours: 74, peak: '11:00' },
  { room: '안양(대 : 도시계획부)', site: '안양', building: '연구동', floor: '3F', rate: 54, hours: 63, peak: '16:00' },
]

const initialDepts = [
  { id: 'd1', name: '경영지원실', count: 8, children: ['인사팀', '재무팀', '법무팀', 'IT운영팀'] },
  { id: 'd2', name: '프로덕트본부', count: 24, children: ['프로덕트팀', '디자인팀', '개발팀'] },
  { id: 'd3', name: '전략기획팀', count: 5, children: [] },
  { id: 'd4', name: '마케팅팀', count: 7, children: [] },
  { id: 'd5', name: '영업본부', count: 31, children: ['영업 1팀', '영업 2팀', '영업 3팀'] },
]

const initialRanks = [
  { id: 'r1', name: '사원', order: 1, count: 12 },
  { id: 'r2', name: '선임', order: 2, count: 8 },
  { id: 'r3', name: '책임', order: 3, count: 5 },
  { id: 'r4', name: '수석', order: 4, count: 3 },
  { id: 'r5', name: '이사', order: 5, count: 1 },
]

const initialTitles = [
  { id: 't1', name: '팀원', count: 22 },
  { id: 't2', name: '파트장', count: 6 },
  { id: 't3', name: '팀장', count: 4 },
  { id: 't4', name: '본부장', count: 2 },
]

function memberSeed(member, index) {
  return {
    ...member,
    hireOn: `202${Math.min(index + 1, 5)}-0${(index % 6) + 1}-01`,
    retireOn: member.status === '비활성' ? '2026-05-31' : '2999-01-01',
  }
}

export const AdminDashboardPage = defineComponent({
  setup() {
    const activeMembers = members.filter((member) => member.status === '활성').length
    const inactiveMembers = members.length - activeMembers
    const totalUsage = adminHourlyUsage.reduce((sum, item) => sum + item.count, 0)
    const peak = adminHourlyUsage.reduce((top, item) => item.count > top.count ? item : top, adminHourlyUsage[0])
    const maxUsage = Math.max(...adminHourlyUsage.map((item) => item.count))
    const siteRates = adminSites.map((site) => ({
      ...site,
      rooms: rooms.filter((room) => room.site === site.name).length,
      rate: site.name === '테헤란로' ? 82 : site.name === '봉은사로' ? 64 : 47,
    }))
    const kpis = [
      { label: '전체 사용자', value: members.length, sub: `활성 ${activeMembers} · 비활성 ${inactiveMembers}` },
      { label: '운영 회의실', value: rooms.length, sub: `사용 제한 ${rooms.filter((room) => room.restricted).length}` },
      { label: '회의실 사용 30일', value: totalUsage, sub: `피크 ${peak.hour}시 · ${peak.count}건` },
      { label: '보관 회의록', value: recordings.length, sub: '이번 달 생성 86' },
    ]
    return { adminHourlyUsage, adminLogs, adminRoomUsage, inactiveMembers, kpis, maxUsage, peak, rooms, siteRates }
  },
  template: `
    <section class="page admin-page">
      <div class="admin-eyebrow"><span></span>Admin Console</div>
      <header class="page-header"><h1>관리자 대시보드</h1><p>플랫폼 운영 현황과 회의 활동을 한눈에 확인합니다.</p></header>
      <article class="card admin-alert">
        <div class="card-head"><h2>주의 항목</h2><span class="badge warning">점검 필요</span></div>
        <div class="admin-alert-grid">
          <p><strong>사용 제한 회의실 {{ rooms.filter((room) => room.restricted).length }}건</strong><span>{{ rooms.find((room) => room.restricted)?.name }} · {{ rooms.find((room) => room.restricted)?.restrictReason }}</span></p>
          <p><strong>비활성 사용자 {{ inactiveMembers }}명</strong><span>30일 이상 미접속 계정 검토 필요</span></p>
        </div>
      </article>
      <div class="metric-grid"><article v-for="kpi in kpis" :key="kpi.label" class="metric-card"><span>{{ kpi.label }}</span><strong>{{ kpi.value }}</strong><em>{{ kpi.sub }}</em></article></div>
      <div class="admin-dashboard-grid">
        <article class="card admin-chart-card">
          <div class="card-head"><div><h2>시간대별 회의실 사용 빈도</h2><p>최근 30일 기준 회의실 점유 횟수</p></div><span class="badge">30일</span></div>
          <div class="admin-bar-chart">
            <div v-for="item in adminHourlyUsage" :key="item.hour" class="admin-bar-item">
              <div class="admin-bar-track"><i :style="{ height: (item.count / maxUsage * 100) + '%' }"></i></div>
              <span>{{ item.hour }}시</span>
              <small>{{ item.count }}</small>
            </div>
          </div>
        </article>
        <article class="card admin-site-card">
          <div class="card-head"><h2>사이트/건물별 사용률</h2><span class="badge">이번 달</span></div>
          <ul class="admin-progress-list">
            <li v-for="site in siteRates" :key="site.name"><div><strong>{{ site.name }}</strong><span>{{ site.building }} · {{ site.rooms }}실 · {{ site.rate }}%</span></div><b><i :style="{ width: site.rate + '%' }"></i></b></li>
          </ul>
          <p>가장 붐비는 시간대는 <strong>{{ peak.hour }}시</strong>입니다.</p>
        </article>
      </div>
      <div class="admin-dashboard-grid">
        <article class="card admin-table-card wide">
          <div class="card-head"><h2>회의실별 사용률 상세</h2><span class="badge">최근 30일</span></div>
          <div class="table-card embedded-table"><table><thead><tr><th>회의실</th><th>사이트/건물</th><th>층</th><th>사용률</th><th>사용 시간</th><th>피크</th></tr></thead><tbody><tr v-for="room in adminRoomUsage" :key="room.room"><td>{{ room.room }}</td><td>{{ room.site }} · {{ room.building }}</td><td>{{ room.floor }}</td><td><span class="progress-cell"><i :style="{ width: room.rate + '%' }"></i></span>{{ room.rate }}%</td><td>{{ room.hours }}h</td><td>{{ room.peak }}</td></tr></tbody></table></div>
        </article>
        <article class="card admin-table-card">
          <div class="card-head"><h2>관리자 작업 로그</h2><span class="badge">최근</span></div>
          <ul class="compact-list"><li v-for="log in adminLogs.slice(0, 5)" :key="log.id"><strong>{{ log.action }}</strong><span>{{ log.actor }} · {{ log.time }}</span></li></ul>
        </article>
      </div>
    </section>
  `,
})

export const MembersPage = defineComponent({
  setup() {
    const list = ref(members.map(memberSeed))
    const q = ref('')
    const filter = ref('전체')
    const modal = ref(false)
    const detail = ref(null)
    const editingId = ref('')
    const fileInput = ref(null)
    const form = ref({ name: '', emailLocal: '', company: companies[0], dept: '프로덕트팀', position: '사원', hireOn: '2026-01-01', retireOn: '2999-01-01', role: 'User' })
    const filtered = computed(() => list.value.filter((member) => {
      const employed = member.retireOn === '2999-01-01'
      const matchesStatus = filter.value === '전체' || (filter.value === '재직' ? employed : !employed)
      const matchesQuery = !q.value || `${member.name} ${member.email} ${member.company} ${member.dept}`.toLowerCase().includes(q.value.toLowerCase())
      return matchesStatus && matchesQuery
    }))
    function openModal(member) {
      editingId.value = member?.id || ''
      form.value = member ? { ...member, emailLocal: member.email.split('@')[0] } : { name: '', emailLocal: '', company: companies[0], dept: '프로덕트팀', position: '사원', hireOn: '2026-01-01', retireOn: '2999-01-01', role: 'User' }
      modal.value = true
    }
    function saveMember() {
      const payload = { ...form.value, email: `${form.value.emailLocal || 'user'}@meetbowl.co`, status: form.value.retireOn === '2999-01-01' ? '활성' : '비활성', title: form.value.role === 'Admin' ? '관리자' : '팀원' }
      delete payload.emailLocal
      if (editingId.value) list.value = list.value.map((member) => member.id === editingId.value ? { ...member, ...payload } : member)
      else list.value.push({ id: `u${Date.now()}`, ...payload })
      modal.value = false
    }
    function removeMember(id) {
      list.value = list.value.filter((member) => member.id !== id)
      detail.value = null
    }
    function downloadMembers() {
      downloadCsv('회원.csv', ['이름', '이메일', '계열사', '부서', '직급', '입사일', '퇴사일'], list.value.map((member) => [member.name, member.email, member.company, member.dept, member.position, member.hireOn, member.retireOn]))
    }
    function uploadMembers(event) {
      const file = event.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const rows = parseCsv(String(reader.result || '').replace(/^\uFEFF/, '')).filter((row) => row.some((cell) => cell.trim()))
        list.value = rows.slice(1).map((row, index) => ({ id: `csv-${Date.now()}-${index}`, name: row[0] || '', email: row[1] || '', company: row[2] || companies[0], dept: row[3] || '', position: row[4] || '사원', hireOn: row[5] || '2026-01-01', retireOn: row[6] || '2999-01-01', role: 'User', status: row[6] && row[6] !== '2999-01-01' ? '비활성' : '활성', title: '팀원' })).filter((member) => member.name)
      }
      reader.readAsText(file, 'utf-8')
      event.target.value = ''
    }
    return { companies, detail, downloadMembers, fileInput, filter, filtered, form, list, modal, openModal, q, removeMember, saveMember, uploadMembers }
  },
  template: `
    <section class="page admin-page">
      <header class="page-header rooms-header"><div><h1>회원 관리</h1><p>사용자 계정, 계열사, 부서·직급, 입사일과 퇴사일을 관리합니다.</p></div><div class="admin-actions"><input ref="fileInput" type="file" accept=".csv,text/csv" hidden @change="uploadMembers"><button class="secondary-button" @click="fileInput.click()">엑셀 업로드</button><button class="secondary-button" @click="downloadMembers">엑셀 다운로드</button><button class="primary-button" @click="openModal()">회원 추가</button></div></header>
      <div class="card admin-toolbar"><input v-model="q" placeholder="이름, 이메일, 계열사, 부서 검색"><div class="toolbar"><button v-for="item in ['전체','재직','퇴직']" :key="item" class="chip" :class="{ active: filter === item }" @click="filter = item">{{ item }}</button></div></div>
      <div class="table-card admin-data-table"><table><thead><tr><th>이름</th><th>이메일</th><th>계열사</th><th>부서</th><th>직급</th><th>입사일</th><th>퇴사일</th><th>액션</th></tr></thead><tbody><tr v-for="member in filtered" :key="member.id" @click="detail = member"><td><span class="table-avatar">{{ member.name[0] }}</span>{{ member.name }}</td><td>{{ member.email }}</td><td>{{ member.company }}</td><td>{{ member.dept }}</td><td>{{ member.position }}</td><td>{{ member.hireOn }}</td><td><span :class="['badge', member.retireOn === '2999-01-01' ? 'success' : 'warning']">{{ member.retireOn === '2999-01-01' ? '활성' : '비활성' }}</span> {{ member.retireOn }}</td><td><button class="icon-text" @click.stop="openModal(member)">수정</button><button class="icon-text danger-text" @click.stop="removeMember(member.id)">삭제</button></td></tr></tbody></table></div>
      <div v-if="modal" class="modal-backdrop" @click.self="modal = false"><article class="card write-modal admin-modal"><header><h2>{{ form.id ? '회원 정보 수정' : '회원 추가' }}</h2><button @click="modal = false">닫기</button></header><form class="form-grid" @submit.prevent="saveMember"><label>이름<input v-model="form.name" required></label><label>이메일<div class="email-input"><input v-model="form.emailLocal" placeholder="user"><span>@meetbowl.co</span></div></label><label>계열사<select v-model="form.company"><option v-for="company in companies" :key="company">{{ company }}</option></select></label><div class="form-row two"><label>부서<input v-model="form.dept"></label><label>직급<select v-model="form.position"><option v-for="rank in ['사원','선임','책임','수석','팀장','이사']" :key="rank">{{ rank }}</option></select></label></div><div class="form-row two"><label>입사일<input type="date" v-model="form.hireOn"></label><label>퇴사일<input type="date" v-model="form.retireOn"></label></div><label>권한<select v-model="form.role"><option>User</option><option>Admin</option></select></label><div class="modal-actions"><button type="button" class="secondary-button" @click="modal = false">취소</button><button class="primary-button">저장</button></div></form></article></div>
      <div v-if="detail" class="modal-backdrop" @click.self="detail = null"><article class="card write-modal detail-modal"><header><div><h2>{{ detail.name }}</h2><p>{{ detail.dept }} · {{ detail.position }}</p></div><button @click="detail = null">닫기</button></header><dl class="detail-list"><div><dt>이메일</dt><dd>{{ detail.email }}</dd></div><div><dt>계열사</dt><dd>{{ detail.company }}</dd></div><div><dt>입사일</dt><dd>{{ detail.hireOn }}</dd></div><div><dt>퇴사일</dt><dd>{{ detail.retireOn }}</dd></div></dl><div class="modal-actions"><button class="secondary-button" @click="openModal(detail); detail = null">정보 수정</button></div></article></div>
    </section>
  `,
})

export const OrganizationPage = defineComponent({
  setup() {
    const tab = ref('dept')
    const depts = ref([...initialDepts])
    const ranks = ref([...initialRanks])
    const titles = ref([...initialTitles])
    const editing = ref(null)
    const form = ref({ name: '', count: 0, order: 1 })
    const rows = computed(() => tab.value === 'dept' ? depts.value : tab.value === 'rank' ? ranks.value : titles.value)
    function openEdit(row = null) {
      editing.value = row
      form.value = row ? { ...row } : { name: '', count: 0, order: rows.value.length + 1 }
    }
    function saveItem() {
      const target = tab.value === 'dept' ? depts : tab.value === 'rank' ? ranks : titles
      if (editing.value) target.value = target.value.map((item) => item.id === editing.value.id ? { ...item, ...form.value } : item)
      else target.value.push({ id: `${tab.value}-${Date.now()}`, ...form.value, children: tab.value === 'dept' ? [] : undefined })
      editing.value = null
    }
    function removeItem(id) {
      const target = tab.value === 'dept' ? depts : tab.value === 'rank' ? ranks : titles
      target.value = target.value.filter((item) => item.id !== id)
    }
    return { depts, editing, form, members, openEdit, ranks, removeItem, rows, saveItem, tab, titles }
  },
  template: `
    <section class="page admin-page">
      <header class="page-header rooms-header"><div><h1>조직/직급 관리</h1><p>부서, 직급, 직책을 분리해 관리하고 조직도를 확인합니다.</p></div><button class="primary-button" @click="openEdit()">{{ tab === 'dept' ? '부서 추가' : tab === 'rank' ? '직급 추가' : '직책 추가' }}</button></header>
      <div class="admin-tabs"><button v-for="item in [{key:'dept',label:'조직 관리'},{key:'rank',label:'직급 관리'},{key:'title',label:'직책 관리'}]" :key="item.key" :class="{ active: tab === item.key }" @click="tab = item.key">{{ item.label }}</button></div>
      <div v-if="tab === 'dept'" class="admin-org-layout">
        <article class="card admin-org-tree"><h2>Meetbowl</h2><div v-for="dept in depts" :key="dept.id" class="org-node"><strong>{{ dept.name }}</strong><span>{{ dept.count }}명</span><p v-if="dept.children?.length">{{ dept.children.join(' · ') }}</p></div></article>
        <article class="card admin-org-members"><h2>조직도</h2><div v-for="dept in depts" :key="dept.id" class="org-member-group"><strong>{{ dept.name }}</strong><span v-for="member in members.filter((item) => item.dept === dept.name || dept.children?.includes(item.dept))" :key="member.id">{{ member.name }} · {{ member.position }}</span></div></article>
      </div>
      <div class="table-card admin-data-table"><table><thead><tr><th>이름</th><th v-if="tab === 'rank'">순서</th><th>인원</th><th>액션</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id"><td>{{ row.name }}</td><td v-if="tab === 'rank'">{{ row.order }}</td><td>{{ row.count }}명</td><td><button class="icon-text" @click="openEdit(row)">수정</button><button class="icon-text danger-text" @click="removeItem(row.id)">삭제</button></td></tr></tbody></table></div>
      <div v-if="editing !== null" class="modal-backdrop" @click.self="editing = null"><article class="card write-modal admin-modal"><header><h2>항목 저장</h2><button @click="editing = null">닫기</button></header><form class="form-grid" @submit.prevent="saveItem"><label>이름<input v-model="form.name" required></label><label v-if="tab === 'rank'">순서<input type="number" v-model.number="form.order"></label><label>인원<input type="number" v-model.number="form.count"></label><div class="modal-actions"><button type="button" class="secondary-button" @click="editing = null">취소</button><button class="primary-button">저장</button></div></form></article></div>
    </section>
  `,
})

export const AdminRoomsPage = defineComponent({
  setup() {
    const list = ref(rooms.map((room) => ({ ...room, building: adminSites.find((site) => site.name === room.site)?.building || '본관', active: !room.restricted })))
    const sites = ref([...adminSites])
    const siteFilter = ref('전체')
    const roomModal = ref(false)
    const siteModal = ref(false)
    const editingId = ref('')
    const roomForm = ref({ name: '', site: sites.value[0].name, building: sites.value[0].building, floor: 1, capacity: 6, equipment: 'TV', active: true, restrictReason: '', restrictUntil: '' })
    const siteForm = ref({ name: '', building: '' })
    const filteredRooms = computed(() => siteFilter.value === '전체' ? list.value : list.value.filter((room) => room.site === siteFilter.value))
    function openRoom(room) {
      editingId.value = room?.id || ''
      roomForm.value = room ? { ...room, equipment: room.equipment.join(', ') } : { name: '', site: sites.value[0].name, building: sites.value[0].building, floor: 1, capacity: 6, equipment: 'TV', active: true, restrictReason: '', restrictUntil: '' }
      roomModal.value = true
    }
    function saveRoom() {
      const payload = { ...roomForm.value, floor: Number(roomForm.value.floor), capacity: Number(roomForm.value.capacity), equipment: roomForm.value.equipment.split(',').map((item) => item.trim()).filter(Boolean), restricted: !roomForm.value.active }
      if (editingId.value) list.value = list.value.map((room) => room.id === editingId.value ? { ...room, ...payload } : room)
      else list.value.push({ id: `room-${Date.now()}`, ...payload })
      roomModal.value = false
    }
    function saveSite() {
      sites.value.push({ ...siteForm.value })
      siteForm.value = { name: '', building: '' }
      siteModal.value = false
    }
    return { filteredRooms, list, openRoom, roomForm, roomModal, saveRoom, saveSite, siteFilter, siteForm, siteModal, sites }
  },
  template: `
    <section class="page admin-page">
      <header class="page-header rooms-header"><div><h1>회의실 관리</h1><p>사이트·건물을 등록하고 회의실 운영 상태를 관리합니다.</p></div><div class="admin-actions"><button class="secondary-button" @click="siteModal = true">사이트/건물 추가</button><button class="primary-button" @click="openRoom()">회의실 등록</button></div></header>
      <article class="card admin-site-filter"><strong>사이트 / 건물</strong><div class="toolbar"><button class="chip" :class="{ active: siteFilter === '전체' }" @click="siteFilter = '전체'">전체 ({{ list.length }}실)</button><button v-for="site in sites" :key="site.name" class="chip" :class="{ active: siteFilter === site.name }" @click="siteFilter = siteFilter === site.name ? '전체' : site.name">{{ site.name }} · {{ site.building }} ({{ list.filter((room) => room.site === site.name).length }}실)</button></div></article>
      <div class="table-card admin-data-table"><table><thead><tr><th>회의실</th><th>사이트</th><th>건물</th><th>층</th><th>정원</th><th>장비</th><th>상태</th><th>액션</th></tr></thead><tbody><tr v-for="room in filteredRooms" :key="room.id"><td>{{ room.name }}</td><td>{{ room.site }}</td><td>{{ room.building }}</td><td>{{ room.floor }}F</td><td>{{ room.capacity }}명</td><td>{{ room.equipment.join(', ') }}</td><td><span :class="['badge', room.active ? 'success' : 'warning']">{{ room.active ? '운영 중' : '사용 제한' }}</span><small v-if="!room.active">{{ room.restrictReason }} {{ room.restrictUntil }}</small></td><td><button class="icon-text" @click="openRoom(room)">수정</button></td></tr></tbody></table></div>
      <div v-if="roomModal" class="modal-backdrop" @click.self="roomModal = false"><article class="card write-modal admin-modal"><header><h2>회의실 정보</h2><button @click="roomModal = false">닫기</button></header><form class="form-grid" @submit.prevent="saveRoom"><label>회의실 이름<input v-model="roomForm.name" required></label><div class="form-row two"><label>사이트<select v-model="roomForm.site"><option v-for="site in sites" :key="site.name">{{ site.name }}</option></select></label><label>건물<input v-model="roomForm.building"></label></div><div class="form-row two"><label>층<input type="number" v-model.number="roomForm.floor"></label><label>정원<input type="number" v-model.number="roomForm.capacity"></label></div><label>장비<input v-model="roomForm.equipment" placeholder="TV, 화상회의"></label><label class="settings-toggle-row"><span>운영 중</span><input type="checkbox" v-model="roomForm.active"></label><div v-if="!roomForm.active" class="admin-warning-box"><label>제한 종료 일시<input v-model="roomForm.restrictUntil" placeholder="2026-06-15 18:00"></label><label>제한 사유<textarea v-model="roomForm.restrictReason" rows="2"></textarea></label></div><div class="modal-actions"><button type="button" class="secondary-button" @click="roomModal = false">취소</button><button class="primary-button">저장</button></div></form></article></div>
      <div v-if="siteModal" class="modal-backdrop" @click.self="siteModal = false"><article class="card write-modal admin-modal"><header><h2>사이트 / 건물 추가</h2><button @click="siteModal = false">닫기</button></header><form class="form-grid" @submit.prevent="saveSite"><label>사이트<input v-model="siteForm.name" required placeholder="예: 판교"></label><label>건물<input v-model="siteForm.building" required placeholder="예: 본관"></label><div class="modal-actions"><button type="button" class="secondary-button" @click="siteModal = false">취소</button><button class="primary-button">추가</button></div></form></article></div>
    </section>
  `,
})

export const AdminReservationsPage = defineComponent({
  setup() {
    const list = ref(todayReservations.map((reservation) => ({ ...reservation, date: todayDate })))
    const site = ref('전체')
    const status = ref('전체')
    const selected = ref(null)
    const filtered = computed(() => list.value.filter((reservation) => {
      const room = rooms.find((item) => item.id === reservation.roomId)
      const siteMatch = site.value === '전체' || room?.site === site.value
      const statusMatch = status.value === '전체' || reservation.status === status.value
      return siteMatch && statusMatch
    }))
    function cancel(id) {
      list.value = list.value.filter((reservation) => reservation.id !== id)
      selected.value = null
    }
    return { cancel, filtered, list, rooms, selected, site, sites: ['전체', ...new Set(rooms.map((room) => room.site))], status, statusLabel }
  },
  template: `
    <section class="page admin-page">
      <header class="page-header"><h1>예약 현황 관리</h1><p>전사 회의실 예약을 조회하고 필요 시 강제 취소합니다.</p></header>
      <div class="card admin-toolbar"><div class="toolbar"><button v-for="item in sites" :key="item" class="chip" :class="{ active: site === item }" @click="site = item">{{ item }}</button></div><div class="toolbar"><button v-for="item in ['전체','mine','booked']" :key="item" class="chip" :class="{ active: status === item }" @click="status = item">{{ item === '전체' ? '전체 상태' : statusLabel[item] }}</button></div></div>
      <div class="table-card admin-data-table"><table><thead><tr><th>회의 제목</th><th>주최자</th><th>회의실</th><th>날짜</th><th>시간</th><th>상태</th><th>액션</th></tr></thead><tbody><tr v-for="item in filtered" :key="item.id" @click="selected = item"><td>{{ item.title }}</td><td>{{ item.owner }}</td><td>{{ rooms.find((room) => room.id === item.roomId)?.name }}</td><td>{{ item.date }}</td><td>{{ item.start }}-{{ item.end }}</td><td><span :class="['badge', item.status === 'mine' ? 'primary' : 'navy']">{{ statusLabel[item.status] }}</span></td><td><button class="icon-text danger-text" @click.stop="cancel(item.id)">강제 취소</button></td></tr></tbody></table></div>
      <div v-if="selected" class="modal-backdrop" @click.self="selected = null"><article class="card write-modal detail-modal"><header><div><h2>{{ selected.title }}</h2><p>{{ selected.start }}-{{ selected.end }} · {{ rooms.find((room) => room.id === selected.roomId)?.name }}</p></div><button @click="selected = null">닫기</button></header><dl class="detail-list"><div><dt>주최자</dt><dd>{{ selected.owner }}</dd></div><div><dt>참석자</dt><dd>{{ selected.attendees.join(', ') || '-' }}</dd></div><div><dt>상태</dt><dd>{{ statusLabel[selected.status] }}</dd></div><div><dt>회의실</dt><dd>{{ rooms.find((room) => room.id === selected.roomId)?.site }}</dd></div></dl><div class="modal-actions"><button class="danger-button" @click="cancel(selected.id)">강제 취소</button></div></article></div>
    </section>
  `,
})

export const AdminLogsPage = defineComponent({
  setup() {
    const area = ref('전체')
    const q = ref('')
    const areas = ['전체', ...new Set(adminLogs.map((log) => log.area))]
    const filtered = computed(() => adminLogs.filter((log) => (area.value === '전체' || log.area === area.value) && (!q.value || `${log.actor} ${log.action} ${log.target} ${log.ip}`.toLowerCase().includes(q.value.toLowerCase()))))
    return { area, areas, filtered, q }
  },
  template: `<section class="page admin-page"><header class="page-header"><h1>관리자 작업 로그</h1><p>권한 변경, 정책 변경, 회의실 변경 이력을 확인합니다.</p></header><div class="card admin-toolbar"><input v-model="q" placeholder="작업자, 작업, 대상, IP 검색"><div class="toolbar"><button v-for="item in areas" :key="item" class="chip" :class="{ active: area === item }" @click="area = item">{{ item }}</button></div></div><div class="table-card admin-data-table"><table><thead><tr><th>시간</th><th>작업자</th><th>영역</th><th>작업</th><th>대상</th><th>결과</th><th>IP</th></tr></thead><tbody><tr v-for="log in filtered" :key="log.id"><td>{{ log.time }}</td><td>{{ log.actor }}</td><td>{{ log.area }}</td><td>{{ log.action }}</td><td>{{ log.target }}</td><td><span class="badge success">{{ log.result }}</span></td><td>{{ log.ip }}</td></tr></tbody></table></div></section>`,
})

export const PolicyPage = defineComponent({
  props: ['title', 'description', 'kind'],
  setup(props) {
    const policy = ref(props.kind === 'mail'
      ? { retainDays: 90, trashDays: 14, backupDays: 180, reviewHours: 24, autoShare: true, guestAccess: false }
      : { retainDays: 60, trashDays: 14, backupDays: 90, reviewHours: 24, autoShare: false, guestAccess: false })
    const saved = ref(false)
    function save() {
      saved.value = true
      setTimeout(() => { saved.value = false }, 1800)
    }
    return { policy, save, saved }
  },
  template: `
    <section class="page admin-page settings-page">
      <header class="page-header"><h1>{{ title }}</h1><p>{{ description }}</p></header>
      <article class="card settings-card"><div class="settings-card-head"><h2>보관 정책</h2><button class="primary-button small" @click="save">저장</button></div><div class="settings-form-grid"><label>기본 보관 기간<input type="number" v-model.number="policy.retainDays"></label><label>휴지통 보관 기간<input type="number" v-model.number="policy.trashDays"></label><label>백업 문서 보관 기간<input type="number" v-model.number="policy.backupDays"></label><label>검토 지연 알림<input type="number" v-model.number="policy.reviewHours"></label></div><p v-if="saved" class="settings-success">정책을 저장했습니다.</p></article>
      <article class="card settings-card"><h2>알림 / 권한 기준</h2><label class="settings-toggle-row"><span>검토 완료 시 자동 공유 메일 발송</span><input type="checkbox" v-model="policy.autoShare"></label><label class="settings-toggle-row"><span>게스트 외부 접근 허용</span><input type="checkbox" v-model="policy.guestAccess"></label><div class="settings-alert">Master 권한은 일반 Admin이 변경할 수 없으며, 정책 변경 이력은 관리자 작업 로그에 남깁니다.</div></article>
    </section>
  `,
})

export const JoinPage = defineComponent({
  setup() {
    const name = ref('')
    const joined = ref(false)
    return { name, joined }
  },
  template: `<section v-if="!joined" class="page narrow"><article class="card lobby-card"><h1>게스트 회의 참여</h1><p>초대받은 회의에 게스트로 입장합니다.</p><label>표시 이름<input v-model="name" placeholder="이름"></label><button class="primary-button" @click="joined = true">입장</button></article></section><section v-else class="meeting-room guest"><div class="meeting-main"><header><strong>게스트 회의</strong><span>초대 코드 입장</span></header><div class="video-grid"><div class="video-tile"><span>{{ (name || '게')[0] }}</span><em>{{ name || '게스트' }}</em></div></div><footer><button class="danger-button" @click="joined = false">회의 나가기</button></footer></div></section>`,
})
