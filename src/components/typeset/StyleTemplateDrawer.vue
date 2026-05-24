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
            selectedIds.includes(template.id)
              ? 'border-primary bg-primary/5'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          ]"
          @click="toggleTemplate(template.id)"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0"
              :class="[
                selectedIds.includes(template.id)
                  ? 'bg-primary border-primary'
                  : 'border-slate-300'
              ]"
            >
              <svg
                v-if="selectedIds.includes(template.id)"
                class="w-3.5 h-3.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
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
          确认选择 ({{ selectedIds.length }} 个样式)
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
  confirm: [selectedIds: string[]];
}>();

const styleTemplateStore = useStyleTemplateStore();
const selectedIds = ref<string[]>([...props.initialSelectedIds]);

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      selectedIds.value = [...props.initialSelectedIds];
      styleTemplateStore.loadCustomTemplates();
    }
  }
);

const templates = styleTemplateStore.allTemplates;

function toggleTemplate(id: string) {
  const index = selectedIds.value.indexOf(id);
  if (index === -1) {
    selectedIds.value.push(id);
  } else {
    selectedIds.value.splice(index, 1);
  }
}

function handleConfirm() {
  emit('confirm', [...selectedIds.value]);
  emit('close');
}
</script>
