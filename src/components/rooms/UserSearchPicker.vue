<template>
  <div class="member-picker">
    <div v-if="warning" class="member-picker-warning" role="alert">
      <span class="member-picker-warning__icon">!</span>
      <span>{{ warning }}</span>
    </div>
    <label>참석자 검색<input v-model="query" placeholder="이름, 부서, 이메일로 검색하세요"></label>
    <div v-if="results.length" class="member-picker-results">
      <button
        v-for="scope in scopeResults"
        :key="scope.key"
        type="button"
        :disabled="checking"
        class="member-picker-result-button member-picker-result-button--scope"
        @click="addScope(scope)"
      >
        <strong>{{ scope.label }}</strong>
        <span>{{ scope.description }}</span>
      </button>
      <button
        v-for="user in results"
        :key="user.userId"
        type="button"
        :disabled="checking"
        class="member-picker-result-button"
        @click="add(user)"
      >
        <strong>{{ user.name }}</strong>
        <span>{{ formatUserMeta(user) }}</span>
      </button>
    </div>
    <div class="participant-chips">
      <span v-for="attendee in modelValue" :key="attendee.userId" class="participant-chip">
        <strong>{{ attendee.name }}</strong>
        <small>{{ formatUserMeta(attendee) }}</small>
        <button
          v-if="!fixedUserIdSet.has(attendee.userId)"
          type="button"
          @click="remove(attendee.userId)"
        >
          ×
        </button>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { listUsersByScope, searchUsers } from '../../lib/users'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  excludeUserId: { type: String, default: '' },
  fixedUserIds: { type: Array, default: () => [] },
  // 추가 직전 비동기 검증 훅(선택). user를 받아 차단 사유 문자열을 반환하면 추가하지 않고 reject 이벤트로 알린다.
  // null(미지정)이면 검증 없이 바로 추가한다.
  validateAdd: { type: Function, default: null },
  // 참석자 겹침 경고 문구(선택). '참석자 검색' 라벨 바로 위에 폼 너비의 중앙 오버레이로 표시한다. 빈 문자열이면 숨김.
  warning: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'reject'])

const query = ref('')
const results = ref([])
const checking = ref(false)
const fixedUserIdSet = computed(() => new Set(props.fixedUserIds.filter(Boolean)))
const auth = useAuthStore()
let seq = 0
let debounceTimer = null
const DEBOUNCE_MS = 250

async function runSearch(keyword) {
  const current = ++seq
  try {
    const data = await searchUsers({ keyword, page: 1, size: 8 })
    if (current !== seq) return // 더 최근 입력의 응답만 반영한다.
    const selected = new Set(props.modelValue.map((attendee) => attendee.userId))
    results.value = (data?.items || [])
      // 관리자(ADMIN)는 회의 참석자로 지정할 수 없으므로 검색 결과에서 제외한다.
      .filter((user) => user.role !== 'ADMIN' && user.userId !== props.excludeUserId && !selected.has(user.userId))
      .map((user) => ({
        userId: user.userId,
        name: user.name || '-',
        affiliateId: user.affiliateId || '',
        departmentId: user.departmentId || '',
        department: user.department || '',
        teamId: user.teamId || '',
        team: user.team || '',
        position: user.position || '',
        email: user.email || '',
      }))
  } catch {
    results.value = []
  }
}

const scopeResults = computed(() => {
  const seen = new Set()
  const items = []
  for (const user of results.value) {
    if (user?.teamId && user?.team) {
      const key = `team:${user.teamId}`
      if (!seen.has(key)) {
        seen.add(key)
        items.push({
          key,
          label: `${user.team} 팀 전체 추가`,
          description: user.department ? `${user.department} 소속 팀 구성원 전체를 추가합니다.` : '팀 구성원 전체를 추가합니다.',
          affiliateId: user.affiliateId || auth.user?.affiliateId || '',
          departmentId: user.departmentId || '',
          teamId: user.teamId,
        })
      }
    }
    if (user?.departmentId && user?.department) {
      const key = `department:${user.departmentId}`
      if (!seen.has(key)) {
        seen.add(key)
        items.push({
          key,
          label: `${user.department} 부서 전체 추가`,
          description: '부서 구성원 전체를 추가합니다.',
          affiliateId: user.affiliateId || auth.user?.affiliateId || '',
          departmentId: user.departmentId,
          teamId: '',
        })
      }
    }
  }
  return items.slice(0, 6)
})

