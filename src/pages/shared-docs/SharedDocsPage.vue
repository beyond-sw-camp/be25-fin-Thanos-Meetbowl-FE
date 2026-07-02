<template>
  <section class="page shared-page">
    <header class="page-header shared-header">
      <div>
        <h1>공유 워크스페이스</h1>
        <p>공유 자료, 멤버, 버전 이력을 워크스페이스 단위로 관리합니다.</p>
      </div>
      <div class="shared-header-actions">
        <ActionButton variant="secondary" @click="openCreate"><FolderKanban :size="16" /> 프로젝트 생성</ActionButton>
        <ActionButton variant="secondary" :disabled="!activeSpaceId" @click="openMemberManage"><Plus :size="15" /> 멤버 관리</ActionButton>
        <ActionButton v-if="isActiveSpaceOwner" variant="danger" @click="removeActiveSpace"><Trash2 :size="15" /> 프로젝트 삭제</ActionButton>
        <ActionButton variant="primary" :disabled="!activeSpaceId" @click="openUpload"><Upload :size="15" /> 파일 업로드</ActionButton>
      </div>
    </header>

    <div v-if="errorMessage" class="error-box">{{ errorMessage }}</div>

    <div class="shared-layout">
      <aside class="card shared-projects">
        <div class="shared-section-title"><FolderKanban :size="14" /> 공유 프로젝트</div>
        <button
          v-for="space in spaces"
          :key="space.workspaceId"
          type="button"
          class="shared-project-row"
          :class="{ active: activeSpaceId === space.workspaceId }"
          @click="selectSpace(space.workspaceId)"
        >
          <span>
            <strong>{{ space.name }}</strong>
            <small>{{ space.visibility === 'ORGANIZATION' ? '전 직원 공개' : '멤버 전용' }}</small>
          </span>
          <em>{{ filesBySpace.get(space.workspaceId)?.length || 0 }}</em>
        </button>
        <div v-if="spaces.length === 0" class="empty-state">공유 프로젝트가 없습니다.</div>
      </aside>

      <main class="shared-main">
        <div class="shared-toolbar">
          <label class="shared-search">
            <span>문서 검색</span>
            <Search :size="15" />
            <input v-model="keyword" placeholder="문서 검색">
          </label>
          <small>총 {{ files.length }}건</small>
        </div>

        <div class="table-card shared-table-card">
          <table>
            <thead>
              <tr>
                <th>문서</th>
                <th>버전</th>
                <th>업로더</th>
                <th>크기</th>
                <th>업로드</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in pagedFiles" :key="file.fileId" @click="openFile(file)">
                <td>
                  <div class="shared-doc-cell">
                    <span :class="['shared-doc-icon', fileTone(file.originalFileName)]"><component :is="fileIcon(file.originalFileName)" :size="17" /></span>
                    <div>
                      <strong>{{ file.originalFileName }}</strong>
                      <small>{{ file.contentType || '파일' }}</small>
                    </div>
                  </div>
                </td>
                <td><span class="badge primary">{{ file.currentVersion }}</span></td>
                <td class="shared-nowrap-cell">{{ userLabel(file.uploaderUserId) }}</td>
                <td>{{ formatSize(file.sizeBytes) }}</td>
                <td class="shared-nowrap-cell">{{ displayDate(file.uploadedAt) }}</td>
                <td class="file-action-cell">
                  <button type="button" class="more-button" @click.stop="toggleFileActionMenu(file.fileId)" aria-label="파일 관리"><MoreHorizontal :size="17" /></button>
                  <div v-if="fileActionFileId === file.fileId" class="file-action-menu" @click.stop>
                    <button type="button" @click="downloadFile(file)"><Download :size="14" /> 다운로드</button>
                    <button type="button" @click="openFileInfo(file)"><Info :size="14" /> 파일 정보</button>
                    <button type="button" class="danger" @click="removeFile(file)"><Trash2 :size="14" /> 삭제</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredFiles.length"><td colspan="6"><div class="empty-state">문서가 없습니다.</div></td></tr>
            </tbody>
          </table>
        </div>

        <Pagination v-model="pageNo" :total-pages="totalPages" />
      </main>
    </div>

    <div v-if="openDoc" class="drawer-backdrop shared-detail-backdrop" @click="closeDrawer">
      <aside class="shared-drawer shared-detail-dialog" @click.stop>
        <header>
          <span :class="['shared-doc-icon', fileTone(openDoc.originalFileName)]"><component :is="fileIcon(openDoc.originalFileName)" :size="17" /></span>
          <div>
            <strong>{{ openDoc.originalFileName }}</strong>
            <small>{{ userLabel(openDoc.uploaderUserId) }} · {{ openDoc.currentVersion }} · {{ displayDate(openDoc.uploadedAt) }}</small>
          </div>
          <button type="button" class="drawer-close" aria-label="닫기" @click="closeDrawer"><X :size="17" /></button>
        </header>
        <section class="shared-detail-body">
          <article class="shared-detail-card shared-preview-card">
            <div class="shared-member-section-title">
              <h2>파일 미리보기</h2>
            </div>
            <article class="shared-version-preview file-preview-panel shared-preview-panel">
              <div v-if="filePreviewLoading" class="empty-state">파일을 불러오는 중입니다.</div>
              <div v-else-if="filePreviewError" class="empty-state">{{ filePreviewError }}</div>
              <img v-else-if="filePreviewKind === 'image'" :src="filePreviewUrl" :alt="openDoc.originalFileName">
              <iframe v-else-if="filePreviewKind === 'pdf'" :src="filePreviewUrl" title="파일 미리보기"></iframe>
              <pre v-else-if="filePreviewKind === 'text'">{{ filePreviewText }}</pre>
              <dl v-else class="file-info-list">
                <div v-if="filePreviewKind === 'unsupported'" class="file-info-notice"><dt>미리보기</dt><dd>지원하지 않는 파일 형식입니다.</dd></div>
                <div><dt>파일명</dt><dd>{{ openDoc.originalFileName }}</dd></div>
                <div><dt>형식</dt><dd>{{ openDoc.contentType || '-' }}</dd></div>
                <div><dt>크기</dt><dd>{{ formatSize(openDoc.sizeBytes) }}</dd></div>
                <div><dt>업로드</dt><dd>{{ displayDate(openDoc.uploadedAt) }}</dd></div>
                <div><dt>업로더</dt><dd>{{ userLabel(openDoc.uploaderUserId) }}</dd></div>
                <div><dt>버전</dt><dd>{{ openDoc.currentVersion }}</dd></div>
              </dl>
            </article>
          </article>

          <div class="shared-detail-grid">
            <div class="shared-detail-column">
              <article class="shared-detail-card">
                <div class="shared-member-section-title">
                  <strong>빠른 액션</strong>
                </div>
                <div class="shared-quick-actions">
                  <ActionButton variant="secondary" @click="downloadFile(openDoc)"><Download :size="14" /> 다운로드</ActionButton>
                  <ActionButton variant="secondary" @click="prepareVersionUpload"><Upload :size="14" /> 새 버전 업로드</ActionButton>
                </div>
              </article>

              <form class="shared-detail-card shared-version-upload" @submit.prevent="submitNewVersion">
                <div class="shared-member-section-title">
                  <strong>버전 업로드</strong>
                  <small>현재 버전: {{ openDoc.currentVersion }}</small>
                </div>
                <input
                  ref="versionFileInput"
                  id="shared-version-file-input"
                  class="shared-version-file-input"
                  type="file"
                  @change="onVersionFileChange($event.target.files?.[0] || null)"
                >
                <label class="shared-file-picker" for="shared-version-file-input">
                  <span class="shared-file-picker-button">파일 선택</span>
                  <span class="shared-file-picker-name">{{ versionDraft.file?.name || '선택된 파일 없음' }}</span>
                </label>
                <input v-model="versionDraft.newVersion" placeholder="새 버전 (예: v2)">
                <textarea v-model="versionDraft.changeMemo" rows="4" placeholder="변경 내용 입력 (선택)" />
                <ActionButton type="submit" variant="primary" :disabled="!versionDraft.file || !versionDraft.newVersion.trim() || versionUploading">
                  {{ versionUploading ? '업로드 중...' : '업로드' }}
                </ActionButton>
              </form>
            </div>

            <article class="shared-detail-card">
              <div class="shared-member-section-title">
                <strong>버전 이력</strong>
              </div>
              <div v-if="versions.length" class="shared-version-timeline">
                <article
                  v-for="version in versions"
                  :key="version.versionId"
                  class="version-card version-timeline-card"
                  :class="{ active: selectedVersion?.versionId === version.versionId }"
                  @click="selectedVersion = version"
                >
                  <span class="version-timeline-dot" />
                  <div class="version-timeline-body">
                    <div class="version-timeline-head">
                      <span class="badge primary">{{ version.version }}</span>
                      <strong>{{ version.changeMemo || '변경 메모 없음' }}</strong>
                      <small>{{ displayDate(version.uploadedAt) }}</small>
                    </div>
                    <p>{{ userLabel(version.uploaderUserId) }} · {{ formatSize(version.sizeBytes) }}</p>
                  </div>
                </article>
              </div>
              <div v-else class="empty-state">버전 이력이 없습니다.</div>
              <article v-if="selectedVersion" class="shared-selected-version">
                <div class="shared-member-section-title">
                  <strong>{{ selectedVersion.version }} 파일 내용</strong>
                  <small>{{ userLabel(selectedVersion.uploaderUserId) }}</small>
                </div>
                <pre>{{ versionPreviewText }}</pre>
              </article>
            </article>

            <article class="shared-detail-card">
              <div class="shared-member-section-title">
                <strong>파일 정보</strong>
              </div>
              <dl class="file-info-list shared-info-list">
                <div><dt>문서명</dt><dd>{{ openDoc.originalFileName }}</dd></div>
                <div><dt>버전</dt><dd>{{ selectedVersion?.version || openDoc.currentVersion }}</dd></div>
                <div><dt>작성자</dt><dd>{{ userLabel(selectedVersion?.uploaderUserId || openDoc.uploaderUserId) }}</dd></div>
                <div><dt>파일 형식</dt><dd>{{ openDoc.contentType || '파일' }}</dd></div>
                <div><dt>파일 크기</dt><dd>{{ formatSize(selectedVersion?.sizeBytes || openDoc.sizeBytes) }}</dd></div>
                <div><dt>업로드 날짜</dt><dd>{{ displayDate(selectedVersion?.uploadedAt || openDoc.uploadedAt) }}</dd></div>
                <div><dt>설명</dt><dd>{{ selectedVersion?.changeMemo || '변경 메모 없음' }}</dd></div>
              </dl>
            </article>
          </div>
        </section>
      </aside>
    </div>

    <div v-if="createOpen" class="modal-backdrop" @click="createOpen = false">
      <form class="write-modal shared-create-modal" @submit.prevent="createSpace" @click.stop>
        <header><h2>프로젝트 생성</h2><button type="button" @click="createOpen = false">닫기</button></header>
        <label class="shared-create-field">이름<input v-model="spaceDraft.name" placeholder="예: Q3 신제품 TF"></label>
        <section class="shared-member-invite shared-create-field">
          <div class="shared-member-section-title">
            <strong>프로젝트 멤버</strong>
            <small>{{ createSelectedMembers.length }}명 선택</small>
          </div>
          <div class="participant-chips shared-selected-members">
            <span v-for="member in createSelectedMembers" :key="member.userId" class="member-chip">
              <span class="member-chip-label">{{ memberChipLabel(member) }}</span>
              <button type="button" @click="removeCreateMember(member.userId)">×</button>
            </span>
            <small v-if="!createSelectedMembers.length">생성 후 초대할 멤버를 선택하세요.</small>
          </div>
          <div ref="createMemberSearchRoot" class="recipient-picker">
            <input v-model="createMemberKeyword" placeholder="이름, 부서/팀, 이메일 검색" @focus="openCreateMemberSearch">
            <div v-if="createMemberSearchOpen && createMemberCandidates.length" class="participant-results">
              <button v-for="user in createMemberCandidates" :key="user.userId" type="button" @click="selectCreateMember(user)">
                <strong>{{ user.name }} <small>{{ user.position }}</small></strong>
                <span>{{ user.department || user.team || '-' }} · {{ user.email }}</span>
              </button>
            </div>
          </div>
        </section>
        <footer><button type="button" class="ghost-button" @click="createOpen = false">취소</button><button type="submit" class="primary-button small">생성</button></footer>
      </form>
    </div>

    <div v-if="uploadOpen" class="modal-backdrop" @click="uploadOpen = false">
      <form class="write-modal" @submit.prevent="submitUpload" @click.stop>
        <header><h2>파일 업로드</h2><button type="button" @click="uploadOpen = false">닫기</button></header>
        <p class="shared-upload-note">선택한 공유 프로젝트에 새 파일로 등록합니다. 여러 개를 한 번에 올릴 수 있습니다.</p>
        <button
          type="button"
          class="shared-upload-zone"
          :class="{ 'is-dragging': uploadDragging }"
          @click="uploadInput?.click()"
          @dragenter.prevent="uploadDragging = true"
          @dragover.prevent="uploadDragging = true"
          @dragleave.prevent="uploadDragging = false"
          @drop.prevent="onUploadDrop($event)"
        >
          <Upload :size="22" />
          <strong>{{ uploadDragging ? '여기에 놓아 추가' : '파일을 끌어다 놓거나 클릭해 선택' }}</strong>
          <span>{{ uploadDragging ? '끌어온 파일을 이 영역에 놓으세요.' : '여러 파일 동시 업로드 지원' }}</span>
        </button>
        <input ref="uploadInput" class="hidden-file-input" type="file" multiple @change="addUploadFiles($event.target.files)">
        <ul v-if="uploadDraft.files.length" class="shared-upload-list">
          <li v-for="(file, index) in uploadDraft.files" :key="file.name + index">
            <span>{{ file.name }}</span>
            <small>{{ formatSize(file.size) }}</small>
            <button type="button" @click="removeUploadFile(index)" aria-label="제거">×</button>
          </li>
        </ul>
        <footer>
          <button type="button" class="ghost-button" @click="uploadOpen = false">취소</button>
          <button type="submit" class="primary-button small" :disabled="!uploadDraft.files.length || uploadLoading">
            {{ uploadLoading ? '업로드 중...' : `업로드 (${uploadDraft.files.length})` }}
          </button>
        </footer>
      </form>
    </div>

    <div v-if="inviteOpen" class="modal-backdrop" @click="inviteOpen = false">
      <form class="write-modal shared-member-modal" @submit.prevent="inviteMember" @click.stop>
        <header>
          <div>
            <h2>멤버 관리</h2>
            <p>{{ activeSpace?.name || '공유 프로젝트' }} 멤버를 확인하고 초대합니다.</p>
          </div>
          <button type="button" @click="inviteOpen = false">닫기</button>
        </header>
        <section class="shared-member-current">
          <div class="shared-member-section-title">
            <strong>현재 멤버</strong>
            <small>{{ members.length }}명</small>
          </div>
          <div class="shared-member-list">
            <div v-for="member in memberRows" :key="member.userId" class="shared-member-row">
              <span class="table-avatar">{{ member.name.slice(0, 1) }}</span>
              <span>
                <strong>{{ member.name }}</strong>
                <small>{{ member.department || member.team || '부서 미지정' }} · {{ member.email || member.userId }}</small>
              </span>
              <em>{{ member.role }}</em>
              <button type="button" class="shared-member-remove" @click="removeMember(member.userId)"><UserMinus :size="14" /> 삭제</button>
            </div>
          </div>
          <label class="shared-audience-toggle">
            <input type="checkbox" :checked="activeSpace?.visibility === 'ORGANIZATION'" @change="toggleAudience">
            전 직원 공개
          </label>
        </section>
        <section class="shared-member-invite">
          <div class="shared-member-section-title">
            <strong>멤버 초대</strong>
            <small>이름, 부서/팀, 이메일로 검색</small>
          </div>
        <div v-if="inviteSelectedUser" class="participant-chips shared-selected-members">
          <span class="member-chip">
            <span class="member-chip-label">{{ memberChipLabel(inviteSelectedUser) }}</span>
            <button type="button" @click="clearInviteSelection">×</button>
          </span>
        </div>
        <div ref="inviteSearchRoot" class="recipient-picker">
          <input v-model="userKeyword" placeholder="이름, 부서/팀, 이메일 검색" @focus="openInviteSearch">
          <div v-if="inviteSearchOpen && userCandidates.length" class="participant-results">
            <button v-for="user in userCandidates" :key="user.userId" type="button" :class="{ selected: inviteUserId === user.userId }" @click="selectInviteUser(user)">
              <strong>{{ user.name }} <small>{{ user.position }}</small></strong>
              <span>{{ user.department || user.team || '-' }} · {{ user.email }}</span>
            </button>
          </div>
        </div>
        </section>
        <footer><button type="button" class="ghost-button" @click="inviteOpen = false">취소</button><button type="submit" class="primary-button small" :disabled="!inviteUserId">초대</button></footer>
      </form>
    </div>
    <AppToastStack :items="toasts" @dismiss="dismissToast" />
    <ConfirmDialog v-if="confirmDialog" v-bind="confirmDialog" @cancel="cancelConfirm" @confirm="acceptConfirm" />
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Download, FileSpreadsheet, FileText, FileType2, FolderKanban, Info, MoreHorizontal, Plus, Search, Trash2, Upload, UserMinus, X } from '@lucide/vue'
import ActionButton from '../../components/common/ActionButton.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import AppToastStack from '../../components/common/AppToastStack.vue'
import Pagination from '../../components/common/Pagination.vue'
import {
  changeSharedWorkspaceAudience,
  addSharedWorkspaceFileVersion,
  createSharedWorkspace,
  deleteSharedWorkspace,
  deleteSharedWorkspaceFile,
  downloadSharedWorkspaceFile,
  getSharedWorkspaceFileVersions,
  getSharedWorkspaceFiles,
  getSharedWorkspaceMembers,
  getSharedWorkspaces,
  inviteSharedWorkspaceMember,
  removeSharedWorkspaceMember,
  previewSharedWorkspaceFile,
  uploadSharedWorkspaceFile,
} from '../../lib/shared-workspace'
import { previewKind, resolveBlobFileName, saveBlob } from '../../lib/file-actions'
import { getUserSummary, searchUsers } from '../../lib/users'
import { formatKstDateTime } from '../../utils/dateTime'
import { formatUserChipLabel as memberChipLabel } from '../../utils/userLabel'
import { useAuthStore } from '../../stores/auth'
import { useConfirmDialog } from '../../composables/useConfirmDialog'

