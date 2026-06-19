<template>
  <section class="page workspace-page">
    <header class="page-header">
      <h1>개인 워크스페이스</h1>
      <p>개인 일정, 메모, 백업 자료와 드라이브 파일을 관리합니다.</p>
    </header>

    <nav class="workspace-tabs">
      <button v-for="item in tabs" :key="item.id" type="button" :class="{ active: activeTab === item.id }" @click="activeTab = item.id">
        <component :is="item.icon" :size="15" />
        {{ item.label }}
      </button>
    </nav>

    <div v-if="errorMessage" class="error-box">{{ errorMessage }}</div>

    <div v-if="activeTab === 'calendar'" class="workspace-calendar-grid">
      <article class="card workspace-calendar-card">
        <div class="workspace-calendar-toolbar">
          <div class="workspace-month">
            <button type="button" class="workspace-month-button">{{ cursor.getFullYear() }}년 {{ monthNames[cursor.getMonth()] }}</button>
            <div class="workspace-prev-next">
              <button type="button" @click="moveMonth(-1)">‹</button>
              <button type="button" @click="goToday">오늘</button>
              <button type="button" @click="moveMonth(1)">›</button>
            </div>
          </div>
          <div class="workspace-calendar-actions">
            <div class="segmented">
              <button type="button" :class="{ active: filter === 'all' }" @click="filter = 'all'">전체</button>
              <button type="button" :class="{ active: filter === 'PERSONAL' }" @click="filter = 'PERSONAL'">내 일정</button>
              <button type="button" :class="{ active: filter === 'MEETING' }" @click="filter = 'MEETING'">회의</button>
            </div>
            <button type="button" class="primary-button small" @click="openEventForm()"><Plus :size="14" /> 일정 추가</button>
          </div>
        </div>

        <div class="calendar-week-row">
          <div v-for="(week, index) in weekNames" :key="week" :class="{ sun: index === 0, sat: index === 6 }">{{ week }}</div>
        </div>
        <div class="calendar-grid">
          <button v-for="cell in cells" :key="cell.key" type="button" class="calendar-cell" :class="{ muted: !cell.inMonth, today: cell.key === todayKey, selected: selected === cell.key, sun: cell.weekday === 0, sat: cell.weekday === 6 }" @click="selected = cell.key">
            <div class="calendar-date-row">
              <span>{{ cell.day }}</span>
              <small v-if="eventsByDate[cell.key]?.length">{{ eventsByDate[cell.key].length }}</small>
            </div>
            <div class="calendar-event-stack">
              <span v-for="event in (eventsByDate[cell.key] || []).slice(0, 3)" :key="event.eventId" :class="['calendar-event-pill', event.source === 'MEETING' ? 'team' : 'mine']">
                {{ event.timeLabel }} {{ event.title }}
              </span>
              <em v-if="(eventsByDate[cell.key] || []).length > 3">+{{ eventsByDate[cell.key].length - 3 }}건</em>
            </div>
          </button>
        </div>
      </article>

      <aside class="card workspace-day-card">
        <div class="workspace-day-head">
          <div><small>선택한 날짜</small><strong>{{ selected }}</strong></div>
          <span class="badge primary">{{ selectedEvents.length }}건</span>
        </div>
        <div class="workspace-event-list">
          <div v-for="event in selectedEvents" :key="event.eventId" :class="['workspace-event-item', event.source === 'MEETING' ? 'team' : 'mine']">
            <div>
              <strong>{{ event.title }}</strong>
              <span>{{ event.timeRange }} <template v-if="event.description">· {{ event.description }}</template></span>
            </div>
            <span :class="['badge', event.source === 'MEETING' ? 'navy' : 'primary']">{{ event.source === 'MEETING' ? '회의' : '개인' }}</span>
          </div>
          <div v-if="selectedEvents.length === 0" class="empty-state">예정된 일정이 없습니다.</div>
        </div>

        <div class="workspace-colleagues">
          <div class="workspace-colleague-title"><strong>동료 일정 구독</strong><small>{{ subscriptions.length }}명</small></div>
          <div v-for="subscription in subscriptions" :key="subscription.subscriptionId" class="workspace-colleague-wrap">
            <div class="workspace-colleague-row">
              <span class="workspace-check">✓</span>
              <span>{{ userName(subscription.targetUserId) }}</span>
              <button type="button" class="danger-text" @click.stop="removeSubscription(subscription.subscriptionId)">해제</button>
            </div>
          </div>
          <button type="button" class="dashed-button" @click="subscriptionOpen = true">동료 구독 추가</button>
        </div>
      </aside>
    </div>

    <div v-else-if="activeTab === 'memo'" class="workspace-memo-grid">
      <aside class="card workspace-memo-list">
        <div class="workspace-panel-head"><h2>최근 메모</h2><button type="button" @click="createNewMemo"><Plus :size="14" /></button></div>
        <button v-for="memo in memos" :key="memo.memoId" type="button" class="workspace-memo-item" :class="{ active: activeMemoId === memo.memoId }" @click="selectMemo(memo.memoId)">
          <strong>{{ memo.title }}</strong>
          <span>{{ memo.content.split('\n')[0] || '내용 없음' }}</span>
          <small>{{ displayDate(memo.updatedAt || memo.createdAt) }}</small>
        </button>
      </aside>
      <article class="card workspace-memo-editor">
        <template v-if="memoDraft.memoId">
          <div class="workspace-memo-title-row">
            <input v-model="memoDraft.title" @change="saveActiveMemo">
            <button type="button" class="danger-text" @click="deleteActiveMemo">삭제</button>
          </div>
          <textarea v-model="memoDraft.content" placeholder="메모를 작성하세요..." @change="saveActiveMemo"></textarea>
          <small>최근 수정: {{ displayDate(activeMemo?.updatedAt || activeMemo?.createdAt) }}</small>
        </template>
        <div v-else class="empty-state">메모를 선택하거나 새로 만들어 보세요.</div>
      </article>
    </div>

    <article v-else-if="activeTab === 'backups'" class="card workspace-panel">
      <div class="workspace-panel-head">
        <h2>백업 자료</h2>
        <input v-model="backupKeyword" placeholder="백업 자료 검색">
      </div>
      <div v-for="backup in backups" :key="backup.backupId" class="workspace-mail-row">
        <RouterLink :to="'/app/backup/' + backup.backupId">
          <strong>{{ backup.title }}</strong>
          <small>{{ backup.sourceType }} · {{ displayDate(backup.backedUpAt) }} · {{ backup.summary }}</small>
        </RouterLink>
        <button type="button" @click="toggleBookmark(backup)">{{ backup.bookmarked ? '북마크 해제' : '북마크' }}</button>
      </div>
      <div v-if="backups.length === 0" class="empty-state">백업 자료가 없습니다.</div>
    </article>

    <article v-else-if="activeTab === 'minutes'" class="card workspace-panel workspace-minutes-panel">
      <div class="workspace-panel-head">
        <h2>즐겨찾기 회의록</h2>
        <span class="badge primary">{{ favoriteMinuteItems.length }}건</span>
      </div>
      <div v-for="minute in favoriteMinuteItems" :key="minute.id" class="workspace-minute-row">
        <RouterLink to="/app/minutes">
          <span class="workspace-file-icon minutes"><FileText :size="17" /></span>
          <span>
            <strong>{{ minute.title }}</strong>
            <small>{{ minute.date }} · {{ minute.duration }} · 참석 {{ minute.attendees }}명 · 검토자 {{ minute.reviewer }}</small>
          </span>
        </RouterLink>
        <button type="button" title="즐겨찾기 해제" @click="removeFavoriteMinute(minute.id)"><BookmarkCheck :size="16" /> 해제</button>
      </div>
      <div v-if="favoriteMinuteItems.length === 0" class="empty-state">내 회의록에서 별표를 누르면 이곳에 표시됩니다.</div>
    </article>

    <article v-else class="card workspace-panel">
      <div class="workspace-panel-head">
        <h2>개인 드라이브</h2>
        <button type="button" @click="driveInput?.click()"><Upload :size="14" /> 업로드</button>
      </div>
      <input ref="driveInput" class="hidden-file-input" type="file" @change="uploadPersonalFile">
      <button type="button" class="workspace-upload-zone" @click="driveInput?.click()">
        <strong>파일을 선택해 업로드</strong>
        <span>원본은 Object Storage에 저장되고 DB에는 메타데이터만 저장됩니다.</span>
      </button>
      <div class="table-card">
        <table>
          <thead><tr><th>파일명</th><th>크기</th><th>업로드</th><th>관리</th></tr></thead>
          <tbody>
            <tr v-for="file in driveFiles" :key="file.fileId">
              <td>{{ file.originalFileName }}</td>
              <td>{{ formatSize(file.sizeBytes) }}</td>
              <td>{{ displayDate(file.uploadedAt) }}</td>
              <td><button type="button" class="danger-text" @click="removeDriveFile(file.fileId)">삭제</button></td>
            </tr>
            <tr v-if="driveFiles.length === 0"><td colspan="4"><div class="empty-state">업로드한 파일이 없습니다.</div></td></tr>
          </tbody>
        </table>
      </div>
    </article>

    <div v-if="eventOpen" class="modal-backdrop" @click="eventOpen = false">
      <form class="write-modal" @submit.prevent="saveEvent" @click.stop>
        <header><h2>일정 추가</h2><button type="button" @click="eventOpen = false">닫기</button></header>
        <input v-model="eventDraft.title" placeholder="일정 제목">
        <div class="workspace-event-form-grid">
          <input v-model="eventDraft.date" type="date">
          <input v-model="eventDraft.start" type="time">
          <input v-model="eventDraft.end" type="time">
        </div>
        <textarea v-model="eventDraft.description" rows="3" placeholder="설명"></textarea>
        <footer><button type="button" class="ghost-button" @click="eventOpen = false">취소</button><button type="submit" class="primary-button small">저장</button></footer>
      </form>
    </div>

    <div v-if="subscriptionOpen" class="modal-backdrop" @click="subscriptionOpen = false">
      <form class="write-modal" @submit.prevent="addSubscription" @click.stop>
        <header><h2>동료 구독 추가</h2><button type="button" @click="subscriptionOpen = false">닫기</button></header>
        <input v-model="userKeyword" placeholder="이름, 부서/팀, 이메일 검색">
        <div class="recipient-results">
          <button v-for="user in userCandidates" :key="user.userId" type="button" @click="selectedUserId = user.userId">
            <strong>{{ user.name }}</strong>
            <small>{{ user.department || user.team || '-' }} · {{ user.email }}</small>
          </button>
        </div>
        <footer><button type="button" class="ghost-button" @click="subscriptionOpen = false">취소</button><button type="submit" class="primary-button small" :disabled="!selectedUserId">구독</button></footer>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { BookmarkCheck, CalendarDays, FileText, Folder, Mail, Plus, StickyNote, Upload } from '@lucide/vue'
