<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  createAdminDepartment,
  createAdminPosition,
  createAdminTeam,
  getAdminAffiliates,
  getAdminDepartments,
  getAdminPositions,
  getAdminTeams,
  updateAdminDepartment,
  updateAdminDepartmentStatus,
  updateAdminPosition,
  updateAdminPositionStatus,
  updateAdminTeam,
  updateAdminTeamStatus,
} from '../../lib/admin-organizations'
import { getAllAdminUsers } from '../../lib/admin-users'
import { getOrganizationUserSummary } from '../../lib/user-directory'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
]

const TAB_OPTIONS = [
  { key: 'organization', label: '조직 관리' },
  { key: 'department', label: '부서 관리' },
  { key: 'team', label: '팀 관리' },
  { key: 'position', label: '직급 관리' },
]

const activeTab = ref('organization')
const loading = ref(true)
const saving = ref(false)
const forbidden = ref(false)
const errorMessage = ref('')
const actionError = ref('')
const successMessage = ref('')
const modalOpen = ref(false)
const editingItem = ref(null)
const userSummaryOpen = ref(false)
const userSummaryLoading = ref(false)
const userSummaryError = ref('')
const selectedUserSummary = ref(null)

const affiliates = ref([])
const departments = ref([])
const teams = ref([])
const positions = ref([])
const users = ref([])

const form = ref(createEmptyForm())

const isAdmin = computed(() => auth.user?.role === 'ADMIN')

const sortedAffiliates = computed(() => [...affiliates.value].sort(compareBySortOrderThenName))
const sortedPositions = computed(() => [...positions.value].sort(compareBySortOrderThenName))

const primaryAffiliate = computed(() => {
  if (!sortedAffiliates.value.length) return null

  // 조직 관리 첫 화면은 대표 계열사 1개를 기준으로 보여주되, 실제 데이터가 있는 계열사를 먼저 선택한다.
  const withDepartments = sortedAffiliates.value.find((affiliate) =>
    departments.value.some((department) => department.affiliateId === affiliate.affiliateId),
  )
  if (withDepartments) return withDepartments

  const withUsers = sortedAffiliates.value.find((affiliate) =>
    users.value.some((user) => user.affiliateId === affiliate.affiliateId),
  )
  return withUsers || sortedAffiliates.value[0]
})

const organizationDepartments = computed(() =>
  departments.value
    .filter(
      (department) =>
        !primaryAffiliate.value || department.affiliateId === primaryAffiliate.value.affiliateId,
    )
    .sort(compareBySortOrderThenName),
)

const availableAffiliates = computed(() =>
  affiliates.value
    .filter(
      (affiliate) =>
        affiliate.status === 'ACTIVE' || affiliate.affiliateId === form.value.affiliateId,
    )
    .sort(compareBySortOrderThenName),
)

const availableDepartments = computed(() =>
  departments.value
    .filter(
      (department) =>
        (!form.value.affiliateId || department.affiliateId === form.value.affiliateId) &&
        (department.status === 'ACTIVE' || department.departmentId === form.value.departmentId),
    )
    .sort(compareBySortOrderThenName),
)

const positionMap = computed(
  () => new Map(positions.value.map((position) => [position.positionId, position])),
)

const teamsByDepartmentId = computed(() => {
  const grouped = new Map()

  for (const team of teams.value) {
    const current = grouped.get(team.departmentId) || []
    current.push(team)
    grouped.set(team.departmentId, current)
  }

  for (const [departmentId, items] of grouped.entries()) {
    grouped.set(departmentId, [...items].sort(compareBySortOrderThenName))
  }

  return grouped
})

const usersByDepartmentId = computed(() => {
  const grouped = new Map()

  for (const user of users.value) {
    // 부서 미지정 사용자는 조직도에 억지로 끼워 넣지 않고 별도 미배정 상태로 둔다.
    if (!user.departmentId) continue
    const current = grouped.get(user.departmentId) || []
    current.push(user)
    grouped.set(user.departmentId, current)
  }

  for (const [departmentId, items] of grouped.entries()) {
    grouped.set(departmentId, [...items].sort(compareUsersForChart))
  }

  return grouped
})

