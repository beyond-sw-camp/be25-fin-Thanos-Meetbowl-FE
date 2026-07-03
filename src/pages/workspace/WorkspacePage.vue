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
                <small v-if="event.sharedMeetingLabel">{{ event.sharedMeetingLabel }}</small>
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
              <small v-if="event.sharedMeetingLabel" class="workspace-event-shared-label">{{ event.sharedMeetingLabel }}</small>
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
        <div class="workspace-memo-items">
          <button v-for="memo in pagedMemos" :key="memo.memoId" type="button" class="workspace-memo-item" :class="{ active: activeMemoId === memo.memoId }" @click="selectMemo(memo.memoId)">
            <strong>{{ memo.title }}</strong>
            <span>{{ summarizeRichText(memo.content) }}</span>
            <small>{{ displayDate(memo.updatedAt || memo.createdAt) }}</small>
          </button>
          <div v-if="filteredMemos.length === 0" class="empty-state workspace-compact-empty">검색된 메모가 없습니다.</div>
        </div>
        <div class="workspace-memo-pagination">
          <Pagination v-model="memoPage" :total-pages="memoTotalPages" />
        </div>
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
          <strong>{{ backup.title || '(제목 없음)' }}</strong>
            <small>{{ displayDate(backup.backedUpAt) }}</small>
          </span>
        </RouterLink>
        <button type="button" class="workspace-backup-release" @click="releaseBackup(backup)">해제</button>
      </div>
      <div v-if="backups.length === 0" class="empty-state">백업한 메일이 없습니다.</div>
    </article>

    <div v-else-if="activeTab === 'minutes'" class="workspace-minutes-grid">
      <aside class="card workspace-minutes-list">
        <div class="workspace-panel-head">
          <h2>보관된 회의록</h2>
          <span class="badge primary">{{ workspaceMinuteItems.length }}건</span>
        </div>
        <button
          v-for="minute in workspaceMinuteItems"
          :key="minute.id"
          type="button"
          class="workspace-minute-item"
          :class="{ active: workspaceMinuteId === minute.id }"
          @click="selectWorkspaceMinute(minute.id)"
        >
          <span class="workspace-file-icon minutes"><FileText :size="17" /></span>
          <span>
            <strong>{{ minute.title }}</strong>
            <small>{{ minute.date }} · {{ minute.duration }}</small>
            <small>참석 {{ minute.attendees }}명 · 검토자 {{ minute.reviewer }}</small>
          </span>
        </button>
        <div v-if="minutesLoading" class="empty-state workspace-compact-empty">회의록을 불러오는 중입니다.</div>
        <div v-else-if="workspaceMinuteItems.length === 0" class="empty-state workspace-compact-empty">보관된 회의록이 없습니다.</div>
      </aside>

      <article v-if="minutesLoading" class="card minute-detail-panel empty-state workspace-minute-empty-state">회의록 상세를 불러오는 중입니다.</article>
      <article v-else-if="workspaceMinuteDetailLoading" class="card minute-detail-panel empty-state workspace-minute-empty-state">회의록 상세를 불러오는 중입니다.</article>
      <article v-else-if="workspaceMinuteDetailError" class="card minute-detail-panel empty-state workspace-minute-empty-state">
        <p>{{ workspaceMinuteDetailError }}</p>
        <button class="secondary-button" type="button" @click="loadWorkspaceMinuteDetail">다시 시도</button>
      </article>
      <MinuteDetail
        v-else-if="selectedWorkspaceMinute"
        :minute="selectedWorkspaceMinute"
        :editing="workspaceMinuteEditing"
        :favorites="workspaceFavorites"
        :transcript-open="workspaceTranscriptOpen"
        :transcript="workspaceTranscriptLines"
        :transcript-loading="workspaceTranscriptLoading"
        :transcript-error="workspaceTranscriptError"
        :can-edit="canEditWorkspaceMinute"
        :can-approve="canApproveWorkspaceMinute"
        :action-pending="workspaceMinuteActionPending"
        :can-share="canShareWorkspaceMinute"
        :readonly-mode="true"
        @toggle-favorite="toggleWorkspaceMinuteFavorite"
        @start-edit="workspaceMinuteEditing = true"
        @cancel-edit="workspaceMinuteEditing = false"
        @save-edit="saveWorkspaceMinuteEdit"
        @approve="approveWorkspaceMinute"
        @toggle-transcript="toggleWorkspaceMinuteTranscript"
        @share="openWorkspaceMinuteShare"
      />
      <article v-else class="card minute-detail-panel empty-state workspace-minute-empty-state">
        <strong>표시할 회의록이 없습니다.</strong>
        <p>회의록을 선택하면 이 영역에 상세 내용이 표시됩니다.</p>
      </article>
    </div>

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
    <AppToastStack :items="toasts" @dismiss="dismissToast" />
    <ShareMailModal v-if="workspaceShareOpen" :draft="workspaceShare" @close="closeWorkspaceMinuteShare" @send="sendWorkspaceMinuteShare" />
    <ConfirmDialog v-if="confirmDialog" v-bind="confirmDialog" @cancel="cancelConfirm" @confirm="acceptConfirm" />
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BookmarkCheck, CalendarDays, Download, FileText, Folder, Info, Mail, MoreHorizontal, Plus, Search, StickyNote, Trash2, Upload, UserMinus, X } from '@lucide/vue'
import MinutesEditor from '../../components/minutes/MinutesEditor.vue'
import MinuteDetail from '../../components/minutes/MinuteDetail.vue'
import ShareMailModal from '../../components/minutes/ShareMailModal.vue'
import Pagination from '../../components/common/Pagination.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import AppToastStack from '../../components/common/AppToastStack.vue'
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
import {
  buildMinutesShareDocument,
  emptyTiptapDocument,
  extractTiptapText,
  isValidTiptapDocument,
  stringifyTiptapDocument,
} from '../../lib/minutes-content.js'
import { addMinutes, formatKstDateTime, formatKstTime } from '../../utils/dateTime'
import { workspaceDateKey, workspaceMonthCells, workspaceNow } from '../../data/workspaceData'
import {
  addMinutesFavorite,
  approveMeetingMinutes,
  getMeetingMinutes,
  getMeetingTranscript,
  listMinutes,
  removeMinutesFavorite,
  reviseMeetingMinutes,
  shareMeetingMinutes,
} from '../../lib/minutes'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
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
const workspaceMinuteId = ref('')
const workspaceMinuteDetailByMeetingId = ref({})
const workspaceMinuteDetailLoading = ref(false)
const workspaceMinuteDetailError = ref('')
const workspaceMinuteEditing = ref(false)
const workspaceMinuteActionPending = ref(false)
const workspaceTranscriptOpen = ref(false)
const workspaceTranscriptLoading = ref(false)
const workspaceTranscriptError = ref('')
const workspaceTranscriptLines = ref([])
const workspaceShareOpen = ref(false)
const workspaceShare = ref({ recipients: [], query: '', subject: '', body: '', error: '', sending: false })
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
const visibleEvents = computed(() => mergeVisibleEvents(
  events.value.filter((event) => filter.value === 'all' || event.source === filter.value),
))
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
const workspaceMinuteItems = computed(() => minuteItems.value.slice().sort((a, b) => {
  if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1
  const aTime = Date.parse(a.approvedAt || a.meetingStartedAt || '') || 0
  const bTime = Date.parse(b.approvedAt || b.meetingStartedAt || '') || 0
  return bTime - aTime
}))
const workspaceFavorites = computed(() => Object.fromEntries(minuteItems.value.map((minute) => [minute.id, minute.favorite])))
const selectedWorkspaceMinuteListItem = computed(() =>
  workspaceMinuteItems.value.find((minute) => minute.id === workspaceMinuteId.value) || workspaceMinuteItems.value[0] || null,
)
const selectedWorkspaceMinute = computed(() => {
  if (!selectedWorkspaceMinuteListItem.value) return null
  const detail = workspaceMinuteDetailByMeetingId.value[selectedWorkspaceMinuteListItem.value.meetingId]
  return normalizeWorkspaceMinute(detail || selectedWorkspaceMinuteListItem.value)
})
const selectedWorkspaceMinuteStatus = computed(() => normalizeStatus(selectedWorkspaceMinute.value?.rawStatus))
const canEditWorkspaceMinute = computed(() => false)
const canApproveWorkspaceMinute = computed(() => false)
const canShareWorkspaceMinute = computed(() => canShareMinute(selectedWorkspaceMinute.value))

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
watch(workspaceMinuteItems, (items) => {
  if (!items.length) {
    workspaceMinuteId.value = ''
    return
  }
  if (!items.some((minute) => minute.id === workspaceMinuteId.value)) {
    workspaceMinuteId.value = items[0].id
  }
})
watch(workspaceMinuteId, async () => {
  workspaceMinuteEditing.value = false
  workspaceTranscriptOpen.value = false
  workspaceTranscriptLines.value = []
  workspaceTranscriptError.value = ''
  if (workspaceMinuteId.value) await loadWorkspaceMinuteDetail()
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
    await Promise.all(
      [...new Set(events.value.map((event) => event.ownerUserId).filter(Boolean))]
        .map((userId) => cacheUser(userId)),
    )
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
    minuteItems.value = (await listMinutes({ favoriteOnly: true })).map(normalizeWorkspaceMinute)
    if (!workspaceMinuteId.value && minuteItems.value.length > 0) {
      workspaceMinuteId.value = workspaceMinuteItems.value[0]?.id || ''
    }
  } catch {
    minuteItems.value = []
  } finally {
    minutesLoading.value = false
  }
}

