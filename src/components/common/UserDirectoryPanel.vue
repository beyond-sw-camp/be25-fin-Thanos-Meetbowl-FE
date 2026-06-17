<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Pagination from './Pagination.vue'
import { getAdminAffiliates, getAdminDepartments, getAdminPositions, getAdminTeams } from '../../lib/admin-organizations'
import { createAdminUser, getAdminUser, updateAdminUser } from '../../lib/admin-users'
import { getOrganizationUserSummary, searchUsers } from '../../lib/user-directory'

const props = defineProps({
  title: { type: String, default: '사용자 검색' },
  description: {
    type: String,
    default: '이름, 이메일, 로그인 ID로 사용자를 찾고 회원 요약 정보를 확인합니다.',
  },
  pageSize: { type: Number, default: 20 },
})

defineExpose({
  // 부모 페이지에서 "회원 추가" 버튼을 눌렀을 때 이 패널의 생성 모달을 열 수 있도록 노출한다.
  openCreate,
})

const loading = ref(true)
const detailLoading = ref(false)
const editLoading = ref(false)
const saving = ref(false)
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
const selectedUser = ref(null)
const editForm = ref(createEmptyForm())
const affiliates = ref([])
const departments = ref([])
const teams = ref([])
const positions = ref([])

const statusFilterOptions = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
]

const hasUsers = computed(() => users.value.length > 0)

const availableAffiliates = computed(() => filterActiveOrSelected(affiliates.value, editForm.value.affiliateId, 'affiliateId'))
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
const availablePositions = computed(() => filterActiveOrSelected(positions.value, editForm.value.positionId, 'positionId'))

onMounted(() => {
  loadUsers()
})

watch(pageNo, () => {
  loadUsers()
})

watch(keyword, () => {
  if (pageNo.value !== 1) {
    // 검색어가 바뀌면 첫 페이지부터 다시 보이도록 페이징을 초기화한다.
    pageNo.value = 1
    return
  }

  loadUsers()
})

watch(status, () => {
  if (pageNo.value !== 1) {
    // 상태 필터 변경도 검색 조건이므로 첫 페이지로 되돌린다.
    pageNo.value = 1
    return
  }

  loadUsers()
})

watch(
  () => editForm.value.affiliateId,
  (affiliateId, previousAffiliateId) => {
    if (affiliateId === previousAffiliateId) return

    // 상위 조직이 바뀌면 더 이상 맞지 않는 부서는 비운다.
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

    // 부서가 바뀌면 연결된 팀도 함께 정리해 잘못된 조합을 막는다.
    const teamStillValid = teams.value.some(
      (item) => item.teamId === editForm.value.teamId && item.departmentId === departmentId,
    )
    if (!teamStillValid) editForm.value.teamId = ''
  },
)

