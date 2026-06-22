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
          <button v-for="event in selectedEvents" :key="event.eventId" type="button" :class="['workspace-event-item', event.source === 'MEETING' ? 'team' : 'mine']" @click="openSelectedEvent(event)">
            <div>
              <strong>{{ event.title }}</strong>
              <span>{{ event.timeRange }} <template v-if="event.description">· {{ event.description }}</template></span>
            </div>
            <span :class="['badge', event.source === 'MEETING' ? 'navy' : 'primary']">{{ event.source === 'MEETING' ? '회의' : '개인' }}</span>
          </button>
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
        <button v-for="memo in pagedMemos" :key="memo.memoId" type="button" class="workspace-memo-item" :class="{ active: activeMemoId === memo.memoId }" @click="selectMemo(memo.memoId)">
          <strong>{{ memo.title }}</strong>
          <span>{{ memo.content.split('\n')[0] || '내용 없음' }}</span>
          <small>{{ displayDate(memo.updatedAt || memo.createdAt) }}</small>
        </button>
        <Pagination v-model="memoPage" :total-pages="memoTotalPages" />
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
        <h2>백업한 메일</h2>
        <span class="badge primary">총 {{ backups.length }}건</span>
        <input v-model="backupKeyword" placeholder="백업 자료 검색">
      </div>
      <div v-for="backup in backups" :key="backup.backupId" class="workspace-mail-row">
        <RouterLink :to="'/app/backup/' + backup.backupId">
          <span class="workspace-file-icon mail"><Mail :size="17" /></span>
          <span>
          <strong>{{ backup.title }}</strong>
            <small>{{ backup.sourceType }} · {{ displayDate(backup.backedUpAt) }} · {{ backup.summary }}</small>
          </span>
        </RouterLink>
        <button type="button" class="workspace-backup-release" @click="releaseBackup(backup)">해제</button>
      </div>
      <div v-if="backups.length === 0" class="empty-state">백업한 메일이 없습니다.</div>
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
            <tr v-for="file in driveFiles" :key="file.fileId" class="workspace-drive-row" @click="openDrivePreview(file)">
              <td>
                <div class="workspace-drive-file-cell">
                  <span class="workspace-file-icon"><FileText :size="17" /></span>
                  <span><strong>{{ file.originalFileName }}</strong><small>{{ file.contentType || '파일' }}</small></span>
                </div>
              </td>
              <td>{{ formatSize(file.sizeBytes) }}</td>
              <td>{{ displayDate(file.uploadedAt) }}</td>
              <td class="file-action-cell">
                <button type="button" class="more-button" aria-label="파일 관리" @click.stop="toggleDriveActionMenu(file.fileId)"><MoreHorizontal :size="17" /></button>
                <div v-if="driveActionFileId === file.fileId" class="file-action-menu" @click.stop>
                  <button type="button" @click="downloadPersonalFile(file)"><Download :size="14" /> 다운로드</button>
                  <button type="button" @click="openDriveInfo(file)"><Info :size="14" /> 파일 정보</button>
                  <button type="button" class="danger" @click="removeDriveFile(file.fileId)"><Trash2 :size="14" /> 삭제</button>
                </div>
              </td>
            </tr>
            <tr v-if="driveFiles.length === 0"><td colspan="4"><div class="empty-state">업로드한 파일이 없습니다.</div></td></tr>
          </tbody>
        </table>
      </div>
    </article>

    <div v-if="eventOpen" class="modal-backdrop" @click="eventOpen = false">
      <form class="write-modal workspace-event-modal" @submit.prevent="saveEvent" @click.stop>
        <header>
          <div>
            <h2>{{ editingEventId ? '내 일정 수정' : '일정 추가' }}</h2>
            <p>개인 일정으로 등록되며 회의 일정은 회의 수정 화면에서 관리합니다.</p>
          </div>
          <button type="button" @click="eventOpen = false">닫기</button>
        </header>
        <div class="workspace-event-form-body">
          <label>일정 제목<input v-model="eventDraft.title" placeholder="일정 제목" required></label>
          <div class="workspace-event-form-grid">
            <label>날짜<input v-model="eventDraft.date" type="date" required></label>
            <label>시작<input v-model="eventDraft.start" type="time" required></label>
            <label>종료<input v-model="eventDraft.end" type="time" required></label>
          </div>
          <label>설명<textarea v-model="eventDraft.description" rows="3" placeholder="참여자, 안건 등"></textarea></label>
        </div>
        <footer><button type="button" class="ghost-button" @click="eventOpen = false">취소</button><button type="submit" class="primary-button small">{{ editingEventId ? '수정 저장' : '일정 추가' }}</button></footer>
      </form>
    </div>

    <div v-if="subscriptionOpen" class="modal-backdrop" @click="subscriptionOpen = false">
      <form class="write-modal" @submit.prevent="addSubscription" @click.stop>
        <header><h2>동료 구독 추가</h2><button type="button" @click="subscriptionOpen = false">닫기</button></header>
        <div ref="subscriptionSearchRoot" class="recipient-picker">
          <input v-model="userKeyword" placeholder="이름, 부서/팀, 이메일 검색" @focus="openSubscriptionSearch">
          <div v-if="subscriptionSearchOpen && userCandidates.length" class="recipient-results">
          <button v-for="user in userCandidates" :key="user.userId" type="button" :class="{ selected: selectedUserId === user.userId }" @click="selectSubscriptionUser(user)">
            <strong>{{ user.name }}</strong>
            <small>{{ user.department || user.team || '-' }} · {{ user.email }}</small>
          </button>
          </div>
        </div>
        <footer><button type="button" class="ghost-button" @click="subscriptionOpen = false">취소</button><button type="submit" class="primary-button small" :disabled="!selectedUserId">구독</button></footer>
      </form>
    </div>
    <div v-if="drivePreviewOpen" class="modal-backdrop" @click="closeDrivePreview">
      <article class="write-modal file-preview-modal" @click.stop>
        <header>
          <div>
            <h2>{{ drivePreviewFile?.originalFileName }}</h2>
            <p>{{ drivePreviewFile?.contentType || '파일' }} · {{ formatSize(drivePreviewFile?.sizeBytes) }} · {{ displayDate(drivePreviewFile?.uploadedAt) }}</p>
          </div>
          <button type="button" aria-label="닫기" @click="closeDrivePreview"><X :size="17" /></button>
        </header>
        <section class="file-preview-body">
          <div v-if="drivePreviewLoading" class="empty-state">파일을 불러오는 중입니다.</div>
          <div v-else-if="drivePreviewError" class="empty-state">{{ drivePreviewError }}</div>
          <img v-else-if="drivePreviewKind === 'image'" :src="drivePreviewUrl" :alt="drivePreviewFile?.originalFileName">
          <iframe v-else-if="drivePreviewKind === 'pdf'" :src="drivePreviewUrl" title="파일 미리보기"></iframe>
          <pre v-else-if="drivePreviewKind === 'text'">{{ drivePreviewText }}</pre>
          <dl v-else class="file-info-list">
            <div><dt>파일명</dt><dd>{{ drivePreviewFile?.originalFileName }}</dd></div>
            <div><dt>형식</dt><dd>{{ drivePreviewFile?.contentType || '-' }}</dd></div>
            <div><dt>크기</dt><dd>{{ formatSize(drivePreviewFile?.sizeBytes) }}</dd></div>
            <div><dt>업로드</dt><dd>{{ displayDate(drivePreviewFile?.uploadedAt) }}</dd></div>
          </dl>
        </section>
        <footer>
          <button type="button" class="ghost-button" @click="closeDrivePreview">닫기</button>
          <button type="button" class="primary-button small" @click="downloadPersonalFile(drivePreviewFile)"><Download :size="14" /> 다운로드</button>
        </footer>
      </article>
    </div>
    <div class="toast-stack" aria-live="polite">
      <div v-for="toast in toasts" :key="toast.id" class="toast-card">
        <strong>{{ toast.title }}</strong>
        <span>{{ toast.message }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BookmarkCheck, CalendarDays, Download, FileText, Folder, Info, Mail, MoreHorizontal, Plus, StickyNote, Trash2, Upload, X } from '@lucide/vue'
