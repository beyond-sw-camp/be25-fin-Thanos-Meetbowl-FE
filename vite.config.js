import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const apiProxy = {
  '/api': {
    // 개발/프리뷰 서버 모두 백엔드 API를 프록시해 정적 서버 404를 피한다.
    target: 'http://127.0.0.1:8080',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    // macOS/브라우저 조합에 따라 localhost가 ::1만 바라보면 접속이 흔들릴 수 있어 IPv4/IPv6 모두 받는다.
    host: '0.0.0.0',
    // 로컬 개발에서 /api 요청이 Vite 정적 서버로 가지 않도록 백엔드로 바로 전달한다.
    proxy: apiProxy,
  },
  preview: {
    host: '0.0.0.0',
    // preview 실행 시에도 같은 프록시를 유지해야 엑셀 다운로드 API가 404로 빠지지 않는다.
    proxy: apiProxy,
  },
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