const auth = useAuthStore()
const { confirmDialog, requestConfirm, cancelConfirm, acceptConfirm } = useConfirmDialog()

const spaces = ref([])
const activeSpaceId = ref('')
const filesBySpace = ref(new Map())
const files = ref([])
const members = ref([])
const versions = ref([])
const selectedVersion = ref(null)
const versionDraft = ref({ file: null, newVersion: '', changeMemo: '' })
const versionUploading = ref(false)
const keyword = ref('')
const pageNo = ref(1)
const pageSize = 10
const openDoc = ref(null)
const versionFileInput = ref(null)
const fileActionFileId = ref('')
const filePreviewUrl = ref('')
const filePreviewKind = ref('unsupported')
const filePreviewText = ref('')
const filePreviewLoading = ref(false)
const filePreviewError = ref('')
const createOpen = ref(false)
const uploadOpen = ref(false)
const inviteOpen = ref(false)
const uploadInput = ref(null)
const uploadLoading = ref(false)
const uploadDragging = ref(false)
const spaceDraft = ref({ name: '' })
const uploadDraft = ref({ files: [] })
const createMemberKeyword = ref('')
const createMemberCandidates = ref([])
const createSelectedMembers = ref([])
const createMemberSearchOpen = ref(false)
const createMemberSearchRoot = ref(null)
const userKeyword = ref('')
const userCandidates = ref([])
const inviteUserId = ref('')
const inviteSelectedUser = ref(null)
const inviteSearchOpen = ref(false)
const inviteSearchRoot = ref(null)
const userMap = ref(new Map())
const errorMessage = ref('')
const toasts = ref([])