import Pagination from '../../components/common/Pagination.vue'
import {
  createMemo,
  createWorkspaceEvent,
  deleteDriveFile,
  deleteMemo,
  downloadDriveFile,
  getBackups,
  getCalendarSubscriptions,
  getDriveFiles,
  getMemos,
  getWorkspaceCalendar,
  removeBackupBookmark,
  searchBackups,
  subscribeCalendar,
  unsubscribeCalendar,
  updateWorkspaceEvent,
  updateMemo,
  uploadDriveFile,
  previewDriveFile,
} from '../../lib/workspace'
import { previewKind, resolveBlobFileName, saveBlob } from '../../lib/file-actions'
import { getUserSummary, searchUsers } from '../../lib/users'
import { formatKstDateTime, formatKstTime } from '../../utils/dateTime'
import { workspaceDateKey, workspaceMonthCells, workspaceNow } from '../../data/workspaceData'
import { minutes as mockMinutes } from '../../data/mockData'
import {
  fallbackWorkspaceBackups,
  fallbackWorkspaceCalendar,
  fallbackWorkspaceDriveFiles,
  fallbackWorkspaceMemos,
  fallbackUserSearch,
  withFallback,
} from '../../data/mailWorkspaceFallbacks'
import { onMinuteFavoritesChanged, readMinuteFavorites, toggleMinuteFavorite } from '../../lib/minute-favorites'

