<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <slot name="overlay" />
    <article class="card write-modal" :class="modalClass">
      <slot />
    </article>
  </div>
</template>

<script setup>
defineProps({
  modalClass: { type: [String, Array, Object], default: '' },
})

defineEmits(['close'])
</script>
