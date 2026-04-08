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
            @click="batchStore.setPreviewMode(mode.value)"
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
            @click="batchStore.setConfigTab(tab.value)"
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
              <div v-if="batchStore.globalConfig.cover.coverImageIndices && batchStore.globalConfig.cover.coverImageIndices.length > 0" class="mt-2 text-xs text-slate-500">
                已选序号: {{ batchStore.globalConfig.cover.coverImageIndices.join(", ") }}
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

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-medium text-slate-500 block"
                    >图片素材</label
                  >
                  <span
                    v-if="currentArticleCoverTemplateImageCount > 0"
                    class="text-[10px] text-slate-400"
                  >
                    需要 {{ currentArticleCoverTemplateImageCount }} 张图
                  </span>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <template
                    v-for="(img, idx) in currentArticle.images.slice(0, 4)"
                    :key="img.id"
                  >
                    <div
                      class="aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer hover:ring-2 hover:ring-primary/30 transition relative"
                      @click="showImageManagerDrawer = true"
                    >
                      <img
                        :src="getImageUrl(img.path)"
                        :alt="img.name"
                        class="w-full h-full object-cover"
                        @error="
                          (e) => {
                            (e.target as HTMLImageElement).style.display =
                              'none';
                          }
                        "
                      />
                      <div
                        v-if="idx < currentArticleCoverTemplateImageCount"
                        class="absolute top-1 left-1 w-5 h-5 bg-primary/90 text-white text-xs rounded-full flex items-center justify-center font-medium"
                      >
                        {{ idx + 1 }}
                      </div>
                      <div
                        v-else
                        class="absolute inset-0 bg-slate-900/40 flex items-center justify-center"
                      >
                        <span
                          class="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded"
                          >未使用</span
                        >
                      </div>
                    </div>
                  </template>
                  <div
                    v-if="currentArticle.images.length > 4"
                    class="aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer hover:ring-2 hover:ring-primary/30 transition flex items-center justify-center"
                    @click="showImageManagerDrawer = true"
                  >
                    <span class="text-xs text-slate-500 font-medium"
                      >+{{ currentArticle.images.length - 4 }}</span
                    >
                  </div>
                  <div
                    v-if="currentArticle.images.length === 0"
                    class="aspect-square rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-primary/50 hover:bg-blue-50/50 transition flex flex-col items-center justify-center gap-1"
                    @click="showImageManagerDrawer = true"
                  >
                    <svg
                      class="w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                      ></path>
                    </svg>
                    <span class="text-[10px] text-slate-400">添加图片</span>
                  </div>
                </div>
                <button
                  class="mt-2 w-full border border-slate-200 rounded-lg p-2 text-center text-sm text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-2"
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
                <p
                  v-if="currentArticleCoverTemplateImageCount > 0"
                  class="text-[10px] text-slate-400 mt-1.5"
                >
                  将自动按顺序使用前
                  {{
                    Math.min(
                      currentArticleCoverTemplateImageCount,
                      currentArticle.images.length,
                    )
                  }}
                  张图片制作封面
                </p>
              </div>
            </template>

            <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p class="text-xs text-blue-600">
                {{
                  currentArticle.coverConfig.inheritGlobal
                    ? "当前生效：来自全局模板"
                    : "当前生效：已自定义封面模板"
                }}
              </p>
            </div>
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
      :images="currentArticle?.images || []"
      :selected-image-ids="currentArticle?.coverConfig.selectedImageIds || []"
      :required-count="currentArticleCoverTemplateImageCount"
      :get-image-url="getImageUrl"
      @close="showCoverImageSelector = false"
      @update:selected-image-ids="
        (ids) => {
          if (currentArticle.value) {
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
      @close="showCoverImageIndexSelector = false"
      @confirm="handleConfirmCoverImageIndices"
    />

    <ModalCoverTemplateSelector
      :visible="showCoverTemplateSelector"
      :current-template-id="batchStore.globalConfig.cover.templateId"
      @close="showCoverTemplateSelector = false"
      @select="handleCoverTemplateSelect"
    />

    <ModalCoverTemplateSelector
      :visible="showArticleCoverTemplateSelector"
      :current-template-id="currentArticle?.coverConfig.templateId"
      @close="showArticleCoverTemplateSelector = false"
      @select="handleArticleCoverTemplateSelect"
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
import CoverSelector from "../components/common/CoverSelector.vue";
import CoverImageSelectorDrawer from "../components/common/CoverImageSelectorDrawer.vue";
import CoverImageIndexSelectorDrawer from "../components/common/CoverImageIndexSelectorDrawer.vue";
import CoverCropTool from "../components/common/CoverCropTool.vue";
import GlobalTitleConfig from "../components/typeset/GlobalTitleConfig.vue";
import ArticleTitleConfig from "../components/typeset/ArticleTitleConfig.vue";
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

const globalCoverTemplateImageCount = computed(() => {
  const tid = batchStore.globalConfig.cover.templateId;
  if (!tid) return 0;
  const tpl = coverTemplateStore.coverTemplates.find((t) => t.id === tid);
  if (!tpl) return 0;
  const imgRegex = /<img[^>]*>/gi;
  const matches = tpl.html.match(imgRegex);
  return matches ? matches.length : 0;
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
  const tid = currentArticle.value?.coverConfig.templateId;
  if (!tid) return 0;
  const tpl = coverTemplateStore.coverTemplates.find((t) => t.id === tid);
  if (!tpl) return 0;
  const imgRegex = /<img[^>]*>/gi;
  const matches = tpl.html.match(imgRegex);
  return matches ? matches.length : 0;
});

// 生成封面预览图（使用选中的模板和图片）
const generatedCoverImageSrc = ref<string>("");
const globalGeneratedCoverImageSrc = ref<string>("");

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
    return "";
  }

  if (!selectedImageIds || selectedImageIds.length === 0) {
    return "";
  }

  // 将模板中的占位图替换为选中的图片
  let html = template.html;
  const imgRegex = /<img[^>]*>/gi;
  const matches = template.html.match(imgRegex);

  if (!matches || matches.length === 0) {
    return "";
  }

  // 创建临时 div 来渲染 HTML
  const tempDiv = document.createElement("div");
  tempDiv.style.width = "2350px";
  tempDiv.style.height = "1000px";
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "-9999px";
  tempDiv.innerHTML = html;

  const imgElements = tempDiv.querySelectorAll("img");
  imgElements.forEach((img, idx) => {
    if (idx < selectedImageIds.length) {
      const imageId = selectedImageIds[idx];
      const image = images.find((i) => i.id === imageId);
      if (image) {
        img.setAttribute("src", getImageUrl(image.path));
      }
    }
  });

  document.body.appendChild(tempDiv);

  try {
    // 等待图片加载完成
    await new Promise((resolve) => setTimeout(resolve, 100));

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

    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("生成封面图失败:", error);
    // 降级显示第一张图片
    if (selectedImageIds.length > 0) {
      const firstImage = images.find((i) => i.id === selectedImageIds[0]);
      if (firstImage) {
        return getImageUrl(firstImage.path);
      }
    }
    return "";
  } finally {
    document.body.removeChild(tempDiv);
  }
}

