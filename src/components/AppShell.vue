<template>
  <div class="shell">
    <aside class="sidebar" :class="{ open: mobileOpen }">
      <RouterLink :to="homePath" class="brand" @click="mobileOpen = false">
        <span class="brand-mark">M</span>
        <span>Meetbowl</span>
      </RouterLink>

      <nav class="nav">
        <section v-for="section in visibleSections" :key="section.title" class="nav-section">
          <p class="nav-title">{{ section.title }}</p>
          <template v-for="item in section.items" :key="item.to">
            <RouterLink
              :to="item.to"
              class="nav-link"
              :class="{ active: isActive(item.to) }"
              @click="mobileOpen = false"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </RouterLink>
            <RouterLink
              v-for="child in (isExpanded(item) ? item.children : [])"
              :key="child.to"
              :to="child.to"
              class="nav-link nav-sublink"
              :class="{ active: isActive(child.to) }"
              @click="mobileOpen = false"
            >
              <span class="nav-icon">{{ child.icon }}</span>
              <span>{{ child.label }}</span>
            </RouterLink>
          </template>
        </section>
      </nav>
    </aside>

    <div v-if="mobileOpen" class="scrim" @click="mobileOpen = false" />

    <main class="main">
      <header class="topbar">
        <button class="icon-button mobile-menu" type="button" @click="mobileOpen = true">☰</button>
        <div class="search-box">검색</div>
        <div class="top-actions">
          <div class="dropdown-wrap">
            <button class="icon-button notification-button" type="button" @click="toggleNotifications">
              <Bell :size="20" />
              <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            </button>
            <div v-if="notificationsOpen" class="dropdown panel">
              <div class="notification-header">
                <p class="panel-title">알림</p>
                <button
                  v-if="unreadCount > 0"
                  type="button"
                  class="notification-mark-all"
                  @click="handleMarkAllRead"
                >
                  모두 읽음
                </button>
              </div>
              <p v-if="notificationsLoading" class="notification-empty">불러오는 중…</p>
              <p v-else-if="notifications.length === 0" class="notification-empty">새로운 알림이 없습니다.</p>
              <RouterLink
                v-for="item in notifications"
                :key="item.id"
                :to="notificationRoute(item)"
                class="notification"
                :class="{ unread: !item.read }"
                @click="handleNotificationClick(item)"
              >
                <strong>{{ item.title }}</strong>
                <span>{{ item.content }}</span>
                <small>{{ formatNotificationTime(item.createdAt) }}</small>
              </RouterLink>
              <button
                v-if="notificationsHasMore && !notificationsLoading && notifications.length > 0"
                type="button"
                class="notification-more"
                :disabled="notificationsLoadingMore"
                @click="loadMoreNotifications"
              >
                {{ notificationsLoadingMore ? '불러오는 중…' : '더보기' }}
              </button>
            </div>
          </div>

          <div class="dropdown-wrap">
            <button class="profile-button" type="button" @click="profileOpen = !profileOpen">
              <span class="avatar">{{ user?.avatar }}</span>
              <span class="profile-name">{{ user?.name }}</span>
            </button>
            <div v-if="profileOpen" class="dropdown profile-panel">
              <strong>{{ user?.name }}</strong>
              <span v-if="!isLocalAdmin && affiliationText">{{ affiliationText }}</span>
              <span>{{ user?.email }}</span>
              <RouterLink
                v-if="user?.role === 'USER'"
                to="/app/settings"
                class="profile-menu-link"
                @click="profileOpen = false"
              >
                설정
              </RouterLink>
              <button type="button" class="ghost-button" @click="handleLogout">로그아웃</button>
            </div>
          </div>
        </div>
      </header>
      <RouterView />
    </main>

    <FloatingChatbot v-if="showFloatingChatbot" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell } from '@lucide/vue'
import FloatingChatbot from './FloatingChatbot.vue'
import {
  formatNotificationTime,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationRoute,
  subscribeNotifications,
} from '../lib/notifications'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mobileOpen = ref(false)
const notificationsOpen = ref(false)
const profileOpen = ref(false)

const user = computed(() => auth.user)
const homePath = computed(() => auth.homePath)
// 관리자 화면에서는 플로팅 챗봇을 숨긴다(dev 머지로 반영된 동작).
const showFloatingChatbot = computed(() => !route.path.startsWith('/admin'))

