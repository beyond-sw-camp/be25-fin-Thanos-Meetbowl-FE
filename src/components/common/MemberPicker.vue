<template>
  <div class="member-picker">
    <label v-if="label">{{ label }}<input v-model="query" :placeholder="placeholder"></label>
    <input v-else v-model="query" :placeholder="placeholder">
    <div class="member-picker-results">
      <button v-for="member in matches" :key="member.id" type="button" @click="select(member)">
        <strong>{{ member.name }}</strong>
        <span>{{ member.dept }} · {{ member.email }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  members: { type: Array, required: true },
  selectedNames: { type: Array, default: () => [] },
  excludeName: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '이름, 부서, 이메일' },
})

const emit = defineEmits(['select'])
const query = ref('')

const matches = computed(() => {
  const value = query.value.trim().toLowerCase()
  return props.members
    .filter((member) => member.name !== props.excludeName)
    .filter((member) => !props.selectedNames.includes(member.name))
    .filter((member) => !value || `${member.name} ${member.dept} ${member.email}`.toLowerCase().includes(value))
    .slice(0, 8)
})

function select(member) {
  emit('select', member)
  query.value = ''
}
</script>
