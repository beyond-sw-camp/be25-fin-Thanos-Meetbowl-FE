<template>
  <div class="member-picker">
    <div v-if="warning" class="member-picker-warning">{{ warning }}</div>
    <label>참석자 검색<input v-model="query" placeholder="이름, 부서, 이메일"></label>
    <div v-if="results.length" class="member-picker-results">
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
import { searchUsers } from '../../lib/users'

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
        department: user.department || '',
        position: user.position || '',
        email: user.email || '',
      }))
  } catch {
    results.value = []
  }
}

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
    position: user.position || '',
    email: user.email || '',
  }])
  query.value = ''
  results.value = []
}

function remove(userId) {
  if (fixedUserIdSet.value.has(userId)) return
  emit('update:modelValue', props.modelValue.filter((attendee) => attendee.userId !== userId))
}

function formatUserMeta(user) {
  return [user?.department, user?.position].filter(Boolean).join(' · ') || '-'
}
</script>

<style scoped>
/* '참석자 검색' 라벨 바로 위에 폼(참석자 영역) 너비로 뜨는 중앙 오버레이. 레이아웃을 밀지 않도록 absolute로 띄운다. */
.member-picker {
  position: relative;
}
.member-picker-warning {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  z-index: 2;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #fdba74;
  border-radius: 10px;
  background: #fff7ed;
  color: #c2410c;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 12px 28px rgba(194, 65, 12, 0.16);
  pointer-events: none;
}
.member-picker-results {
  display: grid;
  gap: 8px;
  margin-top: 8px;
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
.participant-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
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
