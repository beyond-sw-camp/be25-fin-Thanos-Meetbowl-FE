<template>
  <section class="page shared-page">
    <header class="page-header shared-header">
      <div>
        <h1>공유 워크스페이스</h1>
        <p>공유 자료, 멤버, 버전 이력을 워크스페이스 단위로 관리합니다.</p>
      </div>
      <div class="shared-header-actions">
        <button type="button" class="ghost-button icon-action" @click="openCreate"><FolderKanban :size="16" /> 스페이스 생성</button>
        <button type="button" class="primary-button small" :disabled="!activeSpaceId" @click="openUpload"><Upload :size="15" /> 파일 업로드</button>
      </div>
    </header>

    <div v-if="errorMessage" class="error-box">{{ errorMessage }}</div>

    <div class="shared-layout">
      <aside class="card shared-projects">
        <div class="shared-section-title"><FolderKanban :size="14" /> 공유 스페이스</div>
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
        <div v-if="spaces.length === 0" class="empty-state">공유 스페이스가 없습니다.</div>
      </aside>

      <main class="shared-main">
        <div class="shared-toolbar">
          <label class="shared-search">
            <span>문서 검색</span>
            <Search :size="15" />
            <input v-model="keyword" placeholder="문서 검색">
          </label>
          <small>총 {{ filteredFiles.length }}건</small>
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
              <tr v-for="file in filteredFiles" :key="file.fileId" @click="openFile(file)">
                <td>
                  <div class="shared-doc-cell">
                    <span :class="['shared-doc-icon', fileTone(file.originalFileName)]"><component :is="fileIcon(file.originalFileName)" :size="17" /></span>
                    <div><strong>{{ file.originalFileName }}</strong><small>{{ file.contentType || '파일' }}</small></div>
                  </div>
                </td>
                <td><span class="badge primary">{{ file.currentVersion }}</span></td>
                <td>{{ userLabel(file.uploaderUserId) }}</td>
                <td>{{ formatSize(file.sizeBytes) }}</td>
                <td>{{ displayDate(file.uploadedAt) }}</td>
                <td><button type="button" class="more-button" @click.stop="openFile(file)" aria-label="파일 관리"><MoreHorizontal :size="17" /></button></td>
              </tr>
              <tr v-if="filteredFiles.length === 0"><td colspan="6"><div class="empty-state">문서가 없습니다.</div></td></tr>
            </tbody>
          </table>
        </div>

        <section v-if="activeSpace" class="card shared-members-panel">
          <div class="workspace-panel-head">
            <h2>멤버</h2>
            <button type="button" @click="inviteOpen = true"><Plus :size="14" /> 초대</button>
          </div>
          <div class="tag-row">
            <span v-for="member in members" :key="member.userId">
              {{ userLabel(member.userId) }} · {{ member.role }}
              <button type="button" @click="removeMember(member.userId)">×</button>
            </span>
          </div>
          <label class="shared-audience-toggle">
            <input type="checkbox" :checked="activeSpace.visibility === 'ORGANIZATION'" @change="toggleAudience">
            전 직원 공개
          </label>
        </section>
      </main>
    </div>

    <div v-if="openDoc" class="drawer-backdrop" @click="closeDrawer">
      <aside class="shared-drawer" @click.stop>
        <header>
          <span :class="['shared-doc-icon', fileTone(openDoc.originalFileName)]"><component :is="fileIcon(openDoc.originalFileName)" :size="17" /></span>
          <div>
            <strong>{{ openDoc.originalFileName }}</strong>
            <small>{{ userLabel(openDoc.uploaderUserId) }} · {{ openDoc.currentVersion }}</small>
          </div>
          <button type="button" class="ghost-button icon-action" @click="openVersionUpload"><GitBranch :size="15" /> 새 버전</button>
          <button type="button" class="drawer-close" @click="closeDrawer">닫기</button>
        </header>
        <section>
          <h2>버전 이력</h2>
          <article v-for="version in versions" :key="version.versionId" class="version-card">
            <div><span class="badge primary">{{ version.version }}</span><strong>{{ version.changeMemo || '변경 메모 없음' }}</strong><small>{{ displayDate(version.uploadedAt) }}</small></div>
            <p>{{ userLabel(version.uploaderUserId) }} · {{ formatSize(version.sizeBytes) }}</p>
          </article>
          <div v-if="versions.length === 0" class="empty-state">버전 이력이 없습니다.</div>
        </section>
      </aside>
    </div>

    <div v-if="createOpen" class="modal-backdrop" @click="createOpen = false">
      <form class="write-modal" @submit.prevent="createSpace" @click.stop>
        <header><h2>스페이스 생성</h2><button type="button" @click="createOpen = false">닫기</button></header>
        <label>이름<input v-model="spaceDraft.name" placeholder="예: Q3 신제품 TF"></label>
        <label>설명<textarea v-model="spaceDraft.description" rows="3" placeholder="공유 목적과 범위"></textarea></label>
        <footer><button type="button" class="ghost-button" @click="createOpen = false">취소</button><button type="submit" class="primary-button small">생성</button></footer>
      </form>
    </div>

    <div v-if="uploadOpen" class="modal-backdrop" @click="uploadOpen = false">
      <form class="write-modal" @submit.prevent="submitUpload" @click.stop>
        <header><h2>{{ uploadDraft.mode === 'new' ? '파일 업로드' : '새 버전 업로드' }}</h2><button type="button" @click="uploadOpen = false">닫기</button></header>
        <div class="upload-mode-grid">
          <button type="button" :class="{ active: uploadDraft.mode === 'new' }" @click="uploadDraft.mode = 'new'"><strong>새 파일</strong><span>공유 자료로 등록</span></button>
          <button type="button" :class="{ active: uploadDraft.mode === 'version' }" :disabled="!openDoc" @click="uploadDraft.mode = 'version'"><strong>새 버전</strong><span>현재 문서 버전 추가</span></button>
        </div>
        <input ref="uploadInput" type="file" @change="uploadDraft.file = $event.target.files?.[0] || null">
        <template v-if="uploadDraft.mode === 'version'">
          <label>새 버전<input v-model="uploadDraft.newVersion" placeholder="예: v1.1"></label>
          <label>변경 내용<textarea v-model="uploadDraft.changeMemo" rows="2"></textarea></label>
        </template>
        <footer><button type="button" class="ghost-button" @click="uploadOpen = false">취소</button><button type="submit" class="primary-button small" :disabled="!uploadDraft.file">업로드</button></footer>
      </form>
    </div>

    <div v-if="inviteOpen" class="modal-backdrop" @click="inviteOpen = false">
      <form class="write-modal" @submit.prevent="inviteMember" @click.stop>
        <header><h2>멤버 초대</h2><button type="button" @click="inviteOpen = false">닫기</button></header>
        <input v-model="userKeyword" placeholder="이름, 부서/팀, 이메일 검색">
        <div class="participant-results">
          <button v-for="user in userCandidates" :key="user.userId" type="button" @click="inviteUserId = user.userId">
            <strong>{{ user.name }} <small>{{ user.position }}</small></strong>
            <span>{{ user.department || user.team || '-' }} · {{ user.email }}</span>
          </button>
        </div>
        <footer><button type="button" class="ghost-button" @click="inviteOpen = false">취소</button><button type="submit" class="primary-button small" :disabled="!inviteUserId">초대</button></footer>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { FileSpreadsheet, FileText, FileType2, FolderKanban, GitBranch, MoreHorizontal, Plus, Search, Upload } from '@lucide/vue'