const departmentSummaries = computed(() =>
  organizationDepartments.value.map((department) => {
    const departmentTeams = teamsByDepartmentId.value.get(department.departmentId) || []
    const departmentUsers = usersByDepartmentId.value.get(department.departmentId) || []
    // 조직도 카드가 너무 길어지지 않도록 미리보기는 4명까지만 노출하고 나머지는 수치로 접는다.
    const previewMembers = departmentUsers.slice(0, 4).map((user) => ({
      key: user.userId,
      userId: user.userId,
      label: `${user.name || '-'} · ${resolvePositionName(user.positionId, user.position)}`,
    }))

    return {
      ...department,
      userCount: departmentUsers.length,
      teamCount: departmentTeams.length,
      teamSummary: departmentTeams.length
        ? departmentTeams.map((team) => team.name).join(' · ')
        : '하위 팀이 없습니다.',
      previewMembers,
      remainingMemberCount: Math.max(departmentUsers.length - previewMembers.length, 0),
      hasMembers: departmentUsers.length > 0,
    }
  }),
)

const departmentRows = computed(() =>
  departments.value
    .map((department) => {
      const departmentTeams = teamsByDepartmentId.value.get(department.departmentId) || []
      return {
        ...department,
        affiliateName: findAffiliateName(department.affiliateId),
        userCount: (usersByDepartmentId.value.get(department.departmentId) || []).length,
        teamSummary: departmentTeams.length
          ? departmentTeams.map((team) => team.name).join(' · ')
          : '-',
      }
    })
    .sort(compareBySortOrderThenName),
)

const teamRows = computed(() =>
  teams.value
    .map((team) => {
      const department = departments.value.find((item) => item.departmentId === team.departmentId) || null
      return {
        ...team,
        departmentName: department?.name || '-',
        affiliateName: findAffiliateName(department?.affiliateId),
        userCount: users.value.filter((user) => user.teamId === team.teamId).length,
      }
    })
    .sort(compareBySortOrderThenName),
)

const positionRows = computed(() =>
  sortedPositions.value.map((position) => ({
    ...position,
    userCount: users.value.filter((user) => user.positionId === position.positionId).length,
  })),
)

watch(
  () => form.value.affiliateId,
  (affiliateId, previousAffiliateId) => {
    if (affiliateId === previousAffiliateId || activeTab.value !== 'team') return
    // 계열사를 바꾸면 기존 부서 선택이 다른 계열사 소속일 수 있어, 유효한 값만 유지한다.
    if (availableDepartments.value.some((department) => department.departmentId === form.value.departmentId)) return
    form.value.departmentId = ''
  },
)

onMounted(() => {
  loadPage()
})

async function loadPage() {
  if (!isAdmin.value) {
    forbidden.value = true
    loading.value = false
    return
  }

  loading.value = true
  await reloadAllData()
  loading.value = false
}