async function loadUsers() {
  // 검색어, 상태, 페이징을 합쳐 사용자 목록을 다시 불러온다.
  loading.value = true
  forbidden.value = false
  errorMessage.value = ''
  actionError.value = ''

  try {
    const data = await searchUsers({
      keyword: keyword.value,
      status: status.value === 'ALL' ? '' : status.value,
      page: pageNo.value,
      size: props.pageSize,
    })

    users.value = (data?.items || []).map(normalizeUserSummary)
    totalPages.value = Number(data?.totalPages || 1)
    totalElements.value = Number(data?.totalElements || 0)
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

async function openDetail(user) {
  // 목록 응답이 아니라 요약 API를 다시 호출해 최신 정보를 보여준다.
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

    detailErrorMessage.value = error?.message || '회원 요약 정보를 불러오지 못했습니다.'
  } finally {
    detailLoading.value = false
  }
}

async function openCreate() {
  // 생성 모달은 빈 폼으로 시작하고, 조직 옵션은 미리 준비해 둔다.
  actionError.value = ''
  successMessage.value = ''
  await loadOrganizationOptions()
  editForm.value = createEmptyForm()
  editOpen.value = true
}

async function openEdit(user) {
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
  // 계열사/부서/팀/직급 마스터는 수정 폼에서 공통으로 쓰므로 한 번만 불러온다.
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

  // userId 유무로 생성과 수정을 같은 저장 흐름에서 분기한다.
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
      const normalized = normalizeUserSummary(created?.user)
      if (pageNo.value !== 1) {
        pageNo.value = 1
        await loadUsers()
      } else {
        users.value = [normalized, ...users.value].slice(0, props.pageSize)
        totalElements.value += 1
        totalPages.value = Math.max(1, Math.ceil(totalElements.value / props.pageSize))
      }
      successMessage.value = '사용자 계정을 생성했습니다.'
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
  // 비활성 값이라도 현재 선택된 값이면 수정 폼에서 계속 유지한다.
  return items.filter((item) => item.status === 'ACTIVE' || item[idField] === selectedId)
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
      <input v-model="keyword" placeholder="이름, 로그인 ID, 이메일, 부서, 팀 검색" />
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

      <div v-if="actionError" class="error-box" style="margin-bottom: 12px;">
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
              <th>직급</th>
              <th>권한</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!hasUsers">
              <td colspan="10"><div class="empty-state">검색 결과가 없습니다.</div></td>
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
              <td>
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
            <h2>{{ detailLoading ? '회원 요약 조회 중' : selectedUser?.name || '-' }}</h2>
            <p v-if="!detailLoading">{{ selectedUser?.department || '-' }} · {{ selectedUser?.position || '-' }}</p>
          </div>
          <button @click="detailOpen = false">닫기</button>
        </header>

        <div v-if="detailLoading" class="empty-state">회원 요약 정보를 불러오는 중입니다.</div>
        <div v-else-if="detailErrorMessage" class="error-box">{{ detailErrorMessage }}</div>
        <template v-else-if="selectedUser">
          <dl class="detail-list">
            <div><dt>이름</dt><dd>{{ selectedUser.name }}</dd></div>
            <div><dt>이메일</dt><dd>{{ selectedUser.email }}</dd></div>
            <div><dt>계열사</dt><dd>{{ selectedUser.affiliate }}</dd></div>
            <div><dt>부서</dt><dd>{{ selectedUser.department }}</dd></div>
            <div><dt>팀</dt><dd>{{ selectedUser.team }}</dd></div>
            <div><dt>직급</dt><dd>{{ selectedUser.position }}</dd></div>
            <div><dt>권한</dt><dd>{{ roleLabel(selectedUser.role) }}</dd></div>
            <div><dt>상태</dt><dd>{{ statusLabel(selectedUser.status) }}</dd></div>
          </dl>
        </template>
      </article>
    </div>

    <div v-if="editOpen" class="modal-backdrop" @click.self="editOpen = false">
      <article class="card write-modal admin-modal">
        <header>
          <div>
            <h2>{{ editForm.userId ? '사용자 수정' : '회원 추가' }}</h2>
            <p>{{ editForm.loginId || '새 사용자 정보를 입력하세요.' }}</p>
          </div>
          <button @click="editOpen = false">닫기</button>
        </header>

        <div v-if="editLoading" class="empty-state">사용자 정보를 불러오는 중입니다.</div>
        <form v-else class="form-grid" @submit.prevent="saveMember">
          <label>
            로그인 ID
            <input v-model="editForm.loginId" :readonly="Boolean(editForm.userId)" :disabled="Boolean(editForm.userId)" :class="{ readonly: Boolean(editForm.userId) }" required />
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
              <select v-model="editForm.role">
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <label v-if="!editForm.userId">
              상태
              <select v-model="editForm.status">
                <option value="ACTIVE">활성</option>
                <option value="INACTIVE">비활성</option>
              </select>
            </label>
          </div>
          <div class="form-row two">
            <label>
              계열사
              <select v-model="editForm.affiliateId" :disabled="organizationLoading">
                <option value="">선택 안 함</option>
                <option v-for="affiliate in availableAffiliates" :key="affiliate.affiliateId" :value="affiliate.affiliateId">
                  {{ affiliate.name }}
                </option>
              </select>
            </label>
            <label>
              부서
              <select v-model="editForm.departmentId" :disabled="organizationLoading">
                <option value="">선택 안 함</option>
                <option v-for="department in availableDepartments" :key="department.departmentId" :value="department.departmentId">
                  {{ department.name }}
                </option>
              </select>
            </label>
          </div>
          <div class="form-row two">
            <label>
              팀
              <select v-model="editForm.teamId" :disabled="organizationLoading">
                <option value="">선택 안 함</option>
                <option v-for="team in availableTeams" :key="team.teamId" :value="team.teamId">
                  {{ team.name }}
                </option>
              </select>
            </label>
            <label>
              직급
              <select v-model="editForm.positionId" :disabled="organizationLoading">
                <option value="">선택 안 함</option>
                <option v-for="position in availablePositions" :key="position.positionId" :value="position.positionId">
                  {{ position.name }}
                </option>
              </select>
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
          <div class="modal-actions">
            <button type="button" class="secondary-button" @click="editOpen = false">취소</button>
            <button class="primary-button" :disabled="saving">
              {{ saving ? '저장 중...' : '저장' }}
            </button>
          </div>
        </form>
      </article>
    </div>
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

.directory-table {
  margin-top: 0;
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