import {
  addBackupBookmark,
  createMemo,
  createWorkspaceEvent,
  deleteDriveFile,
  deleteMemo,
  getBackups,
  getCalendarSubscriptions,
  getDriveFiles,
  getMemos,
  getWorkspaceCalendar,
  removeBackupBookmark,
  searchBackups,
  subscribeCalendar,
  unsubscribeCalendar,
  updateMemo,
  uploadDriveFile,
} from '../../lib/workspace'
import { getUserSummary, searchUsers } from '../../lib/users'
import { formatKstDateTime, formatKstTime } from '../../utils/dateTime'
import { workspaceDateKey, workspaceMonthCells } from '../../data/workspaceData'
import { minutes as mockMinutes } from '../../data/mockData'
import { onMinuteFavoritesChanged, readMinuteFavorites, toggleMinuteFavorite } from '../../lib/minute-favorites'

const tabs = [
  { id: 'calendar', label: '일정', icon: CalendarDays },
  { id: 'memo', label: '개인 메모장', icon: StickyNote },
  { id: 'minutes', label: '회의록', icon: BookmarkCheck },
  { id: 'backups', label: '백업 자료', icon: Mail },
  { id: 'drive', label: '개인 드라이브', icon: Folder },
]
const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const weekNames = ['일', '월', '화', '수', '목', '금', '토']
const activeTab = ref('calendar')
const cursor = ref(new Date())
const selected = ref(workspaceDateKey(new Date()))
const filter = ref('all')
const events = ref([])
const subscriptions = ref([])
const userMap = ref(new Map())
const memos = ref([])
const activeMemoId = ref('')
const memoDraft = ref({ memoId: '', title: '', content: '' })
const backups = ref([])
const backupKeyword = ref('')
const driveFiles = ref([])
const driveInput = ref(null)
const eventOpen = ref(false)
const subscriptionOpen = ref(false)
const eventDraft = ref({ title: '', date: selected.value, start: '09:00', end: '10:00', description: '' })
const userKeyword = ref('')
const userCandidates = ref([])
const selectedUserId = ref('')
const errorMessage = ref('')
const todayKey = workspaceDateKey(new Date())
const minuteFavorites = ref(readMinuteFavorites())
let stopFavoriteSync = null

