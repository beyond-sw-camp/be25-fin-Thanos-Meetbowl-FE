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
          {{ member.name }} · {{ member.dept }}
          <button @click="removeRecipient(member.id)">×</button>
        </span>
        <input v-model="recipientQuery" placeholder="이름, 계열사, 부서/팀, 이메일로 검색">
      </div>
      <div v-if="recipientQuery || recipientMatches.length" class="recipient-results">
        <button v-for="member in recipientMatches" :key="member.id" @click="addRecipient(member)">
          <strong>{{ member.name }}</strong>
          <small>{{ member.company }} · {{ member.dept }} · {{ member.email }}</small>
        </button>
      </div>
      <input v-model="draft.subject" placeholder="제목">
      <textarea v-model="draft.body" rows="10" placeholder="내용을 입력하세요..."></textarea>
      <button class="upload-zone-small" @click="addAttachment">파일 첨부 추가</button>
      <div class="attachment-chips">
        <span v-for="name in draft.attachments" :key="name">
          {{ name }}
          <button @click="draft.attachments = draft.attachments.filter((item) => item !== name)">×</button>
        </span>
      </div>
    </div>
    <footer>
      <small>수신자 {{ recipients.length }}명</small>
      <div><button class="secondary-button" @click="$emit('close')">취소</button><button class="primary-button" @click="send">전송</button></div>
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
    .filter((member) => !recipients.value.some((item) => item.id === member.id))
    .filter((member) => !query || `${member.name} ${member.company} ${member.dept} ${member.position} ${member.email}`.toLowerCase().includes(query))
    .slice(0, 8)
})

function applyTemplate(template) {
  draft.value.subject = template.subject
  draft.value.body = template.body
  templateOpen.value = false
}

function addRecipient(member) {
  recipients.value.push(member)
  recipientQuery.value = ''
}

function removeRecipient(id) {
  recipients.value = recipients.value.filter((member) => member.id !== id)
}

function addAttachment() {
  draft.value.attachments.push(`첨부파일_${draft.value.attachments.length + 1}.pdf`)
}

function send() {
  emit('send', { ...draft.value, recipientCount: recipients.value.length })
  recipients.value = []
  draft.value = { subject: '', body: '', attachments: [] }
}
</script>
