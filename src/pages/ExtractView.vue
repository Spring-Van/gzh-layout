<template>
  <section class="w-full h-full flex flex-col bg-slate-50">
    <!-- Header: 参考公众号矩阵 AppHeader 风格（左 logo + 标题，右 过滤/解析/下载 等操作） -->
    <header
      class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-20 shadow-sm"
    >
      <!-- 左：标题 + 统计 -->
      <div class="flex items-center gap-3 min-w-0">
        <div class="min-w-0">
          <h1 class="text-base font-bold text-slate-800 leading-tight">
            图片提取
          </h1>
          <p class="text-xs text-slate-400 leading-tight hidden md:block">
            从各大平台链接批量提取原图
          </p>
        </div>
        <div
          v-if="totalImageCount > 0"
          class="hidden md:flex items-center gap-1.5 ml-2 text-xs text-slate-400"
        >
          <span class="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
            {{ totalImageCount }} 张
          </span>
          <span
            v-if="filterIsActive && filteredCount > 0"
            class="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full"
          >
            过滤 {{ filteredCount }}
          </span>
        </div>
      </div>

      <!-- 右：过滤下拉 + 解析/下载按钮（视图固定瀑布流，不再提供切换） -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- 解析按钮 -->
        <button
          class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="parseUrls"
          :disabled="!canParse || isProcessing"
        >
          <svg
            v-if="isProcessing"
            class="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          <svg
            v-else
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
            />
          </svg>
          {{ isProcessing ? "解析中..." : "解析" }}
        </button>

        <!-- 下载按钮 -->
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="downloadAll"
          :disabled="isDownloading || totalImageCount === 0"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {{ isDownloading ? "下载中..." : "下载全部" }}
        </button>

        <!-- 前往排版按钮：下载图片并进入公众号矩阵批量排版 -->
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="openTypesetDialog"
          :disabled="isProcessing || isDownloading || isTypesetting || downloadableCount === 0"
          :title="downloadableCount === 0 ? '没有可排版的图片' : '下载图片并进入批量排版'"
        >
          <svg
            v-if="isTypesetting"
            class="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          <svg
            v-else
            class="w-4 h-4"
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
          {{ isTypesetting ? "排版准备中..." : "前往排版" }}
        </button>

        <!-- 过滤下拉 -->
        <div class="relative" ref="filterDropdownRef">
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors"
            :class="
              filterIsActive
                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            "
            @click="filterPanelOpen = !filterPanelOpen"
            title="图片过滤"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            过滤
            <svg
              v-if="filterIsActive"
              class="w-2 h-2 bg-emerald-500 rounded-full"
              viewBox="0 0 8 8"
            >
              <circle cx="4" cy="4" r="3" fill="currentColor" />
            </svg>
          </button>

          <!-- 过滤下拉面板 -->
          <div
            v-if="filterPanelOpen"
            class="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-30"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-slate-700">图片过滤</h3>
              <!-- 开关改为"重置"按钮：点击清空所有过滤条件 -->
              <button
                class="text-xs text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!filterIsActive"
                @click="resetFilterOptions"
              >
                重置
              </button>
            </div>
            <p class="mb-2 text-[10px] text-slate-400 leading-relaxed">
              输入条件后立即生效（无需再点开关）
            </p>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-[10px] text-slate-500 mb-1"
                  >最小宽 (px)</label
                >
                <input
                  v-model.number="filterOptions.minWidth"
                  type="number"
                  min="0"
                  step="10"
                  class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="0=不限"
                />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 mb-1"
                  >最小高 (px)</label
                >
                <input
                  v-model.number="filterOptions.minHeight"
                  type="number"
                  min="0"
                  step="10"
                  class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="0=不限"
                />
              </div>
              <div>
                <label class="block text-[10px] text-slate-500 mb-1"
                  >最小大小 (KB)</label
                >
                <input
                  v-model.number="filterOptions.minSizeKB"
                  type="number"
                  min="0"
                  step="10"
                  class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="0=不限"
                />
              </div>
            </div>
            <p
              v-if="filterIsActive"
              class="mt-2 text-[10px] text-slate-400 leading-relaxed"
            >
              {{ filterDescription }}
            </p>
            <p v-else class="mt-2 text-[10px] text-slate-400 leading-relaxed">
              留空表示不限制
            </p>
            <!-- 隐藏已过滤开关：放过滤面板内，未设置阈值时禁用 -->
            <label
              class="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 cursor-pointer select-none"
              :class="{ 'opacity-50 cursor-not-allowed': !filterIsActive }"
              title="开启后右侧不展示被过滤/将过滤的图片"
            >
              <span class="text-xs text-slate-600">隐藏已过滤</span>
              <span class="relative inline-block w-8 h-4 flex-shrink-0">
                <input
                  v-model="hideFiltered"
                  type="checkbox"
                  class="peer sr-only"
                  :disabled="!filterIsActive"
                />
                <span
                  class="absolute inset-0 bg-slate-200 rounded-full transition-colors peer-checked:bg-emerald-500"
                ></span>
                <span
                  class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"
                ></span>
              </span>
            </label>
          </div>
        </div>

        <!-- 视图切换：瀑布流 / 列表 -->
        <div class="hidden md:flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            class="p-1.5 rounded transition-colors"
            :class="{
              'bg-white shadow-sm text-slate-800': viewMode === 'masonry',
              'text-slate-400 hover:text-slate-600': viewMode !== 'masonry',
            }"
            @click="viewMode = 'masonry'"
            title="瀑布流"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 5h6v6H4V5zM14 5h6v4h-6V5zM14 11h6v8h-6v-8zM4 13h6v6H4v-6z"
              />
            </svg>
          </button>
          <button
            class="p-1.5 rounded transition-colors"
            :class="{
              'bg-white shadow-sm text-slate-800': viewMode === 'list',
              'text-slate-400 hover:text-slate-600': viewMode !== 'list',
            }"
            @click="viewMode = 'list'"
            title="列表"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <aside class="w-96 bg-white border-r border-slate-200 flex flex-col">
        <div class="p-4 border-b border-slate-100">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-slate-700">输入链接</label>
            <span class="text-[10px] text-slate-400"
              >每行一个，支持粘贴分享文本</span
            >
          </div>
          <textarea
            v-model="urlInput"
            class="w-full h-40 p-3 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400"
            placeholder="https://mp.weixin.qq.com/s/...&#10;https://www.xiaohongshu.com/explore/...&#10;https://www.douyin.com/video/..."
            :disabled="isProcessing"
            @paste="handlePaste"
          />
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              class="px-2 py-0.5 text-[10px] bg-green-50 text-green-600 rounded-full"
              >微信公众号</span
            >
            <span
              class="px-2 py-0.5 text-[10px] bg-red-50 text-red-600 rounded-full"
              >小红书</span
            >
            <span
              class="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded-full"
              >抖音</span
            >
          </div>
        </div>

        <div class="p-4 border-b border-slate-100">
          <label class="block text-sm font-medium text-slate-700 mb-2"
            >保存目录</label
          >
          <div class="flex gap-2">
            <input
              v-model="savePath"
              class="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
              placeholder="选择保存目录..."
              readonly
            />
            <button
              class="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              @click="selectFolder"
              :disabled="isProcessing"
            >
              <svg
                class="w-5 h-5 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- 链接输入 + 保存目录 区域结束；图片过滤已移到 header 下拉浮层 -->

        <div class="p-4 flex-1 overflow-y-auto">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-slate-700">
              解析结果
              <span v-if="tasks.length > 0" class="text-slate-400"
                >（{{ tasks.length }} 个链接）</span
              >
            </h3>
            <div class="flex items-center gap-2">
              <button
                class="text-xs text-slate-400 hover:text-blue-500 transition-colors"
                @click="showLogs = !showLogs"
              >
                {{ showLogs ? "隐藏日志" : "显示日志" }}
              </button>
              <button
                v-if="tasks.length > 0"
                class="text-xs text-slate-400 hover:text-red-500 transition-colors"
                @click="clearTasks"
                :disabled="isProcessing"
              >
                清空
              </button>
            </div>
          </div>

          <div
            v-if="tasks.length === 0"
            class="text-center py-8 text-slate-400"
          >
            <svg
              class="w-12 h-12 mx-auto mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p class="text-sm">输入链接后点击解析</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="task in tasks"
              :key="task.id"
              class="p-3 bg-slate-50 rounded-lg border border-slate-100"
            >
              <div class="flex items-center justify-between mb-2">
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full"
                  :class="platformClass(task.platform)"
                >
                  {{ platformName(task.platform) }}
                </span>
                <span class="text-xs text-slate-400">
                  {{ task.images.length }} 张图片
                </span>
              </div>
              <p class="text-xs text-slate-500 truncate mb-2">{{ task.url }}</p>
              <div v-if="task.error" class="text-xs text-red-500">
                {{ task.error }}
              </div>
              <div
                v-if="task.status === 'parsing'"
                class="flex items-center gap-2 text-xs text-emerald-600"
              >
                <svg
                  class="w-3 h-3 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                正在解析...
              </div>
            </div>
          </div>

          <div v-if="showLogs && logs.length > 0" class="mt-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-medium text-slate-600">调试日志</h4>
              <button
                class="text-xs text-slate-400 hover:text-slate-600"
                @click="logs = []"
              >
                清除
              </button>
            </div>
            <div
              class="bg-slate-900 text-slate-300 p-3 rounded-lg text-xs font-mono max-h-60 overflow-y-auto"
            >
              <div v-for="(log, index) in logs" :key="index" class="py-0.5">
                {{ log }}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main class="flex-1 flex flex-col overflow-hidden">
        <div
          class="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100"
        >
          <div class="flex items-center gap-4">
            <h2 class="text-sm font-medium text-slate-700">
              图片预览
              <span v-if="allImages.length > 0" class="text-slate-400"
                >（{{ downloadedCount }}/{{ allImages.length }}）</span
              >
            </h2>
            <div v-if="isDownloading" class="flex items-center gap-2">
              <div class="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-500 rounded-full transition-[width] duration-300"
                  :style="{ width: `${downloadProgress}%` }"
                />
              </div>
              <span class="text-xs text-slate-500"
                >{{ downloadProgress }}%</span
              >
            </div>
          </div>
          <!-- 视图已固定为瀑布流，不再提供切换 -->
        </div>

        <div class="flex-1 overflow-y-auto p-6 relative">
          <div
            v-if="isProcessing"
            class="absolute inset-0 bg-white/80 flex items-center justify-center z-10"
          >
            <div class="text-center">
              <svg
                class="w-12 h-12 mx-auto mb-3 animate-spin text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
              <p class="text-sm text-slate-500">正在解析链接...</p>
            </div>
          </div>

          <div
            v-if="allImages.length === 0 && !isProcessing"
            class="h-full flex items-center justify-center"
          >
            <div class="text-center">
              <svg
                class="w-20 h-20 mx-auto mb-4 text-slate-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p class="text-slate-400">解析链接后将在此显示图片</p>
            </div>
          </div>

          <!--
            瀑布流展示：
            - img 自身 width:100% / height:auto + 占位 aspectRatio = 图片按原比例渲染，不被裁剪
            - 外层 div 仅做定位/悬浮层容器，不再用 aspectRatio 限制大小
            - columns + break-inside-avoid 让不同高度的图片按列错落排成瀑布流
          -->
          <div
            v-if="viewMode === 'masonry' && allImages.length > 0"
            class="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3"
          >
            <div
              v-for="image in allImages"
              :key="image.id"
              class="group relative mb-3 break-inside-avoid bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
              :class="{
                'opacity-60':
                  image.filtered || previewFilteredIds.has(image.id),
              }"
            >
              <!--
                关键：不再在 <img> 上写 aspectRatio / 不写 object-fit。
                - w-full 让 img 宽度 = 列宽
                - h-auto 让浏览器按图片的**内在宽高比**自动算 img 高度
                - 外层 div（block 元素）高度 = img 高度 ⇒ 卡片高度 = 图片高度
                - columns + break-inside-avoid 自然形成瀑布流（横屏矮、竖屏高）
                - min-h-[80px] 防止图片加载前塌陷
                - 自定义占位（loadFailed）替换浏览器默认 broken-image 图标，
                  避免 src=dataURL 24x24 SVG 在 w-full 拉伸下只显示一部分的问题
                - 之前在 img 上加 aspectRatio + 默认 object-fit:fill 会让图片被拉伸变形，已移除
              -->
              <div
                class="relative w-full bg-slate-50"
                style="min-height: 120px"
              >
                <img
                  v-if="!image.loadFailed"
                  :src="getProxiedImageSrc(image)"
                  :data-image-id="image.id"
                  class="block w-full h-auto"
                  @error="handleImageError"
                  @load="onImageLoad"
                  loading="lazy"
                />
                <!-- 自定义占位：图片加载失败时显示，固定尺寸，不会被拉伸 -->
                <div
                  v-else
                  class="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-1.5"
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
                      stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p class="text-[10px]">加载失败</p>
                </div>
              </div>
              <div
                class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center"
              >
                <div
                  class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2"
                >
                  <button
                    class="p-2 rounded-lg transition-colors"
                    :class="
                      image.filtered
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-white/90 text-slate-700 hover:bg-white'
                    "
                    :title="image.filtered ? '取消已过滤标记' : '标记为已过滤'"
                    @click.stop="toggleManualFilter(image)"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                  </button>
                  <button
                    class="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                    @click="previewImage(image)"
                  >
                    <svg
                      class="w-4 h-4 text-slate-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div
                class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent"
              >
                <p class="text-xs text-white truncate">{{ image.filename }}</p>
                <p
                  v-if="image.fileSize && image.fileSize > 0"
                  class="text-[10px] text-slate-200 truncate"
                >
                  {{ formatFileSize(image.fileSize) }}
                  <span v-if="image.width && image.height"
                    >· {{ image.width }}×{{ image.height }}</span
                  >
                </p>
                <p
                  v-if="image.filterReason"
                  class="text-[10px] text-amber-200 truncate"
                  :title="image.filterReason"
                >
                  {{ image.filterReason }}
                </p>
                <p
                  v-else-if="
                    !image.downloaded && previewFilteredIds.has(image.id)
                  "
                  class="text-[10px] text-amber-200 truncate"
                  :title="previewFilterReason(image)"
                >
                  将过滤 · {{ previewFilterReason(image) }}
                </p>
              </div>
              <div v-if="image.downloaded" class="absolute top-2 right-2">
                <span
                  class="w-5 h-5 flex items-center justify-center bg-green-500 rounded-full"
                >
                  <svg
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
              </div>
              <div v-else-if="image.filtered" class="absolute top-2 right-2">
                <span
                  class="w-5 h-5 flex items-center justify-center bg-amber-500 rounded-full"
                  :title="image.filterReason || '已过滤'"
                >
                  <svg
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </span>
              </div>
              <div
                v-else-if="previewFilteredIds.has(image.id)"
                class="absolute top-2 right-2"
              >
                <span
                  class="w-5 h-5 flex items-center justify-center bg-amber-400 ring-2 ring-amber-200 rounded-full"
                  :title="previewFilterReason(image) + '（点击下载后会被过滤）'"
                >
                  <svg
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </span>
              </div>
              <div v-else-if="image.error" class="absolute top-2 right-2">
                <span
                  class="w-5 h-5 flex items-center justify-center bg-red-500 rounded-full"
                >
                  <svg
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <!-- 列表视图 -->
          <div
            v-else-if="viewMode === 'list' && allImages.length > 0"
            class="space-y-2"
          >
            <div
              v-for="image in allImages"
              :key="image.id"
              class="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <div
                class="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0"
              >
                <img
                  v-if="!image.loadFailed"
                  :src="getProxiedImageSrc(image)"
                  :data-image-id="image.id"
                  class="w-full h-full object-cover"
                  @error="handleImageError"
                  @load="onImageLoad"
                  loading="lazy"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-slate-300"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-slate-700 truncate">
                  {{ image.filename }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ platformName(image.platform) }}
                  <span
                    v-if="image.fileSize && image.fileSize > 0"
                    class="ml-2"
                    >{{ formatFileSize(image.fileSize) }}</span
                  >
                  <span v-if="image.width && image.height" class="ml-1"
                    >· {{ image.width }}×{{ image.height }}</span
                  >
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="image.downloaded"
                  class="px-2 py-0.5 text-xs bg-green-50 text-green-600 rounded-full"
                  >已下载</span
                >
                <span
                  v-else-if="image.filtered"
                  class="px-2 py-0.5 text-xs bg-amber-50 text-amber-600 rounded-full"
                  :title="image.filterReason"
                  >已过滤</span
                >
                <span
                  v-else-if="previewFilteredIds.has(image.id)"
                  class="px-2 py-0.5 text-xs bg-amber-50 text-amber-500 ring-1 ring-amber-200 rounded-full"
                  :title="previewFilterReason(image) + '（点击下载后会被过滤）'"
                  >将过滤</span
                >
                <span
                  v-else-if="image.error"
                  class="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded-full"
                  >失败</span
                >
                <span
                  v-else
                  class="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full"
                  >待下载</span
                >
                <button
                  class="p-1.5 rounded-lg transition-colors"
                  :class="
                    image.filtered
                      ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      : 'hover:bg-slate-100 text-slate-500'
                  "
                  :title="image.filtered ? '取消已过滤标记' : '标记为已过滤'"
                  @click="toggleManualFilter(image)"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </button>
                <button
                  class="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  @click="previewImage(image)"
                >
                  <svg
                    class="w-4 h-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 前往排版配置弹窗 -->
    <ExtractToTypesetDialog
      :visible="showTypesetDialog"
      :image-count="downloadableCount"
      :initial-save-path="savePath"
      @close="showTypesetDialog = false"
      @confirm="proceedToTypeset"
    />

    <!-- 排版准备中遮罩 -->
    <div
      v-if="isTypesetting"
      class="fixed inset-0 z-40 bg-black/50 flex items-center justify-center"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 w-80"
      >
        <svg
          class="w-10 h-10 text-emerald-500 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          ></path>
        </svg>
        <p class="text-sm font-medium text-slate-700">{{ typesetProgressText }}</p>
        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-[width] duration-300"
            :style="{ width: `${typesetProgress}%` }"
          />
        </div>
        <p class="text-xs text-slate-400">{{ typesetProgress }}%</p>
      </div>
    </div>

    <div
      v-if="previewImageVisible"
      class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
      @click.self="previewImageVisible = false"
      @keydown="handleKeydown"
      tabindex="0"
    >
      <button
        class="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors z-10"
        @click="previewImageVisible = false"
      >
        <svg
          class="w-6 h-6"
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
        v-if="previewImageIndex > 0"
        class="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-10"
        @click="prevImage"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <button
        v-if="previewImageIndex < allImages.length - 1"
        class="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-10"
        @click="nextImage"
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
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      <img
        :src="previewImageUrl"
        class="max-w-full max-h-full object-contain rounded-lg"
        @error="handleImageError"
      />

      <div
        class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm"
      >
        {{ previewImageIndex + 1 }} / {{ allImages.length }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'ExtractView' });
