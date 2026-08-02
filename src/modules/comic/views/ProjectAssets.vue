<template>
  <div
    class="h-screen flex flex-col overflow-hidden relative bg-app-bg"
  >
    <!-- 背景装饰 -->
    <div
      class="absolute top-10 right-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none"
    />
    <div
      class="absolute bottom-10 left-1/3 w-80 h-80 bg-blue-600/8 rounded-full blur-[100px] pointer-events-none"
    />

    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- 固定顶部 header -->
      <div
        class="shrink-0 h-14 px-6 border-b border-border-subtle flex items-center gap-4"
      >
        <!-- 项目 -->
        <button
          class="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
          @click="router.push('/comic/projects')"
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
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          项目
        </button>

        <div class="w-px h-4 bg-elevated" />

        <h1 class="text-sm font-semibold text-text-primary leading-7">
          {{ projectName }}
        </h1>

        <div class="flex-1" />

        <!-- 绘画风格 + 图片模型 + 比例 + 分辨率 -->
        <div class="flex items-center gap-3">
          <div class="flex flex-col items-end gap-0.5">
            <label class="text-[10px] text-text-secondary">绘画风格</label>
            <div class="relative">
              <select
                v-model="selectedStyleId"
                class="appearance-none bg-input-bg border border-border-subtle rounded-lg pl-3 pr-8 py-1 text-[11px] text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer min-w-[120px]"
                @change="handleStyleChange"
              >
                <option value="" class="bg-surface">请选择风格</option>
                <option
                  v-for="tmpl in styleTemplates"
                  :key="tmpl.id"
                  :value="tmpl.id"
                  class="bg-surface"
                >
                  {{ tmpl.name }}
                </option>
              </select>
              <svg
                class="w-3 h-3 text-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          <div class="flex flex-col items-end gap-0.5">
            <label class="text-[10px] text-text-secondary">图片生成模型</label>
            <div class="relative">
              <select
                v-model="selectedImageModelId"
                class="appearance-none bg-input-bg border border-border-subtle rounded-lg pl-3 pr-8 py-1 text-[11px] text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer min-w-[140px]"
              >
                <option value="" class="bg-surface">请选择模型</option>
                <option
                  v-for="model in imageModels"
                  :key="model.id"
                  :value="model.id"
                  class="bg-surface"
                >
                  {{ model.name }}
                </option>
              </select>
              <svg
                class="w-3 h-3 text-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          <div class="flex flex-col items-end gap-0.5">
            <label class="text-[10px] text-text-secondary">图片比例</label>
            <div class="relative">
              <select
                v-model="selectedAspectRatio"
                class="appearance-none bg-input-bg border border-border-subtle rounded-lg pl-3 pr-8 py-1 text-[11px] text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer min-w-[100px]"
              >
                <option value="" class="bg-surface">默认</option>
                <option
                  v-for="ar in availableAspectRatios"
                  :key="ar"
                  :value="ar"
                  class="bg-surface"
                >
                  {{ ar }}
                </option>
              </select>
              <svg
                class="w-3 h-3 text-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          <div class="flex flex-col items-end gap-0.5">
            <label class="text-[10px] text-text-secondary">分辨率</label>
            <div class="relative">
              <select
                v-model="selectedResolution"
                class="appearance-none bg-input-bg border border-border-subtle rounded-lg pl-3 pr-8 py-1 text-[11px] text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer min-w-[100px]"
              >
                <option value="" class="bg-surface">默认</option>
                <option
                  v-for="res in availableResolutions"
                  :key="res"
                  :value="res"
                  class="bg-surface"
                >
                  {{ res }}
                </option>
              </select>
              <svg
                class="w-3 h-3 text-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 主体内容：左侧人物列表 + 中间参考图编辑 + 右侧服装列表 -->
      <div class="flex-1 flex overflow-hidden gap-3 p-3">
        <!-- 左侧人物列表 -->
        <div
          class="w-56 shrink-0 rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20 flex flex-col overflow-hidden"
        >
          <div
            class="px-3 py-2.5 border-b border-border-subtle flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-text-primary">人物列表</span>
              <span class="text-[10px] text-text-secondary"
                >{{ assets.length }} 人</span
              >
            </div>
          </div>
          <div class="flex-1 overflow-auto p-2 space-y-1">
            <div
              v-for="asset in assets"
              :key="asset.id"
              class="group flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors duration-200"
              :class="
                selectedAsset?.id === asset.id
                  ? 'bg-cyan-500/10 border border-cyan-500/20'
                  : 'bg-surface border border-border-subtle hover:bg-elevated hover:border-border-default'
              "
              @click="selectAsset(asset)"
            >
              <!-- 缩略图 -->
              <div
                class="w-9 h-12 rounded-lg bg-surface border border-border-subtle flex items-center justify-center shrink-0 overflow-hidden"
              >
                <img
                  v-if="asset.referenceImages?.[0]"
                  :src="asset.referenceImages[0]"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <svg
                  v-else
                  class="w-3.5 h-3.5 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs text-text-primary truncate">
                  {{ asset.name || "未命名" }}
                </div>
                <div class="text-[10px] text-text-secondary">
                  {{ asset.outfits?.length || 0 }} 套服装
                </div>
              </div>
              <!-- 删除资产按钮（hover 才显示） -->
              <button
                class="shrink-0 w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-[color,background-color,border-color,opacity]"
                title="删除该资产"
                @click.stop="handleDeleteAsset(asset)"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                  />
                </svg>
              </button>
            </div>

            <div
              v-if="assets.length === 0"
              class="text-center text-text-muted text-xs py-8"
            >
              暂无人物，请先在故事分析中生成
            </div>
          </div>
        </div>

        <!-- 中间参考图编辑 -->
        <div
          class="flex-1 min-w-0 flex flex-col overflow-hidden rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20"
        >
          <div v-if="selectedAsset" class="flex-1 overflow-auto p-5">
            <div class="max-w-3xl mx-auto space-y-5">
              <!-- 人物名称 + 存储模式 -->
              <div class="flex items-center justify-between">
                <h2 class="text-base font-semibold text-text-primary">
                  {{ selectedAsset.name }}
                </h2>
                <div class="flex items-center gap-3">
                  <!-- 存储模式切换 -->
                  <div class="flex items-center gap-1.5">
                    <label class="text-[10px] text-text-secondary">存储方式</label>
                    <div
                      class="flex items-center rounded-lg bg-surface p-[2px] border border-border-subtle"
                    >
                      <button
                        class="px-2 py-0.5 rounded text-[10px] transition-[color,background-color,border-color,box-shadow]"
                        :class="
                          storageMode === 'cloud'
                            ? 'bg-elevated text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        "
                        @click="storageMode = 'cloud'"
                      >
                        云端
                      </button>
                      <button
                        class="px-2 py-0.5 rounded text-[10px] transition-[color,background-color,border-color,box-shadow]"
                        :class="
                          storageMode === 'local'
                            ? 'bg-elevated text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        "
                        @click="storageMode = 'local'"
                      >
                        本地
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 参考图 -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <label class="text-[11px] text-text-secondary">参考图</label>
                  <span class="text-[10px] text-text-muted">单张，限一张</span>
                </div>

                <div class="flex gap-4 items-stretch">
                  <!-- 左侧图片 -->
                  <div class="w-44 shrink-0">
                    <div
                      v-if="selectedAsset.referenceImages?.[0]"
                      class="relative w-full aspect-[3/4] rounded-lg border border-border-subtle overflow-hidden group/img"
                    >
                      <img
                        :src="selectedAsset.referenceImages[0]"
                        class="w-full h-full object-cover cursor-pointer"
                        decoding="async"
                        @click="
                          openImagePreview(
                            selectedAsset.referenceImages,
                            0,
                            `${selectedAsset.name} - 参考图`,
                          )
                        "
                      />
                      <button
                        class="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/60 hover:bg-red-500/70 flex items-center justify-center text-white transition-colors"
                        title="移除参考图"
                        @click="removeRefImage"
                      >
                        <svg
                          class="w-3 h-3"
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
                    </div>
                    <div
                      v-else
                      class="w-full aspect-[3/4] rounded-lg border border-dashed border-border-default flex flex-col items-center justify-center gap-2"
                    >
                      <svg
                        class="w-7 h-7 text-text-muted"
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
                      <span class="text-[10px] text-text-secondary">暂无参考图</span>
                    </div>
                  </div>

                  <!-- 右侧：操作按钮 + 描述 -->
                  <div class="flex-1 min-w-0 flex flex-col gap-2">
                    <!-- 操作按钮 -->
                    <div class="flex gap-2">
                      <button
                        class="flex-1 rounded-lg border border-border-subtle bg-surface flex items-center justify-center gap-1.5 py-2 text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors text-[10px]"
                        :class="{
                          'opacity-50 pointer-events-none': uploadingImage,
                        }"
                        @click="triggerUpload('character')"
                      >
                        <svg
                          v-if="!uploadingImage"
                          class="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        <svg
                          v-else
                          class="w-3.5 h-3.5 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        {{
                          uploadingImage
                            ? "上传中"
                            : selectedAsset.referenceImages?.[0]
                              ? "重新上传"
                              : "上传图片"
                        }}
                      </button>
                      <button
                        class="flex-1 rounded-lg border border-border-subtle bg-surface flex items-center justify-center gap-1.5 py-2 text-text-secondary hover:text-cyan-400 hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-colors text-[10px]"
                        @click="openMaterialLibrary('character')"
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
                          />
                        </svg>
                        从素材库选择
                      </button>
                      <button
                        v-if="
                          selectedAsset.referenceImages?.[0] &&
                          !charImageFromLibrary
                        "
                        class="flex-1 rounded-lg border border-border-subtle bg-surface flex items-center justify-center gap-1.5 py-2 text-text-secondary hover:text-emerald-400 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-colors text-[10px]"
                        :class="{
                          'opacity-50 pointer-events-none': syncingImage,
                        }"
                        @click="syncToMaterial('character')"
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
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        {{ syncingImage ? "同步中" : "同步至素材库" }}
                      </button>
                      <div
                        v-else-if="
                          selectedAsset.referenceImages?.[0] &&
                          charImageFromLibrary
                        "
                        class="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center gap-1.5 py-2 text-emerald-400 text-[10px]"
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        已在素材库
                      </div>
                    </div>

                    <!-- 描述 tabs -->
                    <div
                      class="flex-1 flex flex-col rounded-lg border border-border-subtle bg-input-bg overflow-hidden min-h-[180px]"
                    >
                      <div
                        class="flex items-center gap-4 px-3 py-1.5 border-b border-border-subtle text-[11px]"
                      >
                        <button
                          class="py-1.5 transition-colors"
                          :class="
                            activeDescTab === '人物描述'
                              ? 'text-cyan-400 border-b border-cyan-400'
                              : 'text-text-secondary hover:text-text-primary'
                          "
                          @click="activeDescTab = '人物描述'"
                        >
                          人物描述
                        </button>
                        <button
                          class="py-1.5 transition-colors"
                          :class="
                            activeDescTab === '参考图描述'
                              ? 'text-cyan-400 border-b border-cyan-400'
                              : 'text-text-secondary hover:text-text-primary'
                          "
                          @click="activeDescTab = '参考图描述'"
                        >
                          参考图描述
                        </button>
                        <div class="flex-1" />
                        <div
                          v-if="activeDescTab === '人物描述'"
                          class="text-[10px] text-text-muted"
                        >
                          {{ selectedAsset.description.length }} / 500
                        </div>
                        <div v-else class="text-[10px] text-text-muted">
                          {{
                            (selectedAsset.referenceImageDescs?.[0] || "")
                              .length
                          }}
                          / 500
                        </div>
                      </div>
                      <textarea
                        v-if="activeDescTab === '人物描述'"
                        :value="selectedAsset.description"
                        class="flex-1 w-full bg-transparent px-3 py-2 text-[11px] text-text-primary placeholder-text-muted focus:outline-none resize-none leading-relaxed"
                        :placeholder="
                          selectedAsset.description
                            ? ''
                            : `如：二十多岁男性，黑色短发，身材匀称，脸部线条温和...`
                        "
                        maxlength="500"
                        @input="
                          handleAssetDescInput(
                            ($event.target as HTMLTextAreaElement).value,
                          )
                        "
                      />
                      <textarea
                        v-else
                        :value="selectedAsset.referenceImageDescs?.[0] || ''"
                        class="flex-1 w-full bg-transparent px-3 py-2 text-[11px] text-text-primary placeholder-text-muted focus:outline-none resize-none leading-relaxed"
                        :placeholder="getDefaultCharRefDesc(selectedAsset.name)"
                        maxlength="500"
                        @input="
                          handleCharRefDescInput(
                            ($event.target as HTMLTextAreaElement).value,
                          )
                        "
                      />
                    </div>

                    <!-- 是否插入人物描述（按当前人物独立控制，存到 ProjectAsset.insertCharacterDescription） -->
                    <label
                      class="flex items-center gap-2 cursor-pointer select-none text-[10px] text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <button
                        type="button"
                        class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0"
                        :class="
                          selectedAsset?.insertCharacterDescription !== false
                            ? 'bg-cyan-500'
                            : 'bg-elevated'
                        "
                        @click="toggleInsertCharacterDescription"
                      >
                        <span
                          class="inline-block h-3 w-3 rounded-full bg-white transition-transform"
                          :class="
                            selectedAsset?.insertCharacterDescription !== false
                              ? 'translate-x-3.5'
                              : 'translate-x-0.5'
                          "
                        />
                      </button>
                      <span>是否插入人物描述</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div
            v-else
            class="flex-1 flex flex-col items-center justify-center text-text-muted"
          >
            <svg
              class="w-12 h-12 mb-3 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <p class="text-sm">选择左侧人物上传参考图</p>
          </div>
        </div>

        <!-- 右侧服装列表：仅当当前人物有服装数据时展示 -->
        <div
          v-if="selectedAsset && (selectedAsset.outfits?.length ?? 0) > 0"
          class="flex-1 min-w-0 rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20 flex flex-col overflow-hidden"
        >
          <div
            class="shrink-0 px-3 py-2.5 border-b border-border-subtle flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-text-primary">服装</span>
              <span class="text-[10px] text-text-secondary"
                >{{ selectedAsset?.outfits?.length || 0 }} 套</span
              >
            </div>
          </div>

          <!-- 服装 tab 切换 -->
          <div
            v-if="
              selectedAsset &&
              selectedAsset.outfits &&
              selectedAsset.outfits.length > 0
            "
            class="shrink-0 px-3 py-2 border-b border-border-subtle overflow-x-auto"
          >
            <div class="flex items-center gap-1.5 min-w-min">
              <button
                v-for="(outfit, idx) in selectedAsset.outfits"
                :key="outfit.id"
                class="shrink-0 px-3 py-1.5 rounded-lg text-[11px] transition-colors flex items-center gap-2"
                :class="
                  activeOutfitId === outfit.id
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'bg-surface text-text-secondary border border-border-subtle hover:bg-elevated hover:text-text-primary'
                "
                @click="activeOutfitId = outfit.id"
              >
                <div
                  v-if="outfit.referenceImage"
                  class="w-5 h-5 rounded overflow-hidden border border-border-subtle shrink-0"
                >
                  <img
                    :src="outfit.referenceImage"
                    class="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div
                  v-else
                  class="w-5 h-5 rounded border border-dashed border-border-default flex items-center justify-center shrink-0"
                >
                  <svg
                    class="w-3 h-3 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span>{{ outfit.name || `服装${idx + 1}` }}</span>
                <span
                  v-if="outfit.syncedToLibrary"
                  class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                  title="已在素材库"
                />
                <!-- 删除服装按钮（hover 才显示） -->
                <span
                  class="shrink-0 w-4 h-4 rounded flex items-center justify-center text-text-muted opacity-0 hover:!opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-[color,background-color,border-color,opacity] ml-0.5"
                  title="删除该服装"
                  @click.stop="handleDeleteOutfit(outfit.id)"
                >
                  <svg
                    class="w-3 h-3"
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
                </span>
              </button>
            </div>
          </div>

          <!-- 当前选中服装的内容 -->
          <div class="flex-1 overflow-auto p-4">
            <div
              v-if="
                selectedAsset &&
                selectedAsset.outfits &&
                selectedAsset.outfits.length > 0 &&
                activeOutfit
              "
            >
              <div
                class="rounded-lg border border-border-subtle bg-input-bg p-4 space-y-3 max-w-2xl mx-auto"
              >
                <!-- 服装名称 -->
                <input
                  :value="activeOutfit.name"
                  class="w-full bg-transparent text-sm text-text-primary font-medium border-b border-border-subtle hover:border-border-default focus:border-cyan-500/40 focus:outline-none px-0 py-1"
                  maxlength="20"
                  placeholder="服装名称"
                  @input="
                    handleOutfitNameInput(
                      activeOutfit.id,
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                  @blur="saveOutfits"
                />

                <div class="flex gap-4 items-stretch">
                  <!-- 左侧图片 (与人物参考图同尺寸 w-44, aspect 3/4) -->
                  <div class="w-44 shrink-0">
                    <div
                      v-if="activeOutfit.referenceImage"
                      class="relative w-full aspect-[3/4] rounded-lg border border-border-subtle overflow-hidden group/img"
                    >
                      <img
                        :src="activeOutfit.referenceImage"
                        class="w-full h-full object-cover cursor-pointer"
                        decoding="async"
                        @click="
                          openImagePreview(
                            [activeOutfit.referenceImage],
                            0,
                            `${selectedAsset.name} - ${activeOutfit.name}`,
                          )
                        "
                      />
                      <button
                        class="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/60 hover:bg-red-500/70 flex items-center justify-center text-white transition-colors"
                        title="移除参考图"
                        @click="removeOutfitImage(activeOutfit.id)"
                      >
                        <svg
                          class="w-3 h-3"
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
                    </div>
                    <div
                      v-else
                      class="w-full aspect-[3/4] rounded-lg border border-dashed border-border-default flex flex-col items-center justify-center gap-2"
                    >
                      <svg
                        class="w-7 h-7 text-text-muted"
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
                      <span class="text-[10px] text-text-secondary">暂无参考图</span>
                    </div>
                  </div>

                  <!-- 右侧：操作按钮 + 描述 -->
                  <div class="flex-1 min-w-0 flex flex-col gap-2">
                    <!-- 操作按钮 -->
                    <div class="flex gap-2">
                      <button
                        class="flex-1 rounded-lg border border-border-subtle bg-surface flex items-center justify-center gap-1.5 py-2 text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors text-[11px]"
                        :class="{
                          'opacity-50 pointer-events-none':
                            uploadingOutfitId === activeOutfit.id,
                        }"
                        @click="triggerOutfitUpload(activeOutfit.id)"
                      >
                        <svg
                          v-if="uploadingOutfitId !== activeOutfit.id"
                          class="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        <svg
                          v-else
                          class="w-3.5 h-3.5 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        {{
                          uploadingOutfitId === activeOutfit.id
                            ? "上传中"
                            : activeOutfit.referenceImage
                              ? "重新上传"
                              : "上传图片"
                        }}
                      </button>
                      <button
                        class="flex-1 rounded-lg border border-border-subtle bg-surface flex items-center justify-center gap-1.5 py-2 text-text-secondary hover:text-cyan-400 hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-colors text-[11px]"
                        @click="openOutfitMaterial(activeOutfit.id)"
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
                          />
                        </svg>
                        从素材库选择
                      </button>
                      <button
                        v-if="
                          activeOutfit.referenceImage &&
                          !activeOutfit.syncedToLibrary
                        "
                        class="flex-1 rounded-lg border border-border-subtle bg-surface flex items-center justify-center gap-1.5 py-2 text-text-secondary hover:text-emerald-400 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-colors text-[11px]"
                        :class="{
                          'opacity-50 pointer-events-none': syncingImage,
                        }"
                        @click="syncOutfitToMaterial(activeOutfit.id)"
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
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        同步至素材库
                      </button>
                      <div
                        v-else-if="
                          activeOutfit.referenceImage &&
                          activeOutfit.syncedToLibrary
                        "
                        class="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center gap-1.5 py-2 text-emerald-400 text-[11px]"
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        已在素材库
                      </div>
                    </div>

                    <!-- 服装描述 + 服装参考图描述 (与人物参考图同模式：上标签，下输入框) -->
                    <div
                      class="flex-1 flex flex-col rounded-lg border border-border-subtle bg-input-bg overflow-hidden min-h-[180px]"
                    >
                      <div
                        class="flex items-center gap-4 px-3 py-1.5 border-b border-border-subtle text-[11px]"
                      >
                        <button
                          class="py-1.5 transition-colors"
                          :class="
                            outfitDescTab[activeOutfit.id] !== '参考图'
                              ? 'text-cyan-400 border-b border-cyan-400'
                              : 'text-text-secondary hover:text-text-primary'
                          "
                          @click="setOutfitDescTab(activeOutfit.id, '描述')"
                        >
                          服装描述
                        </button>
                        <button
                          class="py-1.5 transition-colors"
                          :class="
                            outfitDescTab[activeOutfit.id] === '参考图'
                              ? 'text-cyan-400 border-b border-cyan-400'
                              : 'text-text-secondary hover:text-text-primary'
                          "
                          @click="setOutfitDescTab(activeOutfit.id, '参考图')"
                        >
                          参考图描述
                        </button>
                        <div class="flex-1" />
                        <div class="text-[10px] text-text-muted">
                          {{
                            (outfitDescTab[activeOutfit.id] === "参考图"
                              ? activeOutfit.referenceImageDesc || ""
                              : activeOutfit.description || ""
                            ).length
                          }}
                          / 500
                        </div>
                      </div>
                      <textarea
                        v-if="outfitDescTab[activeOutfit.id] !== '参考图'"
                        :value="activeOutfit.description"
                        class="flex-1 w-full bg-transparent px-3 py-2 text-[11px] text-text-primary placeholder-text-muted focus:outline-none resize-none leading-relaxed"
                        placeholder="如：米白色棉麻连衣裙，裙摆柔软..."
                        maxlength="500"
                        @input="
                          handleOutfitDescInput(
                            activeOutfit.id,
                            ($event.target as HTMLTextAreaElement).value,
                          )
                        "
                        @blur="saveOutfits"
                      />
                      <textarea
                        v-else
                        :value="activeOutfit.referenceImageDesc"
                        class="flex-1 w-full bg-transparent px-3 py-2 text-[11px] text-text-primary placeholder-text-muted focus:outline-none resize-none leading-relaxed"
                        :placeholder="
                          getDefaultOutfitRefDesc(
                            selectedAsset.name,
                            activeOutfit.name,
                          )
                        "
                        maxlength="500"
                        @input="
                          handleOutfitRefDescInput(
                            activeOutfit.id,
                            ($event.target as HTMLTextAreaElement).value,
                          )
                        "
                        @blur="saveOutfits"
                      />
                    </div>

                    <!-- 是否插入服装描述（按当前人物独立控制，存到 ProjectAsset.insertOutfitDescription） -->
                    <label
                      class="flex items-center gap-2 cursor-pointer select-none text-[11px] text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <button
                        type="button"
                        class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0"
                        :class="
                          selectedAsset?.insertOutfitDescription !== false
                            ? 'bg-cyan-500'
                            : 'bg-elevated'
                        "
                        @click="toggleInsertOutfitDescription"
                      >
                        <span
                          class="inline-block h-3 w-3 rounded-full bg-white transition-transform"
                          :class="
                            selectedAsset?.insertOutfitDescription !== false
                              ? 'translate-x-3.5'
                              : 'translate-x-0.5'
                          "
                        />
                      </button>
                      <span>是否插入服装描述</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else-if="
                selectedAsset &&
                (!selectedAsset.outfits || selectedAsset.outfits.length === 0)
              "
              class="text-center text-text-muted text-[11px] py-8"
            >
              该人物暂无服装数据
            </div>
            <div v-else class="text-center text-text-muted text-[11px] py-8">
              请先选择左侧人物
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div
        class="shrink-0 px-6 py-3 border-t border-border-subtle flex items-center justify-between"
      >
        <button
          class="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
          @click="router.push(`/comic/project-editor/${projectId}`)"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          上一步
        </button>
        <button
          class="px-5 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isNavigating"
          @click="goToGenerate"
        >
          <svg
            v-if="isNavigating"
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
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {{ isNavigating ? "处理中..." : "下一步：页面生成" }}
          <svg
            v-if="!isNavigating"
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
        </button>
      </div>
    </main>

    <!-- 隐藏文件输入（人物） -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileUpload"
    />

    <!-- 隐藏文件输入（服装） -->
    <input
      ref="outfitFileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleOutfitFileUpload"
    />

    <ImagePreviewModal
      v-model="showImagePreview"
      :images="previewImages"
      :image-index="previewImageIndex"
      :alt="previewImageAlt"
    />

    <MaterialLibrary
      ref="materialLibraryRef"
      v-model="showMaterialLibrary"
      :project-id="projectId"
      select-label="设为参考图"
      @select="handleSelectFromMaterial"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import { comicDb } from "@/api/comic";
