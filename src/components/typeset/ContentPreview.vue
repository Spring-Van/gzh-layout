<template>
  <div class="space-y-6">
    <h1
      class="text-[22px] font-bold mb-3 leading-snug text-slate-900"
      id="preview-title"
    >
      {{ title || "标题加载中..." }}
    </h1>
    <div
      class="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium"
    >
      <span class="text-[#576b95]">{{ accountName }}</span>
    </div>

    <div id="preview-article">
      <template v-if="!hasContentBlocks">
        <!-- flow 模式 -->
        <template v-if="templateId === 'flow'">
          <div
            v-for="(img, idx) in images"
            :key="img.id"
            class="content-row w-full mb-3"
            :class="{ 'content-row--selected': selectedIndex === idx }"
            @click.stop="selectRow(idx)"
          >
            <img
              :src="getImageUrl(img.path)"
              :alt="img.name"
              class="w-full rounded-[4px] object-cover"
              loading="lazy"
              @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; }"
            />
          </div>
        </template>

        <!-- card 模式 -->
        <template v-else-if="templateId === 'card'">
          <div
            v-for="(img, idx) in images"
            :key="img.id"
            class="content-row w-full p-3.5 bg-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] rounded-[1.5rem] mb-6 border border-slate-100 flex flex-col items-center"
            :class="{ 'content-row--selected': selectedIndex === idx }"
            @click.stop="selectRow(idx)"
          >
            <img
              :src="getImageUrl(img.path)"
              :alt="img.name"
              class="w-full aspect-square rounded-[1rem] object-cover mb-3"
              loading="lazy"
              @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; }"
            />
            <span class="text-[10px] text-slate-300 font-mono tracking-wider italic">
              FIG. {{ String(idx + 1).padStart(2, "0") }}
            </span>
          </div>
        </template>

        <!-- 自定义模板：整体渲染保留原始间距，JS 查询行做选中 -->
        <template v-else-if="processedHtml">
          <div
            ref="templateContainerRef"
            class="template-container"
            @click="handleTemplateClick"
            v-html="processedHtml"
          ></div>
        </template>
      </template>

      <!-- contentBlocks 渲染 -->
      <template v-else>
        <div
          :style="Object.keys(containerStyleObj).length ? containerStyleObj : undefined"
          class="content-blocks-container"
        >
          <div
            v-for="(block, index) in contentBlocks"
            :key="block.id"
            class="content-row transition-all duration-200"
            :class="{
              'content-row--selected': selectedIndex === index,
            }"
            @click.stop="selectRow(index)"
          >
            <template v-if="block.type === 'image'">
              <div class="w-full mb-3">
                <img
                  v-if="block.imagePath"
                  :src="getImageUrl(block.imagePath)"
                  :alt="block.imageName || block.content"
                  class="w-full rounded-[4px] object-cover"
                  loading="lazy"
                  @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; }"
                />
              </div>
            </template>
            <template v-else-if="block.type === 'html'">
              <div
                v-html="block.html || block.content"
                class="editable-html"
                contenteditable="true"
                :data-block-index="index"
                @input="updateHtmlBlock(index, $event)"
                @compositionstart="onCompositionStart"
                @compositionend="onCompositionEnd"
              ></div>
            </template>
            <template v-else-if="block.type === 'text'">
              <div class="text-sm text-slate-700 leading-relaxed py-2">{{ block.content }}</div>
            </template>
            <template v-else-if="block.type === 'empty'">
              <div
                class="editable-empty min-h-[20px] px-2 py-1 cursor-text"
                :data-block-index="index"
                contenteditable="true"
                @input="updateEmptyBlock(index, $event)"
                @focus="focusEmptyBlock(index, $event)"
                @compositionstart="onCompositionStart"
                @compositionend="onCompositionEnd"
              >
              </div>
            </template>
          </div>
        </div>
      </template>

      <div v-if="isValidUrl" class="flex items-center pt-2">
        <a
          :href="sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-[#576b95] hover:underline"
          @click.prevent="openExternal(sourceUrl!)"
        >阅读原文</a>
      </div>
    </div>

    <div class="mt-2 mb-4 text-center text-slate-400 text-xs">
      — 预览到底部了 —
    </div>

    <!-- 悬浮工具栏 -->
    <Teleport to="body">
      <div
        v-if="selectedIndex !== null"
        ref="toolbarRef"
        class="fixed z-[100] flex flex-col gap-2 bg-white rounded-xl shadow-lg border border-slate-100 p-2 min-w-[64px]"
        :style="toolbarStyle"
      >
        <button
          class="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          @click="showStyleSelector = true"
        >
          <svg class="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span class="text-[10px] text-slate-600">插样式</span>
        </button>

        <button
          class="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          @click="insertEmptyLine"
        >
          <svg class="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
            <path d="M12 5v14"/>
          </svg>
          <span class="text-[10px] text-slate-600">插空行</span>
        </button>

        <div class="w-full h-px bg-slate-100"></div>

        <!-- 字对齐按钮：仅空行选中时显示 -->
        <div v-if="isCurrentBlockEmpty" class="relative">
          <button
            class="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-50 transition-colors w-full"
            :class="{ 'bg-emerald-50': showAlignMenu }"
            @click.stop="showAlignMenu = !showAlignMenu"
          >
            <svg class="w-5 h-5" :class="showAlignMenu ? 'text-emerald-500' : 'text-slate-600'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="15" y2="12"/>
              <line x1="3" y1="18" x2="18" y2="18"/>
            </svg>
            <span class="text-[10px]" :class="showAlignMenu ? 'text-emerald-600 font-medium' : 'text-slate-600'">字对齐</span>
          </button>

          <div
            v-if="showAlignMenu"
            class="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden min-w-[80px]"
          >
              <button
                v-for="option in alignOptions"
                :key="option.value"
                class="flex items-center gap-2 px-3 py-2.5 hover:bg-emerald-50 transition-colors w-full text-left"
                :class="{ 'bg-emerald-50 text-emerald-600 font-medium': currentAlign === option.value }"
                @click.stop="setAlignment(option.value as 'left' | 'center' | 'right')"
              >
                <component :is="'svg'" class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                  <template v-if="option.value === 'left'">
                    <line x1="2" y1="3" x2="14" y2="3"/><line x1="2" y1="8" x2="11" y2="8"/><line x1="2" y1="13" x2="14" y2="13"/>
                  </template>
                  <template v-else-if="option.value === 'center'">
                    <line x1="3" y1="3" x2="13" y2="3"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="3" y1="13" x2="13" y2="13"/>
                  </template>
                  <template v-else>
                    <line x1="2" y1="3" x2="14" y2="3"/><line x1="5" y1="8" x2="14" y2="8"/><line x1="2" y1="13" x2="14" y2="13"/>
                  </template>
                </component>
                <span class="text-xs">{{ option.label }}</span>
              </button>
            </div>
        </div>

        <button
          class="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          :disabled="selectedIndex === 0"
          :class="{ 'opacity-30 cursor-not-allowed': selectedIndex === 0 }"
          @click="moveBlockUp"
        >
          <svg class="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 19V5"/>
            <path d="M5 12l7-7 7 7"/>
          </svg>
          <span class="text-[10px] text-slate-600">上移动</span>
        </button>

        <button
          class="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          :disabled="selectedIndex === totalRowCount - 1"
          :class="{ 'opacity-30 cursor-not-allowed': selectedIndex === totalRowCount - 1 }"
          @click="moveBlockDown"
        >
          <svg class="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14"/>
            <path d="M19 12l-7 7-7-7"/>
          </svg>
          <span class="text-[10px] text-slate-600">下移动</span>
        </button>

        <div class="w-full h-px bg-slate-100"></div>

        <button
          class="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-red-50 transition-colors"
          @click="deleteSelectedBlock"
        >
          <svg class="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18"/>
            <path d="M6 6l12 12"/>
          </svg>
          <span class="text-[10px] text-red-500">删除</span>
        </button>
      </div>
    </Teleport>

    <!-- 样式模板选择器：左侧抽屉 -->
    <Teleport to="body">
      <div
        v-if="showStyleSelector"
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-start"
        @click.self="showStyleSelector = false"
      >
        <div
          class="bg-white h-full overflow-hidden flex flex-col shadow-2xl w-[453px]"
        >
            <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <div>
                <h3 class="font-bold text-slate-800">插入样式</h3>
                <p class="text-xs text-slate-400 mt-0.5">选择一个样式插入到选中行下方</p>
              </div>
              <button class="text-slate-400 hover:text-slate-600" @click="showStyleSelector = false">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-3" ref="templateListRef">
              <div
                v-for="template in visibleStyleTemplates"
                :key="template.id"
                :data-template-id="template.id"
                class="border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors group overflow-hidden"
                @click="insertStyleTemplate(template)"
              >
                <div class="p-3 flex items-center justify-between">
                  <div>
                    <div class="font-medium text-sm text-slate-800">{{ template.name }}</div>
                    <div class="text-xs text-slate-500 mt-0.5">{{ template.description }}</div>
                  </div>
                  <svg class="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
                <div class="px-3 pb-3">
                  <div class="p-3 bg-white rounded-lg border border-slate-100 max-h-[120px] overflow-hidden">
                    <div v-if="visibleTemplateIds.has(template.id)" v-html="template.html"></div>
                    <div v-else class="h-20 flex items-center justify-center text-slate-300 text-xs">预览加载中...</div>
                  </div>
                </div>
              </div>
              <div v-if="visibleTemplateCount < styleTemplates.length" class="text-center py-2">
                <span class="text-xs text-slate-400">加载中...</span>
              </div>
            </div>

            <div class="px-4 py-3 border-t border-slate-100 flex-shrink-0">
              <button
                class="w-full px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                @click="openStyleTemplateManager"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                管理样式
              </button>
            </div>
          </div>
        </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { ContentBlock, StyleTemplate } from '../../types';
