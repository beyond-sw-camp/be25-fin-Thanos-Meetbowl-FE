<template>
  <div class="minutes-editor" :class="{ 'minutes-editor-readonly': readonly }">
    <div v-if="!readonly" class="minutes-editor-toolbar">
      <div class="minutes-toolbar-group">
        <button type="button" :disabled="!editor?.can().chain().focus().undo().run()" @click="editor?.chain().focus().undo().run()">실행 취소</button>
        <button type="button" :disabled="!editor?.can().chain().focus().redo().run()" @click="editor?.chain().focus().redo().run()">다시 실행</button>
      </div>

      <div class="minutes-toolbar-group">
        <select :value="blockType" aria-label="문단 유형" @change="setBlockType($event.target.value)">
          <option value="paragraph">본문</option>
          <option value="heading-1">제목 1</option>
          <option value="heading-2">제목 2</option>
          <option value="heading-3">제목 3</option>
        </select>
        <select aria-label="글자 크기" @change="setFontSize($event.target.value)">
          <option value="">글자 크기</option>
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="24px">24</option>
        </select>
        <label class="minutes-color-control" title="글자색">
          <span>글자색</span>
          <input type="color" value="#172033" @input="editor?.chain().focus().setColor($event.target.value).run()" />
        </label>
      </div>

      <div class="minutes-toolbar-group">
        <button type="button" :class="{ active: editor?.isActive('bold') }" @click="editor?.chain().focus().toggleBold().run()">굵게</button>
        <button type="button" :class="{ active: editor?.isActive('italic') }" @click="editor?.chain().focus().toggleItalic().run()">기울임</button>
        <button type="button" :class="{ active: editor?.isActive('underline') }" @click="editor?.chain().focus().toggleUnderline().run()">밑줄</button>
        <button type="button" :class="{ active: editor?.isActive('strike') }" @click="editor?.chain().focus().toggleStrike().run()">취소선</button>
        <button type="button" :class="{ active: editor?.isActive('highlight') }" @click="editor?.chain().focus().toggleHighlight({ color: '#fef08a' }).run()">형광펜</button>
      </div>

      <div class="minutes-toolbar-group">
        <button type="button" :class="{ active: editor?.isActive({ textAlign: 'left' }) }" @click="editor?.chain().focus().setTextAlign('left').run()">왼쪽</button>
        <button type="button" :class="{ active: editor?.isActive({ textAlign: 'center' }) }" @click="editor?.chain().focus().setTextAlign('center').run()">가운데</button>
        <button type="button" :class="{ active: editor?.isActive({ textAlign: 'right' }) }" @click="editor?.chain().focus().setTextAlign('right').run()">오른쪽</button>
      </div>

      <div class="minutes-toolbar-group">
        <button type="button" :class="{ active: editor?.isActive('bulletList') }" @click="editor?.chain().focus().toggleBulletList().run()">글머리</button>
        <button type="button" :class="{ active: editor?.isActive('orderedList') }" @click="editor?.chain().focus().toggleOrderedList().run()">번호</button>
        <button type="button" :class="{ active: editor?.isActive('taskList') }" @click="editor?.chain().focus().toggleTaskList().run()">체크</button>
        <button type="button" :class="{ active: editor?.isActive('blockquote') }" @click="editor?.chain().focus().toggleBlockquote().run()">인용</button>
        <button type="button" @click="editor?.chain().focus().setHorizontalRule().run()">구분선</button>
      </div>

      <div class="minutes-toolbar-group">
        <button type="button" :class="{ active: editor?.isActive('link') }" @click="setLink">링크</button>
        <button type="button" @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()">표 삽입</button>
      </div>

      <div v-if="editor?.isActive('table')" class="minutes-toolbar-group minutes-table-tools">
        <span>표 편집</span>
        <button type="button" @click="editor?.chain().focus().addRowAfter().run()">행 추가</button>
        <button type="button" @click="editor?.chain().focus().deleteRow().run()">행 삭제</button>
        <button type="button" @click="editor?.chain().focus().addColumnAfter().run()">열 추가</button>
        <button type="button" @click="editor?.chain().focus().deleteColumn().run()">열 삭제</button>
        <button type="button" @click="editor?.chain().focus().mergeOrSplit().run()">셀 병합/분할</button>
        <button type="button" class="danger" @click="editor?.chain().focus().deleteTable().run()">표 삭제</button>
      </div>
    </div>
    <EditorContent v-if="editor" :editor="editor" class="minutes-editor-content" />
  </div>
</template>

<script setup>
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import { TableKit } from '@tiptap/extension-table'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import { FontSize, TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { computed, watch } from 'vue'
import { parseTiptapDocument, stringifyTiptapDocument } from '../../lib/minutes-content'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

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
    Highlight.configure({ multicolor: true }),
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
