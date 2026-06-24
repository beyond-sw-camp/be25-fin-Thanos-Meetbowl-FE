<template>
  <ModalShell modal-class="compose-modal" @close="$emit('close')">
    <header>
      <h2>새 메일</h2>
      <div class="template-menu">
        <button type="button" class="mail-template-button" @click="templateOpen = !templateOpen"><FileType2 :size="14" /> 템플릿 <ChevronDown :size="12" /></button>
        <div v-if="templateOpen" class="template-list">
          <button v-for="tpl in templates" :key="tpl.id" @click="applyTemplate(tpl)"><FileType2 :size="13" /> {{ tpl.label }}</button>
        </div>
        <button class="icon-action" type="button" aria-label="닫기" @click="$emit('close')"><X :size="16" /></button>
      </div>
    </header>
    <div class="compose-body">
      <div class="compose-recipient-label-row">
        <label>받는 사람</label>
        <label class="mail-send-self-check" :class="{ selected: selfSelected }">
          <input type="checkbox" :checked="selfSelected" :disabled="!selfRecipient" @change="toggleSelfRecipient($event.target.checked)">
          <span>내게 보내기</span>
        </label>
      </div>
      <div class="mail-selected-recipients" :class="{ empty: !recipients.length }">
        <small v-if="!recipients.length">선택된 수신자가 없습니다.</small>
        <span v-for="member in recipients" :key="userKey(member)">
          {{ member.name }}
          <small>{{ member.department || member.team || member.email }}</small>
          <button type="button" :aria-label="`${member.name} 수신자 제거`" @click="removeRecipient(userKey(member))">×</button>
        </span>
      </div>
      <div ref="recipientPicker" class="recipient-picker">
        <label class="mail-recipient-search" @focusin="openRecipientPicker">
          <Search :size="15" />
          <input v-model="recipientQuery" placeholder="수신자 추가: 이름, 부서/팀, 이메일 검색">
        </label>
        <div v-if="pickerOpen && (recipientQuery || recipientMatches.length || recipientLoading)" class="recipient-results">
          <small v-if="recipientLoading">수신자를 검색하는 중입니다.</small>
          <button v-for="member in recipientMatches" :key="userKey(member)" type="button" @click="addRecipient(member)">
            <strong>{{ member.name }}</strong>
            <small>{{ member.affiliate || '-' }} · {{ member.department || member.team || '-' }} · {{ member.email }}</small>
          </button>
          <small v-if="recipientQuery && !recipientLoading && !recipientMatches.length">검색 결과가 없습니다.</small>
        </div>
      </div>
      <input v-model="draft.subject" placeholder="제목">
      <textarea v-model="draft.body" rows="10" placeholder="내용을 입력하세요..."></textarea>
      <label
        class="upload-zone-small mail-upload-zone"
        @dragover.prevent
        @drop.prevent="addFiles($event.dataTransfer.files)"
      >
        <Upload :size="24" />
        <strong>파일을 끌어다 놓거나 클릭해 첨부</strong>
        <small>문서, 이미지, 압축 파일 등 최대 25MB</small>
        <input ref="fileInput" class="hidden-file-input" type="file" multiple @change="addFiles($event.target.files)">
      </label>
      <div v-if="draft.attachments.length" class="attachment-chips">
        <span v-for="attachment in draft.attachments" :key="attachment.id">
          <Paperclip :size="13" /> {{ attachment.name }}
          <small>{{ formatSize(attachment.size) }}</small>
          <button type="button" @click="downloadAttachment(attachment)" aria-label="첨부파일 다운로드">받기</button>
          <button type="button" @click="removeAttachment(attachment.id)" aria-label="첨부파일 제거">×</button>
        </span>
      </div>
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChevronDown, FileType2, Paperclip, Search, Upload, X } from '@lucide/vue'
import ModalShell from '../common/ModalShell.vue'

const props = defineProps({
  initialDraft: { type: Object, default: () => ({}) },
  initialRecipients: { type: Array, default: () => [] },
  selfRecipient: { type: Object, default: null },
  recipientSearch: { type: Function, required: true },
  templates: { type: Array, required: true },
})

const emit = defineEmits(['close', 'send'])
const recipients = ref([])
const recipientQuery = ref('')
const recipientMatches = ref([])
const recipientLoading = ref(false)
const pickerOpen = ref(false)
const draft = ref({ subject: '', body: '', attachments: [] })
const templateOpen = ref(false)
const fileInput = ref(null)
const recipientPicker = ref(null)