import { useStyleTemplateStore } from '../../stores/styleTemplate';

interface Props {
  title?: string;
  subtitle?: string;
  accountName?: string;
  templateId?: string;
  images: Array<{ id: string; path: string; name: string }>;
  processedHtml?: string;
  sourceUrl?: string;
  getImageUrl: (path: string) => string;
  articleId?: string;
  storedContentBlocks?: ContentBlock[];
  storedContainerStyle?: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:block', index: number, block: ContentBlock): void;
  (e: 'open-style-manager'): void;
  (e: 'update:content-blocks', blocks: ContentBlock[], containerStyle: Record<string, string>): void;
}>();

const styleTemplateStore = useStyleTemplateStore();
const selectedIndex = ref<number | null>(null);
const showStyleSelector = ref(false);
const showAlignMenu = ref(false);
const contentBlocks = ref<ContentBlock[]>([]);
const toolbarRef = ref<HTMLElement | null>(null);
const toolbarStyle = ref<Record<string,string>>({});
const templateContainerRef = ref<HTMLElement | null>(null);
const containerStyleObj = ref<Record<string, string>>({});
const templateListRef = ref<HTMLElement | null>(null);
const isComposing = ref(false);
const lastArticleId = ref<string | null>(null);
let skipWatchReset = false;

