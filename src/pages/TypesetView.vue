<template>
  <section
    class="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-background"
  >
    <!-- 左栏：文章队列 -->
    <div
      class="w-full lg:w-72 bg-white border-r border-slate-200 flex flex-col h-1/3 lg:h-full flex-shrink-0 z-10 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.02)]"
    >
      <div
        class="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0"
      >
        <span class="font-bold text-sm text-slate-800 flex items-center gap-2">
          <svg
            class="w-4 h-4 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 10h16M4 14h16M4 18h18"
            ></path>
          </svg>
          输出队列 ({{ batchStore.articles.length }})
        </span>
        <button
          class="text-xs text-slate-400 hover:text-primary transition"
          @click="$router.push('/setup')"
        >
          重配素材
        </button>
      </div>
      <div
        class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50"
      >
        <div
          v-for="(article, index) in batchStore.articles"
          :key="article.id"
          class="bg-white border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md"
          :class="[
            index === batchStore.currentArticleIndex
              ? 'border-primary bg-blue-50/30 shadow-sm'
              : 'border-slate-200',
          ]"
          @click="batchStore.selectArticle(index)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm text-slate-800 truncate">
                #{{ index + 1 }} {{ getArticleDisplayTitle(article, index) }}
              </div>
              <div class="text-xs text-slate-400 mt-1">
                {{ article.images.length }} 张图片
              </div>
            </div>
          </div>
          <div class="flex gap-1 mt-2 flex-wrap">
            <span
              v-if="
                !article.override.title &&
                !article.override.cover &&
                !article.override.layout
              "
              class="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700"
            >
              继承全局
            </span>
            <span
              v-if="article.override.title"
              class="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700"
            >
              已覆盖标题
            </span>
            <span
              v-if="article.override.cover"
              class="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700"
            >
              已覆盖封面
            </span>
            <span
              v-if="article.override.layout"
              class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"
            >
              已覆盖排版
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 中栏：实时预览 -->
    <div
      class="flex-1 h-full flex flex-col items-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50"
    >
      <div class="w-full max-w-md mb-4 flex items-center justify-center gap-2">
        <div
          class="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200"
        >
          <button
            v-for="mode in previewModes"
            :key="mode.value"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
            :class="[
              batchStore.previewMode === mode.value
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            ]"
            @click="batchStore.setPreviewMode(mode.value as any)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <PhoneMockup class="flex-1 overflow-hidden">
        <template v-if="batchStore.previewMode === 'cover'">
          <div class="space-y-6">
            <!-- 封面显示区域 -->
            <div class="flex justify-center">
              <div
                v-if="selectedCoverRatio === '235'"
                ref="coverImageRef"
                class="aspect-[2.35/1] w-full rounded-2xl overflow-hidden bg-slate-100 relative"
              >
                <template
                  v-if="
                    currentArticle?.coverConfig.templateId &&
                    generatedCoverImageSrc
                  "
                >
                  <!-- 使用生成的封面图 -->
                  <div
                    class="w-full h-full"
                    :style="{
                      backgroundImage: `url(${generatedCoverImageSrc})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }"
                  ></div>
                  <!-- 裁剪按钮 -->
                  <button
                    @click="openCoverCropTool('235')"
                    class="absolute top-2 right-2 px-3 py-1.5 text-xs bg-black/60 text-white rounded-lg hover:bg-black/80 transition flex items-center gap-1"
                  >
                    <svg
                      class="w-3.5 h-3.5"
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
                    裁剪
                  </button>
                </template>
                <template
                  v-else-if="
                    currentArticle?.images && currentArticle.images.length > 0
                  "
                >
                  <!-- 降级显示当前选中的图片 -->
                  <img
                    :src="
                      getImageUrl(
                        currentArticle.images[selectedCoverIndex]?.path ||
                          currentArticle.images[0].path,
                      )
                    "
                    class="w-full h-full object-cover"
                  />
                </template>
              </div>

              <div
                v-else
                class="w-full rounded-2xl overflow-hidden bg-slate-100 relative flex justify-center"
              >
                <div class="aspect-[2.35/1] w-full relative">
                  <div
                    class="absolute inset-0 flex justify-center items-center"
                  >
                    <div
                      class="aspect-square h-full rounded-2xl overflow-hidden bg-slate-100 relative"
                    >
                      <template
                        v-if="
                          currentArticle?.coverConfig.templateId &&
                          generatedCoverImageSrc
                        "
                      >
                        <!-- 使用生成的封面图，居中裁剪 -->
                        <div
                          class="w-full h-full"
                          :style="{
                            backgroundImage: `url(${generatedCoverImageSrc})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }"
                        ></div>
                        <!-- 裁剪按钮 -->
                        <button
                          @click="openCoverCropTool('11')"
                          class="absolute top-2 right-2 px-3 py-1.5 text-xs bg-black/60 text-white rounded-lg hover:bg-black/80 transition flex items-center gap-1"
                        >
                          <svg
                            class="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002 2z"
                            ></path>
                          </svg>
                          裁剪
                        </button>
                      </template>
                      <template
                        v-else-if="
                          currentArticle?.images &&
                          currentArticle.images.length > 0
                        "
                      >
                        <!-- 降级显示当前选中的图片 -->
                        <img
                          :src="
                            getImageUrl(
                              currentArticle.images[selectedCoverIndex]?.path ||
                                currentArticle.images[0].path,
                            )
                          "
                          class="w-full h-full object-cover"
                        />
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 比例缩略图列表 -->
            <div class="flex justify-center">
              <div class="flex gap-3 items-end">
                <!-- 2.35:1 缩略图 -->
                <div class="relative">
                  <div class="aspect-[2.35/1] w-16"></div>
                  <button
                    @click="selectedCoverRatio = '235'"
                    class="absolute inset-0 rounded-lg overflow-hidden border-2 transition-all hover:border-primary"
                    :class="[
                      selectedCoverRatio === '235'
                        ? 'border-primary ring-2 ring-primary/30 scale-105'
                        : 'border-slate-200 opacity-70 hover:opacity-100',
                    ]"
                  >
                    <div class="w-full h-full bg-slate-100">
                      <template
                        v-if="
                          currentArticle?.coverConfig.templateId &&
                          generatedCoverImageSrc
                        "
                      >
                        <div
                          class="w-full h-full"
                          :style="{
                            backgroundImage: `url(${generatedCoverImageSrc})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }"
                        ></div>
                      </template>
                      <template
                        v-else-if="
                          currentArticle?.images &&
                          currentArticle.images.length > 0
                        "
                      >
                        <img
                          :src="
                            getImageUrl(
                              currentArticle.images[selectedCoverIndex]?.path ||
                                currentArticle.images[0].path,
                            )
                          "
                          class="w-full h-full object-cover"
                        />
                      </template>
                    </div>
                  </button>
                </div>

                <!-- 1:1 缩略图 -->
                <div class="relative">
                  <div class="aspect-[2.35/1] w-16"></div>
                  <button
                    @click="selectedCoverRatio = '11'"
                    class="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-lg overflow-hidden border-2 transition-all hover:border-primary"
                    :class="[
                      selectedCoverRatio === '11'
                        ? 'border-primary ring-2 ring-primary/30 scale-105'
                        : 'border-slate-200 opacity-70 hover:opacity-100',
                    ]"
                    style="aspect-ratio: 1 / 1; height: 100%"
                  >
                    <div class="w-full h-full bg-slate-100">
                      <template
                        v-if="
                          currentArticle?.coverConfig.templateId &&
                          generatedCoverImageSrc
                        "
                      >
                        <div
                          class="w-full h-full"
                          :style="{
                            backgroundImage: `url(${generatedCoverImageSrc})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }"
                        ></div>
                      </template>
                      <template
                        v-else-if="
                          currentArticle?.images &&
                          currentArticle.images.length > 0
                        "
                      >
                        <img
                          :src="
                            getImageUrl(
                              currentArticle.images[selectedCoverIndex]?.path ||
                                currentArticle.images[0].path,
                            )
                          "
                          class="w-full h-full object-cover"
                        />
                      </template>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- 标题和摘要 -->
            <div class="mt-8">
              <h1 class="text-base font-bold text-slate-900 mb-1">
                {{ batchStore.currentArticleFinalTitle || "标题加载中..." }}
              </h1>
              <p class="text-xs text-slate-400">
                {{ currentArticle?.titleConfig.subtitle || "摘要加载中..." }}
              </p>
            </div>
          </div>
        </template>

        <template v-else>
          <h1
            class="text-[22px] font-bold mb-3 leading-snug text-slate-900"
            id="preview-title"
          >
            {{ batchStore.currentArticleFinalTitle || "标题加载中..." }}
          </h1>
          <div
            class="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium"
          >
            <span class="text-[#576b95]">{{ wechatOfficialAccountName }}</span>
          </div>

          <div
            class="text-[15px] leading-relaxed text-slate-600 mb-8"
            id="preview-summary"
          >
            {{ currentArticle?.titleConfig.subtitle || "摘要加载中..." }}
          </div>

          <div id="preview-article" class="space-y-6">
            <template v-if="currentArticle">
              <template v-if="currentTemplateId === 'flow'">
                <div
                  v-for="img in currentArticle.images"
                  :key="img.id"
                  class="w-full mb-3"
                >
                  <img
                    :src="getImageUrl(img.path)"
                    :alt="img.name"
                    class="w-full rounded-[4px] object-cover"
                    loading="lazy"
                    @error="
                      (e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }
                    "
                  />
                </div>
              </template>
              <template v-else-if="currentTemplateId === 'card'">
                <div
                  v-for="(img, idx) in currentArticle.images"
                  :key="img.id"
                  class="w-full p-3.5 bg-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] rounded-[1.5rem] mb-6 border border-slate-100 flex flex-col items-center"
                >
                  <img
                    :src="getImageUrl(img.path)"
                    :alt="img.name"
                    class="w-full aspect-square rounded-[1rem] object-cover mb-3"
                    loading="lazy"
                    @error="
                      (e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }
                    "
                  />
                  <span
                    class="text-[10px] text-slate-300 font-mono tracking-wider italic"
                  >
                    FIG. {{ String(idx + 1).padStart(2, "0") }}
                  </span>
                </div>
              </template>
              <template v-else-if="currentTemplate">
                <div v-html="processedTemplateHtml"></div>
              </template>
            </template>
          </div>
          <div class="mt-16 mb-8 text-center text-slate-400 text-xs">
            — 预览到底部了 —
          </div>
        </template>
      </PhoneMockup>
    </div>

    <!-- 右栏：配置面板 -->
    <div
      class="w-full lg:w-80 bg-white border-l border-slate-200 h-1/2 lg:h-full overflow-y-auto flex-shrink-0 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)] z-10"
    >
      <div class="p-4 border-b border-slate-100 sticky top-0 bg-white z-20">
        <div class="flex bg-slate-100 rounded-lg p-0.5">
          <button
            class="flex-1 py-2 text-xs font-medium rounded-md transition-all"
            :class="[
              batchStore.configMode === 'global'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ]"
            @click="batchStore.setConfigMode('global')"
          >
            全局设置
          </button>
          <button
            class="flex-1 py-2 text-xs font-medium rounded-md transition-all"
            :class="[
              batchStore.configMode === 'article'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ]"
            @click="batchStore.setConfigMode('article')"
          >
            当前文章
          </button>
        </div>

        <div class="flex mt-3 border-b border-slate-200">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="flex-1 pb-2 text-xs font-medium border-b-2 transition-all"
            :class="[
              batchStore.configTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-600',
            ]"
            @click="batchStore.setConfigTab(tab.value as any)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="p-5 flex flex-col gap-6 flex-1">
        <!-- 全局设置 - 标题 -->
        <template
          v-if="
            batchStore.configMode === 'global' &&
            batchStore.configTab === 'title'
          "
        >
          <GlobalTitleConfig
            :config="batchStore.globalConfig.title"
            @update:config="batchStore.setGlobalTitleConfig"
          />
        </template>

        <!-- 全局设置 - 封面 -->
        <template
          v-else-if="
            batchStore.configMode === 'global' &&
            batchStore.configTab === 'cover'
          "
        >
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-1.5 h-4 bg-primary rounded-full"></span>
              <label class="text-sm font-bold text-slate-800"
                >全局封面规则</label
              >
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-500 mb-2"
                >封面模板</label
              >
              <div
                class="border-2 border-slate-200 rounded-xl p-3 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition"
                @click="showCoverTemplateSelector = true"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden"
                  >
                    <template v-if="batchStore.globalConfig.cover.templateId">
                      <div
                        class="w-full h-full flex items-center justify-center p-1"
                      >
                        <svg
                          class="w-6 h-6 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                          ></path>
                        </svg>
                      </div>
                    </template>
                    <template v-else>
                      <svg
                        class="w-6 h-6 text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M12 4v16m8-8H4"
                        ></path>
                      </svg>
                    </template>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-bold text-slate-700">
                      {{ globalCoverTemplateName || "未选择封面模板" }}
                    </p>
                    <p class="text-xs text-slate-400">
                      {{
                        batchStore.globalConfig.cover.templateId
                          ? "点击更换模板"
                          : "点击选择封面模板"
                      }}
                    </p>
                  </div>
                  <svg
                    class="w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>

            <div v-if="globalGeneratedCoverImageSrc">
              <label class="block text-xs font-medium text-slate-500 mb-2"
                >封面预览</label
              >
              <div
                class="aspect-[2.35/1] w-full rounded-2xl overflow-hidden bg-slate-100 relative"
              >
                <div
                  class="w-full h-full"
                  :style="{
                    backgroundImage: `url(${globalGeneratedCoverImageSrc})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }"
                ></div>
                <button
                  @click="openGlobalCoverCropTool('235')"
                  class="absolute top-2 right-2 px-3 py-1.5 text-xs bg-black/60 text-white rounded-lg hover:bg-black/80 transition flex items-center gap-1"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    ></path>
                  </svg>
                  裁剪
                </button>
              </div>
            </div>

            <div v-if="batchStore.globalConfig.cover.templateId">
              <button
                @click="showCoverImageIndexSelector = true"
                class="w-full py-2.5 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition flex items-center justify-center gap-2"
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                选择封面图片序号
              </button>
              <div
                v-if="
                  batchStore.globalConfig.cover.coverImageIndices &&
                  batchStore.globalConfig.cover.coverImageIndices.length > 0
                "
                class="mt-2 text-xs text-slate-500"
              >
                已选序号:
                {{ batchStore.globalConfig.cover.coverImageIndices.join(", ") }}
              </div>
            </div>

            <p class="text-[10px] text-slate-400 leading-relaxed">
              全部文章将统一使用此封面模板生成封面图，按顺序使用各文章的图片素材。
            </p>
          </div>
        </template>

        <!-- 全局设置 - 排版 -->
        <template
          v-else-if="
            batchStore.configMode === 'global' &&
            batchStore.configTab === 'layout'
          "
        >
          <GlobalLayoutConfig
            :config="batchStore.globalConfig.layout"
            @update:config="batchStore.setGlobalLayoutConfig"
            @open-template-manager="showTemplateModal = true"
          />
        </template>

        <!-- 当前文章 - 标题 -->
        <template
          v-else-if="
            batchStore.configMode === 'article' &&
            batchStore.configTab === 'title' &&
            currentArticle
          "
        >
          <ArticleTitleConfig
            :config="currentArticle.titleConfig"
            :global-config="batchStore.globalConfig.title"
            :article-index="batchStore.currentArticleIndex"
            @update:config="batchStore.updateCurrentArticleTitleConfig"
          />
        </template>

        <!-- 当前文章 - 封面 -->
        <template
          v-else-if="
            batchStore.configMode === 'article' &&
            batchStore.configTab === 'cover' &&
            currentArticle
          "
        >
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-1.5 h-4 bg-slate-400 rounded-full"></span>
              <label class="text-sm font-bold text-slate-800"
                >当前文章封面</label
              >
            </div>
            <div
              class="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200"
            >
              <label class="text-xs font-medium text-slate-600"
                >继承全局封面</label
              >
              <button
                :class="[
                  'w-11 h-6 rounded-full transition-colors relative',
                  currentArticle.coverConfig.inheritGlobal
                    ? 'bg-primary'
                    : 'bg-slate-300',
                ]"
                @click="toggleInheritGlobalCover"
              >
                <span
                  :class="[
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                    currentArticle.coverConfig.inheritGlobal
                      ? 'left-6'
                      : 'left-1',
                  ]"
                ></span>
              </button>
            </div>

            <template v-if="!currentArticle.coverConfig.inheritGlobal">
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-2"
                  >封面模板</label
                >
                <div
                  class="border-2 border-slate-200 rounded-xl p-3 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition"
                  @click="showArticleCoverTemplateSelector = true"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden"
                    >
                      <template v-if="currentArticle.coverConfig.templateId">
                        <div
                          class="w-full h-full flex items-center justify-center p-1"
                        >
                          <svg
                            class="w-6 h-6 text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            ></path>
                          </svg>
                        </div>
                      </template>
                      <template v-else>
                        <svg
                          class="w-6 h-6 text-slate-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M12 4v16m8-8H4"
                          ></path>
                        </svg>
                      </template>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-bold text-slate-700">
                        {{
                          currentArticleCoverTemplateName || "未选择封面模板"
                        }}
                      </p>
                      <p class="text-xs text-slate-400">
                        {{
                          currentArticle.coverConfig.templateId
                            ? "点击更换模板"
                            : "点击选择封面模板"
                        }}
                      </p>
                    </div>
                    <svg
                      class="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      ></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div v-if="currentArticleGeneratedCoverImageSrc">
                <label class="block text-xs font-medium text-slate-500 mb-2"
                  >封面预览</label
                >
                <div
                  class="aspect-[2.35/1] w-full rounded-2xl overflow-hidden bg-slate-100 relative"
                >
                  <div
                    class="w-full h-full"
                    :style="{
                      backgroundImage: `url(${currentArticleGeneratedCoverImageSrc})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }"
                  ></div>
                  <button
                    @click="openArticleCoverCropTool('235')"
                    class="absolute top-2 right-2 px-3 py-1.5 text-xs bg-black/60 text-white rounded-lg hover:bg-black/80 transition flex items-center gap-1"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      ></path>
                    </svg>
                    裁剪
                  </button>
                </div>
              </div>

              <button
                class="w-full py-2.5 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition flex items-center justify-center gap-2"
                @click="showCoverImageSelector = true"
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                选择封面图片
              </button>
            </template>
          </div>
        </template>

        <!-- 当前文章 - 排版 -->
        <template
          v-else-if="
            batchStore.configMode === 'article' &&
            batchStore.configTab === 'layout' &&
            currentArticle
          "
        >
          <ArticleLayoutConfig
            :config="currentArticle.layoutConfig"
            :images="currentArticle.images"
            @update:config="batchStore.updateCurrentArticleLayoutConfig"
            @open-image-manager="showImageManagerDrawer = true"
            @open-template-manager="showTemplateModal = true"
          />
        </template>

        <div class="flex-1"></div>

        <div class="grid grid-cols-2 gap-3 sticky bottom-0 bg-white pt-2">
          <button
            class="w-full bg-slate-100 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-200 transition text-sm"
            @click="$router.push('/setup')"
          >
            上一步
          </button>
          <button
            class="w-full bg-slate-800 text-white font-medium py-3 rounded-xl shadow-md hover:bg-slate-700 transition text-sm flex items-center justify-center gap-1"
            @click="$router.push('/sync')"
          >
            确认发布
            <svg
              class="w-4 h-4 relative top-px"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <ModalTemplate
      :visible="showTemplateModal"
      @close="showTemplateModal = false"
    />

    <ModalCoverTemplate
      :visible="showCoverTemplateManager"
      @close="showCoverTemplateManager = false"
    />

    <ImageManagerDrawer
      :visible="showImageManagerDrawer"
      :images="currentArticle?.images || []"
      @close="showImageManagerDrawer = false"
      @update:images="handleUpdateArticleImages"
    />

    <CoverImageSelectorDrawer
      :visible="showCoverImageSelector"
      :images="(currentArticle?.images as any) || []"
      :selected-image-ids="currentArticle?.coverConfig.selectedImageIds || []"
      :required-count="currentArticleCoverTemplateImageCount"
      :get-image-url="getImageUrl"
      @close="showCoverImageSelector = false"
      @update:selected-image-ids="
        (ids) => {
          if (currentArticle) {
            batchStore.updateCurrentArticleCoverConfig({
              selectedImageIds: ids,
            });
          }
        }
      "
    />

    <CoverImageIndexSelectorDrawer
      :visible="showCoverImageIndexSelector"
      :initial-indices="batchStore.globalConfig.cover.coverImageIndices || []"
      :required-image-count="globalCoverTemplateImageCount"
      :total-image-count="currentArticle?.images?.length || 0"
      @close="showCoverImageIndexSelector = false"
      @confirm="handleConfirmCoverImageIndices"
    />

    <ModalCoverTemplateSelector
      :visible="showCoverTemplateSelector"
      :current-template-id="batchStore.globalConfig.cover.templateId"
      @close="showCoverTemplateSelector = false"
      @select="handleCoverTemplateSelect"
      @open-cover-template="
        showCoverTemplateSelector = false;
        showCoverTemplateManager = true;
      "
    />

    <ModalCoverTemplateSelector
      :visible="showArticleCoverTemplateSelector"
      :current-template-id="currentArticle?.coverConfig.templateId"
      @close="showArticleCoverTemplateSelector = false"
      @select="handleArticleCoverTemplateSelect"
      @open-cover-template="
        showArticleCoverTemplateSelector = false;
        showCoverTemplateManager = true;
      "
    />

    <CoverCropTool
      :visible="showCoverCropTool"
      :image-src="
        isCropModeGlobal ? globalGeneratedCoverImageSrc : generatedCoverImageSrc
      "
      :initial-crop-235="
        isCropModeGlobal
          ? batchStore.globalConfig.cover.pic_crop_235_1
          : currentArticle?.coverConfig.pic_crop_235_1
      "
      :initial-crop-11="
        isCropModeGlobal
          ? batchStore.globalConfig.cover.pic_crop_1_1
          : currentArticle?.coverConfig.pic_crop_1_1
      "
      :initial-ratio="targetCropRatio"
      @close="showCoverCropTool = false"
      @confirm="handleCoverCropConfirm"
    />

    <!-- 调试日志区域 -->
    <div
      class="fixed bottom-4 left-4 w-80 max-h-48 overflow-y-auto bg-slate-900/90 text-white text-xs p-3 rounded-lg shadow-2xl z-40 font-mono backdrop-blur-sm"
      v-if="debugLogs.length > 0 && showDebugLogs"
    >
      <div
        class="flex justify-between items-center mb-2 sticky top-0 bg-slate-900/90 pb-1 border-b border-slate-700"
      >
        <span class="font-bold">调试日志</span>
        <div class="flex gap-1">
          <button
            @click="showDebugLogs = false"
            class="text-slate-400 hover:text-white"
            title="隐藏"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 15l7-7 7 7"
              ></path>
            </svg>
          </button>
          <button
            @click="debugLogs = []"
            class="text-slate-400 hover:text-white"
            title="清空"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              ></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="space-y-0.5 text-[10px]">
        <div
          v-for="(log, idx) in debugLogs.slice(-30)"
          :key="idx"
          class="truncate"
          :class="{
            'text-green-400': log.includes('成功') || log.includes('完成'),
            'text-red-400': log.includes('失败') || log.includes('错误'),
            'text-yellow-400': log.includes('警告') || log.includes('warn'),
            'text-blue-400': log.includes('开始') || log.includes('选择'),
          }"
        >
          {{ log }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useProjectStore } from "../stores/project";
