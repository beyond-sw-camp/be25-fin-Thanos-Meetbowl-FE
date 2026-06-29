<template>
  <section class="page workspace-page">
    <header class="page-header">
      <h1>개인 워크스페이스</h1>
      <p>개인 일정, 메모, 백업 메일과 드라이브 파일을 관리합니다.</p>
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
          <button v-for="cell in cells" :key="cell.key" type="button" class="calendar-cell" :class="{ muted: !cell.inMonth, today: cell.key === todayKey, selected: selected === cell.key, sun: cell.weekday === 0, sat: cell.weekday === 6 }" @click="selectCalendarDate(cell)">
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
              <button type="button" class="workspace-subscription-remove" @click.stop="removeSubscription(subscription.subscriptionId)"><UserMinus :size="14" /> 구독 해제</button>
            </div>
          </div>
          <button type="button" class="dashed-button" @click="subscriptionOpen = true">동료 구독 추가</button>
        </div>
      </aside>
    </div>

    <div v-else-if="activeTab === 'memo'" class="workspace-memo-grid">
      <aside class="card workspace-memo-list">
        <div class="workspace-panel-head workspace-memo-head"><h2>최근 메모</h2><button type="button" aria-label="새 메모" @click="createNewMemo"><Plus :size="14" /></button></div>
        <label class="workspace-inline-search workspace-memo-search">
          <Search :size="14" />
          <input v-model="memoKeyword" placeholder="개인 메모 검색">
        </label>
        <button v-for="memo in pagedMemos" :key="memo.memoId" type="button" class="workspace-memo-item" :class="{ active: activeMemoId === memo.memoId }" @click="selectMemo(memo.memoId)">
          <strong>{{ memo.title }}</strong>
          <span>{{ summarizeRichText(memo.content) }}</span>
          <small>{{ displayDate(memo.updatedAt || memo.createdAt) }}</small>
        </button>
        <div v-if="filteredMemos.length === 0" class="empty-state workspace-compact-empty">검색된 메모가 없습니다.</div>
        <Pagination v-model="memoPage" :total-pages="memoTotalPages" />
      </aside>
      <article class="card workspace-memo-editor">
        <template v-if="memoDraft.memoId">
          <div class="workspace-memo-title-row">
            <input v-model="memoDraft.title" @input="memoDirty = true">
            <button type="button" class="primary-button small" @click="saveActiveMemo">저장</button>
            <button type="button" class="danger-text" @click="deleteActiveMemo">삭제</button>
          </div>
          <MinutesEditor v-model="memoDraft.content" @update:modelValue="memoDirty = true" />
          <small>최근 수정: {{ displayDate(activeMemo?.updatedAt || activeMemo?.createdAt) }}</small>
        </template>
        <div v-else class="workspace-empty-state">
          <span class="workspace-empty-icon"><StickyNote :size="34" /></span>
          <strong>메모를 선택하거나 새로 만들어 보세요.</strong>
          <p>아이디어를 자유롭게 기록하고, 중요한 내용을 한눈에 관리하세요.</p>
        </div>
      </article>
    </div>

    <article v-else-if="activeTab === 'backups'" class="card workspace-panel">
      <div class="workspace-panel-head">
        <h2>백업한 메일</h2>
        <span class="badge primary">총 {{ backups.length }}건</span>
        <label class="workspace-inline-search workspace-backup-search">
          <Search :size="14" />
          <input v-model="backupKeyword" placeholder="백업 메일 검색">
        </label>
      </div>
      <div v-for="backup in backups" :key="backup.backupId" class="workspace-mail-row">
        <RouterLink :to="'/app/backup/' + backup.backupId">
          <span class="workspace-file-icon mail"><Mail :size="17" /></span>
          <span>
          <strong>{{ backup.title }}</strong>
            <small>{{ backup.sourceType }} · {{ displayDate(backup.backedUpAt) }} · {{ compactText(backup.summary) }}</small>
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
        <RouterLink :to="`/app/minutes/${minute.meetingId}`">
          <span class="workspace-file-icon minutes"><FileText :size="17" /></span>
          <span>
            <strong>{{ minute.title }}</strong>
            <small>{{ minute.date }} · {{ minute.duration }} · 참석 {{ minute.attendees }}명 · 검토자 {{ minute.reviewer }}</small>
          </span>
        </RouterLink>
        <button type="button" title="즐겨찾기 해제" @click="removeFavoriteMinute(minute.id)"><BookmarkCheck :size="16" /> 해제</button>
      </div>
      <div v-if="minutesLoading" class="empty-state">회의록을 불러오는 중입니다.</div>
      <div v-else-if="favoriteMinuteItems.length === 0" class="empty-state">내 회의록에서 별표를 누르면 이곳에 표시됩니다.</div>
    </article>

    <article v-else class="card workspace-panel">
      <div class="workspace-panel-head">
        <h2>개인 드라이브</h2>
        <button type="button" :disabled="driveUploading" @click="driveInput?.click()"><Upload :size="14" /> {{ driveUploading ? '업로드 중...' : '업로드' }}</button>
      </div>
      <input ref="driveInput" class="hidden-file-input" type="file" multiple @change="uploadPersonalFiles($event.target.files)">
      <button
        type="button"
        class="workspace-upload-zone"
        :class="{ 'is-dragging': driveDragging, 'is-uploading': driveUploading }"
        :disabled="driveUploading"
        @click="driveInput?.click()"
        @dragenter.prevent="driveDragging = true"
        @dragover.prevent="driveDragging = true"
        @dragleave.prevent="driveDragging = false"
        @drop.prevent="onDriveDrop($event)"
      >
        <template v-if="driveUploading">
          <strong>업로드 중...</strong>
          <span>파일을 저장하고 있습니다. 잠시만 기다려 주세요.</span>
        </template>
        <template v-else-if="driveDragging">
          <strong>여기에 놓아 업로드</strong>
          <span>끌어온 파일을 이 영역에 놓으세요.</span>
        </template>
        <template v-else>
          <strong>파일을 끌어다 놓거나 클릭해 업로드</strong>
          <span>여러 파일 동시 업로드 지원 · 원본은 Object Storage, DB에는 메타데이터만 저장됩니다.</span>
        </template>
      </button>
      <div class="table-card workspace-drive-table">
        <table>
          <thead><tr><th>파일명</th><th>크기</th><th>업로드</th><th>관리</th></tr></thead>
          <tbody>
            <tr v-for="file in pagedDriveFiles" :key="file.fileId" class="workspace-drive-row" @click="openDrivePreview(file)">
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
      <Pagination v-model="drivePage" :total-pages="driveTotalPages" />
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
            <div v-if="drivePreviewKind === 'unsupported'" class="file-info-notice"><dt>미리보기</dt><dd>지원하지 않는 파일 형식입니다.</dd></div>
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
    <ConfirmDialog v-if="confirmDialog" v-bind="confirmDialog" @cancel="cancelConfirm" @confirm="acceptConfirm" />
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BookmarkCheck, CalendarDays, Download, FileText, Folder, Info, Mail, MoreHorizontal, Plus, Search, StickyNote, Trash2, Upload, UserMinus, X } from '@lucide/vue'
import MinutesEditor from '../../components/minutes/MinutesEditor.vue'
import Pagination from '../../components/common/Pagination.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
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
import { emptyTiptapDocument, extractTiptapText, stringifyTiptapDocument } from '../../lib/minutes-content.js'
import { formatKstDateTime, formatKstTime } from '../../utils/dateTime'
import { workspaceDateKey, workspaceMonthCells, workspaceNow } from '../../data/workspaceData'
import { listMinutes, removeMinutesFavorite } from '../../lib/minutes'
import { useConfirmDialog } from '../../composables/useConfirmDialog'