// 디바운스: 타이핑 중에는 호출하지 않고, 입력이 멈춘 뒤 DEBOUNCE_MS가 지나면 한 번만 검색한다.
watch(query, (value) => {
  clearTimeout(debounceTimer)
  const keyword = value.trim()
  if (!keyword) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(() => runSearch(keyword), DEBOUNCE_MS)
})

// 입력 도중 컴포넌트가 닫히면 예약된 검색 타이머를 정리한다.
onBeforeUnmount(() => clearTimeout(debounceTimer))

async function add(user) {
  if (checking.value) return
  if (props.modelValue.some((attendee) => attendee.userId === user.userId)) return
  // 추가 직전 검증(시간 겹침 등). 차단 사유가 오면 추가하지 않고 reject로 알린다.
  if (props.validateAdd) {
    checking.value = true
    try {
      const rejection = await props.validateAdd(user)
      if (rejection) {
        emit('reject', rejection)
        return
      }
    } finally {
      checking.value = false
    }
  }
  emit('update:modelValue', [...props.modelValue, {
    userId: user.userId,
    name: user.name,
    department: user.department || '',
    team: user.team || '',
    position: user.position || '',
    email: user.email || '',
  }])
  query.value = ''
  results.value = []
}

async function addScope(scope) {
  if (checking.value) return
  checking.value = true
  try {
    const members = await listUsersByScope({
      affiliateId: scope.affiliateId,
      departmentId: scope.departmentId,
      teamId: scope.teamId,
    })
    const selectedIds = new Set(props.modelValue.map((attendee) => attendee.userId))
    const next = [...props.modelValue]
    for (const member of members) {
      if (!member?.userId) continue
      if (member.userId === props.excludeUserId) continue
      if (selectedIds.has(member.userId)) continue
      next.push({
        userId: member.userId,
        name: member.name || '-',
        department: member.department || '',
        team: member.team || '',
        position: member.position || '',
        email: member.email || '',
      })
      selectedIds.add(member.userId)
    }
    emit('update:modelValue', next)
    query.value = ''
    results.value = []
  } finally {
    checking.value = false
  }
}

function remove(userId) {
  if (fixedUserIdSet.value.has(userId)) return
  emit('update:modelValue', props.modelValue.filter((attendee) => attendee.userId !== userId))
}

function formatUserMeta(user) {
  return [user?.department, user?.team, user?.position].filter(Boolean).join(' · ') || '-'
}
</script>

<style scoped>
.member-picker {
  display: grid;
  gap: 10px;
}
.member-picker label {
  display: grid;
  gap: 8px;
  color: var(--foreground);
  font-size: 14px;
  font-weight: 700;
}
.member-picker label input {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 12px 14px;
  color: var(--foreground);
  font: inherit;
}
.member-picker-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #fdba74;
  border-radius: 12px;
  background: #fff7ed;
  color: #c2410c;
  padding: 11px 13px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}
.member-picker-warning__icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.12);
  color: #ea580c;
  font-size: 12px;
  font-weight: 900;
  flex-shrink: 0;
}
.member-picker-results {
  display: grid;
  gap: 8px;
}
.member-picker-result-button {
  display: grid;
  gap: 4px;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 12px 14px;
  text-align: left;
}
.member-picker-result-button span {
  color: var(--muted-foreground);
  font-size: 13px;
}
.member-picker-result-button--scope {
  border-color: rgba(243, 115, 33, 0.18);
  background: #fff8f3;
}
.member-picker-result-button--scope strong {
  color: #9a3412;
}
.member-picker-result-button--scope span {
  color: #c2410c;
}
.participant-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.participant-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #f3f4f6;
  color: var(--foreground);
  padding: 8px 12px;
  font-size: 13px;
  white-space: nowrap;
}
.participant-chip small {
  color: var(--muted-foreground);
  font-size: 13px;
}
.participant-chip button {
  border: 0;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}
</style>
