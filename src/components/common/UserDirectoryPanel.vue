<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Building2, CircleUserRound, Search, UserCheck, UserX } from '@lucide/vue'
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
import { adminUserStatusLabel, adminUserStatusTone, resolveAdminUserStatus } from '../../lib/admin-user-status.js'
import {
  getAdminAffiliates,
  getAdminDepartments,
  getAdminPositions,
  getAdminTeams,
} from '../../lib/admin-organizations'
import { useUserSuggestions } from '../../composables/useUserSuggestions.js'
import { useAuthStore } from '../../stores/auth'
import ModalShell from './ModalShell.vue'
import Pagination from './Pagination.vue'

const props = defineProps({
  title: { type: String, default: '사용자 검색' },
  description: {
    type: String,
    default: '',
  },
  pageSize: { type: Number, default: 20 },
  editable: { type: Boolean, default: false },
})

const DEFAULT_ACTIVE_UNTIL = '2999-12-31'

defineExpose({
  openCreate,
})

const loading = ref(true)
const hasLoadedUsers = ref(false)
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
const currentAdminAffiliateId = computed(() => auth.user?.affiliateId || auth.user?.organizationId || '')
const uniqueDepartmentCount = computed(() =>
  new Set(
    users.value
      .map((user) => user.department)
      .filter((department) => department && department !== '-'),
  ).size,
)
const summaryCards = computed(() => [
  {
    label: '전체 회원 수',
    value: `${totalElements.value}명`,
    description: '전체 등록된 회원 수',
    icon: CircleUserRound,
    tone: 'orange',
  },
  {
    label: '활성 회원',
    value: `${users.value.filter((user) => user.status === 'ACTIVE').length}명`,
    description: '현재 활성 상태의 회원 수',
    icon: UserCheck,
    tone: 'green',
  },
  {
    label: '비활성 회원',
    value: `${users.value.filter((user) => user.status === 'INACTIVE').length}명`,
    description: '현재 비활성 상태의 회원 수',
    icon: UserX,
    tone: 'slate',
  },
  {
    label: '소속 부서 수',
    value: `${uniqueDepartmentCount.value}개`,
    description: '등록된 부서 기준',
    icon: Building2,
    tone: 'blue',
  },
])