const router = useRouter()
const route = useRoute()
const tabs = [
  { id: 'calendar', label: '일정', icon: CalendarDays },
  { id: 'memo', label: '개인 메모장', icon: StickyNote },
  { id: 'minutes', label: '회의록', icon: BookmarkCheck },
  { id: 'backups', label: '백업 메일', icon: Mail },
  { id: 'drive', label: '개인 드라이브', icon: Folder },
]
const workspaceToday = new Date(workspaceNow().replace(' ', 'T'))
const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const weekNames = ['일', '월', '화', '수', '목', '금', '토']
const activeTab = ref(tabs.some((tab) => tab.id === route.query.tab) ? route.query.tab : 'calendar')
const cursor = ref(workspaceToday)
const selected = ref(workspaceDateKey(workspaceToday))
const filter = ref('all')
const events = ref([])
const subscriptions = ref([])
const userMap = ref(new Map())
const memos = ref([])
const activeMemoId = ref('')
const memoKeyword = ref('')
// 메모는 한 페이지에 5개씩 보여주고 나머지는 페이지네이션으로 넘긴다.
const MEMO_PAGE_SIZE = 5
const memoPage = ref(1)
const memoDraft = ref({ memoId: '', title: '', content: createEmptyRichContent() })
const backups = ref([])
const backupKeyword = ref('')
const driveFiles = ref([])
// 드라이브 파일은 한 페이지에 15개씩 보여주고 나머지는 페이지네이션으로 넘긴다.
const DRIVE_PAGE_SIZE = 15
const drivePage = ref(1)
const driveInput = ref(null)
const driveUploading = ref(false)
const driveDragging = ref(false)
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
const minuteItems = ref([])
const minutesLoading = ref(false)
const { confirmDialog, requestConfirm, cancelConfirm, acceptConfirm } = useConfirmDialog()
let backupSearchTimer = null
const memoDirty = ref(false)

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
const filteredMemos = computed(() => {
  const keyword = memoKeyword.value.trim().toLowerCase()
  if (!keyword) return memos.value
  return memos.value.filter((memo) => `${memo.title} ${getRichText(memo.content)}`.toLowerCase().includes(keyword))
})
const memoTotalPages = computed(() => Math.max(1, Math.ceil(filteredMemos.value.length / MEMO_PAGE_SIZE)))
const pagedMemos = computed(() => {
  const start = (memoPage.value - 1) * MEMO_PAGE_SIZE
  return filteredMemos.value.slice(start, start + MEMO_PAGE_SIZE)
})
// 메모 삭제 등으로 페이지 수가 줄면 현재 페이지가 범위를 벗어날 수 있어 마지막 페이지로 보정한다.
watch(memoTotalPages, (total) => {
  if (memoPage.value > total) memoPage.value = total
})
const driveTotalPages = computed(() => Math.max(1, Math.ceil(driveFiles.value.length / DRIVE_PAGE_SIZE)))
const pagedDriveFiles = computed(() => {
  const start = (drivePage.value - 1) * DRIVE_PAGE_SIZE
  return driveFiles.value.slice(start, start + DRIVE_PAGE_SIZE)
})
watch(driveTotalPages, (total) => {
  if (drivePage.value > total) drivePage.value = total
})
const favoriteMinuteItems = computed(() => minuteItems.value.filter((minute) => minute.favorite))

