<script>
import { defineComponent } from 'vue'
import { mails, minutes, workspaceDocs } from '../../data/mockData'

export default defineComponent({
  props: ['title', 'description'],
  setup(props) {
    return { props, docs: workspaceDocs, mails, minutes }
  },
  template: `<section class="page"><header class="page-header"><h1>{{ title }}</h1><p>{{ description }}</p></header><div class="metric-grid"><div class="metric-card"><span>문서</span><strong>{{ docs.length }}</strong></div><div class="metric-card"><span>메일</span><strong>{{ mails.length }}</strong></div><div class="metric-card"><span>회의록</span><strong>{{ minutes.length }}</strong></div></div><div class="doc-grid"><article v-for="doc in docs" :key="doc.id" class="card"><h2>{{ doc.title }}</h2><p>{{ doc.owner }} · {{ doc.updatedAt }}</p></article></div></section>`,
})
</script>
