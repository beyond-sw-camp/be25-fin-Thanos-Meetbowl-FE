<template>
  <ModalShell modal-class="share-mail-modal" @close="$emit('close')">
    <header><h2>새 메일 · 회의록 공유</h2><button type="button" :disabled="draft.sending" @click="$emit('close')">닫기</button></header>
    <div class="compose-body">
      <label>받는 사람</label>
      <div ref="pickerRoot" class="recipient-picker">
        <div class="recipient-box">
          <span v-for="member in draft.recipients" :key="member.userId">
            {{ member.name }} · {{ member.department }}
            <button type="button" :disabled="draft.sending" @click="remove(member.userId)">×</button>
          </span>
          <input v-model="draft.query" :disabled="draft.sending" placeholder="이름, 부서/팀으로 검색" @focus="open = true">
        </div>
        <div v-if="open && draft.query" class="recipient-results">
          <button v-if="searching" type="button" disabled>검색 중입니다.</button>
          <template v-else>
            <button v-for="member in matches" :key="member.userId" type="button" @click="select(member)">
              <strong>{{ member.name }}</strong>
              <small>{{ member.company }} · {{ member.department }} · {{ member.email }}</small>
            </button>
            <button v-if="!matches.length" type="button" disabled>검색 결과가 없습니다.</button>
          </template>
        </div>
      </div>
      <input v-model="draft.subject" :disabled="draft.sending" placeholder="제목">
      <MinutesEditor v-model="draft.body" :disabled="draft.sending" toolbar-variant="compose" />
      <p v-if="draft.error" class="error-box">{{ draft.error }}</p>
      <p class="share-copy-status">회의 참여자는 승인 시 자동 공유됩니다. 이 메일은 미참석자에게 별도로 공유할 때만 사용하세요.</p>
    </div>
    <footer>
      <small>받는 사람 {{ draft.recipients.length }}명</small>
      <div>
        <button class="secondary-button" type="button" :disabled="draft.sending" @click="$emit('close')">취소</button>
        <button class="primary-button" type="button" :disabled="draft.sending || draft.recipients.length === 0" @click="$emit('send')">
          {{ draft.sending ? '보내는 중' : '보내기' }}
        </button>
      </div>
    </footer>
  </ModalShell>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { searchUsers } from '../../lib/users'
import ModalShell from '../common/ModalShell.vue'
import MinutesEditor from './MinutesEditor.vue'

const props = defineProps({
  draft: { type: Object, required: true },
})

defineEmits(['close', 'send'])
const open = ref(false)
const pickerRoot = ref(null)
const matches = ref([])
const searching = ref(false)
let seq = 0
let debounceTimer = null

watch(() => props.draft.query, (value) => {
  clearTimeout(debounceTimer)
  const keyword = value.trim()
  if (!keyword) {
    matches.value = []
    searching.value = false
    return
  }
  debounceTimer = setTimeout(() => runSearch(keyword), 250)
})

async function runSearch(keyword) {
  const current = ++seq
  searching.value = true
  try {
    const data = await searchUsers({ keyword, page: 1, size: 8 })
    if (current !== seq) return
    const selected = new Set(props.draft.recipients.map((member) => member.userId))
    matches.value = (data?.items || [])
      .filter((user) => user.role !== 'ADMIN' && !selected.has(user.userId))
      .map((user) => ({
        userId: user.userId,
        name: user.name || '-',
        department: user.department || '',
        company: user.affiliateName || user.company || '',
        email: user.email || '',
      }))
  } catch {
    if (current === seq) matches.value = []
  } finally {
    if (current === seq) searching.value = false
  }
}

function select(member) {
  props.draft.recipients.push(member)
  props.draft.query = ''
  open.value = false
}

function remove(userId) {
  props.draft.recipients = props.draft.recipients.filter((item) => item.userId !== userId)
}

function closeOnOutside(event) {
  if (!open.value) return
  if (pickerRoot.value?.contains(event.target)) return
  open.value = false
}

onMounted(() => document.addEventListener('mousedown', closeOnOutside))
onUnmounted(() => {
  clearTimeout(debounceTimer)
  document.removeEventListener('mousedown', closeOnOutside)
})
</script>