const cells = computed(() => workspaceMonthCells(cursor.value.getFullYear(), cursor.value.getMonth()).map((date) => ({
  date,
  key: workspaceDateKey(date),
  day: date.getDate(),
  weekday: date.getDay(),
  inMonth: date.getMonth() === cursor.value.getMonth(),
})))
const visibleEvents = computed(() => events.value.filter((event) => filter.value === 'all' || event.source === filter.value))
const eventsByDate = computed(() => {
  const map = {}
  visibleEvents.value.forEach((event) => {
    const key = workspaceDateKey(new Date(event.startedAt))
    if (!map[key]) map[key] = []
    map[key].push(event)
  })
  return map
})
const selectedEvents = computed(() => (eventsByDate.value[selected.value] || []).slice().sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt))))
const activeMemo = computed(() => memos.value.find((memo) => memo.memoId === activeMemoId.value))
const favoriteMinuteItems = computed(() => mockMinutes.filter((minute) => minuteFavorites.value[minute.id]))

watch(cursor, loadCalendar)
watch(backupKeyword, () => loadBackups())
watch(userKeyword, async () => {
  const data = await searchUsers({ keyword: userKeyword.value, size: 8 }).catch(() => ({ items: [] }))
  userCandidates.value = data.items || []
})

onMounted(async () => {
  stopFavoriteSync = onMinuteFavoritesChanged((next) => {
    minuteFavorites.value = next
  })
  await Promise.all([loadCalendar(), loadSubscriptions(), loadMemos(), loadBackups(), loadDriveFiles()])
})