// 监听文章封面配置变化，重新生成封面图
watch(
  () => [
    currentArticle.value?.coverConfig.templateId,
    currentArticle.value?.coverConfig.selectedImageIds?.join(","),
  ],
  async () => {
    if (!currentArticle.value?.coverConfig.templateId) {
      generatedCoverImageSrc.value = "";
      return;
    }
    generatedCoverImageSrc.value = await generateCoverImage(
      currentArticle.value.coverConfig.templateId,
      currentArticle.value.coverConfig.selectedImageIds,
      currentArticle.value.images,
    );
  },
  { immediate: true },
);

// 监听全局封面配置变化，重新生成全局封面图
watch(
  () => [
    batchStore.globalConfig.cover.templateId,
    batchStore.globalConfig.cover.selectedImageIds?.join(","),
  ],
  async () => {
    if (!batchStore.globalConfig.cover.templateId) {
      globalGeneratedCoverImageSrc.value = "";
      return;
    }
    // 全局封面使用当前文章的图片作为演示
    if (currentArticle.value) {
      globalGeneratedCoverImageSrc.value = await generateCoverImage(
        batchStore.globalConfig.cover.templateId,
        batchStore.globalConfig.cover.selectedImageIds ||
          currentArticle.value.images.slice(0, 6).map((img) => img.id),
        currentArticle.value.images,
      );
    }
  },
  { immediate: true },
);