import { ref, computed, onMounted, onUnmounted, reactive } from "vue";
import { useToast } from "../hooks/useToast";
import { useProjectStore } from "../stores/project";
import { useTypesetNavigation } from "../composables/useTypesetNavigation";
import ExtractToTypesetDialog, {
  type ExtractTypesetConfig,
} from "../components/extract/ExtractToTypesetDialog.vue";
import type { ImageFile, ProjectConfig } from "../types";
import { toDisplayImageUrl } from "../shared/image/imageUrl";
import type { ExtractedImage } from "../features/extract/types";
import {
  extractUrlsFromText,
  extractedToImageFile,
  formatFileSize,
  rebuildGroupsFromResults,
  shuffleArray,
} from "../features/extract/extractUtils";
import { useExtractWorkflow } from "../features/extract/useExtractWorkflow";

const {
  error: showError,
  warning: showWarning,
} = useToast();

const projectStore = useProjectStore();
const { navigateToTypeset } = useTypesetNavigation();

// === 前往排版相关状态 ===
const showTypesetDialog = ref(false);
const isTypesetting = ref(false);
const typesetProgress = ref(0);
const typesetProgressText = ref("");

const {
  urlInput,
  savePath,
  tasks,
  isProcessing,
  isDownloading,
  downloadProgress,
  showLogs,
  logs,
  filterOptions,
  filterIsActive,
  hideFiltered,
  allImages,
  totalImageCount,
  filteredCount,
  filterDescription,
  previewFilteredIds,
  downloadedCount,
  canParse,
  downloadableCount,
  previewFilterReason,
  resetFilterOptions,
  selectFolder,
  parseUrls,
  downloadAll,
  clearWorkflow,
  platformName,
  platformClass,
} = useExtractWorkflow();