import { processImage, type ImageStorageMode } from "@comic/services/uploadService";
import { processPageData } from "@comic/composables/usePageDataProcessor";
import { getSharedRefImagesFromConfig } from "@comic/utils/sharedBlocks";
import { useToast } from "@comic/composables/useToast";
import type {
  ProjectAsset,
  ModelConfig,
  PromptTemplate,
  MaterialItem,
  Outfit,
} from "@comic/types";
import ImagePreviewModal from "@comic/components/ImagePreviewModal.vue";
import MaterialLibrary from "@comic/components/MaterialLibrary.vue";

const route = useRoute();
const router = useRouter();
const projectId = route.params.projectId as string;
const toast = useToast();

const projectName = ref("");
const assets = ref<ProjectAsset[]>([]);
const models = ref<ModelConfig[]>([]);
const selectedAsset = ref<ProjectAsset | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const outfitFileInputRef = ref<HTMLInputElement | null>(null);
const uploadingImage = ref(false);
const uploadingOutfitId = ref<string | null>(null);
const syncingImage = ref(false);
const storageMode = ref<ImageStorageMode>("local");
const showMaterialLibrary = ref(false);
const materialLibraryRef = ref<InstanceType<typeof MaterialLibrary> | null>(
  null,
);
/** 当前正在操作的素材库目标：'character' 或 outfit id */
const materialTarget = ref<"character" | string>("character");

