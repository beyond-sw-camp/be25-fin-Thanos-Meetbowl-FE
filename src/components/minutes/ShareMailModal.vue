<template>
  <ModalShell modal-class="share-mail-modal" @close="$emit('close')">
    <header><h2>새 메일 · 회의록 공유</h2><button @click="$emit('close')">닫기</button></header>
    <div class="compose-body">
      <label>받는 사람</label>
      <div ref="pickerRoot" class="recipient-picker">
        <div class="recipient-box">
          <span v-for="member in draft.recipients" :key="member.id">
            {{ member.name }} · {{ member.dept }}
            <button @click="draft.recipients = draft.recipients.filter((item) => item.id !== member.id)">×</button>
          </span>
          <input v-model="draft.query" placeholder="이름, 부서/팀으로 검색" @focus="open = true">
        </div>
        <div v-if="open && draft.query" class="recipient-results">
          <button v-for="member in matches" :key="member.id" @click="select(member)">
            <strong>{{ member.name }}</strong>
            <small>{{ member.company }} · {{ member.dept }} · {{ member.email }}</small>
          </button>
        </div>
      </div>
      <input v-model="draft.subject" placeholder="제목">
      <textarea v-model="draft.body" rows="10"></textarea>
    </div>
    <footer>
      <small>받는 사람 {{ draft.recipients.length }}명</small>
      <div><button class="secondary-button" @click="$emit('close')">취소</button><button class="primary-button" @click="$emit('send')">보내기</button></div>
    </footer>
  </ModalShell>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ModalShell from '../common/ModalShell.vue'

const props = defineProps({
  draft: { type: Object, required: true },
  members: { type: Array, required: true },
})

defineEmits(['close', 'send'])
const open = ref(false)
const pickerRoot = ref(null)

const matches = computed(() => props.members
  .filter((member) => !props.draft.recipients.some((item) => item.id === member.id))
  .filter((member) => !props.draft.query || `${member.name} ${member.dept} ${member.company} ${member.email}`.toLowerCase().includes(props.draft.query.toLowerCase())))

function select(member) {
  props.draft.recipients.push(member)
  props.draft.query = ''
  open.value = false
}

function closeOnOutside(event) {
  if (!open.value) return
  if (pickerRoot.value?.contains(event.target)) return
  open.value = false
}

onMounted(() => document.addEventListener('mousedown', closeOnOutside))
onUnmounted(() => document.removeEventListener('mousedown', closeOnOutside))
</script>
