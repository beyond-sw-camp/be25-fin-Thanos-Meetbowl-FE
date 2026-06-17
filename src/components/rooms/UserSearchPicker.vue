<template>
  <div class="member-picker">
    <label>참석자 검색<input v-model="query" placeholder="이름, 부서, 이메일"></label>
    <div v-if="results.length" class="member-picker-results">
      <button v-for="user in results" :key="user.userId" type="button" @click="add(user)">
        <strong>{{ user.name }}</strong>
        <span>{{ user.department }} · {{ user.email }}</span>
      </button>
    </div>
    <div class="participant-chips">
      <span v-for="attendee in modelValue" :key="attendee.userId">
        {{ attendee.name }}<button type="button" @click="remove(attendee.userId)">×</button>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { searchUsers } from '../../lib/users'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  excludeUserId: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const query = ref('')
const results = ref([])
let seq = 0

watch(query, async (value) => {
  const keyword = value.trim()
  if (!keyword) {
    results.value = []
    return
  }
  const current = ++seq
  try {
    const data = await searchUsers({ keyword, page: 1, size: 8 })
    if (current !== seq) return // 더 최근 입력의 응답만 반영한다.
    const selected = new Set(props.modelValue.map((attendee) => attendee.userId))
    results.value = (data?.items || [])
      .filter((user) => user.userId !== props.excludeUserId && !selected.has(user.userId))
      .map((user) => ({
        userId: user.userId,
        name: user.name || '-',
        department: user.department || '',
        email: user.email || '',
      }))
  } catch {
    results.value = []
  }
})

function add(user) {
  if (props.modelValue.some((attendee) => attendee.userId === user.userId)) return
  emit('update:modelValue', [...props.modelValue, { userId: user.userId, name: user.name }])
  query.value = ''
  results.value = []
}

function remove(userId) {
  emit('update:modelValue', props.modelValue.filter((attendee) => attendee.userId !== userId))
}
</script>
