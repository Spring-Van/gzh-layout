<template>
  <header class="h-16 bg-surface border-b border-border-subtle flex items-center justify-between px-6 flex-shrink-0 z-20 shadow-sm">
    <!-- 左：返回 + Logo + 标题 -->
    <div class="flex items-center gap-3 min-w-0">
      <button
        class="p-2 rounded-lg hover:bg-elevated transition-colors"
        @click="$router.push('/')"
        title="返回首页"
      >
        <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
      </button>
      <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center text-white font-bold shadow">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64"></path>
        </svg>
      </div>
      <div class="min-w-0">
        <h1 class="text-base font-bold text-text-primary leading-tight">公众号矩阵</h1>
        <p class="text-xs text-text-secondary leading-tight hidden md:block">批量排版，一键同步到微信公众号</p>
      </div>
    </div>

    <!-- 中间向导步骤 -->
    <div class="hidden md:flex items-center gap-2 text-sm font-medium">
      <template v-for="(step, index) in steps" :key="step.id">
        <div :id="`pt-${step.id}`" class="flex items-center gap-2"
          :class="[
            index === currentStepIndex ? 'text-primary font-bold' :
            index < currentStepIndex ? 'text-text-primary' : 'text-text-muted'
          ]"
        >
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            :class="[
              index === currentStepIndex ? 'bg-green-50 text-primary border border-green-200' :
              index < currentStepIndex ? 'bg-accent text-white' : 'bg-elevated text-text-muted'
            ]"
          >
            {{ index < currentStepIndex ? '✓' : index + 1 }}
          </span>
          <span>{{ step.label }}</span>
        </div>
        <div v-if="index < steps.length - 1" class="w-6 h-[1px] bg-border-subtle"></div>
      </template>
    </div>

    <!-- 右侧操作区 -->
    <div class="flex items-center gap-1">
      <!-- 主题切换 -->
      <button
        class="flex items-center justify-center w-9 h-9 text-text-secondary hover:text-text-primary hover:bg-elevated rounded-lg transition"
        :title="theme === 'dark' ? '切换到浅色' : '切换到深色'"
        @click="toggleTheme"
      >
        <!-- 太阳：dark 模式下显示，点击切到浅色 -->
        <svg v-if="theme === 'dark'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
        <!-- 月亮：light 模式下显示，点击切到深色 -->
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      </button>

      <!-- 全局配置 - 下拉菜单 -->
      <div class="relative" ref="dropdownRef">
        <button
          class="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-elevated rounded-lg transition"
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
          class="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-xl border border-border-subtle py-2 z-50"
        >
          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-elevated transition"
            @click="handleOpenModal('template')"
          >
            <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
            </svg>
            <div class="text-left">
              <div class="font-medium">排版模板</div>
              <div class="text-xs text-text-muted">管理文章排版模板</div>
            </div>
          </button>

          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-elevated transition"
            @click="handleOpenModal('coverTemplate')"
          >
            <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <div class="text-left">
              <div class="font-medium">封面模板</div>
              <div class="text-xs text-text-muted">管理封面图模板</div>
            </div>
          </button>

          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-elevated transition"
            @click="handleOpenModal('styleTemplate')"
          >
            <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
            </svg>
            <div class="text-left">
              <div class="font-medium">样式模板</div>
              <div class="text-xs text-text-muted">管理正文插入样式</div>
            </div>
          </button>

          <div class="h-px bg-border-subtle mx-3 my-1"></div>

          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-elevated transition"
            @click="handleOpenModal('account')"
          >
            <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            <div class="text-left">
              <div class="font-medium">账号配置</div>
              <div class="text-xs text-text-muted">管理公众号账号</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTheme } from '@/theme/useTheme';

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

const { theme, toggle: toggleTheme } = useTheme();

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

