<template>
  <div class="space-y-3">
    <div class="flex justify-center">
      <div
        v-if="ratio === '235'"
        class="aspect-[2.35/1] w-full rounded-lg overflow-hidden bg-slate-100 relative group"
      >
        <slot name="main-image">
          <div
            class="w-full h-full bg-slate-200 flex items-center justify-center"
          >
            <span class="text-slate-400 text-sm">暂无封面</span>
          </div>
        </slot>
        <div
          class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            @click="$emit('preview')"
            class="p-1 bg-black/60 text-white rounded-lg hover:bg-black/80 transition"
            title="预览"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              ></path>
            </svg>
          </button>
          <button
            @click="$emit('crop', ratio)"
            class="p-1 bg-black/60 text-white rounded-lg hover:bg-black/80 transition"
            title="裁剪"
          >
            <svg
              class="w-3 h-3"
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
          </button>
        </div>
      </div>

      <div
        v-else
        class="w-full rounded-lg overflow-hidden bg-white relative flex justify-center"
      >
        <div class="aspect-[2.35/1] w-full relative">
          <div class="absolute inset-0 flex justify-center items-center">
            <div
              class="aspect-square h-full rounded-lg overflow-hidden bg-slate-100 relative group"
            >
              <slot name="main-image">
                <div
                  class="w-full h-full bg-slate-200 flex items-center justify-center"
                >
                  <span class="text-slate-400 text-sm">暂无封面</span>
                </div>
              </slot>
              <div
                class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  @click="$emit('preview')"
                  class="p-1 bg-black/60 text-white rounded-lg hover:bg-black/80 transition"
                  title="预览"
                >
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    ></path>
                  </svg>
                </button>
                <button
                  @click="$emit('crop', ratio)"
                  class="p-1 bg-black/60 text-white rounded-lg hover:bg-black/80 transition"
                  title="裁剪"
                >
                  <svg
                    class="w-3 h-3"
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
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-center">
      <div class="flex gap-1 items-end">
        <div class="relative">
          <div class="aspect-[2.35/1] w-16"></div>
          <button
            @click="$emit('update:ratio', '235')"
            class="absolute inset-0 rounded overflow-hidden transition-all hover:border-primary"
            :class="[
              ratio === '235'
                ? 'border-2 border-primary ring-2 ring-primary/30 scale-105'
                : 'border-0 opacity-70 hover:opacity-100',
            ]"
          >
            <slot name="thumb-235">
              <div class="w-full h-full bg-white" />
            </slot>
          </button>
        </div>

        <div class="relative">
          <div class="aspect-[2.35/1] w-16"></div>
          <button
            @click="$emit('update:ratio', '11')"
            class="absolute bottom-0 left-1/2 -translate-x-1/2 rounded overflow-hidden transition-all hover:border-primary"
            :class="[
              ratio === '11'
                ? 'border-2 border-primary ring-2 ring-primary/30 scale-105'
                : 'border-0 opacity-70 hover:opacity-100',
            ]"
            style="aspect-ratio: 1 / 1; height: 100%"
          >
            <slot name="thumb-11">
              <div class="w-full h-full bg-white" />
            </slot>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  ratio: "235" | "11";
}

interface Emits {
  (e: "update:ratio", value: "235" | "11"): void;
  (e: "crop", ratio: "235" | "11"): void;
  (e: "preview"): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