const styleTemplates = computed(() => styleTemplateStore.allTemplates);
const visibleTemplateCount = ref(0);
const visibleTemplateIds = ref(new Set<string>());
let renderTimer: number | null = null;
let observer: IntersectionObserver | null = null;

function initObserver() {
  if (observer) {
    observer.disconnect();
  }
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('data-template-id');
        if (id) {
          visibleTemplateIds.value.add(id);
        }
      }
    });
  }, { threshold: 0.1 });
}

watch(showStyleSelector, (newVal) => {
  if (renderTimer) {
    cancelAnimationFrame(renderTimer);
    renderTimer = null;
  }
  if (newVal) {
    visibleTemplateCount.value = 0;
    visibleTemplateIds.value = new Set();
    initObserver();
    const templates = styleTemplates.value;
    const batchSize = 3;
    function renderBatch() {
      const nextCount = Math.min(visibleTemplateCount.value + batchSize, templates.length);
      visibleTemplateCount.value = nextCount;
      if (nextCount < templates.length) {
        renderTimer = requestAnimationFrame(renderBatch);
      }
    }
    renderTimer = requestAnimationFrame(renderBatch);
  } else {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }
});

const visibleStyleTemplates = computed(() => {
  return styleTemplates.value.slice(0, visibleTemplateCount.value);
});

watch(visibleStyleTemplates, async () => {
  await nextTick();
  const obs = observer;
  if (obs && templateListRef.value) {
    const items = templateListRef.value.querySelectorAll('[data-template-id]');
    items.forEach((item) => {
      obs.observe(item);
    });
  }
});

const hasContentBlocks = computed(() => contentBlocks.value.length > 0);

function onCompositionStart() {
  isComposing.value = true;
}

