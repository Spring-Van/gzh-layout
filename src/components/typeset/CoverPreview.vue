<template>
  <div class="space-y-6">
    <!-- 封面显示区域 -->
    <div class="flex justify-center">
      <div
        v-if="ratio === '235'"
        ref="coverImageRef"
        class="aspect-[2.35/1] w-full rounded-2xl overflow-hidden bg-slate-100 relative"
      >
        <template v-if="templateId && generatedCoverImage">
          <div
            class="w-full h-full"
            :style="{
              backgroundImage: `url(${generatedCoverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }"
          ></div>
          <button
            @click="$emit('crop', ratio)"
            class="absolute top-2 right-2 px-3 py-1.5 text-xs bg-black/60 text-white rounded-lg hover:bg-black/80 transition flex items-center gap-1"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            裁剪
          </button>
        </template>
        <template v-else-if="images && images.length > 0">
          <img
            :src="
              getImageUrl(images[selectedCoverIndex]?.path || images[0].path)
            "
            class="w-full h-full object-cover"
          />
        </template>
      </div>

      <div
        v-else
        class="w-full rounded-2xl overflow-hidden bg-slate-100 relative flex justify-center"
      >
        <div class="aspect-[2.35/1] w-full relative">
          <div class="absolute inset-0 flex justify-center items-center">
            <div
              class="aspect-square h-full rounded-2xl overflow-hidden bg-slate-100 relative"
            >
              <template v-if="templateId && generatedCoverImage">
                <div
                  class="w-full h-full"
                  :style="{
                    backgroundImage: `url(${generatedCoverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }"
                ></div>
                <button
                  @click="$emit('crop', ratio)"
                  class="absolute top-2 right-2 px-3 py-1.5 text-xs bg-black/60 text-white rounded-lg hover:bg-black/80 transition flex items-center gap-1"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    ></path>
                  </svg>
                  裁剪
                </button>
              </template>
              <template v-else-if="images && images.length > 0">
                <img
                  :src="
                    getImageUrl(
                      images[selectedCoverIndex]?.path || images[0].path,
                    )
                  "
                  class="w-full h-full object-cover"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 比例缩略图列表 -->
    <div class="flex justify-center">
      <div class="flex gap-3 items-end">
        <!-- 2.35:1 缩略图 -->
        <div class="relative">
          <div class="aspect-[2.35/1] w-16"></div>
          <button
            @click="$emit('update:ratio', '235')"
            class="absolute inset-0 rounded-lg overflow-hidden border-2 transition-all hover:border-primary"
            :class="[
              ratio === '235'
                ? 'border-primary ring-2 ring-primary/30 scale-105'
                : 'border-slate-200 opacity-70 hover:opacity-100',
            ]"
          >
            <div class="w-full h-full bg-slate-100">
              <template v-if="templateId && generatedCoverImage">
                <div
                  class="w-full h-full"
                  :style="{
                    backgroundImage: `url(${generatedCoverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }"
                ></div>
              </template>
              <template v-else-if="images && images.length > 0">
                <img
                  :src="
                    getImageUrl(
                      images[selectedCoverIndex]?.path || images[0].path,
                    )
                  "
                  class="w-full h-full object-cover"
                />
              </template>
            </div>
          </button>
        </div>

        <!-- 1:1 缩略图 -->
        <div class="relative">
          <div class="aspect-[2.35/1] w-16"></div>
          <button
            @click="$emit('update:ratio', '11')"
            class="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-lg overflow-hidden border-2 transition-all hover:border-primary"
            :class="[
              ratio === '11'
                ? 'border-primary ring-2 ring-primary/30 scale-105'
                : 'border-slate-200 opacity-70 hover:opacity-100',
            ]"
            style="aspect-ratio: 1 / 1; height: 100%"
          >
            <div class="w-full h-full bg-slate-100">
              <template v-if="templateId && generatedCoverImage">
                <div
                  class="w-full h-full"
                  :style="{
                    backgroundImage: `url(${generatedCoverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }"
                ></div>
              </template>
              <template v-else-if="images && images.length > 0">
                <img
                  :src="
                    getImageUrl(
                      images[selectedCoverIndex]?.path || images[0].path,
                    )
                  "
                  class="w-full h-full object-cover"
                />
              </template>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 标题和摘要 -->
    <div class="mt-8">
      <h1 class="text-base font-bold text-slate-900 mb-1">
        {{ title || "标题加载中..." }}
      </h1>
      <p class="text-xs text-slate-400">
        {{ subtitle || "摘要加载中..." }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  ratio: "235" | "11";
  templateId?: string;
  generatedCoverImage?: string;
  images: Array<{ id: string; path: string; name: string }>;
  selectedCoverIndex: number;
  title?: string;
  subtitle?: string;
  getImageUrl: (path: string) => string;
}

interface Emits {
  (e: "update:ratio", value: "235" | "11"): void;
  (e: "crop", ratio: "235" | "11"): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
