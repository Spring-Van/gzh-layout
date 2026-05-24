<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="w-1.5 h-4 bg-primary rounded-full"></span>
      <label class="text-sm font-bold text-slate-800">当前文章排版</label>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
        <label class="text-xs font-medium text-slate-600">继承全局排版</label>
        <button
          :class="[
            'w-11 h-6 rounded-full transition-colors relative',
            localConfig.inheritGlobal ? 'bg-primary' : 'bg-slate-300',
          ]"
          @click="toggleInherit"
        >
          <span
            :class="[
              'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
              localConfig.inheritGlobal ? 'left-6' : 'left-1',
            ]"
          ></span>
        </button>
      </div>

      <template v-if="!localConfig.inheritGlobal">
        <div>
          <label class="text-xs font-medium text-slate-500 block mb-1">排版模板</label>
          <div
            class="border-2 border-slate-200 rounded-xl p-3 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition"
            @click="showSelector = true"
          >
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-bold text-slate-700">{{ currentTemplateName }}</p>
                <p class="text-xs text-slate-400">{{ currentTemplateDescription }}</p>
              </div>
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label class="text-xs font-medium text-slate-500 block mb-1">图片顺序</label>
          <div class="grid grid-cols-4 gap-2">
            <div
              v-for="img in images.slice(0, 4)"
              :key="img.id"
              class="aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer hover:ring-2 hover:ring-primary/30 transition"
              @click="$emit('open-image-manager')"
            >
              <img
                :src="getImageUrl(img.path)"
                :alt="img.name"
                class="w-full h-full object-cover"
                @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; }"
              />
            </div>
            <div
              v-if="images.length > 4"
              class="aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer hover:ring-2 hover:ring-primary/30 transition flex items-center justify-center"
              @click="$emit('open-image-manager')"
            >
              <span class="text-xs text-slate-500 font-medium">+{{ images.length - 4 }}</span>
            </div>
          </div>
          <button
            class="mt-2 w-full border border-slate-200 rounded-lg p-2 text-center text-sm text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-2"
            @click="$emit('open-image-manager')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            管理图片素材
          </button>
        </div>

        <div class="border-t border-slate-200 pt-3">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-1 h-3 bg-slate-400 rounded-full"></span>
            <label class="text-xs font-bold text-slate-700">样式插入</label>
          </div>

          <div
            v-for="position in positions"
            :key="position.value"
            class="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-2"
          >
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-medium text-slate-600">{{ position.label }}</label>
              <button
                :class="[
                  'w-11 h-6 rounded-full transition-colors relative',
                  styleInsertConfig[position.value].enabled ? 'bg-primary' : 'bg-slate-300',
                ]"
                @click="toggleStyleEnabled(position.value)"
              >
                <span
                  :class="[
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                    styleInsertConfig[position.value].enabled ? 'left-6' : 'left-1',
                  ]"
                ></span>
              </button>
            </div>

            <div
              v-if="styleInsertConfig[position.value].enabled"
              class="flex items-center gap-2 cursor-pointer"
              @click="openStyleDrawer(position.value)"
            >
              <div class="flex-1">
                <p class="text-xs text-slate-500">
                  已选择 {{ styleInsertConfig[position.value].templateIds.length }} 个样式
                </p>
              </div>
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
        </div>
      </template>

      <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <p class="text-xs text-blue-600">
          {{ localConfig.inheritGlobal ? '当前生效：来自全局' : '当前生效：已覆盖' }}
        </p>
      </div>
    </div>

    <ModalTemplateSelector
      :visible="showSelector"
      :current-template-id="localConfig.templateId || ''"
      @close="showSelector = false"
      @select="updateTemplate"
      @open-template="openTemplateManager"
    />

    <StyleTemplateDrawer
      :visible="showStyleDrawer"
      :initial-selected-ids="currentDrawerSelectedIds"
      @close="showStyleDrawer = false"
      @confirm="handleStyleConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useTemplateStore } from "../../stores/template";
import ModalTemplateSelector from "../layout/ModalTemplateSelector.vue";
import StyleTemplateDrawer from "./StyleTemplateDrawer.vue";
import type { ArticleLayoutConfig, ArticleStyleInsertConfig, StyleInsertPosition } from "../../types";

interface ImageItem {
  id: string;
  path: string;
  name: string;
}

interface Props {
  config: ArticleLayoutConfig;
  styleInsertConfig: ArticleStyleInsertConfig;
  images: ImageItem[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:config": [config: ArticleLayoutConfig];
  "update:styleInsertConfig": [config: ArticleStyleInsertConfig];
  "open-image-manager": [];
  "open-template-manager": [];
}>();

const templateStore = useTemplateStore();
const showSelector = ref(false);
const showStyleDrawer = ref(false);
const currentEditPosition = ref<StyleInsertPosition>('header');

const positions = [
  { value: 'header' as StyleInsertPosition, label: '文章头部' },
  { value: 'between' as StyleInsertPosition, label: '段落之间' },
  { value: 'footer' as StyleInsertPosition, label: '文章底部' },
];

function openTemplateManager() {
  emit("open-template-manager");
}

const localConfig = computed({
  get: () => props.config,
  set: (val) => emit("update:config", val),
});

const currentDrawerSelectedIds = computed(() => {
  return props.styleInsertConfig[currentEditPosition.value].templateIds;
});

const currentTemplateName = computed(() => {
  if (!props.config.templateId) return "请选择模板";
  const custom = templateStore.customTemplates.find(
    (t) => t.id === props.config.templateId,
  );
  return custom?.name || "未知模板";
});

const currentTemplateDescription = computed(() => {
  if (!props.config.templateId) return "点击选择模板";
  const custom = templateStore.customTemplates.find(
    (t) => t.id === props.config.templateId,
  );
  return custom?.description || "自定义排版模板";
});

function getImageUrl(filePath: string): string {
  return `file://${filePath.replace(/\\/g, "/")}`;
}

function toggleInherit() {
  emit("update:config", {
    ...props.config,
    inheritGlobal: !props.config.inheritGlobal,
  });
}

function updateTemplate(templateId: string) {
  emit("update:config", { ...props.config, templateId });
}

function toggleStyleEnabled(position: StyleInsertPosition) {
  const newConfig = { ...props.styleInsertConfig };
  newConfig[position] = {
    ...newConfig[position],
    enabled: !newConfig[position].enabled,
  };
  emit("update:styleInsertConfig", newConfig);
}

function openStyleDrawer(position: StyleInsertPosition) {
  currentEditPosition.value = position;
  showStyleDrawer.value = true;
}

function handleStyleConfirm(selectedIds: string[]) {
  const newConfig = { ...props.styleInsertConfig };
  newConfig[currentEditPosition.value] = {
    ...newConfig[currentEditPosition.value],
    templateIds: selectedIds,
  };
  emit("update:styleInsertConfig", newConfig);
}
</script>
