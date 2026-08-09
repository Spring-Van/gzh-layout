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
              decoding="async"
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
              decoding="async"
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
            class="content-row transition-[outline-color,outline-width,outline-offset,border-radius] duration-200"
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
                  decoding="async"
                  @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; }"
                />
              </div>
            </template>
            <template v-else-if="block.type === 'html'">
              <div
                :ref="(el) => initHtmlBlockRef(el as HTMLElement | null, block.id, block.html || '')"
                class="editable-html"
                contenteditable="true"
                :data-block-index="index"
                :data-block-id="block.id"
                @input="updateHtmlBlock(index, $event)"
                @focus="handleHtmlBlockFocus(index)"
                @blur="handleHtmlBlockBlur(index, $event)"
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
                @blur="handleEmptyBlockBlur(index, $event)"
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
          @click="openStyleSelector"
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
                v-for="template in styleTemplates"
                :key="template.id"
                :data-template-id="template.id"
                class="border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors group overflow-hidden"
                @click="insertStyleTemplate(template)"
                @dblclick.stop="editStyleTemplate(template)"
                title="单击插入正文，双击编辑样式"
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
import { ref, computed, watch, onMounted, onBeforeUnmount, onUnmounted, nextTick } from 'vue';
import type { ContentBlock, StyleTemplate, GlobalStyleInsertConfig } from '../../types';
import { useStyleTemplateStore } from '../../stores/styleTemplate';
import { useBatchTypesetStore } from '../../stores/batchTypeset';

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
  styleInsertConfig?: GlobalStyleInsertConfig | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:block', index: number, block: ContentBlock): void;
  (e: 'open-style-manager'): void;
  (e: 'edit-style-template', templateId: string): void;
  (e: 'update:content-blocks', blocks: ContentBlock[], containerStyle: Record<string, string>): void;
}>();

const styleTemplateStore = useStyleTemplateStore();
const batchTypesetStore = useBatchTypesetStore();
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
const htmlBlockInitialized = new Set<string>();
let skipWatchReset = false;
/** 模板行覆盖：key=行索引，value=该行被编辑后的 outerHTML */
const rowOverrides = new Map<number, string>();
/** 当前正在编辑的模板行元素（直接 DOM 引用，避免依赖 v-html 字符串） */
const editingRowEl = ref<HTMLElement | null>(null);
/** 样式模板插入节流：记录上次插入的模板 id 及时间，避免双击重复插入 */
let lastInsertTemplateId = '';
let lastInsertTime = 0;
/** 唯一块 ID 生成计数器（避免 Date.now() 毫秒相同导致 :key 冲突） */
let blockIdCounter = 0;

const styleTemplates = computed(() => styleTemplateStore.allTemplates);
const visibleTemplateIds = ref(new Set<string>());
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
          visibleTemplateIds.value = new Set([...visibleTemplateIds.value, id]);
        }
      }
    });
  }, { threshold: 0.1 });
}

