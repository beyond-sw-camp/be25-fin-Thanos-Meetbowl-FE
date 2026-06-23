<template>
  <div class="minutes-editor">
    <div class="minutes-editor-toolbar">
      <button type="button" :class="{ active: editor?.isActive('bold') }" @click="editor?.chain().focus().toggleBold().run()">굵게</button>
      <button type="button" :class="{ active: editor?.isActive('bulletList') }" @click="editor?.chain().focus().toggleBulletList().run()">목록</button>
      <button type="button" :class="{ active: editor?.isActive('heading', { level: 2 }) }" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">제목</button>
    </div>
    <EditorContent v-if="editor" :editor="editor" class="minutes-editor-content" />
  </div>
</template>

<script setup>
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { watch } from 'vue'
import { parseTiptapDocument, stringifyTiptapDocument } from '../../lib/minutes-content'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  extensions: [StarterKit],
  content: parseTiptapDocument(props.modelValue),
  editable: !props.disabled,
  onUpdate({ editor }) {
    emit('update:modelValue', stringifyTiptapDocument(editor.getJSON()))
  },
})

watch(() => props.disabled, (disabled) => {
  editor.value?.setEditable(!disabled)
})

watch(() => props.modelValue, (value) => {
  const instance = editor.value
  if (!instance) return
  const next = stringifyTiptapDocument(parseTiptapDocument(value))
  const current = stringifyTiptapDocument(instance.getJSON())
  if (next !== current) {
    instance.commands.setContent(parseTiptapDocument(value), false)
  }
})
</script>