import { useTemplateStore } from "../stores/template";
import { useCoverTemplateStore } from "../stores/coverTemplate";
import { useBatchTypesetStore } from "../stores/batchTypeset";
import { useWechatAccountStore } from "../stores/wechatAccount";
import PhoneMockup from "../components/common/PhoneMockup.vue";
import ModalTemplate from "../components/layout/ModalTemplate.vue";
import ModalCoverTemplate from "../components/layout/ModalCoverTemplate.vue";
import ModalCoverTemplateSelector from "../components/layout/ModalCoverTemplateSelector.vue";
import CoverImageSelectorDrawer from "../components/common/CoverImageSelectorDrawer.vue";
import CoverImageIndexSelectorDrawer from "../components/common/CoverImageIndexSelectorDrawer.vue";
import CoverCropTool from "../components/common/CoverCropTool.vue";
import GlobalTitleConfig from "../components/typeset/GlobalTitleConfig.vue";
import ArticleTitleConfig from "../components/typeset/ArticleTitleConfig.vue";

// 调试日志
const debugLogs = ref<string[]>([]);
const showDebugLogs = ref(false);
function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  debugLogs.value.push(`[${timestamp}] ${message}`);
  // 保留最近 50 条日志
  if (debugLogs.value.length > 50) {
    debugLogs.value = debugLogs.value.slice(-50);
  }
}
import GlobalLayoutConfig from "../components/typeset/GlobalLayoutConfig.vue";
import ArticleLayoutConfig from "../components/typeset/ArticleLayoutConfig.vue";
import ImageManagerDrawer from "../components/typeset/ImageManagerDrawer.vue";
import type { ImageFile } from "../types";