const viewMode = ref<"masonry" | "list">("masonry");
const previewImageVisible = ref(false);
const previewImageIndex = ref(0);

// 过滤下拉浮层：只控制显隐，启用与否由条件本身决定
const filterPanelOpen = ref(false);
const filterDropdownRef = ref<HTMLElement | null>(null);

const imageProxyCache = reactive<Record<string, string>>({});
const imageLoadingState = reactive<Record<string, boolean>>({});

const previewImageUrl = computed(() => {
  const image = allImages.value[previewImageIndex.value];
  if (!image) return "";
  if (image.downloaded && image.localPath) {
    return toDisplayImageUrl(image.localPath);
  }
  if (imageProxyCache[image.id]) {
    return imageProxyCache[image.id];
  }
  return image.url;
});

function getProxiedImageSrc(image: ExtractedImage): string {
  if (image.downloaded && image.localPath) {
    return toDisplayImageUrl(image.localPath);
  }

  if (imageProxyCache[image.id]) {
    return imageProxyCache[image.id];
  }

  if (!imageLoadingState[image.id]) {
    imageLoadingState[image.id] = true;
    loadProxiedImage(image);
  }

  return "";
}

async function loadProxiedImage(image: ExtractedImage) {
  try {
    const base64Data = await window.electronAPI.extract.proxyImage(image.url);
    imageProxyCache[image.id] = base64Data;
  } catch (error) {
    console.error("代理图片加载失败:", error);
    imageProxyCache[image.id] = image.url;
  }
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData("text") || "";
  const urls = extractUrlsFromText(pastedText);

  if (urls.length > 0) {
    const currentLines = urlInput.value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const newLines = [...currentLines, ...urls];
    urlInput.value = newLines.join("\n");
  } else {
    urlInput.value = urlInput.value + pastedText;
  }
}