async function reloadAllData() {
  forbidden.value = false
  errorMessage.value = ''

  try {
    // 화면이 참조하는 기준 데이터가 서로 맞물리므로 같은 시점의 스냅샷으로 한 번에 새로고침한다.
    const [affiliateData, departmentData, teamData, positionData, userData] = await Promise.all([
      getAdminAffiliates(),
      getAdminDepartments(),
      getAdminTeams(),
      getAdminPositions(),
      getAllAdminUsers({ size: 100 }),
    ])

    affiliates.value = (affiliateData?.items || []).map(normalizeAffiliate)
    departments.value = (departmentData?.items || []).map(normalizeDepartment)
    teams.value = (teamData?.items || []).map(normalizeTeam)
    positions.value = (positionData?.items || []).map(normalizePosition)
    users.value = (userData?.items || []).map(normalizeUser)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    errorMessage.value =
      error?.message || '조직/직급 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

function switchTab(tabKey) {
  activeTab.value = tabKey
  actionError.value = ''
  successMessage.value = ''
  modalOpen.value = false
}

function openCreateModal() {
  editingItem.value = null
  actionError.value = ''
  successMessage.value = ''
  form.value = createEmptyForm()

  if (activeTab.value === 'organization' || activeTab.value === 'department' || activeTab.value === 'team') {
    form.value.affiliateId =
      primaryAffiliate.value?.affiliateId || availableAffiliates.value[0]?.affiliateId || ''
  }

  modalOpen.value = true
}

function openEditModal(item) {
  editingItem.value = item
  actionError.value = ''
  successMessage.value = ''

  if (activeTab.value === 'organization' || activeTab.value === 'department') {
    form.value = {
      name: item.name || '',
      code: item.code || '',
      sortOrder: item.sortOrder ?? 0,
      status: item.status || 'ACTIVE',
      affiliateId: item.affiliateId || '',
      departmentId: '',
    }
    modalOpen.value = true
    return
  }

  if (activeTab.value === 'team') {
    const department = departments.value.find((candidate) => candidate.departmentId === item.departmentId)

    form.value = {
      name: item.name || '',
      code: item.code || '',
      sortOrder: item.sortOrder ?? 0,
      status: item.status || 'ACTIVE',
      affiliateId: department?.affiliateId || '',
      departmentId: item.departmentId || '',
    }
    modalOpen.value = true
    return
  }

  form.value = {
    name: item.name || '',
    code: item.code || '',
    sortOrder: item.sortOrder ?? 0,
    status: item.status || 'ACTIVE',
    affiliateId: '',
    departmentId: '',
  }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  saving.value = false
}

async function saveItem() {
  if (saving.value) return

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    if (activeTab.value === 'organization' || activeTab.value === 'department') {
      // 현재 "조직 관리" 탭은 대표 계열사 관점의 부서 뷰이므로 실제 저장 대상은 department 마스터다.
      const payload = {
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        status: form.value.status,
        sortOrder: normalizeSortOrder(form.value.sortOrder),
        affiliateId: form.value.affiliateId,
      }

      if (editingItem.value?.departmentId) {
        await updateAdminDepartment(editingItem.value.departmentId, payload)
        successMessage.value = '부서 정보를 수정했습니다.'
      } else {
        await createAdminDepartment(payload)
        successMessage.value = '부서를 추가했습니다.'
      }
    } else if (activeTab.value === 'team') {
      const payload = {
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        status: form.value.status,
        sortOrder: normalizeSortOrder(form.value.sortOrder),
        departmentId: form.value.departmentId,
      }

      if (editingItem.value?.teamId) {
        await updateAdminTeam(editingItem.value.teamId, payload)
        successMessage.value = '팀 정보를 수정했습니다.'
      } else {
        await createAdminTeam(payload)
        successMessage.value = '팀을 추가했습니다.'
      }
    } else {
      const payload = {
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        status: form.value.status,
        sortOrder: normalizeSortOrder(form.value.sortOrder),
      }

      if (editingItem.value?.positionId) {
        await updateAdminPosition(editingItem.value.positionId, payload)
        successMessage.value = '직급 정보를 수정했습니다.'
      } else {
        await createAdminPosition(payload)
        successMessage.value = '직급을 추가했습니다.'
      }
    }

    closeModal()
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeModal()
      return
    }

    actionError.value = error?.message || '저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function changeStatus(item) {
  const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

  actionError.value = ''
  successMessage.value = ''

  try {
    if (activeTab.value === 'organization' || activeTab.value === 'department') {
      await updateAdminDepartmentStatus(item.departmentId, nextStatus)
      successMessage.value = `부서를 ${nextStatus === 'ACTIVE' ? '활성화' : '비활성화'}했습니다.`
    } else if (activeTab.value === 'team') {
      await updateAdminTeamStatus(item.teamId, nextStatus)
      successMessage.value = `팀을 ${nextStatus === 'ACTIVE' ? '활성화' : '비활성화'}했습니다.`
    } else {
      await updateAdminPositionStatus(item.positionId, nextStatus)
      successMessage.value = `직급을 ${nextStatus === 'ACTIVE' ? '활성화' : '비활성화'}했습니다.`
    }

    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    actionError.value = error?.message || '상태 변경에 실패했습니다.'
  }
}

async function openUserSummary(userId) {
  userSummaryOpen.value = true
  userSummaryLoading.value = true
  userSummaryError.value = ''
  selectedUserSummary.value = null

  try {
    selectedUserSummary.value = normalizeUserSummary(await getOrganizationUserSummary(userId))
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      userSummaryOpen.value = false
      return
    }

    userSummaryError.value = error?.message || '회원 요약 정보를 불러오지 못했습니다.'
  } finally {
    userSummaryLoading.value = false
  }
}

