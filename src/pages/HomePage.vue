<script setup lang="ts">
import { useRouter } from "vue-router";
import type { AppView } from "../types";

const router = useRouter();

const handleNewProject = () => {
  router.push("/project");
};

const handleNavigate = (view: AppView) => {
  const routeMap: Record<AppView, string> = {
    home: "/",
    project: "/project",
    templates: "/templates",
    history: "/history",
    settings: "/settings",
  };
  router.push(routeMap[view] || "/");
};
</script>

<template>
  <HomeView
    current-view="home"
    @new-project="handleNewProject"
    @navigate="handleNavigate"
  />
</template>
