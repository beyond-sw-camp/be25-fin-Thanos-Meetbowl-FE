<template>
  <section class="page backup-detail-page">
    <RouterLink to="/app/workspace?tab=backups" class="back-button backup-back-button"><ArrowLeft :size="17" /> 개인 워크스페이스로</RouterLink>

    <article v-if="loading" class="card empty-state">백업 메일을 불러오는 중입니다.</article>
    <article v-else-if="errorMessage" class="card empty-state backup-error-state">
      <p>{{ errorMessage }}</p>
      <button type="button" class="secondary-button small" @click="loadBackup">다시 시도</button>
    </article>
    <article v-else-if="mail" class="card backup-mail-card">
      <div class="backup-mail-head">
        <h1>{{ mail.title }}</h1>
        <span class="badge primary">메일 백업</span>
      </div>
      <div class="backup-sender-row">
        <span class="avatar">{{ senderInitial }}</span>
        <div>
          <strong>{{ mail.senderName || '백업 메일' }}</strong>
          <small>개인 워크스페이스 백업</small>
          <p>{{ displayDate(mail.backedUpAt) }}</p>
        </div>
      </div>
      <div class="backup-body">{{ compactBody(mail.body || mail.summary) }}</div>
    </article>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import { getMail } from '../../lib/mail'
import { getBackupDetail } from '../../lib/workspace'
import { workspaceBackupMails } from '../../data/workspaceData'
import { formatKstDateTime } from '../../utils/dateTime'

const route = useRoute()
const mail = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const senderInitial = computed(() => (mail.value?.senderName || '백')[0])

onMounted(loadBackup)

async function loadBackup() {
  loading.value = true
  errorMessage.value = ''
  try {
    const backupId = String(route.params.id || '')
    const fallback = workspaceBackupMails.find((item) => item.id === backupId)
    if (fallback) {
      mail.value = {
        title: fallback.title,
        summary: fallback.preview,
        body: fallback.preview,
        senderName: fallback.from,
        backedUpAt: `${fallback.date}T00:00:00Z`,
      }
      return
    }

    const backup = await getBackupDetail(backupId)
    const original = backup.sourceType === 'MAIL' && backup.sourceId
      ? await getMail(backup.sourceId).catch(() => null)
      : null
    mail.value = {
      ...backup,
      title: backup.title || original?.subject,
      body: backup.body || original?.body || backup.summary,
      senderName: original?.senderName || original?.senderUserId || '',
    }
  } catch (error) {
    mail.value = null
    errorMessage.value = error?.message || '백업 메일을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function compactBody(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\n\s*\n+/g, '\n').trim()
}

function displayDate(value) {
  return value ? formatKstDateTime(value) : '-'
}
</script>