const processedTemplateHtml = computed(() => {
  if (!currentTemplate.value || !currentArticle.value) return "";
  const templateHtml = currentTemplate.value.html;
  const images = currentArticle.value.images;

  // 先统计模板中有多少个占位图
  const placeholderMatch = templateHtml.match(
    /https:\/\/toai\.art\/b\d+\.png/g,
  );
  const placeholderCount = placeholderMatch ? placeholderMatch.length : 0;

  if (placeholderCount === 0) return templateHtml;

  let resultHtml = "";
  let imageIndex = 0;
  const totalImages = images.length;

  // 计算需要多少个完整块
  const fullBlocks = Math.floor(totalImages / placeholderCount);
  const remainingImages = totalImages % placeholderCount;

  // 生成完整块
  for (let i = 0; i < fullBlocks; i++) {
    let blockHtml = templateHtml;
    blockHtml = blockHtml.replace(/https:\/\/toai\.art\/b\d+\.png/g, () => {
      const imgUrl = getImageUrl(images[imageIndex].path);
      imageIndex++;
      return imgUrl;
    });
    resultHtml += blockHtml;
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
        if (placeholderIdx < remainingImages && imageIndex < totalImages) {
          const imgUrl = getImageUrl(images[imageIndex].path);
          imageIndex++;
          placeholderIdx++;
          finalBlockHtml += imgUrl;
        }
      } else {
        finalBlockHtml += part;
      }
    }

    resultHtml += finalBlockHtml;
  }

  return resultHtml;
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
        id: group.id,
        images: (group as any).images.map((img: ImageFile) => ({
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

function handleCoverTemplateSelect(templateId: string) {
  batchStore.setGlobalCoverConfig({ templateId });

  const template = coverTemplateStore.coverTemplates.find(
    (t) => t.id === templateId,
  );
  if (template) {
    const imgRegex = /<img[^>]*>/gi;
    const matches = template.html.match(imgRegex);
    const imageCount = matches ? matches.length : 0;

    // 默认按顺序选择前 N 张图片的序号
    const defaultIndices = Array.from({ length: imageCount }, (_, i) => i + 1);
    batchStore.setGlobalCoverConfig({
      coverImageIndices: defaultIndices,
    });

    // 自动按顺序选择前 N 张图片
    if (currentArticle.value) {
      const availableImages = currentArticle.value.images;
      if (imageCount > 0 && availableImages.length > 0) {
        const selectedIds = availableImages
          .slice(0, imageCount)
          .map((img) => img.id);
        batchStore.setGlobalCoverConfig({
          selectedImageIds: selectedIds,
        });
      }
    }

    // 更新所有文章的封面图片
    batchStore.updateArticlesCoverImagesByIndices();
  }
}

function handleArticleCoverTemplateSelect(templateId: string) {
  if (currentArticle.value) {
    batchStore.updateCurrentArticleCoverConfig({ templateId });

    // 自动按顺序选择前 N 张图片
    const imageCount = currentArticleCoverTemplateImageCount.value;
    const availableImages = currentArticle.value.images;
    if (imageCount > 0 && availableImages.length > 0) {
      const selectedIds = availableImages
        .slice(0, imageCount)
        .map((img) => img.id);
      batchStore.updateCurrentArticleCoverConfig({
        selectedImageIds: selectedIds,
      });
    }
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

function selectCoverImage(index: number) {
  selectedCoverIndex.value = index;

  if (!currentArticle.value?.coverConfig.templateId) return;

  const template = coverTemplateStore.coverTemplates.find(
    (t) => t.id === currentArticle.value?.coverConfig.templateId,
  );
  if (!template) return;

  const imageCount = currentArticleCoverTemplateImageCount.value;
  if (imageCount === 0) return;

  const images = currentArticle.value.images;
  if (images.length === 0) return;

  const selectedIds = images
    .slice(index, index + imageCount)
    .map((img) => img.id);

  if (selectedIds.length < imageCount) {
    const remaining = imageCount - selectedIds.length;
    for (let i = 0; i < remaining; i++) {
      if (images[i] && !selectedIds.includes(images[i].id)) {
        selectedIds.push(images[i].id);
      }
    }
  }

  batchStore.updateCurrentArticleCoverConfig({
    selectedImageIds: selectedIds,
  });
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