const notifications = ref([])
const unreadCount = ref(0)
const notificationsLoading = ref(false)
// 드롭다운은 최근 10개부터 보여주고, '더보기'로 그 이전 페이지를 이어붙인다(개수 기반).
const NOTIFICATION_PAGE_SIZE = 10
const notificationPage = ref(1)
const notificationsHasMore = ref(false)
const notificationsLoadingMore = ref(false)
let notificationSource = null
// 벨에는 '안 읽은 알림'만 노출한다. 읽은 알림(개별 클릭/모두 읽음 모두)은 목록에서 빠져 계속 쌓이지 않는다.
function isVisibleNotification(item) {
  return !item?.read
}

// 로컬 관리자 계정 식별: role === 'ADMIN', loginId === 'admin', email === 'admin@local.meetbowl'
const isLocalAdmin = computed(() => 
  user.value?.role === 'ADMIN' &&
  user.value?.loginId === 'admin' &&
  user.value?.email === 'admin@local.meetbowl'
)

// 소속 정보 조합: 부서/팀/직급 중 있는 값만 사용해 문자열 생성
const affiliationText = computed(() => {
  const parts = [
    user.value?.department,
    user.value?.team,
    user.value?.position
  ].filter(Boolean)
  
  return parts.length > 0 ? parts.join(' · ') : ''
})

const navSections = [
  {
    title: '개인 워크스페이스',
    roles: ['USER'],
    items: [
      { to: '/app/dashboard', label: '대시보드', icon: '▦' },
      {
        to: '/app/rooms',
        label: '회의실 예약',
        icon: '□',
        children: [
          { to: '/app/my-reservations', label: '내 예약', icon: '◷' },
          { to: '/app/my-attending', label: '나의 참석 회의', icon: '◷' },
        ],
      },
      { to: '/app/meetings', label: '회의', icon: '▶' },
      { to: '/app/minutes', label: '내 회의록', icon: '≡' },
      { to: '/app/mail', label: '메일', icon: '✉' },
      { to: '/app/workspace', label: '개인 워크스페이스', icon: '▣' },
      // USER는 메일/회의에서 공용 사용자 검색을 쓰더라도 전용 사용자 검색 메뉴는 노출하지 않는다.
      { to: '/app/shared-docs', label: '공유 워크스페이스', icon: '▤' },
      { to: '/app/community', label: '도파민', icon: '◇' },
    ],
  },
  {
    title: '관리자',
    roles: ['ADMIN'],
    items: [
      { to: '/admin/dashboard', label: '관리자 대시보드', icon: '▦' },
      { to: '/admin/members', label: '회원 관리', icon: '⌕' },
      { to: '/admin/organization', label: '조직/직급 관리', icon: '▧' },
      { to: '/admin/rooms', label: '회의실 관리', icon: '□' },
      { to: '/admin/minutes-policy', label: '보관 정책 관리', icon: '◫' },
      { to: '/admin/logs', label: '관리자 작업 로그', icon: '≣' },
    ],
  },
]

// 다음 페이지 존재 여부 판단. 백엔드 응답 메타데이터(totalPages/totalElements/hasNext)를 우선 쓰고,
// 없으면 "마지막 페이지가 size만큼 가득 찼는가"로 추정한다.
function resolveNotificationsHasMore(data, loadedCount) {
  if (typeof data?.totalPages === 'number') return notificationPage.value < data.totalPages
  if (typeof data?.totalElements === 'number') return loadedCount < data.totalElements
  if (typeof data?.hasNext === 'boolean') return data.hasNext
  return (data?.items?.length ?? 0) === NOTIFICATION_PAGE_SIZE
}

async function loadNotifications() {
  notificationsLoading.value = true
  notificationPage.value = 1
  try {
    const data = await getNotifications({ page: 1, size: NOTIFICATION_PAGE_SIZE })
    notifications.value = (data?.items ?? []).filter(isVisibleNotification)
    unreadCount.value = data?.unreadCount ?? 0
    notificationsHasMore.value = resolveNotificationsHasMore(data, notifications.value.length)
  } catch {
    // 알림 조회 실패는 화면을 막지 않는다 — 다음 갱신/SSE 수신에서 보강된다.
  } finally {
    notificationsLoading.value = false
  }
}