const projectStore = useProjectStore();
const templateStore = useTemplateStore();
const coverTemplateStore = useCoverTemplateStore();
const batchStore = useBatchTypesetStore();
const wechatAccountStore = useWechatAccountStore();

const showTemplateModal = ref(false);
const showCoverTemplateManager = ref(false);
const showCoverTemplateSelector = ref(false);
const showArticleCoverTemplateSelector = ref(false);
const showCoverImageSelector = ref(false);
const showCoverImageIndexSelector = ref(false);
const showCoverCropTool = ref(false);
const showImageManagerDrawer = ref(false);
const selectedCoverIndex = ref(0);
const selectedCoverRatio = ref<"235" | "11">("235");
const coverImageHeight = ref(0);
const coverImageRef = ref<HTMLDivElement>();
const isCropModeGlobal = ref(false);
const targetCropRatio = ref<"235" | "11">("235");

const tabs = [
  { label: "标题", value: "title" },
  { label: "封面", value: "cover" },
  { label: "排版", value: "layout" },
];

const previewModes = [
  { label: "封面", value: "cover" },
  { label: "正文", value: "content" },
];

const currentArticle = computed(() => batchStore.currentArticle);

const wechatOfficialAccountName = computed(() => {
  return wechatAccountStore.activeAccount?.nickname || "微信公众号配置名称";
});