const activeSpace = computed(() => spaces.value.find((space) => space.workspaceId === activeSpaceId.value))
const isActiveSpaceOwner = computed(() => Boolean(activeSpace.value?.ownerUserId && activeSpace.value.ownerUserId === auth.user?.userId))
const filteredFiles = computed(() => files.value.filter((file) => !keyword.value.trim() || file.originalFileName.toLowerCase().includes(keyword.value.trim().toLowerCase())))
const totalPages = computed(() => Math.max(1, Math.ceil(filteredFiles.value.length / pageSize)))
const pagedFiles = computed(() => filteredFiles.value.slice((pageNo.value - 1) * pageSize, pageNo.value * pageSize))
const memberRows = computed(() => members.value.map((member) => {
  const user = userMap.value.get(member.userId) || {}
  return {
    ...member,
    name: user.name || member.userId,
    department: user.department,
    team: user.team,
    email: user.email,
  }
}))
const versionPreviewText = computed(() => {
  if (!openDoc.value || !selectedVersion.value) return ''
  if (selectedVersion.value.previewText) return selectedVersion.value.previewText
  return [
    `문서명: ${openDoc.value.originalFileName}`,
    `버전: ${selectedVersion.value.version}`,
    `작성자: ${userLabel(selectedVersion.value.uploaderUserId)}`,
    `변경 내용: ${selectedVersion.value.changeMemo || '변경 메모 없음'}`,
  ].join('\n')
})