async function loadMoreNotifications() {
  if (notificationsLoadingMore.value || !notificationsHasMore.value) return
  notificationsLoadingMore.value = true
  try {
    const nextPage = notificationPage.value + 1
    const data = await getNotifications({ page: nextPage, size: NOTIFICATION_PAGE_SIZE })
    const incoming = data?.items ?? []
    // SSE로 이미 앞에 추가된 알림과 중복되지 않게, 기존에 없는 id만 이어붙인다.
    const existingIds = new Set(notifications.value.map((item) => item.id))
    const added = incoming.filter((item) => !existingIds.has(item.id) && isVisibleNotification(item))
    notifications.value.push(...added)
    notificationPage.value = nextPage
    if (typeof data?.unreadCount === 'number') unreadCount.value = data.unreadCount
    notificationsHasMore.value = resolveNotificationsHasMore(data, notifications.value.length)
    // 메타데이터가 없고 새로 추가된 항목도 없으면 더 가져올 게 없다고 보고 버튼을 닫는다(죽은 버튼 방지).
    if (!added.length
      && typeof data?.totalPages !== 'number'
      && typeof data?.totalElements !== 'number'
      && typeof data?.hasNext !== 'boolean') {
      notificationsHasMore.value = false
    }
  } catch {
    // 더보기 실패는 조용히 무시한다 — 버튼을 유지해 다시 시도할 수 있게 한다.
  } finally {
    notificationsLoadingMore.value = false
  }
}

function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
  // 열 때마다 최신 목록을 다시 불러와 SSE를 놓친 사이의 알림도 채운다.
  if (notificationsOpen.value) loadNotifications()
}

async function handleNotificationClick(item) {
  notificationsOpen.value = false
  if (item.read) return
  try {
    const result = await markNotificationRead(item.id)
    // 읽음 처리한 항목은 즉시 목록에서 제거한다 — 안 읽은 알림만 남겨 계속 쌓이지 않게 한다.
    notifications.value = notifications.value.filter((n) => n.id !== item.id)
    unreadCount.value = result?.unreadCount ?? Math.max(0, unreadCount.value - 1)
  } catch {
    // 읽음 처리 실패는 다음 목록 조회에서 정정된다.
  }
}

async function handleMarkAllRead() {
  try {
    await markAllNotificationsRead()
    // 모두 읽음 → 전부 읽음 처리되어 안 읽음 목록이 비고, 재조회해도 읽은 건 필터로 안 보인다.
    notifications.value = []
    unreadCount.value = 0
    notificationsHasMore.value = false
  } catch {
    // 전체 읽음 실패 시 목록을 비우지 않는다 — 다음 목록 조회에서 정정된다.
  }
}

onMounted(() => {
  loadNotifications()
  notificationSource = subscribeNotifications({
    onNotification: (notification) => {
      // 같은 id가 이미 있으면 교체하고, 새 알림이면 맨 앞에 추가하며 안 읽음 수를 올린다.
      const index = notifications.value.findIndex((item) => item.id === notification.id)
      if (index >= 0) {
        notifications.value.splice(index, 1, notification)
      } else {
        notifications.value.unshift(notification)
        if (!notification.read) unreadCount.value += 1
      }
    },
  })
})

onBeforeUnmount(() => {
  notificationSource?.close()
})

const visibleSections = computed(() =>
  navSections.filter((section) => section.roles.includes(user.value?.role)),
)

function isActive(to) {
  return route.path === to || route.path.startsWith(`${to}/`)
}

// 부모(회의실 예약)나 하위 메뉴 경로에 있을 때만 하위 메뉴를 펼친다.
function isExpanded(item) {
  if (!item.children) return false
  return isActive(item.to) || item.children.some((child) => isActive(child.to))
}

async function handleLogout() {
  profileOpen.value = false
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.notification-button {
  position: relative;
}

.notification-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--danger, #ef4444);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}

.notification-header .panel-title {
  border-bottom: none;
}

.notification-mark-all {
  margin-right: 12px;
  border: none;
  background: none;
  color: var(--primary-dark, #2563eb);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.notification-empty {
  margin: 0;
  padding: 18px 14px;
  font-size: 13px;
  color: var(--muted-foreground);
  text-align: center;
}

.notification.unread {
  background: var(--muted, #f8fafc);
}

.notification.unread strong::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 999px;
  background: var(--primary-dark, #2563eb);
  vertical-align: middle;
}

/* 안 읽은 알림은 제목·내용 텍스트를 굵게 표시한다(읽으면 일반 굵기로 돌아감). */
.notification.unread strong,
.notification.unread span {
  font-weight: 700;
}

.notification-more {
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-top: 1px solid var(--border, #e5e7eb);
  background: transparent;
  color: var(--primary-dark, #2563eb);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.notification-more:hover {
  background: var(--muted, #f8fafc);
}
.notification-more:disabled {
  color: var(--muted-foreground);
  cursor: default;
}
</style>