const currentTemplateId = computed(() => {
  if (!currentArticle.value) return "flow";
  if (
    !currentArticle.value.layoutConfig.inheritGlobal &&
    currentArticle.value.layoutConfig.templateId
  ) {
    return currentArticle.value.layoutConfig.templateId;
  }
  return batchStore.globalConfig.layout.templateId;
});

const currentTemplate = computed(() => {
  if (
    !currentTemplateId.value ||
    currentTemplateId.value === "flow" ||
    currentTemplateId.value === "card"
  ) {
    return null;
  }
  return (
    templateStore.customTemplates.find(
      (t) => t.id === currentTemplateId.value,
    ) || null
  );
});

const globalCoverTemplateName = computed(() => {
  const tid = batchStore.globalConfig.cover.templateId;
  if (!tid) return "";
  const tpl = coverTemplateStore.coverTemplates.find((t) => t.id === tid);
  return tpl?.name || "未知模板";
});

// 通用工具函数：获取封面模板需要的图片数量
function getCoverTemplateImageCount(templateId: string): number {
  if (!templateId) return 0;
  const template = coverTemplateStore.coverTemplates.find(
    (t) => t.id === templateId,
  );
  if (!template) return 0;

  const html = template.html;

  // 方式 1：计算 img 标签数量
  const imgRegex = /<img[^>]*>/gi;
  const imgMatches = html.match(imgRegex);
  const imgCount = imgMatches ? imgMatches.length : 0;

  // 方式 2：计算 background-image 数量（检查是否包含占位图 URL）
  const bgImageRegex = /background-image:\s*url\(['"]?[^'")\s]+['"]?\)/gi;
  const bgMatches = html.match(bgImageRegex);
  const bgCount = bgMatches ? bgMatches.length : 0;

  // 返回总数（img + background-image）
  return imgCount + bgCount;
}

