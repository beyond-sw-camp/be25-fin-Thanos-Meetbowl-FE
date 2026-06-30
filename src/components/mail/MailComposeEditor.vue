<template>
  <div class="mail-compose-editor" :class="{ readonly }">
    <div v-if="!readonly" class="mail-compose-toolbar">
      <div class="mail-compose-toolbar-strip">
        <div class="mail-compose-toolbar-group">
        <button
          type="button"
          aria-label="실행 취소"
          :disabled="!editor?.can().chain().focus().undo().run()"
          @click="editor?.chain().focus().undo().run()"
        >
          <Undo2 :size="15" />
        </button>
        <button
          type="button"
          aria-label="다시 실행"
          :disabled="!editor?.can().chain().focus().redo().run()"
          @click="editor?.chain().focus().redo().run()"
        >
          <Redo2 :size="15" />
        </button>
        </div>

        <div class="mail-compose-toolbar-group mail-compose-toolbar-group-selects">
          <select :value="blockType" aria-label="문단 유형" @change="setBlockType($event.target.value)">
            <option value="paragraph">본문</option>
            <option value="heading-1">제목 1</option>
            <option value="heading-2">제목 2</option>
            <option value="heading-3">제목 3</option>
          </select>
          <select aria-label="글자 크기" @change="setFontSize($event.target.value)">
            <option value="">크기</option>
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
          </select>
          <label class="mail-compose-color-control" title="글자색">
            <span>색상</span>
            <input type="color" value="#172033" @input="editor?.chain().focus().setColor($event.target.value).run()" />
          </label>
        </div>

        <div class="mail-compose-toolbar-group">
          <button type="button" aria-label="굵게" :class="{ active: editor?.isActive('bold') }" @click="editor?.chain().focus().toggleBold().run()">
            <Bold :size="15" />
          </button>
          <button type="button" aria-label="기울임" :class="{ active: editor?.isActive('italic') }" @click="editor?.chain().focus().toggleItalic().run()">
            <Italic :size="15" />
          </button>
          <button type="button" aria-label="밑줄" :class="{ active: editor?.isActive('underline') }" @click="editor?.chain().focus().toggleUnderline().run()">
            <UnderlineIcon :size="15" />
          </button>
          <button type="button" aria-label="취소선" :class="{ active: editor?.isActive('strike') }" @click="editor?.chain().focus().toggleStrike().run()">
            <Strikethrough :size="15" />
          </button>
        </div>

        <div class="mail-compose-toolbar-group">
          <button type="button" aria-label="왼쪽 정렬" :class="{ active: editor?.isActive({ textAlign: 'left' }) }" @click="editor?.chain().focus().setTextAlign('left').run()">
            <AlignLeft :size="15" />
          </button>
          <button type="button" aria-label="가운데 정렬" :class="{ active: editor?.isActive({ textAlign: 'center' }) }" @click="editor?.chain().focus().setTextAlign('center').run()">
            <AlignCenter :size="15" />
          </button>
          <button type="button" aria-label="오른쪽 정렬" :class="{ active: editor?.isActive({ textAlign: 'right' }) }" @click="editor?.chain().focus().setTextAlign('right').run()">
            <AlignRight :size="15" />
          </button>
        </div>

        <div class="mail-compose-toolbar-group">
          <button type="button" aria-label="글머리 기호" :class="{ active: editor?.isActive('bulletList') }" @click="editor?.chain().focus().toggleBulletList().run()">
            <List :size="15" />
          </button>
          <button type="button" aria-label="번호 목록" :class="{ active: editor?.isActive('orderedList') }" @click="editor?.chain().focus().toggleOrderedList().run()">
            <ListOrdered :size="15" />
          </button>
          <button type="button" aria-label="체크리스트" :class="{ active: editor?.isActive('taskList') }" @click="editor?.chain().focus().toggleTaskList().run()">
            <ListTodo :size="15" />
          </button>
        </div>

        <div class="mail-compose-toolbar-group">
          <button type="button" aria-label="링크" :class="{ active: editor?.isActive('link') }" @click="setLink">
            <Link2 :size="15" />
          </button>
          <button type="button" aria-label="인용" :class="{ active: editor?.isActive('blockquote') }" @click="editor?.chain().focus().toggleBlockquote().run()">
            <Quote :size="15" />
          </button>
          <button type="button" aria-label="구분선" @click="editor?.chain().focus().setHorizontalRule().run()">
            <Minus :size="15" />
          </button>
          <button type="button" aria-label="표 삽입" @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()">
            <Table2 :size="15" />
          </button>
        </div>
      </div>
    </div>

    <EditorContent v-if="editor" :editor="editor" class="mail-compose-editor-content" />
  </div>
