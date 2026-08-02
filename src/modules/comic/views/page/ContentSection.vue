<template>
  <div class="border-b border-border-subtle pb-2.5 last:border-0">
    <h4
      v-if="!hideTitle"
      class="text-[11px] font-medium text-text-primary mb-1.5 flex items-center gap-1.5"
    >
      <span
        class="w-1 h-3 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500"
      ></span>
      {{ title }}
    </h4>

    <!-- 对象数组 → 紧凑卡片展示 -->
    <div
      v-if="isObjectArray"
      class="space-y-2 ml-2 pl-2.5 border-l border-border-subtle"
    >
      <div
        v-for="(item, idx) in props.content as Record<string, unknown>[]"
        :key="idx"
        class="bg-elevated rounded-lg px-3 py-2 border border-border-subtle hover:border-border-default transition-colors"
      >
        <div class="flex items-center gap-1.5 mb-1.5">
          <span
            class="inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400"
          >
            {{ idx + 1 }}
          </span>
          <span class="text-xs font-medium text-text-primary">{{ shortName }}</span>
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-1">
          <template v-for="(val, key) in item" :key="String(key)">
            <div v-if="isSimpleValue(val)" class="text-xs leading-relaxed">
              <span class="text-text-secondary">{{ key }}:</span>
              <span class="text-text-primary ml-0.5">{{ formatValue(val) }}</span>
            </div>
          </template>
        </div>
        <!-- 嵌套对象/数组属性单独展示 -->
        <div v-for="(val, key) in item" :key="'nested-' + String(key)">
          <div v-if="isNestedValue(val)" class="mt-1.5">
            <ContentSection
              :title="String(key)"
              :content="val as unknown"
              :parent-key="String(key)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 嵌套对象 → 递归展示下层节点 -->
    <div
      v-else-if="isNestedObject"
      class="space-y-2 ml-2 pl-2.5 border-l border-border-subtle"
    >
      <ContentSection
        v-for="(val, key) in nestedContent"
        :key="String(key)"
        :title="String(key)"
        :content="val as unknown"
        :parent-key="String(key)"
      />
    </div>

    <!-- 简单值 / 原始数组 → 直接文本展示 -->
    <div
      v-else
      class="text-xs text-text-primary leading-relaxed whitespace-pre-wrap bg-surface rounded-lg px-3 py-2 border border-border-subtle"
    >
      {{ displayContent }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  title: string;
  content: unknown;
  parentKey?: string;
  hideTitle?: boolean;
}

const props = defineProps<Props>();

const KEY_SHORT_NAME_MAP: Record<string, string> = {
  人物设定: "人物",
  物品设定: "物品",
  气泡设计: "气泡",
  场景描述: "场景",
  艺术指导: "艺术",
  分镜概览: "分镜",
  叙事结构: "叙事",
  排版布局: "排版",
  画面内容: "画面",
  服装: "服装",
  配饰: "配饰",
  关键背景元素: "背景元素",
  特殊光效: "光效",
  主色调: "色调",
  辅助色: "色调",
  强调色: "色调",
  各格具体内容: "格",
  关键物品: "物品",
  出场角色: "角色",
};

function deriveShortName(key: string): string {
  if (KEY_SHORT_NAME_MAP[key]) return KEY_SHORT_NAME_MAP[key];
  const stripped = key.replace(
    /设定|清单|设计|描述|指导|概览|结构|布局|信息|详情|列表|配置|内容|元素/g,
    "",
  );
  return stripped || key;
}

const shortName = computed(() => {
  if (props.parentKey) return deriveShortName(props.parentKey);
  return deriveShortName(props.title);
});

const isNestedObject = computed(() => {
  if (props.content === null || props.content === undefined) return false;
  return typeof props.content === "object" && !Array.isArray(props.content);
});

const isObjectArray = computed(() => {
  if (!Array.isArray(props.content)) return false;
  if (props.content.length === 0) return false;
  return typeof props.content[0] === "object" && props.content[0] !== null;
});

const nestedContent = computed((): Record<string, unknown> => {
  if (!isNestedObject.value) return {};
  return props.content as Record<string, unknown>;
});

function isSimpleValue(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (
    typeof val === "string" ||
    typeof val === "number" ||
    typeof val === "boolean"
  )
    return true;
  if (Array.isArray(val)) {
    return val.every((v) => typeof v !== "object" || v === null);
  }
  return false;
}

function isNestedValue(val: unknown): boolean {
  return !isSimpleValue(val);
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val || "—";
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return "（空）";
    return val
      .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
      .join("、");
  }
  return JSON.stringify(val);
}

const displayContent = computed((): string => {
  return formatValue(props.content);
});
</script>
