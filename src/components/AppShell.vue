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
              <span v-if="notificationBadgeCount > 0" class="notification-badge">
                {{ notificationBadgeCount > 99 ? '99+' : notificationBadgeCount }}
              </span>
            </button>
            <div v-if="notificationsOpen" class="dropdown panel">
              <div class="notification-header">
                <p class="panel-title">알림</p>
                <button
                  v-if="!isAdmin && unreadCount > 0"
                  type="button"
                  class="notification-mark-all"
                  @click="handleMarkAllRead"
                >
                  모두 읽음
                </button>
              </div>

              <template v-if="isAdmin">
                <p v-if="adminNotificationsLoading" class="notification-empty">불러오는 중…</p>
                <p v-else-if="adminPasswordResetRequests.length === 0" class="notification-empty">
                  새로운 알림이 없습니다.
                </p>
                <div
                  v-for="request in adminPasswordResetRequests"
                  :key="request.requestId"
                  class="notification password-reset-notification"
                >
                  <div class="password-reset-notification__head">
                    <strong>{{ request.name || '-' }}</strong>
                    <span class="badge danger">PENDING</span>
                  </div>
                  <span>로그인 ID: {{ request.loginId || '-' }}</span>
                  <span>이메일: {{ request.email || '-' }}</span>
                  <small>요청 일시: {{ formatPasswordResetRequestedAt(request.requestedAt) }}</small>
                  <div class="password-reset-notification__actions">
                    <button
                      type="button"
                      class="primary-button small"
                      :disabled="isAdminRequestActionPending(request.requestId)"
                      @click="handlePasswordResetDecision(request.requestId, 'approve')"
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      class="secondary-button small password-reset-notification__reject"
                      :disabled="isAdminRequestActionPending(request.requestId)"
                      @click="handlePasswordResetDecision(request.requestId, 'reject')"
                    >
                      거절
                    </button>
                  </div>
                </div>
              </template>

              <template v-else>
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
              </template>
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
  approveAdminPasswordResetRequest,
  getAdminPasswordResetRequests,
  getPendingPasswordResetRequestCount,
  rejectAdminPasswordResetRequest,
} from '../lib/admin-password-reset-requests'
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
const isAdmin = computed(() => user.value?.role === 'ADMIN')
const showFloatingChatbot = computed(() => !route.path.startsWith('/admin'))

const notifications = ref([])
const unreadCount = ref(0)
const notificationsLoading = ref(false)
const NOTIFICATION_PAGE_SIZE = 10
const notificationPage = ref(1)
const notificationsHasMore = ref(false)
const notificationsLoadingMore = ref(false)

const adminPasswordResetRequests = ref([])
const adminNotificationCount = ref(0)
const adminNotificationsLoading = ref(false)
const adminActionRequestId = ref('')

let notificationSource = null

function isVisibleNotification(item) {
  return !item?.read
}

const notificationBadgeCount = computed(() =>
  isAdmin.value ? adminNotificationCount.value : unreadCount.value,
)

const isLocalAdmin = computed(() =>
  user.value?.role === 'ADMIN' &&
  user.value?.loginId === 'admin' &&
  user.value?.email === 'admin@local.meetbowl',
)

const affiliationText = computed(() => {
  const parts = [user.value?.department, user.value?.team, user.value?.position].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : ''
})

const navSections = [
  {
    title: '개인 워크스페이스',
    roles: ['USER'],
    items: [
      { to: '/app/dashboard', label: '대시보드', icon: 'D' },
      {
        to: '/app/rooms',
        label: '회의실 예약',
        icon: 'R',
        children: [
          { to: '/app/my-reservations', label: '내 예약', icon: 'M' },
          { to: '/app/my-attending', label: '참석 회의', icon: 'A' },
        ],
      },
      { to: '/app/meetings', label: '회의', icon: 'M' },
      { to: '/app/minutes', label: '내 회의록', icon: 'N' },
      { to: '/app/mail', label: '메일', icon: 'L' },
      { to: '/app/workspace', label: '개인 워크스페이스', icon: 'W' },
      { to: '/app/shared-docs', label: '공유 워크스페이스', icon: 'S' },
      { to: '/app/community', label: '커뮤니티', icon: 'C' },
    ],
  },
  {
    title: '관리자',
    roles: ['ADMIN'],
    items: [
      { to: '/admin/dashboard', label: '관리자 대시보드', icon: 'D' },
      { to: '/admin/members', label: '회원 관리', icon: 'U' },
      { to: '/admin/organization', label: '조직/직급 관리', icon: 'O' },
      { to: '/admin/rooms', label: '회의실 관리', icon: 'R' },
      { to: '/admin/minutes-policy', label: '보관 정책 관리', icon: 'P' },
      { to: '/admin/logs', label: '관리자 작업 로그', icon: 'L' },
    ],
  },
]