const router = useRouter()
const tabs = [
  { id: 'calendar', label: '일정', icon: CalendarDays },
  { id: 'memo', label: '개인 메모장', icon: StickyNote },
  { id: 'minutes', label: '회의록', icon: BookmarkCheck },
  { id: 'backups', label: '백업 자료', icon: Mail },
  { id: 'drive', label: '개인 드라이브', icon: Folder },
]
const workspaceToday = new Date(workspaceNow().replace(' ', 'T'))
const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const weekNames = ['일', '월', '화', '수', '목', '금', '토']
const activeTab = ref('calendar')
const cursor = ref(workspaceToday)
const selected = ref(workspaceDateKey(workspaceToday))
const filter = ref('all')
const events = ref([])
const localEvents = ref([])
const subscriptions = ref([])
const userMap = ref(new Map())
const memos = ref([])
const activeMemoId = ref('')
// 메모는 한 페이지에 5개씩 보여주고 나머지는 페이지네이션으로 넘긴다.
const MEMO_PAGE_SIZE = 5
const memoPage = ref(1)
const memoDraft = ref({ memoId: '', title: '', content: '' })
const backups = ref([])
const backupKeyword = ref('')
const driveFiles = ref([])
const driveInput = ref(null)
const driveActionFileId = ref('')
const drivePreviewOpen = ref(false)
const drivePreviewFile = ref(null)
const drivePreviewUrl = ref('')
const drivePreviewKind = ref('unsupported')
const drivePreviewText = ref('')
const drivePreviewLoading = ref(false)
const drivePreviewError = ref('')
const eventOpen = ref(false)
const subscriptionOpen = ref(false)
const subscriptionSearchOpen = ref(false)
const subscriptionSearchRoot = ref(null)
const editingEventId = ref('')
const eventDraft = ref({ title: '', date: selected.value, start: '09:00', end: '10:00', description: '' })
const userKeyword = ref('')
const userCandidates = ref([])
const selectedUserId = ref('')
const errorMessage = ref('')
const toasts = ref([])
const todayKey = workspaceDateKey(workspaceToday)
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
const memoTotalPages = computed(() => Math.max(1, Math.ceil(memos.value.length / MEMO_PAGE_SIZE)))
const pagedMemos = computed(() => {
  const start = (memoPage.value - 1) * MEMO_PAGE_SIZE
  return memos.value.slice(start, start + MEMO_PAGE_SIZE)
})
// 메모 삭제 등으로 페이지 수가 줄면 현재 페이지가 범위를 벗어날 수 있어 마지막 페이지로 보정한다.
watch(memoTotalPages, (total) => {
  if (memoPage.value > total) memoPage.value = total
})
const favoriteMinuteItems = computed(() => mockMinutes.filter((minute) => minuteFavorites.value[minute.id]))

