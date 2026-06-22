import assert from 'node:assert/strict'
import test from 'node:test'

import { getHotPosts, listPosts } from '../src/lib/community.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

// fetch를 가로채 호출 URL/메서드를 기록하고, 공통 응답 엔벨로프({success,data})를 돌려준다.
function mockFetch(data) {
  const calls = []
  globalThis.localStorage = createStorage()
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return calls
}

test('getHotPosts는 GET /community/posts/hot 를 호출하고 data 배열을 그대로 반환한다 (캐러셀 데이터 경로)', async () => {
  const hot = [
    { id: '1', title: 'a' },
    { id: '2', title: 'b' },
    { id: '3', title: 'c' },
    { id: '4', title: 'd' },
  ]
  const calls = mockFetch(hot)

  const result = await getHotPosts()

  assert.equal(calls.length, 1)
  assert.equal(calls[0].init.method, 'GET')
  assert.ok(calls[0].url.endsWith('/community/posts/hot'), `url=${calls[0].url}`)
  // 클라이언트 변형 없이 백엔드 응답을 그대로 노출한다(개수/순서는 백엔드 결정).
  assert.deepEqual(result, hot)
})

test('listPosts hot=true면 쿼리에 hot=true 포함', async () => {
  const calls = mockFetch({ items: [] })

  await listPosts({ category: '', keyword: '', hot: true, page: 1, size: 50 })

  assert.ok(calls[0].url.includes('hot=true'), `url=${calls[0].url}`)
})

test('listPosts hot=false면 쿼리에서 hot 파라미터가 빠진다', async () => {
  const calls = mockFetch({ items: [] })

  await listPosts({ category: '', keyword: '', hot: false, page: 1, size: 50 })

  assert.ok(!calls[0].url.includes('hot='), `url=${calls[0].url}`)
})
