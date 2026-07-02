<template>
  <div class="shell">
    <aside class="sidebar" :class="{ open: mobileOpen, collapsed: sidebarCollapsed }">
      <RouterLink :to="homePath" class="brand" @click="mobileOpen = false">
        <span class="brand-mark">M</span>
        <span v-if="!sidebarCollapsed" class="brand-text">Meetbowl</span>
      </RouterLink>

      <nav class="nav">
        <section v-for="section in visibleSections" :key="section.title" class="nav-section">
          <p v-if="section.title && !sidebarCollapsed" class="nav-title">{{ section.title }}</p>
          <template v-for="item in section.items" :key="item.to">
            <RouterLink
              :to="item.to"
              class="nav-link"
              :class="{ active: isActive(item.to) }"
              :data-tour="item.tourId"
              @click="handleNavClick(item.to)"
            >
              <span class="nav-icon">
                <component :is="item.icon" :size="18" stroke-width="2.1" />
              </span>
              <span v-if="!sidebarCollapsed">{{ item.label }}</span>
            </RouterLink>
            <RouterLink
              v-for="child in (isExpanded(item) ? item.children : [])"
              :key="child.to"
              :to="child.to"
              class="nav-link nav-sublink"
              :class="{ active: isActive(child.to) }"
              @click="handleNavClick(child.to)"
            >
              <span class="nav-icon">
                <component :is="child.icon" :size="15" stroke-width="2.1" />
              </span>
              <span v-if="!sidebarCollapsed">{{ child.label }}</span>
            </RouterLink>
          </template>
        </section>
      </nav>

      <div class="sidebar-footer">
        <button type="button" class="sidebar-collapse-button" @click="toggleSidebar">
          <PanelLeftClose v-if="!sidebarCollapsed" :size="18" />
          <PanelLeftOpen v-else :size="18" />
          <span v-if="!sidebarCollapsed">사이드바 접기</span>
        </button>
      </div>
    </aside>

    <div v-if="mobileOpen" class="scrim" @click="mobileOpen = false" />

    <main class="main">
      <header class="topbar">
        <button class="icon-button mobile-menu" type="button" @click="mobileOpen = true">☰</button>
        <div class="top-actions">
          <div ref="notificationDropdownRef" class="dropdown-wrap">
            <button
              class="icon-button notification-button"
              type="button"
              data-tour="notifications"
              @click="toggleNotifications"
            >
              <Bell :size="20" />
              <span v-if="notificationBadgeCount > 0" class="notification-badge">
                {{ notificationBadgeCount > 99 ? '99+' : notificationBadgeCount }}
              </span>
            </button>
            <div v-if="notificationsOpen" class="dropdown panel notification-panel">
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
                <div class="notification-list">
                  <p v-if="adminNotificationsLoading" class="notification-empty">불러오는 중…</p>
                  <p v-else-if="adminPasswordResetRequests.length === 0" class="notification-empty">
                    새로운 알림이 없습니다.
                  </p>
                  <div
                    v-for="request in adminPasswordResetRequests"
                    :key="request.requestId"
                    class="notification password-reset-notification"
                  >
                    <span class="notification-icon is-admin">
                      <UserRound :size="18" stroke-width="2.1" />
                    </span>
                    <div class="notification-copy">
                      <div class="password-reset-notification__head">
                        <strong>{{ request.requesterName || request.name || request.userName || request.displayName || '-' }}</strong>
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
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="notification-list">
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
                    <span class="notification-icon" :class="notificationVisual(item).toneClass">
                      <component :is="notificationVisual(item).icon" :size="18" stroke-width="2.1" />
                    </span>
                    <span class="notification-copy">
                      <span class="notification-topline">
                        <strong>{{ item.title }}</strong>
                        <small>{{ formatNotificationTime(item.createdAt) }}</small>
                      </span>
                      <span>{{ item.content }}</span>
                      <em>{{ notificationVisual(item).label }}</em>
                    </span>
                  </RouterLink>
                </div>
                <button
                  v-if="notificationsHasMore && !notificationsLoading && notifications.length > 0"
                  type="button"
                  class="notification-more"
                  :disabled="notificationsLoadingMore"
                  @click="loadMoreNotifications"
                >
                  {{ notificationsLoadingMore ? '불러오는 중…' : '전체 알림 보기' }}
                </button>
              </template>
            </div>
          </div>

          <button v-if="!isLocalAdmin" type="button" class="icon-button topbar-help-button" @click="startTutorial">
            <CircleHelp :size="20" />
          </button>

          <div ref="profileDropdownRef" class="dropdown-wrap">
            <button class="profile-button" type="button" @click="toggleProfile">
              <span class="avatar">{{ userInitial }}</span>
              <span class="profile-copy">
                <strong class="profile-name">{{ user?.name }}</strong>
                <small class="profile-subtitle">{{ profileSubtitle }}</small>
              </span>
              <ChevronDown :size="18" class="profile-chevron" />
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
              <button
                v-if="user?.role === 'USER'"
                type="button"
                class="profile-menu-link"
                @click="startTutorial"
              >
                튜토리얼 다시 보기
              </button>
              <button type="button" class="ghost-button" @click="handleLogout">로그아웃</button>
            </div>
          </div>
        </div>
      </header>
      <RouterView :key="`${route.path}::${navResetKey}`" />
    </main>

    <AppToastStack :items="toasts" @dismiss="dismissToast" />
    <FloatingChatbot v-if="showFloatingChatbot" />
    <OnboardingTour v-if="tutorialOpen" @finish="closeTutorial" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Bell,
  CalendarDays,
  CircleHelp,
  Files,
  FolderOpen,
  LayoutDashboard,
  Mail,
  MessageCircleMore,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Users,
  UserRound,
  ChevronDown,
} from '@lucide/vue'
import FloatingChatbot from './FloatingChatbot.vue'
import AppToastStack from './common/AppToastStack.vue'
import OnboardingTour from './tutorial/OnboardingTour.vue'
import { isTutorialCompleted, markTutorialCompleted } from '../lib/tutorial'
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
const sidebarCollapsed = ref(false)
// 같은 메뉴를 다시 눌렀을 때 그 기능의 초기 화면으로 되돌리기 위해, RouterView를 강제 remount한다.
const navResetKey = ref(0)
const notificationsOpen = ref(false)
const profileOpen = ref(false)
const tutorialOpen = ref(false)
const notificationDropdownRef = ref(null)
const profileDropdownRef = ref(null)