const styleTemplates = ref<PromptTemplate[]>([]);
const selectedStyleId = ref("");
const selectedImageModelId = ref("");
const selectedAspectRatio = ref("");
const selectedResolution = ref("");

/** 图片预览状态 */
const showImagePreview = ref(false);
const previewImages = ref<string[]>([]);
const previewImageIndex = ref(0);
const previewImageAlt = ref("");

/** 描述 tab */
const activeDescTab = ref<"人物描述" | "参考图描述">("人物描述");

/** 每个服装的描述 tab：outfit id → '描述' | '参考图' */
const outfitDescTab = ref<Record<string, "描述" | "参考图">>({});
const setOutfitDescTab = (outfitId: string, tab: "描述" | "参考图") => {
  outfitDescTab.value[outfitId] = tab;
};

/** 当前激活的服装 id（用于 tab 切换） */
const activeOutfitId = ref<string | null>(null);
/** 当前激活的服装对象 */
const activeOutfit = computed<Outfit | null>(() => {
  if (!selectedAsset.value?.outfits || !activeOutfitId.value) return null;
  return (
    selectedAsset.value.outfits.find((o) => o.id === activeOutfitId.value) ??
    null
  );
});

const isNavigating = ref(false);

const imageModels = computed(() =>
  models.value.filter((m) => m.category === "image"),
);