watch(cursor, loadCalendar)
watch(memoKeyword, () => { memoPage.value = 1 })
watch(backupKeyword, () => {
  clearTimeout(backupSearchTimer)
  backupSearchTimer = setTimeout(loadBackups, 250)
})
watch(userKeyword, async () => {
  if (!userKeyword.value.trim()) {
    await loadUserCandidates('')
    return
  }
  await loadUserCandidates(userKeyword.value)
})

function createEmptyRichContent() {
  return stringifyTiptapDocument(emptyTiptapDocument())
}

function getRichText(value) {
  return extractTiptapText(value).replace(/\s+/g, ' ').trim()
}

function summarizeRichText(value, maxLength = 90) {
  const text = getRichText(value)
  if (!text) return '내용 없음'
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
}

watch(activeTab, async (next, prev) => {
  if (prev === 'memo' && next !== 'memo' && memoDirty.value) {
    await saveActiveMemo({ silent: true })
  }
})

onMounted(async () => {
  document.addEventListener('mousedown', closeSubscriptionSearchOnOutside)
  await Promise.all([loadCalendar(), loadSubscriptions(), loadMemos(), loadBackups(), loadDriveFiles(), loadMinutes()])
})

onUnmounted(() => {
  document.removeEventListener('mousedown', closeSubscriptionSearchOnOutside)
  clearTimeout(backupSearchTimer)
  if (memoDirty.value) {
    saveActiveMemo({ silent: true })
  }
  clearDrivePreviewUrl()
})

async function loadCalendar() {
  const from = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1 - new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1).getDay())
  const to = new Date(from)
  to.setDate(from.getDate() + 42)
  try {
    events.value = (await getWorkspaceCalendar(from.toISOString(), to.toISOString())).map(normalizeEvent)
  } catch (error) {
    events.value = []
    errorMessage.value = error?.message || '일정을 불러오지 못했습니다.'
  }
}

