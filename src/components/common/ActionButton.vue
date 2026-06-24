<script setup>
defineProps({
  type: { type: String, default: 'button' },
  variant: { type: String, default: 'primary' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
  disabled: { type: Boolean, default: false },
})

defineEmits(['click'])
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="['action-button', `action-button--${variant}`, `action-button--${size}`]"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.action-button--sm {
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
}

.action-button--md {
  min-height: 40px;
  padding: 0 14px;
  font-size: 14px;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-button--primary {
  background: var(--primary);
  color: white;
}

.action-button--primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.action-button--secondary {
  background: white;
  border-color: var(--border);
  color: var(--foreground);
}

.action-button--secondary:hover:not(:disabled) {
  background: var(--muted);
}

.action-button--danger {
  background: var(--danger);
  color: white;
}

.action-button--danger:hover:not(:disabled) {
  filter: brightness(0.95);
}

.action-button--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--foreground);
}

.action-button--ghost:hover:not(:disabled) {
  background: var(--muted);
}
</style>