const selectedImageModel = computed(() =>
  models.value.find((m) => m.id === selectedImageModelId.value),
);

const availableAspectRatios = computed(() => {
  const ar = selectedImageModel.value?.aspectRatios;
  if (!ar) return [];
  return ar
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
});

const availableResolutions = computed(() => {
  const res = selectedImageModel.value?.resolutions;
  if (!res) return [];
  return res
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
});

/** 当前人物参考图是否从素材库选择（已在库中） */
const charImageFromLibrary = ref(false);

/**
 * 加载人物参考图与素材库中已存在该 URL 的关系
 * 用于切换人物时判断"同步至素材库"按钮是否需要显示
 */
const refreshCharImageFromLibrary = async () => {
  charImageFromLibrary.value = false;
  if (!selectedAsset.value) return;
  const url = selectedAsset.value.referenceImages?.[0];
  if (!url) return;
  const list = await comicDb.getAllMaterials();
  const exists = list.find((m) => m.url === url);
  if (exists) charImageFromLibrary.value = true;
};

const loadProject = async () => {
  const project = await comicDb.getProject(projectId);
  if (project) {
    projectName.value = project.name;
    // "插入人物描述"和"插入服装描述"开关均已迁移为按人物控制，
    // 存到 ProjectAsset.insertCharacterDescription / insertOutfitDescription
  }
};

