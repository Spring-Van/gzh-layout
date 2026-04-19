<template>
  <div class="space-y-3">
    <CoverImageSelector
      :ratio="ratio"
      @update:ratio="$emit('update:ratio', $event)"
      @crop="$emit('crop', $event)"
      @preview="showPreview = true"
    >
      <template #main-image>
        <template v-if="generatedCoverImage">
          <div
            class="w-full h-full"
            :style="
              cropToBackgroundStyle(
                generatedCoverImage,
                ratio === '235' ? picCrop235 : picCrop11,
              )
            "
          ></div>
        </template>
      </template>

      <template #thumb-235>
        <div class="w-full h-full bg-slate-100">
          <template v-if="generatedCoverImage">
            <div
              class="w-full h-full"
              :style="cropToBackgroundStyle(generatedCoverImage, picCrop235)"
            ></div>
          </template>
        </div>
      </template>

      <template #thumb-11>
        <div class="w-full h-full bg-slate-100">
          <template v-if="generatedCoverImage">
            <div
              class="w-full h-full"
              :style="cropToBackgroundStyle(generatedCoverImage, picCrop11)"
            ></div>
          </template>
        </div>
      </template>
    </CoverImageSelector>

    <Teleport to="body">
      <div
        v-if="showPreview && generatedCoverImage"
        class="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-8"
        @click.self="showPreview = false"
      >
        <div
          class="bg-white shadow-2xl rounded-xl overflow-auto max-w-[80vw] max-h-[80vh] flex items-center justify-center"
        >
          <template v-if="ratio === '11'">
            <div
              class="aspect-square w-[80vh] max-w-[80vw]"
              :style="cropToBackgroundStyle(generatedCoverImage, picCrop11)"
            ></div>
          </template>
          <template v-else>
            <img
              :src="generatedCoverImage"
              class="max-w-full max-h-[80vh] object-contain"
            />
          </template>
        </div>
        <button
          class="fixed top-4 right-4 text-white hover:text-slate-300 transition z-[10000]"
          @click="showPreview = false"
        >
          <svg
            class="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import CoverImageSelector from "./CoverImageSelector.vue";
import { cropToBackgroundStyle } from "../../utils/cropStyle";

interface Props {
  ratio: "235" | "11";
  generatedCoverImage?: string;
  picCrop235?: string;
  picCrop11?: string;
}

interface Emits {
  (e: "update:ratio", value: "235" | "11"): void;
  (e: "crop", ratio: "235" | "11"): void;
}

defineProps<Props>();
defineEmits<Emits>();

const showPreview = ref(false);
</script>
