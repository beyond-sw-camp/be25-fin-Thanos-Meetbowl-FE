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
      <div v-else-if="!suggestions.length" class="user-suggestion-status">검색 결과가 없습니다.</div>
      <button
        v-for="(member, index) in suggestions"
        v-else
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
          <!-- 로그인 ID는 관리자처럼 허용한 화면에서만 보여준다. -->
          <small v-if="showLoginId">{{ member.loginId || '-' }}</small>
          <small>{{ [member.affiliate, member.department, member.team, member.position].filter(Boolean).join(' · ') || '-' }}</small>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserSuggestions } from '../../composables/useUserSuggestions.js'
import { searchUserSuggestions } from '../../lib/users.js'

const props = defineProps({
  members: { type: Array, default: () => [] },
  selectedNames: { type: Array, default: () => [] },
  excludeName: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '이름, 부서, 이메일' },
  showLoginId: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])
const query = ref('')
const pickerRootRef = ref(null)

const blockedNames = computed(() => new Set([props.excludeName, ...props.selectedNames].filter(Boolean)))

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
      items: (data?.items || []).filter((member) => !blockedNames.value.has(member.name)),
    }
  },
})

function selectMemberSuggestion(member) {
  if (!member?.name || blockedNames.value.has(member.name)) {
    query.value = ''
    return
  }

  emit('select', member)
  query.value = ''
}
</script>