const globalCoverTemplateImageCount = computed(() => {
  return getCoverTemplateImageCount(
    batchStore.globalConfig.cover.templateId || "",
  );
});

function handleConfirmCoverImageIndices(indices: number[]) {
  batchStore.setGlobalCoverConfig({
    coverImageIndices: indices,
  });
  batchStore.updateArticlesCoverImagesByIndices();
}

const currentArticleCoverTemplateName = computed(() => {
  const tid = currentArticle.value?.coverConfig.templateId;
  if (!tid) return "";
  const tpl = coverTemplateStore.coverTemplates.find((t) => t.id === tid);
  return tpl?.name || "未知模板";
});

const currentArticleCoverTemplateImageCount = computed(() => {
  return getCoverTemplateImageCount(
    currentArticle.value?.coverConfig.templateId || "",
  );
});

// 生成封面预览图（使用选中的模板和图片）
const generatedCoverImageSrc = ref<string>("");
const globalGeneratedCoverImageSrc = ref<string>("");

// 当前文章封面预览（计算属性）
const currentArticleGeneratedCoverImageSrc = computed(() => {
  if (batchStore.configMode === "article" && currentArticle.value) {
    // 优先使用已生成的封面图
    if (currentArticle.value.coverConfig.generatedCoverImage) {
      return currentArticle.value.coverConfig.generatedCoverImage;
    }
    // 否则使用实时生成的封面图
    return generatedCoverImageSrc.value;
  }
  return "";
});