const availableAffiliates = computed(() => {
  if (!isEditMode.value && currentAdminAffiliateId.value) {
    return affiliates.value.filter((item) => item.affiliateId === currentAdminAffiliateId.value)
  }

  return filterActiveOrSelected(affiliates.value, editForm.value.affiliateId, 'affiliateId')
})
const availableDepartments = computed(() =>
  filterActiveOrSelected(
    departments.value.filter((item) => !editForm.value.affiliateId || item.affiliateId === editForm.value.affiliateId),
    editForm.value.departmentId,
    'departmentId',
  ),
)
const availableTeams = computed(() => {
  if (!editForm.value.departmentId) return []

  return filterActiveOrSelected(
    teams.value.filter((item) => item.departmentId === editForm.value.departmentId),
    editForm.value.teamId,
    'teamId',
  )
})
const availablePositions = computed(() =>
  filterActiveOrSelected(
    positions.value.filter((item) => !editForm.value.affiliateId || item.affiliateId === editForm.value.affiliateId),
    editForm.value.positionId,
    'positionId',
  ),
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
  const showLoading = !hasLoadedUsers.value
  loading.value = showLoading
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

    const nextTotalPages = Math.max(1, Number(data?.totalPages || 1))
    totalPages.value = nextTotalPages
    totalElements.value = Number(data?.totalElements || 0)

    // 삭제나 상태 변경으로 현재 페이지 구성이 바뀌면 마지막 유효 페이지를 다시 조회한다.
    if (pageNo.value > nextTotalPages) {
      pageNo.value = nextTotalPages
      return
    }

    users.value = (data?.items || []).map(normalizeUserSummary)

    const visibleUsers = (data?.items || [])
      .map(normalizeUserSummary)
      .filter((user) => user.role === 'USER' && user.loginId !== 'admin')
    users.value = visibleUsers
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    errorMessage.value = error?.message || '사용자 검색 결과를 불러오지 못했습니다.'
  } finally {
    loading.value = false
    hasLoadedUsers.value = true
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
    const data = await getAdminUser(user.userId)
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
  editForm.value.affiliateId = auth.user?.affiliateId || availableAffiliates.value[0]?.affiliateId || ''
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
      await updateAdminUser(editForm.value.userId, buildUserUpdatePayload(editForm.value))
      // 수정 저장 후에는 현재 검색어/필터/페이지 기준으로 목록을 다시 받아 badge 상태를 BE 응답과 맞춘다.
      await loadUsers()

      if (selectedUser.value?.userId === editForm.value.userId) {
        selectedUser.value = normalizeUserSummary(await getAdminUser(editForm.value.userId))
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
    selectedUser.value = null
    successMessage.value = '회원이 삭제되었습니다.'
    // 삭제 성공 후에는 현재 필터/페이지 기준으로 목록을 다시 받아 비활성화 상태와 총 개수를 함께 동기화한다.
    // 삭제 후에도 현재 검색어/필터/페이지 조건은 유지한 채 목록만 최신화한다.
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
    // 상태 badge source of truth는 BE가 계산한 최종 status다.
    status: resolveAdminUserStatus(user),
    activeFrom: user?.activeFrom || user?.activeStartDate || null,
    activeUntil: user?.activeUntil || user?.activeEndDate || null,
    createdAt: user?.createdAt || null,
    updatedAt: user?.updatedAt || null,
    initialPasswordChangeRequired: Boolean(user?.initialPasswordChangeRequired),
    affiliateId: user?.affiliateId || '',
    departmentId: user?.departmentId || '',
    teamId: user?.teamId || '',
    positionId: user?.positionId || '',
  }
}

function roleLabel(role) {
  return role === 'ADMIN' ? 'ADMIN' : role === 'USER' ? 'USER' : role || '-'
}

function displayStatusLabel(value) {
  return adminUserStatusLabel(value)
}

function displayStatusTone(value) {
  return adminUserStatusTone(value)
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
    activeFrom: getTodayDateInputValue(),
    activeUntil: DEFAULT_ACTIVE_UNTIL,
    createdAt: getTodayDateInputValue(),
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
    activeFrom: toDateInputValue(user?.activeFrom || user?.activeStartDate),
    activeUntil: toDateInputValue(user?.activeUntil || user?.activeEndDate),
    createdAt: toDateInputValue(user?.createdAt),
  }
}

