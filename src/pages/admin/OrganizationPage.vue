<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ActionButton from '../../components/common/ActionButton.vue'
import AppSelect from '../../components/common/AppSelect.vue'
import {
  createAdminDepartment,
  deleteDepartment,
  createAdminPosition,
  deletePosition,
  createAdminTeam,
  deleteTeam,
  downloadOrganizationMembersExcel,
  getAdminAffiliates,
  getAdminDepartments,
  getAdminPositions,
  getAdminTeams,
  importOrganizationMembersExcel,
  updateAdminDepartment,
  updateAdminDepartmentStatus,
  updateAdminPosition,
  updateAdminPositionStatus,
  updateAdminTeam,
  updateAdminTeamStatus,
} from '../../lib/admin-organizations'
import {
  buildDepartmentPayload,
  buildPositionPayload,
  buildTeamPayload,
  createDepartmentForm,
  createEmptyOrganizationForm,
  createPositionForm,
  createTeamForm,
} from '../../lib/admin-organization-form'
import {
  getOrganizationSortOrderConflictMessage,
  ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE,
  validateOrganizationSortOrder,
} from '../../lib/admin-organization-sort-validation.js'
import { getAllAdminUsers } from '../../lib/admin-users'
import {
  buildOrganizationMemberLabel,
  buildOrganizationSummaryText,
  buildOrganizationUserHeadline,
  normalizeOrganizationUserDisplay,
} from '../../lib/admin-organization-user-display.js'
import { getOrganizationUserSummary } from '../../lib/user-directory'
import { useAuthStore } from '../../stores/auth'
import ModalShell from '../../components/common/ModalShell.vue'
import OrganizationFullChartModal from '../../components/admin/OrganizationFullChartModal.vue'
import { Download, Upload, Info, ExternalLink, ChevronRight } from '@lucide/vue'

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
const deleteLoading = ref(false)
const forbidden = ref(false)
const errorMessage = ref('')
const actionError = ref('')
const successMessage = ref('')
const excelResult = ref(null)
const excelValidationErrors = ref([])
const showAllExcelErrors = ref(false)
const modalOpen = ref(false)
const importConfirmOpen = ref(false)
const deleteConfirmOpen = ref(false)
const editingItem = ref(null)
const userSummaryOpen = ref(false)
const userSummaryLoading = ref(false)
const userSummaryError = ref('')
const selectedUserSummary = ref(null)
const excelDownloading = ref(false)
const excelUploading = ref(false)
const uploadFileInput = ref(null)
const pendingUploadFile = ref(null)
const fullChartOpen = ref(false)
const organizationChartCardRefs = new Map()

const affiliates = ref([])
const departments = ref([])
const teams = ref([])
const positions = ref([])
const users = ref([])

const form = ref(createEmptyOrganizationForm())

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
        departmentSortOrder: department?.sortOrder ?? null,
        affiliateName: findAffiliateName(department?.affiliateId),
        userCount: users.value.filter((user) => user.teamId === team.teamId).length,
      }
    })
    .sort((left, right) => {
      const affiliateCompare = String(left.affiliateName || '').localeCompare(String(right.affiliateName || ''))
      if (affiliateCompare !== 0) return affiliateCompare

      const leftDepartmentOrder = Number.isFinite(Number(left.departmentSortOrder))
        ? Number(left.departmentSortOrder)
        : Number.MAX_SAFE_INTEGER
      const rightDepartmentOrder = Number.isFinite(Number(right.departmentSortOrder))
        ? Number(right.departmentSortOrder)
        : Number.MAX_SAFE_INTEGER

      if (leftDepartmentOrder !== rightDepartmentOrder) return leftDepartmentOrder - rightDepartmentOrder

      const departmentCompare = String(left.departmentName || '').localeCompare(String(right.departmentName || ''))
      if (departmentCompare !== 0) return departmentCompare

      return compareBySortOrderThenName(left, right)
    }),
)

const teamTableRows = computed(() => {
  let currentDepartmentName = ''
  let currentDepartmentStartIndex = -1

  const rows = teamRows.value.map((team) => ({
    ...team,
    departmentRowspan: 0,
    showDepartmentCell: false,
  }))

  rows.forEach((team, index) => {
    if (team.departmentName !== currentDepartmentName) {
      currentDepartmentName = team.departmentName
      currentDepartmentStartIndex = index
      team.showDepartmentCell = true
      team.departmentRowspan = 1
      return
    }

    rows[currentDepartmentStartIndex].departmentRowspan += 1
  })

  return rows
})

const positionRows = computed(() =>
  sortedPositions.value.map((position) => ({
    ...position,
    affiliateName: findAffiliateName(position.affiliateId),
    userCount: users.value.filter((user) => user.positionId === position.positionId).length,
  })),
)

const sortOrderError = computed(() =>
  modalOpen.value
    ? validateOrganizationSortOrder({
        tab: activeTab.value,
        form: form.value,
        editingItem: editingItem.value,
        departments: departments.value,
        teams: teams.value,
        positions: positions.value,
      })
    : '',
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

watch(
  () => [form.value.sortOrder, form.value.affiliateId, form.value.departmentId],
  () => {
    if (actionError.value === ORGANIZATION_SORT_ORDER_DUPLICATE_MESSAGE) {
      actionError.value = ''
    }
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
  deleteConfirmOpen.value = false
}

function openCreateModal() {
  editingItem.value = null
  deleteConfirmOpen.value = false
  actionError.value = ''
  successMessage.value = ''
  form.value = createEmptyOrganizationForm()

  if (
    activeTab.value === 'organization' ||
    activeTab.value === 'department' ||
    activeTab.value === 'team' ||
    activeTab.value === 'position'
  ) {
    form.value.affiliateId =
      primaryAffiliate.value?.affiliateId || availableAffiliates.value[0]?.affiliateId || ''
  }

  modalOpen.value = true
}

function openEditModal(item) {
  editingItem.value = item
  deleteConfirmOpen.value = false
  actionError.value = ''
  successMessage.value = ''

  if (activeTab.value === 'organization' || activeTab.value === 'department') {
    form.value = createDepartmentForm(item)
    modalOpen.value = true
    return
  }

  if (activeTab.value === 'team') {
    const department = departments.value.find((candidate) => candidate.departmentId === item.departmentId)

    form.value = createTeamForm(item, department?.affiliateId || '')
    modalOpen.value = true
    return
  }

  form.value = createPositionForm(item)
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  deleteConfirmOpen.value = false
  saving.value = false
}

function openDeleteConfirm() {
  if (!editingItem.value || deleteLoading.value) return
  deleteConfirmOpen.value = true
}

function closeDeleteConfirm() {
  if (deleteLoading.value) return
  deleteConfirmOpen.value = false
}

async function confirmDeleteItem() {
  if (!editingItem.value || deleteLoading.value) return

  deleteLoading.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    // 삭제 확인 모달은 탭별 안내 문구만 바꾸고, 실제 삭제 호출/로딩/성공 처리는 공통 흐름으로 묶는다.
    if (activeTab.value === 'organization' || activeTab.value === 'department') {
      await deleteDepartment(editingItem.value.departmentId)
    } else if (activeTab.value === 'team') {
      await deleteTeam(editingItem.value.teamId)
    } else {
      await deletePosition(editingItem.value.positionId)
    }

    deleteConfirmOpen.value = false
    closeModal()
    successMessage.value = deleteTargetLabel() + '가 삭제되었습니다.'
    // 삭제 성공 후에는 현재 탭뿐 아니라 조직/팀/직급 요약과 사용자 수까지 함께 맞춰야 하므로 전체 데이터를 다시 불러온다.
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      deleteConfirmOpen.value = false
      closeModal()
      return
    }

    // 삭제 실패 시에는 BE message/details를 화면에 그대로 이어 붙여 운영자가 막힌 조건을 바로 확인할 수 있게 한다.
    actionError.value = formatActionError(error, deleteTargetLabel() + ' 삭제에 실패했습니다.')
  } finally {
    deleteLoading.value = false
  }
}

