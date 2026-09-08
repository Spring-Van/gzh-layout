<template>
  <div class="flex h-full min-h-0 flex-col">
    <header class="shrink-0 border-b border-border-subtle px-6 pb-3 pt-4">
      <h2 class="text-base font-semibold text-text-primary">存储与上传</h2>
      <p class="mt-0.5 text-xs text-text-secondary">导出目录与图床凭据配置</p>
    </header>

    <div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
      <section class="space-y-3">
        <div>
          <h3 class="text-sm font-medium text-text-primary">导出路径</h3>
          <p class="mt-1 text-xs leading-relaxed text-text-secondary">
            导出的 ZIP 文件将保存到此目录，留空时使用系统下载目录。
          </p>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="exportDir"
            type="text"
            readonly
            placeholder="未配置，默认使用系统下载目录"
            class="field-control min-w-0 flex-1"
          />
          <button
            type="button"
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-elevated text-text-primary transition-colors hover:border-border-strong"
            title="选择文件夹"
            @click="selectExportDir"
          >
            <FolderOpen class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-gradient text-white transition-opacity hover:opacity-90"
            title="保存导出路径"
            @click="saveExportDir"
          >
            <Save class="h-4 w-4" />
          </button>
          <button
            v-if="exportDir"
            type="button"
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-text-muted transition-colors hover:border-red-500/30 hover:text-red-400"
            title="恢复默认下载目录"
            @click="clearExportDir"
          >
            <RotateCcw class="h-4 w-4" />
          </button>
        </div>
      </section>

      <section class="space-y-3 border-t border-border-subtle pt-5">
        <div>
          <h3 class="text-sm font-medium text-text-primary">PicGo API Key</h3>
          <p class="mt-1 text-xs leading-relaxed text-text-secondary">
            用于漫画图片上传，保存后由操作系统凭据服务加密。
          </p>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative min-w-0 flex-1">
            <input
              v-model="picgoApiKey"
              :type="showApiKey ? 'text' : 'password'"
              autocomplete="off"
              placeholder="输入 PicGo API Key"
              class="field-control pr-10"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
              :title="showApiKey ? '隐藏密钥' : '显示密钥'"
              @click="showApiKey = !showApiKey"
            >
              <EyeOff v-if="showApiKey" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-gradient text-white transition-opacity hover:opacity-90"
            title="保存 PicGo API Key"
            @click="savePicgoApiKey"
          >
            <Save class="h-4 w-4" />
          </button>
          <button
            v-if="picgoApiKey"
            type="button"
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-text-muted transition-colors hover:border-red-500/30 hover:text-red-400"
            title="删除 PicGo API Key"
            @click="clearPicgoApiKey"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
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

<style scoped>
.field-control {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-input);
  padding: 0.5rem 0.75rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
}

.field-control:focus {
  border-color: rgb(6 182 212 / 0.5);
}
</style>
