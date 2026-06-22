import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import { useAuthStore } from '../stores/auth'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.vue'
import AdminLogsPage from '../pages/admin/AdminLogsPage.vue'
import AdminReservationsPage from '../pages/admin/AdminReservationsPage.vue'
import AdminRoomsPage from '../pages/admin/AdminRoomsPage.vue'
import MembersPage from '../pages/admin/MembersPage.vue'
import OrganizationPage from '../pages/admin/OrganizationPage.vue'
import PolicyPage from '../pages/admin/PolicyPage.vue'
import JoinPage from '../pages/auth/JoinPage.vue'
import LoginPage from '../pages/auth/LoginPage.vue'
import CommunityPage from '../pages/community/CommunityPage.vue'
import DashboardPage from '../pages/dashboard/DashboardPage.vue'
import SimpleDocsPage from '../pages/docs/SimpleDocsPage.vue'
import { meetingRoute } from '../lib/meeting-route'
import MailPage from '../pages/mail/MailPage.vue'
import MeetingPage from '../pages/meeting/MeetingPage.vue'
import LiveKitTestPage from '../pages/livekit/LiveKitTestPage.vue'
import MeetingsPage from '../pages/meetings/MeetingsPage.vue'
import MinutesPage from '../pages/minutes/MinutesPage.vue'
import BackupDetailPage from '../pages/backup/BackupDetailPage.vue'
import MyReservationsPage from '../pages/reservations/MyReservationsPage.vue'
import MyAttendingPage from '../pages/reservations/MyAttendingPage.vue'
import RoomsPage from '../pages/rooms/RoomsPage.vue'
import SettingsPage from '../pages/settings/SettingsPage.vue'
import SharedDocsPage from '../pages/shared-docs/SharedDocsPage.vue'
import WorkspacePage from '../pages/workspace/WorkspacePage.vue'

const routes = [
  { path: '/', redirect: '/app/dashboard' },
  { path: '/login', component: LoginPage, meta: { public: true } },
  { path: '/join/:code', component: JoinPage, meta: { public: true } },
  { path: '/guest/meeting/:meetingId', component: MeetingPage, meta: { public: true } },
  { path: '/app/meeting', redirect: meetingRoute(), meta: { role: 'USER' } },
  { path: '/app/meeting/:meetingId', component: MeetingPage, meta: { role: 'USER' } },
  {
    path: '/',
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      { path: 'app/dashboard', component: DashboardPage, meta: { role: 'USER' } },
      { path: 'app/rooms', component: RoomsPage, meta: { role: 'USER' } },
      { path: 'app/my-reservations', component: MyReservationsPage, meta: { role: 'USER' } },
      { path: 'app/my-attending', component: MyAttendingPage, meta: { role: 'USER' } },
      { path: 'app/meetings', component: MeetingsPage, meta: { role: 'USER' } },
      { path: 'app/livekit-test', component: LiveKitTestPage, meta: { role: 'USER' } },
      { path: 'app/mail', component: MailPage, meta: { role: 'USER' } },
      { path: 'app/minutes', component: MinutesPage, meta: { role: 'USER' } },
      { path: 'app/recordings', redirect: '/app/minutes', meta: { role: 'USER' } },
      { path: 'app/workspace', component: WorkspacePage, meta: { role: 'USER' } },
      { path: 'app/shared-docs', component: SharedDocsPage, meta: { role: ['USER', 'ADMIN'] } },
      { path: 'app/community', component: CommunityPage, meta: { role: 'USER' } },
      {
        path: 'app/backup/:id',
        component: BackupDetailPage,
        meta: { role: 'USER' },
      },
      {
        path: 'password/change',
        component: SettingsPage,
        // 최초 로그인 사용자는 일반 설정 화면이 아니라 이 강제 변경 경로로만 진입시킨다.
        props: { forcePasswordChange: true },
        meta: { role: ['USER', 'ADMIN'], allowWhenPasswordChangeRequired: true },
      },
      {
        path: 'app/settings',
        component: SettingsPage,
        props: { forcePasswordChange: false },
        meta: { role: ['USER', 'ADMIN'] },
      },
      {
        path: 'app/users',
        // 기존 사용자 검색 URL로 들어와도 관리자 화면 권한 기준으로만 연결한다.
        redirect: '/admin/members',
        meta: { role: 'ADMIN' },
      },
      {
        path: 'app/user-search',
        redirect: '/admin/members',
        meta: { role: 'ADMIN' },
      },
      { path: 'admin/dashboard', component: AdminDashboardPage, meta: { role: 'ADMIN' } },
      { path: 'admin/members', component: MembersPage, meta: { role: 'ADMIN' } },
      { path: 'admin/organization', component: OrganizationPage, meta: { role: 'ADMIN' } },
      { path: 'admin/rooms', component: AdminRoomsPage, meta: { role: 'ADMIN' } },
      {
        path: 'admin/reservations',
        component: AdminReservationsPage,
        meta: { role: 'ADMIN' },
      },
      {
        path: 'admin/mail-policy',
        // 기존 메일 정책 URL은 북마크 호환을 위해 유지하되, 실제 화면은 통합된 보관 정책 관리로 보낸다.
        redirect: '/admin/minutes-policy',
        meta: { role: 'ADMIN' },
      },
      {
        path: 'admin/minutes-policy',
        component: PolicyPage,
        props: {
          title: '보관 정책 관리',
          description: '회의록, 녹음 파일, 메일 데이터의 보관 정책을 한 화면에서 관리합니다.',
        },
        meta: { role: 'ADMIN' },
      },
      {
        path: 'admin/recording-policy',
        redirect: '/admin/minutes-policy',
        meta: { role: 'ADMIN' },
      },
      { path: 'admin/logs', component: AdminLogsPage, meta: { role: 'ADMIN' } },
    ],
  },
  {
    path: '/users/search',
    // USER가 직접 주소를 입력해도 접근 권한 없음 화면 대신 홈으로 되돌아가도록 관리자 권한으로 묶는다.
    redirect: '/admin/members',
    meta: { role: 'ADMIN' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/app/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (to.path === '/login' && auth.isAuthenticated) return auth.postLoginPath
    return true
  }
  if (!auth.isAuthenticated) return '/login'
  if (auth.requiresInitialPasswordChange) {
    // 초기 비밀번호 변경 전에는 다른 화면으로 이동하지 못하게 강제한다.
    if (to.path !== '/password/change') return '/password/change'
  } else if (to.path === '/password/change') {
    // 이미 비밀번호를 바꿨다면 강제 변경 화면에 다시 머물지 않도록 기본 홈으로 돌린다.
    return auth.homePath
  }
  const requiredRole = to.meta.role
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : requiredRole ? [requiredRole] : []
  if (to.path === '/admin/dashboard' && requiredRoles.length === 1 && requiredRoles[0] === 'ADMIN') return true
  if (requiredRoles.length && !requiredRoles.includes(auth.user?.role)) return auth.homePath
  return true
})

export default router
