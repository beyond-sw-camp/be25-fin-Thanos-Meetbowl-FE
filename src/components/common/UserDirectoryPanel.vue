<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppSelect from './AppSelect.vue'
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUser,
  getAdminUsers,
  resetAdminUserPassword,
  searchAdminUserSuggestions,
  updateAdminUser,
} from '../../lib/admin-users'
import {
  getAdminAffiliates,
  getAdminDepartments,
  getAdminPositions,
  getAdminTeams,
} from '../../lib/admin-organizations'
import { useUserSuggestions } from '../../composables/useUserSuggestions.js'
import { getOrganizationUserSummary } from '../../lib/user-directory'
import { useAuthStore } from '../../stores/auth'
import ModalShell from './ModalShell.vue'
import Pagination from './Pagination.vue'

const props = defineProps({
  title: { type: String, default: '사용자 검색' },
  description: {
    type: String,
    default: '이름, 이메일, 로그인 ID로 사용자를 찾고 조직 요약 정보를 확인합니다.',
  },
  pageSize: { type: Number, default: 20 },
  editable: { type: Boolean, default: false },
})

defineExpose({
  openCreate,
})

const loading = ref(true)
const detailLoading = ref(false)
const editLoading = ref(false)
const saving = ref(false)
const deleteLoading = ref(false)
const resetPasswordLoading = ref(false)
const organizationLoading = ref(false)
const forbidden = ref(false)
const errorMessage = ref('')
const detailErrorMessage = ref('')
const actionError = ref('')
const successMessage = ref('')
const keyword = ref('')
const status = ref('ALL')
const pageNo = ref(1)
const totalPages = ref(1)
const totalElements = ref(0)
const users = ref([])
const detailOpen = ref(false)
const editOpen = ref(false)
const deleteConfirmOpen = ref(false)
const selectedUser = ref(null)
const editForm = ref(createEmptyForm())
const affiliates = ref([])
const departments = ref([])
const teams = ref([])
const positions = ref([])
const suggestionFieldRef = ref(null)

const {
  suggestions,
  suggestionLoading,
  suggestionError,
  activeSuggestionIndex,
  showSuggestionDropdown,
  selectSuggestion,
  setActiveSuggestion,
  closeSuggestions,
  handleSuggestionInput,
  handleSuggestionKeydown,
} = useUserSuggestions({
  keyword,
  rootRef: suggestionFieldRef,
  maxItems: 5,
  debounceMs: 250,
  fetchSuggestions: (trimmedKeyword) =>
    searchAdminUserSuggestions({
      keyword: trimmedKeyword,
      size: 5,
    }),
})

let keywordSearchTimer = null
const auth = useAuthStore()

const statusFilterOptions = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
]

const hasUsers = computed(() => users.value.length > 0)
const isEditMode = computed(() => Boolean(editForm.value.userId))
const isEditingCurrentUser = computed(
  () => Boolean(editForm.value.userId) && editForm.value.userId === auth.user?.userId,
)

const availableAffiliates = computed(() =>
  filterActiveOrSelected(affiliates.value, editForm.value.affiliateId, 'affiliateId'),
)
const availableDepartments = computed(() =>
  filterActiveOrSelected(
    departments.value.filter((item) => !editForm.value.affiliateId || item.affiliateId === editForm.value.affiliateId),
    editForm.value.departmentId,
    'departmentId',
  ),
)
const availableTeams = computed(() =>
  filterActiveOrSelected(
    teams.value.filter((item) => !editForm.value.departmentId || item.departmentId === editForm.value.departmentId),
    editForm.value.teamId,
    'teamId',
  ),
)
const availablePositions = computed(() =>
  filterActiveOrSelected(positions.value, editForm.value.positionId, 'positionId'),
)

onMounted(() => {
  loadUsers()
})

onBeforeUnmount(() => {
  clearTimeout(keywordSearchTimer)
})

