<template>
  <div class="h-full flex flex-col border border-surface-700 rounded-lg overflow-hidden">
    <div class="flex items-center justify-between px-3 py-1.5 bg-surface-800 border-b border-surface-700 shrink-0">
      <span class="text-xs text-gray-500">MemPalace Query</span>
      <div class="flex items-center gap-2">
        <button
          class="px-2.5 py-0.5 rounded text-xs font-medium bg-palace-600 hover:bg-palace-500 text-white transition-colors disabled:opacity-50"
          :disabled="!modelValue.trim()"
          @click="emit('run')"
        >
          Run
        </button>
      </div>
    </div>
    <div ref="editorContainer" class="flex-1 min-h-0" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import * as monaco from 'monaco-editor';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  run: [];
}>();

const editorContainer = ref<HTMLDivElement | null>(null);
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null);

const PLACEHOLDER = `FIND memories
WHERE room = "architecture"
AND wing = "mempalace-explorer"
LIMIT 20`;

const KEYWORDS = [
  'FIND', 'SEARCH', 'memories', 'WHERE', 'AND', 'OR',
  'tag', 'wing', 'room', 'date', 'text', 'content', 'LIMIT',
];

onMounted(() => {
  if (!editorContainer.value) return;

  monaco.editor.defineTheme('mempalace-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
      { token: 'string', foreground: '34d399' },
      { token: 'number', foreground: 'fbbf24' },
      { token: 'operator', foreground: '60a5fa' },
    ],
    colors: {
      'editor.background': '#0f172a',
      'editor.foreground': '#e2e8f0',
      'editorLineNumber.foreground': '#334155',
      'editorCursor.foreground': '#c084fc',
      'editor.selectionBackground': '#7e22ce44',
      'editor.lineHighlightBackground': '#1e293b',
    },
  });

  monaco.languages.register({ id: 'mempalace-query' });

  monaco.languages.setMonarchTokensProvider('mempalace-query', {
    keywords: KEYWORDS,
    tokenizer: {
      root: [
        [/"[^"]*"/, 'string'],
        [/\d+/, 'number'],
        [/[=><]/, 'operator'],
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier',
          },
        }],
      ],
    },
  });

  monaco.languages.registerCompletionItemProvider('mempalace-query', {
    provideCompletionItems: (_model, position) => {
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };
      const suggestions = KEYWORDS.map(kw => ({
        label: kw,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: kw,
        range,
      }));
      return { suggestions };
    },
  });

  editor.value = monaco.editor.create(editorContainer.value, {
    value: props.modelValue || PLACEHOLDER,
    language: 'mempalace-query',
    theme: 'mempalace-dark',
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    fontSize: 13,
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    padding: { top: 8, bottom: 8 },
    renderLineHighlight: 'line',
    wordWrap: 'on',
    automaticLayout: true,
    tabSize: 2,
  });

  editor.value.onDidChangeModelContent(() => {
    emit('update:modelValue', editor.value!.getValue());
  });

  editor.value.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    emit('run');
  });
});

watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.getValue() !== val) {
    editor.value.setValue(val);
  }
});

onUnmounted(() => {
  editor.value?.dispose();
});
</script>