function resolveNotificationsHasMore(data, loadedCount) {
  if (typeof data?.totalPages === 'number') return notificationPage.value < data.totalPages
  if (typeof data?.totalElements === 'number') return loadedCount < data.totalElements
  if (typeof data?.hasNext === 'boolean') return data.hasNext
  return (data?.items?.length ?? 0) === NOTIFICATION_PAGE_SIZE
}

function isAdminRequestActionPending(requestId) {
  return adminActionRequestId.value === requestId
}

function formatPasswordResetRequestedAt(requestedAt) {
  if (!requestedAt) return '-'

  const date = new Date(requestedAt)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

async function refreshAdminNotificationCount() {
  const data = await getPendingPasswordResetRequestCount()
  adminNotificationCount.value = Number(data?.pendingPasswordResetRequestCount ?? 0)
}

async function loadAdminPasswordResetRequests() {
  adminNotificationsLoading.value = true
  try {
    const data = await getAdminPasswordResetRequests({ status: 'PENDING' })
    adminPasswordResetRequests.value = data?.items ?? []
  } finally {
    adminNotificationsLoading.value = false
  }
}

async function refreshAdminNotifications() {
  try {
    await Promise.all([refreshAdminNotificationCount(), loadAdminPasswordResetRequests()])
  } catch {
    adminPasswordResetRequests.value = []
  }
}

async function handlePasswordResetDecision(requestId, action) {
  if (!requestId || adminActionRequestId.value) return

  adminActionRequestId.value = requestId

  try {
    if (action === 'approve') {
      await approveAdminPasswordResetRequest(requestId)
      window.alert('비밀번호가 1234로 초기화되었습니다.')
    } else {
      await rejectAdminPasswordResetRequest(requestId)
    }

    await refreshAdminNotifications()
  } catch (error) {
    window.alert(error?.message || '비밀번호 초기화 요청 처리에 실패했습니다.')
  } finally {
    adminActionRequestId.value = ''
  }
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
    // 알림 조회 실패는 화면을 막지 않는다.
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
    const existingIds = new Set(notifications.value.map((item) => item.id))
    const added = incoming.filter((item) => !existingIds.has(item.id) && isVisibleNotification(item))

    notifications.value.push(...added)
    notificationPage.value = nextPage
    if (typeof data?.unreadCount === 'number') unreadCount.value = data.unreadCount
    notificationsHasMore.value = resolveNotificationsHasMore(data, notifications.value.length)

    if (
      !added.length &&
      typeof data?.totalPages !== 'number' &&
      typeof data?.totalElements !== 'number' &&
      typeof data?.hasNext !== 'boolean'
    ) {
      notificationsHasMore.value = false
    }
  } catch {
    // 더보기 실패는 조용히 무시한다.
  } finally {
    notificationsLoadingMore.value = false
  }
}

function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
  if (!notificationsOpen.value) return

  if (isAdmin.value) {
    refreshAdminNotifications()
    return
  }

  loadNotifications()
}

async function handleNotificationClick(item) {
  notificationsOpen.value = false
  if (item.read) return

  try {
    const result = await markNotificationRead(item.id)
    notifications.value = notifications.value.filter((notification) => notification.id !== item.id)
    unreadCount.value = result?.unreadCount ?? Math.max(0, unreadCount.value - 1)
  } catch {
    // 읽음 처리 실패는 다음 조회에서 보정한다.
  }
}

async function handleMarkAllRead() {
  try {
    await markAllNotificationsRead()
    notifications.value = []
    unreadCount.value = 0
    notificationsHasMore.value = false
  } catch {
    // 모두 읽음 실패는 다음 조회에서 보정한다.
  }
}

onMounted(() => {
  if (isAdmin.value) {
    refreshAdminNotificationCount().catch(() => {})
    return
  }

  loadNotifications()
  notificationSource = subscribeNotifications({
    onNotification: (notification) => {
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

.notification.unread strong,
.notification.unread span {
  font-weight: 700;
}

.password-reset-notification {
  gap: 6px;
  cursor: default;
}

.password-reset-notification:hover {
  background: white;
}

.password-reset-notification__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.password-reset-notification__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.password-reset-notification__reject {
  border-color: var(--border);
  color: var(--muted-foreground);
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
