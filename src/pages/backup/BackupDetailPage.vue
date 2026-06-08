<script>
import { computed, defineComponent } from 'vue'
import { useRoute } from 'vue-router'
import { workspaceBackupMails } from '../../data/workspaceData'

export default defineComponent({
  setup() {
    const route = useRoute()
    const mail = computed(() => workspaceBackupMails.find((item) => item.id === route.params.id))
    return { mail }
  },
  template: `
    <section class="page backup-detail-page">
      <RouterLink to="/app/workspace" class="back-button">개인 워크스페이스로</RouterLink>
      <article v-if="mail" class="card backup-mail-card">
        <div class="backup-mail-head">
          <h1>{{ mail.title }}</h1>
          <span class="badge primary">메일 백업</span>
        </div>
        <div class="backup-sender-row">
          <span class="avatar">{{ mail.from[0] }}</span>
          <div>
            <strong>{{ mail.from }}</strong>
            <small>백업 보관</small>
            <p>받는 사람: 나 · {{ mail.date }}</p>
          </div>
        </div>
        <div class="backup-body">
          {{ mail.preview }}

본 메일은 개인 워크스페이스에 백업된 사본입니다. 원본 메일은 메일함에서 확인하실 수 있습니다.
        </div>
      </article>
      <article v-else class="card empty-state">
        백업 자료를 찾을 수 없습니다.
      </article>
    </section>
  `,
})
</script>
