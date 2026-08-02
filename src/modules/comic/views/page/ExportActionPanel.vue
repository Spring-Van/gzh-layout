<template>
  <div
    class="w-[280px] min-w-[250px] rounded-xl bg-surface border border-border-subtle backdrop-blur-sm shadow-lg shadow-black/20 overflow-hidden flex flex-col"
  >
    <div
      class="h-10 px-4 border-b border-border-subtle flex items-center shrink-0"
    >
      <span class="text-xs font-medium text-text-secondary">导出设置</span>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-5">
      <!-- 导出格式 -->
      <div>
        <label class="block text-[11px] text-text-muted mb-2">导出格式</label>
        <div class="space-y-2">
          <button
            class="w-full px-3 py-2.5 rounded-lg border text-left transition-colors text-xs"
            :class="exportFormat === 'zip' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-border-subtle text-text-secondary hover:border-border-strong'"
            @click="$emit('update:export-format', 'zip')"
          >
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <div>
                <div class="font-medium">ZIP 打包下载</div>
                <div class="text-[10px] opacity-60 mt-0.5">所有图片打包为 ZIP 文件</div>
              </div>
            </div>
          </button>
          <button
            class="w-full px-3 py-2.5 rounded-lg border text-left transition-colors text-xs"
            :class="exportFormat === 'long' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-border-subtle text-text-secondary hover:border-border-strong'"
            @click="$emit('update:export-format', 'long')"
          >
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
              </svg>
              <div>
                <div class="font-medium">长图拼接</div>
                <div class="text-[10px] opacity-60 mt-0.5">所有页面纵向拼接为一张长图</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- 脱敏设置 -->
      <div>
        <label class="block text-[11px] text-text-muted mb-2">
          图片脱敏
          <span v-if="selectedIndices.size > 0" class="text-cyan-400">
            ({{ selectedIndices.size }} 张)
          </span>
        </label>

        <div v-if="selectedIndices.size === 0" class="text-[11px] text-text-muted py-2">
          在左侧图片上点击选择需要脱敏的图片
        </div>

        <div v-else class="space-y-3">
          <!-- 网感滤镜预设 -->
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="preset in vibePresets"
              :key="preset.value"
              class="px-2 py-1.5 text-[11px] rounded-lg border transition-colors text-left"
              :class="vibePreset === preset.value ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-border-subtle text-text-muted hover:border-border-strong'"
              @click="selectPreset(preset.value)"
            >
              <div class="font-medium">{{ preset.label }}</div>
              <div class="text-[9px] opacity-60">{{ preset.desc }}</div>
            </button>
          </div>

          <!-- 自定义参数 -->
          <div class="pt-2 border-t border-border-subtle space-y-2">
            <div>
              <div class="flex justify-between text-[10px] text-text-muted mb-0.5">
                <span>模糊强度</span>
                <span>{{ vibeOptions.blurSigma?.toFixed(1) }}</span>
              </div>
              <input type="range" min="0" max="2" step="0.1" :value="vibeOptions.blurSigma"
                @input="updateOption('blurSigma', parseFloat(($event.target as HTMLInputElement).value))" class="w-full h-1" />
            </div>
            <div>
              <div class="flex justify-between text-[10px] text-text-muted mb-0.5">
                <span>锐化强度</span>
                <span>{{ vibeOptions.sharpenSigma?.toFixed(1) }}</span>
              </div>
              <input type="range" min="0" max="3" step="0.1" :value="vibeOptions.sharpenSigma"
                @input="updateOption('sharpenSigma', parseFloat(($event.target as HTMLInputElement).value))" class="w-full h-1" />
            </div>
            <div>
              <div class="flex justify-between text-[10px] text-text-muted mb-0.5">
                <span>亮度</span>
                <span>{{ vibeOptions.brightness?.toFixed(2) }}</span>
              </div>
              <input type="range" min="0.5" max="1.5" step="0.05" :value="vibeOptions.brightness"
                @input="updateOption('brightness', parseFloat(($event.target as HTMLInputElement).value))" class="w-full h-1" />
            </div>
            <div>
              <div class="flex justify-between text-[10px] text-text-muted mb-0.5">
                <span>饱和度</span>
                <span>{{ vibeOptions.saturation?.toFixed(2) }}</span>
              </div>
              <input type="range" min="0.5" max="1.5" step="0.05" :value="vibeOptions.saturation"
                @input="updateOption('saturation', parseFloat(($event.target as HTMLInputElement).value))" class="w-full h-1" />
            </div>
            <div class="flex gap-3 pt-1">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" :checked="vibeOptions.normalise"
                  @change="updateOption('normalise', ($event.target as HTMLInputElement).checked)" class="rounded" />
                <span class="text-[10px] text-text-muted">自动色阶</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" :checked="vibeOptions.tintEnabled"
                  @change="updateOption('tintEnabled', ($event.target as HTMLInputElement).checked)" class="rounded" />
                <span class="text-[10px] text-text-muted">色调染色</span>
              </label>
            </div>
          </div>

          <div class="p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
            <p class="text-[10px] text-cyan-400/80 leading-relaxed">
              脱敏处理：清除元数据与隐式水印，注入非均匀噪声破坏AI检测，网感滤镜模拟手机拍摄质感
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出按钮 -->
    <div class="p-4 border-t border-border-subtle">
      <button
        class="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-[color,background-color,border-color,box-shadow,opacity] disabled:opacity-50 disabled:cursor-not-allowed"
        :class="isExporting ? 'bg-elevated text-text-muted' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-cyan-500/20'"
        :disabled="isExporting || imageCount === 0"
        @click="$emit('export')"
      >
        <svg v-if="isExporting" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {{ isExporting ? '导出中...' : '开始导出' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VibePreset, VibeOptions } from "@comic/services/downloadService";

interface VibePresetOption {
  value: VibePreset;
  label: string;
  desc: string;
  params: VibeOptions;
}

interface Props {
  imageCount: number;
  selectedIndices: Set<number>;
  exportFormat: "zip" | "long";
  vibePreset: VibePreset;
  vibeOptions: VibeOptions;
  isExporting: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:export-format", value: "zip" | "long"): void;
  (e: "update:vibe-preset", value: VibePreset): void;
  (e: "update:vibe-options", value: VibeOptions): void;
  (e: "export"): void;
}>();

const vibePresets: VibePresetOption[] = [
  { value: "none", label: "无滤镜", desc: "仅安全脱敏", params: { blurSigma: 0, sharpenSigma: 0, brightness: 1.0, saturation: 1.0, normalise: false, tintEnabled: false } },
  { value: "natural", label: "自然", desc: "轻微模糊+提亮", params: { blurSigma: 0.6, sharpenSigma: 1.0, brightness: 1.05, saturation: 0.95, normalise: true, tintEnabled: false } },
  { value: "clean", label: "干净", desc: "强去噪+通透", params: { blurSigma: 0.8, sharpenSigma: 1.5, brightness: 1.1, saturation: 0.9, normalise: true, tintEnabled: false } },
  { value: "film", label: "胶片", desc: "暖调+颗粒感", params: { blurSigma: 0.5, sharpenSigma: 0.8, brightness: 1.0, saturation: 1.1, normalise: false, tintEnabled: true } },
  { value: "ios", label: "iOS", desc: "高锐度+冷调", params: { blurSigma: 0.3, sharpenSigma: 2.0, brightness: 1.05, saturation: 0.85, normalise: true, tintEnabled: false } },
  { value: "android", label: "Android", desc: "饱和+对比", params: { blurSigma: 0.4, sharpenSigma: 1.2, brightness: 1.0, saturation: 1.2, normalise: true, tintEnabled: false } },
];

const selectPreset = (preset: VibePreset) => {
  emit("update:vibe-preset", preset);
  const config = vibePresets.find((p) => p.value === preset);
  if (config) emit("update:vibe-options", { ...config.params });
};

const updateOption = (key: keyof VibeOptions, value: number | boolean) => {
  emit("update:vibe-options", { ...props.vibeOptions, [key]: value });
};
</script>