function onCompositionEnd(event: CompositionEvent) {
  isComposing.value = false;
  const target = event.target as HTMLElement;
  const index = parseInt(target.getAttribute('data-block-index') || '0');
  const block = contentBlocks.value[index];
  if (!block) return;
  if (block.type === 'html') {
    const blocks = [...contentBlocks.value];
    blocks[index] = { ...blocks[index], html: target.innerHTML, content: target.innerText };
    contentBlocks.value = blocks;
  } else if (block.type === 'empty') {
    const blocks = [...contentBlocks.value];
    blocks[index] = { ...blocks[index], content: target.innerText };
    contentBlocks.value = blocks;
  }
  emitContentBlocksUpdate();
}

function emitContentBlocksUpdate() {
  if (isComposing.value) return;
  emit('update:content-blocks', [...contentBlocks.value], { ...containerStyleObj.value });
}

const isCurrentBlockEmpty = computed(() => {
  if (selectedIndex.value === null || !hasContentBlocks.value) return false;
  return contentBlocks.value[selectedIndex.value]?.type === 'empty';
});

const currentAlign = computed(() => {
  if (!isCurrentBlockEmpty.value || selectedIndex.value === null) return 'left';
  return contentBlocks.value[selectedIndex.value]?.align || 'left';
});

const alignOptions = [
  { value: 'left', label: '靠左' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '靠右' },
];

const useTemplateRows = computed(() => {
  return props.templateId !== 'flow' && props.templateId !== 'card' && !!props.processedHtml;
});

const totalRowCount = computed(() => {
  if (hasContentBlocks.value) return contentBlocks.value.length;
  if (useTemplateRows.value) return getTemplateRowCount();
  if (props.templateId === 'flow' || props.templateId === 'card') return props.images.length;
  return 0;
});

const isValidUrl = computed(() => {
  if (!props.sourceUrl) return false;
  try {
    new URL(props.sourceUrl);
    return true;
  } catch {
    return false;
  }
});

/**
 * 获取模板渲染后 DOM 中的行元素数量
 */
function getTemplateRowCount(): number {
  if (!templateContainerRef.value) return 0;
  const container = templateContainerRef.value.firstElementChild;
  if (!container) return 0;
  return container.children.length;
}

/**
 * 点击模板区域时，判断点击了哪一行
 */
function handleTemplateClick(event: MouseEvent) {
  if (!templateContainerRef.value) return;
  const container = templateContainerRef.value.firstElementChild;
  if (!container) return;

  const target = event.target as HTMLElement;
  for (let i = 0; i < container.children.length; i++) {
    const row = container.children[i] as HTMLElement;
    if (row.contains(target) || row === target) {
      selectRow(i);
      updateTemplateRowStyles();
      return;
    }
  }
  deselect();
  updateTemplateRowStyles();
}

/**
 * 更新模板行的选中样式（直接操作 DOM）
 */
function updateTemplateRowStyles() {
  if (!templateContainerRef.value) return;
  const container = templateContainerRef.value.firstElementChild;
  if (!container) return;

  for (let i = 0; i < container.children.length; i++) {
    const row = container.children[i] as HTMLElement;
    if (i === selectedIndex.value) {
      row.style.outline = '2px dashed #34d399';
      row.style.outlineOffset = '2px';
      row.style.borderRadius = '8px';
    } else {
      row.style.outline = '';
      row.style.outlineOffset = '';
      row.style.borderRadius = '';
    }
  }
}

/**
 * 从 DOM 元素提取内联样式为对象
 */
function getStyleObject(el: HTMLElement): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < el.style.length; i++) {
    const key = el.style[i];
    if (key) {
      result[key] = el.style.getPropertyValue(key);
    }
  }
  return result;
}

/**
 * 清除模板容器中所有行的选中样式
 */
function clearTemplateRowOutlines() {
  if (!templateContainerRef.value) return;
  const container = templateContainerRef.value.firstElementChild;
  if (!container) return;
  for (let i = 0; i < container.children.length; i++) {
    const row = container.children[i] as HTMLElement;
    row.style.outline = '';
    row.style.outlineOffset = '';
    row.style.borderRadius = '';
  }
}