</template>

<script setup>
import { Color } from '@tiptap/extension-color'
import Link from '@tiptap/extension-link'
import { TableKit } from '@tiptap/extension-table'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import { FontSize, TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
} from '@lucide/vue'
import { computed, watch } from 'vue'
import { parseTiptapDocument, stringifyTiptapDocument } from '../../lib/minutes-content'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const INLINE_HEADING_PRESETS = {
  1: { fontSize: '24px' },
  2: { fontSize: '20px' },
  3: { fontSize: '18px' },
}

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      link: false,
      underline: false,
    }),
    TextStyle,
    FontSize,
    Color,
    Underline,
    Link.configure({
      autolink: true,
      openOnClick: props.readonly,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({ table: { resizable: true } }),
  ],
  content: parseTiptapDocument(props.modelValue),
  editable: !props.disabled && !props.readonly,
  onUpdate({ editor: instance }) {
    if (props.readonly) return
    emit('update:modelValue', stringifyTiptapDocument(instance.getJSON()))
  },
})

const blockType = computed(() => {
  if (editor.value?.isActive('heading', { level: 1 })) return 'heading-1'
  if (editor.value?.isActive('heading', { level: 2 })) return 'heading-2'
  if (editor.value?.isActive('heading', { level: 3 })) return 'heading-3'
  const fontSize = editor.value?.getAttributes('textStyle')?.fontSize || ''
  if (fontSize === INLINE_HEADING_PRESETS[1].fontSize && editor.value?.isActive('bold')) return 'heading-1'
  if (fontSize === INLINE_HEADING_PRESETS[2].fontSize && editor.value?.isActive('bold')) return 'heading-2'
  if (fontSize === INLINE_HEADING_PRESETS[3].fontSize && editor.value?.isActive('bold')) return 'heading-3'
  return 'paragraph'
})

watch(
  () => [props.disabled, props.readonly],
  ([disabled, readonly]) => {
    editor.value?.setEditable(!disabled && !readonly)
  },
)

watch(() => props.modelValue, (value) => {
  const instance = editor.value
  if (!instance) return
  const next = stringifyTiptapDocument(parseTiptapDocument(value))
  const current = stringifyTiptapDocument(instance.getJSON())
  if (next !== current) {
    instance.commands.setContent(parseTiptapDocument(value), false)
  }
})

function setBlockType(value) {
  if (!editor.value) return
  const { empty } = editor.value.state.selection

  if (!empty) {
    if (value === 'paragraph') {
      editor.value.chain().focus().setFontSize('16px').unsetBold().run()
      return
    }
    const level = Number(value.replace('heading-', ''))
    const preset = INLINE_HEADING_PRESETS[level]
    if (!preset) return
    editor.value.chain().focus().setFontSize(preset.fontSize).setBold().run()
    return
  }

  if (value === 'paragraph') {
    editor.value.chain().focus().setParagraph().run()
    return
  }
  const level = Number(value.replace('heading-', ''))
  editor.value.chain().focus().setHeading({ level }).run()
}

function setFontSize(value) {
  if (!editor.value || !value) return
  editor.value.chain().focus().setFontSize(value).run()
}