watch(cursor, loadCalendar)
watch(backupKeyword, () => loadBackups())
watch(userKeyword, async () => {
  if (!userKeyword.value.trim()) {
    await loadUserCandidates('')
    return
  }
  await loadUserCandidates(userKeyword.value)
})

onMounted(async () => {
  document.addEventListener('mousedown', closeSubscriptionSearchOnOutside)
  stopFavoriteSync = onMinuteFavoritesChanged((next) => {
    minuteFavorites.value = next
  })
  await Promise.all([loadCalendar(), loadSubscriptions(), loadMemos(), loadBackups(), loadDriveFiles()])
})

onUnmounted(() => {
  document.removeEventListener('mousedown', closeSubscriptionSearchOnOutside)
  stopFavoriteSync?.()
  clearDrivePreviewUrl()
})

async function loadCalendar() {
  const from = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1 - new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1).getDay())
  const to = new Date(from)
  to.setDate(from.getDate() + 42)
  try {
    events.value = mergeLocalEvents((await getWorkspaceCalendar(from.toISOString(), to.toISOString())).map(normalizeEvent))
    if (!events.value.length) events.value = mergeLocalEvents(fallbackWorkspaceCalendar().map(normalizeEvent))
  } catch {
    events.value = mergeLocalEvents(fallbackWorkspaceCalendar().map(normalizeEvent))
  }
}

async function loadSubscriptions() {
  subscriptions.value = await getCalendarSubscriptions().catch(() => [])
  await Promise.all(subscriptions.value.map((item) => cacheUser(item.targetUserId)))
}

async function loadMemos() {
  memos.value = await withFallback(() => getMemos(), () => fallbackWorkspaceMemos())
  if (!memos.value.length) memos.value = fallbackWorkspaceMemos()
  if (!activeMemoId.value && memos.value[0]) selectMemo(memos.value[0].memoId)
}

async function loadBackups() {
  backups.value = await withFallback(
    () => (backupKeyword.value.trim() ? searchBackups(backupKeyword.value.trim()) : getBackups()),
    () => fallbackWorkspaceBackups(backupKeyword.value),
  )
  if (!backups.value.length) backups.value = fallbackWorkspaceBackups(backupKeyword.value)
}

async function loadDriveFiles() {
  driveFiles.value = await withFallback(() => getDriveFiles(), () => fallbackWorkspaceDriveFiles())
  if (!driveFiles.value.length) driveFiles.value = fallbackWorkspaceDriveFiles()
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
  cursor.value = new Date(workspaceToday)
  selected.value = todayKey
}

function openEventForm(event = null) {
  editingEventId.value = event?.eventId || ''
  eventDraft.value = event
    ? {
        title: event.title || '',
        date: workspaceDateKey(new Date(event.startedAt)),
        start: toTimeInput(event.startedAt),
        end: toTimeInput(event.endedAt),
        description: event.description || '',
      }
    : { title: '', date: selected.value, start: '09:00', end: '10:00', description: '' }
  eventOpen.value = true
}

