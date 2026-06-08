<template>
  <section class="page mail-detail-page">
    <div class="mail-detail-toolbar">
      <button @click="$emit('back')">뒤로</button>
      <button @click="$emit('backup', mail.id)">백업</button>
      <button>삭제</button>
      <button>인쇄</button>
      <button>더보기</button>
    </div>
    <article class="card mail-message-card">
      <header><h1>{{ mail.subject }}</h1><button @click="$emit('backup', mail.id)">백업</button></header>
      <div class="mail-sender-line">
        <span class="table-avatar">{{ mail.from[0] }}</span>
        <div><strong>{{ mail.from }}</strong><small>{{ mail.dept }} · 받는 사람: 나 · {{ mail.date }}</small></div>
      </div>
      <pre>{{ mail.body || mail.preview }}</pre>
      <div v-if="mail.hasAttachment" class="mail-attachments">
        <strong>첨부파일 (2)</strong>
        <button>회의록.pdf <small>240KB</small></button>
        <button>녹음.mp3 <small>42.1MB</small></button>
      </div>
      <div class="modal-actions"><button class="secondary-button">답장</button><button class="secondary-button">전달</button></div>
    </article>
  </section>
</template>

<script setup>
defineProps({
  mail: { type: Object, required: true },
})

defineEmits(['back', 'backup'])
</script>