watch(userKeyword, async () => {
  if (!userKeyword.value.trim()) {
    await loadInviteCandidates('')
    return
  }
  await loadInviteCandidates(userKeyword.value)
})

watch(keyword, () => {
  pageNo.value = 1
})

watch(activeSpaceId, () => {
  pageNo.value = 1
})

watch(totalPages, (nextTotalPages) => {
  if (pageNo.value > nextTotalPages) {
    pageNo.value = nextTotalPages
  }
})

watch(createMemberKeyword, async () => {
  if (!createMemberKeyword.value.trim()) {
    await loadCreateMemberCandidates('')
    return
  }
  await loadCreateMemberCandidates(createMemberKeyword.value)
})

onMounted(() => {
  document.addEventListener('mousedown', closeInviteSearchOnOutside)
  loadSpaces()
})

onUnmounted(() => {
  document.removeEventListener('mousedown', closeInviteSearchOnOutside)
  clearFilePreviewUrl()
})

async function loadSpaces() {
  errorMessage.value = ''
  try {
    spaces.value = await getSharedWorkspaces()
  } catch (error) {
    spaces.value = []
    activeSpaceId.value = ''
    files.value = []
    members.value = []
    errorMessage.value = error?.message || '공유 워크스페이스를 불러오지 못했습니다.'
    return
  }

  const fileResults = await Promise.allSettled(
    spaces.value.map((space) => loadFilesForSpace(space.workspaceId, false)),
  )
  if (fileResults.some((result) => result.status === 'rejected')) {
    errorMessage.value = '일부 공유 프로젝트의 자료를 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.'
  }
  if (!activeSpaceId.value && spaces.value[0]) {
    await selectSpace(spaces.value[0].workspaceId)
  }
}

