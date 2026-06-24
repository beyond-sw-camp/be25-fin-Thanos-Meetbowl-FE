import { mails, members, myMeetings } from './mockData'
import { sharedInitialDocs, sharedInitialProjects } from './sharedDocsData'
import { initialMemos, workspaceBackupMails, workspaceDriveFiles, workspaceEvents } from './workspaceData'

// 개발/데모용 fallback 전역 스위치. 운영 빌드(PROD)에선 자동으로 꺼져 목업이 노출되지 않는다.
// 운영 배포 시 이 한 곳만으로 비활성화되며, 완전 삭제는 이 파일과 호출부를 함께 제거하면 된다.
export const FALLBACK_ENABLED = import.meta.env.DEV

// API 호출이 실패하면(개발/데모) fallback으로 대체하고, 운영에선 fallback이 빈 값을 돌려준다.
// 실패를 조용히 삼키지 않도록 콘솔에 남겨, 통합 중 진짜 API 오류가 가려지지 않게 한다.
export async function withFallback(primary, fallback) {
  try {
    return await primary()
  } catch (error) {
    console.warn('[fallback] API 호출 실패 → fallback 사용', error)
    return fallback()
  }
}

const USER_IDS = {
  김지연: '00000000-0000-0000-0000-000000000003',
  현재진: '00000000-0000-0000-0000-000000000008',
  윤정윤: '00000000-0000-0000-0000-000000000009',
  이지연: '00000000-0000-0000-0000-000000000003',
  박서연: '00000000-0000-0000-0000-000000000005',
  경영지원실: '00000000-0000-0000-0000-000000000001',
}

export function fallbackUserSearch({ keyword = '', page = 1, size = 8 } = {}) {
  // 운영에선 목업 대신 빈 페이지를 돌려준다(스위치 off).
  if (!FALLBACK_ENABLED) return pageItems([], page, size)
  const query = keyword.trim().toLowerCase()
  const items = members
    .map((member) => ({
      ...member,
      userId: member.userId || `00000000-0000-0000-0000-00000000000${member.id}`,
      affiliate: member.company,
      department: member.dept,
      team: member.dept,
    }))
    .filter((member) => {
      const role = String(member.role || '').toUpperCase()
      return role !== 'ADMIN' && role !== 'SYSTEM'
    })
    .filter((member) => !query || `${member.name} ${member.email} ${member.company} ${member.dept} ${member.position}`.toLowerCase().includes(query))
  return pageItems(items, page, size)
}

export function fallbackMailPage(mailbox, { page = 1, size = 15, keyword = '' } = {}) {
  if (!FALLBACK_ENABLED) return pageItems([], page, size)
  const query = keyword.trim().toLowerCase()
  const items = mails
    .filter((mail) => mailbox === 'search' ? !['trash', 'backup', 'notice'].includes(mail.category) : mail.category === mailbox)
    .filter((mail) => !query || `${mail.from} ${mail.dept} ${mail.subject} ${mail.preview} ${mail.body || ''}`.toLowerCase().includes(query))
    .map(toMailResponse)
  return pageItems(items, page, size)
}

export function fallbackWorkspaceCalendar() {
  if (!FALLBACK_ENABLED) return []
  return workspaceEvents.map((event, index) => ({
    eventId: `mock-event-${index + 1}`,
    meetingId: myMeetings.find((meeting) => meeting.title === event.title)?.id || null,
    title: event.title,
    description: event.where || event.address || event.who || '',
    source: event.kind === 'team' ? 'MEETING' : 'PERSONAL',
    startedAt: kstIso(event.date, event.start),
    endedAt: kstIso(event.date, event.end),
  }))
}

export function fallbackWorkspaceMemos() {
  if (!FALLBACK_ENABLED) return []
  return initialMemos.map((memo) => ({
    memoId: memo.id,
    title: memo.title,
    content: memo.body,
    createdAt: kstIsoFromDateTime(memo.updated),
    updatedAt: kstIsoFromDateTime(memo.updated),
  }))
}

export function fallbackWorkspaceBackups(keyword = '') {
  if (!FALLBACK_ENABLED) return []
  const query = keyword.trim().toLowerCase()
  return workspaceBackupMails
    .filter((backup) => !query || `${backup.title} ${backup.from} ${backup.preview}`.toLowerCase().includes(query))
    .map((backup) => ({
      backupId: backup.id,
      title: backup.title,
      sourceType: 'MAIL',
      summary: backup.preview,
      backedUpAt: `${backup.date}T00:00:00Z`,
      bookmarked: false,
    }))
}