watch(pageNo, () => {
  loadUsers()
})

watch(keyword, () => {
  clearTimeout(keywordSearchTimer)

  if (pageNo.value !== 1) {
    pageNo.value = 1
    return
  }

  // 목록 조회도 debounce로 묶어 추천 검색과 타이밍을 맞춘다.
  keywordSearchTimer = setTimeout(() => {
    loadUsers()
  }, 250)
})

watch(status, () => {
  if (pageNo.value !== 1) {
    pageNo.value = 1
    return
  }

  loadUsers()
})

watch(
  () => editForm.value.affiliateId,
  (affiliateId, previousAffiliateId) => {
    if (affiliateId === previousAffiliateId) return

    const departmentStillValid = departments.value.some(
      (item) => item.departmentId === editForm.value.departmentId && item.affiliateId === affiliateId,
    )
    if (!departmentStillValid) editForm.value.departmentId = ''
  },
)

watch(
  () => editForm.value.departmentId,
  (departmentId, previousDepartmentId) => {
    if (departmentId === previousDepartmentId) return

    const teamStillValid = teams.value.some(
      (item) => item.teamId === editForm.value.teamId && item.departmentId === departmentId,
    )
    if (!teamStillValid) editForm.value.teamId = ''
  },
)

async function loadUsers() {
  loading.value = true
  forbidden.value = false
  errorMessage.value = ''
  actionError.value = ''

  try {
    const data = await getAdminUsers({
      keyword: keyword.value,
      status: status.value === 'ALL' ? '' : status.value,
      page: pageNo.value,
      size: props.pageSize,
    })

    const visibleUsers = (data?.items || [])
      .map(normalizeUserSummary)
      .filter((user) => user.role === 'USER' && user.loginId !== 'admin')
    users.value = visibleUsers
    totalPages.value = Number(data?.totalPages || 1)
    totalElements.value = Number(data?.totalElements || visibleUsers.length)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    errorMessage.value = error?.message || '사용자 검색 결과를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function applySuggestion(user) {
  keyword.value = user?.name || ''
  closeSuggestions()
}

async function openDetail(user) {
  detailOpen.value = true
  detailLoading.value = true
  selectedUser.value = null
  detailErrorMessage.value = ''

  try {
    const data = await getOrganizationUserSummary(user.userId)
    selectedUser.value = normalizeUserSummary(data)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      detailOpen.value = false
      return
    }

    detailErrorMessage.value = error?.message || '사용자 요약 정보를 불러오지 못했습니다.'
  } finally {
    detailLoading.value = false
  }
}

async function openCreate() {
  if (!props.editable) return
  // 생성 모달은 빈 폼으로 시작하고, 조직 옵션은 미리 준비해 둔다.
  actionError.value = ''
  successMessage.value = ''
  await loadOrganizationOptions()
  editForm.value = createEmptyForm()
  editOpen.value = true
}

async function openEdit(user) {
  if (!props.editable) return
  // 수정 모달은 상세 조회 후 받은 원본 데이터로 폼을 채운다.
  actionError.value = ''
  successMessage.value = ''
  editLoading.value = true
  editOpen.value = true

  try {
    await loadOrganizationOptions()
    const data = await getAdminUser(user.userId)
    editForm.value = createFormFromUser(data)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      editOpen.value = false
      return
    }

    actionError.value = error?.message || '사용자 수정 정보를 불러오지 못했습니다.'
    editOpen.value = false
  } finally {
    editLoading.value = false
  }
}

async function loadOrganizationOptions() {
  if (organizationLoading.value) return
  if (affiliates.value.length && departments.value.length && teams.value.length && positions.value.length) return

  organizationLoading.value = true

  try {
    const [affiliateData, departmentData, teamData, positionData] = await Promise.all([
      getAdminAffiliates(),
      getAdminDepartments(),
      getAdminTeams(),
      getAdminPositions(),
    ])

    affiliates.value = affiliateData?.items || []
    departments.value = departmentData?.items || []
    teams.value = teamData?.items || []
    positions.value = positionData?.items || []
  } finally {
    organizationLoading.value = false
  }
}