import {
  addSharedWorkspaceFileVersion,
  changeSharedWorkspaceAudience,
  createSharedWorkspace,
  getSharedWorkspaceFileVersions,
  getSharedWorkspaceFiles,
  getSharedWorkspaceMembers,
  getSharedWorkspaces,
  inviteSharedWorkspaceMember,
  removeSharedWorkspaceMember,
  uploadSharedWorkspaceFile,
} from '../../lib/shared-workspace'
import { getUserSummary, searchUsers } from '../../lib/users'
import { formatKstDateTime } from '../../utils/dateTime'

const spaces = ref([])
const activeSpaceId = ref('')
const filesBySpace = ref(new Map())
const files = ref([])
const members = ref([])
const versions = ref([])
const keyword = ref('')
const openDoc = ref(null)
const createOpen = ref(false)
const uploadOpen = ref(false)
const inviteOpen = ref(false)
const uploadInput = ref(null)
const spaceDraft = ref({ name: '', description: '' })
const uploadDraft = ref({ mode: 'new', file: null, newVersion: '', changeMemo: '' })
const userKeyword = ref('')
const userCandidates = ref([])
const inviteUserId = ref('')
const userMap = ref(new Map())
const errorMessage = ref('')

const activeSpace = computed(() => spaces.value.find((space) => space.workspaceId === activeSpaceId.value))
const filteredFiles = computed(() => files.value.filter((file) => !keyword.value.trim() || file.originalFileName.toLowerCase().includes(keyword.value.trim().toLowerCase())))

