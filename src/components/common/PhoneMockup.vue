<template>
  <div class="w-full max-w-[320px] h-full max-h-[680px] bg-white phone-mockup rounded-[2.5rem] relative flex flex-col overflow-hidden border-[10px] border-slate-800">
    <div class="h-6 w-full bg-white flex justify-center absolute top-0 z-10">
      <div class="w-24 h-5 bg-slate-800 rounded-b-xl"></div>
    </div>
    <div class="flex-1 overflow-y-auto no-scrollbar p-5 pt-10 bg-white">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.phone-mockup {
  box-shadow: 0 0 0 1px #e2e8f0, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