async function saveMember() {
  if (saving.value) return

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    if (editForm.value.userId) {
      const updated = await updateAdminUser(editForm.value.userId, buildUserUpdatePayload(editForm.value))
      const normalized = normalizeUserSummary(updated)
      users.value = users.value.map((item) => (item.userId === normalized.userId ? normalized : item))
      if (selectedUser.value?.userId === normalized.userId) {
        selectedUser.value = normalized
      }
      successMessage.value = '사용자 정보를 수정했습니다.'
    } else {
      const created = await createAdminUser(buildUserCreatePayload(editForm.value))
      const normalized = normalizeUserSummary(created?.user || created)

      if (pageNo.value !== 1) {
        pageNo.value = 1
        await loadUsers()
      } else {
        users.value = [normalized, ...users.value].slice(0, props.pageSize)
        totalElements.value += 1
        totalPages.value = Math.max(1, Math.ceil(totalElements.value / props.pageSize))
      }

      // BE가 내려준 temporaryPassword를 그대로 안내하되, 없더라도 초기 비밀번호 정책값 1234를 보여준다.
      successMessage.value = `계정이 생성되었습니다. 초기 비밀번호는 ${created?.temporaryPassword || '1234'}입니다.`
    }

    editOpen.value = false
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      editOpen.value = false
      return
    }

    actionError.value = error?.message || '사용자 저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

function openDeleteConfirm() {
  if (!isEditMode.value || deleteLoading.value || isEditingCurrentUser.value) return
  deleteConfirmOpen.value = true
}

function closeDeleteConfirm() {
  if (deleteLoading.value) return
  deleteConfirmOpen.value = false
}

async function handleDeleteMember() {
  if (!editForm.value.userId || deleteLoading.value) return

  deleteLoading.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    // 회원 삭제 API는 실제 hard delete가 아니라 비활성화 처리이므로 안내 문구와 성공 메시지를 동일 기준으로 맞춘다.
    await deleteAdminUser(editForm.value.userId)
    deleteConfirmOpen.value = false
    editOpen.value = false
    detailOpen.value = false
    successMessage.value = '회원이 삭제되었습니다.'
    // 삭제 성공 후에는 현재 필터/페이지 기준으로 목록을 다시 받아 비활성화 상태와 총 개수를 함께 동기화한다.
    await loadUsers()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      deleteConfirmOpen.value = false
      editOpen.value = false
      detailOpen.value = false
      return
    }

    actionError.value = formatActionError(error, '회원 삭제에 실패했습니다.')
  } finally {
    deleteLoading.value = false
  }
}

async function handleResetPassword(targetUser = selectedUser.value) {
  if (resetPasswordLoading.value || !targetUser?.userId) return

  // 초기화 결과가 항상 1234 정책으로 연결되므로 확인 문구도 고정값 기준으로 보여준다.
  const confirmed = window.confirm('해당 사용자의 비밀번호를 1234로 초기화하시겠습니까?')
  if (!confirmed) return

  resetPasswordLoading.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    const result = await resetAdminUserPassword(targetUser.userId)
    successMessage.value = `비밀번호가 ${result?.temporaryPassword || '1234'}로 초기화되었습니다.`
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      detailOpen.value = false
      editOpen.value = false
      return
    }

    actionError.value = error?.message || '비밀번호 초기화에 실패했습니다.'
  } finally {
    resetPasswordLoading.value = false
  }
}