function setLink() {
  if (!editor.value) return
  const current = editor.value.getAttributes('link').href || ''
  const url = window.prompt('연결할 URL을 입력하세요.', current)
  if (url === null) return
  if (!url.trim()) {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  const normalized = normalizeWebUrl(url)
  if (!normalized) {
    window.alert('http 또는 https URL만 입력할 수 있습니다.')
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run()
}

function normalizeWebUrl(value) {
  try {
    const url = new URL(String(value).trim())
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}
</script>

<style scoped>
.mail-compose-editor {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: white;
}

.mail-compose-toolbar {
  border-bottom: 1px solid var(--border);
  background: white;
  padding: 8px 10px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.mail-compose-toolbar-strip {
  width: max-content;
  min-width: 100%;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  align-items: center;
  gap: 6px;
}

.mail-compose-toolbar-group {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  align-items: center;
  gap: 4px;
  padding-right: 6px;
  border-right: 1px solid #e9edf5;
  flex: 0 0 auto;
}

.mail-compose-toolbar-group-selects {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  gap: 6px;
}

.mail-compose-toolbar-group:last-child {
  border-right: 0;
  padding-right: 0;
}

.mail-compose-toolbar button,
.mail-compose-toolbar select {
  flex: 0 0 auto;
  min-height: 32px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  color: var(--foreground);
  font-size: 11px;
  font-weight: 700;
}

.mail-compose-toolbar button {
  min-width: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
}

.mail-compose-toolbar button:hover:not(:disabled),
.mail-compose-toolbar select:hover,
.mail-compose-color-control:hover {
  border-color: #fdba74;
  background: #fff7ed;
}

.mail-compose-toolbar button.active {
  border-color: var(--primary);
  background: #fff7ed;
  color: var(--primary-dark);
}

.mail-compose-toolbar button:disabled {
  cursor: not-allowed;
  opacity: .4;
}

.mail-compose-toolbar select {
  min-width: 68px;
  padding: 0 8px;
  outline: none;
}

.mail-compose-toolbar-group-selects select:first-child {
  min-width: 70px;
}

.mail-compose-toolbar-group-selects select:last-of-type {
  min-width: 64px;
}

.mail-compose-color-control {
  flex: 0 0 auto;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  padding: 0 8px;
  color: var(--foreground);
  font-size: 11px;
  font-weight: 700;
}

.mail-compose-color-control input {
  width: 16px;
  height: 16px;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.mail-compose-editor-content :deep(.ProseMirror) {
  min-height: 320px;
  padding: 16px 18px 20px;
  outline: none;
  line-height: 1.75;
}

.mail-compose-editor-content :deep(.ProseMirror p) {
  margin: 0 0 12px;
}

.mail-compose-editor-content :deep(.ProseMirror h1) {
  margin: 0 0 20px;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.35;
}

.mail-compose-editor-content :deep(.ProseMirror h2) {
  margin: 24px 0 10px;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.4;
}

.mail-compose-editor-content :deep(.ProseMirror h3) {
  margin: 18px 0 8px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
}

.mail-compose-editor-content :deep(.ProseMirror ul),
.mail-compose-editor-content :deep(.ProseMirror ol) {
  margin: 8px 0 12px;
  padding-left: 22px;
}

.mail-compose-editor-content :deep(.ProseMirror blockquote) {
  margin: 12px 0;
  border-left: 3px solid #fdba74;
  padding: 6px 0 6px 14px;
  color: var(--muted-foreground);
}

.mail-compose-editor-content :deep(.ProseMirror hr) {
  margin: 20px 0;
  border: 0;
  border-top: 1px solid var(--border);
}

.mail-compose-editor-content :deep(.ProseMirror a) {
  color: #2563eb;
  text-decoration: underline;
}

.mail-compose-editor-content :deep(.ProseMirror table) {
  width: 100%;
  margin: 14px 0;
  border-collapse: collapse;
  table-layout: fixed;
}

.mail-compose-editor-content :deep(.ProseMirror th),
.mail-compose-editor-content :deep(.ProseMirror td) {
  position: relative;
  min-width: 80px;
  border: 1px solid #94a3b8;
  padding: 8px 10px;
  vertical-align: top;
}

.mail-compose-editor-content :deep(.ProseMirror th) {
  background: #f1f5f9;
  font-weight: 800;
  text-align: left;
}

.mail-compose-editor-content :deep(.ProseMirror .selectedCell::after) {
  position: absolute;
  inset: 0;
  z-index: 2;
  content: "";
  background: rgba(59,130,246,.14);
  pointer-events: none;
}

.mail-compose-editor-content :deep(.ProseMirror .column-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: -2px;
  width: 4px;
  background: #3b82f6;
  pointer-events: none;
}

.mail-compose-editor-content :deep(.ProseMirror ul[data-type="taskList"]) {
  padding-left: 0;
  list-style: none;
}

.mail-compose-editor-content :deep(.ProseMirror ul[data-type="taskList"] li) {
  display: flex;
  align-items: flex-start;
  gap: 7px;
}

.mail-compose-editor-content :deep(.ProseMirror ul[data-type="taskList"] li > label) {
  display: inline-flex;
  padding-top: 4px;
}

.mail-compose-editor-content :deep(.ProseMirror ul[data-type="taskList"] li > div) {
  flex: 1;
  min-width: 0;
}
</style>