onUnmounted(() => {
  stopFavoriteSync?.()
})

async function loadCalendar() {
  const from = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1 - new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1).getDay())
  const to = new Date(from)
  to.setDate(from.getDate() + 42)
  events.value = (await getWorkspaceCalendar(from.toISOString(), to.toISOString())).map(normalizeEvent)
}

async function loadSubscriptions() {
  subscriptions.value = await getCalendarSubscriptions()
  await Promise.all(subscriptions.value.map((item) => cacheUser(item.targetUserId)))
}

async function loadMemos() {
  memos.value = await getMemos()
  if (!activeMemoId.value && memos.value[0]) selectMemo(memos.value[0].memoId)
}

async function loadBackups() {
  backups.value = backupKeyword.value.trim() ? await searchBackups(backupKeyword.value.trim()) : await getBackups()
}

async function loadDriveFiles() {
  driveFiles.value = await getDriveFiles()
}

function normalizeEvent(event) {
  return {
    ...event,
    timeLabel: formatKstTime(event.startedAt),
    timeRange: `${formatKstTime(event.startedAt)} - ${formatKstTime(event.endedAt)}`,
  }
}

function moveMonth(offset) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + offset, 1)
}

function goToday() {
  cursor.value = new Date()
  selected.value = todayKey
}