watch(userKeyword, async () => {
  const data = await searchUsers({ keyword: userKeyword.value, size: 8 }).catch(() => ({ items: [] }))
  userCandidates.value = data.items || []
})

onMounted(loadSpaces)

async function loadSpaces() {
  errorMessage.value = ''
  try {
    spaces.value = await getSharedWorkspaces()
    await Promise.all(spaces.value.map((space) => loadFilesForSpace(space.workspaceId, false)))
    if (!activeSpaceId.value && spaces.value[0]) await selectSpace(spaces.value[0].workspaceId)
  } catch (error) {
    errorMessage.value = error?.message || '공유 워크스페이스를 불러오지 못했습니다.'
  }
}

async function selectSpace(spaceId) {
  activeSpaceId.value = spaceId
  files.value = await loadFilesForSpace(spaceId, true)
  members.value = await getSharedWorkspaceMembers(spaceId)
  await Promise.all([...members.value.map((member) => member.userId), ...files.value.map((file) => file.uploaderUserId)].map(cacheUser))
}

async function loadFilesForSpace(spaceId, useCache) {
  if (useCache && filesBySpace.value.has(spaceId)) return filesBySpace.value.get(spaceId)
  const loaded = await getSharedWorkspaceFiles(spaceId)
  filesBySpace.value = new Map(filesBySpace.value).set(spaceId, loaded)
  return loaded
}

async function openFile(file) {
  openDoc.value = file
  versions.value = await getSharedWorkspaceFileVersions(activeSpaceId.value, file.fileId)
  await Promise.all(versions.value.map((version) => cacheUser(version.uploaderUserId)))
}

function closeDrawer() {
  openDoc.value = null
  versions.value = []
}

function openCreate() {
  spaceDraft.value = { name: '', description: '' }
  createOpen.value = true
}

async function createSpace() {
  if (!spaceDraft.value.name.trim()) return
  errorMessage.value = ''
  try {
    const created = await createSharedWorkspace({
      name: spaceDraft.value.name.trim(),
      description: spaceDraft.value.description.trim(),
    })
    spaces.value.unshift(created)
    createOpen.value = false
    await selectSpace(created.workspaceId)
  } catch (error) {
    errorMessage.value = error?.message || '공유 스페이스 생성에 실패했습니다.'
  }
}

function openUpload() {
  uploadDraft.value = {
    mode: openDoc.value ? 'version' : 'new',
    file: null,
    newVersion: nextVersion(openDoc.value?.currentVersion || 'v1.0'),
    changeMemo: '',
  }
  uploadOpen.value = true
}

function openVersionUpload() {
  uploadDraft.value = {
    mode: 'version',
    file: null,
    newVersion: nextVersion(openDoc.value?.currentVersion || 'v1.0'),
    changeMemo: '',
  }
  uploadOpen.value = true
}

async function submitUpload() {
  if (!activeSpaceId.value || !uploadDraft.value.file) return
  if (uploadDraft.value.mode === 'version' && openDoc.value) {
    await addSharedWorkspaceFileVersion(activeSpaceId.value, openDoc.value.fileId, {
      file: uploadDraft.value.file,
      expectedCurrentVersion: openDoc.value.currentVersion,
      newVersion: uploadDraft.value.newVersion.trim(),
      changeMemo: uploadDraft.value.changeMemo.trim(),
    })
  } else {
    await uploadSharedWorkspaceFile(activeSpaceId.value, uploadDraft.value.file)
  }
  uploadOpen.value = false
  filesBySpace.value.delete(activeSpaceId.value)
  await selectSpace(activeSpaceId.value)
  if (openDoc.value) {
    const refreshed = files.value.find((file) => file.fileId === openDoc.value.fileId)
    if (refreshed) await openFile(refreshed)
  }
}

async function inviteMember() {
  if (!activeSpaceId.value || !inviteUserId.value) return
  await inviteSharedWorkspaceMember(activeSpaceId.value, inviteUserId.value)
  inviteOpen.value = false
  inviteUserId.value = ''
  userKeyword.value = ''
  await selectSpace(activeSpaceId.value)
}

async function removeMember(userId) {
  await removeSharedWorkspaceMember(activeSpaceId.value, userId)
  await selectSpace(activeSpaceId.value)
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

function nextVersion(version) {
  const [major = '1', minor = '0'] = String(version).replace(/^v/i, '').split('.')
  return `v${Number(major) || 1}.${(Number(minor) || 0) + 1}`
}
</script>
