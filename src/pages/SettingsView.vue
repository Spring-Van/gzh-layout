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

    <!-- 顶部 Header -->
    <header
      class="h-16 bg-surface border-b border-border-subtle flex items-center justify-between px-6 flex-shrink-0 z-20 shadow-sm"
    >
      <!-- 左：返回 + Logo + 标题 -->
      <div class="flex items-center gap-3 min-w-0">
        <button
          class="p-2 rounded-lg hover:bg-elevated transition-colors"
          @click="$router.push('/')"
          title="返回"
        >
          <svg
            class="w-5 h-5 text-text-secondary"
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
        </button>
        <div
          class="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center text-white font-bold shadow"
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
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <h1 class="text-base font-bold text-text-primary leading-tight">
            系统设置
          </h1>
          <p class="text-xs text-text-secondary leading-tight hidden md:block">
            配置模型、公众号和系统参数
          </p>
        </div>
      </div>

      <!-- 右：主题切换 -->
      <button
        class="flex items-center justify-center w-9 h-9 text-text-secondary hover:text-text-primary hover:bg-elevated rounded-lg transition"
        :title="theme === 'dark' ? '切换到浅色' : '切换到深色'"
        @click="toggleTheme"
      >
        <svg v-if="theme === 'dark'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      </button>
    </header>

    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- 固定头部区域 -->
      <div class="shrink-0 px-8 pt-8 pb-0 max-w-5xl mx-auto w-full">
        <!-- 页面标题 -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-text-primary mb-1">系统设置</h1>
          <p class="text-sm text-text-secondary">配置模型、本地路径和系统参数</p>
        </div>

        <!-- 分类 Tabs -->
        <div class="flex items-center gap-1 mb-6 border-b border-border-subtle pb-0">
          <button
            v-for="tab in categoryTabs"
            :key="tab.key"
            class="px-4 py-2.5 text-sm font-medium transition-colors relative -mb-px"
            :class="
              activeCategory === tab.key
                ? 'text-accent border-b-2 border-cyan-400'
                : 'text-text-secondary hover:text-text-secondary'
            "
            @click="activeCategory = tab.key"
          >
            <span class="flex items-center gap-1.5">
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
                  :d="tab.iconPath"
                />
              </svg>
              {{ tab.label }}
            </span>
          </button>
        </div>

        <!-- 配置区域标题 + 添加按钮 -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-semibold text-text-primary">
              {{ categoryLabel }}配置
            </h2>
            <p class="text-xs text-text-secondary mt-0.5">
              {{ categoryDesc }}
            </p>
          </div>
          <button
            v-if="activeCategory !== 'paths'"
            class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
            @click="openAddModal"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            {{ addButtonText }}
          </button>
        </div>
      </div>

      <!-- 可滚动内容区域 -->
      <div class="flex-1 overflow-auto px-8 pb-8">
        <div class="max-w-5xl mx-auto">
          <!-- 微信公众号账号列表 -->
          <div
            v-if="activeCategory === 'wechat'"
            class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
          >
            <div
              v-for="account in wechatStore.accounts"
              :key="account.id"
              class="bg-surface border rounded-xl p-4 hover:bg-elevated hover:border-border-default hover:shadow-lg hover:shadow-cyan-500/5 transition-[background-color,border-color,box-shadow] duration-300 flex flex-col"
              :class="
                account.isActive
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-border-subtle'
              "
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2 min-w-0 cursor-pointer" @click="switchWechatAccount(account.id)">
                  <div
                    class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    :class="account.isActive ? 'bg-accent' : 'bg-text-muted'"
                  >
                    <img
                      v-if="account.headImg"
                      :src="account.headImg"
                      :alt="`${account.nickname} 头像`"
                      class="w-full h-full object-cover"
                    />
                    <span v-else>{{ account.nickname?.charAt(0) || "微" }}</span>
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-sm font-semibold text-text-primary truncate">
                      {{ account.nickname }}
                    </h3>
                    <div class="flex items-center gap-1 mt-0.5">
                      <span
                        v-if="account.isActive"
                        class="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded"
                      >
                        当前
                      </span>
                      <span
                        v-if="account.isDefaultSync"
                        class="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded"
                      >
                        默认同步
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    class="text-text-secondary hover:text-accent transition-colors p-0.5"
                    @click="editWechatAccount(account)"
                    title="编辑账号"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    class="text-text-secondary hover:text-red-400 transition-colors p-0.5"
                    @click="deleteWechatAccount(account.id)"
                    title="删除账号"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="flex-1 space-y-2">
                <div>
                  <label class="block text-[11px] text-text-secondary mb-0.5">AppID</label>
                  <span class="text-xs text-text-secondary truncate block" :title="account.appId">
                    {{ account.appId }}
                  </span>
                </div>
                <div>
                  <label class="block text-[11px] text-text-secondary mb-0.5">Token 有效期</label>
                  <span class="text-xs text-text-secondary">
                    {{ wechatTokenExpiresInText(account) }}
                  </span>
                </div>
              </div>

              <!-- 底部设为默认同步按钮 -->
              <div class="pt-3 mt-3 border-t border-white/5">
                <button
                  class="w-full px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  :class="
                    account.isDefaultSync
                      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                      : 'border-border-subtle text-text-secondary hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/10'
                  "
                  @click="setDefaultSyncWechatAccount(account.id)"
                >
                  {{ account.isDefaultSync ? "已设为默认同步" : "设为默认同步" }}
                </button>
              </div>
            </div>

            <!-- 空状态 -->
            <div
              v-if="wechatStore.accounts.length === 0"
              class="col-span-full text-center text-text-muted text-sm py-12 bg-surface border border-border-subtle rounded-xl"
            >
              暂无公众号账号，点击右上角添加
            </div>
          </div>

          <!-- 模型卡片列表 -->
          <div
            v-else-if="activeCategory !== 'template' && activeCategory !== 'paths' && activeCategory !== 'wechat'"
            class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
          >
            <div
              v-for="model in filteredModels"
              :key="model.id"
              class="bg-surface border border-border-subtle rounded-xl p-4 hover:bg-elevated hover:border-border-default hover:shadow-lg hover:shadow-cyan-500/5 transition-[background-color,border-color,box-shadow] duration-300 flex flex-col"
              :class="{ 'opacity-50': draggedModelId === model.id }"
              draggable="true"
              @dragstart="handleModelDragStart($event, model.id)"
              @dragover="handleModelDragOver"
              @drop="handleModelDrop($event, model.id)"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2 min-w-0">
                  <svg
                    class="w-4 h-4 text-text-secondary cursor-grab active:cursor-grabbing shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                  <h3 class="text-sm font-semibold text-text-primary truncate">
                    {{ model.name }}
                  </h3>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    class="text-text-secondary hover:text-accent transition-colors p-0.5"
                    @click="editModel(model)"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    class="text-text-secondary hover:text-emerald-400 transition-colors p-0.5"
                    title="复制"
                    @click="duplicateModel(model)"
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                  <button
                    class="text-text-secondary hover:text-red-400 transition-colors p-0.5"
                    @click="deleteModel(model.id)"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="flex-1 space-y-2">
                <!-- 第一行：API来源/API格式 + Model -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] text-text-secondary mb-0.5">{{
                      model.category === "image" ? "API来源" : "API格式"
                    }}</label>
                    <span class="text-xs text-text-secondary">{{
                      model.category === "image"
                        ? formatApiSource(model.apiSource!)
                        : formatApiFormat(model.apiFormat!)
                    }}</span>
                  </div>
                  <div>
                    <label class="block text-[11px] text-text-secondary mb-0.5"
                      >Model</label
                    >
                    <span
                      class="text-xs text-text-secondary truncate block"
                      :title="model.model"
                    >
                      {{ model.model }}
                    </span>
                  </div>
                </div>

                <!-- 第二行：Base URL -->
                <div>
                  <label class="block text-[11px] text-text-secondary mb-0.5"
                    >Base URL</label
                  >
                  <span
                    class="text-xs text-text-secondary truncate block"
                    :title="model.baseUrl"
                  >
                    {{ model.baseUrl }}
                  </span>
                </div>

                <!-- 第三行：API Key -->
                <div>
                  <label class="block text-[11px] text-text-secondary mb-0.5"
                    >API Key</label
                  >
                  <span class="text-xs text-text-secondary font-mono truncate block">
                    {{ maskApiKey(model.apiKey) }}
                  </span>
                </div>
              </div>

              <!-- 底部测试按钮（仅LLM模型显示） -->
              <div
                v-if="model.category === 'llm'"
                class="pt-3 mt-3 border-t border-white/5"
              >
                <button
                  class="w-full px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  :class="testBtnClass(model.id)"
                  :disabled="testLoadingId === model.id"
                  @click="handleTestFromCard(model)"
                >
                  <template v-if="testLoadingId === model.id">
                    测试中...
                  </template>
                  <template v-else-if="testResultMap[model.id]?.success">
                    连接成功（{{ testResultMap[model.id]?.duration }}ms）
                  </template>
                  <template v-else-if="testResultMap[model.id]?.error">
                    连接失败
                  </template>
                  <template v-else> 测试连接 </template>
                </button>
              </div>
            </div>

            <!-- 空状态 -->
            <div
              v-if="filteredModels.length === 0"
              class="col-span-full text-center text-text-muted text-sm py-12 bg-surface border border-border-subtle rounded-xl"
            >
              暂无{{ categoryLabel }}模型，点击右上角添加
            </div>
          </div>

          <!-- 提示词模板列表 -->
          <div
            v-else-if="activeCategory === 'template'"
            class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
          >
            <div
              v-for="tmpl in filteredTemplates"
              :key="tmpl.id"
              class="bg-surface border border-border-subtle rounded-xl p-4 hover:bg-elevated hover:border-border-default hover:shadow-lg hover:shadow-cyan-500/5 transition-[background-color,border-color,box-shadow] duration-300 flex flex-col"
              :class="{ 'opacity-50': draggedTemplateId === tmpl.id }"
              draggable="true"
              @dragstart="handleTemplateDragStart($event, tmpl.id)"
              @dragover="handleTemplateDragOver"
              @drop="handleTemplateDrop($event, tmpl.id)"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2 pr-2 min-w-0">
                  <svg
                    class="w-4 h-4 text-text-secondary cursor-grab active:cursor-grabbing shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                  <h3 class="text-sm font-semibold text-text-primary truncate">
                    {{ tmpl.name }}
                  </h3>
                  <span
                    class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-accent border border-cyan-500/20 shrink-0"
                  >
                    {{ formatTemplateType(tmpl.type) }}
                  </span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    class="text-text-secondary hover:text-accent transition-colors p-0.5"
                    @click="editTemplate(tmpl)"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    class="text-text-secondary hover:text-emerald-400 transition-colors p-0.5"
                    title="复制"
                    @click="duplicateTemplate(tmpl)"
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                  <button
                    class="text-text-secondary hover:text-red-400 transition-colors p-0.5"
                    @click="deleteTemplate(tmpl.id)"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="flex-1 space-y-2">
                <div v-if="tmpl.description">
                  <label class="block text-[11px] text-text-secondary mb-0.5"
                    >描述</label
                  >
                  <span class="text-xs text-text-secondary truncate block">
                    {{ tmpl.description }}
                  </span>
                </div>
                <div>
                  <label class="block text-[11px] text-text-secondary mb-0.5"
                    >提示词内容</label
                  >
                  <span
                    class="text-xs text-text-secondary truncate block"
                    :title="tmpl.content"
                  >
                    {{ tmpl.content }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div
              v-if="filteredTemplates.length === 0"
              class="col-span-full text-center text-text-muted text-sm py-12 bg-surface border border-border-subtle rounded-xl"
            >
              暂无提示词模板，点击右上角添加
            </div>
          </div>

          <!-- 本地路径配置 -->
          <div
            v-else-if="activeCategory === 'paths'"
            class="max-w-2xl"
          >
            <div
              class="bg-surface border border-border-subtle rounded-xl p-6 space-y-4"
            >
              <div>
                <h3 class="text-sm font-medium text-text-primary">导出路径</h3>
                <p class="text-xs text-text-secondary mt-1 leading-relaxed">
                  导出的 ZIP 文件将保存到此目录。留空则使用系统「下载」目录。
                </p>
              </div>
              <div class="flex items-center gap-2">
                <input
                  v-model="exportDir"
                  type="text"
                  placeholder="未配置，默认使用系统下载目录"
                  class="flex-1 px-3 py-2 rounded-lg bg-input-bg border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent"
                  readonly
                />
                <button
                  class="px-3 py-2 rounded-lg bg-elevated border border-border-subtle text-sm text-text-primary hover:border-border-strong transition-colors shrink-0"
                  @click="selectExportDir"
                >
                  选择文件夹
                </button>
                <button
                  class="px-3 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
                  @click="saveExportDir"
                >
                  保存
                </button>
              </div>
              <button
                v-if="exportDir"
                class="text-xs text-text-muted hover:text-text-primary transition-colors"
                @click="clearExportDir"
              >
                清除路径，恢复默认
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 添加/编辑模型弹窗 -->
    <div
      v-if="showAddModal && activeCategory !== 'template' && activeCategory !== 'wechat'"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div
        class="bg-surface border border-border-subtle rounded-xl w-[480px] max-w-[90vw] p-6"
      >
        <h3 class="text-base font-semibold text-text-primary mb-4">
          {{ editingId ? "编辑" : "添加" }}{{ categoryLabel }}模型
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-xs text-text-secondary mb-1.5">模型名称</label>
            <input
              v-model="form.name"
              type="text"
              class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="例如：GPT-4"
            />
          </div>

          <!-- API来源选择（仅图片模型） -->
          <div v-if="activeCategory === 'image'">
            <label class="block text-xs text-text-secondary mb-1.5">API来源</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="src in apiSourceOptions"
                :key="src.value"
                type="button"
                class="px-3 py-2 rounded-lg text-sm border transition-colors duration-200"
                :class="
                  form.apiSource === src.value
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-accent'
                    : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default hover:text-text-secondary'
                "
                @click="form.apiSource = src.value"
              >
                {{ src.label }}
              </button>
            </div>
          </div>

          <!-- API格式选择（仅LLM/视频模型） -->
          <div v-if="activeCategory !== 'image'">
            <label class="block text-xs text-text-secondary mb-1.5">API格式</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="fmt in apiFormats"
                :key="fmt.value"
                type="button"
                class="px-3 py-2 rounded-lg text-sm border transition-colors duration-200"
                :class="
                  form.apiFormat === fmt.value
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-accent'
                    : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default hover:text-text-secondary'
                "
                @click="form.apiFormat = fmt.value"
              >
                {{ fmt.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs text-text-secondary mb-1.5">Model</label>
            <input
              v-model="form.model"
              type="text"
              class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="例如：gpt-4"
            />
          </div>
          <div>
            <label class="block text-xs text-text-secondary mb-1.5">Base URL</label>
            <input
              v-model="form.baseUrl"
              type="text"
              class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div>
            <label class="block text-xs text-text-secondary mb-1.5">API Key</label>
            <input
              v-model="form.apiKey"
              type="password"
              class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="sk-..."
            />
          </div>

          <!-- 图片比例 + 分辨率 + 图片质量，仅图片模型显示，三列布局 -->
          <template v-if="activeCategory === 'image'">
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs text-text-secondary mb-1.5"
                  >图片比例</label
                >
                <input
                  v-model="form.aspectRatios"
                  type="text"
                  class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="1:1, 16:9"
                />
              </div>
              <div>
                <label class="block text-xs text-text-secondary mb-1.5">分辨率</label>
                <input
                  v-model="form.resolutions"
                  type="text"
                  class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="1K, 2K, 4K"
                />
              </div>
              <div>
                <label class="block text-xs text-text-secondary mb-1.5"
                  >图片质量</label
                >
                <input
                  v-model="form.qualities"
                  type="text"
                  class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="auto, high"
                />
              </div>
            </div>

            <!-- OpenAI 专属参数 -->
            <template v-if="form.apiSource === 'openai'">
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs text-text-secondary mb-1.5"
                    >输出格式</label
                  >
                  <select
                    v-model="form.openaiOutputFormat"
                    class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan-500/50 transition-colors"
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-text-secondary mb-1.5"
                    >生成数量</label
                  >
                  <input
                    v-model.number="form.openaiN"
                    type="number"
                    min="1"
                    max="10"
                    class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label class="block text-xs text-text-secondary mb-1.5"
                    >内容审核</label
                  >
                  <select
                    v-model="form.openaiModeration"
                    class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan-500/50 transition-colors"
                  >
                    <option value="auto">auto</option>
                    <option value="low">low</option>
                  </select>
                </div>
              </div>
              <div
                v-if="form.openaiOutputFormat !== 'png'"
                class="grid grid-cols-2 gap-3"
              >
                <div>
                  <label class="block text-xs text-text-secondary mb-1.5"
                    >压缩质量 (0-100)</label
                  >
                  <input
                    v-model.number="form.openaiOutputCompression"
                    type="number"
                    min="0"
                    max="100"
                    class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                    placeholder="50"
                  />
                </div>
              </div>
              <div class="flex items-center gap-2">
                <input
                  v-model="form.openaiCompatibleMode"
                  type="checkbox"
                  id="compatibleMode"
                  class="w-4 h-4 rounded border-border-default bg-input-bg text-accent focus:ring-cyan-500/50"
                />
                <label for="compatibleMode" class="text-xs text-text-secondary">
                  兼容模式（中转站 JSON 传 URL，而非标准 multipart 上传）
                </label>
              </div>
            </template>
          </template>
        </div>

        <div class="flex items-center justify-between gap-3 mt-6">
          <!-- 表单测试按钮（仅LLM类型） -->
          <button
            v-if="activeCategory === 'llm'"
            class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            :class="formTestBtnClass()"
            :disabled="
              formTestLoading || !form.baseUrl || !form.apiKey || !form.model
            "
            @click="handleTestFromForm"
          >
            <template v-if="formTestLoading">测试中...</template>
            <template v-else-if="formTestResult?.success">
              连接成功（{{ formTestResult.duration }}ms）
            </template>
            <template v-else-if="formTestResult?.error">
              连接失败：{{ formTestResult.error }}
            </template>
            <template v-else>测试连接</template>
          </button>
          <div v-else />
          <div class="flex items-center gap-3">
            <button
              class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
              @click="closeModal"
            >
              取消
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
              @click="confirmSave"
            >
              {{ editingId ? "保存修改" : "确认添加" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑模板弹窗 -->
    <div
      v-if="showAddModal && activeCategory === 'template'"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div
        class="bg-surface border border-border-subtle rounded-xl w-[560px] max-w-[90vw] p-6"
      >
        <h3 class="text-base font-semibold text-text-primary mb-4">
          {{ editingId ? "编辑" : "添加" }}提示词模板
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-xs text-text-secondary mb-1.5">模板名称</label>
            <input
              v-model="templateForm.name"
              type="text"
              class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="例如：角色提取模板"
            />
          </div>

          <!-- 模板类型选择 -->
          <div>
            <label class="block text-xs text-text-secondary mb-1.5">模板类型</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="t in templateTypes"
                :key="t.value"
                type="button"
                class="px-3 py-2 rounded-lg text-sm border transition-colors duration-200"
                :class="
                  templateForm.type === t.value
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-accent'
                    : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default hover:text-text-secondary'
                "
                @click="templateForm.type = t.value"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs text-text-secondary mb-1.5">模板描述</label>
            <input
              v-model="templateForm.description"
              type="text"
              class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="简要描述该模板的用途..."
            />
          </div>

          <div>
            <label class="block text-xs text-text-secondary mb-1.5">提示词内容</label>
            <textarea
              v-model="templateForm.content"
              rows="6"
              class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors resize-none leading-relaxed"
              placeholder="请输入提示词内容..."
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 mt-6">
          <button
            class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            @click="closeModal"
          >
            取消
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
            @click="confirmSaveTemplate"
          >
            {{ editingId ? "保存修改" : "确认添加" }}
          </button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑公众号账号弹窗 -->
    <div
      v-if="showAddModal && activeCategory === 'wechat'"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div
        class="bg-surface border border-border-subtle rounded-xl w-[480px] max-w-[90vw] p-6"
      >
        <h3 class="text-base font-semibold text-text-primary mb-4">
          {{ editingWechatAccount ? "编辑公众号账号" : "添加公众号账号" }}
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-xs text-text-secondary mb-1.5">AppID</label>
            <input
              v-model="wechatForm.appId"
              type="text"
              class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="微信公众号 AppID"
            />
          </div>

          <div>
            <label class="block text-xs text-text-secondary mb-1.5">
              AppSecret (接口凭据)
            </label>
            <div class="relative">
              <input
                v-model="wechatForm.appSecret"
                :type="showWechatSecret ? 'text' : 'password'"
                class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 pr-10 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="输入 AppSecret"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1"
                @click="showWechatSecret = !showWechatSecret"
              >
                <svg v-if="showWechatSecret" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <!-- 鉴权错误提示 -->
          <div
            v-if="wechatStore.lastAuthError"
            class="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3"
          >
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div class="font-medium">鉴权失败</div>
                <div class="text-xs mt-0.5">{{ wechatStore.lastAuthError }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 mt-6">
          <button
            class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            @click="closeModal"
          >
            取消
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="wechatStore.isAuthenticating || !wechatForm.appId || !wechatForm.appSecret"
            @click="confirmSaveWechat"
          >
            <svg
              v-if="wechatStore.isAuthenticating"
              class="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>
              {{
                wechatStore.isAuthenticating
                  ? "鉴权中..."
                  : editingWechatAccount
                    ? "请求鉴权并更新"
                    : "请求鉴权并添加"
              }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { v4 as uuidv4 } from "uuid";
import { comicDb } from "@/api/comic";
import { selectFolder } from "@/api/native";
import type {
  ModelConfig,
  ModelCategory,
  ApiFormat,
  ApiSource,
  PromptTemplate,
  TemplateType,
} from "@comic/types";
import { llmService } from "@comic/services/llmService";
import type { TestConnectionResult } from "@comic/services/llmService";
import { useWechatAccountStore } from "@/stores/wechatAccount";
import { useToast } from "@/hooks/useToast";
import type { WechatAccount } from "@/types";
import { useTheme } from "@/theme/useTheme";

type SettingsTab = ModelCategory | "template" | "wechat" | "paths";

const { theme, toggle: toggleTheme } = useTheme();
const activeCategory = ref<SettingsTab>("llm");
const models = ref<ModelConfig[]>([]);
const templates = ref<PromptTemplate[]>([]);
const showAddModal = ref(false);
const editingId = ref<string | null>(null);

const form = ref({
  name: "",
  apiFormat: "openai" as ApiFormat,
  apiSource: "grsai" as ApiSource,
  model: "",
  baseUrl: "",
  apiKey: "",
  aspectRatios: "",
  resolutions: "",
  qualities: "",
  // OpenAI 专属参数
  openaiOutputFormat: "png" as "png" | "jpeg" | "webp",
  openaiN: 1,
  openaiModeration: "auto" as "auto" | "low",
  openaiOutputCompression: 50,
  openaiCompatibleMode: false,
});

const templateForm = ref({
  name: "",
  type: "extract" as TemplateType,
  description: "",
  content: "",
});

// ==================== 微信公众号 ====================
const wechatStore = useWechatAccountStore();
const { success: toastSuccess } = useToast();
const wechatForm = ref({ appId: "", appSecret: "" });
const showWechatSecret = ref(false);
const editingWechatAccount = ref<WechatAccount | null>(null);

const resetForm = () => {
  form.value = {
    name: "",
    apiFormat: "openai",
    apiSource: "grsai",
    model: "",
    baseUrl: "",
    apiKey: "",
    aspectRatios: "",
    resolutions: "",
    qualities: "",
    openaiOutputFormat: "png",
    openaiN: 1,
    openaiModeration: "auto",
    openaiOutputCompression: 50,
    openaiCompatibleMode: false,
  };
  templateForm.value = {
    name: "",
    type: "extract",
    description: "",
    content: "",
  };
  wechatForm.value = { appId: "", appSecret: "" };
  editingId.value = null;
  editingWechatAccount.value = null;
  showWechatSecret.value = false;
  wechatStore.clearError();
};

const closeModal = () => {
  showAddModal.value = false;
  resetForm();
  formTestResult.value = null;
  formTestLoading.value = false;
};

const openAddModal = () => {
  resetForm();
  showAddModal.value = true;
};

const editModel = (model: ModelConfig) => {
  editingId.value = model.id;
  // 解析 OpenAI 专属参数
  let openaiParams: Record<string, unknown> = {};
  if (model.openaiExtraParams) {
    try {
      openaiParams = JSON.parse(model.openaiExtraParams);
    } catch {
      /* ignore */
    }
  }
  form.value = {
    name: model.name,
    apiFormat: model.apiFormat || "openai",
    apiSource: model.apiSource || "grsai",
    model: model.model,
    baseUrl: model.baseUrl,
    apiKey: model.apiKey,
    aspectRatios: model.aspectRatios || "",
    resolutions: model.resolutions || "",
    qualities: model.qualities || "",
    openaiOutputFormat:
      (openaiParams.outputFormat as "png" | "jpeg" | "webp") || "png",
    openaiN: (openaiParams.n as number) || 1,
    openaiModeration: (openaiParams.moderation as "auto" | "low") || "auto",
    openaiOutputCompression: (openaiParams.outputCompression as number) || 50,
    openaiCompatibleMode: (openaiParams.compatibleMode as boolean) || false,
  };
  showAddModal.value = true;
};

const editTemplate = (tmpl: PromptTemplate) => {
  editingId.value = tmpl.id;
  templateForm.value = {
    name: tmpl.name,
    type: tmpl.type,
    description: tmpl.description,
    content: tmpl.content,
  };
  showAddModal.value = true;
};

// ==================== 微信公众号方法 ====================

/** 编辑公众号账号 */
const editWechatAccount = (account: WechatAccount) => {
  editingWechatAccount.value = account;
  wechatForm.value = {
    appId: account.appId,
    appSecret: account.appSecret || "",
  };
  showWechatSecret.value = false;
  wechatStore.clearError();
  showAddModal.value = true;
};

/** 确认添加/编辑公众号（请求鉴权） */
const confirmSaveWechat = async () => {
  if (!wechatForm.value.appId || !wechatForm.value.appSecret) return;

  if (editingWechatAccount.value) {
    const result = await wechatStore.updateAccount(
      editingWechatAccount.value.id,
      wechatForm.value.appId,
      wechatForm.value.appSecret,
    );
    if (result) {
      toastSuccess("账号更新成功！");
      closeModal();
    }
  } else {
    const result = await wechatStore.authenticateAndSaveAccount(
      wechatForm.value.appId,
      wechatForm.value.appSecret,
    );
    if (result) {
      toastSuccess("鉴权成功！");
      closeModal();
    }
  }
};

/** 切换活跃公众号 */
const switchWechatAccount = async (accountId: string) => {
  await wechatStore.setActiveAccount(accountId);
  toastSuccess("账号已切换");
};

/** 设置/取消默认同步账号 */
const setDefaultSyncWechatAccount = async (accountId: string) => {
  const account = wechatStore.accounts.find(a => a.id === accountId);
  const willCancel = account?.isDefaultSync;
  await wechatStore.setDefaultSyncAccount(accountId);
  toastSuccess(willCancel ? "已取消默认同步" : "默认同步账号已设置");
};

/** 删除公众号账号 */
const deleteWechatAccount = async (accountId: string) => {
  if (!confirm("确定要删除这个账号吗？")) return;
  await wechatStore.deleteAccount(accountId);
  toastSuccess("账号已删除");
};

/** 格式化 Token 剩余有效期 */
const wechatTokenExpiresInText = (account: WechatAccount): string => {
  if (!account.tokenExpiresAt) return "未知";
  const remaining = Math.max(
    0,
    Math.floor((account.tokenExpiresAt - Date.now()) / 1000 / 60),
  );
  if (remaining > 60) return `${Math.floor(remaining / 60)}小时`;
  return `${remaining}分钟`;
};

interface TabItem {
  key: SettingsTab;
  label: string;
  iconPath: string;
}

const categoryTabs: TabItem[] = [
  {
    key: "llm",
    label: "LLM模型",
    iconPath:
      "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  },
  {
    key: "image",
    label: "图片模型",
    iconPath:
      "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    key: "video",
    label: "视频模型",
    iconPath:
      "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
  {
    key: "template",
    label: "提示词模板",
    iconPath:
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    key: "wechat",
    label: "微信公众号",
    iconPath:
      "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    key: "paths",
    label: "本地路径",
    iconPath:
      "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
  },
];

interface ApiFormatOption {
  value: ApiFormat;
  label: string;
}

const apiFormats: ApiFormatOption[] = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
  { value: "claude", label: "Claude" },
];

interface ApiSourceOption {
  value: ApiSource;
  label: string;
}

const apiSourceOptions: ApiSourceOption[] = [
  { value: "grsai", label: "GRSAI" },
  { value: "xiguapi", label: "Xiguapi" },
  { value: "duomi", label: "Duomi" },
  { value: "openai", label: "OpenAI" },
];

interface TemplateTypeOption {
  value: TemplateType;
  label: string;
}

const templateTypes: TemplateTypeOption[] = [
  { value: "style", label: "风格模板" },
  { value: "extract", label: "提取模板" },
  { value: "story", label: "故事模板" },
];

const formatApiFormat = (fmt: ApiFormat): string => {
  const map: Record<ApiFormat, string> = {
    openai: "OpenAI",
    gemini: "Gemini",
    claude: "Claude",
  };
  return map[fmt];
};

const formatApiSource = (src: ApiSource): string => {
  const map: Record<ApiSource, string> = {
    grsai: "GRSAI",
    xiguapi: "Xiguapi",
    duomi: "Duomi",
    openai: "OpenAI",
  };
  return map[src];
};

const formatTemplateType = (type: TemplateType): string => {
  const map: Record<TemplateType, string> = {
    style: "风格",
    extract: "提取",
    story: "故事",
  };
  return map[type];
};

const categoryLabel = computed(() => {
  const map: Record<SettingsTab, string> = {
    llm: "LLM",
    image: "图片",
    video: "视频",
    template: "提示词模板",
    wechat: "微信公众号",
    paths: "本地路径",
  };
  return map[activeCategory.value];
});

const categoryDesc = computed(() => {
  const map: Record<SettingsTab, string> = {
    llm: "配置用于文本生成和对话的LLM模型",
    image: "配置用于图像生成的AI模型",
    video: "配置用于视频生成的AI模型",
    template: "配置用于AI处理的提示词模板",
    wechat: "管理微信公众号账号，用于草稿同步",
    paths: "配置导出文件的本地保存路径",
  };
  return map[activeCategory.value];
});

const addButtonText = computed(() => {
  if (activeCategory.value === "template") return "添加模板";
  if (activeCategory.value === "wechat") return "添加账号";
  return "添加模型";
});

const filteredModels = computed(() =>
  models.value.filter((m) => m.category === activeCategory.value),
);

const filteredTemplates = computed(() => templates.value);

const loadModels = async () => {
  const all = await comicDb.getAllModelConfigs();
  all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  models.value = all;
};

const loadTemplates = async () => {
  const all = await comicDb.getAllPromptTemplates();
  all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  templates.value = all;
};

/**
 * 构建 OpenAI 专属参数 JSON 字符串
 * @returns JSON 字符串，仅在 apiSource='openai' 时返回
 */
const buildOpenaiExtraParams = (): string | undefined => {
  if (form.value.apiSource !== "openai") return undefined;
  return JSON.stringify({
    outputFormat: form.value.openaiOutputFormat,
    n: form.value.openaiN,
    moderation: form.value.openaiModeration,
    outputCompression:
      form.value.openaiOutputFormat !== "png"
        ? form.value.openaiOutputCompression
        : undefined,
    compatibleMode: form.value.openaiCompatibleMode,
  });
};

const confirmSave = async () => {
  if (!form.value.name || !form.value.model || !form.value.baseUrl) return;

  const isImage = activeCategory.value === "image";
  const openaiExtraParams = buildOpenaiExtraParams();

  if (editingId.value) {
    const existing = models.value.find((m) => m.id === editingId.value);
    if (existing) {
      await comicDb.saveModelConfig({
        ...existing,
        name: form.value.name,
        ...(isImage
          ? { apiSource: form.value.apiSource }
          : { apiFormat: form.value.apiFormat }),
        model: form.value.model,
        baseUrl: form.value.baseUrl,
        apiKey: form.value.apiKey,
        ...(isImage
          ? {
              aspectRatios: form.value.aspectRatios,
              resolutions: form.value.resolutions,
              qualities: form.value.qualities,
            }
          : {}),
        ...(openaiExtraParams !== undefined ? { openaiExtraParams } : {}),
        updatedAt: Date.now(),
      });
    }
  } else {
    const maxOrder =
      models.value.length > 0
        ? Math.max(...models.value.map((m) => m.sortOrder ?? 0))
        : 0;
    const config: ModelConfig = {
      id: uuidv4(),
      name: form.value.name,
      ...(isImage
        ? { apiSource: form.value.apiSource }
        : { apiFormat: form.value.apiFormat }),
      model: form.value.model,
      baseUrl: form.value.baseUrl,
      apiKey: form.value.apiKey,
      category: activeCategory.value as ModelCategory,
      ...(isImage
        ? {
            aspectRatios: form.value.aspectRatios,
            resolutions: form.value.resolutions,
            qualities: form.value.qualities,
          }
        : {}),
      ...(openaiExtraParams !== undefined ? { openaiExtraParams } : {}),
      sortOrder: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await comicDb.saveModelConfig(config);
  }

  await loadModels();
  closeModal();
};

const confirmSaveTemplate = async () => {
  if (!templateForm.value.name || !templateForm.value.content) return;

  if (editingId.value) {
    const existing = templates.value.find((t) => t.id === editingId.value);
    if (existing) {
      await comicDb.savePromptTemplate({
        ...existing,
        name: templateForm.value.name,
        type: templateForm.value.type,
        description: templateForm.value.description,
        content: templateForm.value.content,
        updatedAt: Date.now(),
      });
    }
  } else {
    const maxOrder =
      templates.value.length > 0
        ? Math.max(...templates.value.map((t) => t.sortOrder ?? 0))
        : 0;
    const tmpl: PromptTemplate = {
      id: uuidv4(),
      name: templateForm.value.name,
      type: templateForm.value.type,
      description: templateForm.value.description,
      content: templateForm.value.content,
      sortOrder: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await comicDb.savePromptTemplate(tmpl);
  }

  await loadTemplates();
  closeModal();
};

const deleteModel = async (id: string) => {
  await comicDb.deleteModelConfig(id);
  await loadModels();
};

const deleteTemplate = async (id: string) => {
  await comicDb.deletePromptTemplate(id);
  await loadTemplates();
};

const duplicateModel = async (model: ModelConfig) => {
  const maxOrder =
    models.value.length > 0
      ? Math.max(...models.value.map((m) => m.sortOrder ?? 0))
      : 0;
  const config: ModelConfig = {
    id: uuidv4(),
    name: `${model.name} (副本)`,
    apiFormat: model.apiFormat,
    apiSource: model.apiSource,
    model: model.model,
    baseUrl: model.baseUrl,
    apiKey: model.apiKey,
    category: model.category,
    aspectRatios: model.aspectRatios,
    resolutions: model.resolutions,
    qualities: model.qualities,
    sortOrder: maxOrder + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await comicDb.saveModelConfig(config);
  await loadModels();
};

const duplicateTemplate = async (tmpl: PromptTemplate) => {
  const maxOrder =
    templates.value.length > 0
      ? Math.max(...templates.value.map((t) => t.sortOrder ?? 0))
      : 0;
  const newTmpl: PromptTemplate = {
    id: uuidv4(),
    name: `${tmpl.name} (副本)`,
    type: tmpl.type,
    description: tmpl.description,
    content: tmpl.content,
    sortOrder: maxOrder + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await comicDb.savePromptTemplate(newTmpl);
  await loadTemplates();
};

const maskApiKey = (key: string): string => {
  if (!key || key.length <= 8) return "***";
  return key.slice(0, 4) + "****" + key.slice(-4);
};

// ==================== 拖拽排序 ====================

const draggedModelId = ref<string | null>(null);
const draggedTemplateId = ref<string | null>(null);

const handleModelDragStart = (event: DragEvent, modelId: string) => {
  draggedModelId.value = modelId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", modelId);
  }
};

const handleModelDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
};

const handleModelDrop = async (event: DragEvent, targetId: string) => {
  event.preventDefault();
  if (!draggedModelId.value || draggedModelId.value === targetId) {
    draggedModelId.value = null;
    return;
  }

  const draggedIdx = models.value.findIndex(
    (m) => m.id === draggedModelId.value,
  );
  const targetIdx = models.value.findIndex((m) => m.id === targetId);
  if (draggedIdx === -1 || targetIdx === -1) {
    draggedModelId.value = null;
    return;
  }

  const dragged = models.value[draggedIdx];
  const target = models.value[targetIdx];
  const draggedOrder = dragged.sortOrder ?? 0;
  const targetOrder = target.sortOrder ?? 0;

  await comicDb.saveModelConfig({ ...dragged, sortOrder: targetOrder, updatedAt: Date.now() });
  await comicDb.saveModelConfig({ ...target, sortOrder: draggedOrder, updatedAt: Date.now() });

  draggedModelId.value = null;
  await loadModels();
};

const handleTemplateDragStart = (event: DragEvent, templateId: string) => {
  draggedTemplateId.value = templateId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", templateId);
  }
};

const handleTemplateDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
};

const handleTemplateDrop = async (event: DragEvent, targetId: string) => {
  event.preventDefault();
  if (!draggedTemplateId.value || draggedTemplateId.value === targetId) {
    draggedTemplateId.value = null;
    return;
  }

  const draggedIdx = templates.value.findIndex(
    (t) => t.id === draggedTemplateId.value,
  );
  const targetIdx = templates.value.findIndex((t) => t.id === targetId);
  if (draggedIdx === -1 || targetIdx === -1) {
    draggedTemplateId.value = null;
    return;
  }

  const dragged = templates.value[draggedIdx];
  const target = templates.value[targetIdx];
  const draggedOrder = dragged.sortOrder ?? 0;
  const targetOrder = target.sortOrder ?? 0;

  await comicDb.savePromptTemplate({ ...dragged, sortOrder: targetOrder, updatedAt: Date.now() });
  await comicDb.savePromptTemplate({ ...target, sortOrder: draggedOrder, updatedAt: Date.now() });

  draggedTemplateId.value = null;
  await loadTemplates();
};

// ==================== 连接测试 ====================

/** 卡片测试状态 */
const testLoadingId = ref<string | null>(null);
const testResultMap = reactive<Record<string, TestConnectionResult | null>>({});

/** 表单测试状态 */
const formTestLoading = ref(false);
const formTestResult = ref<TestConnectionResult | null>(null);

/** 卡片测试按钮样式 */
const testBtnClass = (id: string): string => {
  if (testLoadingId.value === id)
    return "border-cyan-500/30 text-accent bg-cyan-500/10 cursor-wait";
  const result = testResultMap[id];
  if (result?.success)
    return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
  if (result?.error) return "border-red-500/30 text-red-400 bg-red-500/10";
  return "border-border-subtle text-text-secondary hover:border-cyan-500/30 hover:text-accent hover:bg-cyan-500/10";
};

/** 表单测试按钮样式 */
const formTestBtnClass = (): string => {
  if (formTestLoading.value)
    return "border-cyan-500/30 text-accent bg-cyan-500/10 cursor-wait";
  if (formTestResult.value?.success)
    return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
  if (formTestResult.value?.error)
    return "border-red-500/30 text-red-400 bg-red-500/10";
  return "border-border-subtle text-text-secondary hover:border-cyan-500/30 hover:text-accent hover:bg-cyan-500/10";
};

/** 从卡片发起测试 */
const handleTestFromCard = async (model: ModelConfig) => {
  testLoadingId.value = model.id;
  testResultMap[model.id] = null;
  const result = await llmService.testConnection({
    baseUrl: model.baseUrl,
    apiKey: model.apiKey,
    model: model.model,
  });
  testResultMap[model.id] = result;
  testLoadingId.value = null;
};

/** 从表单发起测试 */
const handleTestFromForm = async () => {
  if (!form.value.baseUrl || !form.value.apiKey || !form.value.model) return;
  formTestLoading.value = true;
  formTestResult.value = null;
  formTestResult.value = await llmService.testConnection({
    baseUrl: form.value.baseUrl,
    apiKey: form.value.apiKey,
    model: form.value.model,
  });
  formTestLoading.value = false;
};

// ============ 本地路径配置 ============

const exportDir = ref("");

const loadAppSettings = async () => {
  const settings = await comicDb.getAppSettings();
  exportDir.value = settings.exportDir || "";
};

const selectExportDir = async () => {
  const folder = await selectFolder();
  if (folder) exportDir.value = folder;
};

const saveExportDir = async () => {
  await comicDb.saveAppSettings({ exportDir: exportDir.value.trim() || undefined });
  toastSuccess("导出路径已保存");
};

const clearExportDir = async () => {
  exportDir.value = "";
  await comicDb.saveAppSettings({ exportDir: undefined });
  toastSuccess("已恢复默认下载目录");
};

onMounted(() => {
  loadModels();
  loadTemplates();
  wechatStore.loadAccounts();
  loadAppSettings();
});
</script>