// 生成封面图的通用函数
async function generateCoverImage(
  templateId: string,
  selectedImageIds: string[],
  images: any[],
): Promise<string> {
  const template = coverTemplateStore.coverTemplates.find(
    (t) => t.id === templateId,
  );
  if (!template) {
    addLog("警告：封面模板不存在：" + templateId);
    return "";
  }

  if (!selectedImageIds || selectedImageIds.length === 0) {
    addLog("警告：没有选中的图片");
    return "";
  }

  addLog(
    "开始生成封面图：" +
      JSON.stringify({
        templateId,
        selectedImageIds,
        imagesCount: images.length,
      }),
  );

  // 将模板中的占位图替换为选中的图片
  let html = template.html;

  // 创建临时 div 来渲染 HTML
  const tempDiv = document.createElement("div");
  tempDiv.style.width = "2350px";
  tempDiv.style.height = "1000px";
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "-9999px";
  tempDiv.innerHTML = html;

  // 方式 1：替换 img 标签的 src 属性
  const imgElements = tempDiv.querySelectorAll("img");
  addLog("模板中的 img 标签数量：" + imgElements.length);

  imgElements.forEach((img, idx) => {
    if (idx < selectedImageIds.length) {
      const imageId = selectedImageIds[idx];
      const image = images.find((i) => i.id === imageId);
      if (image) {
        const imgUrl = getImageUrl(image.path);
        addLog(`替换 img ${idx}: ${imageId} -> ${imgUrl.substring(0, 50)}...`);
        img.setAttribute("src", imgUrl);
      } else {
        addLog("警告：找不到图片：" + imageId);
      }
    }
  });

  // 方式 2：替换 background-image 的 url（直接解析 style 属性）
  const allElements = tempDiv.querySelectorAll("*");
  let bgImageCount = 0;
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const styleAttr = htmlEl.getAttribute("style") || "";

    // 检查是否包含占位图 URL
    if (
      styleAttr.includes("background-image") &&
      styleAttr.includes("maque.toai.art/static/emoji/default_bz.png")
    ) {
      const imageIndex = bgImageCount;
      if (imageIndex < selectedImageIds.length) {
        const imageId = selectedImageIds[imageIndex];
        const image = images.find((i) => i.id === imageId);
        if (image) {
          const imgUrl = getImageUrl(image.path);
          addLog(
            `替换 background-image ${imageIndex}: ${imageId} -> ${imgUrl.substring(0, 50)}...`,
          );
          // 替换 style 属性中的 background-image url
          const newStyle = styleAttr.replace(
            /background-image:\s*url\(['"]?[^'")\s]+['"]?\)/gi,
            `background-image: url('${imgUrl}')`,
          );
          htmlEl.setAttribute("style", newStyle);
          bgImageCount++;
        } else {
          addLog("警告：找不到图片：" + imageId);
        }
      }
    }
  });

  addLog("选中的图片数量：" + selectedImageIds.length);
  addLog(
    "总共替换的图片数量：img=" +
      imgElements.length +
      ", background-image=" +
      bgImageCount,
  );

  document.body.appendChild(tempDiv);

  try {
    // 等待图片加载完成
    await Promise.all(
      Array.from(tempDiv.querySelectorAll("img")).map(
        (img) =>
          new Promise((resolve, reject) => {
            if (img.complete) {
              resolve(true);
            } else {
              img.onload = () => resolve(true);
              img.onerror = () => reject(new Error("图片加载失败"));
            }
          }),
      ),
    );

    addLog("所有图片加载完成，开始生成 canvas");

    // 使用 html2canvas 生成图片
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(tempDiv, {
      width: 2350,
      height: 1000,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });

    const dataUrl = canvas.toDataURL("image/png");
    addLog("封面图生成成功：" + dataUrl.substring(0, 50) + "...");
    return dataUrl;
  } catch (error) {
    addLog("错误：生成封面图失败：" + (error as Error).message);
    // 降级显示第一张图片
    if (selectedImageIds.length > 0) {
      const firstImage = images.find((i) => i.id === selectedImageIds[0]);
      if (firstImage) {
        const fallbackUrl = getImageUrl(firstImage.path);
        addLog("降级显示第一张图片：" + fallbackUrl.substring(0, 50) + "...");
        return fallbackUrl;
      }
    }
    return "";
  } finally {
    document.body.removeChild(tempDiv);
  }
}

// 监听当前文章索引变化，更新封面预览
watch(
  () => batchStore.currentArticleIndex,
  () => {
    addLog("切换文章，索引：" + batchStore.currentArticleIndex);

    if (currentArticle.value) {
      // 优先使用已生成的封面图
      const generatedCover =
        currentArticle.value.coverConfig.generatedCoverImage;
      if (generatedCover) {
        addLog("使用已生成的封面图");
        generatedCoverImageSrc.value = generatedCover;
      } else if (currentArticle.value.coverConfig.templateId) {
        // 如果没有已生成的封面图但有模板，重新生成
        addLog("没有已生成的封面图，重新生成...");
        generateCoverImage(
          currentArticle.value.coverConfig.templateId,
          currentArticle.value.coverConfig.selectedImageIds,
          currentArticle.value.images,
        ).then((coverImage) => {
          generatedCoverImageSrc.value = coverImage;
        });
      } else {
        addLog("没有封面模板，清空预览");
        generatedCoverImageSrc.value = "";
      }

      // 同时更新全局封面预览
      if (batchStore.configMode === "global" && generatedCover) {
        globalGeneratedCoverImageSrc.value = generatedCover;
        addLog("全局封面预览已更新");
      }
    }
  },
);

// 监听文章封面配置变化，重新生成封面图
watch(
  () => ({
    templateId: currentArticle.value?.coverConfig.templateId,
    selectedImageIds:
      currentArticle.value?.coverConfig.selectedImageIds?.join(","),
    imagesLength: currentArticle.value?.images?.length,
  }),
  async (newVal) => {
    addLog("封面配置变化：" + JSON.stringify(newVal));

    if (!newVal.templateId) {
      addLog("没有封面模板，清空预览");
      generatedCoverImageSrc.value = "";
      return;
    }

    // 检查已选择的图片是否仍然存在
    const selectedIds =
      currentArticle.value?.coverConfig.selectedImageIds || [];
    const availableImageIds =
      currentArticle.value?.images.map((img) => img.id) || [];
    const missingIds = selectedIds.filter(
      (id) => !availableImageIds.includes(id),
    );

    if (missingIds.length > 0) {
      addLog("有图片缺失，需要重新选择：" + JSON.stringify(missingIds));
      // 有图片被删除了，需要重新选择
      const remainingIds = selectedIds.filter((id) =>
        availableImageIds.includes(id),
      );
      const newImagesNeeded =
        currentArticleCoverTemplateImageCount.value - remainingIds.length;

      if (newImagesNeeded > 0 && currentArticle.value) {
        // 从剩余图片中补充
        const additionalIds = currentArticle.value.images
          .filter((img) => !remainingIds.includes(img.id))
          .slice(0, newImagesNeeded)
          .map((img) => img.id);

        batchStore.updateCurrentArticleCoverConfig({
          selectedImageIds: [...remainingIds, ...additionalIds],
        });
        return;
      }
    }

    if (currentArticle.value) {
      // 优先使用已生成的封面图
      const generatedCover =
        currentArticle.value.coverConfig.generatedCoverImage;
      if (generatedCover) {
        addLog("使用已生成的封面图");
        generatedCoverImageSrc.value = generatedCover;
      } else {
        addLog("开始生成封面预览图...");
        generatedCoverImageSrc.value = await generateCoverImage(
          currentArticle.value.coverConfig.templateId,
          currentArticle.value.coverConfig.selectedImageIds,
          currentArticle.value.images,
        );
        addLog(
          "封面预览图生成完成：" +
            (generatedCoverImageSrc.value ? "成功" : "失败"),
        );
      }
    }
  },
  { immediate: true, deep: true },
);