async function saveItem() {
  if (saving.value) return

  const validationMessage = sortOrderError.value
  if (validationMessage) return

  saving.value = true
  actionError.value = ''
  successMessage.value = ''

  try {
    if (activeTab.value === 'organization' || activeTab.value === 'department') {
      // 현재 "조직 관리" 탭은 대표 계열사 관점의 부서 뷰이므로 실제 저장 대상은 department 마스터다.
      // 조직/직급 관리에서는 코드가 사용자 입력값이 아니라서 부서 저장 요청에서 제외한다.
      const payload = buildDepartmentPayload(form.value, normalizeSortOrder)

      if (editingItem.value?.departmentId) {
        await updateAdminDepartment(editingItem.value.departmentId, payload)
        successMessage.value = '부서 정보를 수정했습니다.'
      } else {
        await createAdminDepartment(payload)
        successMessage.value = '부서를 추가했습니다.'
      }
    } else if (activeTab.value === 'team') {
      // 조직/직급 관리에서는 코드가 사용자 입력값이 아니라서 팀 저장 요청에서 제외한다.
      const payload = buildTeamPayload(form.value, normalizeSortOrder)

      if (editingItem.value?.teamId) {
        await updateAdminTeam(editingItem.value.teamId, payload)
        successMessage.value = '팀 정보를 수정했습니다.'
      } else {
        await createAdminTeam(payload)
        successMessage.value = '팀을 추가했습니다.'
      }
    } else {
      // 조직/직급 관리에서는 코드가 사용자 입력값이 아니라서 직급 저장 요청에서 제외한다.
      const payload = buildPositionPayload(form.value, normalizeSortOrder)

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

    const duplicatedSortOrderMessage = getOrganizationSortOrderConflictMessage(error)
    actionError.value =
      duplicatedSortOrderMessage || formatActionError(error, '저장에 실패했습니다.')
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
    affiliateId: item?.affiliateId || '',
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
    email: item?.email || '',
    affiliateId: item?.affiliateId || '',
    departmentId: item?.departmentId || '',
    teamId: item?.teamId || '',
    positionId: item?.positionId || '',
    position: item?.position || '-',
  }
}

function normalizeUserSummary(item) {
  // 로컬 관리자 공용 계정은 조직 정보가 비어 있어야 하므로 FE 기본값으로 채우지 않는다.
  return normalizeOrganizationUserDisplay({
    userId: item?.userId || '',
    loginId: item?.loginId || '',
    name: item?.name || '-',
    email: item?.email || '-',
    affiliate: item?.affiliate || '-',
    department: item?.department || '',
    team: item?.team || '',
    position: item?.position || '',
    role: `${item?.role || ''}`.toUpperCase(),
    status: `${item?.status || ''}`.toUpperCase(),
  })
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

function findUserById(userId) {
  return users.value.find((user) => user.userId === userId) || null
}

function organizationTeamSummary(departmentId) {
  return buildOrganizationSummaryText(
    ...(teamsByDepartmentId.value.get(departmentId) || []).map((team) => team.name),
  )
}

function departmentTeamSummary(departmentId) {
  const names = (teamsByDepartmentId.value.get(departmentId) || []).map((team) => team.name).filter(Boolean)
  return names.length ? names.join(' / ') : '-'
}

function memberPreviewLabel(userId) {
  const user = findUserById(userId)
  if (!user) return '-'
  return buildOrganizationMemberLabel(user, resolvePositionName(user.positionId, user.position)) || user.name || '-'
}

function userSummaryHeadline(user) {
  return buildOrganizationUserHeadline(user)
}

function setOrganizationChartCardRef(departmentId, element) {
  if (element) {
    organizationChartCardRefs.set(departmentId, element)
    return
  }

  organizationChartCardRefs.delete(departmentId)
}

function findScrollParent(element) {
  let current = element?.parentElement || null

  while (current) {
    const style = window.getComputedStyle(current)
    const overflowY = style.overflowY
    const canScroll =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      current.scrollHeight > current.clientHeight

    if (canScroll) return current
    current = current.parentElement
  }

  return document.scrollingElement || document.documentElement
}

function scrollToOrganizationChart(departmentId) {
  const target = organizationChartCardRefs.get(departmentId)
  if (!target) return

  const scrollParent = findScrollParent(target)
  const visualOffset = 4

  // 실제 스크롤 컨테이너 기준 좌표로 계산해서 부서 카드 상단이 최대한 딱 맞게 걸리도록 보정한다.
  if (scrollParent === document.documentElement || scrollParent === document.body || scrollParent === document.scrollingElement) {
    const targetTop = target.getBoundingClientRect().top + window.scrollY

    window.scrollTo({
      top: Math.max(targetTop - visualOffset, 0),
      behavior: 'smooth',
    })
    return
  }

  const parentRect = scrollParent.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const nextTop = scrollParent.scrollTop + (targetRect.top - parentRect.top) - visualOffset

  scrollParent.scrollTo({
    top: Math.max(nextTop, 0),
    behavior: 'smooth',
  })
}

function statusLabel(status) {
  return status === 'ACTIVE' ? '활성' : status === 'INACTIVE' ? '비활성' : '-'
}

function actionLabel() {
  if (activeTab.value === 'organization' || activeTab.value === 'department') return '부서'
  if (activeTab.value === 'team') return '팀'
  return '직급'
}

function deleteTargetLabel() {
  return actionLabel()
}

function deleteConfirmDescription() {
  if (activeTab.value === 'organization' || activeTab.value === 'department') {
    return '하위 팀이나 소속 회원이 있는 부서는 삭제할 수 없습니다.'
  }

  if (activeTab.value === 'team') {
    return '소속 회원이 있는 팀은 삭제할 수 없습니다.'
  }

  return '해당 직급을 사용하는 회원이 있으면 삭제할 수 없습니다.'
}

function formatActionError(error, fallbackMessage) {
  const messages = []
  const baseMessage = (error?.message || fallbackMessage).trim()
  if (baseMessage) messages.push(baseMessage)

  if (Array.isArray(error?.details)) {
    for (const detail of error.details) {
      const reason = (detail?.reason || '').trim()
      if (reason && !messages.includes(reason)) {
        messages.push(reason)
      }
    }
  }

  return messages.join('\n') || fallbackMessage
}

function createButtonLabel() {
  if (activeTab.value === 'team') return '팀 추가'
  if (activeTab.value === 'position') return '직급 추가'
  return '부서 추가'
}

async function handleExcelDownload() {
  if (excelDownloading.value) return

  excelDownloading.value = true
  actionError.value = ''
  successMessage.value = ''
  excelResult.value = null
  excelValidationErrors.value = []
  showAllExcelErrors.value = false

  try {
    // Blob 다운로드는 브라우저 객체 URL로 연결하고, 서버가 준 파일명이 있으면 그대로 사용한다.
    const { blob, fileName } = await downloadOrganizationMembersExcel()
    const downloadUrl = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = fileName || 'meetbowl_organization_members.xlsx'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    // 일부 브라우저는 클릭 직후 URL을 정리하면 저장이 시작되기 전에 다운로드가 끊길 수 있다.
    window.setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl)
    }, 1000)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    actionError.value =
      error?.message || '엑셀 파일을 다운로드하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    excelDownloading.value = false
  }
}

