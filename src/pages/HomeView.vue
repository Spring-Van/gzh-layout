<template>
  <section
    class="w-full h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-100"
  >
    <div class="max-w-5xl mx-auto px-6 py-12 md:py-16">
      <!-- 头部欢迎区域 -->
      <div class="text-center mb-14">
        <div
          class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20 mb-6"
        >
          <svg
            class="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <h1 class="text-4xl font-bold text-slate-800 mb-3">
          {{ greeting }}，创作者
        </h1>
        <p class="text-slate-500 text-lg">选择工具，开始创作</p>
      </div>

      <!-- 工具网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 公众号矩阵工具 -->
        <div
          class="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 hover:-translate-y-1"
          @click="$router.push('/setup')"
        >
          <!-- 顶部渐变装饰条 -->
          <div
            class="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"
          ></div>

          <div class="p-7">
            <div class="flex items-start gap-5">
              <!-- 图标 -->
              <div
                class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300"
              >
                <svg
                  class="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64"
                  />
                </svg>
              </div>

              <!-- 内容 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <h3 class="text-xl font-bold text-slate-800">公众号矩阵</h3>
                  <span
                    class="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 rounded-full"
                  >
                    可用
                  </span>
                </div>
                <p class="text-sm text-slate-500 leading-relaxed mb-4">
                  批量处理图片素材，智能排版，一键同步到微信公众号草稿箱
                </p>

                <!-- 功能标签 -->
                <div class="flex flex-wrap gap-2">
                  <span
                    class="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md"
                  >
                    素材清洗
                  </span>
                  <span
                    class="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md"
                  >
                    批量排版
                  </span>
                  <span
                    class="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md"
                  >
                    封面生成
                  </span>
                  <span
                    class="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md"
                  >
                    一键同步
                  </span>
                </div>
              </div>

              <!-- 箭头 -->
              <svg
                class="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0 mt-2"
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
            </div>
          </div>
        </div>

        <!-- 图片提取工具 -->
        <div
          class="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-300 hover:-translate-y-1"
          @click="$router.push('/extract')"
        >
          <!-- 顶部渐变装饰条 -->
          <div
            class="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"
          ></div>

          <div class="p-7">
            <div class="flex items-start gap-5">
              <!-- 图标 -->
              <div
                class="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300"
              >
                <svg
                  class="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM10.5 8.25a.75.75 0 00-1.5 0v.75a.75.75 0 001.5 0v-.75zM10.5 12a.75.75 0 00-1.5 0v.75a.75.75 0 001.5 0V12z"
                  />
                </svg>
              </div>

              <!-- 内容 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <h3 class="text-xl font-bold text-slate-800">图片提取</h3>
                  <span
                    class="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-600 rounded-full"
                  >
                    可用
                  </span>
                </div>
                <p class="text-sm text-slate-500 leading-relaxed mb-4">
                  从微信公众号、小红书、抖音等平台链接批量提取原图
                </p>

                <!-- 功能标签 -->
                <div class="flex flex-wrap gap-2">
                  <span
                    class="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md"
                  >
                    批量提取
                  </span>
                  <span
                    class="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md"
                  >
                    原图下载
                  </span>
                  <span
                    class="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md"
                  >
                    多平台支持
                  </span>
                </div>
              </div>

              <!-- 箭头 -->
              <svg
                class="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0 mt-2"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return "早上好";
  if (hour >= 8 && hour < 12) return "上午好";
  if (hour >= 12 && hour < 14) return "中午好";
  if (hour >= 14 && hour < 18) return "下午好";
  if (hour >= 18 && hour < 22) return "晚上好";
  return "夜深了";
});
</script>