// 监听全局封面配置变化，重新生成全局封面图
watch(
  () => ({
    templateId: batchStore.globalConfig.cover.templateId,
    coverImageIndices:
      batchStore.globalConfig.cover.coverImageIndices?.join(","),
  }),
  async (newVal) => {
    if (!newVal.templateId) {
      globalGeneratedCoverImageSrc.value = "";
      return;
    }
    // 全局封面使用当前文章的图片作为演示
    if (currentArticle.value) {
      const coverImageIndices = batchStore.globalConfig.cover.coverImageIndices;
      let selectedImageIds: string[] = [];

      if (coverImageIndices && coverImageIndices.length > 0) {
        // 根据序号选择图片
        selectedImageIds = coverImageIndices
          .map((index) => currentArticle.value?.images[index - 1]?.id)
          .filter((id) => id !== undefined);
      } else {
        // 默认使用前 N 张图片（根据模板需要的图片数量）
        const imageCount = getCoverTemplateImageCount(
          batchStore.globalConfig.cover.templateId,
        );
        selectedImageIds = currentArticle.value.images
          .slice(0, imageCount)
          .map((img) => img.id);
      }

      globalGeneratedCoverImageSrc.value = await generateCoverImage(
        batchStore.globalConfig.cover.templateId,
        selectedImageIds,
        currentArticle.value.images,
      );
    }
  },
  { immediate: true, deep: true },
);