function selectWorkspaceMinute(minuteId) {
  workspaceMinuteId.value = minuteId
}

async function loadWorkspaceMinuteDetail() {
  if (!selectedWorkspaceMinuteListItem.value?.meetingId) return
  workspaceMinuteDetailLoading.value = true
  workspaceMinuteDetailError.value = ''
  try {
    const detail = await getMeetingMinutes(selectedWorkspaceMinuteListItem.value.meetingId)
    workspaceMinuteDetailByMeetingId.value = {
      ...workspaceMinuteDetailByMeetingId.value,
      [selectedWorkspaceMinuteListItem.value.meetingId]: detail,
    }
    replaceWorkspaceMinuteItem(normalizeWorkspaceMinute(detail))
  } catch (error) {
    workspaceMinuteDetailError.value = error?.message || '회의록 상세를 불러오지 못했습니다.'
  } finally {
    workspaceMinuteDetailLoading.value = false
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
    sharedMeetingLabel: '',
  }
}

function mergeVisibleEvents(items) {
  const myUserId = auth.user?.userId
  if (!myUserId) return items

  const grouped = new Map()
  for (const event of items) {
    if (event.source !== 'MEETING' || !event.sourceId) {
      grouped.set(`event:${event.eventId}`, [event])
      continue
    }
    const key = `meeting:${event.sourceId}:${event.startedAt}:${event.endedAt}`
    const bucket = grouped.get(key) || []
    bucket.push(event)
    grouped.set(key, bucket)
  }

  return Array.from(grouped.values()).flatMap((bucket) => {
    if (bucket.length === 1) return bucket
    const includesMe = bucket.some((event) => event.ownerUserId === myUserId)
    if (!includesMe) return bucket

    const others = bucket
      .map((event) => event.ownerUserId)
      .filter((userId) => userId && userId !== myUserId)
    const uniqueOthers = [...new Set(others)]
    if (!uniqueOthers.length) return [bucket[0]]

    const first = bucket[0]
    return [{
      ...first,
      eventId: `shared-${first.sourceId}-${first.startedAt}`,
      ownerUserId: myUserId,
      sharedMeetingLabel: buildSharedMeetingLabel(uniqueOthers),
    }]
  })
}

