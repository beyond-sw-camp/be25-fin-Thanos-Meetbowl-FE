<script setup>
import { ref } from 'vue'
import ActionButton from '../../components/common/ActionButton.vue'
import UserDirectoryPanel from '../../components/common/UserDirectoryPanel.vue'
import { useAuthStore } from '../../stores/auth'

const panelTitle = '사용자 검색'
const panelDescription = ''
// 패널 인스턴스를 잡아두고, 상단 버튼에서 생성 모달을 직접 연다.
const directoryPanel = ref(null)
const auth = useAuthStore()
</script>

<template>
  <section class="page admin-page admin-members-page">
    <header class="page-header rooms-header">
      <div>
        <h1>회원 관리</h1>
        <p>사용자 검색 화면에서 계정과 조직 정보를 확인할 수 있습니다.</p>
      </div>
      <div v-if="auth.user?.role === 'ADMIN'" class="admin-actions header-actions">
        <!-- 페이지 상단 오른쪽에 두는 주요 진입점이다. -->
        <ActionButton variant="primary" size="sm" @click="directoryPanel?.openCreate?.()">회원 추가</ActionButton>
      </div>
    </header>

    <UserDirectoryPanel ref="directoryPanel" :title="panelTitle" :description="panelDescription" :editable="auth.user?.role === 'ADMIN'" />
  </section>
</template>

<style scoped>
.rooms-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.admin-members-page {
  display: grid;
  gap: 18px;
}

.admin-members-page .page-header {
  margin-bottom: 0;
}

.admin-members-page .page-header h1 {
  font-size: clamp(30px, 4vw, 38px);
  letter-spacing: -0.03em;
}

.admin-members-page .page-header p {
  font-size: 15px;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.header-actions :deep(.action-button) {
  min-height: 44px;
  border-radius: 14px;
  padding: 0 22px;
  box-shadow: 0 14px 28px rgba(243, 115, 33, 0.18);
}

@media (max-width: 959px) {
  .rooms-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    margin-top: 10px;
  }
}
</style>
