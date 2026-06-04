<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white w-full h-full overflow-hidden flex flex-col"
    >
      <!-- 头部 -->
      <div
        class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0"
      >
        <h3 class="font-bold text-slate-800">样式模板</h3>
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
        <!-- 左侧：样式列表 -->
        <div class="w-64 border-r border-slate-200 bg-slate-50 flex flex-col">
          <div class="p-4 border-b border-slate-200">
            <button
              @click="handleNewTemplate"
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
              新建样式
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            <div
              v-for="template in allTemplates"
              :key="template.id"
              class="p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-primary transition"
              :class="{
                'border-primary bg-blue-50': selectedTemplateId === template.id,
              }"
              @click="selectTemplate(template.id)"
            >
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-slate-800 truncate flex-1">
                  {{ template.name }}
                </p>
              </div>
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
              v-if="allTemplates.length === 0"
              class="text-sm text-slate-500 text-center py-4"
            >
              暂无样式模板
            </p>
          </div>
        </div>

        <!-- 右侧：编辑器或预览 -->
        <div class="flex-1 overflow-hidden">
          <!-- 编辑模式：左右两栏（表单 + 预览） -->
          <StyleEditor
            v-if="isEditing"
            :name="formData.name"
            :description="formData.description"
            :html="formData.html"
            @update:name="formData.name = $event"
            @update:description="formData.description = $event"
            @update:html="formData.html = $event"
            @save="handleSave"
            @cancel="handleCancelEdit"
            :is-editing="!!editingId"
          />

          <!-- 预览模式 -->
          <div
            v-else-if="selectedTemplate"
            class="w-full h-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50"
          >
            <div class="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-100">
                <h3 class="font-bold text-slate-800">{{ selectedTemplate.name }}</h3>
                <p v-if="selectedTemplate.description" class="text-xs text-slate-500 mt-1">{{ selectedTemplate.description }}</p>
              </div>
              <div class="p-6 flex items-center justify-center min-h-[200px] bg-slate-50/50">
                <div v-html="selectedTemplate.html"></div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
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
              <p class="text-slate-500 text-sm">点击新建样式开始创建</p>
              <p class="text-slate-400 text-xs mt-1">
                或从左侧选择一个样式进行预览
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { useToast } from "../../hooks/useToast";
import { useStyleTemplateStore } from "../../stores/styleTemplate";
import StyleEditor from "../common/StyleEditor.vue";
import type { StyleTemplate } from "../../types";

interface Props {
  visible: boolean;
  /** 打开时直接进入该模板的编辑态（用于双击样式卡片） */
  templateIdToEdit?: string;
}

const props = defineProps<Props>();
defineEmits<{
  (e: "close"): void;
}>();

const { success } = useToast();
const styleTemplateStore = useStyleTemplateStore();

const selectedTemplateId = ref<string>("");
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const formData = reactive({
  name: "",
  description: "",
  html: "",
});

const allTemplates = computed(() => styleTemplateStore.allTemplates);

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // 若指定了 templateIdToEdit，直接定位并进入编辑
      if (props.templateIdToEdit) {
        const target = allTemplates.value.find((t) => t.id === props.templateIdToEdit);
        if (target) {
          selectedTemplateId.value = target.id;
          editingId.value = target.id;
          isEditing.value = true;
          formData.name = target.name;
          formData.description = target.description || "";
          formData.html = target.html;
          return;
        }
      }
      if (allTemplates.value.length > 0) {
        selectedTemplateId.value = allTemplates.value[0].id;
      }
    } else {
      // 关闭时重置编辑态
      isEditing.value = false;
      editingId.value = null;
    }
  },
  { immediate: true },
);

const selectedTemplate = computed(() => {
  if (!selectedTemplateId.value) return undefined;
  return allTemplates.value.find(
    (t) => t.id === selectedTemplateId.value,
  );
});

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN");
}

function selectTemplate(templateId: string) {
  selectedTemplateId.value = templateId;
  if (isEditing.value) {
    const template = allTemplates.value.find((t) => t.id === templateId);
    if (template) {
      editingId.value = template.id;
      formData.name = template.name;
      formData.description = template.description || "";
      formData.html = template.html;
    }
  }
}

function editTemplate(template: StyleTemplate) {
  editingId.value = template.id;
  formData.name = template.name;
  formData.description = template.description || "";
  formData.html = template.html;
  isEditing.value = true;
}

function handleNewTemplate() {
  editingId.value = null;
  selectedTemplateId.value = "";
  formData.name = "";
  formData.description = "";
  formData.html = "";
  isEditing.value = true;
}

function handleCancelEdit() {
  isEditing.value = false;
  editingId.value = null;
}

async function handleSave() {
  if (!formData.name.trim() || !formData.html.trim()) return;

  if (editingId.value) {
    await styleTemplateStore.updateCustomTemplate(editingId.value, {
      name: formData.name.trim(),
      description: formData.description.trim(),
      html: formData.html.trim(),
    });
    success("样式更新成功");
  } else {
    const newTemplate = await styleTemplateStore.addCustomTemplate({
      name: formData.name.trim(),
      description: formData.description.trim(),
      html: formData.html.trim(),
    });
    selectedTemplateId.value = newTemplate.id;
    success("样式保存成功");
  }
  isEditing.value = false;
  editingId.value = null;
}

async function deleteTemplate(templateId: string) {
  if (confirm("确定要删除此样式吗？")) {
    await styleTemplateStore.removeCustomTemplate(templateId);
    if (selectedTemplateId.value === templateId) {
      selectedTemplateId.value = "";
    }
    if (editingId.value === templateId) {
      isEditing.value = false;
      editingId.value = null;
    }
    success("样式已删除");
  }
}
</script>
