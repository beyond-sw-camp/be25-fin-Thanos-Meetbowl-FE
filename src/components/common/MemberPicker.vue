<template>
  <div ref="pickerRootRef" class="member-picker user-suggestion-field">
    <label v-if="label">
      {{ label }}
      <input
        v-model="query"
        :placeholder="placeholder"
        @input="handleSuggestionInput"
        @compositionupdate="handleSuggestionInput"
        @compositionend="handleSuggestionInput"
        @keydown="handleSuggestionKeydown($event, selectMemberSuggestion)"
      >
    </label>
    <input
      v-else
      v-model="query"
      :placeholder="placeholder"
      @input="handleSuggestionInput"
      @compositionupdate="handleSuggestionInput"
      @compositionend="handleSuggestionInput"
      @keydown="handleSuggestionKeydown($event, selectMemberSuggestion)"
    >

    <div v-if="showSuggestionDropdown" class="member-picker-results user-suggestion-dropdown">
      <div v-if="suggestionLoading" class="user-suggestion-status">검색 중...</div>
      <div v-else-if="suggestionError" class="user-suggestion-status">{{ suggestionError }}</div>
      <template v-else-if="suggestions.length">
        <div v-if="scopeSuggestions.length" class="member-scope-suggestions">
          <button
            v-for="scope in scopeSuggestions"
            :key="scope.key"
            type="button"
            class="member-scope-item"
            @click="selectScope(scope)"
          >
            <strong>{{ scope.label }}</strong>
            <span>{{ scope.description }}</span>
          </button>
        </div>
        <button
          v-for="(member, index) in suggestions"
          :key="member.userId"
          type="button"
          class="user-suggestion-item"
          :class="{ active: activeSuggestionIndex === index }"
          @mouseenter="setActiveSuggestion(index)"
          @click="selectSuggestion(member, selectMemberSuggestion)"
        >
          <div class="user-suggestion-main">
            <strong>{{ member.name || '-' }}</strong>
            <span>{{ member.email || '-' }}</span>
            <small v-if="showLoginId">{{ member.loginId || '-' }}</small>
            <small>{{ [member.affiliate, member.department, member.team, member.position].filter(Boolean).join(' · ') || '-' }}</small>
          </div>
        </button>
      </template>
      <div v-else class="user-suggestion-status">검색 결과가 없습니다.</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserSuggestions } from '../../composables/useUserSuggestions.js'
import { listUsersByScope, searchUserSuggestions } from '../../lib/users.js'
import { useAuthStore } from '../../stores/auth.js'

const props = defineProps({
  members: { type: Array, default: () => [] },
  selectedNames: { type: Array, default: () => [] },
  selectedUserIds: { type: Array, default: () => [] },
  excludeName: { type: String, default: '' },
  excludeUserId: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '이름, 부서, 이메일' },
  showLoginId: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])
const query = ref('')
const pickerRootRef = ref(null)
const auth = useAuthStore()

const blockedNames = computed(() => new Set([props.excludeName, ...props.selectedNames].filter(Boolean)))
const blockedUserIds = computed(() => new Set([props.excludeUserId, ...props.selectedUserIds].filter(Boolean)))

const {
  suggestions,
  suggestionLoading,
  suggestionError,
  activeSuggestionIndex,
  showSuggestionDropdown,
  selectSuggestion,
  handleSuggestionInput,
  setActiveSuggestion,
  handleSuggestionKeydown,
} = useUserSuggestions({
  keyword: query,
  rootRef: pickerRootRef,
  maxItems: 8,
  debounceMs: 250,
  fetchSuggestions: async (trimmedKeyword) => {
    const data = await searchUserSuggestions({
      keyword: trimmedKeyword,
      size: 8,
    })

    return {
      ...data,
      // 이미 선택된 참석자와 제외 대상은 추천 단계에서 미리 제거한다.
      items: (data?.items || []).filter(
        (member) => !blockedNames.value.has(member.name) && !blockedUserIds.value.has(member.userId),
      ),
    }
  },
})

const scopeSuggestions = computed(() => {
  const seen = new Set()
  const items = []

  for (const member of suggestions.value || []) {
    if (member?.teamId && member?.team) {
      const key = `team:${member.teamId}`
      if (!seen.has(key)) {
        seen.add(key)
        items.push({
          key,
          type: 'team',
          label: `${member.team} 팀 전체 추가`,
          description: member.department ? `${member.department} 소속` : '팀 구성원 전체를 추가합니다.',
          teamId: member.teamId,
          departmentId: member.departmentId || null,
          affiliateId: member.affiliateId || auth.user?.affiliateId || null,
        })
      }
    }
    if (member?.departmentId && member?.department) {
      const key = `department:${member.departmentId}`
      if (!seen.has(key)) {
        seen.add(key)
        items.push({
          key,
          type: 'department',
          label: `${member.department} 부서 전체 추가`,
          description: '부서 구성원 전체를 추가합니다.',
          departmentId: member.departmentId,
          affiliateId: member.affiliateId || auth.user?.affiliateId || null,
        })
      }
    }
  }

  return items.slice(0, 6)
})

function selectMemberSuggestion(member) {
  if (!member?.name || blockedNames.value.has(member.name) || blockedUserIds.value.has(member.userId)) {
    query.value = ''
    return
  }

  emit('select', member)
  query.value = ''
}

async function selectScope(scope) {
  const members = await listUsersByScope({
    affiliateId: scope.affiliateId,
    departmentId: scope.departmentId,
    teamId: scope.teamId,
  }).catch(() => [])

  for (const member of members) {
    if (!member?.userId || blockedUserIds.value.has(member.userId)) continue
    emit('select', member)
  }
  query.value = ''
}
</script>

<style scoped>
.member-scope-suggestions {
  display: grid;
  gap: 8px;
  padding: 8px 8px 0;
}

.member-scope-item {
  display: grid;
  gap: 4px;
  width: 100%;
  border: 1px solid rgba(243, 115, 33, 0.18);
  border-radius: 12px;
  background: #fff8f3;
  padding: 10px 12px;
  color: #9a3412;
  text-align: left;
}

.member-scope-item strong {
  font-size: 13px;
}

.member-scope-item span {
  color: #c2410c;
  font-size: 12px;
}
</style>
