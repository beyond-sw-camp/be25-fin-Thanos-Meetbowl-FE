import { deleteJson, getJson, patchJson, postJson } from './api-client'

// 익명 커뮤니티(게시판) API. 모든 엔드포인트는 로그인(User) 필수이며 /api/v1/community/posts 하위다.
// 응답은 api-client가 ApiResponse 엔벨로프를 풀어 data만 반환한다.
// 작성자는 userId 대신 authorAlias("익명N")로 오고, mine(작성자 본인)·liked(좋아요 여부)가 함께 내려온다.

function query(params = {}) {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    q.set(key, value)
  }
  const queryString = q.toString()
  return queryString ? `?${queryString}` : ''
}

// 카테고리(백엔드 enum과 1:1). "전체"는 카테고리가 아니라 필터 미적용이므로 여기 포함하지 않는다.
// 백엔드는 코드(FREE)·라벨(자유) 둘 다 받지만, 전송은 안정적인 코드값으로 한다. 표시는 응답의 categoryLabel을 쓴다.
export const COMMUNITY_CATEGORIES = [
  { code: 'FREE', label: '자유' },
  { code: 'COMPANY_LIFE', label: '회사생활' },
  { code: 'HOBBY', label: '취미' },
  { code: 'RESTAURANT', label: '맛집' },
]

// 게시글 목록. sort: latest(최신순) | popular(인기순), category 미지정 시 전체, keyword는 제목+내용 부분일치.
// 응답: { items, page, size, totalElements, totalPages } (items는 mine/liked 포함)
export function listPosts({ category, keyword, sort = 'latest', page = 1, size = 20 } = {}) {
  return getJson(`/community/posts${query({ category, keyword, sort, page, size })}`)
}

// Hot 게시글. 최근 48시간 내 인기 점수 상위 3개(목록 상단 노출용). 응답: PostListItemResponse[]
export function getHotPosts() {
  return getJson('/community/posts/hot')
}

// 게시글 상세. 조회 시 조회수 +1, 현재 사용자의 mine/liked 포함. 없는 글이면 404.
export function getPost(postId) {
  return getJson(`/community/posts/${postId}`)
}

// 게시글 작성. payload: { category, title, content }. 작성자는 서버가 토큰에서 채운다.
export function createPost(payload) {
  return postJson('/community/posts', payload)
}

// 게시글 수정(작성자 본인만, 아니면 403). payload: { category, title, content }
export function updatePost(postId, payload) {
  return patchJson(`/community/posts/${postId}`, payload)
}

// 게시글 삭제(작성자 본인만, 아니면 403). 댓글·좋아요까지 cascade 삭제.
export function deletePost(postId) {
  return deleteJson(`/community/posts/${postId}`)
}

// 댓글 목록(상세와 별도 호출). 등록순, 각 항목에 mine/liked 포함. 응답: CommentListItemResponse[]
export function listComments(postId) {
  return getJson(`/community/posts/${postId}/comments`)
}

// 댓글 작성. payload: { content }
export function createComment(postId, payload) {
  return postJson(`/community/posts/${postId}/comments`, payload)
}

// 댓글 수정(작성자 본인만, 아니면 403). payload: { content }
export function updateComment(postId, commentId, payload) {
  return patchJson(`/community/posts/${postId}/comments/${commentId}`, payload)
}

// 댓글 삭제(작성자 본인만, 아니면 403).
export function deleteComment(postId, commentId) {
  return deleteJson(`/community/posts/${postId}/comments/${commentId}`)
}

// 게시글 좋아요 토글. 응답: { liked, likeCount } (토글 후 상태/카운트)
export function togglePostLike(postId) {
  return postJson(`/community/posts/${postId}/likes`)
}

// 댓글 좋아요 토글. 응답: { liked, likeCount }
export function toggleCommentLike(postId, commentId) {
  return postJson(`/community/posts/${postId}/comments/${commentId}/likes`)
}