function normalizeUserSummary(user) {
  return {
    userId: user?.userId || '',
    loginId: user?.loginId || '',
    name: user?.name || '-',
    email: user?.email || '-',
    affiliate: user?.affiliate || '-',
    department: user?.department || '-',
    team: user?.team || '-',
    position: user?.position || '-',
    role: `${user?.role || ''}`.toUpperCase(),
    status: `${user?.status || ''}`.toUpperCase(),
    activeFrom: user?.activeFrom || null,
    activeUntil: user?.activeUntil || null,
    affiliateId: user?.affiliateId || '',
    departmentId: user?.departmentId || '',
    teamId: user?.teamId || '',
    positionId: user?.positionId || '',
  }
}

function roleLabel(role) {
  return role === 'ADMIN' ? 'ADMIN' : role === 'USER' ? 'USER' : role || '-'
}

function statusLabel(value) {
  return value === 'ACTIVE' ? '활성' : value === 'INACTIVE' ? '비활성' : value || '-'
}

function createEmptyForm() {
  return {
    userId: '',
    loginId: '',
    name: '',
    email: '',
    role: 'USER',
    status: 'ACTIVE',
    affiliateId: '',
    departmentId: '',
    teamId: '',
    positionId: '',
    activeFrom: '',
    activeUntil: '',
  }
}

function createFormFromUser(user) {
  return {
    userId: user?.userId || '',
    loginId: user?.loginId || '',
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'USER',
    status: user?.status || 'ACTIVE',
    affiliateId: user?.affiliateId || '',
    departmentId: user?.departmentId || '',
    teamId: user?.teamId || '',
    positionId: user?.positionId || '',
    activeFrom: toDateInputValue(user?.activeFrom),
    activeUntil: toDateInputValue(user?.activeUntil),
  }
}

function buildUserCreatePayload(targetForm) {
  return {
    loginId: targetForm.loginId.trim(),
    ...buildSharedUserPayload(targetForm),
    status: targetForm.status,
  }
}

function buildUserUpdatePayload(targetForm) {
  return buildSharedUserPayload(targetForm)
}

function buildSharedUserPayload(targetForm) {
  return {
    name: targetForm.name.trim(),
    email: targetForm.email.trim(),
    role: targetForm.role,
    affiliateId: targetForm.affiliateId || null,
    departmentId: targetForm.departmentId || null,
    teamId: targetForm.teamId || null,
    positionId: targetForm.positionId || null,
    activeFrom: toInstantFromDateInput(targetForm.activeFrom),
    activeUntil: toInstantFromDateInput(targetForm.activeUntil),
  }
}

function toDateInputValue(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
}

function toInstantFromDateInput(value) {
  if (!value) return null
  return new Date(`${value}T00:00:00Z`).toISOString()
}

function filterActiveOrSelected(items, selectedId, idField) {
  return items.filter((item) => item.status === 'ACTIVE' || item[idField] === selectedId)
}

function formatActionError(error, fallbackMessage) {
  // 삭제 실패 시에는 BE message/details를 함께 합쳐 한 번에 보여 주고, 중복 문구는 제거한다.
  const messages = []
  const baseMessage = `${error?.message || fallbackMessage}`.trim()
  if (baseMessage) messages.push(baseMessage)

  if (Array.isArray(error?.details)) {
    for (const detail of error.details) {
      const reason = `${detail?.reason || ''}`.trim()
      if (reason && !messages.includes(reason)) {
        messages.push(reason)
      }
    }
  }

  return messages.join('\n') || fallbackMessage
}
</script>

