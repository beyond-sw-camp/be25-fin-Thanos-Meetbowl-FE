<script>
import { defineComponent, ref } from 'vue'

export default defineComponent({
  props: ['title', 'description', 'kind'],
  setup(props) {
    const policy = ref(props.kind === 'mail'
      ? { retainDays: 90, trashDays: 14, backupDays: 180, reviewHours: 24, autoShare: true, guestAccess: false }
      : { retainDays: 60, trashDays: 14, backupDays: 90, reviewHours: 24, autoShare: false, guestAccess: false })
    const saved = ref(false)
    function save() {
      saved.value = true
      setTimeout(() => { saved.value = false }, 1800)
    }
    return { policy, save, saved }
  },
  template: `
    <section class="page admin-page settings-page">
      <header class="page-header"><h1>{{ title }}</h1><p>{{ description }}</p></header>
      <article class="card settings-card"><div class="settings-card-head"><h2>보관 정책</h2><button class="primary-button small" @click="save">저장</button></div><div class="settings-form-grid"><label>기본 보관 기간<input type="number" v-model.number="policy.retainDays"></label><label>휴지통 보관 기간<input type="number" v-model.number="policy.trashDays"></label><label>백업 문서 보관 기간<input type="number" v-model.number="policy.backupDays"></label><label>검토 지연 알림<input type="number" v-model.number="policy.reviewHours"></label></div><p v-if="saved" class="settings-success">정책을 저장했습니다.</p></article>
      <article class="card settings-card"><h2>알림 / 권한 기준</h2><label class="settings-toggle-row"><span>검토 완료 시 자동 공유 메일 발송</span><input type="checkbox" v-model="policy.autoShare"></label><label class="settings-toggle-row"><span>게스트 외부 접근 허용</span><input type="checkbox" v-model="policy.guestAccess"></label><div class="settings-alert">Master 권한은 일반 Admin이 변경할 수 없으며, 정책 변경 이력은 관리자 작업 로그에 남깁니다.</div></article>
    </section>
  `,
})
</script>
