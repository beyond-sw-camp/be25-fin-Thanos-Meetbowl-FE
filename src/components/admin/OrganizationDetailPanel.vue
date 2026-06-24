<template>
  <section class="organization-detail-panel" :class="{ 'is-drawer': drawer }" aria-live="polite">
    <div class="organization-detail-panel__head">
      <strong>상세 정보</strong>
      <span v-if="selectedNode">{{ subtitle }}</span>
    </div>

    <div v-if="!selectedNode" class="organization-detail-panel__empty">
      조직도에서 부서, 팀, 구성원을 선택하면 상세 정보가 표시됩니다.
    </div>

    <template v-else>
      <article class="organization-detail-panel__summary" :class="`is-${selectedNode.type}`">
        <p class="organization-detail-panel__eyebrow">{{ summaryEyebrow }}</p>
        <h3>{{ selectedNode.name }}</h3>
        <p>{{ summaryDescription }}</p>
      </article>

      <dl class="organization-detail-panel__stats" v-if="summaryStats.length">
        <div v-for="item in summaryStats" :key="item.label">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      </dl>

      <section v-if="teamList.length" class="organization-detail-panel__section">
        <h4>하위 팀</h4>
        <ul class="organization-detail-panel__list">
          <li v-for="team in teamList" :key="team.key">
            <span>{{ team.name }}</span>
            <strong>{{ team.memberCount }}명</strong>
          </li>
        </ul>
      </section>

      <section v-if="memberList.length" class="organization-detail-panel__section">
        <h4>{{ memberSectionTitle }}</h4>
        <ul class="organization-detail-panel__list organization-detail-panel__list--members">
          <li v-for="member in memberList" :key="member.key || member.userId">
            <span>
              <strong>{{ member.name }}</strong>
              <small>{{ member.position || '-' }}</small>
            </span>
            <em v-if="member.email">{{ member.email }}</em>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  selectedNode: { type: Object, default: null },
  drawer: { type: Boolean, default: false },
})

const subtitle = computed(() => {
  if (!props.selectedNode) return ''
  if (props.selectedNode.type === 'department') return '부서 상세 정보'
  if (props.selectedNode.type === 'team') return '팀 상세 정보'
  if (props.selectedNode.type === 'member') return '구성원 상세 정보'
  return '전체 조직 개요'
})

const summaryEyebrow = computed(() => {
  if (!props.selectedNode) return ''
  if (props.selectedNode.type === 'department') return 'Department'
  if (props.selectedNode.type === 'team') return 'Team'
  if (props.selectedNode.type === 'member') return 'Member'
  return 'Organization'
})

const summaryDescription = computed(() => {
  if (!props.selectedNode) return ''

  if (props.selectedNode.type === 'department') {
    return `${props.selectedNode.teamCount}개의 팀과 ${props.selectedNode.memberCount}명의 구성원이 속해 있습니다.`
  }

  if (props.selectedNode.type === 'team') {
    return `${props.selectedNode.departmentName || '-'} 산하 팀이며 ${props.selectedNode.memberCount}명의 구성원이 있습니다.`
  }

  if (props.selectedNode.type === 'member') {
    return `${props.selectedNode.departmentName || '-'} / ${props.selectedNode.teamName || '-'} 소속 구성원입니다.`
  }

  return `부서 ${props.selectedNode.departmentCount}개, 팀 ${props.selectedNode.teamCount}개, 구성원 ${props.selectedNode.memberCount}명으로 구성되어 있습니다.`
})

const summaryStats = computed(() => {
  if (!props.selectedNode) return []

  if (props.selectedNode.type === 'department') {
    return [
      { label: '총 구성원 수', value: `${props.selectedNode.memberCount}명` },
      { label: '하위 팀 수', value: `${props.selectedNode.teamCount}개` },
    ]
  }

  if (props.selectedNode.type === 'team') {
    return [
      { label: '상위 부서', value: props.selectedNode.departmentName || '-' },
      { label: '팀 인원 수', value: `${props.selectedNode.memberCount}명` },
    ]
  }

  if (props.selectedNode.type === 'member') {
    return [
      { label: '직급', value: props.selectedNode.position || '-' },
      { label: '이메일', value: props.selectedNode.email || '-' },
      { label: '소속 부서', value: props.selectedNode.departmentName || '-' },
      { label: '소속 팀', value: props.selectedNode.teamName || '-' },
    ]
  }

  return [
    { label: '부서 수', value: `${props.selectedNode.departmentCount}개` },
    { label: '팀 수', value: `${props.selectedNode.teamCount}개` },
    { label: '구성원 수', value: `${props.selectedNode.memberCount}명` },
  ]
})

const teamList = computed(() =>
  props.selectedNode?.type === 'department' ? props.selectedNode.teams || [] : [],
)

const memberList = computed(() => {
  if (!props.selectedNode) return []
  if (props.selectedNode.type === 'department') return props.selectedNode.members || []
  if (props.selectedNode.type === 'team') return props.selectedNode.members || []
  if (props.selectedNode.type === 'member') return [props.selectedNode]
  return []
})

const memberSectionTitle = computed(() => {
  if (!props.selectedNode) return ''
  if (props.selectedNode.type === 'department') return '구성원 요약'
  return '구성원'
})
</script>

<style scoped>
.organization-detail-panel {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 18px;
  padding: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
  overflow-y: auto;
}

.organization-detail-panel__head {
  display: grid;
  gap: 4px;
}

.organization-detail-panel__head strong {
  font-size: 16px;
}

.organization-detail-panel__head span {
  color: var(--muted-foreground);
  font-size: 12px;
}

.organization-detail-panel__summary {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: #ffffff;
  padding: 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}

.organization-detail-panel__summary.is-department {
  border-left: 4px solid var(--primary);
}

.organization-detail-panel__summary.is-team {
  background: #fcfcfd;
}

.organization-detail-panel__summary.is-member {
  background: #fffaf5;
}

.organization-detail-panel__summary p,
.organization-detail-panel__summary h3 {
  margin: 0;
}

.organization-detail-panel__eyebrow {
  color: var(--primary-dark);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.organization-detail-panel__summary h3 {
  margin-top: 8px;
  font-size: 22px;
}

.organization-detail-panel__summary p:last-child {
  margin-top: 10px;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.6;
}

.organization-detail-panel__stats {
  display: grid;
  gap: 10px;
  margin: 0;
}

.organization-detail-panel__stats div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 12px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #ffffff;
  padding: 14px 16px;
}

.organization-detail-panel__stats dt {
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 700;
}

.organization-detail-panel__stats dd {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.organization-detail-panel__section {
  display: grid;
  gap: 10px;
}

.organization-detail-panel__section h4 {
  margin: 0;
  font-size: 13px;
}

.organization-detail-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.organization-detail-panel__list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #ffffff;
  padding: 14px 16px;
}

.organization-detail-panel__list li span {
  min-width: 0;
  display: grid;
  gap: 4px;
  color: var(--foreground);
  font-size: 13px;
}

.organization-detail-panel__list li span strong {
  font-size: 13px;
}

.organization-detail-panel__list li span small,
.organization-detail-panel__list li em {
  color: var(--muted-foreground);
  font-size: 12px;
  font-style: normal;
}

.organization-detail-panel__empty {
  border: 1px dashed var(--border);
  border-radius: 16px;
  background: #f8fafc;
  padding: 22px 18px;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.7;
}

.organization-detail-panel.is-drawer {
  padding: 0;
  background: transparent;
}
</style>
