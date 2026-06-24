<script setup>
defineProps({
  ariaLabel: { type: String, default: '' },
})
</script>

<template>
  <div class="admin-usage-chart-shell" :role="ariaLabel ? 'img' : undefined" :aria-label="ariaLabel || undefined">
    <slot />
  </div>
</template>
