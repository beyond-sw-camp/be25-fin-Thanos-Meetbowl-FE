<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Pagination from './Pagination.vue'
import { getOrganizationUserSummary, searchUsers } from '../../lib/user-directory'

const props = defineProps({
  title: { type: String, default: '사용자 검색' },
  description: {
    type: String,
    default: '이름, 이메일, 로그인 ID로 사용자를 찾고 회원 요약 정보를 확인합니다.',
  },
  pageSize: { type: Number, default: 20 },
})

const loading = ref(true)
const detailLoading = ref(false)
const forbidden = ref(false)
const errorMessage = ref('')
const detailErrorMessage = ref('')
const keyword = ref('')
const status = ref('ALL')
const pageNo = ref(1)
const totalPages = ref(1)
const totalElements = ref(0)
const users = ref([])
const detailOpen = ref(false)
const selectedUser = ref(null)

const statusFilterOptions = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
]

const hasUsers = computed(() => users.value.length > 0)

onMounted(() => {
  loadUsers()
})

watch(pageNo, () => {
  loadUsers()
})

watch(keyword, () => {
  if (pageNo.value !== 1) {
    pageNo.value = 1
    return
  }

  loadUsers()
})

watch(status, () => {
  if (pageNo.value !== 1) {
    pageNo.value = 1
    return
  }

  loadUsers()
})

async function loadUsers() {
  loading.value = true
  forbidden.value = false
  errorMessage.value = ''

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
  }
}

function roleLabel(role) {
  return role === 'ADMIN' ? 'ADMIN' : role === 'USER' ? 'USER' : role || '-'
}

function statusLabel(value) {
  return value === 'ACTIVE' ? '활성' : value === 'INACTIVE' ? '비활성' : value || '-'
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
      <input v-model="keyword" placeholder="이름, 로그인 ID, 이메일 검색" />
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

    <div v-if="loading" class="empty-state">
      사용자 검색 결과를 불러오는 중입니다.
    </div>

    <div v-else-if="forbidden" class="empty-state">
      <h3>접근 권한 없음</h3>
      <p>이 기능을 사용할 권한이 없습니다.</p>
    </div>

    <div v-else-if="errorMessage" class="error-box">
      {{ errorMessage }}
    </div>

    <template v-else>
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
            </tr>
          </thead>
          <tbody>
            <tr v-if="!hasUsers">
              <td colspan="9"><div class="empty-state">검색 결과가 없습니다.</div></td>
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
}
</style>