function createEmptyForm() {
  return {
    name: '',
    code: '',
    sortOrder: 1,
    status: 'ACTIVE',
    affiliateId: '',
    departmentId: '',
  }
}

function normalizeAffiliate(item) {
  return {
    affiliateId: item?.affiliateId || '',
    name: item?.name || '-',
    code: item?.code || '',
    status: normalizeStatus(item?.status),
    sortOrder: item?.sortOrder ?? null,
  }
}

function normalizeDepartment(item) {
  return {
    departmentId: item?.departmentId || '',
    affiliateId: item?.affiliateId || '',
    name: item?.name || '-',
    code: item?.code || '',
    status: normalizeStatus(item?.status),
    sortOrder: item?.sortOrder ?? null,
  }
}

function normalizeTeam(item) {
  return {
    teamId: item?.teamId || '',
    departmentId: item?.departmentId || '',
    name: item?.name || '-',
    code: item?.code || '',
    status: normalizeStatus(item?.status),
    sortOrder: item?.sortOrder ?? null,
  }
}

function normalizePosition(item) {
  return {
    positionId: item?.positionId || '',
    name: item?.name || '-',
    code: item?.code || '',
    status: normalizeStatus(item?.status),
    sortOrder: item?.sortOrder ?? null,
  }
}

function normalizeUser(item) {
  return {
    userId: item?.userId || '',
    name: item?.name || '-',
    affiliateId: item?.affiliateId || '',
    departmentId: item?.departmentId || '',
    teamId: item?.teamId || '',
    positionId: item?.positionId || '',
    position: item?.position || '-',
  }
}

function normalizeUserSummary(item) {
  return {
    userId: item?.userId || '',
    loginId: item?.loginId || '',
    name: item?.name || '-',
    email: item?.email || '-',
    affiliate: item?.affiliate || '-',
    department: item?.department || '-',
    team: item?.team || '-',
    position: item?.position || '-',
    role: `${item?.role || ''}`.toUpperCase(),
    status: `${item?.status || ''}`.toUpperCase(),
  }
}

function normalizeStatus(status) {
  return `${status || ''}`.toUpperCase() || 'INACTIVE'
}

function normalizeSortOrder(value) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

function compareBySortOrderThenName(left, right) {
  const leftOrder =
    Number.isFinite(Number(left?.sortOrder)) ? Number(left.sortOrder) : Number.MAX_SAFE_INTEGER
  const rightOrder =
    Number.isFinite(Number(right?.sortOrder)) ? Number(right.sortOrder) : Number.MAX_SAFE_INTEGER

  if (leftOrder !== rightOrder) return leftOrder - rightOrder
  return `${left?.name || ''}`.localeCompare(`${right?.name || ''}`, 'ko')
}

function compareUsersForChart(left, right) {
  const leftOrder = findPositionSortOrder(left.positionId)
  const rightOrder = findPositionSortOrder(right.positionId)

  if (leftOrder !== rightOrder) return leftOrder - rightOrder
  return `${left?.name || ''}`.localeCompare(`${right?.name || ''}`, 'ko')
}

function findPositionSortOrder(positionId) {
  const position = positionMap.value.get(positionId)
  return Number.isFinite(Number(position?.sortOrder))
    ? Number(position.sortOrder)
    : Number.MAX_SAFE_INTEGER
}

function findAffiliateName(affiliateId) {
  return affiliates.value.find((affiliate) => affiliate.affiliateId === affiliateId)?.name || '-'
}

function resolvePositionName(positionId, fallbackName = '-') {
  return positionMap.value.get(positionId)?.name || fallbackName || '-'
}

function statusLabel(status) {
  return status === 'ACTIVE' ? '활성' : status === 'INACTIVE' ? '비활성' : '-'
}

