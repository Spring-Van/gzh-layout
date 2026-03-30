<template>
  <div
    class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity"
    :class="[visible ? 'opacity-100' : 'opacity-0 pointer-events-none']"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white w-full h-full overflow-hidden flex flex-col"
      :class="[visible ? 'scale-100' : 'scale-95']"
    >
      <!-- 头部 -->
      <div
        class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0"
      >
        <h3 class="font-bold text-slate-800">排版模板全局配置</h3>
        <button
          class="text-slate-400 hover:text-slate-600"
          @click="$emit('close')"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="flex-1 overflow-hidden flex">
        <!-- 左侧：模板列表 -->
        <div class="w-64 border-r border-slate-200 bg-slate-50 flex flex-col">
          <div class="p-4 border-b border-slate-200">
            <button
              @click="templateStore.openEditor"
              class="w-full bg-primary text-white text-sm font-medium py-2 rounded-lg hover:bg-primary-hover transition flex items-center justify-center gap-2"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
              新建模板
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            <div
              v-for="template in templateStore.customTemplates"
              :key="template.id"
              class="p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-primary transition"
              :class="{
                'border-primary bg-blue-50': selectedTemplateId === template.id,
              }"
              @click="selectTemplate(template.id)"
            >
              <p class="text-sm font-medium text-slate-800 truncate">
                {{ template.name }}
              </p>
              <p class="text-xs text-slate-500 truncate mt-1">
                {{ template.description || "无描述" }}
              </p>
              <div class="flex justify-between items-center mt-2">
                <span class="text-[10px] text-slate-400">{{
                  formatDate(template.updatedAt)
                }}</span>
                <div class="flex gap-1">
                  <button
                    @click.stop="editTemplate(template)"
                    class="text-slate-400 hover:text-primary transition"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      ></path>
                    </svg>
                  </button>
                  <button
                    @click.stop="deleteTemplate(template.id)"
                    class="text-slate-400 hover:text-red-500 transition"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <p
              v-if="templateStore.customTemplates.length === 0"
              class="text-sm text-slate-500 text-center py-4"
            >
              暂无自定义模板
            </p>
          </div>
        </div>

        <!-- 右侧：编辑器或预览 -->
        <div class="flex-1 overflow-hidden">
          <TemplateEditor
            v-if="templateStore.showEditor || editingTemplate"
            :template="editingTemplate"
            @save="handleSaveTemplate"
            @cancel="handleCancelEdit"
          />
          <div
            v-else-if="selectedTemplate"
            class="w-full h-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50"
          >
            <PhoneMockup>
              <h1
                class="text-[22px] font-bold mb-3 leading-snug text-slate-900"
              >
                {{ selectedTemplate.name || "标题加载中..." }}
              </h1>
              <div
                class="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium"
              >
                <span class="text-[#576b95]">{{
                  selectedTemplate.description || "微信公众号配置名称"
                }}</span>
              </div>

              <div v-html="selectedTemplatePreview" class="space-y-6"></div>
              <div class="mt-16 mb-8 text-center text-slate-400 text-xs">
                — 预览到底部了 —
              </div>
            </PhoneMockup>
          </div>
          <div v-else class="w-full h-full flex items-center justify-center">
            <div class="text-center">
              <svg
                class="w-12 h-12 text-slate-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                ></path>
              </svg>
              <p class="text-slate-500 text-sm">点击新建模板开始创建</p>
              <p class="text-slate-400 text-xs mt-1">
                或从左侧选择一个模板进行预览
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div
        class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0"
      >
        <button
          class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded"
          @click="$emit('close')"
        >
          关闭
        </button>
        <button
          v-if="selectedTemplateId"
          class="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover transition"
          @click="handleSelectTemplate"
        >
          选择此模板
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useToast } from "../../hooks/useToast";
import { useTemplateStore } from "../../stores/template";
import TemplateEditor from "../common/TemplateEditor.vue";
import PhoneMockup from "../common/PhoneMockup.vue";
import type { CustomTemplate } from "../../types";

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", templateId: string): void;
}>();
const { success } = useToast();

const templateStore = useTemplateStore();
const selectedTemplateId = ref<string>("");
const editingTemplate = ref<CustomTemplate | undefined>(undefined);

const selectedTemplate = computed<CustomTemplate | undefined>(() => {
  if (!selectedTemplateId.value) return undefined;
  return templateStore.customTemplates.find(
    (t) => t.id === selectedTemplateId.value,
  );
});

const selectedTemplatePreview = computed(() => {
  if (!selectedTemplate.value) return "";
  let html = selectedTemplate.value.html;
  html = html.replace(
    /`https:\/\/toai\.art\/b1\.png`/g,
    "https://via.placeholder.com/400x500",
  );
  html = html.replace(/`/g, "");
  return html;
});

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN");
}

function selectTemplate(templateId: string) {
  selectedTemplateId.value = templateId;
}

function editTemplate(template: CustomTemplate) {
  editingTemplate.value = { ...template };
}

function handleSaveTemplate(template: CustomTemplate) {
  if (editingTemplate.value) {
    templateStore.updateTemplate(template);
    success("模板更新成功");
  } else {
    templateStore.addTemplate(template);
    success("模板保存成功");
  }
  selectedTemplateId.value = template.id;
  editingTemplate.value = undefined;
}

function handleCancelEdit() {
  editingTemplate.value = undefined;
  templateStore.closeEditor();
}

function deleteTemplate(templateId: string) {
  if (confirm("确定要删除此模板吗？")) {
    templateStore.deleteTemplate(templateId);
    if (selectedTemplateId.value === templateId) {
      selectedTemplateId.value = "";
    }
    if (editingTemplate.value?.id === templateId) {
      editingTemplate.value = undefined;
    }
    success("模板已删除");
  }
}

function handleSelectTemplate() {
  if (selectedTemplateId.value) {
    emit("select", selectedTemplateId.value);
    emit("close");
  }
}
</script>
