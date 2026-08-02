<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-black bg-opacity-90 z-[200] flex items-center justify-center"
        @click="handleClose"
      >
        <button
          class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          @click.stop="handleClose"
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
            />
          </svg>
        </button>

        <button
          v-if="images.length > 1 && currentIndex > 0"
          class="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
          @click.stop="prevImage"
        >
          <svg
            class="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          v-if="images.length > 1 && currentIndex < images.length - 1"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
          @click.stop="nextImage"
        >
          <svg
            class="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        <div class="max-w-7xl max-h-screen p-8" @click.stop>
          <img
            :src="currentImage"
            :alt="alt"
            class="max-w-full max-h-[90vh] object-contain mx-auto"
          />

          <div v-if="showInfo" class="text-center text-white mt-4">
            <p class="text-lg font-medium">
              {{ alt }} ({{ currentIndex + 1 }}/{{ images.length }})
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

interface Props {
  modelValue: boolean;
  images: string[];
  imageIndex?: number;
  alt?: string;
  showInfo?: boolean;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  imageIndex: 0,
  alt: "",
  showInfo: true,
});

const emit = defineEmits<Emits>();

const currentIndex = ref(props.imageIndex);

watch(
  () => props.imageIndex,
  (val) => {
    currentIndex.value = val;
  },
);

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      currentIndex.value = props.imageIndex;
    }
  },
);

const currentImage = computed(() => {
  return props.images[currentIndex.value] || "";
});

const prevImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

const nextImage = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++;
  }
};

const handleClose = () => {
  emit("update:modelValue", false);
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