function openExcelUploadPicker() {
  if (excelUploading.value) return
  // 업로드 버튼은 기본 file input을 직접 노출하지 않고 기존 관리자 액션 버튼 패턴을 유지한다.
  uploadFileInput.value?.click()
}

function handleExcelFileChange(event) {
  const file = event?.target?.files?.[0] || null
  resetUploadInputValue()

  if (!file) return
  if (!isXlsxFile(file)) {
    actionError.value = '엑셀 업로드는 .xlsx 파일만 가능합니다.'
    return
  }

  pendingUploadFile.value = file
  importConfirmOpen.value = true
}

function closeImportConfirm() {
  importConfirmOpen.value = false
  pendingUploadFile.value = null
}

async function confirmExcelImport() {
  if (!pendingUploadFile.value || excelUploading.value) return

  excelUploading.value = true
  actionError.value = ''
  successMessage.value = ''
  excelResult.value = null
  excelValidationErrors.value = []
  showAllExcelErrors.value = false

  try {
    // multipart 업로드는 file 필드 하나만 보내서 BE 검증과 집계를 그대로 신뢰한다.
    const result = await importOrganizationMembersExcel(pendingUploadFile.value)
    excelResult.value = normalizeExcelImportResult(result)
    successMessage.value = '엑셀 일괄 반영이 완료되었습니다.'
    importConfirmOpen.value = false
    pendingUploadFile.value = null
    await reloadAllData()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      importConfirmOpen.value = false
      pendingUploadFile.value = null
      return
    }

    excelValidationErrors.value = normalizeExcelValidationErrors(error?.details)
    showAllExcelErrors.value = false
    actionError.value =
      error?.message || '엑셀 파일을 업로드하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    excelUploading.value = false
  }
}

function normalizeExcelImportResult(result) {
  // BE 집계값이 비어 있더라도 UI에서는 항상 숫자 형태로 안정적으로 렌더링한다.
  return {
    createdAffiliates: Number(result?.createdAffiliates) || 0,
    updatedAffiliates: Number(result?.updatedAffiliates) || 0,
    createdDepartments: Number(result?.createdDepartments) || 0,
    updatedDepartments: Number(result?.updatedDepartments) || 0,
    createdTeams: Number(result?.createdTeams) || 0,
    updatedTeams: Number(result?.updatedTeams) || 0,
    createdPositions: Number(result?.createdPositions) || 0,
    updatedPositions: Number(result?.updatedPositions) || 0,
    createdUsers: Number(result?.createdUsers) || 0,
    updatedUsers: Number(result?.updatedUsers) || 0,
  }
}

function normalizeExcelValidationErrors(details) {
  if (!Array.isArray(details)) return []

  // validation error는 row별 상세 정보를 그대로 보여 주되, 빈 값은 안전한 기본값으로 치환한다.
  return details.map((detail) => ({
    sheetName: detail?.sheetName || '-',
    rowNumber: Number.isFinite(Number(detail?.rowNumber)) ? Number(detail.rowNumber) : null,
    field: detail?.field || '-',
    reason: detail?.reason || '오류 사유를 확인해 주세요.',
  }))
}

function formatExcelValidationError(detail) {
  // validation 오류는 "시트/행/필드/사유"를 한 줄로 합쳐 관리자가 바로 수정 지점을 찾게 돕는다.
  const rowLabel = detail.rowNumber ? `${detail.rowNumber}행` : '행 정보 없음'
  return `${detail.sheetName} 시트 ${rowLabel} ${detail.field}: ${detail.reason}`
}

function resetUploadInputValue() {
  if (uploadFileInput.value) {
    uploadFileInput.value.value = ''
  }
}

function isXlsxFile(file) {
  return `${file?.name || ''}`.toLowerCase().endsWith('.xlsx')
}

function canCreateInCurrentTab() {
  return activeTab.value === 'department' || activeTab.value === 'team' || activeTab.value === 'position'
}

const fullChartAffiliateName = computed(() => {
  if (sortedAffiliates.value.length === 1) return sortedAffiliates.value[0]?.name || '전체 조직'
  return '전체 조직'
})

const visibleExcelValidationErrors = computed(() =>
  // 오류가 많을 때는 처음 10건만 먼저 보여 주고, 나머지는 펼쳐서 확인하게 한다.
  showAllExcelErrors.value
    ? excelValidationErrors.value
    : excelValidationErrors.value.slice(0, 10),
)

const remainingExcelValidationErrorCount = computed(() =>
  Math.max(excelValidationErrors.value.length - visibleExcelValidationErrors.value.length, 0),
)

