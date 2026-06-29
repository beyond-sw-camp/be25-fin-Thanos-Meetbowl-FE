<template>
  <div v-if="items.length" class="app-toast-stack" aria-live="polite">
    <article
      v-for="toast in items"
      :key="toast.id"
      class="app-toast-card"
      :class="toastToneClass(toast)"
    >
      <span class="app-toast-icon">
        <component :is="toastIcon(toast)" :size="18" />
      </span>
      <div class="app-toast-copy">
        <strong>{{ toast.title }}</strong>
        <span>{{ toast.message }}</span>
      </div>
      <button
        type="button"
        class="app-toast-close"
        aria-label="알림 닫기"
        @click="$emit('dismiss', toast.id)"
      >
        <X :size="16" />
      </button>
    </article>
  </div>
</template>

<script setup>
import { AlertCircle, CheckCheck, Info, X } from '@lucide/vue'

defineEmits(['dismiss'])

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})

function toastTone(toast) {
  const source = `${toast?.title || ''} ${toast?.message || ''}`.toLowerCase()
  if (source.includes('실패') || source.includes('오류') || source.includes('못했')) return 'error'
  if (source.includes('완료') || source.includes('성공') || source.includes('저장') || source.includes('시작')) return 'success'
  return 'info'
}

function toastToneClass(toast) {
  return `is-${toastTone(toast)}`
}

function toastIcon(toast) {
  const tone = toastTone(toast)
  if (tone === 'error') return AlertCircle
  if (tone === 'success') return CheckCheck
  return Info
}
</script>

<style scoped>
.app-toast-stack {
  position: fixed;
  top: 88px;
  right: 28px;
  z-index: 90;
  display: grid;
  gap: 10px;
  width: min(340px, calc(100vw - 32px));
  pointer-events: none;
}

.app-toast-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  min-height: 76px;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-left: 3px solid var(--toast-accent, var(--primary));
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
  padding: 14px 14px 14px 16px;
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

.app-toast-card.is-success {
  --toast-accent: #f37321;
  --toast-tint: rgba(243, 115, 33, 0.1);
  --toast-icon: #f37321;
}

.app-toast-card.is-error {
  --toast-accent: #ef4444;
  --toast-tint: rgba(239, 68, 68, 0.12);
  --toast-icon: #dc2626;
}

.app-toast-card.is-info {
  --toast-accent: #2563eb;
  --toast-tint: rgba(37, 99, 235, 0.12);
  --toast-icon: #2563eb;
}

.app-toast-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--toast-tint);
  color: var(--toast-icon);
  flex-shrink: 0;
}

.app-toast-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
  padding-top: 1px;
}

.app-toast-copy strong {
  color: #1f2937;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.3;
}

.app-toast-copy span {
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
  word-break: keep-all;
}

.app-toast-close {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #64748b;
  margin-top: 2px;
  cursor: pointer;
}

.app-toast-close:hover {
  background: rgba(148, 163, 184, 0.12);
}

@media (max-width: 760px) {
  .app-toast-stack {
    top: 76px;
    right: 16px;
    left: 16px;
    width: auto;
  }

  .app-toast-card {
    min-height: 72px;
    padding: 13px 14px;
    gap: 10px;
  }

  .app-toast-copy strong {
    font-size: 14px;
  }

  .app-toast-copy span {
    font-size: 12px;
  }
}
</style>