const user = computed(() => auth.user)
const homePath = computed(() => auth.homePath)
const isAdmin = computed(() => user.value?.role === 'ADMIN')
const showFloatingChatbot = computed(() => !route.path.startsWith('/admin'))
const userInitial = computed(() => String(user.value?.name || user.value?.loginId || 'M').trim().slice(0, 1))
const profileSubtitle = computed(() => {
  if (user.value?.role === 'ADMIN') return 'Meetbowl 팀'
  return user.value?.organizationName || user.value?.team || '로컬 워크스페이스'
})
const notifications = ref([])
const unreadCount = ref(0)
const notificationsLoading = ref(false)
const NOTIFICATION_PAGE_SIZE = 10
const notificationPage = ref(1)
const notificationsHasMore = ref(false)
const notificationsLoadingMore = ref(false)
const toasts = ref([])

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
    title: '',
    roles: ['USER'],
    items: [
      { to: '/app/dashboard', label: '대시보드', icon: LayoutDashboard, tourId: 'dashboard' },
      {
        to: '/app/rooms',
        label: '회의실 예약',
        icon: CalendarDays,
        tourId: 'rooms',
      },
      { to: '/app/meetings', label: '회의', icon: Users, tourId: 'meetings' },
      { to: '/app/minutes', label: '내 회의록', icon: SquarePen, tourId: 'minutes' },
      { to: '/app/mail', label: '메일', icon: Mail },
    ],
  },
  {
    title: '',
    roles: ['USER'],
    items: [
      { to: '/app/workspace', label: '개인 워크스페이스', icon: UserRound },
      { to: '/app/shared-docs', label: '공유 워크스페이스', icon: Files },
      { to: '/app/community', label: '도파민', icon: MessageCircleMore },
    ],
  },
  {
    title: '관리자',
    roles: ['ADMIN'],
    items: [
      { to: '/admin/dashboard', label: '관리자 대시보드', icon: LayoutDashboard },
      { to: '/admin/members', label: '회원 관리', icon: UserRound },
      { to: '/admin/organization', label: '조직/직급 관리', icon: Users },
      { to: '/admin/rooms', label: '회의실 관리', icon: CalendarDays },
      { to: '/admin/minutes-policy', label: '보관 정책 관리', icon: FolderOpen },
      { to: '/admin/logs', label: '관리자 작업 로그', icon: Files },
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

function notificationVisual(notification) {
  const type = String(notification?.type || '').toUpperCase()
  const resourceType = String(notification?.resourceType || '').toUpperCase()

  if (type.includes('MINUTES') || resourceType === 'MEETING_MINUTES') {
    return { icon: SquarePen, toneClass: 'is-minutes', label: '회의록 알림' }
  }

  if (type.includes('MEETING') || resourceType === 'MEETING') {
    return { icon: CalendarDays, toneClass: 'is-meeting', label: '회의 알림' }
  }

  if (type.includes('COMMUNITY') || resourceType === 'COMMUNITY_POST') {
    return { icon: MessageCircleMore, toneClass: 'is-community', label: '도파민 알림' }
  }

  if (type.includes('MAIL') || resourceType === 'MAIL') {
    return { icon: Mail, toneClass: 'is-mail', label: '메일 알림' }
  }

  return { icon: Bell, toneClass: 'is-general', label: '일반 알림' }
}

function shouldToastNotification(notification) {
  if (notification?.read) return false
  const type = String(notification?.type || '').toUpperCase()
  const resourceType = String(notification?.resourceType || '').toUpperCase()
  return type.includes('MAIL')
    || type.includes('MEETING')
    || type.includes('COMMUNITY')
    || resourceType === 'MAIL'
    || resourceType === 'MEETING'
    || resourceType === 'COMMUNITY_POST'
}

function showNotificationToast(notification) {
  const toastId = `notification-${notification.id}`
  if (toasts.value.some((toast) => toast.id === toastId)) return
  const visual = notificationVisual(notification)
  const toast = {
    id: toastId,
    title: notification?.title || visual.label,
    message: notification?.content || visual.label,
  }
  toasts.value = [toast, ...toasts.value].slice(0, 3)
  window.setTimeout(() => dismissToast(toastId), 3200)
}

function dismissToast(id) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
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

function closeHeaderDropdowns() {
  notificationsOpen.value = false
  profileOpen.value = false
}

function handleMailReadEvent(event) {
  const mailId = event?.detail?.mailId
  if (!mailId) return
  const removedCount = notifications.value.filter(
    (notification) =>
      notification.resourceType === 'MAIL'
      && notification.resourceId === mailId
      && !notification.read,
  ).length
  if (!removedCount) return
  notifications.value = notifications.value.filter(
    (notification) => !(notification.resourceType === 'MAIL' && notification.resourceId === mailId),
  )
  unreadCount.value = Math.max(0, unreadCount.value - removedCount)
}

function toggleNotifications() {
  profileOpen.value = false
  notificationsOpen.value = !notificationsOpen.value
  if (!notificationsOpen.value) return

  if (isAdmin.value) {
    refreshAdminNotifications()
    return
  }

  loadNotifications()
}

function toggleProfile() {
  notificationsOpen.value = false
  profileOpen.value = !profileOpen.value
}

function handleDocumentPointerDown(event) {
  const target = event.target
  const clickedNotificationDropdown = notificationDropdownRef.value?.contains(target)
  const clickedProfileDropdown = profileDropdownRef.value?.contains(target)

  if (clickedNotificationDropdown || clickedProfileDropdown) return

  closeHeaderDropdowns()
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
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  window.addEventListener('meetbowl:mail-read', handleMailReadEvent)

  if (isAdmin.value) {
    refreshAdminNotificationCount().catch(() => {})
    return
  }

  loadNotifications()

  // 첫 로그인(아직 완료 기록 없음)인 USER에게 온보딩을 자동 노출한다.
  if (!isTutorialCompleted(user.value?.userId)) {
    tutorialOpen.value = true
  }

  notificationSource = subscribeNotifications({
    onNotification: (notification) => {
      const index = notifications.value.findIndex((item) => item.id === notification.id)
      if (notification.read) {
        if (index >= 0) notifications.value.splice(index, 1)
      } else if (index >= 0) {
        notifications.value.splice(index, 1, notification)
      } else {
        notifications.value.unshift(notification)
        unreadCount.value += 1
      }
      if (shouldToastNotification(notification)) showNotificationToast(notification)
    },
  })
})

onBeforeUnmount(() => {
  notificationSource?.close()
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  window.removeEventListener('meetbowl:mail-read', handleMailReadEvent)
})

const visibleSections = computed(() =>
  navSections.filter((section) => section.roles.includes(user.value?.role)),
)

function isActive(to) {
  return route.path === to || route.path.startsWith(`${to}/`)
}

function handleNavClick(to) {
  mobileOpen.value = false
  // 이미 그 메뉴의 화면(또는 하위 상세)에 있으면 라우터 이동이 없으므로, 직접 그 기능 홈으로 보내고 화면을 초기화한다.
  if (isActive(to)) {
    if (route.path !== to) router.push(to)
    navResetKey.value += 1
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function isExpanded(item) {
  if (!item.children) return false
  return isActive(item.to) || item.children.some((child) => isActive(child.to))
}

function startTutorial() {
  profileOpen.value = false
  tutorialOpen.value = true
}

function closeTutorial() {
  tutorialOpen.value = false
  // 완료/건너뛰기 모두 같은 브라우저에선 다시 자동으로 뜨지 않게 기록한다.
  markTutorialCompleted(user.value?.userId)
}

async function handleLogout() {
  closeHeaderDropdowns()
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.dropdown-wrap {
  position: relative;
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
}

.notification-panel {
  width: 420px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(18px);
}

.profile-panel {
  width: 240px;
  z-index: 21;
}

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
  padding: 14px 18px;
  border-bottom: 1px solid #e7edf5;
}

.notification-header .panel-title {
  margin: 0;
  border-bottom: none;
  font-size: 16px;
  font-weight: 800;
}

.notification-mark-all {
  margin-right: 0;
  border: none;
  background: none;
  color: #6b7280;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.notification-empty {
  margin: 0;
  padding: 20px 18px;
  font-size: 13px;
  color: var(--muted-foreground);
  text-align: center;
}

.notification-list {
  max-height: min(420px, calc(100vh - 220px));
  overflow-y: auto;
}

.notification {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 14px 18px;
  border-bottom: 1px solid #edf2f7;
  text-decoration: none;
  color: inherit;
  background: white;
  transition: background-color 0.16s ease, transform 0.16s ease;
}

.notification:hover {
  background: #fffaf5;
}

.notification.unread {
  background: linear-gradient(180deg, rgba(255, 247, 237, 0.5), rgba(255, 255, 255, 0.98));
}

.notification-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  flex-shrink: 0;
}

.notification-icon.is-mail {
  background: #fff4ed;
  color: #f97316;
}

.notification-icon.is-meeting {
  background: #f4f6fb;
  color: #475569;
}

.notification-icon.is-minutes {
  background: #eefcf6;
  color: #10b981;
}

.notification-icon.is-general,
.notification-icon.is-admin {
  background: #f8fafc;
  color: #475569;
}

.notification-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.notification-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.notification-copy strong {
  color: #111827;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
}

.notification-copy > span,
.notification-copy small {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.45;
}

.notification-copy > span {
  word-break: keep-all;
}

.notification-copy em {
  color: #94a3b8;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}

.notification.unread .notification-copy strong {
  color: #0f172a;
}

.password-reset-notification {
  gap: 12px;
  cursor: default;
}

.password-reset-notification:hover {
  background: #fffaf5;
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
  margin-top: 6px;
}

.password-reset-notification__reject {
  border-color: var(--border);
  color: var(--muted-foreground);
}

.notification-more {
  width: 100%;
  padding: 13px 18px;
  border: none;
  border-top: 1px solid #edf2f7;
  background: white;
  color: #f97316;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.notification-more:hover {
  background: #fffaf5;
}

.notification-more:disabled {
  color: var(--muted-foreground);
  cursor: default;
}

@media (max-width: 760px) {
  .notification-panel {
    width: min(92vw, 420px);
  }

  .notification {
    padding: 13px 16px;
  }

  .notification-header {
    padding: 13px 16px;
  }
}
</style>