function openEventForm() {
  eventDraft.value = { title: '', date: selected.value, start: '09:00', end: '10:00', description: '' }
  eventOpen.value = true
}

async function saveEvent() {
  await createWorkspaceEvent({
    title: eventDraft.value.title.trim(),
    description: eventDraft.value.description.trim(),
    startedAt: new Date(`${eventDraft.value.date}T${eventDraft.value.start}:00+09:00`).toISOString(),
    endedAt: new Date(`${eventDraft.value.date}T${eventDraft.value.end}:00+09:00`).toISOString(),
    allDay: false,
  })
  eventOpen.value = false
  await loadCalendar()
}

function selectMemo(memoId) {
  activeMemoId.value = memoId
  const memo = memos.value.find((item) => item.memoId === memoId)
  memoDraft.value = memo ? { memoId: memo.memoId, title: memo.title, content: memo.content } : { memoId: '', title: '', content: '' }
}

async function createNewMemo() {
  const memo = await createMemo({ title: '새 메모', content: '내용을 입력하세요.' })
  memos.value.unshift(memo)
  selectMemo(memo.memoId)
}

async function saveActiveMemo() {
  if (!memoDraft.value.memoId || !memoDraft.value.title.trim() || !memoDraft.value.content.trim()) return
  const updated = await updateMemo(memoDraft.value.memoId, {
    title: memoDraft.value.title.trim(),
    content: memoDraft.value.content.trim(),
  })
  memos.value = memos.value.map((memo) => memo.memoId === updated.memoId ? updated : memo)
  selectMemo(updated.memoId)
}

async function deleteActiveMemo() {
  if (!memoDraft.value.memoId) return
  await deleteMemo(memoDraft.value.memoId)
  memos.value = memos.value.filter((memo) => memo.memoId !== memoDraft.value.memoId)
  selectMemo(memos.value[0]?.memoId || '')
}

async function toggleBookmark(backup) {
  if (backup.bookmarked) await removeBackupBookmark(backup.backupId)
  else await addBackupBookmark(backup.backupId)
  await loadBackups()
}

function removeFavoriteMinute(minuteId) {
  minuteFavorites.value = toggleMinuteFavorite(minuteId)
}

async function uploadPersonalFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  await uploadDriveFile(file)
  event.target.value = ''
  await loadDriveFiles()
}

async function removeDriveFile(fileId) {
  await deleteDriveFile(fileId)
  await loadDriveFiles()
}

async function addSubscription() {
  if (!selectedUserId.value) return
  await subscribeCalendar(selectedUserId.value)
  subscriptionOpen.value = false
  selectedUserId.value = ''
  userKeyword.value = ''
  userCandidates.value = []
  await loadSubscriptions()
  await loadCalendar()
}

async function removeSubscription(subscriptionId) {
  await unsubscribeCalendar(subscriptionId)
  await loadSubscriptions()
  await loadCalendar()
}

async function cacheUser(userId) {
  if (userMap.value.has(userId)) return
  const user = await getUserSummary(userId).catch(() => null)
  userMap.value = new Map(userMap.value).set(userId, user)
}

function userName(userId) {
  return userMap.value.get(userId)?.name || userId
}

function displayDate(value) {
  return formatKstDateTime(value)
}

function formatSize(bytes) {
  if (!bytes) return '0B'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
</script>
