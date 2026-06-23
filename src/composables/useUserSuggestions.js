import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { canRequestUserSuggestions } from '../utils/user-search.js'

export function useUserSuggestions({
  keyword,
  fetchSuggestions,
  maxItems = 5,
  debounceMs = 250,
  errorMessage = '검색 중 오류가 발생했습니다.',
  rootRef = ref(null),
} = {}) {
  const suggestions = ref([])
  const suggestionOpen = ref(false)
  const suggestionLoading = ref(false)
  const suggestionError = ref('')
  const activeSuggestionIndex = ref(-1)
  const observedKeyword = ref('')

  const hasSuggestions = computed(() => suggestions.value.length > 0)
  const showSuggestionDropdown = computed(
    () => suggestionOpen.value && (suggestionLoading.value || suggestionError.value || hasSuggestions.value),
  )

  let debounceTimer = null
  let latestRequestSequence = 0
  let skipNextKeywordWatch = false

  watch(
    keyword,
    (value) => {
      const nextKeyword = `${value || ''}`
      if (nextKeyword === observedKeyword.value) return
      observedKeyword.value = nextKeyword
    },
    { immediate: true },
  )

  watch(
    observedKeyword,
    (value) => {
      if (skipNextKeywordWatch) {
        skipNextKeywordWatch = false
        closeSuggestions()
        return
      }

      clearTimeout(debounceTimer)

      const trimmedKeyword = `${value || ''}`.trim()
      if (!canRequestUserSuggestions(trimmedKeyword)) {
        cancelSuggestionState()
        return
      }

      suggestionOpen.value = true

      // 입력 도중 불필요한 API 호출을 줄이기 위해 debounce 뒤에만 추천 검색을 보낸다.
      debounceTimer = setTimeout(() => {
        requestSuggestions(trimmedKeyword)
      }, debounceMs)
    },
    { immediate: true },
  )

  onMounted(() => {
    document.addEventListener('mousedown', handleOutsideClick)
  })

  onBeforeUnmount(() => {
    clearTimeout(debounceTimer)
    document.removeEventListener('mousedown', handleOutsideClick)
  })

  async function requestSuggestions(trimmedKeyword) {
    suggestionLoading.value = true
    suggestionError.value = ''
    activeSuggestionIndex.value = -1

    // 늦게 도착한 이전 응답이 최신 입력값 화면을 덮지 않도록 순번을 비교한다.
    const requestSequence = latestRequestSequence + 1
    latestRequestSequence = requestSequence

    try {
      const data = await fetchSuggestions(trimmedKeyword)
      if (requestSequence !== latestRequestSequence) return

      suggestions.value = (data?.items || []).slice(0, maxItems)
      suggestionOpen.value = true
    } catch (error) {
      if (requestSequence !== latestRequestSequence) return

      suggestions.value = []
      suggestionError.value = error?.message || errorMessage
      suggestionOpen.value = true
    } finally {
      if (requestSequence === latestRequestSequence) {
        suggestionLoading.value = false
      }
    }
  }

  function selectSuggestion(item, callback) {
    // 추천 선택 시 부모 화면이 검색어 적용/회원 선택을 결정하고, 드롭다운은 공통으로 닫는다.
    skipNextKeywordWatch = true
    callback?.(item)
    syncObservedKeyword()
    suggestionOpen.value = false
    suggestionLoading.value = false
    suggestionError.value = ''
    activeSuggestionIndex.value = -1
  }

  function syncObservedKeyword(nextValue = keyword?.value) {
    observedKeyword.value = `${nextValue || ''}`
  }

  function handleSuggestionInput(event) {
    // 한글 IME 조합 중에도 화면에 보이는 값을 기준으로 추천 요청 조건을 즉시 다시 계산한다.
    syncObservedKeyword(event?.target?.value)
  }

  function setActiveSuggestion(index) {
    activeSuggestionIndex.value = index
  }

  function closeSuggestions() {
    suggestionOpen.value = false
    activeSuggestionIndex.value = -1
  }

  function handleSuggestionKeydown(event, callback) {
    if (event.key === 'Escape') {
      closeSuggestions()
      return
    }

    if (!hasSuggestions.value) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      suggestionOpen.value = true
      activeSuggestionIndex.value = (activeSuggestionIndex.value + 1 + suggestions.value.length) % suggestions.value.length
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      suggestionOpen.value = true
      activeSuggestionIndex.value =
        activeSuggestionIndex.value <= 0 ? suggestions.value.length - 1 : activeSuggestionIndex.value - 1
      return
    }

    if (event.key === 'Enter' && activeSuggestionIndex.value >= 0) {
      event.preventDefault()
      selectSuggestion(suggestions.value[activeSuggestionIndex.value], callback)
    }
  }

  function cancelSuggestionState() {
    latestRequestSequence += 1
    suggestions.value = []
    suggestionOpen.value = false
    suggestionLoading.value = false
    suggestionError.value = ''
    activeSuggestionIndex.value = -1
  }

  function handleOutsideClick(event) {
    if (!rootRef.value?.contains(event.target)) {
      closeSuggestions()
    }
  }

  return {
    suggestions,
    suggestionOpen,
    suggestionLoading,
    suggestionError,
    activeSuggestionIndex,
    showSuggestionDropdown,
    hasSuggestions,
    selectSuggestion,
    handleSuggestionInput,
    setActiveSuggestion,
    closeSuggestions,
    handleSuggestionKeydown,
  }
}
