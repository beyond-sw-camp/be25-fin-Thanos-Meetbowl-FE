<template>
  <section class="organization-detail-panel" :class="{ 'is-drawer': drawer }" aria-live="polite">
    <div class="organization-detail-panel__head">
      <strong>상세 정보</strong>
      <span v-if="selectedNode">{{ subtitle }}</span>
    </div>

    <div class="organization-detail-panel__content">
      <div v-if="!selectedNode" class="organization-detail-panel__empty">
        조직도에서 부서, 팀, 구성원을 선택하면 상세 정보가 표시됩니다.
      </div>

      <template v-else>
        <article class="organization-detail-panel__summary" :class="`is-${selectedNode.type}`">
          <p class="organization-detail-panel__eyebrow">{{ summaryEyebrow }}</p>
          <h3>{{ selectedNode.name }}</h3>
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
              <span class="organization-detail-panel__inline-main">{{ team.name }}</span>
              <strong>{{ team.memberCount }}명</strong>
            </li>
          </ul>
        </section>

        <section v-if="memberList.length" class="organization-detail-panel__section">
          <h4>{{ memberSectionTitle }}</h4>
          <ul class="organization-detail-panel__list organization-detail-panel__list--members">
            <li v-for="member in memberList" :key="member.key || member.userId">
              <span class="organization-detail-panel__inline-main">
                <strong>{{ member.name }}</strong>
                <small>{{ member.position || '-' }}</small>
              </span>
              <em v-if="member.email">{{ member.email }}</em>
            </li>
          </ul>
        </section>
      </template>
    </div>
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
  --detail-panel-gap: 8px;
  --detail-panel-padding: 12px;
  --detail-card-padding: 10px 11px;
  --detail-row-padding: 6px 9px;
  --detail-row-height: 32px;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--detail-panel-gap);
  background: #fbfcfe;
  overflow: hidden;
}

.organization-detail-panel__head {
  display: grid;
  align-content: center;
  gap: 3px;
  min-height: var(--organization-panel-header-height, 62px);
  padding: var(--organization-panel-header-padding-y, 10px) var(--organization-panel-header-padding-x, 14px);
  border-bottom: 1px solid var(--border);
  box-sizing: border-box;
}

.organization-detail-panel__head strong {
  font-size: 13px;
  line-height: 1.25;
}

.organization-detail-panel__head span {
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 1.4;
}

.organization-detail-panel__content {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: var(--detail-panel-gap);
  padding: var(--detail-panel-padding);
  overflow-y: auto;
}

.organization-detail-panel__summary {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #ffffff;
  padding: var(--detail-card-padding);
  box-shadow: none;
}

.organization-detail-panel__summary.is-department {
  border-left: 3px solid var(--primary);
}

.organization-detail-panel__summary.is-team {
  background: #ffffff;
}

.organization-detail-panel__summary.is-member {
  background: #ffffff;
}

.organization-detail-panel__summary p,
.organization-detail-panel__summary h3 {
  margin: 0;
}

.organization-detail-panel__eyebrow {
  color: var(--primary-dark);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.organization-detail-panel__summary h3 {
  margin-top: 3px;
  font-size: 15px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.organization-detail-panel__stats {
  display: grid;
  gap: 5px;
  margin: 0;
}

.organization-detail-panel__stats div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 10px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #ffffff;
  min-height: var(--detail-row-height);
  padding: var(--detail-row-padding);
}

.organization-detail-panel__stats dt {
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.organization-detail-panel__stats dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  max-width: 100%;
  overflow-wrap: anywhere;
  text-align: right;
  line-height: 1.3;
}

.organization-detail-panel__section {
  display: grid;
  gap: 5px;
}

.organization-detail-panel__section h4 {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
}

.organization-detail-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 5px;
}

.organization-detail-panel__list li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #ffffff;
  min-height: var(--detail-row-height);
  padding: var(--detail-row-padding);
}

.organization-detail-panel__inline-main {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--foreground);
  font-size: 12px;
}

.organization-detail-panel__inline-main strong {
  font-size: 12px;
  line-height: 1.25;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-detail-panel__inline-main small,
.organization-detail-panel__list li em {
  color: var(--muted-foreground);
  font-size: 12px;
  font-style: normal;
  line-height: 1.25;
  white-space: nowrap;
}

.organization-detail-panel__list li em {
  max-width: 48%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.organization-detail-panel__empty {
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: #f8fafc;
  padding: 11px 10px;
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 1.4;
}

.organization-detail-panel.is-drawer {
  padding: 0;
  background: transparent;
}
</style>
