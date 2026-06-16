import { deleteJson, getJson, patchJson, postForm, postJson } from './api-client'

export function getSharedWorkspaces() {
  return getJson('/shared-workspaces')
}

export function createSharedWorkspace(payload) {
  return postJson('/shared-workspaces', payload)
}

export function updateSharedWorkspace(spaceId, payload) {
  return patchJson(`/shared-workspaces/${spaceId}`, payload)
}

export function deleteSharedWorkspace(spaceId) {
  return deleteJson(`/shared-workspaces/${spaceId}`)
}

export function changeSharedWorkspaceAudience(spaceId, openToOrganization) {
  return patchJson(`/shared-workspaces/${spaceId}/audience`, { openToOrganization })
}

export function getSharedWorkspaceMembers(spaceId) {
  return getJson(`/shared-workspaces/${spaceId}/members`)
}

export function inviteSharedWorkspaceMember(spaceId, userId) {
  return postJson(`/shared-workspaces/${spaceId}/members`, { userId })
}

export function removeSharedWorkspaceMember(spaceId, userId) {
  return deleteJson(`/shared-workspaces/${spaceId}/members/${userId}`)
}

export function getSharedWorkspaceFiles(spaceId) {
  return getJson(`/shared-workspaces/${spaceId}/files`)
}

export function uploadSharedWorkspaceFile(spaceId, file) {
  const form = new FormData()
  form.append('file', file)
  return postForm(`/shared-workspaces/${spaceId}/files`, form)
}

export function addSharedWorkspaceFileVersion(spaceId, fileId, payload) {
  const form = new FormData()
  form.append('file', payload.file)
  form.append('expectedCurrentVersion', payload.expectedCurrentVersion)
  form.append('newVersion', payload.newVersion)
  if (payload.changeMemo) form.append('changeMemo', payload.changeMemo)
  return postForm(`/shared-workspaces/${spaceId}/files/${fileId}/versions`, form)
}

export function getSharedWorkspaceFileVersions(spaceId, fileId) {
  return getJson(`/shared-workspaces/${spaceId}/files/${fileId}/versions`)
}

export function updateSharedWorkspaceFileVersionMemo(spaceId, fileId, versionId, changeMemo) {
  return patchJson(`/shared-workspaces/${spaceId}/files/${fileId}/versions/${versionId}`, { changeMemo })
}

export function deleteSharedWorkspaceFile(spaceId, fileId) {
  return deleteJson(`/shared-workspaces/${spaceId}/files/${fileId}`)
}
