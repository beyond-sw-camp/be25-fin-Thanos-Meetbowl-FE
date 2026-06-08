import { computed, defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
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
    const site = ref('전체')
    const sites = ['전체', ...new Set(rooms.map((room) => room.site))]
    const filteredRooms = computed(() => site.value === '전체' ? rooms : rooms.filter((room) => room.site === site.value))
    return { site, sites, rooms: filteredRooms, todayReservations, statusLabel }
  },
  template: `
    <section class="page">
      <header class="page-header"><h1>회의실 예약</h1><p>지점과 수용 인원, 장비를 확인하고 오늘 예약 현황을 함께 봅니다.</p></header>
      <div class="toolbar"><button v-for="item in sites" :key="item" class="chip" :class="{ active: site === item }" @click="site = item">{{ item }}</button></div>
      <div class="room-grid">
        <article v-for="room in rooms" :key="room.id" class="card">
          <div class="room-title"><h2>{{ room.name }}</h2><span :class="['badge', room.restricted ? 'danger' : 'success']">{{ room.restricted ? '사용 제한' : '예약 가능' }}</span></div>
          <p>{{ room.site }} · {{ room.floor }}층 · {{ room.capacity }}명</p>
          <div class="tag-row"><span v-for="item in room.equipment" :key="item">{{ item }}</span></div>
          <p v-if="room.restricted" class="warning-text">{{ room.restrictReason }} · {{ room.restrictUntil }}</p>
          <h3>오늘 예약</h3>
          <ul class="compact-list">
            <li v-for="res in todayReservations.filter((r) => r.roomId === room.id)" :key="res.id">
              <strong>{{ res.start }}-{{ res.end }} {{ res.title }}</strong><span>{{ res.owner }} · {{ statusLabel[res.status] }}</span>
            </li>
            <li v-if="!todayReservations.some((r) => r.roomId === room.id)"><span>예약 없음</span></li>
          </ul>
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
    const filter = ref('all')
    const filtered = computed(() => filter.value === 'all' ? myMeetings : myMeetings.filter((meeting) => meeting.status === filter.value))
    return { filter, filtered, statusLabel }
  },
  template: `
    <section class="page">
      <header class="page-header"><h1>내 회의 목록</h1><p>참여 예정, 진행 중, 종료된 회의를 상태별로 확인합니다.</p></header>
      <div class="toolbar"><button v-for="item in ['all','live','upcoming','ended']" :key="item" class="chip" :class="{ active: filter === item }" @click="filter = item">{{ item === 'all' ? '전체' : statusLabel[item] }}</button></div>
      <div class="card-list"><article v-for="meeting in filtered" :key="meeting.id" class="card row-card"><div><h2>{{ meeting.title }}</h2><p>{{ meeting.start }} · {{ meeting.room }}</p><p>참석자 {{ meeting.attendees.join(', ') }}</p></div><div class="row-actions"><span :class="['badge', meeting.status === 'live' ? 'danger' : 'primary']">{{ statusLabel[meeting.status] }}</span><RouterLink v-if="meeting.status === 'live'" to="/app/meeting" class="primary-button small">입장</RouterLink></div></article></div>
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
    const category = ref('inbox')
    const currentId = ref(mails[0].id)
    const categories = [{ key: 'inbox', label: '받은메일' }, { key: 'sent', label: '보낸메일' }, { key: 'backup', label: '백업' }, { key: 'notice', label: '공지' }]
    const filtered = computed(() => mails.filter((mail) => mail.category === category.value))
    const selected = computed(() => mails.find((mail) => mail.id === currentId.value) || filtered.value[0] || mails[0])
    return { category, currentId, categories, filtered, selected }
  },
  template: `
    <section class="page">
      <header class="page-header"><h1>메일</h1><p>회의록 공유, 공지, 내부 메일을 확인합니다.</p></header>
      <div class="mail-layout"><aside class="card mail-nav"><button v-for="item in categories" :key="item.key" class="nav-like" :class="{ active: category === item.key }" @click="category = item.key; currentId = filtered[0]?.id || currentId">{{ item.label }}</button></aside>
      <div class="card mail-list"><button v-for="mail in filtered" :key="mail.id" :class="{ selected: currentId === mail.id }" @click="currentId = mail.id"><strong>{{ mail.subject }}</strong><span>{{ mail.from }} · {{ mail.date }}</span><p>{{ mail.preview }}</p></button></div>
      <article class="card mail-detail"><h2>{{ selected.subject }}</h2><p>{{ selected.from }} · {{ selected.dept }} · {{ selected.date }}</p><pre>{{ selected.body }}</pre></article></div>
    </section>
  `,
})