function buildSharedMeetingLabel(userIds) {
  if (!userIds.length) return ''
  const names = userIds
    .map((userId) => userName(userId))
    .filter(Boolean)
  if (!names.length) return '함께 참석'
  if (names.length === 1) return `${names[0]}님과 함께 참석`
  return `${names[0]}님 외 ${names.length - 1}명과 함께 참석`
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
  const defaultDate = selected.value || todayKey
  const defaultStart = currentKstTime()
  eventDraft.value = event
    ? {
        title: event.title || '',
        date: workspaceDateKey(new Date(event.startedAt)),
        start: toTimeInput(event.startedAt),
        end: toTimeInput(event.endedAt),
        description: event.description || '',
      }
    : {
        title: '',
        date: defaultDate,
        start: defaultStart,
        end: addMinutes(defaultStart, 60),
        description: '',
      }
  eventOpen.value = true
}

function currentKstTime() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
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
  try {
    await removeMinutesFavorite(minuteId)
    minuteItems.value = minuteItems.value.map((minute) => minute.id === minuteId ? { ...minute, favorite: false } : minute)
  } catch (error) {
    // 서버 해제가 실패하면 목록을 그대로 두고 사유를 알린다. 조용히 성공한 척하면 새로고침 시 다시 나타나 혼란을 준다.
    showToast('즐겨찾기 해제 실패', error?.message || '회의록 즐겨찾기를 해제하지 못했습니다.')
  }
}