async function saveEvent() {
  const payload = {
    title: eventDraft.value.title.trim(),
    description: eventDraft.value.description.trim(),
    startedAt: new Date(`${eventDraft.value.date}T${eventDraft.value.start}:00+09:00`).toISOString(),
    endedAt: new Date(`${eventDraft.value.date}T${eventDraft.value.end}:00+09:00`).toISOString(),
    allDay: false,
  }
  if (!payload.title) return
  const wasEditing = Boolean(editingEventId.value)
  try {
    if (editingEventId.value) await updateWorkspaceEvent(editingEventId.value, payload)
    else await createWorkspaceEvent(payload)
  } catch {
    upsertLocalEvent(payload)
  }
  eventOpen.value = false
  editingEventId.value = ''
  await loadCalendar()
  showToast(wasEditing ? '일정 수정 완료' : '일정 생성 완료', payload.title)
}

function openSelectedEvent(event) {
  if (event.source === 'MEETING') {
    router.push({ path: '/app/meetings', query: { tab: 'host', editMeetingId: event.meetingId || event.relatedMeetingId || event.eventId, from: 'workspace' } })
    return
  }
  openEventForm(event)
}

function upsertLocalEvent(payload) {
  const nextEvent = normalizeEvent({
    eventId: editingEventId.value || `local-event-${Date.now()}`,
    source: 'PERSONAL',
    ...payload,
  })
  const localExists = localEvents.value.some((event) => event.eventId === editingEventId.value)
  localEvents.value = editingEventId.value && localExists
    ? localEvents.value.map((event) => event.eventId === editingEventId.value ? nextEvent : event)
    : [...localEvents.value, nextEvent]
  events.value = editingEventId.value
    ? events.value.map((event) => event.eventId === editingEventId.value ? nextEvent : event)
    : [...events.value, nextEvent]
}

function mergeLocalEvents(baseEvents) {
  const byId = new Map(baseEvents.map((event) => [event.eventId, event]))
  localEvents.value.forEach((event) => byId.set(event.eventId, event))
  return [...byId.values()]
}

function selectMemo(memoId) {
  activeMemoId.value = memoId
  const memo = memos.value.find((item) => item.memoId === memoId)
  memoDraft.value = memo ? { memoId: memo.memoId, title: memo.title, content: memo.content } : { memoId: '', title: '', content: '' }
}

async function createNewMemo() {
  const memo = await createMemo({ title: '새 메모', content: '내용을 입력하세요.' })
  memos.value.unshift(memo)
  memoPage.value = 1
  selectMemo(memo.memoId)
  showToast('메모 생성 완료', memo.title)
}

async function saveActiveMemo() {
  if (!memoDraft.value.memoId || !memoDraft.value.title.trim() || !memoDraft.value.content.trim()) return
  const updated = await updateMemo(memoDraft.value.memoId, {
    title: memoDraft.value.title.trim(),
    content: memoDraft.value.content.trim(),
  })
  memos.value = memos.value.map((memo) => memo.memoId === updated.memoId ? updated : memo)
  selectMemo(updated.memoId)
  showToast('메모 수정 완료', updated.title)
}

async function deleteActiveMemo() {
  if (!memoDraft.value.memoId) return
  await deleteMemo(memoDraft.value.memoId)
  memos.value = memos.value.filter((memo) => memo.memoId !== memoDraft.value.memoId)
  selectMemo(memos.value[0]?.memoId || '')
  showToast('메모 삭제 완료', '선택한 메모를 삭제했습니다.')
}

async function releaseBackup(backup) {
  try {
    await removeBackupBookmark(backup.backupId)
  } catch {
    backups.value = backups.value.filter((item) => item.backupId !== backup.backupId)
  }
  backups.value = backups.value.filter((item) => item.backupId !== backup.backupId)
  showToast('백업 해제 완료', backup.title)
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
  driveActionFileId.value = ''
  if (drivePreviewFile.value?.fileId === fileId) closeDrivePreview()
  await loadDriveFiles()
  showToast('파일 삭제 완료', '개인 드라이브 파일을 삭제했습니다.')
}

function toggleDriveActionMenu(fileId) {
  driveActionFileId.value = driveActionFileId.value === fileId ? '' : fileId
}

