<template>
  <header class="h-16 bg-white border-b border-border-color flex items-center justify-between px-6 flex-shrink-0 z-20 shadow-sm">
    <!-- Logo & Title -->
    <div class="flex items-center gap-3 cursor-pointer" @click="$router.push('/')">
      <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded flex items-center justify-center text-white font-bold shadow">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
        </svg>
      </div>
      <span class="font-bold text-slate-800 hidden md:block tracking-wide">图文助手</span>
      <div class="hidden md:flex items-center gap-1 text-slate-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
        <span class="text-sm text-slate-600">公众号矩阵</span>
      </div>
    </div>

    <!-- 中间向导步骤 -->
    <div class="hidden md:flex items-center gap-2 text-sm font-medium">
      <template v-for="(step, index) in steps" :key="step.id">
        <div :id="`pt-${step.id}`" class="flex items-center gap-2"
          :class="[
            index === currentStepIndex ? 'text-primary font-bold' :
            index < currentStepIndex ? 'text-slate-800' : 'text-slate-400'
          ]"
        >
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            :class="[
              index === currentStepIndex ? 'bg-green-50 text-primary border border-green-200' :
              index < currentStepIndex ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
            ]"
          >
            {{ index < currentStepIndex ? '✓' : index + 1 }}
          </span>
          <span>{{ step.label }}</span>
        </div>
        <div v-if="index < steps.length - 1" class="w-6 h-[1px] bg-slate-200"></div>
      </template>
    </div>

    <!-- 右侧全局配置 - 下拉菜单 -->
    <div class="relative" ref="dropdownRef">
      <button
        class="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg transition"
        @click="showDropdown = !showDropdown"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <span class="hidden md:block">全局配置</span>
        <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showDropdown }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      <div
        v-if="showDropdown"
        class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50"
      >
          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
            @click="handleOpenModal('template')"
          >
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
            </svg>
            <div class="text-left">
              <div class="font-medium">排版模板</div>
              <div class="text-xs text-slate-400">管理文章排版模板</div>
            </div>
          </button>

          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
            @click="handleOpenModal('coverTemplate')"
          >
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <div class="text-left">
              <div class="font-medium">封面模板</div>
              <div class="text-xs text-slate-400">管理封面图模板</div>
            </div>
          </button>

          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
            @click="handleOpenModal('styleTemplate')"
          >
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
            </svg>
            <div class="text-left">
              <div class="font-medium">样式模板</div>
              <div class="text-xs text-slate-400">管理正文插入样式</div>
            </div>
          </button>

          <div class="h-px bg-slate-100 mx-3 my-1"></div>

          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
            @click="handleOpenModal('account')"
          >
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            <div class="text-left">
              <div class="font-medium">账号配置</div>
              <div class="text-xs text-slate-400">管理公众号账号</div>
            </div>
          </button>
        </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const steps = [
  { id: 'home', label: '项目主页' },
  { id: 'setup', label: '清洗与拆分' },
  { id: 'typeset', label: '批量排版' },
  { id: 'sync', label: '发布同步' },
];

interface Props {
  currentStep: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['go-to-step', 'open-modal']);

const currentStepIndex = computed(() => steps.findIndex(s => s.id === props.currentStep));

const showDropdown = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function handleOpenModal(type: string) {
  showDropdown.value = false;
  emit('open-modal', type);
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
</style>

