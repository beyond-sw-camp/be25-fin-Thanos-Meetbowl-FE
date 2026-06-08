<script>
import { computed, defineComponent, ref } from 'vue'
import {
  colleagueInfo,
  favoriteMinutes,
  initialMemos,
  workspaceBackupMails,
  workspaceDateKey,
  workspaceDriveFiles,
  workspaceEvents,
  workspaceMonthCells,
  workspaceNow,
} from '../../data/workspaceData'

export default defineComponent({
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
      favoriteMinutes,
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
        <div class="workspace-panel-head"><h2>즐겨찾기한 회의록</h2><span>총 {{ favoriteMinutes.length }}건</span></div>
        <RouterLink v-for="item in favoriteMinutes" :key="item.title" to="/app/minutes" class="workspace-file-row">
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
</script>
