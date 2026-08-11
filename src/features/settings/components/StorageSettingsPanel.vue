<template>
  <div class="max-w-2xl space-y-4">
    <section class="bg-surface border border-border-subtle rounded-lg p-6 space-y-4">
      <div>
        <h3 class="text-sm font-medium text-text-primary">导出路径</h3>
        <p class="text-xs text-text-secondary mt-1 leading-relaxed">
          导出的 ZIP 文件将保存到此目录。留空时使用系统下载目录。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="exportDir"
          type="text"
          placeholder="未配置，默认使用系统下载目录"
          class="flex-1 min-w-0 px-3 py-2 rounded-lg bg-input-bg border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent"
          readonly
        />
        <button
          class="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-elevated border border-border-subtle text-text-primary hover:border-border-strong transition-colors shrink-0"
          title="选择文件夹"
          @click="selectExportDir"
        >
          <FolderOpen class="w-4 h-4" />
        </button>
        <button
          class="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-accent-gradient text-white hover:opacity-90 transition-opacity shrink-0"
          title="保存导出路径"
          @click="saveExportDir"
        >
          <Save class="w-4 h-4" />
        </button>
        <button
          v-if="exportDir"
          class="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-border-subtle text-text-muted hover:text-red-400 hover:border-red-500/30 transition-colors shrink-0"
          title="恢复默认下载目录"
          @click="clearExportDir"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
      </div>
    </section>

    <section class="bg-surface border border-border-subtle rounded-lg p-6 space-y-4">
      <div>
        <h3 class="text-sm font-medium text-text-primary">PicGo API Key</h3>
        <p class="text-xs text-text-secondary mt-1 leading-relaxed">
          用于漫画图片上传，保存后由操作系统凭据服务加密。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative flex-1 min-w-0">
          <input
            v-model="picgoApiKey"
            :type="showApiKey ? 'text' : 'password'"
            autocomplete="off"
            placeholder="输入 PicGo API Key"
            class="w-full px-3 py-2 pr-10 rounded-lg bg-input-bg border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent"
          />
          <button
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
            :title="showApiKey ? '隐藏密钥' : '显示密钥'"
            @click="showApiKey = !showApiKey"
          >
            <EyeOff v-if="showApiKey" class="w-4 h-4" />
            <Eye v-else class="w-4 h-4" />
          </button>
        </div>
        <button
          class="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-accent-gradient text-white hover:opacity-90 transition-opacity shrink-0"
          title="保存 PicGo API Key"
          @click="savePicgoApiKey"
        >
          <Save class="w-4 h-4" />
        </button>
        <button
          v-if="picgoApiKey"
          class="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-border-subtle text-text-muted hover:text-red-400 hover:border-red-500/30 transition-colors shrink-0"
          title="删除 PicGo API Key"
          @click="clearPicgoApiKey"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Eye, EyeOff, FolderOpen, RotateCcw, Save, Trash2 } from 'lucide-vue-next';
import { comicDb } from '@/api/comic';
import { selectFolder } from '@/api/native';
import { useToast } from '@/hooks/useToast';

const exportDir = ref('');
const picgoApiKey = ref('');
const showApiKey = ref(false);
const { success: toastSuccess } = useToast();

async function loadSettings() {
  const settings = await comicDb.getAppSettings();
  exportDir.value = settings.exportDir || '';
  picgoApiKey.value = settings.picgoApiKey || '';
}

async function selectExportDir() {
  const folder = await selectFolder();
  if (folder) exportDir.value = folder;
}

async function saveExportDir() {
  await comicDb.saveAppSettings({ exportDir: exportDir.value.trim() || undefined });
  toastSuccess('导出路径已保存');
}

async function clearExportDir() {
  exportDir.value = '';
  await comicDb.saveAppSettings({ exportDir: undefined });
  toastSuccess('已恢复默认下载目录');
}

async function savePicgoApiKey() {
  const apiKey = picgoApiKey.value.trim();
  if (!apiKey) return;
  await comicDb.saveAppSettings({ picgoApiKey: apiKey });
  picgoApiKey.value = apiKey;
  showApiKey.value = false;
  toastSuccess('PicGo API Key 已加密保存');
}

async function clearPicgoApiKey() {
  picgoApiKey.value = '';
  await comicDb.saveAppSettings({ picgoApiKey: undefined });
  toastSuccess('PicGo API Key 已删除');
}

onMounted(loadSettings);
</script>