<template>
  <article class="card directory-panel">
    <div class="directory-head">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <span class="badge navy">총 {{ totalElements }}명</span>
    </div>

    <div class="admin-toolbar directory-toolbar">
      <div ref="suggestionFieldRef" class="user-suggestion-field directory-search-field">
        <input
          v-model="keyword"
          @input="handleSuggestionInput"
          @compositionupdate="handleSuggestionInput"
          @compositionend="handleSuggestionInput"
          placeholder="이름, 로그인 ID, 이메일, 부서로 검색"
          @keydown="handleSuggestionKeydown($event, applySuggestion)"
        />
        <div v-if="showSuggestionDropdown" class="user-suggestion-dropdown">
          <div v-if="suggestionLoading" class="user-suggestion-status">검색 중...</div>
          <div v-else-if="suggestionError" class="user-suggestion-status">{{ suggestionError }}</div>
          <div v-else-if="!suggestions.length" class="user-suggestion-status">검색 결과가 없습니다.</div>
          <button
            v-for="(user, index) in suggestions"
            v-else
            :key="user.userId"
            type="button"
            class="user-suggestion-item"
            :class="{ active: activeSuggestionIndex === index }"
            @mouseenter="setActiveSuggestion(index)"
            @click="selectSuggestion(user, applySuggestion)"
          >
            <div class="user-suggestion-main">
              <strong>{{ user.name || '-' }}</strong>
              <span>{{ user.email || '-' }}</span>
              <!-- 관리자 회원 관리 화면에서만 로그인 ID를 노출한다. -->
              <small>{{ user.loginId || '-' }}</small>
              <small>{{ [user.affiliate, user.department, user.team, user.position].filter(Boolean).join(' · ') || '-' }}</small>
            </div>
            <span class="badge navy">{{ roleLabel(user.role) }}</span>
          </button>
        </div>
      </div>
      <div class="toolbar">
        <button
          v-for="option in statusFilterOptions"
          :key="option.value"
          class="chip"
          :class="{ active: status === option.value }"
          @click="status = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty-state">사용자 검색 결과를 불러오는 중입니다.</div>
    <div v-else-if="forbidden" class="empty-state">
      <h3>접근 권한 없음</h3>
      <p>이 기능을 사용할 수 있는 권한이 없습니다.</p>
    </div>
    <div v-else-if="errorMessage" class="error-box">{{ errorMessage }}</div>

    <template v-else>
      <div v-if="successMessage" class="settings-success" style="margin-bottom: 12px;">
        {{ successMessage }}
      </div>

      <div v-if="actionError" class="error-box action-feedback" style="margin-bottom: 12px;">
        {{ actionError }}
      </div>

      <div class="table-card admin-data-table directory-table">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>loginId</th>
              <th>이메일</th>
              <th>계열사</th>
              <th>부서</th>
              <th>팀</th>
              <th>직책</th>
              <th>권한</th>
              <th>상태</th>
              <th v-if="editable">액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!hasUsers">
              <td :colspan="editable ? 10 : 9"><div class="empty-state">검색 결과가 없습니다.</div></td>
            </tr>
            <tr v-for="user in users" :key="user.userId" class="directory-row" @click="openDetail(user)">
              <td><span class="table-avatar">{{ user.name?.[0] || '?' }}</span>{{ user.name }}</td>
              <td>{{ user.loginId }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.affiliate }}</td>
              <td>{{ user.department }}</td>
              <td>{{ user.team }}</td>
              <td>{{ user.position }}</td>
              <td>{{ roleLabel(user.role) }}</td>
              <td>
                <span :class="['badge', user.status === 'ACTIVE' ? 'success' : 'warning']">
                  {{ statusLabel(user.status) }}
                </span>
              </td>
              <td v-if="editable">
                <button class="icon-text" @click.stop="openEdit(user)">수정</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination v-model="pageNo" :total-pages="totalPages" />
    </template>

    <div v-if="detailOpen" class="modal-backdrop" @click.self="detailOpen = false">
      <article class="card write-modal detail-modal">
        <header>
          <div>
            <h2>{{ detailLoading ? '사용자 요약 조회 중' : selectedUser?.name || '-' }}</h2>
            <p v-if="!detailLoading">{{ selectedUser?.department || '-' }} · {{ selectedUser?.position || '-' }}</p>
          </div>
          <button @click="detailOpen = false">닫기</button>
        </header>

        <div v-if="detailLoading" class="empty-state">사용자 요약 정보를 불러오는 중입니다.</div>
        <div v-else-if="detailErrorMessage" class="error-box">{{ detailErrorMessage }}</div>
        <template v-else-if="selectedUser">
          <dl class="detail-list">
            <div><dt>이름</dt><dd>{{ selectedUser.name }}</dd></div>
            <div><dt>이메일</dt><dd>{{ selectedUser.email }}</dd></div>
            <div><dt>계열사</dt><dd>{{ selectedUser.affiliate }}</dd></div>
            <div><dt>부서</dt><dd>{{ selectedUser.department }}</dd></div>
            <div><dt>팀</dt><dd>{{ selectedUser.team }}</dd></div>
            <div><dt>직책</dt><dd>{{ selectedUser.position }}</dd></div>
            <div><dt>권한</dt><dd>{{ roleLabel(selectedUser.role) }}</dd></div>
            <div><dt>상태</dt><dd>{{ statusLabel(selectedUser.status) }}</dd></div>
          </dl>
          <div class="modal-actions">
            <button
              type="button"
              class="secondary-button"
              :disabled="resetPasswordLoading"
              @click="handleResetPassword(selectedUser)"
            >
              {{ resetPasswordLoading ? '초기화 중...' : '비밀번호 초기화' }}
            </button>
            <button type="button" class="primary-button" @click="openEdit(selectedUser)">수정</button>
          </div>
        </template>
      </article>
    </div>

    <div v-if="editOpen" class="modal-backdrop" @click.self="editOpen = false">
      <article class="card write-modal admin-modal">
        <header>
          <div>
            <h2>{{ isEditMode ? '사용자 수정' : '회원 추가' }}</h2>
            <p>{{ editForm.loginId || '새 사용자 정보를 입력하세요.' }}</p>
          </div>
          <button @click="editOpen = false">닫기</button>
        </header>

        <div v-if="editLoading" class="empty-state">사용자 정보를 불러오는 중입니다.</div>
        <form v-else class="form-grid" @submit.prevent="saveMember">
          <label>
            로그인 ID
            <input
              v-model="editForm.loginId"
              :readonly="isEditMode"
              :disabled="isEditMode"
              :class="{ readonly: isEditMode }"
              required
            />
          </label>
          <label>
            이름
            <input v-model="editForm.name" required />
          </label>
          <label>
            이메일
            <input v-model="editForm.email" type="email" required />
          </label>
          <div class="form-row two">
            <label>
              권한
              <AppSelect v-model="editForm.role">
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </AppSelect>
            </label>
            <label v-if="!isEditMode">
              상태
              <AppSelect v-model="editForm.status">
                <option value="ACTIVE">활성</option>
                <option value="INACTIVE">비활성</option>
              </AppSelect>
            </label>
          </div>
          <div class="form-row two">
            <label>
              계열사
              <AppSelect v-model="editForm.affiliateId" :disabled="organizationLoading">
                <option value="">선택 안 함</option>
                <option v-for="affiliate in availableAffiliates" :key="affiliate.affiliateId" :value="affiliate.affiliateId">
                  {{ affiliate.name }}
                </option>
              </AppSelect>
            </label>
            <label>
              부서
              <AppSelect v-model="editForm.departmentId" :disabled="organizationLoading">
                <option value="">선택 안 함</option>
                <option v-for="department in availableDepartments" :key="department.departmentId" :value="department.departmentId">
                  {{ department.name }}
                </option>
              </AppSelect>
            </label>
          </div>
          <div class="form-row two">
            <label>
              팀
              <AppSelect v-model="editForm.teamId" :disabled="organizationLoading">
                <option value="">선택 안 함</option>
                <option v-for="team in availableTeams" :key="team.teamId" :value="team.teamId">
                  {{ team.name }}
                </option>
              </AppSelect>
            </label>
            <label>
              직책
              <AppSelect v-model="editForm.positionId" :disabled="organizationLoading">
                <option value="">선택 안 함</option>
                <option v-for="position in availablePositions" :key="position.positionId" :value="position.positionId">
                  {{ position.name }}
                </option>
              </AppSelect>
            </label>
          </div>
          <div class="form-row two">
            <label>
              활성 시작일
              <input v-model="editForm.activeFrom" type="date" />
            </label>
            <label>
              활성 종료일
              <input v-model="editForm.activeUntil" type="date" />
            </label>
          </div>
          <div v-if="isEditMode" class="settings-alert">
            비밀번호 초기화가 필요하면 아래 버튼을 눌러 1234로 초기화할 수 있습니다.
          </div>
          <div v-if="isEditMode && isEditingCurrentUser" class="settings-alert">
            현재 로그인한 관리자 계정은 삭제할 수 없습니다.
          </div>
          <div class="modal-actions">
            <button type="button" class="secondary-button" @click="editOpen = false">취소</button>
            <button
              v-if="isEditMode"
              type="button"
              class="danger-button"
              :disabled="saving || resetPasswordLoading || deleteLoading || isEditingCurrentUser"
              @click="openDeleteConfirm"
            >
              {{ deleteLoading ? '삭제 중...' : '회원 삭제' }}
            </button>
            <button
              v-if="isEditMode"
              type="button"
              class="secondary-button"
              :disabled="resetPasswordLoading || deleteLoading"
              @click="handleResetPassword(editForm)"
            >
              {{ resetPasswordLoading ? '초기화 중...' : '비밀번호 초기화' }}
            </button>
            <button class="primary-button" :disabled="saving || deleteLoading">
              {{ saving ? '저장 중...' : '저장' }}
            </button>
          </div>
        </form>
      </article>
    </div>

    <ModalShell v-if="deleteConfirmOpen" modal-class="delete-confirm-modal" @close="closeDeleteConfirm">
      <header>
        <h2>회원 삭제</h2>
        <button type="button" @click="closeDeleteConfirm">닫기</button>
      </header>

      <div class="delete-confirm-body">
        <!-- 회원 삭제 확인 모달은 실제 동작이 비활성화 처리라는 점을 공통 문구로 명확히 안내한다. -->
        <p>정말 이 회원을 삭제하시겠습니까?</p>
        <p>삭제 후 해당 회원은 비활성화되며 더 이상 로그인할 수 없습니다.</p>
        <p class="delete-confirm-target">{{ editForm.name || editForm.loginId || '-' }}</p>
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary-button" :disabled="deleteLoading" @click="closeDeleteConfirm">
          취소
        </button>
        <button type="button" class="danger-button" :disabled="deleteLoading" @click="handleDeleteMember">
          {{ deleteLoading ? '삭제 중...' : '회원 삭제' }}
        </button>
      </div>
    </ModalShell>
  </article>
</template>

<style scoped>
.directory-panel {
  display: grid;
  gap: 16px;
}

.directory-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.directory-head h2 {
  margin-bottom: 0;
}

.directory-head p {
  margin: 6px 0 0;
  color: var(--muted-foreground);
  font-size: 13px;
}

.directory-toolbar {
  margin-bottom: 0;
}

.directory-search-field {
  flex: 1 1 320px;
}

.directory-table {
  margin-top: 0;
}

.action-feedback {
  white-space: pre-line;
}

.delete-confirm-modal {
  max-width: 520px;
}

.delete-confirm-body {
  display: grid;
  gap: 10px;
  margin: 16px 0 20px;
}

.delete-confirm-body p {
  margin: 0;
  line-height: 1.6;
}

.delete-confirm-target {
  color: var(--muted-foreground);
  font-size: 13px;
}

.directory-row {
  cursor: pointer;
}

@media (max-width: 959px) {
  .directory-head {
    flex-direction: column;
  }

  .directory-head-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