// 조직도 3단계 계층 데이터 생성 helper 함수
function getDepartmentTreeData(departmentId) {
  // 1. 해당 부서의 활성 팀 조회 및 정렬
  const deptTeams = (teams.value || [])
    .filter((team) => team.departmentId === departmentId && team.status === 'ACTIVE')
    .sort(compareBySortOrderThenName)

  // 2. 해당 부서의 사용자 목록 조회
  const deptUsers = usersByDepartmentId.value.get(departmentId) || []

  // 3. 팀별 사용자 그룹핑 및 미지정 사용자 분류
  const teamUsersMap = new Map()
  const unassignedUsers = []

  for (const team of deptTeams) {
    teamUsersMap.set(team.teamId, [])
  }

  for (const user of deptUsers) {
    if (user.teamId && teamUsersMap.has(user.teamId)) {
      teamUsersMap.get(user.teamId).push(user)
    } else {
      unassignedUsers.push(user)
    }
  }

  // 4. 팀 노드 데이터 구성
  const teamNodes = []
  for (const team of deptTeams) {
    const usersInTeam = teamUsersMap.get(team.teamId) || []
    teamNodes.push({
      key: team.teamId,
      id: team.teamId,
      name: team.name,
      isUnassigned: false,
      users: usersInTeam,
    })
  }

  // 5. 미지정 사용자가 있다면 "미지정 팀" 노드 추가
  if (unassignedUsers.length > 0) {
    teamNodes.push({
      key: `unassigned-${departmentId}`,
      id: 'unassigned',
      name: '미지정 팀',
      isUnassigned: true,
      users: unassignedUsers,
    })
  }

  return teamNodes
}
</script>

