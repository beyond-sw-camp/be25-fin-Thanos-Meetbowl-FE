<template>
  <div v-if="totalPages > 1" class="pagination">
    <button :disabled="modelValue === 1" @click="$emit('update:modelValue', modelValue - 1)">이전</button>
    <span>{{ modelValue }} / {{ totalPages }}</span>
    <button :disabled="modelValue === totalPages" @click="$emit('update:modelValue', modelValue + 1)">다음</button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})

defineEmits(['update:modelValue'])
</script>
