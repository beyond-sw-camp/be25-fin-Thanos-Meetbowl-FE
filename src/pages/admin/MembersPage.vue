<script setup>
import { ref } from 'vue'
import UserDirectoryPanel from '../../components/common/UserDirectoryPanel.vue'

const panelTitle = '사용자 검색'
const panelDescription = '이름, 이메일, 로그인 ID로 사용자를 찾고 회원 요약 정보를 확인합니다.'
// 패널 인스턴스를 잡아두고, 상단 버튼에서 생성 모달을 직접 연다.
const directoryPanel = ref(null)
</script>

<template>
  <section class="page admin-page">
    <header class="page-header rooms-header">
      <div>
        <h1>회원 관리</h1>
        <p>사용자 검색 화면에서 계정과 조직 정보를 확인할 수 있습니다.</p>
      </div>
      <div class="admin-actions header-actions">
        <!-- 페이지 상단 오른쪽에 두는 주요 진입점이다. -->
        <button class="primary-button add-member-button" @click="directoryPanel?.openCreate?.()">회원 추가</button>
      </div>
    </header>

    <UserDirectoryPanel ref="directoryPanel" :title="panelTitle" :description="panelDescription" />
  </section>
</template>

<style scoped>
.rooms-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  margin-top: 28px;
}

.add-member-button {
  min-width: 104px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
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
