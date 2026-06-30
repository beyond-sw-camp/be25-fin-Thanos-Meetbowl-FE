<script setup>
import { computed, useAttrs } from 'vue'
import { ChevronDown } from '@lucide/vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  id: { type: String, default: undefined },
  name: { type: String, default: undefined },
  modelValue: { type: [String, Number], default: undefined },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md'].includes(value),
  },
  disabled: { type: Boolean, default: false },
  modelModifiers: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'change'])
const attrs = useAttrs()

const valueAttrs = computed(() => (props.modelValue === undefined ? {} : { value: props.modelValue }))

const selectAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const selectClass = computed(() => [
  'app-select',
  attrs.class,
  props.size === 'sm' ? 'app-select-sm' : 'app-select-md',
])

function handleChange(event) {
  const rawValue = event.target.value
  const nextValue = props.modelModifiers?.number && rawValue !== '' ? Number(rawValue) : rawValue
  emit('update:modelValue', nextValue)
  emit('change', event)
}
</script>

<template>
  <span class="app-select-wrap">
    <select
      v-bind="{ ...selectAttrs, ...valueAttrs }"
      :id="id"
      :name="name"
      :disabled="disabled"
      :class="selectClass"
      @change="handleChange"
    >
      <slot />
    </select>
    <span class="app-select-arrow" aria-hidden="true"><ChevronDown :size="16" :stroke-width="2.5" /></span>
  </span>
</template>

<style scoped>
.app-select-wrap {
  position: relative;
  display: inline-block;
  min-width: 120px;
}

.app-select {
  width: 100%;
  appearance: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  color: var(--foreground);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.app-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(243, 115, 33, 0.15);
}

.app-select:disabled {
  background: var(--muted);
  color: var(--muted-foreground);
  cursor: not-allowed;
}

.app-select-sm {
  min-height: 34px;
  padding-left: 8px;
  padding-right: 28px;
}

.app-select-md {
  min-height: 40px;
  padding-left: 12px;
  padding-right: 34px;
}

.app-select-arrow {
  pointer-events: none;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted-foreground);
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