function actionLabel() {
  if (activeTab.value === 'organization' || activeTab.value === 'department') return '부서'
  if (activeTab.value === 'team') return '팀'
  return '직급'
}

function createButtonLabel() {
  if (activeTab.value === 'team') return '팀 추가'
  if (activeTab.value === 'position') return '직급 추가'
  return '부서 추가'
}

function canCreateInCurrentTab() {
  return activeTab.value === 'department' || activeTab.value === 'team' || activeTab.value === 'position'
}
</script>

<template>
  <section class="page admin-page organization-page">
    <header class="page-header">
      <div>
        <h1>조직/직급 관리</h1>
        <p>부서, 팀, 직급을 분리해 관리하고 조직도를 확인합니다.</p>
      </div>
    </header>

    <article v-if="loading" class="card empty-state">조직/직급 데이터를 불러오는 중입니다.</article>

    <article v-else-if="forbidden" class="card empty-state">
      <h2>접근 권한 없음</h2>
      <p>이 화면은 관리자 계정만 확인할 수 있습니다.</p>
    </article>

    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions retry-actions">
        <button class="secondary-button" type="button" @click="loadPage">다시 시도</button>
      </div>
    </article>

    <template v-else>
      <div v-if="successMessage" class="card feedback-card">
        <p class="settings-success">{{ successMessage }}</p>
      </div>

      <div v-if="actionError" class="card feedback-card">
        <div class="error-box">{{ actionError }}</div>
      </div>

      <div class="tab-actions">
        <div class="admin-tabs">
          <button
            v-for="tab in TAB_OPTIONS"
            :key="tab.key"
            :class="{ active: activeTab === tab.key }"
            type="button"
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>

        <button
          v-if="canCreateInCurrentTab()"
          class="primary-button"
          type="button"
          @click="openCreateModal"
        >
          {{ createButtonLabel() }}
        </button>
      </div>

      <template v-if="activeTab === 'organization'">
        <section class="organization-summary-grid">
          <article class="card summary-card">
            <div class="summary-card-head">
              <div>
                <h2>{{ primaryAffiliate?.name || '계열사 정보 없음' }}</h2>
                <p>부서별 인원과 하위 팀 구성을 확인합니다.</p>
              </div>
              <span class="badge primary">부서 {{ organizationDepartments.length }}개</span>
            </div>

            <div v-if="departmentSummaries.length" class="summary-list">
              <article
                v-for="department in departmentSummaries"
                :key="department.departmentId"
                class="summary-item"
              >
                <div class="summary-item-head">
                  <strong>{{ department.name }}</strong>
                  <span>{{ department.userCount }}명</span>
                </div>
                <p>{{ department.teamSummary }}</p>
              </article>
            </div>
            <div v-else class="empty-state-inline">표시할 부서가 없습니다.</div>
          </article>

          <article class="card chart-card">
            <div class="summary-card-head">
              <div>
                <h2>조직도</h2>
                <p>회원 관리 데이터 기준으로 부서별 사용자와 직급을 보여줍니다.</p>
              </div>
              <span class="badge navy">실제 사용자 기준</span>
            </div>

            <div v-if="departmentSummaries.length" class="chart-list">
              <article
                v-for="department in departmentSummaries"
                :key="`${department.departmentId}-chart`"
                class="chart-item"
              >
                <div class="chart-item-head">
                  <strong>{{ department.name }}</strong>
                  <span>{{ department.userCount }}명</span>
                </div>

                <ul v-if="department.hasMembers" class="member-preview-list">
                  <li v-for="member in department.previewMembers" :key="member.key">
                    <button type="button" class="member-preview-button" @click="openUserSummary(member.userId)">
                      {{ member.label }}
                    </button>
                  </li>
                </ul>
                <p v-else class="empty-member-text">배정된 사용자가 없습니다.</p>

                <small v-if="department.remainingMemberCount > 0" class="member-overflow">
                  외 {{ department.remainingMemberCount }}명
                </small>
              </article>
            </div>
            <div v-else class="empty-state-inline">표시할 조직도가 없습니다.</div>
          </article>
        </section>

        <div class="table-card admin-data-table organization-table">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>인원</th>
                <th>하위 팀</th>
                <th>순서</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!departmentSummaries.length">
                <td colspan="5"><div class="empty-state">등록된 부서가 없습니다.</div></td>
              </tr>
              <tr v-for="department in departmentSummaries" :key="department.departmentId">
                <td>{{ department.name }}</td>
                <td>{{ department.userCount }}명</td>
                <td>{{ department.teamCount ? department.teamSummary : '-' }}</td>
                <td>{{ department.sortOrder ?? '-' }}</td>
                <td>
                  <button class="icon-text" type="button" @click="openEditModal(department)">수정</button>
                  <button class="icon-text danger-text" type="button" @click="changeStatus(department)">
                    {{ department.status === 'ACTIVE' ? '비활성화' : '활성화' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'department'">
        <div class="table-card admin-data-table organization-table">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>계열사</th>
                <th>인원</th>
                <th>하위 팀</th>
                <th>순서</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!departmentRows.length">
                <td colspan="6"><div class="empty-state">등록된 부서가 없습니다.</div></td>
              </tr>
              <tr v-for="department in departmentRows" :key="department.departmentId">
                <td>{{ department.name }}</td>
                <td>{{ department.affiliateName }}</td>
                <td>{{ department.userCount }}명</td>
                <td>{{ department.teamSummary }}</td>
                <td>{{ department.sortOrder ?? '-' }}</td>
                <td>
                  <button class="icon-text" type="button" @click="openEditModal(department)">수정</button>
                  <button class="icon-text danger-text" type="button" @click="changeStatus(department)">
                    {{ department.status === 'ACTIVE' ? '비활성화' : '활성화' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'team'">
        <div class="table-card admin-data-table organization-table">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>계열사</th>
                <th>상위 부서</th>
                <th>인원</th>
                <th>순서</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!teamRows.length">
                <td colspan="6"><div class="empty-state">등록된 팀이 없습니다.</div></td>
              </tr>
              <tr v-for="team in teamRows" :key="team.teamId">
                <td>{{ team.name }}</td>
                <td>{{ team.affiliateName }}</td>
                <td>{{ team.departmentName }}</td>
                <td>{{ team.userCount }}명</td>
                <td>{{ team.sortOrder ?? '-' }}</td>
                <td>
                  <button class="icon-text" type="button" @click="openEditModal(team)">수정</button>
                  <button class="icon-text danger-text" type="button" @click="changeStatus(team)">
                    {{ team.status === 'ACTIVE' ? '비활성화' : '활성화' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <div class="table-card admin-data-table organization-table">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>순서</th>
                <th>인원</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!positionRows.length">
                <td colspan="4"><div class="empty-state">등록된 직급이 없습니다.</div></td>
              </tr>
              <tr v-for="position in positionRows" :key="position.positionId">
                <td>{{ position.name }}</td>
                <td>{{ position.sortOrder ?? '-' }}</td>
                <td>{{ position.userCount }}명</td>
                <td>
                  <button class="icon-text" type="button" @click="openEditModal(position)">수정</button>
                  <button class="icon-text danger-text" type="button" @click="changeStatus(position)">
                    {{ position.status === 'ACTIVE' ? '비활성화' : '활성화' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
        <article class="card write-modal admin-modal">
          <header>
            <h2>{{ editingItem ? `${actionLabel()} 수정` : `${actionLabel()} 추가` }}</h2>
            <button type="button" @click="closeModal">닫기</button>
          </header>

          <form class="form-grid" @submit.prevent="saveItem">
            <label v-if="activeTab !== 'position'">
              계열사
              <select v-model="form.affiliateId" required>
                <option value="">선택해 주세요</option>
                <option
                  v-for="affiliate in availableAffiliates"
                  :key="affiliate.affiliateId"
                  :value="affiliate.affiliateId"
                >
                  {{ affiliate.name }}
                </option>
              </select>
            </label>

            <label v-if="activeTab === 'team'">
              상위 부서
              <select v-model="form.departmentId" :disabled="!form.affiliateId" required>
                <option value="">선택해 주세요</option>
                <option
                  v-for="department in availableDepartments"
                  :key="department.departmentId"
                  :value="department.departmentId"
                >
                  {{ department.name }}
                </option>
              </select>
            </label>

            <label>
              이름
              <input v-model="form.name" required />
            </label>

            <label>
              코드
              <input v-model="form.code" required />
            </label>

            <label>
              순서
              <input v-model.number="form.sortOrder" type="number" min="0" />
            </label>

            <label>
              상태
              <select v-model="form.status" required>
                <option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <div class="modal-actions">
              <button type="button" class="secondary-button" @click="closeModal">취소</button>
              <button class="primary-button" :disabled="saving">
                {{ saving ? '저장 중...' : '저장' }}
              </button>
            </div>
          </form>
        </article>
      </div>

      <div v-if="userSummaryOpen" class="modal-backdrop" @click.self="userSummaryOpen = false">
        <article class="card write-modal detail-modal">
          <header>
            <div>
              <h2>{{ userSummaryLoading ? '회원 요약 조회 중' : selectedUserSummary?.name || '-' }}</h2>
              <p v-if="!userSummaryLoading">{{ selectedUserSummary?.department || '-' }} 쨌 {{ selectedUserSummary?.position || '-' }}</p>
            </div>
            <button type="button" @click="userSummaryOpen = false">닫기</button>
          </header>

          <div v-if="userSummaryLoading" class="empty-state">회원 요약 정보를 불러오는 중입니다.</div>
          <div v-else-if="userSummaryError" class="error-box">{{ userSummaryError }}</div>
          <template v-else-if="selectedUserSummary">
            <dl class="detail-list">
              <div><dt>이름</dt><dd>{{ selectedUserSummary.name }}</dd></div>
              <div><dt>이메일</dt><dd>{{ selectedUserSummary.email }}</dd></div>
              <div><dt>계열사</dt><dd>{{ selectedUserSummary.affiliate }}</dd></div>
              <div><dt>부서</dt><dd>{{ selectedUserSummary.department }}</dd></div>
              <div><dt>팀</dt><dd>{{ selectedUserSummary.team }}</dd></div>
              <div><dt>직급</dt><dd>{{ selectedUserSummary.position }}</dd></div>
              <div><dt>권한</dt><dd>{{ selectedUserSummary.role || '-' }}</dd></div>
              <div><dt>상태</dt><dd>{{ statusLabel(selectedUserSummary.status) }}</dd></div>
            </dl>
          </template>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
.organization-page {
  display: grid;
  gap: 18px;
}

.feedback-card {
  padding-top: 14px;
  padding-bottom: 14px;
}

.retry-actions {
  margin-top: 12px;
}

.tab-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.organization-summary-grid {
  display: grid;
  gap: 16px;
}

.summary-card,
.chart-card {
  min-width: 0;
  display: grid;
  gap: 14px;
}

.summary-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.summary-card-head p {
  margin: 6px 0 0;
  font-size: 13px;
}

.summary-list,
.chart-list {
  display: grid;
  gap: 12px;
}

.summary-item,
.chart-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: linear-gradient(180deg, #fbfcfe 0%, #f8fafc 100%);
  padding: 16px;
}

.summary-item-head,
.chart-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.summary-item strong,
.chart-item strong {
  font-size: 16px;
}

.summary-item span,
.chart-item span,
.member-overflow {
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 700;
}

.summary-item p,
.empty-member-text {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.6;
}

.member-preview-list {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.member-preview-list li {
  color: var(--foreground);
  font-size: 13px;
  font-weight: 600;
}

.member-preview-button {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.member-preview-button:hover {
  color: var(--primary);
}

.member-overflow {
  display: inline-block;
  margin-top: 10px;
}

.empty-state-inline {
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: #f8fafc;
  padding: 24px 16px;
  color: var(--muted-foreground);
  text-align: center;
  font-size: 13px;
}

.organization-table tr {
  cursor: default;
}

.organization-table td {
  vertical-align: top;
}

@media (min-width: 960px) {
  .organization-summary-grid {
    grid-template-columns: 360px minmax(0, 1fr);
  }
}

@media (max-width: 959px) {
  .tab-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