let recipientTimer = null
watch(recipientQuery, (value) => {
  clearTimeout(recipientTimer)
  recipientTimer = setTimeout(() => searchRecipients(value), 250)
})
watch(() => [props.initialDraft, props.initialRecipients], applyInitialState, { immediate: true })
const canSend = computed(() => recipients.value.length > 0 && draft.value.subject.trim() && draft.value.body.trim())
const selfSelected = computed(() => {
  const selfId = userKey(props.selfRecipient)
  return Boolean(selfId && recipients.value.some((member) => userKey(member) === selfId))
})

onMounted(() => document.addEventListener('mousedown', closeRecipientPickerOnOutside))
onUnmounted(() => document.removeEventListener('mousedown', closeRecipientPickerOnOutside))

function applyTemplate(template) {
  draft.value.subject = template.subject
  draft.value.body = template.body
  templateOpen.value = false
}

function applyInitialState() {
  recipients.value = [...props.initialRecipients]
  draft.value = {
    subject: props.initialDraft.subject || '',
    body: props.initialDraft.body || '',
    attachments: props.initialDraft.attachments || [],
  }
}

function addRecipient(member) {
  const memberId = userKey(member)
  if (!memberId || recipients.value.some((recipient) => userKey(recipient) === memberId)) return
  recipients.value.push(member)
  recipientQuery.value = ''
  recipientMatches.value = []
  pickerOpen.value = false
}

function toggleSelfRecipient(checked) {
  if (!props.selfRecipient) return
  if (checked) {
    addRecipient(props.selfRecipient)
    return
  }
  removeRecipient(userKey(props.selfRecipient))
}

function selectRecipientSuggestion(member) {
  // 추천에서 고른 회원은 즉시 수신자로 확정하고 다음 검색을 위해 입력값을 비운다.
  addRecipient(member)
}

function removeRecipient(userId) {
  recipients.value = recipients.value.filter((member) => userKey(member) !== userId)
}

function send() {
  if (!canSend.value) return
  emit('send', {
    subject: draft.value.subject.trim(),
    body: draft.value.body.trim(),
    recipientUserIds: recipients.value.map((recipient) => userKey(recipient)),
    // 실제 전송을 위해 원본 File 객체를 그대로 넘긴다(상위에서 multipart로 업로드).
    attachments: draft.value.attachments,
  })
  recipients.value = []
  recipientQuery.value = ''
  draft.value = { subject: '', body: '', attachments: [] }
  if (fileInput.value) fileInput.value.value = ''
}

async function searchRecipients(keyword) {
  const query = keyword.trim()
  recipientLoading.value = true
  try {
    const data = await props.recipientSearch({ keyword: query, page: 1, size: 8 })
    const selectedIds = new Set(recipients.value.map((member) => userKey(member)))
    recipientMatches.value = (data.items || []).filter((member) => !selectedIds.has(userKey(member)))
  } catch {
    recipientMatches.value = []
  } finally {
    recipientLoading.value = false
  }
}

function userKey(member) {
  return member?.userId || member?.id || ''
}

function openRecipientPicker() {
  pickerOpen.value = true
  if (!recipientQuery.value.trim() && !recipientMatches.value.length) searchRecipients('')
}

function closeRecipientPickerOnOutside(event) {
  if (!pickerOpen.value) return
  if (recipientPicker.value?.contains(event.target)) return
  pickerOpen.value = false
}

function addFiles(files) {
  const selected = Array.from(files || [])
  if (!selected.length) return
  draft.value.attachments.push(...selected.map((file) => ({
    id: crypto.randomUUID?.() || `${Date.now()}-${file.name}`,
    name: file.name,
    actualSizeBytes: file.size,
    sizeBytes: file.size,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    file,
    localUrl: URL.createObjectURL(file),
  })))
  if (fileInput.value) fileInput.value.value = ''
}

function removeAttachment(id) {
  const target = draft.value.attachments.find((attachment) => attachment.id === id)
  if (target?.localUrl) URL.revokeObjectURL(target.localUrl)
  draft.value.attachments = draft.value.attachments.filter((attachment) => attachment.id !== id)
}

function downloadAttachment(attachment) {
  if (!attachment.localUrl) return
  const link = document.createElement('a')
  link.href = attachment.localUrl
  link.download = attachment.name
  link.click()
}

function formatSize(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value}B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`
  return `${(value / 1024 / 1024).toFixed(1)}MB`
}
</script>