function clearTasks() {
  clearWorkflow();
  Object.keys(imageProxyCache).forEach((key) => {
    delete imageProxyCache[key];
  });
  Object.keys(imageLoadingState).forEach((key) => {
    delete imageLoadingState[key];
  });
}

// ========== 前往批量排版（与公众号矩阵联动） ==========

/** 打开排版配置弹窗 */
function openTypesetDialog() {
  if (downloadableCount.value === 0) {
    showWarning("没有可排版的图片");
    return;
  }
  showTypesetDialog.value = true;
}

/**
 * 前往排版主流程：
 * 1. 收集可下载图片 → (可选)打乱 → 按 splitCount 分组
 * 2. 下载落地（全部到一个目录 / 按分组到子目录）→ 回填 localPath
 * 3. ExtractedImage → ImageFile 适配 → 构造 ProjectConfig → createGroups
 * 4. 调 useTypesetNavigation.navigateToTypeset 跳转
 */
async function proceedToTypeset(config: ExtractTypesetConfig) {
  showTypesetDialog.value = false;

  if (isTypesetting.value) return;

  // 收集可下载图片（与「下载全部」一致的过滤逻辑）
  const previewSet = previewFilteredIds.value;
  const allParsedImages: ExtractedImage[] = tasks.value.flatMap(
    (t) => t.images,
  );
  let downloadable: ExtractedImage[] = allParsedImages.filter(
    (img) => !img.filtered && !previewSet.has(img.id),
  );

  if (downloadable.length === 0) {
    showWarning("没有可排版的图片");
    return;
  }

  isTypesetting.value = true;
  typesetProgress.value = 0;
  typesetProgressText.value = "准备下载...";

  try {
    const splitCount = Math.max(1, config.splitCount);

    // 1. 打乱顺序
    if (config.shuffleBeforeSplit) {
      shuffleArray(downloadable);
    }

    // 2. 分组（内存）
    const groups: ExtractedImage[][] = [];
    for (let i = 0; i < downloadable.length; i += splitCount) {
      groups.push(downloadable.slice(i, i + splitCount));
    }

    const totalImages = downloadable.length;
    let downloadedCount = 0;

    /**
     * 累加下载进度（覆盖在 extract:downloadProgress 监听之上的汇总）
     * 这里直接在每次 downloadImages 返回后累加，简单可靠
     */
    const onGroupDownloaded = (groupResults: ExtractedImage[]) => {
      downloadedCount += groupResults.length;
      typesetProgress.value = Math.round(
        (downloadedCount / totalImages) * 100,
      );
      typesetProgressText.value = `下载中 ${downloadedCount}/${totalImages}`;
    };

    // 3. 下载落地
    const downloadedGroups: ExtractedImage[][] = [];

    if (config.downloadStrategy === "all") {
      // 全部下载到 savePath
      typesetProgressText.value = `下载中 0/${totalImages}`;
      const results = await window.electronAPI.extract.downloadImages(
        JSON.parse(JSON.stringify(downloadable)),
        config.savePath,
      );
      downloadedGroups.push(
        ...rebuildGroupsFromResults(
          groups,
          results as ExtractedImage[],
          splitCount,
        ),
      );
      onGroupDownloaded(results as ExtractedImage[]);
    } else {
      // 按分组下到子目录：分组N
      for (let gi = 0; gi < groups.length; gi++) {
        const groupFolder = `${config.savePath}/分组${gi + 1}`;
        const results = await window.electronAPI.extract.downloadImages(
          JSON.parse(JSON.stringify(groups[gi])),
          groupFolder,
        );
        downloadedGroups.push(results as ExtractedImage[]);
        onGroupDownloaded(results as ExtractedImage[]);
      }
    }

    // 4. 收集所有下载完成的图片，适配为 ImageFile
    const flatDownloaded: ExtractedImage[] = downloadedGroups.flat();
    const imageFiles: ImageFile[] = [];
    flatDownloaded.forEach((img, idx) => {
      const file = extractedToImageFile(img, idx);
      if (file) imageFiles.push(file);
    });

    if (imageFiles.length === 0) {
      showError("图片下载失败，无法进入排版");
      return;
    }

    typesetProgressText.value = "初始化项目...";

    // 5. 构造 ProjectConfig 并设置到 projectStore
    const folderName =
      config.savePath.split(/[\\/]/).pop() || "提取图片";
    const now = new Date().toISOString();
    const project: ProjectConfig = {
      projectId: crypto.randomUUID(),
      projectName: `提取-${folderName}`,
      sourceFolder: config.savePath,
      templateId: "minimal",
      articleTitle: `提取-${folderName}`,
      articleSummary: "",
      status: "idle",
      syncStatus: "idle",
      images: imageFiles,
      groups: [],
      // split 策略下：每篇文章图片下到独立子文件夹，
      // 同步完成后按文章标题重命名对应子文件夹
      splitMode: config.downloadStrategy === "split",
      createdAt: now,
      updatedAt: now,
    };
    projectStore.setCurrentProject(project);

    // 6. 按 splitCount 建立分组（复用矩阵的 createGroups）
    projectStore.createGroups(imageFiles, splitCount);

    // 6.1 拆分模式下回填每个分组的本地文件夹路径
    //      用于 SyncView 同步成功后按文章标题重命名该文件夹
    if (
      config.downloadStrategy === "split" &&
      projectStore.currentProject?.groups
    ) {
      projectStore.currentProject.groups.forEach((g, idx) => {
        // 与下载时使用的子目录命名保持一致：savePath/分组N
        g.folderPath = `${config.savePath}/分组${idx + 1}`;
      });
    }

    // 7. 计算封面基础路径并跳转
    //    - all 策略：所有图在 savePath，封面集中存到 savePath/封面
    //    - split 策略：每篇图在各子目录，封面随文章各自存（传空串走拆分模式）
    const coverBasePath =
      config.downloadStrategy === "split" ? "" : config.savePath;

    typesetProgressText.value = "生成封面并跳转...";
    await navigateToTypeset(coverBasePath);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "未知错误";
    logs.value.push(`[前往排版] 失败: ${msg}`);
    showError("排版准备失败：" + msg);
  } finally {
    isTypesetting.value = false;
  }
}

