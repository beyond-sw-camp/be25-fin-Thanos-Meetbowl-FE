<template>
  <div class="minutes-document-shell" :class="{ editing: editable }">
    <div v-if="editable" class="minutes-editor-toolbar">
      <button
        v-for="action in actions"
        :key="action.label"
        type="button"
        class="secondary-button small"
        :class="{ active: action.isActive?.() }"
        @click="action.run"
      >
        {{ action.label }}
      </button>
    </div>
    <EditorContent v-if="editor" :editor="editor" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { parseMinutesContent } from '../../utils/minutesContent'

const props = defineProps({
  modelValue: { type: String, default: '' },
  editable: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: '회의록 본문을 입력하세요.',
    }),
  ],
  editable: props.editable,
  content: parseMinutesContent(props.modelValue),
  editorProps: {
    attributes: {
      class: 'minutes-prose',
    },
  },
  onUpdate: ({ editor: currentEditor }) => {
    emit('update:modelValue', JSON.stringify(currentEditor.getJSON()))
  },
})

watch(
  () => props.editable,
  (editable) => {
    editor.value?.setEditable(editable)
  },
)

watch(
  () => props.modelValue,
  (content) => {
    if (!editor.value) return
    const next = JSON.stringify(parseMinutesContent(content))
    const current = JSON.stringify(editor.value.getJSON())
    if (next !== current) {
      editor.value.commands.setContent(parseMinutesContent(content), false)
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const actions = computed(() => {
  if (!editor.value) return []
  return [
    {
      label: '제목 2',
      run: () => editor.value.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.value.isActive('heading', { level: 2 }),
    },
    {
      label: '굵게',
      run: () => editor.value.chain().focus().toggleBold().run(),
      isActive: () => editor.value.isActive('bold'),
    },
    {
      label: '목록',
      run: () => editor.value.chain().focus().toggleBulletList().run(),
      isActive: () => editor.value.isActive('bulletList'),
    },
    {
      label: '되돌리기',
      run: () => editor.value.chain().focus().undo().run(),
    },
    {
      label: '다시하기',
      run: () => editor.value.chain().focus().redo().run(),
    },
  ]
})
</script>