async function selectSpace(spaceId) {
  activeSpaceId.value = spaceId
  const [fileResult, memberResult] = await Promise.allSettled([
    loadFilesForSpace(spaceId, true),
    getSharedWorkspaceMembers(spaceId),
  ])
  files.value = fileResult.status === 'fulfilled' ? fileResult.value : []
  members.value = memberResult.status === 'fulfilled' ? memberResult.value : []
  if (fileResult.status === 'rejected' || memberResult.status === 'rejected') {
    errorMessage.value = '선택한 공유 프로젝트의 자료를 불러오지 못했습니다.'
  }
  await Promise.all([...members.value.map((member) => member.userId), ...files.value.map((file) => file.uploaderUserId)].map(cacheUser))
}

async function loadFilesForSpace(spaceId, useCache) {
  if (useCache && filesBySpace.value.has(spaceId)) return filesBySpace.value.get(spaceId)
  const loaded = await getSharedWorkspaceFiles(spaceId)
  filesBySpace.value = new Map(filesBySpace.value).set(spaceId, loaded)
  return loaded
}

async function openFile(file) {
  fileActionFileId.value = ''
  openDoc.value = file
  versionDraft.value = { file: null, newVersion: '', changeMemo: '' }
  await loadFilePreview(file)
  try {
    versions.value = await getSharedWorkspaceFileVersions(activeSpaceId.value, file.fileId)
  } catch (error) {
    versions.value = []
    showToast('버전 이력 조회 실패', error?.message || '버전 이력을 불러오지 못했습니다.')
  }
  selectedVersion.value = versions.value[0] || null
  await Promise.all(versions.value.map((version) => cacheUser(version.uploaderUserId)))
}

async function openFileInfo(file) {
  fileActionFileId.value = ''
  clearFilePreviewUrl()
  openDoc.value = file
  filePreviewKind.value = 'info'
  filePreviewText.value = ''
  filePreviewError.value = ''
  filePreviewLoading.value = false
  try {
    versions.value = await getSharedWorkspaceFileVersions(activeSpaceId.value, file.fileId)
  } catch (error) {
    versions.value = []
    showToast('버전 이력 조회 실패', error?.message || '버전 이력을 불러오지 못했습니다.')
  }
  selectedVersion.value = versions.value[0] || null
  await Promise.all(versions.value.map((version) => cacheUser(version.uploaderUserId)))
}

