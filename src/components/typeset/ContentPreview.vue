<template>
  <div class="space-y-6">
    <h1
      class="text-[22px] font-bold mb-3 leading-snug text-slate-900"
      id="preview-title"
    >
      {{ title || "标题加载中..." }}
    </h1>
    <div
      class="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium"
    >
      <span class="text-[#576b95]">{{ accountName }}</span>
    </div>

    <div id="preview-article" class="space-y-6">
      <template v-if="templateId === 'flow'">
        <div v-for="img in images" :key="img.id" class="w-full mb-3">
          <img
            :src="getImageUrl(img.path)"
            :alt="img.name"
            class="w-full rounded-[4px] object-cover"
            loading="lazy"
            @error="
              (e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }
            "
          />
        </div>
      </template>
      <template v-else-if="templateId === 'card'">
        <div
          v-for="(img, idx) in images"
          :key="img.id"
          class="w-full p-3.5 bg-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] rounded-[1.5rem] mb-6 border border-slate-100 flex flex-col items-center"
        >
          <img
            :src="getImageUrl(img.path)"
            :alt="img.name"
            class="w-full aspect-square rounded-[1rem] object-cover mb-3"
            loading="lazy"
            @error="
              (e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }
            "
          />
          <span
            class="text-[10px] text-slate-300 font-mono tracking-wider italic"
          >
            FIG. {{ String(idx + 1).padStart(2, "0") }}
          </span>
        </div>
      </template>
      <template v-else-if="processedHtml">
        <div v-html="processedHtml"></div>
      </template>
    </div>
    <div class="mt-16 mb-8 text-center text-slate-400 text-xs">
      — 预览到底部了 —
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  subtitle?: string;
  accountName?: string;
  templateId?: string;
  images: Array<{ id: string; path: string; name: string }>;
  processedHtml?: string;
  getImageUrl: (path: string) => string;
}

defineProps<Props>();
</script>
