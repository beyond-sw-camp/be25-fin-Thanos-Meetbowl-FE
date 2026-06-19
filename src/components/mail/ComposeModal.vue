<template>
  <ModalShell modal-class="compose-modal" @close="$emit('close')">
    <header>
      <h2>새 메일</h2>
      <div class="template-menu">
        <button type="button" class="secondary-button small" @click="templateOpen = !templateOpen">템플릿</button>
        <div v-if="templateOpen" class="template-list">
          <button v-for="tpl in templates" :key="tpl.id" @click="applyTemplate(tpl)">{{ tpl.label }}</button>
        </div>
        <button @click="$emit('close')">닫기</button>
      </div>
    </header>
    <div class="compose-body">
      <label>받는 사람</label>
      <div ref="recipientSearchRef" class="user-suggestion-field">
        <div class="recipient-box">
          <span v-for="member in recipients" :key="member.userId">
            {{ member.name }} · {{ member.department || member.team || member.email }}
            <button type="button" @click="removeRecipient(member.userId)">×</button>
          </span>
          <input
            v-model="recipientQuery"
            @input="handleSuggestionInput"
            @compositionupdate="handleSuggestionInput"
            @compositionend="handleSuggestionInput"
            placeholder="이름, 계열사, 부서/팀, 이메일로 검색"
            @keydown="handleSuggestionKeydown($event, selectRecipientSuggestion)"
          >
        </div>
        <div v-if="showSuggestionDropdown" class="user-suggestion-dropdown recipient-results">
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
            @click="selectSuggestion(member, selectRecipientSuggestion)"
          >
            <div class="user-suggestion-main">
              <strong>{{ member.name || '-' }}</strong>
              <span>{{ member.email || '-' }}</span>
              <small>{{ [member.affiliate, member.department, member.team, member.position].filter(Boolean).join(' · ') || '-' }}</small>
            </div>
          </button>
        </div>
      </div>
      <input v-model="draft.subject" placeholder="제목">
      <textarea v-model="draft.body" rows="10" placeholder="내용을 입력해주세요."></textarea>
      <small>첨부파일 발송은 Object Storage 계약 확정 후 제공됩니다.</small>
    </div>
    <footer>
      <small>수신자 {{ recipients.length }}명</small>
      <div>
        <button class="secondary-button" type="button" @click="$emit('close')">취소</button>
        <button class="primary-button" type="button" :disabled="!canSend" @click="send">전송</button>
      </div>
    </footer>
  </ModalShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserSuggestions } from '../../composables/useUserSuggestions.js'
import { searchUserSuggestions } from '../../lib/users.js'
import ModalShell from '../common/ModalShell.vue'

const props = defineProps({
  templates: { type: Array, required: true },
})

const emit = defineEmits(['close', 'send'])
const recipients = ref([])
const recipientQuery = ref('')
const draft = ref({ subject: '', body: '', attachments: [] })
const templateOpen = ref(false)
const recipientSearchRef = ref(null)

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
  keyword: recipientQuery,
  rootRef: recipientSearchRef,
  maxItems: 8,
  debounceMs: 250,
  fetchSuggestions: async (trimmedKeyword) => {
    const data = await searchUserSuggestions({
      keyword: trimmedKeyword,
      size: 8,
    })

    return {
      ...data,
      items: (data?.items || []).filter(
        (member) => !recipients.value.some((item) => item.userId === member.userId),
      ),
    }
  },
})

const canSend = computed(() => recipients.value.length > 0 && draft.value.subject.trim() && draft.value.body.trim())

function applyTemplate(template) {
  draft.value.subject = template.subject
  draft.value.body = template.body
  templateOpen.value = false
}

function addRecipient(member) {
  recipients.value.push(member)
  recipientQuery.value = ''
}

function selectRecipientSuggestion(member) {
  // 추천에서 고른 회원은 즉시 수신자로 확정하고 다음 검색을 위해 입력값을 비운다.
  addRecipient(member)
}

function removeRecipient(userId) {
  recipients.value = recipients.value.filter((member) => member.userId !== userId)
}

function send() {
  if (!canSend.value) return
  emit('send', {
    subject: draft.value.subject.trim(),
    body: draft.value.body.trim(),
    recipientUserIds: recipients.value.map((recipient) => recipient.userId),
  })
  recipients.value = []
  recipientQuery.value = ''
  draft.value = { subject: '', body: '', attachments: [] }
}
</script>