/**
 * 切换"插入人物描述"开关（按当前人物独立控制，默认关闭）
 * 直接更新 selectedAsset 上的字段并保存到项目资产
 */
const toggleInsertCharacterDescription = async () => {
  if (!selectedAsset.value) return;
  const current = selectedAsset.value.insertCharacterDescription === true;
  selectedAsset.value.insertCharacterDescription = !current;
  await saveAsset(selectedAsset.value, ["insertCharacterDescription"]);
};

/**
 * 切换"插入服装描述"开关（按当前人物独立控制）
 * 直接更新 selectedAsset 上的字段并保存到项目资产
 */
const toggleInsertOutfitDescription = async () => {
  if (!selectedAsset.value) return;
  const current = selectedAsset.value.insertOutfitDescription !== false;
  selectedAsset.value.insertOutfitDescription = !current;
  await saveAsset(selectedAsset.value, ["insertOutfitDescription"]);
};

/** 默认的人物参考图描述（输入框为空时显示在输入框中） */
const DEFAULT_CHAR_REF_DESC = "参考图中人物形象，保持人物角色一致性";

/** 默认的服装参考图描述（输入框为空时显示在输入框中） */
const DEFAULT_OUTFIT_REF_DESC = "参考图中衣服设计，人物穿戴保持一致";

