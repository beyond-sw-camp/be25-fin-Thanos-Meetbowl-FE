<template>
  <aside class="organization-tree-navigation" aria-label="조직 탐색 패널">
    <div class="organization-tree-navigation__head">
      <strong>조직 탐색</strong>
      <small>부서와 팀을 빠르게 선택해 중앙 조직도와 상세 정보를 함께 확인합니다.</small>
    </div>

    <div v-if="chartData.isEmpty" class="organization-tree-navigation__empty">
      표시할 조직 데이터가 없습니다.
    </div>

    <div v-else class="organization-tree-navigation__body" role="tree" aria-label="조직 탐색">
      <button
        type="button"
        class="organization-tree-navigation__row organization-tree-navigation__row--root"
        :class="{ 'is-active': selectedNodeKey === chartData.rootNode.key }"
        role="treeitem"
        :aria-selected="selectedNodeKey === chartData.rootNode.key"
        @click="$emit('select', chartData.rootNode.key)"
      >
        <span class="organization-tree-navigation__name-wrap">
          <strong>전체 조직</strong>
          <small>{{ chartData.rootNode.name }} · {{ chartData.rootNode.memberCount }}명</small>
        </span>
      </button>

      <div
        v-for="department in chartData.rootNode.departments"
        :key="department.key"
        class="organization-tree-navigation__branch"
        role="group"
      >
        <button
          type="button"
          class="organization-tree-navigation__row organization-tree-navigation__row--department"
          :class="{ 'is-active': selectedNodeKey === department.key }"
          role="treeitem"
          :aria-selected="selectedNodeKey === department.key"
          @click="$emit('select', department.key)"
        >
          <span class="organization-tree-navigation__name">{{ department.name }}</span>
          <span class="organization-tree-navigation__meta">{{ department.memberCount }}명</span>
        </button>

        <div class="organization-tree-navigation__teams" role="group">
          <button
            v-for="team in department.teams"
            :key="team.key"
            type="button"
            class="organization-tree-navigation__row organization-tree-navigation__row--team"
            :class="{ 'is-active': selectedNodeKey === team.key }"
            role="treeitem"
            :aria-selected="selectedNodeKey === team.key"
            @click="$emit('select', team.key)"
          >
            <span class="organization-tree-navigation__team-prefix" aria-hidden="true">
              {{ team === department.teams[department.teams.length - 1] ? '└' : '├' }}
            </span>
            <span class="organization-tree-navigation__name">{{ team.name }}</span>
            <span class="organization-tree-navigation__meta">{{ team.memberCount }}명</span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  chartData: { type: Object, required: true },
  selectedNodeKey: { type: String, default: '' },
})

defineEmits(['select'])
</script>

<style scoped>
.organization-tree-navigation {
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border-right: 1px solid var(--border);
  background: linear-gradient(180deg, #fcfcfd 0%, #f8fafc 100%);
}

.organization-tree-navigation__head {
  display: grid;
  gap: 4px;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--border);
}

.organization-tree-navigation__head strong {
  font-size: 13px;
}

.organization-tree-navigation__head small {
  color: var(--muted-foreground);
  font-size: 11px;
  line-height: 1.45;
}

.organization-tree-navigation__body {
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: 10px;
  padding: 10px 10px 12px;
}

.organization-tree-navigation__branch {
  display: grid;
  gap: 4px;
}

.organization-tree-navigation__teams {
  display: grid;
  gap: 2px;
  padding-left: 10px;
}

.organization-tree-navigation__row {
  min-height: 34px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  border: 0;
  border-left: 2px solid transparent;
  background: transparent;
  padding: 5px 8px;
  color: var(--foreground);
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.organization-tree-navigation__row:hover,
.organization-tree-navigation__row.is-active {
  border-left-color: var(--primary);
  background: #fff7ed;
}

.organization-tree-navigation__row:focus-visible {
  outline: 2px solid rgba(243, 115, 33, 0.3);
  outline-offset: 1px;
}

.organization-tree-navigation__row--root {
  min-height: 40px;
  grid-template-columns: minmax(0, 1fr);
  padding-top: 6px;
  padding-bottom: 6px;
}

.organization-tree-navigation__row--root strong {
  display: block;
  font-size: 12px;
}

.organization-tree-navigation__row--root small {
  display: block;
  margin-top: 2px;
  color: var(--muted-foreground);
  font-size: 10px;
}

.organization-tree-navigation__row--department {
  min-height: 34px;
  font-size: 12px;
  font-weight: 700;
}

.organization-tree-navigation__row--team {
  min-height: 30px;
  color: var(--muted-foreground);
  font-size: 11px;
}

.organization-tree-navigation__name-wrap,
.organization-tree-navigation__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-tree-navigation__meta {
  color: var(--muted-foreground);
  font-size: 10px;
  white-space: nowrap;
}

.organization-tree-navigation__team-prefix {
  color: #b8c3d1;
  font-size: 10px;
}

.organization-tree-navigation__empty {
  margin: 12px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: #ffffff;
  padding: 12px;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

@media (max-width: 960px) {
  .organization-tree-navigation {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}
</style>
