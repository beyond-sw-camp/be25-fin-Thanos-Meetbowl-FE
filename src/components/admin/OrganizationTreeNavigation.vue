<template>
  <aside class="organization-tree-navigation" aria-label="조직 탐색 패널">
    <div class="organization-tree-navigation__head">
      <strong>조직 탐색</strong>
      <small>좌측 트리에서 부서와 팀을 선택하면 중앙 조직도와 상세 정보가 함께 갱신됩니다.</small>
    </div>

    <div v-if="chartData.isEmpty" class="organization-tree-navigation__empty">
      표시할 조직 데이터가 없습니다.
    </div>

    <div v-else class="organization-tree-navigation__body" role="tree" aria-label="조직 탐색">
      <button
        type="button"
        class="organization-tree-navigation__item organization-tree-navigation__item--root"
        :class="{ 'is-active': selectedNodeKey === chartData.rootNode.key }"
        role="treeitem"
        :aria-selected="selectedNodeKey === chartData.rootNode.key"
        @click="$emit('select', chartData.rootNode.key)"
      >
        <span class="organization-tree-navigation__label-wrap">
          <span class="organization-tree-navigation__label">전체 조직</span>
          <small>{{ chartData.rootNode.name }}</small>
        </span>
        <span class="organization-tree-navigation__badge">{{ chartData.rootNode.memberCount }}명</span>
      </button>

      <div
        v-for="department in chartData.rootNode.departments"
        :key="department.key"
        class="organization-tree-navigation__branch"
        role="group"
      >
        <button
          type="button"
          class="organization-tree-navigation__item"
          :class="{ 'is-active': selectedNodeKey === department.key }"
          role="treeitem"
          :aria-selected="selectedNodeKey === department.key"
          @click="$emit('select', department.key)"
        >
          <span class="organization-tree-navigation__label-wrap">
            <span class="organization-tree-navigation__label">{{ department.name }}</span>
            <small>하위 팀 {{ department.teamCount }}개</small>
          </span>
          <span class="organization-tree-navigation__badge">{{ department.memberCount }}명</span>
        </button>

        <div class="organization-tree-navigation__children" role="group">
          <div
            v-for="team in department.teams"
            :key="team.key"
            class="organization-tree-navigation__branch organization-tree-navigation__branch--team"
            role="group"
          >
            <button
              type="button"
              class="organization-tree-navigation__item organization-tree-navigation__item--child"
              :class="{ 'is-active': selectedNodeKey === team.key }"
              role="treeitem"
              :aria-selected="selectedNodeKey === team.key"
              @click="$emit('select', team.key)"
            >
              <span class="organization-tree-navigation__label-wrap">
                <span class="organization-tree-navigation__label">{{ team.name }}</span>
                <small>{{ team.isVirtual ? '미배정 구성원' : '팀 구성원' }}</small>
              </span>
              <span class="organization-tree-navigation__badge">{{ team.memberCount }}명</span>
            </button>

            <div
              v-if="team.members.length && isTeamExpanded(team.key, selectedNode)"
              class="organization-tree-navigation__members"
              role="group"
            >
              <button
                v-for="member in team.members"
                :key="member.key"
                type="button"
                class="organization-tree-navigation__item organization-tree-navigation__item--member"
                :class="{ 'is-active': selectedNodeKey === member.key }"
                role="treeitem"
                :aria-selected="selectedNodeKey === member.key"
                @click="$emit('select', member.key)"
              >
                <span class="organization-tree-navigation__label-wrap">
                  <span class="organization-tree-navigation__label">{{ member.name }}</span>
                  <small>{{ member.position || '-' }}</small>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  chartData: { type: Object, required: true },
  selectedNodeKey: { type: String, default: '' },
  selectedNode: { type: Object, default: null },
})

defineEmits(['select'])

function isTeamExpanded(teamKey, selectedNode) {
  if (!selectedNode) return false
  if (selectedNode.type === 'team') return selectedNode.key === teamKey
  if (selectedNode.type === 'member') return selectedNode.parentKey === teamKey
  return false
}
</script>

<style scoped>
.organization-tree-navigation {
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border-right: 1px solid var(--border);
  background: linear-gradient(180deg, #fbfcfe 0%, #f8fafc 100%);
}

.organization-tree-navigation__head {
  display: grid;
  gap: 6px;
  padding: 16px 14px 12px;
  border-bottom: 1px solid var(--border);
}

.organization-tree-navigation__head strong {
  font-size: 14px;
}

.organization-tree-navigation__head small {
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 1.5;
}

.organization-tree-navigation__body {
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: 8px;
  padding: 12px;
}

.organization-tree-navigation__branch {
  display: grid;
  gap: 6px;
}

.organization-tree-navigation__children {
  display: grid;
  gap: 6px;
  padding-left: 16px;
  position: relative;
}

.organization-tree-navigation__children::before {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 8px;
  width: 1px;
  background: #e7edf5;
}

.organization-tree-navigation__item {
  width: 100%;
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #ffffff;
  padding: 10px 12px;
  color: var(--foreground);
  text-align: left;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.organization-tree-navigation__item--root {
  background: #fffaf5;
}

.organization-tree-navigation__item--child {
  position: relative;
}

.organization-tree-navigation__item--child::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -10px;
  width: 10px;
  height: 1px;
  background: #e7edf5;
}

.organization-tree-navigation__members {
  display: grid;
  gap: 4px;
  padding-left: 16px;
  position: relative;
}

.organization-tree-navigation__members::before {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 8px;
  width: 1px;
  background: #eef2f7;
}

.organization-tree-navigation__item--member {
  position: relative;
  min-height: 34px;
  padding: 7px 10px;
  background: #fcfcfd;
}

.organization-tree-navigation__item--member::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -10px;
  width: 10px;
  height: 1px;
  background: #eef2f7;
}

.organization-tree-navigation__item:hover,
.organization-tree-navigation__item.is-active {
  border-color: rgba(243, 115, 33, 0.45);
  background: #fff7ed;
  box-shadow: 0 8px 18px rgba(243, 115, 33, 0.08);
}

.organization-tree-navigation__item:focus-visible {
  outline: 2px solid rgba(243, 115, 33, 0.35);
  outline-offset: 2px;
}

.organization-tree-navigation__label-wrap {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.organization-tree-navigation__label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-tree-navigation__label-wrap small {
  color: var(--muted-foreground);
  font-size: 10px;
  line-height: 1.4;
}

.organization-tree-navigation__badge {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #fff1e6;
  padding: 3px 8px;
  color: var(--primary-dark);
  font-size: 10px;
  font-weight: 700;
}

.organization-tree-navigation__empty {
  margin: 12px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: #ffffff;
  padding: 14px;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

@media (max-width: 960px) {
  .organization-tree-navigation {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}
</style>