function closeDrawer() {
  openDoc.value = null
  versions.value = []
  selectedVersion.value = null
  versionDraft.value = { file: null, newVersion: '', changeMemo: '' }
  clearFilePreviewUrl()
  filePreviewKind.value = 'unsupported'
  filePreviewText.value = ''
  filePreviewError.value = ''
  filePreviewLoading.value = false
}

async function submitNewVersion() {
  if (!openDoc.value || !versionDraft.value.file || !versionDraft.value.newVersion.trim() || versionUploading.value) {
    return
  }
  const fileId = openDoc.value.fileId
  versionUploading.value = true
  try {
    await addSharedWorkspaceFileVersion(activeSpaceId.value, fileId, {
      file: versionDraft.value.file,
      // 낙관적 동시성 검증: 내가 본 현재 버전을 함께 보내 다른 사람이 먼저 올린 경우를 BE가 거른다.
      expectedCurrentVersion: openDoc.value.currentVersion,
      newVersion: versionDraft.value.newVersion.trim(),
      changeMemo: versionDraft.value.changeMemo.trim(),
    })
  } catch (error) {
    showToast('새 버전 업로드 실패', error?.message || '업로드 중 문제가 발생했습니다.')
    return
  } finally {
    versionUploading.value = false
  }
  versionDraft.value = { file: null, newVersion: '', changeMemo: '' }
  // 목록·버전 이력을 새로고침하고, 드로어를 갱신된 파일(새 currentVersion)로 다시 연다.
  filesBySpace.value.delete(activeSpaceId.value)
  await selectSpace(activeSpaceId.value)
  const refreshed = files.value.find((file) => file.fileId === fileId)
  if (refreshed) await openFile(refreshed)
  showToast('새 버전 업로드 완료', '새 버전을 등록했습니다.')
}

function prepareVersionUpload() {
  if (!openDoc.value) return
  versionDraft.value = {
    ...versionDraft.value,
    newVersion: versionDraft.value.newVersion.trim() || suggestNextVersion(openDoc.value.currentVersion),
  }
  window.requestAnimationFrame(() => {
    versionFileInput.value?.click()
  })
}

function openCreate() {
  spaceDraft.value = { name: '' }
  createSelectedMembers.value = []
  createMemberKeyword.value = ''
  createMemberCandidates.value = []
  createMemberSearchOpen.value = false
  createOpen.value = true
}

async function createSpace() {
  if (!spaceDraft.value.name.trim()) return
  errorMessage.value = ''
  try {
    const created = await createSharedWorkspace({
      name: spaceDraft.value.name.trim(),
    })
    const selectedMembers = [...createSelectedMembers.value]
    const inviteResults = await Promise.allSettled(
      selectedMembers.map((member) => inviteSharedWorkspaceMember(created.workspaceId, member.userId)),
    )
    const invitedCount = inviteResults.filter((result) => result.status === 'fulfilled').length
    spaces.value.unshift(created)
    createOpen.value = false
    await selectSpace(created.workspaceId)
    showToast('프로젝트 생성 완료', selectedMembers.length ? `${created.name} · 멤버 ${invitedCount}/${selectedMembers.length}명 초대` : created.name)
  } catch (error) {
    errorMessage.value = error?.message || '공유 프로젝트 생성에 실패했습니다.'
  }
}

function openUpload() {
  uploadDraft.value = { files: [] }
  uploadOpen.value = true
}

function onUploadDrop(event) {
  uploadDragging.value = false
  addUploadFiles(event.dataTransfer?.files)
}

// 드롭/선택 파일을 누적한다(여러 번 나눠 골라도 합쳐지도록).
function addUploadFiles(fileList) {
  const selected = Array.from(fileList || [])
  if (!selected.length) return
  uploadDraft.value.files = [...uploadDraft.value.files, ...selected]
  if (uploadInput.value) uploadInput.value.value = ''
}

function removeUploadFile(index) {
  uploadDraft.value.files = uploadDraft.value.files.filter((_, i) => i !== index)
}

function openMemberManage() {
  if (!activeSpaceId.value) return
  inviteOpen.value = true
  inviteUserId.value = ''
  inviteSelectedUser.value = null
  userKeyword.value = ''
  userCandidates.value = []
  inviteSearchOpen.value = false
}