function buildUserCreatePayload(targetForm) {
  return {
    loginId: targetForm.loginId.trim(),
    ...buildSharedUserPayload({
      ...targetForm,
      affiliateId: currentAdminAffiliateId.value || availableAffiliates.value[0]?.affiliateId || '',
    }),
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
    ...(isEditMode.value
      ? { affiliateId: targetForm.affiliateId || currentAdminAffiliateId.value || null }
      : {}),
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

function formatDisplayDate(value) {
  const normalized = toDateInputValue(value)
  if (!normalized) return '-'

  const [year, month, day] = normalized.split('-')
  return `${year}.${month}.${day}`
}

function getTodayDateInputValue() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000)
  return localDate.toISOString().slice(0, 10)
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
  <section class="directory-panel">
    <div v-if="!loading && !forbidden && !errorMessage" class="metric-grid directory-metric-grid">
      <article v-for="card in summaryCards" :key="card.label" class="metric-card directory-metric-card">
        <div :class="['directory-metric-icon', `tone-${card.tone}`]">
          <component :is="card.icon" :size="22" />
        </div>
        <div class="directory-metric-copy">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <em>{{ card.description }}</em>
        </div>
      </article>
    </div>

    <article class="card directory-shell">
      <div class="directory-head">
        <div>
          <h2>{{ title }}</h2>
          <p v-if="description">{{ description }}</p>
        </div>
        <span class="badge navy">총 {{ totalElements }}명</span>
      </div>

      <div class="directory-toolbar-row">
        <div ref="suggestionFieldRef" class="user-suggestion-field directory-search-field">
          <Search :size="18" class="directory-search-icon" />
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
                <small>{{ user.loginId || '-' }}</small>
                <small>{{ [user.affiliate, user.department, user.team, user.position].filter(Boolean).join(' · ') || '-' }}</small>
              </div>
              <span class="badge navy">{{ roleLabel(user.role) }}</span>
            </button>
          </div>
        </div>
        <div class="toolbar directory-status-toolbar">
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
        <div v-if="successMessage" class="settings-success directory-feedback">
          {{ successMessage }}
        </div>

        <div v-if="actionError" class="error-box action-feedback directory-feedback">
          {{ actionError }}
        </div>

        <div class="table-card admin-data-table directory-table">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>loginId</th>
                <th>이메일</th>
                <th>부서</th>
                <th>팀</th>
                <th>직급</th>
                <th>권한</th>
                <th>상태</th>
              <th v-if="editable">액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!hasUsers">
              <td :colspan="editable ? 9 : 8"><div class="empty-state">검색 결과가 없습니다.</div></td>
            </tr>
            <tr v-for="user in users" :key="user.userId" class="directory-row" @click="openDetail(user)">
              <td><span class="table-avatar">{{ user.name?.[0] || '?' }}</span>{{ user.name }}</td>
              <td>{{ user.loginId }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.department }}</td>
              <td>{{ user.team }}</td>
              <td>{{ user.position }}</td>
              <td>{{ roleLabel(user.role) }}</td>
              <td>
                <span :class="['badge', 'directory-status-badge', displayStatusTone(user.status)]">
                  {{ displayStatusLabel(user.status) }}
                </span>
              </td>
              <td v-if="editable">
                <div class="directory-action-group">
                  <button class="icon-text directory-action-link muted" @click.stop="openDetail(user)">상세 보기</button>
                  <span>|</span>
                  <button class="icon-text directory-action-link" @click.stop="openEdit(user)">수정</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        <Pagination v-model="pageNo" :total-pages="totalPages" />
      </template>
    </article>

    <div v-if="detailOpen" class="modal-backdrop" @click.self="detailOpen = false">
      <article class="card write-modal detail-modal directory-detail-modal">
        <header class="directory-detail-modal__header">
          <div v-if="selectedUser" class="directory-detail-modal__profile">
            <div class="directory-detail-modal__avatar">{{ selectedUser.name?.[0] || '?' }}</div>
            <div class="directory-detail-modal__profile-copy">
              <h2>{{ detailLoading ? '사용자 요약 조회 중' : selectedUser.name || '-' }}</h2>
              <p v-if="!detailLoading">{{ selectedUser.department || '-' }} · {{ selectedUser.position || '-' }}</p>
            </div>
          </div>
          <div v-else class="directory-detail-modal__profile">
            <div class="directory-detail-modal__avatar">?</div>
            <div class="directory-detail-modal__profile-copy">
              <h2>사용자 요약 조회 중</h2>
            </div>
          </div>
          <button class="modal-close directory-detail-modal__close" type="button" @click="detailOpen = false">×</button>
        </header>

        <div v-if="detailLoading" class="empty-state">사용자 요약 정보를 불러오는 중입니다.</div>
        <div v-else-if="detailErrorMessage" class="error-box">{{ detailErrorMessage }}</div>
        <template v-else-if="selectedUser">
          <div class="detail-body directory-detail-modal__body">
            <section class="directory-detail-modal__section">
              <div class="directory-detail-modal__section-title">
                <span class="directory-detail-modal__section-icon directory-detail-modal__section-icon--account" aria-hidden="true"></span>
                <h3>계정 정보</h3>
              </div>
              <dl class="directory-detail-modal__info-card directory-detail-modal__info-card--two">
                <div class="directory-detail-modal__cell">
                  <dt>로그인 ID</dt>
                  <dd>{{ selectedUser.loginId }}</dd>
                </div>
                <div class="directory-detail-modal__cell">
                  <dt>이름</dt>
                  <dd>{{ selectedUser.name }}</dd>
                </div>
                <div class="directory-detail-modal__cell">
                  <dt>이메일</dt>
                  <dd>{{ selectedUser.email }}</dd>
                </div>
                <div class="directory-detail-modal__cell">
                  <dt>계열사</dt>
                  <dd>{{ selectedUser.affiliate || '-' }}</dd>
                </div>
              </dl>
            </section>

            <section class="directory-detail-modal__section">
              <div class="directory-detail-modal__section-title">
                <span class="directory-detail-modal__section-icon directory-detail-modal__section-icon--organization" aria-hidden="true"></span>
                <h3>조직 정보</h3>
              </div>
              <dl class="directory-detail-modal__info-card directory-detail-modal__info-card--two">
                <div class="directory-detail-modal__cell">
                  <dt>부서</dt>
                  <dd>{{ selectedUser.department || '-' }}</dd>
                </div>
                <div class="directory-detail-modal__cell">
                  <dt>팀</dt>
                  <dd>{{ selectedUser.team || '-' }}</dd>
                </div>
                <div class="directory-detail-modal__cell">
                  <dt>직책</dt>
                  <dd>{{ selectedUser.position || '-' }}</dd>
                </div>
                <div class="directory-detail-modal__cell">
                  <dt>권한</dt>
                  <dd>
                    <span class="directory-detail-modal__role-badge">{{ roleLabel(selectedUser.role) }}</span>
                  </dd>
                </div>
                <div class="directory-detail-modal__cell directory-detail-modal__cell--span-2">
                  <dt>상태</dt>
                  <dd>
                    <span :class="['badge', 'directory-status-badge', displayStatusTone(selectedUser.status)]">
                      {{ displayStatusLabel(selectedUser.status) }}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <section class="directory-detail-modal__section">
              <div class="directory-detail-modal__section-title">
                <span class="directory-detail-modal__section-icon directory-detail-modal__section-icon--history" aria-hidden="true"></span>
                <h3>계정 이력</h3>
              </div>
              <dl class="directory-detail-modal__info-card directory-detail-modal__info-card--two">
                <div class="directory-detail-modal__cell">
                  <dt>등록일</dt>
                  <dd>{{ formatDisplayDate(selectedUser.activeFrom) }}</dd>
                </div>
                <div class="directory-detail-modal__cell">
                  <dt>활성 시작일</dt>
                  <dd>{{ formatDisplayDate(selectedUser.activeFrom) }}</dd>
                </div>
                <div class="directory-detail-modal__cell">
                  <dt>비활성화일</dt>
                  <dd>{{ formatDisplayDate(selectedUser.activeUntil || DEFAULT_ACTIVE_UNTIL) }}</dd>
                </div>
                <div class="directory-detail-modal__cell">
                  <dt>최근 수정일</dt>
                  <dd>{{ formatDisplayDate(selectedUser.updatedAt) }}</dd>
                </div>
              </dl>
            </section>
          </div>
          <div class="modal-actions directory-detail-modal__actions">
            <button
              type="button"
              class="secondary-button small"
              :disabled="resetPasswordLoading"
              @click="handleResetPassword(selectedUser)"
            >
              {{ resetPasswordLoading ? '초기화 중...' : '비밀번호 초기화' }}
            </button>
            <button type="button" class="primary-button small" @click="openEdit(selectedUser)">수정</button>
          </div>
        </template>
      </article>
    </div>

    <ModalShell v-if="editOpen" modal-class="admin-modal admin-modal--wide" @close="editOpen = false">
      <header class="admin-modal-header">
        <div class="admin-modal-title">
          <h2>{{ isEditMode ? '사용자 수정' : '회원 추가' }}</h2>
          <p class="admin-modal-subtitle">{{ editForm.loginId || '새 사용자 정보를 입력하세요.' }}</p>
        </div>
        <button type="button" class="admin-modal-close" @click="editOpen = false">닫기</button>
      </header>

      <div v-if="editLoading" class="empty-state">사용자 정보를 불러오는 중입니다.</div>
      <form v-else class="admin-modal-form" @submit.prevent="saveMember">
        <div class="admin-modal-body">
          <p v-if="actionError" class="admin-modal-inline-error">{{ actionError }}</p>
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
              <AppSelect v-model="editForm.teamId" :disabled="organizationLoading || !editForm.departmentId">
                <option value="">선택 안 함</option>
                <option v-for="team in availableTeams" :key="team.teamId" :value="team.teamId">
                  {{ team.name }}
                </option>
              </AppSelect>
            </label>
            <label>
              직급
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
              등록일
              <input v-model="editForm.activeFrom" type="date" />
            </label>
            <label>
              비활성화일
              <input v-model="editForm.activeUntil" type="date" />
            </label>
          </div>
          <p v-if="isEditMode && isEditingCurrentUser" class="admin-modal-note">
            현재 로그인한 관리자 계정은 삭제할 수 없습니다.
          </p>
        </div>
        <footer class="admin-modal-footer">
          <div class="admin-modal-actions-left">
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
          </div>
          <div class="admin-modal-actions-right">
            <button type="button" class="secondary-button" @click="editOpen = false">취소</button>
            <button class="primary-button" :disabled="saving || deleteLoading">
              {{ saving ? '저장 중...' : '저장' }}
            </button>
          </div>
        </footer>
      </form>
    </ModalShell>

    <ModalShell v-if="deleteConfirmOpen" modal-class="delete-confirm-modal" @close="closeDeleteConfirm">
      <header>
        <h2>회원 삭제</h2>
        <button type="button" @click="closeDeleteConfirm">닫기</button>
      </header>

      <div class="delete-confirm-body">
        <p>정말 이 회원을 삭제하시겠습니까?</p>
        <p>삭제한 회원은 사용자 목록에서 더 이상 조회되지 않습니다. 삭제하시겠습니까?</p>
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
  </section>