function buildContentBlocksFromTemplate(): ContentBlock[] {
  if (useTemplateRows.value && templateContainerRef.value) {
    const container = templateContainerRef.value.firstElementChild as HTMLElement | null;
    if (container) {
      clearTemplateRowOutlines();
      containerStyleObj.value = getStyleObject(container);
      return Array.from(container.children).map((child, i) => ({
        id: `tpl-row-${i}`,
        type: 'html' as const,
        content: `行${i + 1}`,
        html: (child as HTMLElement).outerHTML,
      }));
    }
  }
  containerStyleObj.value = {};
  if (props.templateId === 'flow' || props.templateId === 'card') {
    return props.images.map((img) => ({
      id: `img-${img.id}`,
      type: 'image' as const,
      content: img.name,
      imagePath: img.path,
      imageName: img.name,
    }));
  }
  return [];
}

function selectRow(index: number) {
  selectedIndex.value = index;
  showAlignMenu.value = false;
  updateToolbarPosition();
}

function deselect() {
  selectedIndex.value = null;
  showStyleSelector.value = false;
  showAlignMenu.value = false;
}

function insertEmptyLine() {
  if (selectedIndex.value === null) return;
  if (!hasContentBlocks.value) {
    contentBlocks.value = buildContentBlocksFromTemplate();
  }
  const newBlock: ContentBlock = {
    id: `empty-${Date.now()}`,
    type: 'empty',
    content: '',
    align: 'left',
  };
  const idx = selectedIndex.value + 1;
  contentBlocks.value.splice(idx, 0, newBlock);
  selectedIndex.value = idx;
  nextTick(() => {
    const el = document.querySelector(`[data-block-index="${idx}"]`) as HTMLElement;
    if (el) el.focus();
  });
  updateToolbarPosition();
  emitContentBlocksUpdate();
}

function insertStyleTemplate(template: StyleTemplate) {
  if (selectedIndex.value === null) return;
  if (!hasContentBlocks.value) {
    contentBlocks.value = buildContentBlocksFromTemplate();
  }
  const newBlock: ContentBlock = {
    id: `html-${Date.now()}`,
    type: 'html',
    content: template.name,
    html: template.html,
  };
  const idx = selectedIndex.value + 1;
  contentBlocks.value.splice(idx, 0, newBlock);
  showStyleSelector.value = false;
  selectedIndex.value = idx;
  updateToolbarPosition();
  emitContentBlocksUpdate();
}

function moveBlockUp() {
  if (selectedIndex.value === null || selectedIndex.value === 0) return;
  if (!hasContentBlocks.value) {
    contentBlocks.value = buildContentBlocksFromTemplate();
  }
  const from = selectedIndex.value;
  const to = from - 1;
  const blocks = contentBlocks.value;
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  selectedIndex.value = to;
  updateToolbarPosition();
  emitContentBlocksUpdate();
}

function moveBlockDown() {
  if (selectedIndex.value === null || selectedIndex.value >= totalRowCount.value - 1) return;
  if (!hasContentBlocks.value) {
    contentBlocks.value = buildContentBlocksFromTemplate();
  }
  const from = selectedIndex.value;
  const to = from + 1;
  const blocks = contentBlocks.value;
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  selectedIndex.value = to;
  updateToolbarPosition();
  emitContentBlocksUpdate();
}

function deleteSelectedBlock() {
  if (selectedIndex.value === null) return;
  if (!hasContentBlocks.value) {
    contentBlocks.value = buildContentBlocksFromTemplate();
  }
  contentBlocks.value.splice(selectedIndex.value, 1);
  selectedIndex.value = null;
  updateToolbarPosition();
  emitContentBlocksUpdate();
}

/**
 * 设置对齐方式：直接修改 DOM style 确保生效
 */
function setAlignment(align: 'left' | 'center' | 'right') {
  if (selectedIndex.value === null || !hasContentBlocks.value) return;

  const blocks = [...contentBlocks.value];
  blocks[selectedIndex.value] = { ...blocks[selectedIndex.value], align };
  contentBlocks.value = blocks;

  nextTick(() => {
    const el = document.querySelector(`[data-block-index="${selectedIndex.value}"]`) as HTMLElement;
    if (el) {
      el.style.textAlign = align;
    }
  });

  showAlignMenu.value = false;
  emitContentBlocksUpdate();
}