<template>
  <section class="page admin-page organization-page">
    <header class="page-header organization-header">
      <div>
        <h1>조직/직급 관리</h1>
        <p>부서, 팀, 직급을 분리해 관리하고 조직도를 확인합니다.</p>
      </div>
      <div class="admin-actions header-actions excel-actions">
        <input
          ref="uploadFileInput"
          class="hidden-file-input"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          @change="handleExcelFileChange"
        />
        <ActionButton variant="secondary" size="sm" :disabled="excelDownloading || excelUploading" @click="handleExcelDownload">
          {{ excelDownloading ? '다운로드 중...' : '엑셀 다운로드' }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" :disabled="excelUploading || excelDownloading" @click="openExcelUploadPicker">
          {{ excelUploading ? '업로드 중...' : '엑셀 업로드' }}
        </ActionButton>
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

      <div v-if="excelResult" class="card feedback-card excel-result-card">
        <div class="excel-result-card-head">
          <h2>엑셀 반영 결과</h2>
          <p>업로드된 조직 데이터 반영 내역입니다.</p>
        </div>
        <div class="excel-result-grid">
          <div class="excel-result-item">
            <strong>계열사</strong>
            <p>생성/수정</p>
            <span>{{ excelResult.createdAffiliates }} / {{ excelResult.updatedAffiliates }}</span>
          </div>
          <div class="excel-result-item">
            <strong>부서</strong>
            <p>생성/수정</p>
            <span>{{ excelResult.createdDepartments }} / {{ excelResult.updatedDepartments }}</span>
          </div>
          <div class="excel-result-item">
            <strong>팀</strong>
            <p>생성/수정</p>
            <span>{{ excelResult.createdTeams }} / {{ excelResult.updatedTeams }}</span>
          </div>
          <div class="excel-result-item">
            <strong>직급</strong>
            <p>생성/수정</p>
            <span>{{ excelResult.createdPositions }} / {{ excelResult.updatedPositions }}</span>
          </div>
          <div class="excel-result-item">
            <strong>회원</strong>
            <p>생성/수정</p>
            <span>{{ excelResult.createdUsers }} / {{ excelResult.updatedUsers }}</span>
          </div>
        </div>
      </div>

      <div v-if="excelValidationErrors.length" class="card feedback-card excel-error-card">
        <h2>엑셀 검증 오류</h2>
        <p class="excel-error-summary">
          {{ excelValidationErrors.length }}건의 오류가 있습니다. 시트/행/필드 정보를 확인해 수정해 주세요.
        </p>
        <ul class="excel-error-list">
          <li
            v-for="(detail, index) in visibleExcelValidationErrors"
            :key="`${detail.sheetName}-${detail.rowNumber}-${detail.field}-${index}`"
          >
            {{ formatExcelValidationError(detail) }}
          </li>
        </ul>
        <p v-if="remainingExcelValidationErrorCount > 0" class="excel-error-summary">
          나머지 {{ remainingExcelValidationErrorCount }}건은 펼쳐서 확인할 수 있습니다.
        </p>
        <button
          v-if="excelValidationErrors.length > 10"
          class="icon-text"
          type="button"
          @click="showAllExcelErrors = !showAllExcelErrors"
        >
          {{ showAllExcelErrors ? '오류 접기' : '전체 보기' }}
        </button>
      </div>

      <div class="info-bar-new">
        <div class="info-left">
          <Info :size="16" class="info-icon" />
          <span class="info-text">엑셀로 조직/회원 정보를 내려받거나 수정 파일을 업로드할 수 있습니다.</span>
        </div>
        <div class="info-right">
          <span class="info-chip">엑셀 없이 기존 데이터는 삭제되지 않습니다.</span>
          <span class="info-chip">ADMIN 또는 USER만 입력 가능</span>
          <span class="info-chip">정렬 기준: sortNumber</span>
        </div>
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

        <ActionButton
          v-if="canCreateInCurrentTab()"
          variant="primary"
          size="sm"
          type="button"
          @click="openCreateModal"
        >
          {{ createButtonLabel() }}
        </ActionButton>
      </div>

      <template v-if="activeTab === 'organization'">
        <section class="organization-summary-grid">
          <article class="card summary-card">
            <div class="summary-card-head">
              <div class="summary-card-head-copy">
                <div class="summary-card-head-title-row">
                  <h2>{{ primaryAffiliate?.name || '계열사 정보 없음' }}</h2>
                  <span class="badge primary">부서 {{ organizationDepartments.length }}개</span>
                </div>
                <p>부서별 인원과 하위 팀 구성을 확인합니다.</p>
              </div>
            </div>

            <div v-if="departmentSummaries.length" class="summary-list">
              <article
                v-for="department in departmentSummaries"
                :key="department.departmentId"
                class="summary-item"
              >
                <button
                  type="button"
                  class="summary-item-head summary-item-link"
                  @click="scrollToOrganizationChart(department.departmentId)"
                >
                  <strong>{{ department.name }}</strong>
                  <span class="dept-badge">{{ department.userCount }}명</span>
                </button>
                
                <div v-if="department.hasMembers" class="summary-item-body">
                  <div
                    v-for="teamNode in getDepartmentTreeData(department.departmentId)"
                    :key="teamNode.key"
                    class="summary-team-group"
                  >
                    <div class="summary-team-title">{{ teamNode.name }}</div>
                    <div class="summary-team-users">
                      <div
                        v-for="user in teamNode.users"
                        :key="user.userId"
                        class="summary-member-name"
                      >
                        {{ user.name }} {{ resolvePositionName(user.positionId, user.position) }}
                      </div>
                      <div v-if="teamNode.users.length === 0" class="summary-member-empty">
                        배정된 사용자가 없습니다.
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
            <div v-else class="empty-state-inline">표시할 부서가 없습니다.</div>
            
            <div class="card-footer">
              <button class="footer-link-btn" type="button" @click="switchTab('department')">
                <span>전체 부서 보기</span>
                <ChevronRight class="footer-link-icon" :size="16" />
              </button>
            </div>
          </article>

          <article class="card chart-card">
            <div class="summary-card-head">
              <div class="summary-card-head-copy">
                <h2>조직도</h2>
                <p>회원 관리 데이터 기준으로 부서별 사용자와 직급을 보여줍니다.</p>
              </div>
              <div class="chart-card-head-actions">
                <span class="badge navy">실제 사용자 기준</span>
                <button class="chart-card-link-btn" type="button" @click="fullChartOpen = true">
                  <span>전체 조직도 보기</span>
                  <ExternalLink class="footer-link-icon" :size="14" />
                </button>
              </div>
            </div>

            <div v-if="departmentSummaries.length" class="org-chart-list">
              <article
                v-for="department in departmentSummaries"
                :key="`${department.departmentId}-chart`"
                class="org-department-card"
                :ref="(element) => setOrganizationChartCardRef(department.departmentId, element)"
              >
                <div class="org-tree-container">
                  <div class="org-tree-root">
                    <div class="org-node-box dept-box">
                      <div class="org-node-title">{{ department.name }}</div>
                      <div class="org-node-desc">{{ department.userCount }}명</div>
                    </div>
                  </div>

                  <div v-if="getDepartmentTreeData(department.departmentId).length > 0" class="org-tree-connector"></div>

                  <div v-if="getDepartmentTreeData(department.departmentId).length > 0" class="org-tree-children team-level">
                    <div
                      v-for="teamNode in getDepartmentTreeData(department.departmentId)"
                      :key="teamNode.key"
                      class="org-tree-child team-child"
                    >
                      <div class="org-node-box team-box" :class="{ 'unassigned-team': teamNode.isUnassigned }">
                        <div class="org-node-title">{{ teamNode.name }}</div>
                        <div class="org-node-desc">{{ teamNode.users.length }}명</div>
                      </div>

                      <div v-if="teamNode.users.length > 0" class="org-tree-connector sub-connector"></div>

                      <div v-if="teamNode.users.length > 0" class="org-tree-children user-level">
                        <div
                          v-for="user in teamNode.users"
                          :key="user.userId"
                          class="org-tree-child user-child"
                        >
                          <button type="button" class="org-node-box child-box" @click="openUserSummary(user.userId)">
                            <div class="org-node-title">{{ user.name }} {{ resolvePositionName(user.positionId, user.position) }}</div>
                          </button>
                        </div>
                      </div>
                      <div v-else class="org-empty-users-inline">배정된 사용자가 없습니다.</div>
                    </div>
                  </div>
                  <div v-else class="org-empty-users">배정된 팀이 없습니다.</div>
                </div>
              </article>
            </div>
            <div v-else class="empty-state-inline">표시할 조직도가 없습니다.</div>
            
          </article>
        </section>

      </template>


      <template v-else-if="activeTab === 'department'">
        <div class="table-card admin-data-table organization-table organization-table-department">
          <table>
            <thead>
              <tr>
                <th>계열사</th>
                <th>부서</th>
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
              <tr v-for="(department, index) in departmentRows" :key="department.departmentId">
                <td
                  v-if="index === 0"
                  :rowspan="departmentRows.length"
                  class="organization-shared-cell organization-affiliate-cell"
                >
                  {{ department.affiliateName }}
                </td>
                <td class="organization-department-cell organization-department-name-cell">{{ department.name }}</td>
                <td>{{ department.userCount }}명</td>
                <td>{{ departmentTeamSummary(department.departmentId) }}</td>
                <td>{{ department.sortOrder ?? '-' }}</td>
                <td>
                  <button class="icon-text organization-action-link" type="button" @click="openEditModal(department)">수정</button>
                  <button class="icon-text danger-text organization-action-link organization-action-link--danger" type="button" @click="changeStatus(department)">
                    {{ department.status === 'ACTIVE' ? '비활성화' : '활성화' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'team'">
        <div class="table-card admin-data-table organization-table organization-table-team">
          <table>
            <thead>
              <tr>
                <th>계열사</th>
                <th>상위 부서</th>
                <th>팀</th>
                <th>인원</th>
                <th>순서</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!teamTableRows.length">
                <td colspan="6"><div class="empty-state">등록된 팀이 없습니다.</div></td>
              </tr>
              <tr v-for="(team, index) in teamTableRows" :key="team.teamId">
                <td
                  v-if="index === 0"
                  :rowspan="teamTableRows.length"
                  class="organization-shared-cell organization-affiliate-cell"
                >
                  {{ team.affiliateName }}
                </td>
                <td
                  v-if="team.showDepartmentCell"
                  :rowspan="team.departmentRowspan"
                  class="organization-department-cell"
                >
                  {{ team.departmentName }}
                </td>
                <td class="organization-team-cell">{{ team.name }}</td>
                <td>{{ team.userCount }}명</td>
                <td>{{ team.sortOrder ?? '-' }}</td>
                <td>
                  <button class="icon-text organization-action-link" type="button" @click="openEditModal(team)">수정</button>
                  <button class="icon-text danger-text organization-action-link organization-action-link--danger" type="button" @click="changeStatus(team)">
                    {{ team.status === 'ACTIVE' ? '비활성화' : '활성화' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <div class="table-card admin-data-table organization-table organization-table-position">
          <table>
            <thead>
              <tr>
                <th>계열사</th>
                <th>이름</th>
                <th>순서</th>
                <th>인원</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!positionRows.length">
                <td colspan="5"><div class="empty-state">등록된 직급이 없습니다.</div></td>
              </tr>
              <tr v-for="position in positionRows" :key="position.positionId">
                <td>{{ position.affiliateName }}</td>
                <td>{{ position.name }}</td>
                <td>{{ position.sortOrder ?? '-' }}</td>
                <td>{{ position.userCount }}명</td>
                <td>
                  <button class="icon-text organization-action-link" type="button" @click="openEditModal(position)">수정</button>
                  <button class="icon-text danger-text organization-action-link organization-action-link--danger" type="button" @click="changeStatus(position)">
                    {{ position.status === 'ACTIVE' ? '비활성화' : '활성화' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <ModalShell v-if="modalOpen" modal-class="admin-modal" @close="closeModal">
        <header class="admin-modal-header">
          <div class="admin-modal-title">
            <h2>{{ editingItem ? `${actionLabel()} 수정` : `${actionLabel()} 추가` }}</h2>
            <p class="admin-modal-subtitle">
              {{ activeTab === 'team' ? '상위 부서와 순서를 함께 관리합니다.' : '이름, 순서, 상태를 입력해 주세요.' }}
            </p>
          </div>
          <button type="button" class="admin-modal-close" @click="closeModal">닫기</button>
        </header>

        <form class="admin-modal-form" @submit.prevent="saveItem">
          <div class="admin-modal-body">
            <p v-if="actionError" class="admin-modal-inline-error">{{ actionError }}</p>
            <label v-if="activeTab !== 'position'">
              계열사
              <AppSelect v-model="form.affiliateId" required>
                <option value="">선택해 주세요</option>
                <option
                  v-for="affiliate in availableAffiliates"
                  :key="affiliate.affiliateId"
                  :value="affiliate.affiliateId"
                >
                  {{ affiliate.name }}
                </option>
              </AppSelect>
            </label>

            <label v-if="activeTab === 'team'">
              상위 부서
              <AppSelect v-model="form.departmentId" :disabled="!form.affiliateId" required>
                <option value="">선택해 주세요</option>
                <option
                  v-for="department in availableDepartments"
                  :key="department.departmentId"
                  :value="department.departmentId"
                >
                  {{ department.name }}
                </option>
              </AppSelect>
            </label>

            <label>
              이름
              <input v-model="form.name" required />
            </label>

            <label>
              순서
              <input v-model.number="form.sortOrder" type="number" min="0" />
              <p v-if="sortOrderError" class="admin-field-error">{{ sortOrderError }}</p>
            </label>

            <label>
              상태
              <AppSelect v-model="form.status" required>
                <option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </AppSelect>
            </label>

          </div>
          <footer class="admin-modal-footer">
            <div class="admin-modal-actions-left">
              <button
                v-if="editingItem"
                type="button"
                class="danger-button"
                :disabled="saving || deleteLoading"
                @click="openDeleteConfirm"
              >
                {{ deleteLoading ? '삭제 중...' : deleteTargetLabel() + ' 삭제' }}
              </button>
            </div>
            <div class="admin-modal-actions-right">
              <button type="button" class="secondary-button" @click="closeModal">취소</button>
              <button class="primary-button" :disabled="saving || deleteLoading || Boolean(sortOrderError)">
                {{ saving ? '저장 중...' : '저장' }}
              </button>
            </div>
          </footer>
        </form>
      </ModalShell>

      <ModalShell v-if="deleteConfirmOpen" modal-class="organization-delete-modal" @close="closeDeleteConfirm">
        <header>
          <h2>{{ deleteTargetLabel() }} 삭제</h2>
          <button type="button" @click="closeDeleteConfirm">닫기</button>
        </header>

        <div class="organization-delete-body">
          <p>정말 이 {{ deleteTargetLabel() }}을 삭제하시겠습니까?</p>
          <p>{{ deleteConfirmDescription() }}</p>
          <p class="organization-delete-target">{{ editingItem?.name || '-' }}</p>
        </div>

        <div class="modal-actions">
          <button type="button" class="secondary-button" :disabled="deleteLoading" @click="closeDeleteConfirm">
            취소
          </button>
          <button type="button" class="danger-button" :disabled="deleteLoading" @click="confirmDeleteItem">
            {{ deleteLoading ? '삭제 중...' : deleteTargetLabel() + ' 삭제' }}
          </button>
        </div>
      </ModalShell>

      <ModalShell v-if="importConfirmOpen" modal-class="excel-confirm-modal" @close="closeImportConfirm">
        <header>
          <h2>엑셀 업로드 확인</h2>
          <button type="button" @click="closeImportConfirm">닫기</button>
        </header>

        <div class="excel-confirm-body">
          <p>엑셀 파일의 계열사, 부서, 팀, 직급, 회원 정보가 일괄 반영됩니다. 계속 진행할까요?</p>
          <p class="excel-confirm-file">{{ pendingUploadFile?.name || '-' }}</p>
        </div>

        <div class="modal-actions">
          <button type="button" class="secondary-button" @click="closeImportConfirm">취소</button>
          <button class="primary-button" :disabled="excelUploading" @click="confirmExcelImport">
            {{ excelUploading ? '업로드 중...' : '확인' }}
          </button>
        </div>
      </ModalShell>

      <div v-if="userSummaryOpen" class="modal-backdrop" @click.self="userSummaryOpen = false">
        <article class="card write-modal detail-modal organization-user-summary-modal">
          <header class="organization-user-summary-modal__header">
            <div>
              <h2>{{ userSummaryLoading ? '회원 요약 조회 중' : selectedUserSummary?.name || '-' }}</h2>
              <p v-if="!userSummaryLoading">{{ userSummaryHeadline(selectedUserSummary) }}</p>
            </div>
            <button class="modal-close organization-user-summary-modal__close" type="button" @click="userSummaryOpen = false">×</button>
          </header>

          <div v-if="userSummaryLoading" class="empty-state">회원 요약 정보를 불러오는 중입니다.</div>
          <div v-else-if="userSummaryError" class="error-box">{{ userSummaryError }}</div>
          <template v-else-if="selectedUserSummary">
            <div class="detail-body organization-user-summary-modal__body">
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
            </div>
          </template>
        </article>
      </div>

      <OrganizationFullChartModal
        v-if="fullChartOpen"
        :affiliate-name="fullChartAffiliateName"
        :departments="departments"
        :teams="teams"
        :users="users"
        :positions="positions"
        @close="fullChartOpen = false"
      />
    </template>
  </section>
</template>

<style scoped>
.organization-page {
  display: grid;
  gap: 22px;
}

.organization-page > .page-header {
  margin-bottom: 0;
}

.organization-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.excel-actions :deep(.action-button) {
  min-height: 34px;
  font-size: 13px;
}

.feedback-card {
  padding-top: 14px;
  padding-bottom: 14px;
}

.excel-result-card,
.excel-error-card {
  display: grid;
  gap: 12px;
}

.excel-result-card {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
}

.excel-result-card-head {
  display: grid;
  gap: 6px;
}

.excel-result-card h2,
.excel-error-card h2 {
  margin: 0;
  font-size: 18px;
}

.excel-result-card-head p {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.5;
}

.excel-result-grid {
  display: grid;
  gap: 10px;
}

.excel-result-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 16px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fcfcfd;
  padding: 14px 16px;
}

.excel-result-item strong {
  color: var(--foreground);
  font-size: 13px;
  font-weight: 700;
}

.excel-result-item p,
.excel-error-summary {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.6;
}

.excel-result-item p {
  grid-column: 1;
}

.excel-result-item span {
  grid-column: 2;
  grid-row: 1 / span 2;
  color: var(--foreground);
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.excel-error-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
  color: var(--danger);
}

.excel-confirm-modal,
.organization-delete-modal {
  max-width: 520px;
}

.organization-delete-body {
  display: grid;
  gap: 10px;
  margin: 16px 0 20px;
}

.organization-delete-body p {
  margin: 0;
  line-height: 1.6;
}

.organization-delete-target {
  color: var(--muted-foreground);
  font-size: 13px;
}

.organization-user-summary-modal {
  width: min(600px, calc(100vw - 32px));
  padding: 0;
  overflow: hidden;
}

.organization-user-summary-modal__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  border-bottom: 1px solid var(--border);
  padding: 18px 20px;
}

.organization-user-summary-modal__header h2 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0;
}

.organization-user-summary-modal__header p {
  margin: 6px 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.organization-user-summary-modal__close {
  flex: 0 0 auto;
}

.organization-user-summary-modal__body {
  padding: 18px 20px 0;
}

.organization-user-summary-modal :deep(.detail-list) {
  gap: 12px;
}

.organization-user-summary-modal :deep(.detail-list dt) {
  font-size: 10px;
}

.organization-user-summary-modal :deep(.detail-list dd) {
  margin-top: 3px;
  font-size: 13px;
  line-height: 1.55;
}

.action-feedback {
  white-space: pre-line;
}

.excel-confirm-body {
  display: grid;
  gap: 10px;
  margin: 16px 0 20px;
}

.excel-confirm-body p {
  margin: 0;
  line-height: 1.6;
}

.excel-confirm-file {
  color: var(--muted-foreground);
  font-size: 13px;
}

.retry-actions {
  margin-top: 12px;
}

/* 안내 바 스타일 */
.info-bar-new {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 8px;
  min-height: 48px;
}

.info-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 500;
}

.info-icon {
  color: var(--primary); /* orange */
  flex-shrink: 0;
}

.info-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.info-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  color: var(--muted-foreground);
  white-space: nowrap;
}

.info-chip::before {
  content: "•";
  color: var(--primary); /* orange */
  font-size: 14px;
  line-height: 1;
}

/* 탭 스타일 */
.tab-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1px;
}

.admin-tabs {
  display: flex;
  gap: 2px;
  border-bottom: none;
  margin-bottom: 0;
}

.admin-tabs button {
  min-height: 44px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 0 16px;
  color: var(--muted-foreground);
  font-weight: 800;
  margin-bottom: -1px;
  position: relative;
}

.admin-tabs button.active {
  border-bottom-color: var(--primary);
  color: var(--primary);
}

.tab-actions .primary-button {
  margin-bottom: 6px;
}

/* 콘텐츠 카드 및 그리드 스타일 */
.organization-summary-grid {
  display: grid;
  gap: 18px;
  align-items: start;
}

.summary-card,
.chart-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.summary-card-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.summary-card-head-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.summary-card-head-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.summary-card-head-title-row h2 {
  margin: 0;
  min-width: 0;
}

.summary-card-head p {
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
}

.chart-card-head-actions {
  display: grid;
  justify-items: stretch;
  align-content: start;
  gap: 6px;
  flex-shrink: 0;
  width: max-content;
}

.chart-card-head-actions .badge {
  width: 100%;
  box-sizing: border-box;
  display: inline-flex;
  justify-content: center;
}

/* 조직도 카드 우측 상단의 남는 세로 공간만 사용해서 배지 아래에 보조 액션을 배치한다. */
.chart-card-link-btn {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #ffffff;
  padding: 5px 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  min-height: 28px;
  width: 100%;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;
}

.chart-card-link-btn:hover {
  color: var(--primary);
  border-color: #fdba74;
  background: #fffaf5;
}

.summary-list {
  display: grid;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.summary-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
  display: grid;
  gap: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.summary-item-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.summary-item-link {
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.summary-item-link:hover strong {
  color: var(--primary);
}

.summary-item-link:focus-visible {
  outline: 2px solid rgba(249, 115, 22, 0.28);
  outline-offset: 4px;
  border-radius: 8px;
}

.summary-item-head strong {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.summary-item strong {
  font-size: 15px;
  font-weight: 700;
  color: var(--foreground);
}

.dept-badge {
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted-foreground);
  flex-shrink: 0;
  white-space: nowrap;
}

.summary-item-body {
  display: grid;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px dashed var(--border);
  min-height: 0;
  overflow: hidden;
}

.summary-member-name {
  font-size: 13px;
  color: var(--muted-foreground);
  font-weight: 500;
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

.organization-shared-cell {
  vertical-align: middle !important;
  background: #fcfcfd;
  color: var(--foreground);
  font-size: 13px;
}

.organization-affiliate-cell {
  min-width: 108px;
  width: 108px;
}

.organization-department-cell {
  color: var(--foreground);
}

.organization-team-cell {
  color: var(--foreground);
  font-weight: 700;
}

.organization-department-name-cell {
  font-weight: 700;
}

.organization-table-department table,
.organization-table-team table {
  table-layout: fixed;
}

.organization-table-department th:nth-child(1),
.organization-table-department td:nth-child(1) {
  width: 108px;
}

.organization-table-department th:nth-child(2),
.organization-table-department td:nth-child(2) {
  width: 164px;
}

.organization-table-department th:nth-child(3),
.organization-table-department td:nth-child(3) {
  width: 78px;
}

.organization-table-department th:nth-child(4),
.organization-table-department td:nth-child(4) {
  width: 320px;
}

.organization-table-department th:nth-child(5),
.organization-table-department td:nth-child(5) {
  width: 72px;
}

.organization-table-department th:nth-child(6),
.organization-table-department td:nth-child(6) {
  width: 128px;
}

.organization-table-team th:nth-child(1),
.organization-table-team td:nth-child(1) {
  width: 108px;
}

.organization-table-team th:nth-child(2),
.organization-table-team td:nth-child(2) {
  width: 148px;
}

.organization-table-team th:nth-child(3),
.organization-table-team td:nth-child(3) {
  width: 148px;
}

.organization-table-team th:nth-child(4),
.organization-table-team td:nth-child(4) {
  width: 86px;
}

.organization-table-team th:nth-child(5),
.organization-table-team td:nth-child(5) {
  width: 76px;
}

.organization-table-team th:nth-child(6),
.organization-table-team td:nth-child(6) {
  width: 140px;
}

.organization-table-position table {
  table-layout: fixed;
}

.organization-table-position th:nth-child(1),
.organization-table-position td:nth-child(1) {
  width: 220px;
}

.organization-table-position th:nth-child(2),
.organization-table-position td:nth-child(2) {
  width: 84px;
}

.organization-table-position th:nth-child(3),
.organization-table-position td:nth-child(3) {
  width: 92px;
}

.organization-table-position th:nth-child(4),
.organization-table-position td:nth-child(4) {
  width: 140px;
}

/* 카드 푸터 스타일 */
.card-footer {
  margin: 14px -18px -18px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  background: #f8fafc;
  border-radius: 0 0 8px 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.footer-link-btn {
  width: 100%;
  border: 0;
  background: transparent;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  color: var(--muted-foreground);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.15s;
}

.footer-link-btn:hover {
  color: var(--primary);
}

.footer-link-icon {
  flex-shrink: 0;
}

.organization-action-link {
  color: var(--primary-dark);
  font-weight: 700;
}

.organization-action-link:hover {
  color: var(--primary);
  text-decoration: underline;
}

.organization-action-link:focus-visible {
  outline: 2px solid rgba(243, 115, 33, 0.22);
  outline-offset: 2px;
}

.organization-action-link--danger {
  color: var(--danger);
}

.organization-action-link--danger:hover {
  color: #b91c1c;
}

/* 조직도 트리 구조 스타일 */
.org-chart-list {
  display: grid;
  gap: 16px;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.org-department-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  padding: 16px;
  display: grid;
  gap: 16px;
  min-width: 0;
  overflow-x: auto;
}

.org-tree-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
  min-width: max-content;
}

.org-tree-root {
  display: flex;
  justify-content: center;
}

.org-node-box {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  padding: 10px 20px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.dept-box {
  background: #ffffff;
  min-width: 140px;
  border-color: var(--primary); /* subtle orange accent */
}

.team-box {
  background: #f8fafc;
  border: 1px solid var(--border);
  min-width: 120px;
  font-weight: 600;
}

.unassigned-team {
  border-style: dashed;
  background: #f1f5f9;
}

.child-box {
  background: #ffffff;
  min-width: 104px;
  min-height: 44px;
  padding: 8px 12px;
  transition: all 0.15s;
  cursor: pointer;
}

.child-box:hover {
  border-color: var(--primary);
  background: #fff7ed;
}

.org-node-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--foreground);
}

.org-node-desc {
  font-size: 11px;
  color: var(--muted-foreground);
  margin-top: 4px;
}

.org-tree-connector {
  width: 1px;
  height: 16px;
  background: #e2e8f0;
  margin: 0 auto;
}

/* 3-level tree lines */
.org-tree-children.team-level {
  position: relative;
  display: flex;
  justify-content: center;
  gap: 24px;
}

.org-tree-child.team-child {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
}

.org-tree-child.team-child::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: #e2e8f0;
}

.org-tree-child.team-child:first-child::before {
  left: 50%;
}

.org-tree-child.team-child:last-child::before {
  right: 50%;
}

.org-tree-child.team-child:only-child::before {
  display: none;
}

.org-tree-child.team-child::after {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 16px;
  background: #e2e8f0;
}

/* Sub tree connector between Team and User */
.org-tree-connector.sub-connector {
  width: 1px;
  height: 16px;
  background: #e2e8f0;
  margin: 0 auto;
}

.org-tree-children.user-level {
  position: relative;
  display: flex;
  justify-content: center;
  gap: 8px;
}

/* 직원 노드는 가로 스크롤이 과하게 늘어나지 않도록 카드 폭과 높이를 더 컴팩트하게 유지한다. */
.org-tree-child.user-child .org-node-title {
  font-size: 12px;
  line-height: 1.35;
  word-break: keep-all;
}

.org-tree-child.user-child {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
}

.org-tree-child.user-child::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: #e2e8f0;
}

.org-tree-child.user-child:first-child::before {
  left: 50%;
}

.org-tree-child.user-child:last-child::before {
  right: 50%;
}

.org-tree-child.user-child:only-child::before {
  display: none;
}

.org-tree-child.user-child::after {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 16px;
  background: #e2e8f0;
}

.org-empty-users-inline {
  margin-top: 12px;
  padding: 6px 12px;
  font-size: 11px;
  color: var(--muted-foreground);
  background: #f8fafc;
  border: 1px dashed var(--border);
  border-radius: 6px;
  text-align: center;
  position: relative;
  white-space: nowrap;
}

.org-empty-users-inline::before {
  content: "";
  position: absolute;
  top: -12px;
  left: 50%;
  width: 1px;
  height: 12px;
  background: #e2e8f0;
}

.org-empty-users {
  color: var(--muted-foreground);
  font-size: 13px;
  padding: 16px;
  text-align: center;
  background: #f8fafc;
  border-radius: 8px;
  width: 100%;
}

/* Left Card Team list styling */
.summary-team-group {
  margin-top: 12px;
  display: grid;
  gap: 4px;
  min-width: 0;
}

.summary-team-group:first-child {
  margin-top: 0;
}

.summary-team-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary); /* orange */
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-team-title::before {
  content: "•";
  font-size: 14px;
}

.summary-team-users {
  padding-left: 10px;
  display: grid;
  gap: 4px;
  max-height: 168px;
  overflow-y: auto;
  min-width: 0;
}

.summary-member-empty {
  font-size: 11px;
  color: var(--muted-foreground);
  font-style: italic;
}

/* 반응형 스타일 */
@media (min-width: 960px) {
  .excel-result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* 관리자 조직 관리 화면은 좌측 요약 패널을 고정 폭으로 두고 우측 조직도를 메인 영역으로 확장한다. */
  .organization-summary-grid {
    grid-template-columns: 300px minmax(0, 1fr);
  }
}

@media (max-width: 959px) {
  .excel-result-item {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .excel-result-item span {
    grid-column: 1;
    grid-row: auto;
  }

  .organization-header,
  .tab-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .organization-user-summary-modal__header,
  .organization-user-summary-modal__body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .organization-summary-grid {
    gap: 16px;
  }

  .info-bar-new {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .info-right {
    width: 100%;
  }
}

@media (max-width: 576px) {
  .info-right {
    flex-direction: column;
    align-items: flex-start;
  }

  .info-chip {
    width: 100%;
    box-sizing: border-box;
  }
}
</style>