async function toggleWorkspaceMinuteFavorite(minuteId) {
  const item = minuteItems.value.find((minute) => minute.id === minuteId)
  if (!item) return
  const next = !item.favorite
  replaceWorkspaceMinuteItem({ ...item, favorite: next })
  try {
    if (next) await addMinutesFavorite(minuteId)
    else await removeMinutesFavorite(minuteId)
  } catch (error) {
    // 낙관적 갱신을 되돌리되, 실패를 조용히 묻지 않고 알려 "해제했는데 그대로 남는" 오인을 막는다.
    replaceWorkspaceMinuteItem({ ...item, favorite: !next })
    showToast(
      next ? '즐겨찾기 추가 실패' : '즐겨찾기 해제 실패',
      error?.message || '회의록 즐겨찾기 상태를 변경하지 못했습니다.',
    )
  }
}

async function saveWorkspaceMinuteEdit(draft) {
  if (!selectedWorkspaceMinute.value) return
  if (!isValidTiptapDocument(draft.content)) {
    workspaceMinuteDetailError.value = '본문은 올바른 회의록 형식이어야 합니다.'
    return
  }
  workspaceMinuteActionPending.value = true
  workspaceMinuteDetailError.value = ''
  try {
    const updated = await reviseMeetingMinutes(selectedWorkspaceMinute.value.meetingId, {
      summary: draft.summary,
      content: draft.content,
    })
    workspaceMinuteDetailByMeetingId.value = {
      ...workspaceMinuteDetailByMeetingId.value,
      [updated.meetingId]: updated,
    }
    replaceWorkspaceMinuteItem(normalizeWorkspaceMinute(updated))
    workspaceMinuteEditing.value = false
    showToast('회의록 수정 완료', selectedWorkspaceMinute.value.title)
  } catch (error) {
    workspaceMinuteDetailError.value = error?.message || '회의록 수정 저장에 실패했습니다.'
  } finally {
    workspaceMinuteActionPending.value = false
  }
}

async function approveWorkspaceMinute() {
  if (!selectedWorkspaceMinute.value) return
  workspaceMinuteActionPending.value = true
  workspaceMinuteDetailError.value = ''
  try {
    const approved = await approveMeetingMinutes(selectedWorkspaceMinute.value.meetingId)
    workspaceMinuteDetailByMeetingId.value = {
      ...workspaceMinuteDetailByMeetingId.value,
      [approved.meetingId]: approved,
    }
    replaceWorkspaceMinuteItem(normalizeWorkspaceMinute(approved))
    workspaceMinuteEditing.value = false
    showToast('회의록 승인 완료', selectedWorkspaceMinute.value.title)
  } catch (error) {
    workspaceMinuteDetailError.value = error?.message || '회의록 승인에 실패했습니다.'
  } finally {
    workspaceMinuteActionPending.value = false
  }
}

async function toggleWorkspaceMinuteTranscript() {
  if (!selectedWorkspaceMinute.value) return
  workspaceTranscriptOpen.value = !workspaceTranscriptOpen.value
  if (!workspaceTranscriptOpen.value || workspaceTranscriptLines.value.length > 0) return
  workspaceTranscriptLoading.value = true
  workspaceTranscriptError.value = ''
  try {
    const transcript = await getMeetingTranscript(selectedWorkspaceMinute.value.meetingId)
    workspaceTranscriptLines.value = (transcript?.segments || []).map((segment) => ({
      t: formatOffset(segment.startedAtMs),
      who: `#${segment.sequence}`,
      text: segment.sourceText,
    }))
  } catch (error) {
    workspaceTranscriptError.value = error?.message || '회의 원문 STT를 불러오지 못했습니다.'
  } finally {
    workspaceTranscriptLoading.value = false
  }
}

function openWorkspaceMinuteShare() {
  if (!selectedWorkspaceMinute.value) return
  if (!canShareWorkspaceMinute.value) {
    workspaceMinuteDetailError.value = '승인된 회의록만 공유할 수 있습니다.'
    return
  }
  workspaceShare.value = {
    recipients: [],
    query: '',
    subject: `[회의록 공유] ${selectedWorkspaceMinute.value.title}`,
    body: buildMinutesShareBody(selectedWorkspaceMinute.value),
    error: '',
    sending: false,
  }
  workspaceShareOpen.value = true
}

function closeWorkspaceMinuteShare() {
  if (workspaceShare.value.sending) return
  workspaceShareOpen.value = false
}