/**
 * 手动切换图片的"已过滤"标记
 * - 标记后：图片会在 UI 上以 60% 透明 + 琥珀色徽章展示，下载时会被跳过
 * - 取消标记：恢复为可下载状态（不修改 downloaded/localPath/error）
 * - 复用 filtered/filterReason 字段，与自动过滤走同一套展示/下载跳过逻辑
 */
function toggleManualFilter(image: ExtractedImage) {
  if (image.filtered) {
    image.filtered = false;
    image.filterReason = undefined;
  } else {
    image.filtered = true;
    image.filterReason = "手动标记";
  }
}

function previewImage(image: ExtractedImage) {
  const index = allImages.value.findIndex((img) => img.id === image.id);
  if (index !== -1) {
    previewImageIndex.value = index;
  }
  previewImageVisible.value = true;
}

function prevImage() {
  if (previewImageIndex.value > 0) {
    previewImageIndex.value--;
  }
}

function nextImage() {
  if (previewImageIndex.value < allImages.value.length - 1) {
    previewImageIndex.value++;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!previewImageVisible.value) return;
  if (event.key === "ArrowLeft") {
    prevImage();
  } else if (event.key === "ArrowRight") {
    nextImage();
  } else if (event.key === "Escape") {
    previewImageVisible.value = false;
  }
}

