<script>
import { computed, defineComponent, ref } from 'vue'
import { communityPosts } from '../../data/mockData'

export default defineComponent({
  setup() {
    const categories = ['전체', '자유', '회사생활', '익명제보', '취미', '맛집']
    const posts = ref(communityPosts.map((post) => ({ ...post, comments: post.comments.map((comment) => ({ ...comment })) })))
    const tab = ref('latest')
    const category = ref('전체')
    const keyword = ref('')
    const openId = ref(null)
    const writing = ref(false)
    const likedPostIds = ref(new Set())
    const commentText = ref('')
    const editingCommentId = ref(null)
    const editText = ref('')
    const draft = ref({ title: '', body: '', category: '자유' })

    const score = (post) => post.likes * 3 + post.comments.length * 5 + post.views * 0.05
    const hotPosts = computed(() => posts.value.slice().sort((a, b) => score(b) - score(a)).slice(0, 3))
    const filteredPosts = computed(() => {
      let result = posts.value.slice()
      if (category.value !== '전체') result = result.filter((post) => post.category === category.value)
      const q = keyword.value.trim()
      if (q) result = result.filter((post) => post.title.includes(q) || post.body.includes(q))
      return result.sort((a, b) => (tab.value === 'hot' ? score(b) - score(a) : b.createdAt.localeCompare(a.createdAt)))
    })
    const openPost = computed(() => posts.value.find((post) => post.id === openId.value))

    function nowText() {
      const now = new Date()
      const pad = (value) => String(value).padStart(2, '0')
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    }

    function openPostDetail(post) {
      openId.value = post.id
      const target = posts.value.find((item) => item.id === post.id)
      if (target) target.views += 1
      commentText.value = ''
      editingCommentId.value = null
    }

    function closeDetail() {
      openId.value = null
      commentText.value = ''
      editingCommentId.value = null
    }

    function toggleLike(post) {
      const next = new Set(likedPostIds.value)
      if (next.has(post.id)) {
        post.likes -= 1
        next.delete(post.id)
      } else {
        post.likes += 1
        next.add(post.id)
      }
      likedPostIds.value = next
    }

    function addComment() {
      if (!openPost.value || !commentText.value.trim()) return
      openPost.value.comments.push({
        id: `c${Date.now()}`,
        text: commentText.value.trim(),
        createdAt: nowText(),
        likes: 0,
        mine: true,
      })
      commentText.value = ''
    }

    function startEditComment(comment) {
      editingCommentId.value = comment.id
      editText.value = comment.text
    }

    function saveEditComment(comment) {
      const text = editText.value.trim()
      if (text) comment.text = text
      editingCommentId.value = null
      editText.value = ''
    }

    function openWriteModal() {
      draft.value = { title: '', body: '', category: '자유' }
      writing.value = true
    }

    function savePost() {
      const title = draft.value.title.trim()
      const body = draft.value.body.trim()
      if (!title || !body) return
      posts.value.unshift({
        id: `p${Date.now()}`,
        title,
        body,
        category: draft.value.category,
        createdAt: nowText(),
        views: 0,
        likes: 0,
        comments: [],
      })
      writing.value = false
    }

    return {
      categories,
      posts,
      tab,
      category,
      keyword,
      writing,
      likedPostIds,
      commentText,
      editingCommentId,
      editText,
      draft,
      hotPosts,
      filteredPosts,
      openPost,
      score,
      openPostDetail,
      closeDetail,
      toggleLike,
      addComment,
      startEditComment,
      saveEditComment,
      openWriteModal,
      savePost,
    }
  },
  template: `
    <section v-if="!openPost" class="page community-page">
      <header class="page-header community-header">
        <div>
          <h1>도파민</h1>
          <p>익명으로 자유롭게 의견을 나누는 공간입니다. 인신공격과 비방은 금지됩니다.</p>
        </div>
        <button class="primary-button small" type="button" @click="openWriteModal">글쓰기</button>
      </header>

      <article class="card community-hot">
        <div class="community-section-title">
          <span class="hot-icon">HOT</span>
          <h2>HOT 게시글</h2>
          <small>실시간 인기</small>
        </div>
        <div class="hot-grid">
          <button v-for="(post, index) in hotPosts" :key="post.id" class="hot-card" type="button" @click="openPostDetail(post)">
            <div class="hot-meta"><strong>#{{ index + 1 }}</strong><span class="badge warning">{{ post.category }}</span></div>
            <h3>{{ post.title }}</h3>
            <div class="community-stats">
              <span>조회 {{ post.views.toLocaleString() }}</span>
              <span>좋아요 {{ post.likes }}</span>
              <span>댓글 {{ post.comments.length }}</span>
            </div>
          </button>
        </div>
      </article>

      <div class="community-controls">
        <div class="segmented">
          <button type="button" :class="{ active: tab === 'latest' }" @click="tab = 'latest'">최신순</button>
          <button type="button" :class="{ active: tab === 'hot' }" @click="tab = 'hot'">인기순</button>
        </div>
        <div class="category-row">
          <button v-for="item in categories" :key="item" type="button" class="chip" :class="{ active: category === item }" @click="category = item">{{ item }}</button>
        </div>
        <label class="community-search">
          <span>검색</span>
          <input v-model="keyword" placeholder="게시글 검색">
        </label>
      </div>

      <article class="card community-list">
        <button v-for="post in filteredPosts" :key="post.id" class="community-row" type="button" @click="openPostDetail(post)">
          <div class="community-row-main">
            <div class="community-row-top">
              <span class="badge">{{ post.category }}</span>
              <span v-if="score(post) > 200" class="hot-dot">인기</span>
            </div>
            <strong>{{ post.title }}</strong>
            <p>{{ post.body }}</p>
            <small>익명 · {{ post.createdAt }}</small>
          </div>
          <div class="community-row-stats">
            <span>조회<br><strong>{{ post.views.toLocaleString() }}</strong></span>
            <span>좋아요<br><strong>{{ post.likes }}</strong></span>
            <span>댓글<br><strong>{{ post.comments.length }}</strong></span>
          </div>
        </button>
        <div v-if="filteredPosts.length === 0" class="empty-state">게시글이 없습니다.</div>
      </article>

      <div v-if="writing" class="modal-backdrop" @click="writing = false">
        <form class="write-modal" @submit.prevent="savePost" @click.stop>
          <header>
            <h2>새 글 작성 (익명)</h2>
            <button type="button" @click="writing = false">닫기</button>
          </header>
          <select v-model="draft.category">
            <option v-for="item in categories.filter((item) => item !== '전체')" :key="item">{{ item }}</option>
          </select>
          <input v-model="draft.title" placeholder="제목">
          <textarea v-model="draft.body" rows="8" placeholder="내용을 입력하세요. 작성자는 익명으로 표시됩니다."></textarea>
          <p class="modal-note">비방·인신공격 게시물은 관리자에 의해 삭제될 수 있습니다.</p>
          <footer>
            <button type="button" class="ghost-button" @click="writing = false">취소</button>
            <button type="submit" class="primary-button small">등록</button>
          </footer>
        </form>
      </div>
    </section>

    <section v-else class="page community-detail">
      <button class="back-button" type="button" @click="closeDetail">목록으로</button>

      <article class="card post-detail-card">
        <span class="badge">{{ openPost.category }}</span>
        <h1>{{ openPost.title }}</h1>
        <div class="post-meta">
          <span>익명</span>
          <span>{{ openPost.createdAt }}</span>
          <span>조회 {{ openPost.views.toLocaleString() }}</span>
          <span>댓글 {{ openPost.comments.length }}</span>
        </div>
        <p class="post-body">{{ openPost.body }}</p>
        <div class="like-row">
          <button type="button" class="like-button" :class="{ active: likedPostIds.has(openPost.id) }" @click="toggleLike(openPost)">
            좋아요 {{ openPost.likes }}
          </button>
        </div>
      </article>

      <article class="card comments-card">
        <div class="card-head"><h2>댓글 {{ openPost.comments.length }}</h2></div>
        <ul class="comment-list">
          <li v-for="comment in openPost.comments" :key="comment.id">
            <div class="comment-meta">
              <strong>익명</strong>
              <span>{{ comment.createdAt }}</span>
              <button v-if="comment.mine && editingCommentId !== comment.id" type="button" @click="startEditComment(comment)">수정</button>
            </div>
            <div v-if="editingCommentId === comment.id" class="comment-edit">
              <input v-model="editText" @keydown.enter="saveEditComment(comment)">
              <button type="button" class="primary-button small" @click="saveEditComment(comment)">저장</button>
              <button type="button" class="ghost-button" @click="editingCommentId = null">취소</button>
            </div>
            <p v-else>{{ comment.text }}</p>
            <small>좋아요 {{ comment.likes }}</small>
          </li>
          <li v-if="openPost.comments.length === 0" class="empty-state">첫 댓글을 남겨보세요.</li>
        </ul>
        <div class="comment-composer">
          <input v-model="commentText" placeholder="익명으로 댓글 작성" @keydown.enter="addComment">
          <button type="button" class="primary-button small" @click="addComment">전송</button>
        </div>
      </article>
    </section>
  `,
})
</script>