async function submitUpload() {
  if (!activeSpaceId.value || !uploadDraft.value.files.length || uploadLoading.value) return
  const spaceId = activeSpaceId.value
  uploadLoading.value = true
  const targetFiles = [...uploadDraft.value.files]
  let uploadResults = []
  try {
    // BE는 단일 파일 엔드포인트라, 각 파일 업로드 결과를 따로 집계한다.
    uploadResults = await Promise.allSettled(targetFiles.map((file) => uploadSharedWorkspaceFile(spaceId, file)))
  } finally {
    uploadLoading.value = false
  }

  const failedFiles = targetFiles.filter((_, index) => uploadResults[index]?.status === 'rejected')
  const uploadedFiles = uploadResults
    .filter((result) => result.status === 'fulfilled' && result.value?.fileId)
    .map((result) => result.value)
  const successCount = targetFiles.length - failedFiles.length
  if (successCount > 0) {
    mergeUploadedFiles(spaceId, uploadedFiles)
    try {
      filesBySpace.value.delete(spaceId)
      await selectSpace(spaceId)
      const missingUploadedFiles = uploadedFiles.filter((uploadedFile) => !files.value.some((file) => file.fileId === uploadedFile.fileId))
      mergeUploadedFiles(spaceId, missingUploadedFiles)
    } catch (error) {
      mergeUploadedFiles(spaceId, uploadedFiles)
      showToast('파일 목록 갱신 실패', error?.message || '업로드한 파일은 현재 목록에 임시로 표시됩니다.')
    }
    if (openDoc.value) {
      const refreshed = files.value.find((file) => file.fileId === openDoc.value.fileId)
      if (refreshed) await openFile(refreshed)
    }
  }

  if (failedFiles.length > 0) {
    uploadDraft.value.files = failedFiles
    showToast('파일 업로드 일부 실패', `${targetFiles.length}개 중 ${successCount}개 성공, ${failedFiles.length}개 실패`)
    return
  }

  uploadOpen.value = false
  uploadDraft.value.files = []
  showToast('파일 업로드 완료', `공유 파일 ${successCount}개를 업로드했습니다.`)
}

function mergeUploadedFiles(spaceId, uploadedFiles) {
  if (!uploadedFiles.length) return
  const cachedFiles = filesBySpace.value.get(spaceId) || []
  const mergedFiles = [
    ...uploadedFiles,
    ...cachedFiles.filter((file) => !uploadedFiles.some((uploadedFile) => uploadedFile.fileId === file.fileId)),
  ]
  filesBySpace.value = new Map(filesBySpace.value).set(spaceId, mergedFiles)
  if (activeSpaceId.value === spaceId) files.value = mergedFiles
}

function toggleFileActionMenu(fileId) {
  fileActionFileId.value = fileActionFileId.value === fileId ? '' : fileId
}

async function downloadFile(file) {
  if (!activeSpaceId.value || !file?.fileId) return
  fileActionFileId.value = ''
  const { blob, headers } = await downloadSharedWorkspaceFile(activeSpaceId.value, file.fileId)
  saveBlob(blob, resolveBlobFileName(headers, file.originalFileName))
  showToast('다운로드 시작', file.originalFileName)
}

async function removeFile(file) {
  if (!activeSpaceId.value || !file?.fileId) return
  const confirmed = await requestConfirm({
    title: '공유 파일을 삭제할까요?',
    message: `'${file.originalFileName}'은 프로젝트에서 삭제되며 복구할 수 없습니다.`,
    confirmLabel: '파일 삭제',
  })
  if (!confirmed) return
  await deleteSharedWorkspaceFile(activeSpaceId.value, file.fileId)
  fileActionFileId.value = ''
  if (openDoc.value?.fileId === file.fileId) closeDrawer()
  filesBySpace.value.delete(activeSpaceId.value)
  await selectSpace(activeSpaceId.value)
  showToast('파일 삭제 완료', file.originalFileName)
}

async function loadFilePreview(file) {
  clearFilePreviewUrl()
  filePreviewLoading.value = true
  filePreviewError.value = ''
  filePreviewText.value = ''
  filePreviewKind.value = 'unsupported'

  try {
    const { blob } = await previewSharedWorkspaceFile(activeSpaceId.value, file.fileId)
    const kind = previewKind(blob.type || file.contentType || '')
    filePreviewKind.value = kind
    if (kind === 'image' || kind === 'pdf') {
      filePreviewUrl.value = window.URL.createObjectURL(blob)
    } else if (kind === 'text') {
      filePreviewText.value = await blob.text()
    }
  } catch (error) {
    filePreviewError.value = error?.message || '파일 미리보기를 불러오지 못했습니다.'
  } finally {
    filePreviewLoading.value = false
  }
}

function clearFilePreviewUrl() {
  if (filePreviewUrl.value) window.URL.revokeObjectURL(filePreviewUrl.value)
  filePreviewUrl.value = ''
}

function focusVersionUpload() {
  versionFileInput.value?.click()
}

function suggestNextVersion(currentVersion = '') {
  const match = String(currentVersion).trim().match(/^v?(\d+(?:\.\d+)*)$/i)
  if (match) {
    const parts = match[1].split('.')
    const lastIndex = parts.length - 1
    parts[lastIndex] = String(Number(parts[lastIndex]) + 1)
    return `v${parts.join('.')}`
  }
  return currentVersion ? `${currentVersion}-v2` : 'v2'
}

function onVersionFileChange(file) {
  versionDraft.value.file = file
  if (!versionDraft.value.newVersion.trim() && openDoc.value) {
    versionDraft.value.newVersion = suggestNextVersion(openDoc.value.currentVersion)
  }
}

function selectCreateMember(user) {
  if (!user?.userId || createSelectedMembers.value.some((member) => member.userId === user.userId)) return
  createSelectedMembers.value = [...createSelectedMembers.value, user]
  userMap.value = new Map(userMap.value).set(user.userId, user)
  createMemberKeyword.value = ''
  createMemberCandidates.value = []
  createMemberSearchOpen.value = false
}