watch(showStyleSelector, (newVal) => {
  if (newVal) {
    visibleTemplateIds.value = new Set();
    initObserver();
    nextTick(() => {
      if (observer && templateListRef.value) {
        const items = templateListRef.value.querySelectorAll('[data-template-id]');
        items.forEach((item) => observer!.observe(item));
      }
    });
  } else {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
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
  if (props.articleId) {
    batchTypesetStore.updateArticleContentBlocks(props.articleId, [...contentBlocks.value], { ...containerStyleObj.value });
  }
  emitContentBlocksUpdate();
}

function initHtmlBlockRef(el: HTMLElement | null, blockId: string, html: string) {
  if (el && !htmlBlockInitialized.has(blockId)) {
    el.innerHTML = html;
    htmlBlockInitialized.add(blockId);
  }
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
 * 获取模板行所在的容器。
 * - 单顶层元素且有子元素：行是该顶层元素的子元素（保持原行为，可逐个选中子节点）
 * - 多顶层元素（或顶层元素无子元素）：行是 template-container 的直接子元素（修复多顶层无法选中的问题）
 */
function getTemplateRowsContainer(): HTMLElement | null {
  if (!templateContainerRef.value) return null;
  const wrapper = templateContainerRef.value;
  const firstTopLevel = wrapper.firstElementChild as HTMLElement | null;
  if (!firstTopLevel) return null;
  if (wrapper.children.length === 1 && firstTopLevel.children.length > 0) {
    return firstTopLevel;
  }
  return wrapper;
}

/**
 * 获取模板行元素数量
 */
function getTemplateRowCount(): number {
  const rowsContainer = getTemplateRowsContainer();
  if (!rowsContainer) return 0;
  return rowsContainer.children.length;
}

/**
 * 点击模板区域时，判断点击了哪一行
 */
function handleTemplateClick(event: MouseEvent) {
  const rowsContainer = getTemplateRowsContainer();
  if (!rowsContainer) return;

  // 先提交正在编辑的行
  flushEditingRow();

  const target = event.target as HTMLElement;
  // 向上查找最近的"行元素"：行容器的直接子节点
  let row: HTMLElement | null = target;
  while (row && row.parentElement !== rowsContainer) {
    row = row.parentElement as HTMLElement | null;
  }
  if (!row) {
    deselect();
    updateTemplateRowStyles();
    return;
  }

  const rows = Array.from(rowsContainer.children) as HTMLElement[];
  const idx = rows.indexOf(row);
  if (idx === -1) {
    deselect();
    updateTemplateRowStyles();
    return;
  }
  selectRow(idx);
  updateTemplateRowStyles();

  // 让选中的行可编辑
  nextTick(() => {
    enableRowEditing(row as HTMLElement);
  });
}

/**
 * 将当前编辑中的行的修改保存到行覆盖映射
 * 不修改 v-html 的源字符串（processedHtml），避免 DOM 序列化往返丢失内容
 *
 * 关键：编辑模板行后，立即构建 contentBlocks 并 emit 给父组件持久化。
 * 否则组件卸载（切换 tab/返回）后 rowOverrides（内存 Map）丢失，编辑内容无法恢复。
 * 构建后渲染会从 v-html 切换到 contentBlocks 模式，两套样式已对齐，不会丢失行高/margin。
 */
function flushEditingRow() {
  if (!editingRowEl.value) return;
  const rowsContainer = getTemplateRowsContainer();
  if (!rowsContainer) return;
  const rows = Array.from(rowsContainer.children) as HTMLElement[];
  const idx = rows.indexOf(editingRowEl.value);
  if (idx === -1) return;
  // 退出编辑态
  editingRowEl.value.removeAttribute('contenteditable');
  editingRowEl.value.classList.remove('template-row--editing');
  // 记录该行的最终 outerHTML，覆盖原模板行
  const newRowHtml = editingRowEl.value.outerHTML;
  rowOverrides.set(idx, newRowHtml);
  editingRowEl.value = null;

  // 立即构建 contentBlocks 并 emit，确保持久化
  // 此时 DOM 仍是编辑后的内容，buildContentBlocksFromTemplate 能读到最新 outerHTML
  if (useTemplateRows.value && !hasContentBlocks.value) {
    const blocks = buildContentBlocksFromTemplate();
    if (blocks.length > 0) {
      contentBlocks.value = blocks;
      emitContentBlocksUpdate();
    }
  }
}

/**
 * 让指定行进入编辑态
 */
function enableRowEditing(row: HTMLElement) {
  // 取消其他行的编辑态
  if (editingRowEl.value && editingRowEl.value !== row) {
    flushEditingRow();
  }
  row.setAttribute('contenteditable', 'true');
  row.classList.add('template-row--editing');
  // 阻止 click 事件冒泡触发再次 selectRow 导致光标丢失
  row.addEventListener('click', (e) => e.stopPropagation(), { once: true });
  editingRowEl.value = row;
  // 仅聚焦，不选中全部（避免替换误删）
  row.focus();
}

/**
 * 更新模板行的选中样式（直接操作 DOM）
 */
function updateTemplateRowStyles() {
  const rowsContainer = getTemplateRowsContainer();
  if (!rowsContainer) return;

  const rows = Array.from(rowsContainer.children) as HTMLElement[];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
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
  const rowsContainer = getTemplateRowsContainer();
  if (!rowsContainer) return;
  const rows = Array.from(rowsContainer.children) as HTMLElement[];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    row.style.outline = '';
    row.style.outlineOffset = '';
    row.style.borderRadius = '';
  }
}

function buildContentBlocksFromTemplate(): ContentBlock[] {
  if (useTemplateRows.value && templateContainerRef.value) {
    const wrapper = templateContainerRef.value;
    const firstTopLevel = wrapper.firstElementChild as HTMLElement | null;
    if (firstTopLevel) {
      clearTemplateRowOutlines();
      // 单顶层且有子元素时，行容器的内联样式来自该顶层元素；否则（多顶层/无子元素）来自 wrapper
      const rowsContainer =
        wrapper.children.length === 1 && firstTopLevel.children.length > 0
          ? firstTopLevel
          : wrapper;
      containerStyleObj.value = getStyleObject(rowsContainer);
      return Array.from(rowsContainer.children).map((child, i) => ({
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

// 样式块ID前缀，用于识别自动生成的样式块
const STYLE_BLOCK_PREFIX = 'style-insert-';

function isStyleBlock(block: ContentBlock): boolean {
  return !!block.styleInsertPosition;
}

function isHeaderStyleBlock(block: ContentBlock): boolean {
  return block.styleInsertPosition === 'header';
}

function isBetweenStyleBlock(block: ContentBlock): boolean {
  return block.styleInsertPosition === 'between';
}

function isFooterStyleBlock(block: ContentBlock): boolean {
  return block.styleInsertPosition === 'footer';
}

/**
 * 生成指定位置的样式ContentBlock数组
 */
function generateStyleBlocks(position: 'header' | 'between' | 'footer'): ContentBlock[] {
  const config = props.styleInsertConfig;
  if (!config || !config[position].enabled || config[position].templateIds.length === 0) {
    return [];
  }
  
  // 去重，防止重复插入同一个样式
  const uniqueTemplateIds = [...new Set(config[position].templateIds)];
  
  const blocks: ContentBlock[] = [];
  uniqueTemplateIds.forEach((templateId, index) => {
    const template = styleTemplateStore.getTemplateById(templateId);
    if (template) {
      blocks.push({
        id: `${STYLE_BLOCK_PREFIX}${position}-${templateId}-${index}`,
        type: 'html',
        content: template.name,
        html: template.html,
        styleInsertPosition: position,
      });
    }
  });
  return blocks;
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

  // 防双击重复插入：500ms 内同一模板 id 视为重复
  const now = Date.now();
  if (template.id === lastInsertTemplateId && now - lastInsertTime < 500) {
    return;
  }
  lastInsertTemplateId = template.id;
  lastInsertTime = now;

  if (!hasContentBlocks.value) {
    contentBlocks.value = buildContentBlocksFromTemplate();
  }
  const newBlock: ContentBlock = {
    id: `html-${++blockIdCounter}`,
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

/**
 * 双击样式模板卡片：进入"编辑样式模板"（不插入到正文）
 */
function editStyleTemplate(template: StyleTemplate) {
  showStyleSelector.value = false;
  // 重置节流，避免单击插入后的双击被忽略
  lastInsertTemplateId = '';
  lastInsertTime = 0;
  emit('edit-style-template', template.id);
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
    // 标记本次变更是由用户编辑此块引起，watch 中跳过对其他块的反向覆盖
    userEditedBlockId = blocks[index].id;
    blocks[index] = { ...blocks[index], content: target.innerText };
    contentBlocks.value = blocks;
  }
  const block = contentBlocks.value[index];
  if (block?.align) {
    target.style.textAlign = block.align;
  }
  
  if (props.articleId) {
    batchTypesetStore.updateArticleContentBlocks(props.articleId, [...contentBlocks.value], { ...containerStyleObj.value });
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

/**
 * empty 块失焦时强制同步 DOM 内容到 contentBlocks
 * 修复：拼音输入过程中或刚输入完就点击"同步至公众号"时，content 可能未及时同步
 */
function handleEmptyBlockBlur(index: number, event: Event) {
  // compositionend 应在 blur 前触发，但为保险，强制读取 DOM
  const target = event.target as HTMLElement;
  const block = contentBlocks.value[index];
  if (!block) return;
  const newContent = target.innerText;
  if (newContent !== (block.content || '')) {
    const blocks = [...contentBlocks.value];
    blocks[index] = { ...blocks[index], content: newContent };
    contentBlocks.value = blocks;
    if (props.articleId) {
      batchTypesetStore.updateArticleContentBlocks(props.articleId, [...contentBlocks.value], { ...containerStyleObj.value });
    }
    // 重置 isComposing（blur 时若仍为 true，强制复位避免后续 emit 被阻塞）
    if (isComposing.value) isComposing.value = false;
    emitContentBlocksUpdate();
  }
}

function updateHtmlBlock(index: number, event: Event) {
  if (isComposing.value) return;
  const target = event.target as HTMLElement;
  const blocks = [...contentBlocks.value];
  if (blocks[index]) {
    // 标记本次变更是由用户编辑此块引起，watch 中跳过对其他块的反向覆盖
    userEditedBlockId = blocks[index].id;
    blocks[index] = { ...blocks[index], html: target.innerHTML, content: target.innerText };
    contentBlocks.value = blocks;
  }
  emitContentBlocksUpdate();
}

const editingBlockId = ref<string | null>(null);

function handleHtmlBlockFocus(index: number) {
  const block = contentBlocks.value[index];
  if (block) {
    editingBlockId.value = block.id;
  }
}

function handleHtmlBlockBlur(index: number, event: Event) {
  const target = event.target as HTMLElement;
  const block = contentBlocks.value[index];
  if (!block) return;

  const newHtml = target.innerHTML;
  if (newHtml !== block.html) {
    const blocks = [...contentBlocks.value];
    blocks[index] = { ...blocks[index], html: newHtml, content: target.innerText };
    contentBlocks.value = blocks;
    
    if (props.articleId) {
      batchTypesetStore.updateArticleContentBlocks(props.articleId, [...contentBlocks.value], { ...containerStyleObj.value });
    }
    emitContentBlocksUpdate();
  }
  editingBlockId.value = null;
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openStyleSelector() {
  // 打开样式面板前，先提交模板行编辑（避免 DOM 内容未持久化到 editableHtml）
  flushEditingRow();
  showStyleSelector.value = true;
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
  // 点击区域外，提交编辑中的行
  flushEditingRow();
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
      htmlBlockInitialized.clear();
      rowOverrides.clear();
      editingRowEl.value = null;
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

// 监听storedContentBlocks变化，同步到本地contentBlocks
// 浅监听：父组件替换数组引用时触发，避免 deep 递归遍历含 html 长字符串的每个 block
watch(
  () => props.storedContentBlocks,
  (newBlocks) => {
    // 父组件清空了内容块（如切换模板时），本地也清空以重新渲染模板
    if (!newBlocks || newBlocks.length === 0) {
      if (!editingBlockId.value && contentBlocks.value.length > 0) {
        contentBlocks.value = [];
        containerStyleObj.value = {};
        selectedIndex.value = null;
        htmlBlockInitialized.clear();
      }
      return;
    }
    // 如果正在编辑，不更新
    if (editingBlockId.value) return;
    // 内容相同则跳过，避免保存后回传触发不必要的重渲染和 DOM 操作导致卡顿
    if (newBlocks.length === contentBlocks.value.length) {
      let same = true;
      for (let i = 0; i < newBlocks.length; i++) {
        if (newBlocks[i].id !== contentBlocks.value[i].id ||
            newBlocks[i].html !== contentBlocks.value[i].html ||
            newBlocks[i].content !== contentBlocks.value[i].content) {
          same = false;
          break;
        }
      }
      if (same) return;
    }
    // 同步外部传入的contentBlocks（包括样式块）
    contentBlocks.value = newBlocks.map(b => ({ ...b }));
    if (props.storedContainerStyle) {
      containerStyleObj.value = { ...props.storedContainerStyle };
    }
    nextTick(() => {
      syncHtmlBlocksToDom();
    });
  },
);

// 记录上一次的样式配置，用于检测哪个位置变化了
const lastHeaderConfig = ref('');
const lastBetweenConfig = ref('');
const lastFooterConfig = ref('');

// 用序列化 key 代替 deep watch，避免递归遍历 styleInsertConfig
const styleConfigKey = computed(() => {
  const c = props.styleInsertConfig;
  if (!c) return '';
  return JSON.stringify({
    h: { e: c.header.enabled, i: c.header.templateIds },
    b: { e: c.between.enabled, i: c.between.templateIds },
    f: { e: c.footer.enabled, i: c.footer.templateIds },
  });
});

/**
 * 同步指定位置的样式到contentBlocks
 * 三个位置独立处理，互不影响
 * @returns 是否同步成功
 */
function syncStylePosition(position: 'header' | 'between' | 'footer'): boolean {
  const config = props.styleInsertConfig;
  if (!config) return false;
  
  const isEnabled = config[position].enabled && config[position].templateIds.length > 0;
  
  // 移除该位置的旧样式块
  let blocks = contentBlocks.value.filter(block => {
    if (position === 'header') return !isHeaderStyleBlock(block);
    if (position === 'between') return !isBetweenStyleBlock(block);
    if (position === 'footer') return !isFooterStyleBlock(block);
    return true;
  });
  
  // 如果该位置未启用，只移除旧块
  if (!isEnabled) {
    contentBlocks.value = blocks;
    emitContentBlocksUpdate();
    return true;
  }
  
  // 生成新的样式块
  const newStyleBlocks = generateStyleBlocks(position);
  if (newStyleBlocks.length === 0) return true;
  
  // 如果没有内容块，先从模板构建
  const nonStyleBlocks = blocks.filter(block => !isStyleBlock(block));
  if (nonStyleBlocks.length === 0) {
    blocks = buildContentBlocksFromTemplate();
    if (blocks.length === 0) return false; // 模板未渲染，同步失败
  }
  
  // 根据位置插入样式块
  const result: ContentBlock[] = [];
  
  if (position === 'header') {
    // 头部：插入到最前面
    result.push(...newStyleBlocks, ...blocks);
  } else if (position === 'footer') {
    // 底部：插入到最后面
    result.push(...blocks, ...newStyleBlocks);
  } else {
    // 段落之间：在内容块之间插入，保持原有顺序
    for (let i = 0; i < blocks.length; i++) {
      result.push(blocks[i]);
      // 在两个非样式块之间插入段落样式
      if (!isStyleBlock(blocks[i]) && i < blocks.length - 1) {
        if (!isStyleBlock(blocks[i + 1])) {
          result.push(...newStyleBlocks);
        }
      }
    }
  }
  
  contentBlocks.value = result;
  emitContentBlocksUpdate();
  return true;
}

// 监听样式配置变化，自动同步到contentBlocks（三个位置独立处理）
// 用序列化 key 浅监听代替 deep watch，避免递归遍历
watch(
  styleConfigKey,
  () => {
    const newConfig = props.styleInsertConfig;
    if (editingBlockId.value || !newConfig) return;

    // 序列化各位置的配置，检测变化
    const headerKey = JSON.stringify({ enabled: newConfig.header.enabled, ids: newConfig.header.templateIds });
    const betweenKey = JSON.stringify({ enabled: newConfig.between.enabled, ids: newConfig.between.templateIds });
    const footerKey = JSON.stringify({ enabled: newConfig.footer.enabled, ids: newConfig.footer.templateIds });

    // 首次初始化：记录当前配置快照，不触发任何同步操作
    if (lastHeaderConfig.value === '' && lastBetweenConfig.value === '' && lastFooterConfig.value === '') {
      lastHeaderConfig.value = headerKey;
      lastBetweenConfig.value = betweenKey;
      lastFooterConfig.value = footerKey;
      return;
    }

    const headerChanged = headerKey !== lastHeaderConfig.value;
    const betweenChanged = betweenKey !== lastBetweenConfig.value;
    const footerChanged = footerKey !== lastFooterConfig.value;

    // 没有变化则跳过
    if (!headerChanged && !betweenChanged && !footerChanged) return;

    // 确保有内容块
    const nonStyleBlocks = contentBlocks.value.filter(block => !isStyleBlock(block));
    if (nonStyleBlocks.length === 0) {
      const templateBlocks = buildContentBlocksFromTemplate();
      if (templateBlocks.length > 0) {
        contentBlocks.value = templateBlocks;
      }
    }

    // 只同步变化的位置，根据结果更新记录
    let headerSuccess = true;
    let betweenSuccess = true;
    let footerSuccess = true;

    if (headerChanged) headerSuccess = syncStylePosition('header');
    if (betweenChanged) betweenSuccess = syncStylePosition('between');
    if (footerChanged) footerSuccess = syncStylePosition('footer');

    // 只有同步成功才更新记录，失败的下次会重试
    if (headerChanged && headerSuccess) lastHeaderConfig.value = headerKey;
    if (betweenChanged && betweenSuccess) lastBetweenConfig.value = betweenKey;
    if (footerChanged && footerSuccess) lastFooterConfig.value = footerKey;
  },
);

watch(
  () => [props.processedHtml, props.templateId, props.images],
  () => {
    if (skipWatchReset) return;
    if (hasContentBlocks.value) {
      // 已有内容块时，如果有未成功的样式同步，尝试重新同步
      const config = props.styleInsertConfig;
      if (config) {
        const nonStyleBlocks = contentBlocks.value.filter(block => !isStyleBlock(block));
        if (nonStyleBlocks.length > 0) {
          const headerKey = JSON.stringify({ enabled: config.header.enabled, ids: config.header.templateIds });
          const betweenKey = JSON.stringify({ enabled: config.between.enabled, ids: config.between.templateIds });
          const footerKey = JSON.stringify({ enabled: config.footer.enabled, ids: config.footer.templateIds });
          
          if (headerKey !== lastHeaderConfig.value) syncStylePosition('header');
          if (betweenKey !== lastBetweenConfig.value) syncStylePosition('between');
          if (footerKey !== lastFooterConfig.value) syncStylePosition('footer');
        }
      }
      return;
    }
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

// 模板 HTML 变化或挂载后：应用行覆盖到 DOM，避免任何字符串往返导致的丢内容
function applyRowOverrides() {
  const rowsContainer = getTemplateRowsContainer();
  if (!rowsContainer) return;
  const rows = Array.from(rowsContainer.children) as HTMLElement[];
  rowOverrides.forEach((rowHtml, idx) => {
    if (idx >= 0 && idx < rows.length) {
      const tmp = document.createElement('div');
      tmp.innerHTML = rowHtml;
      const newRow = tmp.firstElementChild;
      if (newRow && rows[idx] !== newRow) {
        rows[idx].replaceWith(newRow);
      }
    }
  });
  // 重新应用选中/编辑样式
  updateTemplateRowStyles();
}

// 模板 HTML 变化时清空旧覆盖（避免索引错位）；编辑态也清掉
watch(
  () => props.processedHtml,
  () => {
    rowOverrides.clear();
    editingRowEl.value = null;
  },
);

// 模板 HTML 变化或初次挂载后，异步把行覆盖贴回 DOM
watch(
  () => props.processedHtml,
  () => {
    nextTick(() => applyRowOverrides());
  },
  { immediate: true },
);

/**
 * 标记本次 contentBlocks 变更是否由用户编辑触发
 * 由用户编辑触发的变更不应反向覆盖用户已编辑的其他块
 */
let userEditedBlockId: string | null = null;

// 浅监听 contentBlocks：数组引用变化（替换/增删项）时触发 DOM 同步
// 避免 deep 递归遍历每个 block 的 html 长字符串
watch(
  () => contentBlocks.value,
  (newBlocks) => {
    nextTick(() => {
      newBlocks.forEach((block) => {
        if (block.type === 'html' && block.id !== editingBlockId.value) {
          // 若本次变更是用户编辑某个块导致的，跳过对其他块的 DOM 反向同步
          // 避免在用户没有 blur 的情况下把先前在别的块上的编辑覆盖掉
          if (userEditedBlockId && userEditedBlockId !== block.id) {
            return;
          }
          const el = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement;
          if (el && el.innerHTML !== (block.html || '')) {
            el.innerHTML = block.html || '';
          }
        }
      });
      // 用完即清，仅本轮生效
      userEditedBlockId = null;
    });
  },
);

watch(
  () => props.articleId,
  (newId, oldId) => {
    if (newId !== oldId) {
      if (editingBlockId.value) {
        const editingIndex = contentBlocks.value.findIndex(b => b.id === editingBlockId.value);
        if (editingIndex !== -1) {
          const el = document.querySelector(`[data-block-id="${editingBlockId.value}"]`) as HTMLElement;
          if (el) {
            const block = contentBlocks.value[editingIndex];
            const newHtml = el.innerHTML;
            if (newHtml !== block.html) {
              const blocks = [...contentBlocks.value];
              blocks[editingIndex] = { ...blocks[editingIndex], html: newHtml, content: el.innerText };
              contentBlocks.value = blocks;
              
              if (oldId) {
                batchTypesetStore.updateArticleContentBlocks(oldId, [...contentBlocks.value], { ...containerStyleObj.value });
              }
            }
          }
        }
        editingBlockId.value = null;
      }
    }
  }
);

// 组件卸载前强制提交所有未持久化的编辑（模板行/空行/html块）
// 确保用户点击"返回"等离开页面操作时，编辑内容能同步到父组件并持久化
onBeforeUnmount(() => {
  // 重置输入法状态（用户可能在拼音输入中直接离开页面）
  isComposing.value = false;
  // 提交正在编辑的模板行到 rowOverrides，并同步到 contentBlocks
  flushEditingRow();
  // 提交正在编辑的 html 块（若有）
  if (editingBlockId.value) {
    const editingIndex = contentBlocks.value.findIndex(b => b.id === editingBlockId.value);
    if (editingIndex !== -1) {
      const el = document.querySelector(`[data-block-id="${editingBlockId.value}"]`) as HTMLElement;
      if (el) {
        const block = contentBlocks.value[editingIndex];
        const newHtml = el.innerHTML;
        if (newHtml !== (block.html || '')) {
          const blocks = [...contentBlocks.value];
          blocks[editingIndex] = { ...blocks[editingIndex], html: newHtml, content: el.innerText };
          contentBlocks.value = blocks;
        }
      }
    }
    editingBlockId.value = null;
  }
  // 最终统一 emit 一次，确保父组件拿到最新 contentBlocks
  emitContentBlocksUpdate();
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('scroll', updateToolbarPosition, true);
  window.addEventListener('resize', updateToolbarPosition);
  
  nextTick(() => {
    syncHtmlBlocksToDom();
  });
});

function syncHtmlBlocksToDom() {
  // 同步 DOM 仅在非编辑态下进行，避免覆盖用户正在编辑的块
  contentBlocks.value.forEach((block) => {
    if (block.type === 'html' && block.id !== editingBlockId.value) {
      const el = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement;
      if (el && el.innerHTML !== (block.html || '')) {
        el.innerHTML = block.html || '';
      }
    }
  });
}

onUnmounted(() => {
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
  all: initial;
  display: block;
  cursor: pointer;
}

.template-container :deep(p) {
  margin: 1em 0;
}
.template-container :deep(h1),
.template-container :deep(h2),
.template-container :deep(h3),
.template-container :deep(h4),
.template-container :deep(h5),
.template-container :deep(h6) {
  margin: 0.67em 0;
  font-weight: bold;
}
.template-container :deep(h1) { font-size: 2em; }
.template-container :deep(h2) { font-size: 1.5em; }
.template-container :deep(h3) { font-size: 1.17em; }
.template-container :deep(h4) { font-size: 1em; }
.template-container :deep(h5) { font-size: 0.83em; }
.template-container :deep(h6) { font-size: 0.67em; }
.template-container :deep(blockquote),
.template-container :deep(figure),
.template-container :deep(ul),
.template-container :deep(ol),
.template-container :deep(dl),
.template-container :deep(dd),
.template-container :deep(pre) {
  margin: 1em 0;
}

/* contentBlocks 渲染模式：与 template-container 保持一致的默认样式，避免切换模式后行高/margin 丢失 */
.content-blocks-container :deep(p) {
  margin: 1em 0;
}
.content-blocks-container :deep(h1),
.content-blocks-container :deep(h2),
.content-blocks-container :deep(h3),
.content-blocks-container :deep(h4),
.content-blocks-container :deep(h5),
.content-blocks-container :deep(h6) {
  margin: 0.67em 0;
  font-weight: bold;
}
.content-blocks-container :deep(h1) { font-size: 2em; }
.content-blocks-container :deep(h2) { font-size: 1.5em; }
.content-blocks-container :deep(h3) { font-size: 1.17em; }
.content-blocks-container :deep(h4) { font-size: 1em; }
.content-blocks-container :deep(h5) { font-size: 0.83em; }
.content-blocks-container :deep(h6) { font-size: 0.67em; }
.content-blocks-container :deep(blockquote),
.content-blocks-container :deep(figure),
.content-blocks-container :deep(ul),
.content-blocks-container :deep(ol),
.content-blocks-container :deep(dl),
.content-blocks-container :deep(dd),
.content-blocks-container :deep(pre) {
  margin: 1em 0;
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

.template-row--editing {
  outline: 2px dashed #34d399 !important;
  outline-offset: 2px;
  border-radius: 8px;
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
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