const loadAssets = async () => {
  const list = await comicDb.getProjectAssetsByProjectId(projectId);
  // 仅展示人物类型
  const characters = list
    .filter((a) => a.type === "character")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  // 确保 outfits 字段存在；为空的描述填充默认值（让输入框一开始就有内容）并写回 DB
  for (const c of characters) {
    if (!c.outfits) c.outfits = [];
    if (!c.referenceImageDescs) c.referenceImageDescs = [""];
    let needsUpdate = false;
    if (!c.referenceImageDescs[0]) {
      c.referenceImageDescs[0] = DEFAULT_CHAR_REF_DESC;
      needsUpdate = true;
    }
    for (const o of c.outfits) {
      if (!o.referenceImageDesc) {
        o.referenceImageDesc = DEFAULT_OUTFIT_REF_DESC;
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      await comicDb.saveProjectAsset({ ...c, updatedAt: Date.now() });
    }
  }
  assets.value = characters;
};

const loadModels = async () => {
  models.value = await comicDb.getAllModelConfigs();
};

const loadStyleTemplates = async () => {
  const all = await comicDb.getAllPromptTemplates();
  styleTemplates.value = all.filter((t) => t.type === "style");
  const project = await comicDb.getProject(projectId);
  if (project?.comicConfig?.paintingStyle) {
    const matched = styleTemplates.value.find(
      (t) => t.content === project.comicConfig!.paintingStyle,
    );
    selectedStyleId.value = matched?.id ?? "";
  }
};

const handleStyleChange = async () => {
  const template = styleTemplates.value.find(
    (t) => t.id === selectedStyleId.value,
  );
  const project = await comicDb.getProject(projectId);
  if (!project) return;
  const existing = project.comicConfig;
  const comicConfig = {
    premise: existing?.premise ?? "",
    paintingStyle: template?.content ?? "",
    worldSetting: existing?.worldSetting ?? "",
    basicFormat: existing?.basicFormat ?? "",
  };
  await comicDb.saveProject({ ...project, comicConfig, updatedAt: Date.now() });
};

const selectAsset = async (asset: ProjectAsset) => {
  selectedAsset.value = asset;
  if (!asset.referenceImageDescs) asset.referenceImageDescs = [""];
  if (!asset.outfits) asset.outfits = [];
  activeDescTab.value = "人物描述";
  // 默认激活第一个服装
  activeOutfitId.value =
    asset.outfits && asset.outfits.length > 0 ? asset.outfits[0].id : null;
  await refreshCharImageFromLibrary();
  // 检查每个 outfit 的 syncedToLibrary
  await refreshOutfitsLibraryStatus();
};

/** 检查每个服装参考图是否已在素材库 */
const refreshOutfitsLibraryStatus = async () => {
  if (!selectedAsset.value?.outfits) return;
  const allMaterials = await comicDb.getAllMaterials();
  for (const o of selectedAsset.value.outfits) {
    if (!o.referenceImage) {
      o.syncedToLibrary = false;
      continue;
    }
    const exists = allMaterials.find((m) => m.url === o.referenceImage);
    o.syncedToLibrary = !!exists;
  }
};

/** 默认的人物参考图描述（仅作为输入框 placeholder 提示，与默认值保持一致） */
const getDefaultCharRefDesc = (_name?: string) => DEFAULT_CHAR_REF_DESC;

/** 默认的服装参考图描述（仅作为输入框 placeholder 提示，与默认值保持一致） */
const getDefaultOutfitRefDesc = (_charName?: string, _outfitName?: string) =>
  DEFAULT_OUTFIT_REF_DESC;

/** 人物描述输入 */
const handleAssetDescInput = (value: string) => {
  if (!selectedAsset.value) return;
  selectedAsset.value.description = value;
  saveAsset(selectedAsset.value, ["description"]);
};

/** 人物参考图描述输入 */
const handleCharRefDescInput = (value: string) => {
  if (!selectedAsset.value) return;
  if (!selectedAsset.value.referenceImageDescs) {
    selectedAsset.value.referenceImageDescs = [""];
  }
  selectedAsset.value.referenceImageDescs[0] = value;
  saveAsset(selectedAsset.value, ["referenceImageDescs"]);
};

/** 服装名称输入 */
const handleOutfitNameInput = (id: string, value: string) => {
  const o = selectedAsset.value?.outfits?.find((x) => x.id === id);
  if (o) o.name = value;
};

/** 服装描述输入 */
const handleOutfitDescInput = (id: string, value: string) => {
  const o = selectedAsset.value?.outfits?.find((x) => x.id === id);
  if (o) o.description = value;
};

/** 服装参考图描述输入 */
const handleOutfitRefDescInput = (id: string, value: string) => {
  const o = selectedAsset.value?.outfits?.find((x) => x.id === id);
  if (o) o.referenceImageDesc = value;
};

/** 保存资产（可指定字段） */
const saveAsset = async (asset: ProjectAsset, fields?: string[]) => {
  const update: Partial<ProjectAsset> & { updatedAt: number } = {
    updatedAt: Date.now(),
  };
  if (!fields || fields.includes("description"))
    update.description = asset.description;
  if (!fields || fields.includes("referenceImageDescs"))
    update.referenceImageDescs = JSON.parse(
      JSON.stringify(asset.referenceImageDescs || []),
    );
  if (!fields || fields.includes("referenceImages"))
    update.referenceImages = JSON.parse(JSON.stringify(asset.referenceImages));
  if (!fields || fields.includes("outfits"))
    update.outfits = JSON.parse(JSON.stringify(asset.outfits || []));
  if (!fields || fields.includes("insertCharacterDescription"))
    update.insertCharacterDescription = asset.insertCharacterDescription;
  if (!fields || fields.includes("insertOutfitDescription"))
    update.insertOutfitDescription = asset.insertOutfitDescription;
  // 深拷贝为纯数据：{ ...asset } 仅浅展开，嵌套的 outfits / referenceImageDescs
  // 仍是 Vue reactive proxy，传入 ipcRenderer.invoke 会触发
  // "An object could not be cloned."（结构化克隆不支持 Proxy）
  const payload = JSON.parse(JSON.stringify({ ...asset, ...update }));
  await comicDb.saveProjectAsset(payload);
};

/** 保存服装列表 */
const saveOutfits = async () => {
  if (!selectedAsset.value) return;
  await saveAsset(selectedAsset.value, ["outfits", "referenceImageDescs"]);
};

// ============ 人物参考图：上传/选择/同步 ============

const triggerUpload = (target: "character") => {
  materialTarget.value = target;
  fileInputRef.value?.click();
};

const handleFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !selectedAsset.value) return;
  target.value = "";

  uploadingImage.value = true;
  try {
    const result = await processImage(file, storageMode.value);
    if (result.success && result.url) {
      selectedAsset.value.referenceImages = [result.url];
      // 来自上传，标记未在素材库
      charImageFromLibrary.value = false;
      await saveAsset(selectedAsset.value, ["referenceImages"]);
      toast.success(storageMode.value === "local" ? "已本地存储" : "上传成功");
    } else {
      toast.error(result.error || "图片处理失败");
    }
  } catch (error) {
    console.error("[人物参考图] 图片处理失败:", error);
    toast.error(error instanceof Error ? error.message : "图片处理失败");
  } finally {
    uploadingImage.value = false;
  }
};