function updateEmptyBlock(index: number, event: Event) {
  if (isComposing.value) return;
  const target = event.target as HTMLElement;
  const blocks = [...contentBlocks.value];
  if (blocks[index]) {
    blocks[index] = { ...blocks[index], content: target.innerText };
    contentBlocks.value = blocks;
  }
  const block = contentBlocks.value[index];
  if (block?.align) {
    target.style.textAlign = block.align;
  }
  emitContentBlocksUpdate();
}

function focusEmptyBlock(index: number, event: Event) {
  const target = event.target as HTMLElement;
  if (!target.innerText.trim()) {
    target.setAttribute('data-placeholder', '点击输入内容...');
  }
  const block = contentBlocks.value[index];
  if (block?.align) {
    target.style.textAlign = block.align;
  }
}

function updateHtmlBlock(index: number, event: Event) {
  if (isComposing.value) return;
  const target = event.target as HTMLElement;
  const blocks = [...contentBlocks.value];
  if (blocks[index]) {
    blocks[index] = { ...blocks[index], html: target.innerHTML, content: target.innerText };
    contentBlocks.value = blocks;
  }
  emitContentBlocksUpdate();
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openStyleTemplateManager() {
  showStyleSelector.value = false;
  emit('open-style-manager');
}

function updateToolbarPosition() {
  const phoneEl = document.querySelector('.phone-mockup') as HTMLElement | null;
  if (!phoneEl) {
    toolbarStyle.value = { display: 'none' };
    return;
  }
  const rect = phoneEl.getBoundingClientRect();
  toolbarStyle.value = {
    left: `${rect.right + 10}px`,
    top: `${rect.top + rect.height * 0.25}px`,
  };
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (
    target.closest('.content-row') ||
    target.closest('.template-container') ||
    target.closest('.editable-empty') ||
    (toolbarRef.value && toolbarRef.value.contains(target))
  ) {
    return;
  }
  if (!target.closest('.content-row') && !target.closest('.template-container')) {
    deselect();
    updateTemplateRowStyles();
  }
}

watch(
  () => props.articleId,
  (newId) => {
    if (newId !== lastArticleId.value) {
      lastArticleId.value = newId || null;
      skipWatchReset = true;
      if (props.storedContentBlocks && props.storedContentBlocks.length > 0) {
        contentBlocks.value = props.storedContentBlocks.map(b => ({ ...b }));
        containerStyleObj.value = props.storedContainerStyle ? { ...props.storedContainerStyle } : {};
      } else {
        contentBlocks.value = [];
        containerStyleObj.value = {};
      }
      selectedIndex.value = null;
      showAlignMenu.value = false;
      setTimeout(() => { skipWatchReset = false; }, 0);
    }
  },
  { immediate: true },
);

watch(
  () => [props.processedHtml, props.templateId, props.images],
  () => {
    if (skipWatchReset) return;
    if (hasContentBlocks.value) return;
    contentBlocks.value = [];
    containerStyleObj.value = {};
    selectedIndex.value = null;
    showAlignMenu.value = false;
  },
);

watch(selectedIndex, () => {
  if (useTemplateRows.value && !hasContentBlocks.value) {
    updateTemplateRowStyles();
  }
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('scroll', updateToolbarPosition, true);
  window.addEventListener('resize', updateToolbarPosition);
});

onUnmounted(() => {
  if (renderTimer) {
    cancelAnimationFrame(renderTimer);
    renderTimer = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', updateToolbarPosition, true);
  window.removeEventListener('resize', updateToolbarPosition);
});
</script>

<style scoped>
.content-row {
  cursor: pointer;
}

.content-row--selected {
  outline: 2px dashed #34d399;
  outline-offset: 2px;
  border-radius: 8px;
}

.content-row:hover:not(.content-row--selected) {
  outline: 1px dashed #e2e8f0;
  outline-offset: 2px;
  border-radius: 8px;
}

.template-container {
  cursor: pointer;
}

.template-container > :deep(*) > :deep(*:hover:not([style*="outline"])) {
  outline: 1px dashed #e2e8f0;
  outline-offset: 2px;
  border-radius: 8px;
}

.editable-empty {
  color: #1e293b;
  font-size: 14px;
  line-height: 1.6;
  display: block;
}

.editable-html {
  cursor: text;
  outline: none;
}

.editable-html:focus {
  outline: none;
}

.editable-empty:empty::before {
  content: attr(data-placeholder);
  color: #94a3b8;
  font-size: 12px;
}

.editable-empty:focus {
  outline: none;
}
</style>