export const RecordingsPage = defineComponent({
  setup: () => ({ recordings, reviewMeta }),
  template: `
    <section class="page">
      <header class="page-header"><h1>내 회의록</h1><p>AI 초안 생성, 검토, 공유 상태를 확인합니다.</p></header>
      <div class="card-list"><article v-for="item in recordings" :key="item.id" class="card row-card"><div><h2>{{ item.title }}</h2><p>{{ item.date }} · {{ item.duration }} · 참석 {{ item.attendees }}명</p><p>{{ item.summary }}</p></div><div class="row-actions"><span :class="['badge', reviewMeta[item.reviewStatus].tone]">{{ reviewMeta[item.reviewStatus].label }}</span><small>검토자 {{ item.reviewer }}</small></div></article></div>
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
  setup: () => ({ docs: workspaceDocs.slice().reverse(), meta: page('공유 워크스페이스', '팀에서 함께 검토하는 회의록과 문서를 확인합니다.') }),
  template: `<WorkspaceList :docs="docs" :title="meta.title" :description="meta.description" />`,
  components: { WorkspaceList },
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

export const AdminDashboardPage = defineComponent({
  setup: () => ({ rooms, members, recordings, adminLogs }),
  template: `<section class="page"><header class="page-header"><h1>관리자 대시보드</h1><p>회원, 회의실, 정책, 작업 로그 상태를 한 화면에서 확인합니다.</p></header><div class="metric-grid"><div class="metric-card"><span>회원</span><strong>{{ members.length }}</strong></div><div class="metric-card"><span>회의실</span><strong>{{ rooms.length }}</strong></div><div class="metric-card"><span>회의록</span><strong>{{ recordings.length }}</strong></div><div class="metric-card"><span>작업 로그</span><strong>{{ adminLogs.length }}</strong></div></div><div class="card-list"><article v-for="log in adminLogs.slice(0, 3)" :key="log.id" class="card row-card"><div><h2>{{ log.action }}</h2><p>{{ log.time }} · {{ log.actor }} · {{ log.area }}</p></div><span class="badge success">{{ log.result }}</span></article></div></section>`,
})

export const MembersPage = defineComponent({
  setup: () => ({ members, companies }),
  template: `<section class="page"><header class="page-header"><h1>회원 관리</h1><p>계열사, 부서, 직급, 권한과 활성 상태를 관리합니다.</p></header><div class="toolbar"><span v-for="company in companies" :key="company" class="chip">{{ company }}</span></div><div class="table-card"><table><thead><tr><th>이름</th><th>이메일</th><th>소속</th><th>직급</th><th>권한</th><th>상태</th></tr></thead><tbody><tr v-for="member in members" :key="member.id"><td>{{ member.name }}</td><td>{{ member.email }}</td><td>{{ member.company }} · {{ member.dept }}</td><td>{{ member.position }} · {{ member.title }}</td><td><span class="badge primary">{{ member.role }}</span></td><td>{{ member.status }}</td></tr></tbody></table></div></section>`,
})

export const OrganizationPage = defineComponent({
  setup: () => ({ companies, members }),
  template: `<section class="page"><header class="page-header"><h1>조직/직급 관리</h1><p>계열사별 조직과 직급 체계를 확인합니다.</p></header><div class="doc-grid"><article v-for="company in companies" :key="company" class="card"><h2>{{ company }}</h2><p>{{ members.filter((member) => member.company === company).length }}명 등록</p><ul class="compact-list"><li v-for="member in members.filter((m) => m.company === company)" :key="member.id"><strong>{{ member.name }}</strong><span>{{ member.dept }} · {{ member.position }}</span></li></ul></article></div></section>`,
})

export const AdminRoomsPage = defineComponent({
  setup: () => ({ rooms }),
  template: `<section class="page"><header class="page-header"><h1>회의실 관리</h1><p>회의실 수용 인원, 장비, 사용 제한 상태를 관리합니다.</p></header><div class="table-card"><table><thead><tr><th>회의실</th><th>지점</th><th>층</th><th>수용</th><th>장비</th><th>상태</th></tr></thead><tbody><tr v-for="room in rooms" :key="room.id"><td>{{ room.name }}</td><td>{{ room.site }}</td><td>{{ room.floor }}층</td><td>{{ room.capacity }}명</td><td>{{ room.equipment.join(', ') }}</td><td><span :class="['badge', room.restricted ? 'danger' : 'success']">{{ room.restricted ? room.restrictReason : '사용 가능' }}</span></td></tr></tbody></table></div></section>`,
})

export const AdminLogsPage = defineComponent({
  setup: () => ({ adminLogs }),
  template: `<section class="page embedded"><header class="page-header"><h1>관리자 작업 로그</h1><p>권한 변경, 정책 변경, 회의실 변경 이력을 확인합니다.</p></header><div class="table-card"><table><thead><tr><th>시간</th><th>작업자</th><th>영역</th><th>작업</th><th>대상</th><th>IP</th></tr></thead><tbody><tr v-for="log in adminLogs" :key="log.id"><td>{{ log.time }}</td><td>{{ log.actor }}</td><td>{{ log.area }}</td><td>{{ log.action }}</td><td>{{ log.target }}</td><td>{{ log.ip }}</td></tr></tbody></table></div></section>`,
})

export const PolicyPage = defineComponent({
  props: ['title', 'description'],
  template: `<section class="page"><header class="page-header"><h1>{{ title }}</h1><p>{{ description }}</p></header><div class="doc-grid"><article class="card"><h2>기본 보관 기간</h2><p>회의록 60일, 휴지통 14일, 백업 문서 90일</p></article><article class="card"><h2>자동 알림</h2><p>검토 지연 24시간 후 재알림, 공유 승인 완료 시 메일 알림</p></article><article class="card"><h2>권한 기준</h2><p>Master 권한은 일반 Admin이 변경할 수 없습니다.</p></article></div></section>`,
})

export const JoinPage = defineComponent({
  setup() {
    const name = ref('')
    const joined = ref(false)
    return { name, joined }
  },
  template: `<section v-if="!joined" class="page narrow"><article class="card lobby-card"><h1>게스트 회의 참여</h1><p>초대받은 회의에 게스트로 입장합니다.</p><label>표시 이름<input v-model="name" placeholder="이름"></label><button class="primary-button" @click="joined = true">입장</button></article></section><section v-else class="meeting-room guest"><div class="meeting-main"><header><strong>게스트 회의</strong><span>초대 코드 입장</span></header><div class="video-grid"><div class="video-tile"><span>{{ (name || '게')[0] }}</span><em>{{ name || '게스트' }}</em></div></div><footer><button class="danger-button" @click="joined = false">회의 나가기</button></footer></div></section>`,
})
