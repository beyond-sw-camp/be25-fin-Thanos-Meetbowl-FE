<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  secondaryLabel: { type: String, default: '' },
  secondaryValue: { type: String, default: '' },
})
</script>

<template>
  <article class="admin-usage-insight">
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
    <small v-if="secondaryLabel || secondaryValue">
      <span v-if="secondaryLabel">{{ secondaryLabel }}</span>
      <strong v-if="secondaryValue">{{ secondaryValue }}</strong>
    </small>
  </article>
</template>
