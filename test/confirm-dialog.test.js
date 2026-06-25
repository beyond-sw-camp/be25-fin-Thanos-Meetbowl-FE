import assert from 'node:assert/strict'
import test from 'node:test'

import { useConfirmDialog } from '../src/composables/useConfirmDialog.js'

test('confirm dialog resolves true only after explicit confirmation', async () => {
  const { confirmDialog, requestConfirm, acceptConfirm } = useConfirmDialog()
  const result = requestConfirm({
    title: '삭제할까요?',
    message: '복구할 수 없습니다.',
    confirmLabel: '삭제',
  })

  assert.equal(confirmDialog.value.title, '삭제할까요?')
  assert.equal(confirmDialog.value.confirmLabel, '삭제')
  acceptConfirm()

  assert.equal(await result, true)
  assert.equal(confirmDialog.value, null)
})

test('opening another confirmation safely cancels the previous one', async () => {
  const { requestConfirm, cancelConfirm } = useConfirmDialog()
  const first = requestConfirm({ message: '첫 번째' })
  const second = requestConfirm({ message: '두 번째' })

  assert.equal(await first, false)
  cancelConfirm()
  assert.equal(await second, false)
})
