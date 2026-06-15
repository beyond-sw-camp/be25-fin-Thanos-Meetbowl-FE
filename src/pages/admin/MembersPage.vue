<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Pagination from '../../components/common/Pagination.vue'
import {
  getAdminAffiliates,
  getAdminDepartments,
  getAdminPositions,
  getAdminTeams,
} from '../../lib/admin-organizations'
import {
  createAdminUser,
  getAdminUser,
  getAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
} from '../../lib/admin-users'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const loading = ref(true)
const saving = ref(false)
const detailLoading = ref(false)
const organizationLoading = ref(false)
const forbidden = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const actionError = ref('')
const temporaryPasswordNotice = ref('')

const modal = ref(false)
const detailOpen = ref(false)
const selectedUser = ref(null)
const pageNo = ref(1)
const pageSize = 20
const totalPages = ref(1)
const totalElements = ref(0)
const q = ref('')
const filter = ref('전체')

const users = ref([])
const affiliates = ref([])
const departments = ref([])
const teams = ref([])
const positions = ref([])

const form = ref(createEmptyForm())

const roleOptions = [
  { value: 'USER', label: 'USER' },
  { value: 'ADMIN', label: 'ADMIN' },
]

const statusOptions = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
]

const statusFilterOptions = ['전체', 'ACTIVE', 'INACTIVE']

const isAdmin = computed(() => auth.user?.role === 'ADMIN')

const availableAffiliates = computed(() =>
  filterActiveOrSelected(affiliates.value, form.value.affiliateId, 'affiliateId'),
)
const availableDepartments = computed(() =>
  filterActiveOrSelected(
    departments.value.filter((item) => !form.value.affiliateId || item.affiliateId === form.value.affiliateId),
    form.value.departmentId,
    'departmentId',
  ),
)
const availableTeams = computed(() =>
  filterActiveOrSelected(
    teams.value.filter((item) => !form.value.departmentId || item.departmentId === form.value.departmentId),
    form.value.teamId,
    'teamId',
  ),
)
const availablePositions = computed(() =>
  filterActiveOrSelected(positions.value, form.value.positionId, 'positionId'),
)

const filteredUsers = computed(() => {
  if (filter.value === '전체') return users.value
  return users.value.filter((user) => user.status === filter.value)
})

onMounted(() => {
  loadPage()
})

watch(pageNo, () => {
  refreshUserList()
})

watch(q, () => {
  if (pageNo.value !== 1) {
    pageNo.value = 1
    return
  }

  refreshUserList()
})

watch(
  () => form.value.affiliateId,
  (affiliateId, previousAffiliateId) => {
    if (affiliateId === previousAffiliateId) return

    // 상위 조직이 바뀌면 현재 선택한 하위 부서가 더 이상 유효한지 다시 확인한다.
    const departmentStillValid = departments.value.some(
      (item) => item.departmentId === form.value.departmentId && item.affiliateId === affiliateId,
    )
    if (!departmentStillValid) form.value.departmentId = ''
  },
)

watch(
  () => form.value.departmentId,
  (departmentId, previousDepartmentId) => {
    if (departmentId === previousDepartmentId) return

    // 부서 변경 시 팀도 같은 방식으로 연쇄 정리해 잘못된 조합 전송을 막는다.
    const teamStillValid = teams.value.some(
      (item) => item.teamId === form.value.teamId && item.departmentId === departmentId,
    )
    if (!teamStillValid) form.value.teamId = ''
  },
)