const processedTemplateHtml = computed(() => {
  if (!currentTemplate.value || !currentArticle.value) return "";
  const templateHtml = currentTemplate.value.html;
  const images = currentArticle.value.images;

  if (images.length === 0) return templateHtml;

  // 首先检查模板中是否有 img 标签
  const imgTagRegex = /<img[^>]*>/gi;
  const hasImgTags = imgTagRegex.test(templateHtml);

  // 如果有 img 标签，使用新的替换逻辑
  if (hasImgTags) {
    let resultHtml = templateHtml;
    let imageIdx = 0;

    // 使用全局替换函数，逐个替换 img 标签的 src
    resultHtml = resultHtml.replace(imgTagRegex, (imgTag) => {
      if (imageIdx < images.length) {
        const imgUrl = getImageUrl(images[imageIdx].path);
        imageIdx++;
        // 替换 src 属性
        return imgTag.replace(/src\s*=\s*(['"])[^'"]*\1/, `src="${imgUrl}"`);
      }
      return imgTag;
    });

    // 如果图片数量超过模板中的 img 标签数量，重复填充
    if (images.length > 0) {
      const imgTagCount = (templateHtml.match(imgTagRegex) || []).length;
      if (imgTagCount > 0) {
        const fullBlocks = Math.floor(images.length / imgTagCount);
        let finalHtml = "";
        let currentImageIdx = 0;

        for (let i = 0; i < fullBlocks; i++) {
          let blockHtml = templateHtml;
          let blockImageIdx = 0;

          blockHtml = blockHtml.replace(imgTagRegex, (imgTag) => {
            if (currentImageIdx + blockImageIdx < images.length) {
              const imgUrl = getImageUrl(
                images[currentImageIdx + blockImageIdx].path,
              );
              blockImageIdx++;
              return imgTag.replace(
                /src\s*=\s*(['"])[^'"]*\1/,
                `src="${imgUrl}"`,
              );
            }
            return imgTag;
          });

          finalHtml += blockHtml;
          currentImageIdx += imgTagCount;
        }

        return finalHtml || resultHtml;
      }
    }

    return resultHtml;
  }

  // 如果没有 img 标签，使用原来的方法（兼容旧模板）
  const placeholderMatch = templateHtml.match(
    /https:\/\/toai\.art\/b\d+\.png/g,
  );
  const placeholderCount = placeholderMatch ? placeholderMatch.length : 0;

  if (placeholderCount === 0) return templateHtml;

  let finalHtml = "";
  let imageIdx = 0;
  const fullBlocks = Math.floor(images.length / placeholderCount);
  const remainingImages = images.length % placeholderCount;

  // 生成完整块
  for (let i = 0; i < fullBlocks; i++) {
    let blockHtml = templateHtml;
    blockHtml = blockHtml.replace(/https:\/\/toai\.art\/b\d+\.png/g, () => {
      const imgUrl = getImageUrl(images[imageIdx].path);
      imageIdx++;
      return imgUrl;
    });
    finalHtml += blockHtml;
  }

  // 如果有剩余图片，生成最后一个块
  if (remainingImages > 0) {
    const placeholderRegex = /https:\/\/toai\.art\/b\d+\.png/g;
    const parts: string[] = [];
    let lastIndex = 0;
    let match;

    placeholderRegex.lastIndex = 0;

    while ((match = placeholderRegex.exec(templateHtml)) !== null) {
      parts.push(templateHtml.slice(lastIndex, match.index));
      parts.push(match[0]);
      lastIndex = match.index + match[0].length;
    }
    parts.push(templateHtml.slice(lastIndex));

    const keepCount = 2 * remainingImages + 1;
    const keptParts = parts.slice(0, keepCount);

    let finalBlockHtml = "";
    let placeholderIdx = 0;

    for (let i = 0; i < keptParts.length; i++) {
      const part = keptParts[i];
      if (part.match(placeholderRegex)) {
        if (placeholderIdx < remainingImages && imageIdx < images.length) {
          const imgUrl = getImageUrl(images[imageIdx].path);
          imageIdx++;
          placeholderIdx++;
          finalBlockHtml += imgUrl;
        }
      } else {
        finalBlockHtml += part;
      }
    }

    finalHtml += finalBlockHtml;
  }

  return finalHtml;
});

onMounted(() => {
  generateArticlesFromProject();
  templateStore.loadTemplates();
  coverTemplateStore.loadCoverTemplates();
  wechatAccountStore.loadAccounts();
  nextTick(() => {
    if (coverImageRef.value) {
      coverImageHeight.value = coverImageRef.value.offsetHeight;
    }
  });
});

function generateArticlesFromProject() {
  const articleData: Array<{
    id: string;
    images: Array<{ id: string; path: string; name: string }>;
  }> = [];

  if (
    projectStore.currentProject?.groups &&
    projectStore.currentProject.groups.length > 0
  ) {
    projectStore.currentProject.groups.forEach((group) => {
      articleData.push({
        id: group.groupId,
        images: group.images.map((img: ImageFile) => ({
          id: img.id,
          path: img.path,
          name: img.name,
        })),
      });
    });
  } else if (projectStore.currentProject?.images) {
    const countPerArticle = 9;
    const images = projectStore.currentProject.images;

    for (let i = 0; i < images.length; i += countPerArticle) {
      const chunk = images.slice(i, i + countPerArticle);
      articleData.push({
        id: `article_${articleData.length + 1}`,
        images: chunk.map((img: ImageFile) => ({
          id: img.id,
          path: img.path,
          name: img.name,
        })),
      });
    }
  }

  batchStore.initArticles(articleData);
  batchStore.updateArticlesCoverImagesByIndices();
}

function getArticleDisplayTitle(article: any, index: number): string {
  if (article.titleConfig.inheritGlobal) {
    const config = batchStore.globalConfig.title;
    const numbering = batchStore.generateNumbering(
      index + 1,
      config.numberingRule,
    );
    return `${config.prefix}${config.separator}${numbering}`.trim();
  }
  return article.titleConfig.title || "未设置标题";
}

watch(selectedCoverIndex, async (newIndex) => {
  if (newIndex === 0) {
    await nextTick();
    if (coverImageRef.value) {
      coverImageHeight.value = coverImageRef.value.offsetHeight;
    }
  }
});

function handleUpdateArticleImages(images: any[]) {
  if (currentArticle.value) {
    batchStore.updateCurrentArticleImages(images);
  }
}

function toggleInheritGlobalCover() {
  if (currentArticle.value) {
    batchStore.updateCurrentArticleCoverConfig({
      inheritGlobal: !currentArticle.value.coverConfig.inheritGlobal,
    });
  }
}

async function handleCoverTemplateSelect(templateId: string) {
  addLog("=== 选择全局封面模板：" + templateId + " ===");

  if (!templateId) {
    addLog("错误：全局封面模板 ID 为空");
    return;
  }

  // 获取模板需要的图片数量
  const imageCount = getCoverTemplateImageCount(templateId);
  addLog("模板需要的图片数量：" + imageCount);

  // 默认按顺序选择前 N 张图片的序号
  const defaultIndices = Array.from({ length: imageCount }, (_, i) => i + 1);
  addLog("默认图片序号：" + JSON.stringify(defaultIndices));

  // 设置全局封面配置（包括模板 ID 和图片序号）
  batchStore.setGlobalCoverConfig({
    templateId,
    coverImageIndices: defaultIndices,
  });

  // 为每篇文章生成封面图
  const articles = batchStore.articles;
  addLog("开始为 " + articles.length + " 篇文章生成封面图");

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    if (article.images && article.images.length > 0) {
      const selectedImageIds = defaultIndices
        .map((index) => article.images[index - 1]?.id)
        .filter((id) => id !== undefined);

      addLog(
        `文章 ${i + 1}: 选中的图片 ID: ` + JSON.stringify(selectedImageIds),
      );

      const coverImage = await generateCoverImage(
        templateId,
        selectedImageIds,
        article.images,
      );

      // 更新文章的封面配置，包括生成的封面图
      batchStore.updateArticleCoverConfigByIndex(i, {
        templateId,
        selectedImageIds,
        generatedCoverImage: coverImage,
      });

      addLog(`文章 ${i + 1}: 封面图生成` + (coverImage ? "成功" : "失败"));
    } else {
      addLog(`文章 ${i + 1}: 没有图片，跳过`);
    }
  }

  // 更新全局封面预览
  if (currentArticle.value) {
    const currentCoverConfig = currentArticle.value.coverConfig;
    if (currentCoverConfig.generatedCoverImage) {
      globalGeneratedCoverImageSrc.value =
        currentCoverConfig.generatedCoverImage;
      addLog("全局封面预览已更新");
    }
  }

  addLog("所有文章封面图生成完成");
}

async function handleArticleCoverTemplateSelect(templateId: string) {
  addLog("=== 选择文章封面模板：" + templateId + " ===");

  if (!templateId) {
    addLog("错误：模板 ID 为空");
    return;
  }

  if (currentArticle.value) {
    addLog("当前文章图片数量：" + currentArticle.value.images.length);

    // 获取模板需要的图片数量
    const imageCount = getCoverTemplateImageCount(templateId);
    addLog("模板需要的图片数量：" + imageCount);

    // 自动按顺序选择前 N 张图片
    const availableImages = currentArticle.value.images;
    if (imageCount > 0 && availableImages.length > 0) {
      const selectedIds = availableImages
        .slice(0, imageCount)
        .map((img) => img.id);

      addLog("选中的图片 ID：" + JSON.stringify(selectedIds));

      // 立即生成封面预览图（在更新配置之前，避免 watch 重复触发）
      const coverImage = await generateCoverImage(
        templateId,
        selectedIds,
        availableImages,
      );

      // 一次性更新所有配置
      batchStore.updateCurrentArticleCoverConfig({
        templateId,
        selectedImageIds: selectedIds,
      });

      // 设置生成的封面图
      generatedCoverImageSrc.value = coverImage;
      addLog("封面图已设置：" + (coverImage ? "成功" : "失败"));
    } else if (imageCount > 0 && availableImages.length === 0) {
      // 提示用户需要添加图片
      addLog("错误：没有可用图片");
      alert(
        `封面模板需要 ${imageCount} 张图片，但当前文章没有图片素材。请先添加图片素材后再选择封面图片。`,
      );
    }
  } else {
    addLog("错误：没有当前文章");
  }
}

function openCoverCropTool(ratio: "235" | "11" = "235") {
  isCropModeGlobal.value = false;
  targetCropRatio.value = ratio;
  showCoverCropTool.value = true;
}

function openGlobalCoverCropTool(ratio: "235" | "11" = "235") {
  isCropModeGlobal.value = true;
  targetCropRatio.value = ratio;
  showCoverCropTool.value = true;
}

function openArticleCoverCropTool(ratio: "235" | "11" = "235") {
  isCropModeGlobal.value = false;
  targetCropRatio.value = ratio;
  showCoverCropTool.value = true;
}

function handleCoverCropConfirm(data: {
  pic_crop_235_1: string;
  pic_crop_1_1: string;
}) {
  if (isCropModeGlobal.value) {
    batchStore.setGlobalCoverConfig({
      pic_crop_235_1: data.pic_crop_235_1,
      pic_crop_1_1: data.pic_crop_1_1,
    });
  } else {
    if (currentArticle.value) {
      batchStore.updateCurrentArticleCoverConfig({
        pic_crop_235_1: data.pic_crop_235_1,
        pic_crop_1_1: data.pic_crop_1_1,
      });
    }
  }
}

function getImageUrl(filePath: string): string {
  return `file://${filePath.replace(/\\/g, "/")}`;
}
</script>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.background {
  background-color: #f8fafc;
}
</style>
