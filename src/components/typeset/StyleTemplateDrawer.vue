<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex justify-start"
  >
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="$emit('close')"
    ></div>
    <div class="relative w-96 bg-white h-full shadow-2xl flex flex-col">
      <div class="flex items-center justify-between p-4 border-b border-slate-200">
        <h3 class="text-lg font-bold text-slate-800">选择样式</h3>
        <button
          class="p-1.5 hover:bg-slate-100 rounded-lg transition"
          @click="$emit('close')"
        >
          <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div
          v-for="template in templates"
          :key="template.id"
          class="border-2 rounded-xl p-3 cursor-pointer transition"
          :class="[
            selectedId === template.id
              ? 'border-primary bg-primary/5'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          ]"
          @click="selectTemplate(template.id)"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              :class="[
                selectedId === template.id
                  ? 'border-primary'
                  : 'border-slate-300'
              ]"
            >
              <div
                v-if="selectedId === template.id"
                class="w-2.5 h-2.5 rounded-full bg-primary"
              ></div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700">{{ template.name }}</p>
              <p class="text-xs text-slate-400">{{ template.description }}</p>
            </div>
          </div>
          <div
            v-if="template.html"
            class="mt-3 p-3 bg-white rounded border border-slate-100"
          >
            <div v-html="template.html"></div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-slate-200">
        <button
          class="w-full bg-primary text-white font-medium py-3 rounded-xl hover:bg-primary/90 transition text-sm"
          @click="handleConfirm"
        >
          确认选择
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useStyleTemplateStore } from '../../stores/styleTemplate';

interface Props {
  visible: boolean;
  initialSelectedIds?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  initialSelectedIds: () => [],
});

const emit = defineEmits<{
  close: [];
  confirm: [selectedId: string | null];
}>();

const styleTemplateStore = useStyleTemplateStore();
const selectedId = ref<string | null>(props.initialSelectedIds[0] || null);

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      selectedId.value = props.initialSelectedIds[0] || null;
      styleTemplateStore.loadCustomTemplates();
    }
  }
);

const templates = styleTemplateStore.allTemplates;

function selectTemplate(id: string) {
  // 单选：点击已选中的则取消选中，否则选中新的
  selectedId.value = selectedId.value === id ? null : id;
}

function handleConfirm() {
  emit('confirm', selectedId.value);
  emit('close');
}
</script>
