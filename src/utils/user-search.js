const HANGUL_SYLLABLE_PATTERN = /[\uAC00-\uD7A3]/
const LATIN_OR_NUMBER_PATTERN = /[a-zA-Z0-9]/
const HANGUL_JAMO_ONLY_PATTERN = /^[\u3131-\u314E\u314F-\u3163]+$/

export function canRequestUserSuggestions(keyword = '') {
  const trimmedKeyword = `${keyword}`.trim()
  if (!trimmedKeyword) return false

  // 한글 1음절은 허용하고, 자모만 단독 입력한 경우만 추천 호출을 막는다.
  const hasHangulSyllable = HANGUL_SYLLABLE_PATTERN.test(trimmedKeyword)
  const hasLatinOrNumber = LATIN_OR_NUMBER_PATTERN.test(trimmedKeyword)
  const isOnlyHangulJamo = HANGUL_JAMO_ONLY_PATTERN.test(trimmedKeyword)

  if (isOnlyHangulJamo) return false

  return hasHangulSyllable || hasLatinOrNumber
}