export function fallbackWorkspaceDriveFiles() {
  if (!FALLBACK_ENABLED) return []
  return workspaceDriveFiles.map((file, index) => ({
    fileId: `mock-drive-${index + 1}`,
    originalFileName: file.name,
    sizeBytes: parseSize(file.size),
    uploadedAt: '2026-05-21T00:00:00Z',
  }))
}

export function fallbackSharedWorkspaces() {
  if (!FALLBACK_ENABLED) return []
  return sharedInitialProjects
    .map((project) => ({
      workspaceId: `mock-shared-${project.id}`,
      name: project.label,
      description: `${project.label} 공유 자료 테스트 스페이스`,
      visibility: project.id === 'ops' ? 'ORGANIZATION' : 'MEMBER',
      docIds: project.docIds,
      participants: project.participants || [],
    }))
}

export function fallbackSharedFiles(spaceId) {
  if (!FALLBACK_ENABLED) return []
  const projectId = spaceId.replace('mock-shared-', '')
  const project = sharedInitialProjects.find((item) => item.id === projectId)
  const docs = project
    ? sharedInitialDocs.filter((doc) => project.docIds.includes(doc.id))
    : sharedInitialDocs
  return docs.map((doc, index) => ({
    fileId: `${spaceId}-file-${index + 1}`,
    originalFileName: `${doc.title}.${extensionForSharedDoc(doc.type)}`,
    contentType: doc.dept,
    currentVersion: doc.version,
    uploaderUserId: doc.author,
    sizeBytes: parseSize(doc.size),
    uploadedAt: kstIsoFromDateTime(doc.updated),
    history: doc.history,
  }))
}

export function fallbackSharedMembers(spaceId) {
  if (!FALLBACK_ENABLED) return []
  const projectId = spaceId?.replace('mock-shared-', '')
  const project = sharedInitialProjects.find((item) => item.id === projectId)
  const participantNames = project?.participants?.length ? project.participants : ['이지연', '박관리']
  return participantNames.map((name, index) => ({
    userId: name,
    role: index === 0 ? 'OWNER' : 'MEMBER',
  }))
}

export function fallbackSharedVersions(file) {
  if (!FALLBACK_ENABLED) return []
  return (file.history?.length ? file.history : [{ v: file.currentVersion, author: file.uploaderUserId, date: file.uploadedAt, note: '초기 업로드' }])
    .map((version, index) => ({
      versionId: `${file.fileId}-v${index + 1}`,
      version: version.v,
      changeMemo: version.note,
      uploaderUserId: version.author,
      sizeBytes: file.sizeBytes,
      uploadedAt: version.date?.includes('T') ? version.date : kstIsoFromDateTime(version.date),
    }))
}

function toMailResponse(mail) {
  const senderUserId = USER_IDS[mail.from] || USER_IDS.이지연
  return {
    mailId: mail.id,
    senderUserId,
    senderName: mail.from,
    senderMeta: mail.dept,
    recipientUserIds: [USER_IDS.이지연],
    subject: mail.subject,
    body: mail.body || mail.preview,
    requestedAt: `${mail.date}T00:00:00Z`,
    read: !mail.unread,
    trashed: mail.category === 'trash',
    hasAttachments: mail.hasAttachment,
    attachmentCount: mail.hasAttachment ? 2 : 0,
    attachments: mail.hasAttachment
      ? [
          { attachmentId: `${mail.id}-a1`, originalFileName: '회의록.pdf', mimeType: 'application/pdf', sizeBytes: 245760 },
          { attachmentId: `${mail.id}-a2`, originalFileName: '녹음.mp3', mimeType: 'audio/mpeg', sizeBytes: 44100000 },
        ]
      : [],
  }
}

function pageItems(items, page, size) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeSize = Math.max(1, Number(size) || 15)
  const start = (safePage - 1) * safeSize
  return {
    items: items.slice(start, start + safeSize),
    page: safePage,
    size: safeSize,
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / safeSize)),
  }
}

function kstIso(date, time) {
  return new Date(`${date}T${time}:00+09:00`).toISOString()
}

function kstIsoFromDateTime(value) {
  return new Date(`${value.replace(' ', 'T')}:00+09:00`).toISOString()
}

function parseSize(value) {
  const numeric = Number.parseFloat(value)
  if (value.toUpperCase().includes('MB')) return Math.round(numeric * 1024 * 1024)
  if (value.toUpperCase().includes('KB')) return Math.round(numeric * 1024)
  return Math.round(numeric)
}

function extensionForSharedDoc(type) {
  if (type === 'sheet') return 'xlsx'
  if (type === 'slide') return 'pptx'
  if (type === 'pdf') return 'pdf'
  return 'docx'
}