</template>

<style scoped>
.directory-panel {
  display: grid;
  gap: 18px;
}

.directory-shell {
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 28px;
  background: linear-gradient(180deg, #ffffff 0%, #fffdfa 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
  padding: 28px;
}

.directory-metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 0;
}

.directory-metric-card {
  min-height: 116px;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #fffdfa 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
  padding: 18px 20px;
}

.directory-metric-icon {
  width: 54px;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.directory-metric-icon.tone-orange {
  background: linear-gradient(180deg, #fff2e8, #ffe3d0);
  color: #f97316;
}

.directory-metric-icon.tone-green {
  background: linear-gradient(180deg, #ecfdf5, #d1fae5);
  color: #16a34a;
}

.directory-metric-icon.tone-slate {
  background: linear-gradient(180deg, #f8fafc, #e2e8f0);
  color: #64748b;
}

.directory-metric-icon.tone-blue {
  background: linear-gradient(180deg, #eef4ff, #dbeafe);
  color: #2563eb;
}

.directory-metric-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.directory-metric-copy span {
  color: #475467;
  font-size: 13px;
  font-weight: 700;
}

.directory-metric-copy strong {
  font-size: 22px;
  letter-spacing: -0.03em;
}

.directory-metric-copy em {
  color: #667085;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
}

.directory-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.directory-head h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: -0.02em;
}

.directory-head p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.directory-head > .badge {
  min-height: 32px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 800;
}

.directory-toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.directory-search-field {
  flex: 1 1 520px;
  max-width: 760px;
}

.directory-search-icon {
  position: absolute;
  top: 50%;
  left: 16px;
  z-index: 1;
  color: #98a2b3;
  transform: translateY(-50%);
}

.directory-search-field :deep(input) {
  height: 42px;
  border-radius: 14px;
  padding: 0 16px 0 46px;
  font-size: 14px;
  box-shadow: none;
}

.directory-search-field :deep(input::placeholder) {
  color: #98a2b3;
  font-size: 14px;
}

.directory-status-toolbar {
  gap: 8px;
  justify-content: flex-end;
}

.directory-status-toolbar .chip {
  min-height: 40px;
  border-radius: 14px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 700;
}

.directory-status-toolbar .chip.active {
  border-color: rgba(249, 115, 22, 0.45);
  background: #fff3ea;
  color: var(--primary);
}

.directory-table {
  margin-top: 0;
  border-color: #eef2f7;
  border-radius: 22px;
  box-shadow: none;
}

.action-feedback {
  white-space: pre-line;
}

.directory-feedback {
  margin-bottom: 12px;
}

.directory-table :deep(table) {
  min-width: 1120px;
}

.directory-table :deep(th) {
  background: linear-gradient(180deg, #fbfcfe 0%, #f8fafc 100%);
  color: #667085;
  font-size: 13px;
  font-weight: 800;
}

.directory-table :deep(td) {
  padding-top: 14px;
  padding-bottom: 14px;
  vertical-align: middle;
}

.directory-row:hover {
  background: #fffaf5;
}

.directory-action-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #d0d5dd;
  white-space: nowrap;
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

.admin-modal {
  max-height: calc(100vh - 36px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.admin-modal .form-grid {
  display: grid;
  row-gap: 22px;
}

.admin-modal .form-row.two {
  gap: 14px;
}

.admin-modal label {
  gap: 8px;
  line-height: 1.35;
}

.admin-modal label > input,
.admin-modal label > .app-select-wrap {
  margin-top: 6px;
}

.admin-modal .modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-right: 6px;
}

.directory-row {
  cursor: pointer;
}

.directory-status-badge,
.directory-action-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.directory-status-badge {
  min-width: 74px;
  padding: 0 12px;
}

.directory-action-link {
  color: var(--primary-dark);
  transition: color 0.15s ease, text-decoration-color 0.15s ease;
}

.directory-action-link.muted {
  color: #667085;
}

.directory-action-link:hover {
  color: var(--primary);
  text-decoration: underline;
}

.directory-action-link:focus-visible {
  outline: 2px solid rgba(243, 115, 33, 0.22);
  outline-offset: 2px;
}

.directory-detail-modal {
  width: min(520px, calc(100vw - 24px));
  padding: 0;
  overflow: hidden;
  border-radius: 24px;
  box-shadow: 0 22px 56px rgba(15, 23, 42, 0.18);
}

.directory-detail-modal__header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  border-bottom: 1px solid var(--border);
  padding: 18px 20px;
}

.directory-detail-modal__profile {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.directory-detail-modal__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 1px solid rgba(243, 115, 33, 0.18);
  background: linear-gradient(180deg, #fff7f2 0%, #fff1e8 100%);
  color: var(--primary);
  font-size: 28px;
  font-weight: 800;
  flex: 0 0 auto;
}

.directory-detail-modal__profile-copy {
  min-width: 0;
}

.directory-detail-modal__header h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.14;
  letter-spacing: 0;
}

.directory-detail-modal__header p {
  margin: 6px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 600;
}

.directory-detail-modal__close {
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f8fafc;
  font-size: 24px;
  color: #667085;
}

.directory-detail-modal__body {
  padding: 16px 20px 0;
}

.directory-detail-modal__section + .directory-detail-modal__section {
  margin-top: 14px;
}

.directory-detail-modal__section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.directory-detail-modal__section-title h3 {
  margin: 0;
  font-size: 15px;
  line-height: 1.3;
}

.directory-detail-modal__section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  position: relative;
}

.directory-detail-modal__section-icon::before,
.directory-detail-modal__section-icon::after {
  content: '';
  position: absolute;
}

.directory-detail-modal__section-icon--account::before {
  top: 1px;
  width: 8px;
  height: 8px;
  border: 2px solid var(--primary);
  border-radius: 50%;
}

.directory-detail-modal__section-icon--account::after {
  bottom: 1px;
  width: 14px;
  height: 9px;
  border: 2px solid var(--primary);
  border-top: none;
  border-radius: 0 0 10px 10px;
}

.directory-detail-modal__section-icon--organization::before {
  left: 3px;
  bottom: 2px;
  width: 16px;
  height: 14px;
  border: 2px solid var(--primary);
  border-radius: 3px;
}

.directory-detail-modal__section-icon--organization::after {
  top: 3px;
  left: 7px;
  width: 3px;
  height: 11px;
  background:
    linear-gradient(var(--primary), var(--primary)) 0 0 / 3px 3px no-repeat,
    linear-gradient(var(--primary), var(--primary)) 0 4px / 3px 3px no-repeat,
    linear-gradient(var(--primary), var(--primary)) 0 8px / 3px 3px no-repeat;
}

.directory-detail-modal__section-icon--history::before {
  inset: 2px;
  border: 2px solid var(--primary);
  border-radius: 6px;
}

.directory-detail-modal__section-icon--history::after {
  top: 6px;
  left: 10px;
  width: 2px;
  height: 7px;
  background: var(--primary);
  transform-origin: bottom center;
  transform: rotate(45deg);
}

.directory-detail-modal__info-card {
  display: grid;
  overflow: hidden;
  border: 1px solid #e7edf5;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045);
}

.directory-detail-modal__info-card--two {
  grid-template-columns: 1fr;
}

.directory-detail-modal__cell {
  padding: 13px 14px;
  min-height: 0;
  border-bottom: 1px solid #e7edf5;
}

.directory-detail-modal__cell--span-2 {
  grid-column: auto;
}

.directory-detail-modal__cell dt {
  margin: 0;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
}

.directory-detail-modal__cell dd {
  margin: 6px 0 0;
  color: #101828;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-word;
}

.directory-detail-modal__role-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 10px;
  background: #fff1e8;
  color: var(--primary);
  font-size: 11px;
  font-weight: 800;
}

.directory-detail-modal__actions {
  padding: 14px 20px 18px;
  margin-top: 14px;
  border-top: 1px solid var(--border);
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 959px) {
  .directory-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .directory-head {
    flex-direction: column;
  }

  .directory-toolbar-row {
    flex-direction: column;
    align-items: stretch;
  }

  .directory-search-field {
    width: 100%;
  }

  .directory-detail-modal__header,
  .directory-detail-modal__body,
  .directory-detail-modal__actions {
    padding-left: 14px;
    padding-right: 14px;
  }

  .directory-detail-modal__header {
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .directory-detail-modal__profile {
    gap: 10px;
  }

  .directory-detail-modal__avatar {
    width: 64px;
    height: 64px;
    font-size: 26px;
  }

  .directory-detail-modal__header h2 {
    font-size: 20px;
  }

  .directory-detail-modal__header p {
    font-size: 12px;
  }
}

@media (max-width: 640px) {
  .directory-shell {
    padding: 20px;
    border-radius: 22px;
  }

  .directory-metric-grid {
    grid-template-columns: 1fr;
  }

  .directory-metric-card {
    grid-template-columns: 1fr;
  }

  .directory-detail-modal {
    width: min(100vw - 16px, 100%);
    border-radius: 22px;
  }

  .directory-detail-modal__header {
    gap: 16px;
    align-items: flex-start;
  }

  .directory-detail-modal__profile {
    flex-direction: column;
    align-items: flex-start;
  }

  .directory-detail-modal__cell {
    min-height: 0;
    padding: 12px 12px 13px;
  }

  .directory-detail-modal__cell dt {
    font-size: 12px;
  }

  .directory-detail-modal__cell dd {
    font-size: 13px;
  }

  .directory-detail-modal__actions {
    flex-direction: column-reverse;
  }

  .directory-detail-modal__actions > button {
    width: 100%;
  }
}
</style>