async function loadSubscriptions() {
  subscriptions.value = await getCalendarSubscriptions().catch(() => [])
  await Promise.all(subscriptions.value.map((item) => cacheUser(item.targetUserId)))
}

async function loadMemos() {
  try {
    memos.value = await getMemos()
  } catch (error) {
    memos.value = []
    errorMessage.value = error?.message || '개인 메모를 불러오지 못했습니다.'
  }
  if (!activeMemoId.value && memos.value[0]) await selectMemo(memos.value[0].memoId)
}

async function loadBackups() {
  try {
    const loaded = backupKeyword.value.trim()
      ? await searchBackups(backupKeyword.value.trim())
      : await getBackups()
    backups.value = loaded || []
  } catch (error) {
    backups.value = []
    errorMessage.value = error?.message || '백업 메일을 불러오지 못했습니다.'
  }
}

async function loadMinutes() {
  minutesLoading.value = true
  try {
    minuteItems.value = (await listMinutes()).map(normalizeWorkspaceMinute)
  } catch {
    minuteItems.value = []
  } finally {
    minutesLoading.value = false
  }
}

async function loadDriveFiles() {
  try {
    driveFiles.value = await getDriveFiles()
  } catch (error) {
    driveFiles.value = []
    errorMessage.value = error?.message || '개인 드라이브를 불러오지 못했습니다.'
  }
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

function selectCalendarDate(cell) {
  selected.value = cell.key
  openEventForm()
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
  } catch (error) {
    showToast('일정 저장 실패', error?.message || '일정을 저장하지 못했습니다.')
    return
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
  const byId = new Map(baseEvents.map((event) => [eventKey(event), event]))
  localEvents.value.forEach((event) => byId.set(eventKey(event), event))
  return [...byId.values()]
}

function eventKey(event) {
  return [
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
}

async function selectMemo(memoId) {
  if (memoDirty.value && memoDraft.value.memoId && memoDraft.value.memoId !== memoId) {
    await saveActiveMemo({ silent: true })
  }
  activeMemoId.value = memoId
  const memo = memos.value.find((item) => item.memoId === memoId)
  memoDraft.value = memo ? { memoId: memo.memoId, title: memo.title, content: memo.content } : { memoId: '', title: '', content: createEmptyRichContent() }
  memoDirty.value = false
}

async function createNewMemo() {
  if (memoDirty.value) {
    await saveActiveMemo({ silent: true })
  }
  const memo = await createMemo({ title: '새 메모', content: createEmptyRichContent() })
  memos.value.unshift(memo)
  memoPage.value = 1
  await selectMemo(memo.memoId)
  showToast('메모 생성 완료', memo.title)
}

async function saveActiveMemo({ silent = false } = {}) {
  if (!memoDraft.value.memoId || !memoDraft.value.title.trim()) return
  const updated = await updateMemo(memoDraft.value.memoId, {
    title: memoDraft.value.title.trim(),
    content: memoDraft.value.content,
  })
  memos.value = memos.value.map((memo) => memo.memoId === updated.memoId ? updated : memo)
  memoDraft.value = { memoId: updated.memoId, title: updated.title, content: updated.content }
  memoDirty.value = false
  if (!silent) showToast('메모 저장 완료', updated.title)
}

async function deleteActiveMemo() {
  if (!memoDraft.value.memoId) return
  const confirmed = await requestConfirm({
    title: '개인 메모를 삭제할까요?',
    message: `'${memoDraft.value.title}' 메모는 삭제 후 복구할 수 없습니다.`,
    confirmLabel: '메모 삭제',
  })
  if (!confirmed) return
  await deleteMemo(memoDraft.value.memoId)
  memos.value = memos.value.filter((memo) => memo.memoId !== memoDraft.value.memoId)
  await selectMemo(memos.value[0]?.memoId || '')
  showToast('메모 삭제 완료', '선택한 메모를 삭제했습니다.')
}

async function releaseBackup(backup) {
  const confirmed = await requestConfirm({
    title: '백업을 해제할까요?',
    message: `'${backup.title}'을 개인 워크스페이스 백업 목록에서 제거합니다.`,
    confirmLabel: '백업 해제',
  })
  if (!confirmed) return
  await removeBackupBookmark(backup.backupId)
  backups.value = backups.value.filter((item) => item.backupId !== backup.backupId)
  showToast('백업 해제 완료', backup.title)
}

async function removeFavoriteMinute(minuteId) {
  const minute = minuteItems.value.find((item) => item.id === minuteId)
  const confirmed = await requestConfirm({
    title: '회의록 즐겨찾기를 해제할까요?',
    message: `'${minute?.title || '선택한 회의록'}'을 개인 워크스페이스에서 제거합니다. 회의록 원본은 삭제되지 않습니다.`,
    confirmLabel: '즐겨찾기 해제',
  })
  if (!confirmed) return
  await removeMinutesFavorite(minuteId)
  minuteItems.value = minuteItems.value.map((minute) => minute.id === minuteId ? { ...minute, favorite: false } : minute)
}

function onDriveDrop(event) {
  driveDragging.value = false
  uploadPersonalFiles(event.dataTransfer?.files)
}

async function uploadPersonalFiles(fileList) {
  const files = Array.from(fileList || [])
  if (!files.length || driveUploading.value) return

  driveUploading.value = true
  let uploadedCount = 0
  try {
    // 백엔드는 요청 하나당 file 파트 하나를 받으므로 다중 선택 파일을 순서대로 업로드한다.
    for (const file of files) {
      await uploadDriveFile(file)
      uploadedCount += 1
    }
    await loadDriveFiles()
    showToast('파일 업로드 완료', `${uploadedCount}개 파일을 개인 드라이브에 추가했습니다.`)
  } catch (error) {
    // 일부 파일이 이미 저장된 경우에도 목록을 다시 받아 화면과 서버 상태를 일치시킨다.
    await loadDriveFiles()
    showToast(
      '파일 업로드 실패',
      uploadedCount
        ? `${uploadedCount}/${files.length}개 업로드 후 실패했습니다. ${error?.message || ''}`.trim()
        : error?.message || '파일을 업로드하지 못했습니다.',
    )
  } finally {
    driveUploading.value = false
    if (driveInput.value) driveInput.value.value = ''
  }
}

async function removeDriveFile(fileId) {
  const file = driveFiles.value.find((item) => item.fileId === fileId)
  const confirmed = await requestConfirm({
    title: '파일을 삭제할까요?',
    message: `'${file?.originalFileName || '선택한 파일'}'은 삭제 후 복구할 수 없습니다.`,
    confirmLabel: '파일 삭제',
  })
  if (!confirmed) return
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
  try {
    await subscribeCalendar(userId)
  } catch (error) {
    showToast('동료 구독 실패', error?.message || '동료 일정을 구독하지 못했습니다.')
    return
  }
  subscriptionOpen.value = false
  selectedUserId.value = ''
  userKeyword.value = ''
  userCandidates.value = []
  subscriptionSearchOpen.value = false
  await loadSubscriptions()
  await loadCalendar()
  showToast('동료 구독 추가', '동료 일정을 구독했습니다.')
}

function selectSubscriptionUser(user) {
  userMap.value = new Map(userMap.value).set(user.userId, user)
  addSubscription(user.userId)
}

async function loadUserCandidates(keyword) {
  const data = await searchUsers({ keyword, size: 8 }).catch(() => ({ items: [] }))
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
  const subscription = subscriptions.value.find((item) => item.subscriptionId === subscriptionId)
  const confirmed = await requestConfirm({
    title: '동료 일정 구독을 해제할까요?',
    message: `${userName(subscription?.targetUserId)}님의 일정이 더 이상 내 달력에 표시되지 않습니다.`,
    confirmLabel: '구독 해제',
  })
  if (!confirmed) return
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

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeWorkspaceMinute(raw) {
  const startedAt = raw.meetingStartedAt || null
  const endedAt = raw.meetingEndedAt || null
  const durationMinutes = startedAt && endedAt
    ? Math.max(1, Math.round((new Date(endedAt) - new Date(startedAt)) / 60000))
    : 0
  return {
    id: raw.minutesId,
    meetingId: raw.meetingId,
    title: raw.meetingTitle || '회의록',
    date: startedAt ? displayDate(startedAt) : '-',
    duration: durationMinutes ? `${durationMinutes}분` : '-',
    attendees: Number(raw.attendeeCount || 0),
    reviewer: raw.reviewerName || raw.reviewerDepartment || '-',
    favorite: Boolean(raw.favorite),
  }
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