async function loadPage() {
  if (!isAdmin.value) {
    forbidden.value = true
    loading.value = false
    return
  }

  loading.value = true
  forbidden.value = false
  errorMessage.value = ''
  actionError.value = ''

  try {
    // 첫 진입에서는 조직 선택값과 사용자 목록을 함께 받아 화면이 한 번에 준비되게 한다.
    await Promise.all([loadOrganizationOptions(), loadUsers()])
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    errorMessage.value = error?.message || '사용자 관리 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function loadOrganizationOptions() {
  organizationLoading.value = true

  try {
    // 생성/수정 폼에서 쓰는 조직 마스터는 서로 독립적이어서 병렬 조회가 가장 빠르다.
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

async function loadUsers() {
  actionError.value = ''

  try {
    const data = await getAdminUsers({
      page: pageNo.value,
      size: pageSize,
      keyword: q.value,
    })

    users.value = (data?.items || []).map(normalizeUserRow)
    totalPages.value = Number(data?.totalPages || 1)
    totalElements.value = Number(data?.totalElements || 0)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    throw error
  }
}

async function refreshUserList() {
  try {
    await loadUsers()
  } catch (error) {
    actionError.value = error?.message || '사용자 목록을 불러오지 못했습니다.'
  }
}

function openModal(user = null) {
  actionError.value = ''
  successMessage.value = ''
  temporaryPasswordNotice.value = ''

  if (user) {
    form.value = createFormFromUser(user)
  } else {
    form.value = createEmptyForm()
  }

  modal.value = true
}

function closeModal() {
  modal.value = false
  saving.value = false
}

async function saveMember() {
  if (saving.value) return

  saving.value = true
  actionError.value = ''
  successMessage.value = ''
  temporaryPasswordNotice.value = ''

  try {
    if (form.value.userId) {
      // 수정 API는 status를 받지 않으므로 BE DTO에 맞는 필드만 따로 만든다.
      const updated = await updateAdminUser(form.value.userId, buildUserUpdatePayload(form.value))
      const normalized = normalizeUserRow(updated)

      users.value = users.value.map((item) => (item.userId === normalized.userId ? normalized : item))
      if (selectedUser.value?.userId === normalized.userId) {
        selectedUser.value = normalized
      }
      successMessage.value = '사용자 정보를 수정했습니다.'
    } else {
      // 생성 성공 직후에는 응답 본문만으로 목록/안내를 즉시 갱신해 재조회 대기 시간을 줄인다.
      const created = await createAdminUser(buildUserCreatePayload(form.value))
      const normalized = normalizeUserRow(created?.user)

      if (pageNo.value !== 1) {
        pageNo.value = 1
        await loadUsers()
      } else {
        users.value = [normalized, ...users.value].slice(0, pageSize)
        totalElements.value += 1
        totalPages.value = Math.max(1, Math.ceil(totalElements.value / pageSize))
      }

      successMessage.value = '사용자 계정을 생성했습니다.'
      temporaryPasswordNotice.value = created?.temporaryPassword
        ? `임시 비밀번호: ${created.temporaryPassword}`
        : '임시 비밀번호는 생성 응답에 포함되지 않았습니다.'
    }

    closeModal()
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      closeModal()
      return
    }

    actionError.value = error?.message || '사용자 저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function openDetail(user) {
  detailOpen.value = true
  detailLoading.value = true
  selectedUser.value = null
  actionError.value = ''

  try {
    // 목록 응답보다 상세 응답을 기준으로 모달을 채워 최신 값을 보장한다.
    const data = await getAdminUser(user.userId)
    selectedUser.value = normalizeUserRow(data)
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      detailOpen.value = false
      return
    }

    actionError.value = error?.message || '사용자 상세 정보를 불러오지 못했습니다.'
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

async function changeStatus(user) {
  const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  const actionLabel = nextStatus === 'ACTIVE' ? '활성화' : '비활성화'

  actionError.value = ''
  successMessage.value = ''

  try {
    const updated = await updateAdminUserStatus(user.userId, nextStatus)
    const normalized = normalizeUserRow(updated)

    users.value = users.value.map((item) => (item.userId === normalized.userId ? normalized : item))
    if (selectedUser.value?.userId === normalized.userId) {
      selectedUser.value = normalized
    }
    successMessage.value = `사용자를 ${actionLabel}했습니다.`
  } catch (error) {
    if (error?.status === 403) {
      forbidden.value = true
      return
    }

    actionError.value = error?.message || `사용자 ${actionLabel}에 실패했습니다.`
  }
}

function retryLoad() {
  loadPage()
}

function statusLabel(status) {
  return status === 'ACTIVE' ? '활성' : status === 'INACTIVE' ? '비활성' : status || '-'
}

function roleLabel(role) {
  return role === 'ADMIN' ? 'ADMIN' : role === 'USER' ? 'USER' : role || '-'
}

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
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
    userId: user.userId,
    loginId: user.loginId || '',
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'USER',
    status: user.status || 'ACTIVE',
    affiliateId: user.affiliateId || '',
    departmentId: user.departmentId || '',
    teamId: user.teamId || '',
    positionId: user.positionId || '',
    activeFrom: toDateInputValue(user.activeFrom),
    activeUntil: toDateInputValue(user.activeUntil),
  }
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

function buildUserCreatePayload(targetForm) {
  return {
    // loginId와 status는 생성 DTO 전용 필드라서 create payload에서만 포함한다.
    loginId: targetForm.loginId.trim(),
    ...buildSharedUserPayload(targetForm),
    status: targetForm.status,
  }
}

function buildUserUpdatePayload(targetForm) {
  return buildSharedUserPayload(targetForm)
}

function normalizeUserRow(user) {
  return {
    ...user,
    userId: user?.userId || '',
    loginId: user?.loginId || '',
    name: user?.name || '',
    email: user?.email || '',
    affiliateId: user?.affiliateId || '',
    affiliate: user?.affiliate || '-',
    departmentId: user?.departmentId || '',
    department: user?.department || '-',
    teamId: user?.teamId || '',
    team: user?.team || '-',
    positionId: user?.positionId || '',
    position: user?.position || '-',
    role: `${user?.role || ''}`.toUpperCase(),
    status: `${user?.status || ''}`.toUpperCase(),
    activeFrom: user?.activeFrom || null,
    activeUntil: user?.activeUntil || null,
    createdAt: user?.createdAt || null,
    // 현재 AdminUserResponse DTO에는 updatedAt이 없어도 화면 구조는 같은 키로 다루도록 맞춘다.
    updatedAt: user?.updatedAt || null,
    initialPasswordChangeRequired: Boolean(user?.initialPasswordChangeRequired),
  }
}

function filterActiveOrSelected(items, selectedId, idField) {
  // 비활성 조직 항목이라도 이미 사용자에게 매핑돼 있으면 수정 화면에서 끊기지 않게 유지한다.
  return items.filter((item) => item.status === 'ACTIVE' || item[idField] === selectedId)
}
</script>

<template>
  <section class="page admin-page">
    <header class="page-header rooms-header">
      <div>
        <h1>회원 관리</h1>
        <p>사용자 계정과 조직, 권한, 활성 상태를 관리합니다.</p>
      </div>
      <div class="admin-actions">
        <button class="primary-button" @click="openModal()">회원 추가</button>
      </div>
    </header>

    <article v-if="loading" class="card empty-state">
      사용자 관리 정보를 불러오는 중입니다.
    </article>

    <article v-else-if="forbidden" class="card empty-state">
      <h2>접근 권한 없음</h2>
      <p>이 화면은 관리자 계정만 확인할 수 있습니다.</p>
    </article>

    <article v-else-if="errorMessage" class="card">
      <div class="error-box">{{ errorMessage }}</div>
      <div class="admin-actions" style="margin-top: 12px;">
        <button class="secondary-button" type="button" @click="retryLoad">다시 시도</button>
      </div>
    </article>

    <template v-else>
      <div v-if="successMessage" class="card" style="margin-bottom: 16px;">
        <p class="settings-success">{{ successMessage }}</p>
        <div v-if="temporaryPasswordNotice" class="settings-alert" style="margin-top: 12px;">
          {{ temporaryPasswordNotice }}
        </div>
      </div>

      <div v-if="actionError" class="card" style="margin-bottom: 16px;">
        <div class="error-box">{{ actionError }}</div>
      </div>

      <div class="card admin-toolbar">
        <input v-model="q" placeholder="이름, 로그인 ID, 이메일, 계열사, 부서 검색" />
        <div class="toolbar">
          <button
            v-for="item in statusFilterOptions"
            :key="item"
            class="chip"
            :class="{ active: filter === item }"
            @click="filter = item"
          >
            {{ item === '전체' ? '전체 상태' : statusLabel(item) }}
          </button>
        </div>
        <span>총 {{ totalElements }}명</span>
      </div>

      <div class="table-card admin-data-table">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>로그인 ID</th>
              <th>이메일</th>
              <th>계열사</th>
              <th>부서</th>
              <th>팀</th>
              <th>직급</th>
              <th>권한</th>
              <th>상태</th>
              <th>활성 시작</th>
              <th>활성 종료</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredUsers.length">
              <td colspan="12"><div class="empty-state">조건에 맞는 사용자가 없습니다.</div></td>
            </tr>
            <tr v-for="member in filteredUsers" :key="member.userId" @click="openDetail(member)">
              <td><span class="table-avatar">{{ member.name?.[0] || '?' }}</span>{{ member.name }}</td>
              <td>{{ member.loginId }}</td>
              <td>{{ member.email }}</td>
              <td>{{ member.affiliate }}</td>
              <td>{{ member.department }}</td>
              <td>{{ member.team }}</td>
              <td>{{ member.position }}</td>
              <td>{{ roleLabel(member.role) }}</td>
              <td><span :class="['badge', member.status === 'ACTIVE' ? 'success' : 'warning']">{{ statusLabel(member.status) }}</span></td>
              <td>{{ formatDate(member.activeFrom) }}</td>
              <td>{{ formatDate(member.activeUntil) }}</td>
              <td>
                <button class="icon-text" @click.stop="openModal(member)">수정</button>
                <button class="icon-text danger-text" @click.stop="changeStatus(member)">
                  {{ member.status === 'ACTIVE' ? '비활성화' : '활성화' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination v-model="pageNo" :total-pages="totalPages" />

      <div v-if="modal" class="modal-backdrop" @click.self="closeModal">
        <article class="card write-modal admin-modal">
          <header>
            <h2>{{ form.userId ? '회원 정보 수정' : '회원 추가' }}</h2>
            <button @click="closeModal">닫기</button>
          </header>

          <form class="form-grid" @submit.prevent="saveMember">
            <label>
              로그인 ID
              <input v-model="form.loginId" :readonly="Boolean(form.userId)" :disabled="Boolean(form.userId)" required />
            </label>
            <label>
              이름
              <input v-model="form.name" required />
            </label>
            <label>
              이메일
              <input v-model="form.email" type="email" required />
            </label>
            <div class="form-row two">
              <label>
                권한
                <select v-model="form.role">
                  <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label>
                상태
                <select v-model="form.status">
                  <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>
            <div class="form-row two">
              <label>
                계열사
                <select v-model="form.affiliateId" :disabled="organizationLoading">
                  <option value="">선택 안 함</option>
                  <option
                    v-for="affiliate in availableAffiliates"
                    :key="affiliate.affiliateId"
                    :value="affiliate.affiliateId"
                  >
                    {{ affiliate.name }}
                  </option>
                </select>
              </label>
              <label>
                부서
                <select v-model="form.departmentId" :disabled="organizationLoading">
                  <option value="">선택 안 함</option>
                  <option
                    v-for="department in availableDepartments"
                    :key="department.departmentId"
                    :value="department.departmentId"
                  >
                    {{ department.name }}
                  </option>
                </select>
              </label>
            </div>
            <div class="form-row two">
              <label>
                팀
                <select v-model="form.teamId" :disabled="organizationLoading">
                  <option value="">선택 안 함</option>
                  <option v-for="team in availableTeams" :key="team.teamId" :value="team.teamId">
                    {{ team.name }}
                  </option>
                </select>
              </label>
              <label>
                직급
                <select v-model="form.positionId" :disabled="organizationLoading">
                  <option value="">선택 안 함</option>
                  <option
                    v-for="position in availablePositions"
                    :key="position.positionId"
                    :value="position.positionId"
                  >
                    {{ position.name }}
                  </option>
                </select>
              </label>
            </div>
            <div class="form-row two">
              <label>
                활성 시작일
                <input v-model="form.activeFrom" type="date" />
              </label>
              <label>
                활성 종료일
                <input v-model="form.activeUntil" type="date" />
              </label>
            </div>
            <div class="modal-actions">
              <button type="button" class="secondary-button" @click="closeModal">취소</button>
              <button class="primary-button" :disabled="saving">
                {{ saving ? '저장 중...' : '저장' }}
              </button>
            </div>
          </form>
        </article>
      </div>

      <div v-if="detailOpen" class="modal-backdrop" @click.self="detailOpen = false">
        <article class="card write-modal detail-modal">
          <header>
            <div>
              <h2>{{ detailLoading ? '사용자 상세 조회 중' : selectedUser?.name || '-' }}</h2>
              <p v-if="!detailLoading">{{ selectedUser?.department || '-' }} · {{ selectedUser?.position || '-' }}</p>
            </div>
            <button @click="detailOpen = false">닫기</button>
          </header>

          <div v-if="detailLoading" class="empty-state">사용자 상세 정보를 불러오는 중입니다.</div>
          <template v-else-if="selectedUser">
            <dl class="detail-list">
              <div><dt>userId</dt><dd>{{ selectedUser.userId }}</dd></div>
              <div><dt>loginId</dt><dd>{{ selectedUser.loginId }}</dd></div>
              <div><dt>이름</dt><dd>{{ selectedUser.name }}</dd></div>
              <div><dt>이메일</dt><dd>{{ selectedUser.email }}</dd></div>
              <div><dt>계열사</dt><dd>{{ selectedUser.affiliate }}</dd></div>
              <div><dt>부서</dt><dd>{{ selectedUser.department }}</dd></div>
              <div><dt>팀</dt><dd>{{ selectedUser.team }}</dd></div>
              <div><dt>직급</dt><dd>{{ selectedUser.position }}</dd></div>
              <div><dt>권한</dt><dd>{{ roleLabel(selectedUser.role) }}</dd></div>
              <div><dt>상태</dt><dd>{{ statusLabel(selectedUser.status) }}</dd></div>
              <div><dt>activeFrom</dt><dd>{{ formatDateTime(selectedUser.activeFrom) }}</dd></div>
              <div><dt>activeUntil</dt><dd>{{ formatDateTime(selectedUser.activeUntil) }}</dd></div>
              <div><dt>createdAt</dt><dd>{{ formatDateTime(selectedUser.createdAt) }}</dd></div>
              <div><dt>updatedAt</dt><dd>{{ formatDateTime(selectedUser.updatedAt) }}</dd></div>
              <div>
                <dt>초기 비밀번호 변경 필요</dt>
                <dd>{{ selectedUser.initialPasswordChangeRequired ? '예' : '아니오' }}</dd>
              </div>
            </dl>
            <div class="modal-actions">
              <button
                class="secondary-button"
                @click="openModal(selectedUser); detailOpen = false"
              >
                정보 수정
              </button>
            </div>
          </template>
        </article>
      </div>
    </template>
  </section>
</template>