async function sendWorkspaceMinuteShare() {
  if (!selectedWorkspaceMinute.value || workspaceShare.value.sending) return
  const recipientUserIds = workspaceShare.value.recipients.map((recipient) => recipient.userId)
  if (!recipientUserIds.length) {
    workspaceShare.value.error = '받는 사람을 1명 이상 선택하세요.'
    return
  }
  workspaceShare.value.sending = true
  workspaceShare.value.error = ''
  try {
    const shared = await shareMeetingMinutes(selectedWorkspaceMinute.value.meetingId, {
      recipientUserIds,
      subject: workspaceShare.value.subject,
      body: workspaceShare.value.body,
      idempotencyKey: randomUuid(),
    })
    workspaceMinuteDetailByMeetingId.value = {
      ...workspaceMinuteDetailByMeetingId.value,
      [shared.meetingId]: shared,
    }
    replaceWorkspaceMinuteItem(normalizeWorkspaceMinute(shared))
    workspaceShareOpen.value = false
    showToast('회의록 공유 완료', `${recipientUserIds.length}명에게 내부 메일을 보냈습니다.`)
  } catch (error) {
    workspaceShare.value.error = error?.message || '회의록 공유 메일 발송에 실패했습니다.'
  } finally {
    workspaceShare.value.sending = false
  }
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

function buildMinutesShareBody(minute) {
  return buildMinutesShareDocument({
    title: minute?.title,
    summary: minute?.summary,
    content: minute?.content,
    link: buildMinutesLink(minute?.meetingId),
  })
}

function buildMinutesLink(meetingId) {
  if (!meetingId) return ''
  const origin = globalThis.location?.origin || ''
  return `${origin}/app/minutes/${meetingId}`
}

function normalizeWorkspaceMinute(raw) {
  const startedAt = raw.meetingStartedAt || null
  const endedAt = raw.meetingEndedAt || null
  return {
    id: raw.minutesId,
    minutesId: raw.minutesId,
    meetingId: raw.meetingId,
    meetingStartedAt: startedAt,
    meetingEndedAt: endedAt,
    reviewerUserId: raw.reviewerUserId,
    title: raw.meetingTitle || '회의록',
    date: startedAt ? displayDate(startedAt) : formatDate(raw.approvedAt),
    duration: formatDuration(startedAt, endedAt),
    attendees: Number(raw.attendeeCount || 0),
    summary: raw.summary || '',
    content: raw.content || '',
    reviewer: raw.reviewerName || raw.reviewerDepartment || '-',
    reviewerDepartment: raw.reviewerDepartment || '',
    rawStatus: normalizeStatus(raw.status),
    statusLabel: statusLabel(raw.status),
    approvedAt: raw.approvedAt || null,
    favorite: Boolean(raw.favorite ?? workspaceFavorites.value?.[raw.minutesId]),
  }
}

function replaceWorkspaceMinuteItem(next) {
  minuteItems.value = minuteItems.value.map((minute) => minute.meetingId === next.meetingId ? { ...minute, ...next } : minute)
}

function statusLabel(status) {
  const normalized = normalizeStatus(status)
  return {
    DRAFT: '초안',
    IN_REVIEW: '검토중',
    APPROVED: '승인됨',
    SHARED: '공유됨',
    DELETION_SCHEDULED: '삭제 예정',
  }[normalized] || status || '-'
}

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase()
}

function canShareMinute(minute) {
  if (!minute) return false
  const status = normalizeStatus(minute.rawStatus)
  const label = String(minute.statusLabel || '').trim()
  return ['APPROVED', 'SHARED'].includes(status)
    || ['승인됨', '공유됨'].includes(label)
    || Boolean(minute.approvedAt)
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return '-'
  const minutes = Math.max(1, Math.round((new Date(endedAt) - new Date(startedAt)) / 60000))
  if (minutes < 60) return `${minutes}분`
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`
}

function formatOffset(ms) {
  if (!Number.isFinite(Number(ms))) return '--:--'
  const totalSeconds = Math.floor(Number(ms) / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
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

function randomUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) => {
    const random = globalThis.crypto.getRandomValues(new Uint8Array(1))[0]
    return (Number(char) ^ (random & (15 >> (Number(char) / 4)))).toString(16)
  })
}

function showToast(title, message) {
  const toast = { id: crypto.randomUUID?.() || String(Date.now()), title, message }
  toasts.value = [toast, ...toasts.value].slice(0, 3)
  setTimeout(() => {
    toasts.value = toasts.value.filter((item) => item.id !== toast.id)
  }, 2600)
}

function dismissToast(id) {
  toasts.value = toasts.value.filter((item) => item.id !== id)
}
</script>

<style scoped>
.calendar-event-pill small {
  display: block;
  font-size: 10px;
  line-height: 1.35;
  white-space: normal;
}

.calendar-event-pill.mine small {
  color: rgba(154, 52, 18, .86);
}

.calendar-event-pill.team small {
  color: rgba(30, 64, 175, .88);
}

.workspace-event-shared-label {
  display: block;
  margin-top: 4px;
  color: var(--primary-dark);
  font-size: 12px;
  font-weight: 700;
}
</style>
