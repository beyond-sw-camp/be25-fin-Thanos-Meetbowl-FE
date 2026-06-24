<template>
  <section class="page mail-detail-page backup-detail-page">
    <div class="mail-detail-toolbar">
      <button class="mail-back-button" type="button" aria-label="개인 워크스페이스로 돌아가기" @click="goBack"><ArrowLeft :size="16" /></button>
      <span class="mail-toolbar-separator" aria-hidden="true"></span>
      <span class="backup-toolbar-label"><Archive :size="15" /> 백업 메일</span>
      <span class="mail-toolbar-separator" aria-hidden="true"></span>
      <button type="button" @click="printMail"><Printer :size="16" /> 인쇄</button>
    </div>

    <article v-if="loading" class="card empty-state">백업 메일을 불러오는 중입니다.</article>
    <article v-else-if="errorMessage" class="card empty-state backup-error-state">
      <p>{{ errorMessage }}</p>
      <button type="button" class="secondary-button small" @click="loadBackup">다시 시도</button>
    </article>
    <article v-else-if="mail" class="card mail-message-card backup-mail-card">
      <header class="backup-mail-head">
        <h1>{{ mail.title }}</h1>
        <span class="badge primary">메일 백업</span>
      </header>
      <dl class="mail-message-meta">
        <div class="mail-message-meta-sender">
          <dt>보낸 사람</dt>
          <dd>
            <span class="mail-sender-chip">
              {{ mail.senderName || '백업 메일' }}
              <small v-if="mail.senderEmail">&lt;{{ mail.senderEmail }}&gt;</small>
            </span>
          </dd>
        </div>
        <div>
          <dt>받는 사람</dt>
          <dd class="mail-recipient-chips">
            <span v-for="recipient in (mail.recipients || [])" :key="recipient.userId" class="mail-sender-chip">
              {{ recipient.name }}
              <small v-if="recipient.email">&lt;{{ recipient.email }}&gt;</small>
            </span>
            <span v-if="!(mail.recipients || []).length">{{ mail.recipientCount || 0 }}명</span>
          </dd>
        </div>
        <div>
          <dt>보낸 날짜</dt>
          <dd><time class="mail-date-text">{{ displayDate(mail.sentAt) }}</time></dd>
        </div>
      </dl>
      <pre class="mail-body-text">{{ compactBody(mail.body || mail.summary) }}</pre>
      <div class="backup-origin-note">
        <Archive :size="16" />
        <span>
          <strong>개인 워크스페이스에 보관된 메일입니다.</strong>
          <small>{{ mail.originalAvailable ? '원본 메일 정보와 연결되어 있습니다.' : '백업 당시 저장된 내용을 표시합니다.' }}</small>
        </span>
      </div>
    </article>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Archive, ArrowLeft, Printer } from '@lucide/vue'
import { getMail } from '../../lib/mail'
import { getBackupDetail } from '../../lib/workspace'
import { getUserSummary } from '../../lib/users'
import { formatKstDateTime } from '../../utils/dateTime'

const route = useRoute()
const router = useRouter()
const mail = ref(null)
const loading = ref(false)
const errorMessage = ref('')

onMounted(loadBackup)

async function loadBackup() {
  loading.value = true
  errorMessage.value = ''
  try {
    const backupId = String(route.params.id || '')
    const backup = await getBackupDetail(backupId)
    const original = backup.sourceType === 'MAIL' && backup.sourceId
      ? await getMail(backup.sourceId).catch(() => null)
      : null
    const sender = original?.senderUserId
      ? await getUserSummary(original.senderUserId).catch(() => null)
      : null
    const recipients = await enrichRecipients(original?.recipientUserIds || [])
    mail.value = {
      ...backup,
      title: backup.title || original?.subject,
      body: backup.body || original?.body || backup.summary,
      senderName: sender?.name || original?.senderName || original?.senderUserId || '',
      senderMeta: [sender?.department, sender?.team, sender?.position].filter(Boolean).join(' · '),
      senderEmail: sender?.email || original?.senderEmail || '',
      recipients,
      recipientCount: original?.recipientUserIds?.length || 0,
      sentAt: original?.sentAt || original?.requestedAt || backup.backedUpAt,
      originalAvailable: Boolean(original),
    }
  } catch (error) {
    mail.value = null
    errorMessage.value = error?.message || '백업 메일을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function enrichRecipients(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  return Promise.all(ids.map(async (userId) => {
    const user = await getUserSummary(userId).catch(() => null)
    return { userId, name: user?.name || userId, email: user?.email || '' }
  }))
}

function compactBody(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\n\s*\n+/g, '\n').trim()
}

function displayDate(value) {
  return value ? formatKstDateTime(value, { second: '2-digit' }) : '-'
}

function goBack() {
  router.push({ path: '/app/workspace', query: { tab: 'backups' } })
}

function printMail() {
  window.print()
}
</script>
