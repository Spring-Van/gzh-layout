<template>
  <div class="w-full max-w-[280px] max-h-[80vh] bg-white phone-mockup rounded-[2.5rem] relative flex flex-col overflow-hidden border-[8px] border-slate-800">
    <div class="h-5 w-full bg-white flex justify-center absolute top-0 z-10">
      <div class="w-20 h-4 bg-slate-800 rounded-b-xl"></div>
    </div>
    <div class="flex-1 overflow-y-auto no-scrollbar p-4 pt-8 bg-white">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.phone-mockup {
  box-shadow: 0 0 0 1px #e2e8f0, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  aspect-ratio: 9/19.5;
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