function removeCreateMember(userId) {
  createSelectedMembers.value = createSelectedMembers.value.filter((member) => member.userId !== userId)
}

async function inviteMember() {
  if (!activeSpaceId.value || !inviteUserId.value) return
  try {
    await inviteSharedWorkspaceMember(activeSpaceId.value, inviteUserId.value)
  } catch (error) {
    showToast('멤버 초대 실패', error?.message || '공유 프로젝트 멤버를 추가하지 못했습니다.')
    return
  }
  inviteUserId.value = ''
  inviteSelectedUser.value = null
  userKeyword.value = ''
  userCandidates.value = []
  inviteSearchOpen.value = false
  await selectSpace(activeSpaceId.value)
  showToast('멤버 초대 완료', '공유 프로젝트 멤버를 추가했습니다.')
}

function selectInviteUser(user) {
  if (!user?.userId) return
  inviteUserId.value = user.userId
  inviteSelectedUser.value = user
  userMap.value = new Map(userMap.value).set(user.userId, user)
  userKeyword.value = ''
  userCandidates.value = []
  inviteSearchOpen.value = false
}

function clearInviteSelection() {
  inviteUserId.value = ''
  inviteSelectedUser.value = null
}

async function loadInviteCandidates(keyword) {
  const data = await searchUsers({ keyword, size: 20 }).catch(() => ({ items: [] }))
  const memberIds = new Set(members.value.map((member) => member.userId))
  userCandidates.value = (data.items || []).filter((user) => !memberIds.has(user.userId))
  userCandidates.value.forEach((user) => {
    userMap.value = new Map(userMap.value).set(user.userId, user)
  })
}

async function loadCreateMemberCandidates(keyword) {
  const data = await searchUsers({ keyword, size: 20 }).catch(() => ({ items: [] }))
  const selectedIds = new Set(createSelectedMembers.value.map((member) => member.userId))
  createMemberCandidates.value = (data.items || []).filter((user) => !selectedIds.has(user.userId))
  createMemberCandidates.value.forEach((user) => {
    userMap.value = new Map(userMap.value).set(user.userId, user)
  })
}

async function openInviteSearch() {
  inviteSearchOpen.value = true
  await loadInviteCandidates(userKeyword.value)
}

async function openCreateMemberSearch() {
  createMemberSearchOpen.value = true
  await loadCreateMemberCandidates(createMemberKeyword.value)
}

function closeInviteSearchOnOutside(event) {
  if (inviteSearchOpen.value && !inviteSearchRoot.value?.contains(event.target)) {
    inviteSearchOpen.value = false
  }
  if (createMemberSearchOpen.value && !createMemberSearchRoot.value?.contains(event.target)) {
    createMemberSearchOpen.value = false
  }
}

async function removeMember(userId) {
  const confirmed = await requestConfirm({
    title: '프로젝트 멤버를 삭제할까요?',
    message: `${userLabel(userId)}님은 이 프로젝트의 공유 자료에 접근할 수 없게 됩니다.`,
    confirmLabel: '멤버 삭제',
  })
  if (!confirmed) return
  try {
    await removeSharedWorkspaceMember(activeSpaceId.value, userId)
    await selectSpace(activeSpaceId.value)
  } catch {
    members.value = members.value.filter((member) => member.userId !== userId)
  }
  showToast('멤버 삭제 완료', '공유 프로젝트 멤버를 삭제했습니다.')
}

async function removeActiveSpace() {
  if (!activeSpace.value || !isActiveSpaceOwner.value) return
  const target = activeSpace.value
  const confirmed = await requestConfirm({
    title: '공유 프로젝트를 삭제할까요?',
    message: `'${target.name}' 프로젝트와 연결된 자료가 목록에서 제거됩니다. 이 작업은 생성자만 실행할 수 있습니다.`,
    confirmLabel: '프로젝트 삭제',
  })
  if (!confirmed) return

  await deleteSharedWorkspace(target.workspaceId)
  spaces.value = spaces.value.filter((space) => space.workspaceId !== target.workspaceId)
  filesBySpace.value.delete(target.workspaceId)
  activeSpaceId.value = ''
  files.value = []
  members.value = []
  closeDrawer()
  if (spaces.value[0]) await selectSpace(spaces.value[0].workspaceId)
  showToast('프로젝트 삭제 완료', target.name)
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

async function toggleAudience(event) {
  const updated = await changeSharedWorkspaceAudience(activeSpaceId.value, event.target.checked)
  spaces.value = spaces.value.map((space) => space.workspaceId === updated.workspaceId ? updated : space)
}

async function cacheUser(userId) {
  if (!userId || userMap.value.has(userId)) return
  const user = await getUserSummary(userId).catch(() => null)
  userMap.value = new Map(userMap.value).set(userId, user)
}

function userLabel(userId) {
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

function fileIcon(name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet
  if (['ppt', 'pptx', 'key'].includes(ext)) return FileType2
  return FileText
}

function fileTone(name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'shared-type-sheet'
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'shared-type-slide'
  if (ext === 'pdf') return 'shared-type-pdf'
  return 'shared-type-doc'
}

</script>