const removeRefImage = async () => {
  if (!selectedAsset.value) return;
  selectedAsset.value.referenceImages = [];
  charImageFromLibrary.value = false;
  await saveAsset(selectedAsset.value, ["referenceImages"]);
};

/** 打开素材库（人物参考图） */
const openMaterialLibrary = (target: "character" | string) => {
  materialTarget.value = target;
  showMaterialLibrary.value = true;
};

/** 从素材库选择图片 */
const handleSelectFromMaterial = async (url: string) => {
  showMaterialLibrary.value = false;
  if (materialTarget.value === "character") {
    if (!selectedAsset.value) return;
    selectedAsset.value.referenceImages = [url];
    charImageFromLibrary.value = true;
    await saveAsset(selectedAsset.value, ["referenceImages"]);
    toast.success("已设置参考图");
  } else {
    // 服装
    const outfitId = materialTarget.value;
    const outfit = selectedAsset.value?.outfits?.find((o) => o.id === outfitId);
    if (!outfit) return;
    outfit.referenceImage = url;
    outfit.syncedToLibrary = true;
    await saveOutfits();
    toast.success("已设置服装参考图");
  }
};

/** 同步人物参考图到素材库 */
const syncToMaterial = async (target: "character" | string) => {
  if (!selectedAsset.value) return;
  syncingImage.value = true;
  try {
    if (target === "character") {
      const url = selectedAsset.value.referenceImages[0];
      if (!url) return;
      const list = await comicDb.getAllMaterials();
      const exists = list.find((m) => m.url === url);
      if (exists) {
        charImageFromLibrary.value = true;
        toast.info("该图片已在素材库中");
        return;
      }
      const item: MaterialItem = {
        id: uuidv4(),
        projectId,
        url,
        name: selectedAsset.value.name || "未命名",
        assetType: "character",
        sourceAssetId: selectedAsset.value.id,
        createdAt: Date.now(),
      };
      await comicDb.saveMaterial(item);
      materialLibraryRef.value?.loadMaterials?.();
      charImageFromLibrary.value = true;
      toast.success("已同步至素材库");
    }
  } catch {
    toast.error("同步失败");
  } finally {
    syncingImage.value = false;
  }
};

// ============ 服装参考图：上传/选择/同步 ============

const triggerOutfitUpload = (outfitId: string) => {
  materialTarget.value = outfitId;
  outfitFileInputRef.value?.click();
};

const handleOutfitFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = "";
  if (!file) return;
  const outfitId = materialTarget.value as string;
  const outfit = selectedAsset.value?.outfits?.find((o) => o.id === outfitId);
  if (!outfit) return;

  uploadingOutfitId.value = outfitId;
  try {
    const result = await processImage(file, storageMode.value);
    if (result.success && result.url) {
      outfit.referenceImage = result.url;
      // 来自上传，标记未在素材库
      outfit.syncedToLibrary = false;
      await saveOutfits();
      toast.success(storageMode.value === "local" ? "已本地存储" : "上传成功");
    } else {
      toast.error(result.error || "图片处理失败");
    }
  } catch (error) {
    console.error("[服装参考图] 图片处理失败:", error);
    toast.error(error instanceof Error ? error.message : "图片处理失败");
  } finally {
    uploadingOutfitId.value = null;
  }
};

const openOutfitMaterial = (outfitId: string) => {
  openMaterialLibrary(outfitId);
};

const removeOutfitImage = async (outfitId: string) => {
  const outfit = selectedAsset.value?.outfits?.find((o) => o.id === outfitId);
  if (!outfit) return;
  outfit.referenceImage = "";
  outfit.syncedToLibrary = false;
  await saveOutfits();
};

/** 删除整套服装 */
const handleDeleteOutfit = async (outfitId: string) => {
  if (!selectedAsset.value?.outfits) return;
  if (!confirm("确定要删除该服装吗？")) return;
  selectedAsset.value.outfits = selectedAsset.value.outfits.filter(
    (o) => o.id !== outfitId,
  );
  if (activeOutfitId.value === outfitId) {
    activeOutfitId.value = selectedAsset.value.outfits[0]?.id ?? null;
  }
  await saveOutfits();
  toast.success("已删除服装");
};

/** 删除整个资产（人物/场景/物品） */
const handleDeleteAsset = async (asset: ProjectAsset) => {
  if (
    !confirm(
      `确定要删除资产「${asset.name || "未命名"}」吗？该资产下的服装也会一并删除。`,
    )
  )
    return;
  await comicDb.deleteProjectAsset(asset.id);
  assets.value = assets.value.filter((a) => a.id !== asset.id);
  if (selectedAsset.value?.id === asset.id) {
    selectedAsset.value = assets.value[0] || null;
    if (selectedAsset.value) {
      activeOutfitId.value = selectedAsset.value.outfits?.[0]?.id ?? null;
    } else {
      activeOutfitId.value = null;
    }
  }
  toast.success("已删除资产");
};

const syncOutfitToMaterial = async (outfitId: string) => {
  if (!selectedAsset.value) return;
  const outfit = selectedAsset.value.outfits?.find((o) => o.id === outfitId);
  if (!outfit || !outfit.referenceImage) return;
  syncingImage.value = true;
  try {
    const url = outfit.referenceImage;
    const list = await comicDb.getAllMaterials();
    const exists = list.find((m) => m.url === url);
    if (exists) {
      outfit.syncedToLibrary = true;
      await saveOutfits();
      toast.info("该图片已在素材库中");
      return;
    }
    const item: MaterialItem = {
      id: uuidv4(),
      projectId,
      url,
      name: `${selectedAsset.value.name || "未命名"}-${outfit.name}`,
      assetType: "outfit",
      sourceAssetId: selectedAsset.value.id,
      sourceOutfitId: outfit.id,
      createdAt: Date.now(),
    };
    await comicDb.saveMaterial(item);
    materialLibraryRef.value?.loadMaterials?.();
    outfit.syncedToLibrary = true;
    await saveOutfits();
    toast.success("已同步至素材库");
  } catch {
    toast.error("同步失败");
  } finally {
    syncingImage.value = false;
  }
};

// ============ 图片预览 ============

const openImagePreview = (images: string[], index: number, alt: string) => {
  previewImages.value = [...images];
  previewImageIndex.value = index;
  previewImageAlt.value = alt;
  showImagePreview.value = true;
};

// ============ 页面生成时的数据处理 ============

/**
 * 处理页面数据：按人名匹配每个 人物特征，注入人物描述、替换服装描述、追加参考图字段
 * 始终从 "原始数据"（独立 key 保存，从未修改）拷贝一份再处理。
 * 实际逻辑已抽到 composables/usePageDataProcessor.ts，便于在 PageEditor 中复用。
 */
const WORKING_PAGE_DATA_KEY = `page-editor-data-${projectId}`;

const processPagesWithCharacterMatch = async () => {
  const project = await comicDb.getProject(projectId);
  // 共用参考图（风格/字体等）决定页内人物参考图编号偏移
  const sharedImages: string[] = getSharedRefImagesFromConfig(
    project?.imageGenConfig,
  );
  // insertCharacterDescription / insertOutfitDescription 均已迁移为按人物控制
  // （ProjectAsset.insertCharacterDescription / insertOutfitDescription），
  // 由 processPageData 在匹配阶段按 matchedAsset 自身字段判断
  const { pageRefImages } = processPageData(
    projectId,
    assets.value,
    sharedImages,
  );
  return pageRefImages;
};

const goToGenerate = async () => {
  isNavigating.value = true;
  try {
    const pageRefImages = await processPagesWithCharacterMatch();
    const stored = sessionStorage.getItem(WORKING_PAGE_DATA_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const pageData = JSON.parse(JSON.stringify(parsed));
        const p = await comicDb.getProject(projectId);
        if (p) {
          await comicDb.saveProject({
            ...p,
            pageData,
            pageRefImages: pageRefImages || undefined,
            updatedAt: Date.now(),
          });
        }
      } catch {
        // 忽略解析失败
      }
    }
    router.push(`/comic/page-editor/${projectId}`);
  } finally {
    isNavigating.value = false;
  }
};

onMounted(async () => {
  await loadProject();
  await loadAssets();
  loadModels();
  loadStyleTemplates();

  if (assets.value.length > 0) await selectAsset(assets.value[0]);
});
</script>