function handleImageError(event: Event) {
  // 通过 data-image-id 反查 image 对象，标记加载失败以显示自定义占位
  // 不再直接改 img.src（旧的 24x24 base64 SVG 在 w-full 拉伸下只显示一部分）
  const img = event.target as HTMLImageElement;
  const id = img.dataset.imageId;
  if (!id) return;
  // 【关键】imageProxyCache 里没有该 id → 这是 getProxiedImageSrc 异步占位阶段
  // (返回了空字符串) 触发的"假失败"，此时异步加载还在进行中。
  // 如果此时标记 loadFailed，v-if 会销毁 <img>，等缓存就绪后 img 也不会重新加载。
  if (!imageProxyCache[id]) return;
  const target = allImages.value.find((item) => item.id === id);
  if (target) target.loadFailed = true;
}

/** 图片加载成功时清除 loadFailed 标记（重试时恢复显示） */
function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement;
  const id = img.dataset.imageId;
  if (!id) return;
  const target = allImages.value.find((item) => item.id === id);
  if (target) target.loadFailed = false;
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("mousedown", handleClickOutside);
});

/** 点击下拉浮层外部时自动关闭 */
function handleClickOutside(event: MouseEvent) {
  if (!filterPanelOpen.value) return;
  const target = event.target as Node | null;
  if (
    filterDropdownRef.value &&
    target &&
    !filterDropdownRef.value.contains(target)
  ) {
    filterPanelOpen.value = false;
  }
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
