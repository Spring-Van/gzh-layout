<!--
  应用壳:TabBar + 可选二级工具条(公众号向导步骤条) + 内容区
-->
<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <TabBar />
    <slot name="sub-header" />
    <main class="flex-1 overflow-hidden relative">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import TabBar from './TabBar.vue';

defineOptions({ name: 'AppShell' });
</script>
