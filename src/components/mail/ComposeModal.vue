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
      <div class="recipient-box">
        <span v-for="member in recipients" :key="member.id">
          {{ member.name }} · {{ member.department || member.team || member.email }}
          <button type="button" @click="removeRecipient(member.userId)">×</button>
        </span>
        <input v-model="recipientQuery" placeholder="이름, 계열사, 부서/팀, 이메일로 검색">
      </div>
      <div v-if="recipientQuery || recipientMatches.length" class="recipient-results">
        <button v-for="member in recipientMatches" :key="member.userId" type="button" @click="addRecipient(member)">
          <strong>{{ member.name }}</strong>
          <small>{{ member.affiliate || '-' }} · {{ member.department || member.team || '-' }} · {{ member.email }}</small>
        </button>
        <small v-if="recipientQuery && !recipientMatches.length">검색 결과가 없습니다.</small>
      </div>
      <input v-model="draft.subject" placeholder="제목">
      <textarea v-model="draft.body" rows="10" placeholder="내용을 입력하세요..."></textarea>
      <small>첨부파일 발송은 Object Storage 계약 확정 후 제공됩니다.</small>
    </div>
    <footer>
      <small>수신자 {{ recipients.length }}명</small>
      <div><button class="secondary-button" type="button" @click="$emit('close')">취소</button><button class="primary-button" type="button" :disabled="!canSend" @click="send">전송</button></div>
    </footer>
  </ModalShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import ModalShell from '../common/ModalShell.vue'

const props = defineProps({
  members: { type: Array, required: true },
  templates: { type: Array, required: true },
})

const emit = defineEmits(['close', 'send'])
const recipients = ref([])
const recipientQuery = ref('')
const draft = ref({ subject: '', body: '', attachments: [] })
const templateOpen = ref(false)

const recipientMatches = computed(() => {
  const query = recipientQuery.value.toLowerCase()
  return props.members
    .filter((member) => !recipients.value.some((item) => item.userId === member.userId))
    .filter((member) => !query || `${member.name} ${member.affiliate || ''} ${member.department || ''} ${member.team || ''} ${member.position || ''} ${member.email}`.toLowerCase().includes(query))
    .slice(0, 8)
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
  draft.value = { subject: '', body: '', attachments: [] }
}
</script>
