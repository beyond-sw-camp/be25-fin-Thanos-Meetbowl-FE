<template>
  <div ref="pickerRoot" class="member-picker">
    <label v-if="label">{{ label }}<input v-model="query" :placeholder="placeholder" @focus="open = true"></label>
    <input v-else v-model="query" :placeholder="placeholder" @focus="open = true">
    <div v-if="open && matches.length" class="member-picker-results">
      <button v-for="member in matches" :key="member.id" type="button" @click="select(member)">
        <strong>{{ member.name }}</strong>
        <span>{{ member.dept }} · {{ member.email }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  members: { type: Array, required: true },
  selectedNames: { type: Array, default: () => [] },
  excludeName: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '이름, 부서, 이메일' },
})

const emit = defineEmits(['select'])
const query = ref('')
const open = ref(false)
const pickerRoot = ref(null)

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