async function downloadPersonalFile(file) {
  if (!file?.fileId) return
  driveActionFileId.value = ''
  const { blob, headers } = await downloadDriveFile(file.fileId)
  saveBlob(blob, resolveBlobFileName(headers, file.originalFileName))
  showToast('다운로드 시작', file.originalFileName)
}

async function openDrivePreview(file) {
  if (!file?.fileId) return
  driveActionFileId.value = ''
  clearDrivePreviewUrl()
  drivePreviewFile.value = file
  drivePreviewOpen.value = true
  drivePreviewLoading.value = true
  drivePreviewError.value = ''
  drivePreviewText.value = ''
  drivePreviewKind.value = 'unsupported'

  try {
    const { blob } = await previewDriveFile(file.fileId)
    const kind = previewKind(blob.type || file.contentType || '')
    drivePreviewKind.value = kind
    if (kind === 'image' || kind === 'pdf') {
      drivePreviewUrl.value = window.URL.createObjectURL(blob)
    } else if (kind === 'text') {
      drivePreviewText.value = await blob.text()
    }
  } catch (error) {
    drivePreviewError.value = error?.message || '파일 미리보기를 불러오지 못했습니다.'
  } finally {
    drivePreviewLoading.value = false
  }
}

function openDriveInfo(file) {
  driveActionFileId.value = ''
  clearDrivePreviewUrl()
  drivePreviewFile.value = file
  drivePreviewKind.value = 'info'
  drivePreviewText.value = ''
  drivePreviewError.value = ''
  drivePreviewLoading.value = false
  drivePreviewOpen.value = true
}

function closeDrivePreview() {
  drivePreviewOpen.value = false
  drivePreviewFile.value = null
  drivePreviewKind.value = 'unsupported'
  drivePreviewText.value = ''
  drivePreviewError.value = ''
  drivePreviewLoading.value = false
  clearDrivePreviewUrl()
}

function clearDrivePreviewUrl() {
  if (drivePreviewUrl.value) window.URL.revokeObjectURL(drivePreviewUrl.value)
  drivePreviewUrl.value = ''
}

async function addSubscription(userId = selectedUserId.value) {
  if (!userId) return
  selectedUserId.value = userId
  let mocked = false
  await subscribeCalendar(userId).catch(() => {
    subscriptions.value = [...subscriptions.value, { subscriptionId: `mock-sub-${Date.now()}`, targetUserId: userId }]
    mocked = true
  })
  subscriptionOpen.value = false
  selectedUserId.value = ''
  userKeyword.value = ''
  userCandidates.value = []
  subscriptionSearchOpen.value = false
  if (!mocked) await loadSubscriptions()
  await loadCalendar()
  showToast('동료 구독 추가', '동료 일정을 구독했습니다.')
}

function selectSubscriptionUser(user) {
  userMap.value = new Map(userMap.value).set(user.userId, user)
  addSubscription(user.userId)
}

async function loadUserCandidates(keyword) {
  const data = await withFallback(() => searchUsers({ keyword, size: 8 }), () => fallbackUserSearch({ keyword, size: 8 }))
  const subscribedIds = new Set(subscriptions.value.map((subscription) => subscription.targetUserId))
  userCandidates.value = (data.items || []).filter((user) => !subscribedIds.has(user.userId))
}

async function openSubscriptionSearch() {
  subscriptionSearchOpen.value = true
  await loadUserCandidates(userKeyword.value)
}

function closeSubscriptionSearchOnOutside(event) {
  if (!subscriptionSearchOpen.value) return
  if (subscriptionSearchRoot.value?.contains(event.target)) return
  subscriptionSearchOpen.value = false
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

function toTimeInput(value) {
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function showToast(title, message) {
  const toast = { id: crypto.randomUUID?.() || String(Date.now()), title, message }
  toasts.value = [toast, ...toasts.value].slice(0, 3)
  setTimeout(() => {
    toasts.value = toasts.value.filter((item) => item.id !== toast.id)
  }, 2600)
}
</script>
