import { ref } from 'vue'

export function useConfirmDialog() {
  const confirmDialog = ref(null)
  let resolver = null

  function requestConfirm(options) {
    if (resolver) resolver(false)
    confirmDialog.value = {
      title: options?.title || '작업을 진행할까요?',
      message: options?.message || '',
      confirmLabel: options?.confirmLabel || '확인',
      cancelLabel: options?.cancelLabel || '취소',
      tone: options?.tone || 'danger',
    }
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function resolveConfirm(confirmed) {
    const currentResolver = resolver
    resolver = null
    confirmDialog.value = null
    currentResolver?.(confirmed)
  }

  return {
    confirmDialog,
    requestConfirm,
    cancelConfirm: () => resolveConfirm(false),
    acceptConfirm: () => resolveConfirm(true),
  }
}
