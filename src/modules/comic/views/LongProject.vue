<template>
  <div class="flex h-screen overflow-hidden bg-app-bg text-text-primary" @click="contextMenu = null; panelMenu.visible = false; formatMenuOpen = false">
    <aside class="flex shrink-0 flex-col border-r border-border-subtle bg-surface transition-[width] duration-200" :class="sidebarCollapsed ? 'w-14' : 'w-72'">
      <template v-if="!sidebarCollapsed">
        <div class="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
          <button class="icon-button" title="返回项目列表" @click="router.push('/comic/projects')"><ArrowLeft :size="18" /></button>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-text-primary">{{ project?.name || "长篇项目" }}</p>
            <p class="text-[11px] text-text-muted">{{ chapterCount }} 个章节</p>
          </div>
          <button class="icon-button" title="收起章节栏" @click="setSidebarCollapsed(true)"><PanelLeftClose :size="18" /></button>
        </div>

        <div class="custom-scrollbar flex-1 overflow-y-auto p-2">
          <LongProjectTree
            :project-name="project?.name || '长篇项目'"
            :nodes="nodes"
            :selected-id="selectedChapterId"
            :expanded-ids="expandedFolders"
            @select="selectChapter"
            @toggle="toggleFolder"
            @contextmenu="openContextMenu($event.event, $event.node)"
            @update:nodes="persistNodes"
          />
          <LongProjectAssetLibraryTree :selected-category="selectedAssetCategory" class="mt-3" @select="selectAssetCategory" />
        </div>
      </template>

      <template v-else>
        <div class="flex h-full flex-col items-center gap-2 py-3">
          <button class="sidebar-icon" title="展开章节栏" @click="setSidebarCollapsed(false)"><PanelLeftOpen :size="19" /></button>
          <div class="my-1 h-px w-7 bg-border-subtle" />
          <button v-for="chapter in chapters.slice(0, 8)" :key="chapter.id" class="sidebar-icon" :class="selectedChapterId === chapter.id ? 'bg-cyan-500/15 text-cyan-400' : ''" :title="chapter.name" @click="selectChapter(chapter)"><FileText :size="17" /></button>
          <button class="sidebar-icon" :class="selectedAssetCategory ? 'bg-violet-500/15 text-violet-300' : ''" title="资产库" @click="selectAssetCategory('character')"><Boxes :size="18" /></button>
          <div class="flex-1" />
          <button class="sidebar-icon" title="返回项目列表" @click="router.push('/comic/projects')"><ArrowLeft :size="18" /></button>
        </div>
      </template>
    </aside>

    <main class="min-w-0 flex-1 overflow-hidden">
      <div v-if="loading" class="flex h-full items-center justify-center text-sm text-text-secondary">正在加载项目...</div>

      <section v-else-if="selectedAssetCategory" class="custom-scrollbar h-full overflow-y-auto">
        <LongProjectAssetLibrary :category="selectedAssetCategory" :assets="assetsForSelectedCategory" />
      </section>

      <section v-else-if="!selectedChapter" class="custom-scrollbar h-full overflow-y-auto">
        <div class="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-8 py-12">
          <div class="mb-10 text-center">
            <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border-subtle bg-surface text-cyan-400 shadow-card"><Workflow :size="24" /></div>
            <h1 class="text-xl font-semibold text-text-primary">小说转漫画创作流程</h1>
            <p class="mt-2 text-sm text-text-secondary">从章节原文开始，逐步确认内容和视觉资产</p>
          </div>

          <div class="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] items-center">
            <template v-for="(step, index) in workflowSteps" :key="step.title">
              <div class="flex min-w-0 flex-col items-center text-center">
                <div class="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle bg-surface text-text-secondary"><component :is="step.icon" :size="20" /></div>
                <p class="text-sm font-medium text-text-primary">{{ step.title }}</p>
                <p class="mt-1 text-xs text-text-muted">{{ step.description }}</p>
              </div>
              <ArrowRight v-if="index < workflowSteps.length - 1" :size="17" class="mx-3 text-cyan-500/60" />
            </template>
          </div>

          <div class="mt-12 flex flex-col items-center">
            <template v-if="chapterCount === 0">
              <p class="mb-4 text-sm text-text-secondary">项目中还没有章节，先添加小说内容</p>
              <button class="primary-button" @click="openCreateDialog('chapter', null)"><FilePlus2 :size="17" />创建第一个章节</button>
            </template>
            <template v-else>
              <div class="mb-4 flex items-center gap-5 text-sm text-text-secondary"><span>共 {{ chapterCount }} 章</span><span>{{ readyChapterCount }} 章已添加正文</span></div>
              <button class="primary-button" @click="selectChapter(chapters[0])">继续创作<ArrowRight :size="17" /></button>
            </template>
          </div>
        </div>
      </section>

      <section v-else-if="activeExtractionRun" class="flex h-full flex-col">
        <LongProjectAssetExtractionReview
          v-if="activeExtractionRun.status === 'completed' || activeExtractionRun.status === 'confirmed'"
          :chapter-name="selectedChapter.name"
          :source-word-count="activeExtractionRun.sourceWordCount"
          :candidates="activeExtractionRun.candidates"
          :assets="projectAssets"
          @update="updateExtractionCandidate"
          @back="activeExtractionRunId = null"
          @confirm="confirmAssetExtraction"
        />
        <div v-else class="flex flex-1 items-center justify-center p-8 text-center">
          <div v-if="activeExtractionRun.status === 'running'" class="w-full max-w-sm">
            <div class="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10">
              <span class="absolute inset-0 rounded-lg border border-cyan-400/40 extraction-ring" />
              <LoaderCircle :size="26" class="animate-spin text-cyan-400" />
            </div>
            <h2 class="text-base font-medium text-text-primary">正在提取章节资产</h2>
            <p class="mt-2 text-sm text-text-secondary">正在读取原文并识别需要保持一致的人物、场景和道具。</p>
            <div class="mt-7 grid grid-cols-3 gap-2 text-left">
              <div v-for="step in extractionLoadingSteps" :key="step.label" class="rounded-md border border-border-subtle bg-surface px-3 py-3">
                <component :is="step.icon" :size="16" class="mb-2 text-cyan-400 extraction-step-icon" />
                <p class="text-xs text-text-primary">{{ step.label }}</p>
                <p class="mt-1 text-[11px] text-text-muted">处理中</p>
              </div>
            </div>
            <div class="mx-auto mt-5 flex items-center justify-center gap-1.5 text-xs text-text-muted"><span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" /><span class="ml-1">大模型生成中</span></div>
          </div>
          <div v-else>
            <ScanText :size="28" class="mx-auto mb-4 text-red-400" />
            <h2 class="text-base font-medium text-text-primary">资产提取失败</h2>
            <p class="mx-auto mt-2 max-w-lg text-sm text-text-secondary">{{ activeExtractionRun.error || '请求未能完成，请检查模型配置与提示词后重试。' }}</p>
            <div class="mt-5 flex justify-center gap-3"><button class="secondary-button" @click="activeExtractionRunId = null">返回原文</button><button class="primary-button" @click="runAiTask">重新提取</button></div>
          </div>
        </div>
      </section>

      <section v-else class="flex h-full flex-col">
        <div class="shrink-0 border-b border-border-subtle bg-surface px-6 pt-4">
          <div class="flex items-center justify-between gap-4 pb-3">
            <h1 class="min-w-0 truncate text-base font-semibold text-text-primary">{{ selectedChapter.name }}</h1>
            <p class="shrink-0 text-xs text-text-muted">{{ wordCount(draftContent) }} 字 · {{ saveStatus }}</p>
          </div>
          <nav class="flex gap-6" aria-label="章节创作阶段">
            <button v-for="tab in chapterTabs" :key="tab.key" class="border-b-2 px-0.5 pb-2.5 text-sm transition-colors" :class="activeTab === tab.key ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-text-muted hover:text-text-primary'" @click="activeTab = tab.key">{{ tab.label }}</button>
          </nav>
        </div>

        <div v-if="activeTab === 'source'" class="flex min-h-0 flex-1 flex-col p-6">
          <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface focus-within:border-cyan-500/50">
            <div class="flex shrink-0 items-center justify-between border-b border-border-subtle px-3 py-2">
              <div class="flex items-center gap-1">
                <button class="editor-tool" title="清理空行" @click="formatContent('empty-lines')"><Rows3 :size="15" /><span>清理空行</span></button>
                <button class="editor-tool" title="去除行首序号" @click="formatContent('line-numbers')"><ListX :size="15" /><span>去序号</span></button>
                <button class="editor-tool" title="合并碎行" @click="formatContent('merge-lines')"><AlignJustify :size="15" /><span>合并碎行</span></button>
                <button class="editor-tool" title="撤销文本整理" :disabled="!contentHistory.length" @click="undoFormat"><Undo2 :size="15" /><span>撤销</span></button>
                <div class="relative">
                  <button class="editor-tool" title="更多文本整理操作" @click.stop="formatMenuOpen = !formatMenuOpen"><Ellipsis :size="16" /><span>更多</span></button>
                  <div v-if="formatMenuOpen" class="absolute left-0 top-9 z-10 min-w-32 rounded-md border border-border-subtle bg-surface p-1 shadow-xl" @click.stop>
                    <button class="format-menu-action" @click="formatContent('indent'); formatMenuOpen = false"><TextAlignStart :size="14" />去除缩进</button>
                    <button class="format-menu-action" @click="formatContent('trim-lines'); formatMenuOpen = false"><Eraser :size="14" />清理行尾空格</button>
                  </div>
                </div>
              </div>
              <p class="text-xs text-text-muted">{{ wordCount(draftContent) }} 字 · {{ paragraphCount }} 段 · {{ saveStatus }}</p>
            </div>
            <div v-if="sourceExtractionStatus" class="flex shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-app-bg/40 px-4 py-2">
              <div class="flex min-w-0 items-center gap-2 text-xs">
                <ScanText :size="14" :class="sourceExtractionStatus.tone" />
                <span class="shrink-0 text-text-secondary">资产提取</span>
                <span class="truncate" :class="sourceExtractionStatus.tone">{{ sourceExtractionStatus.message }}</span>
              </div>
              <button v-if="continueEditingRun" class="shrink-0 text-xs text-cyan-400 hover:text-cyan-300" title="继续编辑最近一次资产提取结果" @click="continueEditingExtraction">继续编辑</button>
            </div>
            <textarea v-model="draftContent" class="custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-5 text-sm leading-7 text-text-primary outline-none placeholder:text-text-muted" placeholder="粘贴或输入当前小说章节内容..." />
            <div class="flex shrink-0 items-center gap-3 border-t border-border-subtle px-4 py-3">
              <div class="inline-flex h-9 shrink-0 rounded-md border border-border-subtle bg-app-bg p-0.5">
                <button v-for="task in aiTasks" :key="task.key" class="rounded px-3 text-xs transition-colors" :class="aiTask === task.key ? 'bg-elevated text-cyan-400 shadow-sm' : 'text-text-muted hover:text-text-primary'" @click="aiTask = task.key">{{ task.label }}</button>
              </div>
              <label class="w-44 shrink-0">
                <span class="sr-only">选择模型</span>
                <select v-model="selectedModelByTask[aiTask]" class="task-select">
                  <option value="" disabled>选择模型</option>
                  <option v-for="model in llmModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
              </label>
              <label class="w-44 shrink-0">
                <span class="sr-only">选择提示词模板</span>
                <select v-model="selectedTemplateByTask[aiTask]" class="task-select">
                  <option value="" disabled>选择提示词模板</option>
                  <option v-for="template in templatesForCurrentTask" :key="template.id" :value="template.id">{{ template.name }}</option>
                </select>
              </label>
              <label class="flex h-9 shrink-0 cursor-pointer items-center gap-2 px-1 text-xs text-text-secondary" title="执行前查看并编辑最终发送给模型的提示词">
                <input v-model="confirmPromptBeforeRun" type="checkbox" class="h-3.5 w-3.5 accent-cyan-400" @change="saveConfirmPromptPreference" />
                发送前确认
              </label>
              <button class="primary-button task-run-button ml-auto shrink-0 px-4" :disabled="!canRunAiTask" @click="runAiTask">{{ currentAiTask.key === 'assets' ? extractionButtonLabel : currentAiTask.label }}<ArrowRight :size="16" /></button>
            </div>
          </div>
        </div>

        <LongProjectAssetTab
          v-else-if="activeTab === 'assets'"
          :entries="selectedChapterAssets"
          :assets="projectAssets"
          :chapter-id="selectedChapter.id"
          :llm-models="llmModels"
          :image-models="imageModels"
          :templates="promptTemplates"
          :asset-gen-config="assetGenConfig"
          :painting-style="project?.comicConfig?.paintingStyle"
          :shared-blocks="project?.imageGenConfig?.sharedBlocks"
          @update:asset="updateAssetVariant"
          @update:gen-config="updateAssetGenConfig"
        />

        <div v-else-if="activeTab === 'storyboard'" class="custom-scrollbar flex flex-1 flex-col overflow-y-auto p-6">
          <div class="mx-auto flex min-h-0 w-full flex-1 flex-col" :class="activeTab === 'storyboard' && !storyboardEditing ? (storyboardViewMode === 'table' ? 'max-w-full' : 'max-w-6xl') : 'max-w-4xl'">
            <div v-if="latestStoryboardRun?.status === 'running'" class="flex min-h-0 flex-1 items-center justify-center text-center">
              <div class="w-full max-w-sm">
                <div class="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10">
                  <span class="absolute inset-0 rounded-lg border border-cyan-400/40 extraction-ring" />
                  <LoaderCircle :size="26" class="animate-spin text-cyan-400" />
                </div>
                <h2 class="text-base font-medium text-text-primary">正在生成分镜</h2>
                <p class="mt-2 text-sm text-text-secondary">正在结合当前章节与项目资产库匹配视觉状态。</p>
                <div class="mt-7 grid grid-cols-3 gap-2 text-left">
                  <div v-for="step in storyboardLoadingSteps" :key="step.label" class="rounded-md border border-border-subtle bg-surface px-3 py-3">
                    <component :is="step.icon" :size="16" class="mb-2 text-cyan-400 extraction-step-icon" />
                    <p class="text-xs text-text-primary">{{ step.label }}</p>
                    <p class="mt-1 text-[11px] text-text-muted">处理中</p>
                  </div>
                </div>
                <div class="mx-auto mt-5 flex items-center justify-center gap-1.5 text-xs text-text-muted"><span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" /><span class="ml-1">大模型生成中</span></div>
              </div>
            </div>
            <div v-else-if="latestStoryboardRun?.status === 'completed'" class="flex min-h-0 flex-1 flex-col space-y-3">
              <!-- 合并/拆分操作撤销条（8 秒内可撤销） -->
              <div v-if="storyboardUndoAvailable" class="flex shrink-0 items-center justify-between rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300">
                <span>{{ storyboardUndoLabel }}</span>
                <button class="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-amber-400/10" @click="undoStoryboardOp"><Undo2 :size="12" />撤销</button>
              </div>
              <div class="flex shrink-0 items-center justify-between">
                <div class="flex items-center gap-3">
                  <p class="text-sm text-text-secondary">
                    <template v-if="storyboardEditing">{{ draftPanelCount }} 个分镜 · 逐镜编辑镜头/画面/对白/旁白，按序保留资产绑定</template>
                    <template v-else>{{ latestStoryboardRun.panels.length }} 个分镜 · 已按项目资产库匹配</template>
                  </p>
                  <!-- 视图模式切换：双栏对照 / 表格 -->
                  <div v-if="!storyboardEditing" class="flex items-center rounded-lg border border-border-subtle bg-surface p-[2px]">
                    <button
                      class="rounded px-2 py-0.5 text-[11px] transition-colors"
                      :class="storyboardViewMode === 'split' ? 'bg-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'"
                      title="左侧章节原文与右侧分镜对照，滚动联动"
                      @click="setStoryboardViewMode('split')"
                    >对照</button>
                    <button
                      class="rounded px-2 py-0.5 text-[11px] transition-colors"
                      :class="storyboardViewMode === 'table' ? 'bg-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'"
                      title="紧凑表格，一屏纵览全章分镜"
                      @click="setStoryboardViewMode('table')"
                    >表格</button>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <template v-if="storyboardEditing">
                    <button class="secondary-button text-xs" @click="cancelStoryboardEditing">取消</button>
                    <button class="primary-button text-xs" :disabled="!draftPanelCount || storyboardSaving" @click="saveStoryboardEditing">保存分镜<Check :size="14" /></button>
                  </template>
                  <template v-else>
                    <button class="secondary-button text-xs" @click="enterStoryboardEditing"><Pencil :size="14" />编辑分镜</button>
                    <button class="primary-button text-xs" @click="openPanelGen">进入生图工作台<ArrowRight :size="14" /></button>
                    <button class="secondary-button text-xs" @click="activeTab = 'source'">返回原文</button>
                  </template>
                </div>
              </div>
              <!-- 结构化编辑：逐镜卡片，完整编辑镜头/画面/对白/旁白 -->
              <div v-if="storyboardEditing" class="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                <article
                  v-for="(item, index) in storyboardDraftPanels"
                  :key="item.key"
                  class="rounded-lg border border-border-subtle bg-surface p-4"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-cyan-400">分镜 {{ index + 1 }}</span>
                    <button class="icon-button" title="删除该分镜" @click="removeDraftPanel(index)"><Trash2 :size="14" /></button>
                  </div>
                  <label class="mt-3 block">
                    <span class="mb-1 block text-[11px] text-text-muted">镜头</span>
                    <textarea v-model="item.shot" rows="2" class="custom-scrollbar w-full resize-y rounded-lg border border-border-subtle bg-input-bg p-2 text-sm leading-6 text-text-primary outline-none focus:border-cyan-500/50" placeholder="近景 / 全景…（可空）" />
                  </label>
                  <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <label class="block">
                      <span class="mb-1 block text-[11px] text-text-muted">对白</span>
                      <textarea v-model="item.dialogue" rows="2" class="custom-scrollbar w-full resize-y rounded-lg border border-border-subtle bg-input-bg p-2 text-sm leading-6 text-text-primary outline-none focus:border-cyan-500/50" placeholder="角色台词（可空）" />
                    </label>
                    <label class="block">
                      <span class="mb-1 block text-[11px] text-text-muted">旁白</span>
                      <textarea v-model="item.narration" rows="2" class="custom-scrollbar w-full resize-y rounded-lg border border-border-subtle bg-input-bg p-2 text-sm leading-6 text-text-primary outline-none focus:border-cyan-500/50" placeholder="画外音 / 内心独白（可空）" />
                    </label>
                  </div>
                  <label class="mt-3 block">
                    <span class="mb-1 block text-[11px] text-text-muted">画面（必填）</span>
                    <textarea v-model="item.content" rows="3" class="custom-scrollbar w-full resize-y rounded-lg border border-border-subtle bg-input-bg p-2 text-sm leading-6 text-text-primary outline-none focus:border-cyan-500/50" placeholder="这一格画面发生了什么…" />
                  </label>
                </article>
                <button class="secondary-button w-full justify-center text-xs" @click="addDraftPanel"><Plus :size="14" />添加分镜</button>
              </div>
              <!-- 双栏对照：左章节原文，右分镜卡片，滚动按比例联动 -->
              <div v-else-if="storyboardViewMode === 'split'" class="flex min-h-0 flex-1 gap-3">
                <div
                  ref="splitSourceEl"
                  class="custom-scrollbar min-h-0 flex-1 overflow-y-auto rounded-lg border border-border-subtle bg-surface p-4"
                  @scroll="onSplitScroll('source')"
                >
                  <p class="mb-3 shrink-0 text-xs font-medium text-text-secondary">章节原文</p>
                  <p class="whitespace-pre-wrap text-sm leading-7 text-text-primary">{{ latestStoryboardRun.sourceContent }}</p>
                </div>
                <div
                  ref="splitPanelsEl"
                  class="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
                  @scroll="onSplitScroll('panels')"
                >
                  <article v-for="panel in latestStoryboardRun.panels" :key="panel.id" class="cursor-context-menu rounded-lg border border-border-subtle bg-surface p-4 transition-colors hover:border-border-strong" @contextmenu.prevent="openPanelMenu($event, panel)"><div class="flex items-center justify-between gap-4"><span class="text-xs font-medium text-cyan-400">分镜 {{ panel.order }}</span><span v-if="panel.shot" class="text-xs text-text-muted">{{ panel.shot }}</span></div><p class="mt-3 text-sm leading-6 text-text-primary">{{ panel.content }}</p><p v-if="panel.dialogue" class="mt-2 rounded-lg border border-border-subtle bg-elevated px-3 py-2 text-sm leading-6 text-text-primary">对白：{{ panel.dialogue }}</p><p v-if="panel.narration" class="mt-2 text-xs leading-5 text-text-muted">旁白：{{ panel.narration }}</p><div v-if="panel.assetBindings.length" class="mt-3 flex flex-wrap gap-1.5"><AssetBindingTag v-for="binding in panel.assetBindings" :key="`${binding.assetName}-${binding.visualVersionName}`" :binding="binding" :assets="projectAssets" @inspect="inspectAssetBinding" /></div><p v-if="panel.imagePrompt" class="mt-3 border-t border-border-subtle pt-3 text-xs leading-5 text-text-secondary">{{ panel.imagePrompt }}</p></article>
                </div>
              </div>
              <!-- 表格视图：紧凑纵览全章分镜 -->
              <div v-else class="custom-scrollbar min-h-0 flex-1 overflow-y-auto rounded-lg border border-border-subtle bg-surface">
                <table class="w-full table-fixed text-left text-xs">
                  <thead class="sticky top-0 z-10 bg-surface text-[11px] text-text-muted">
                    <tr class="border-b border-border-subtle">
                      <th class="w-10 px-2 py-2 font-medium">#</th>
                      <th class="px-2 py-2 font-medium">镜头</th>
                      <th class="px-2 py-2 font-medium">画面</th>
                      <th class="w-44 px-2 py-2 font-medium">对白 / 旁白</th>
                      <th class="w-36 px-2 py-2 font-medium">资产</th>
                      <th class="w-20 px-2 py-2 font-medium">成图</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="panel in latestStoryboardRun.panels"
                      :key="panel.id"
                      class="cursor-context-menu border-b border-border-subtle/60 align-top transition-colors hover:bg-cyan-500/5"
                      @contextmenu.prevent="openPanelMenu($event, panel)"
                    >
                      <td class="px-2 py-2 font-medium text-cyan-400">{{ panel.order }}</td>
                      <td class="px-2 py-2 leading-5 text-text-muted">{{ panel.shot || '—' }}</td>
                      <td class="px-2 py-2 leading-5 text-text-primary">{{ panel.content }}</td>
                      <td class="px-2 py-2 leading-5">
                        <p v-if="panel.dialogue" class="text-text-primary">对白：{{ panel.dialogue }}</p>
                        <p v-if="panel.narration" class="text-text-muted">旁白：{{ panel.narration }}</p>
                        <p v-if="!panel.dialogue && !panel.narration" class="text-text-muted">—</p>
                      </td>
                      <td class="px-2 py-2">
                        <div class="flex flex-wrap gap-1">
                          <AssetBindingTag v-for="binding in panel.assetBindings" :key="`${binding.assetName}-${binding.visualVersionName}`" :binding="binding" :assets="projectAssets" @inspect="inspectAssetBinding" />
                          <span v-if="!panel.assetBindings.length" class="text-text-muted">—</span>
                        </div>
                      </td>
                      <td class="px-2 py-2">
                        <img v-if="artworkMap.get(panel.id)?.selectedImageId" :src="artworkMap.get(panel.id)!.selectedImageId" class="h-14 w-14 rounded border border-border-subtle object-cover" :alt="`分镜${panel.order}成图`" />
                        <span v-else class="text-text-muted">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else-if="latestStoryboardRun?.status === 'failed'" class="flex min-h-64 flex-col items-center justify-center text-center"><ScanText :size="28" class="text-red-400" /><h2 class="mt-4 text-base font-medium text-text-primary">分镜生成失败</h2><p class="mt-2 text-sm text-text-secondary">{{ latestStoryboardRun.error }}</p></div>
            <div v-else class="flex min-h-64 flex-col items-center justify-center text-center"><ListTree :size="28" class="text-text-muted" /><h2 class="mt-4 text-base font-medium text-text-primary">尚未生成分镜</h2><p class="mt-2 text-sm text-text-secondary">在原文底部选择“生成分镜”，系统会根据当前章节和项目资产库推荐视觉状态。</p></div>
          </div>
        </div>
        <div v-else class="flex flex-1 items-center justify-center p-8 text-center">
          <div>
            <component :is="activeTabInfo.icon" :size="26" class="mx-auto mb-3 text-text-muted" />
            <h2 class="text-base font-medium text-text-primary">{{ activeTabInfo.label }}</h2>
            <p class="mt-2 text-sm text-text-secondary">基于章节原文和项目资产梳理关键画面</p>
          </div>
        </div>
      </section>
    </main>

    <div v-if="promptPreviewVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" @click.self="closePromptPreview">
      <section class="flex h-[min(720px,calc(100vh-3rem))] w-[min(860px,100%)] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-2xl">
        <header class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
          <div><h2 class="text-base font-semibold text-text-primary">确认发送内容</h2><p class="mt-1 text-xs text-text-muted">可在本次执行前修改，修改不会覆盖系统提示词模板。</p></div>
          <button class="icon-button" title="关闭" @click="closePromptPreview"><X :size="18" /></button>
        </header>
        <div class="min-h-0 flex-1 p-5">
          <textarea v-model="promptPreviewContent" class="custom-scrollbar h-full w-full resize-none rounded-md border border-border-subtle bg-app-bg p-4 font-mono text-xs leading-6 text-text-primary outline-none focus:border-cyan-500/50" aria-label="最终发送提示词" />
        </div>
        <footer class="flex shrink-0 items-center justify-between border-t border-border-subtle px-5 py-3">
          <p class="text-xs text-text-muted">{{ promptPreviewContent.length.toLocaleString() }} 个字符</p>
          <div class="flex items-center gap-3"><button class="secondary-button" @click="closePromptPreview">取消</button><button class="primary-button h-9 px-4 text-xs" :disabled="!promptPreviewContent.trim()" @click="sendPromptPreview">确认发送<ArrowRight :size="15" /></button></div>
        </footer>
      </section>
    </div>

    <div v-if="contextMenu" class="fixed z-40 min-w-40 rounded-lg border border-border-subtle bg-surface p-1 shadow-xl" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" @click.stop>
      <template v-if="!contextMenu.node || contextMenu.node.type === 'folder'">
        <button type="button" class="context-action" @click.stop="openFromContext('chapter')"><FilePlus2 :size="15" />新建章节</button>
        <button v-if="!contextMenu.node" type="button" class="context-action" @click.stop="openFromContext('folder')"><FolderPlus :size="15" />新建文件夹</button>
      </template>
      <div v-if="contextMenu.node" class="my-1 h-px bg-border-subtle" />
      <button v-if="contextMenu.node" type="button" class="context-action" @click.stop="openRenameDialog(contextMenu.node)"><Pencil :size="15" />重命名</button>
      <button v-if="contextMenu.node" type="button" class="context-action text-red-400 hover:text-red-300" @click.stop="requestDelete(contextMenu.node)"><Trash2 :size="15" />删除</button>
    </div>

    <LongProjectNodeDialog v-model="nodeDialogVisible" :node-type="nodeDialogType" :rename-mode="Boolean(editingNode)" :initial-name="editingNode?.name" :parent-name="nodeDialogParentName" @submit="handleNodeDialogSubmit" />
    <ConfirmDialog v-model="deleteDialogVisible" title="删除内容" :content="deleteDialogContent" confirm-text="确认删除" @confirm="confirmDelete" />
    <!-- 分镜合并弹窗：右键合并目标的预览 + 成图归属单选 -->
    <StoryboardMergeDialog v-model="mergeDialogVisible" :panels="mergeSelectedPanels" :artwork-map="artworkMap" @confirm="applyMerge" />
    <!-- 分镜拆分弹窗：空行分割符编辑 + 实时预览（原地拆/向上插镜/向下插镜） -->
    <StoryboardSplitDialog v-model="splitDialogVisible" :panel="splitTargetPanel ?? undefined" :mode="splitMode" @confirm="applySplit" />
    <!-- 分镜右键菜单：合并/拆分/复制/跳转 -->
    <StoryboardContextMenu
      :visible="panelMenu.visible"
      :x="panelMenu.x"
      :y="panelMenu.y"
      :panel="panelMenu.panel!"
      :total="latestStoryboardRun?.panels.length ?? 0"
      @close="panelMenu.visible = false"
      @action="handlePanelMenuAction"
    />
    <!-- 资产视觉状态参考图预览 -->
    <ImagePreviewModal v-model="assetPreviewVisible" :images="assetPreviewImages" :image-index="assetPreviewIndex" alt="资产视觉状态参考图" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import { AlignJustify, ArrowLeft, ArrowRight, Boxes, Check, Ellipsis, Eraser, FileImage, FilePlus2, FileText, FolderPlus, ListTree, ListX, LoaderCircle, MapPin, Package, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Rows3, ScanText, TextAlignStart, Trash2, Undo2, UserRound, Workflow, X } from "lucide-vue-next";
import { comicDb } from "@/api/comic";
import ConfirmDialog from "@comic/components/ConfirmDialog.vue";
import LongProjectNodeDialog from "@comic/components/LongProjectNodeDialog.vue";
import StoryboardMergeDialog from "@comic/components/StoryboardMergeDialog.vue";
import StoryboardSplitDialog from "@comic/components/StoryboardSplitDialog.vue";
import StoryboardContextMenu, { type StoryboardMenuAction } from "@comic/components/StoryboardContextMenu.vue";
import AssetBindingTag from "@comic/components/AssetBindingTag.vue";
import ImagePreviewModal from "@comic/components/ImagePreviewModal.vue";
import { buildAssetNameIndex, syncPanelsAutoBindings } from "@comic/services/promptAssetService";
import { defaultVariant } from "@comic/services/storyboardService";
import LongProjectTree from "@comic/components/LongProjectTree.vue";
import LongProjectAssetLibraryTree, { type AssetLibraryCategory } from "@comic/components/LongProjectAssetLibraryTree.vue";
import LongProjectAssetExtractionReview from "@comic/components/LongProjectAssetExtractionReview.vue";
import LongProjectAssetLibrary from "@comic/components/LongProjectAssetLibrary.vue";
import LongProjectAssetTab from "@comic/components/LongProjectAssetTab.vue";
import { useToast } from "@comic/composables/useToast";
import { buildAssetExtractionPrompt, extractChapterAssets, getCandidateStates } from "@comic/services/assetExtractionService";
import { buildStoryboardPrompt, generateStoryboard } from "@comic/services/storyboardService";
import { migratePanelArtworks } from "@comic/services/panelPromptService";
import type { AssetGenConfig, ComicProject, LongProjectAsset, LongProjectAssetExtractionCandidate, LongProjectAssetExtractionRun, LongProjectAssetVariant, LongProjectNode, LongProjectNodeType, LongProjectPanelArtwork, LongProjectStoryboardPanel, LongProjectStoryboardRun, ModelConfig, PromptTemplate } from "@comic/types";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const projectId = String(route.params.projectId);
const project = ref<ComicProject | null>(null);
const loading = ref(true);
const saving = ref(false);
let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
const sidebarCollapsed = ref(localStorage.getItem("comic-long-sidebar-collapsed") === "true");
const expandedFolders = ref(new Set<string>());
const selectedChapterId = ref<string | null>(null);
const selectedAssetCategory = ref<AssetLibraryCategory | null>(null);
const draftContent = ref("");
const activeTab = ref("source");
const contentHistory = ref<string[]>([]);
const formatMenuOpen = ref(false);
const aiTask = ref<"assets" | "storyboard">("assets");
const selectedModelByTask = ref<Record<"assets" | "storyboard", string>>({ assets: "", storyboard: "" });
const selectedTemplateByTask = ref<Record<"assets" | "storyboard", string>>({ assets: "", storyboard: "" });
const models = ref<ModelConfig[]>([]);
const promptTemplates = ref<PromptTemplate[]>([]);
const activeExtractionRunId = ref<string | null>(null);
const confirmPromptBeforeRun = ref(localStorage.getItem("comic-long-confirm-prompt") !== "false");
const promptPreviewVisible = ref(false);
const promptPreviewContent = ref("");
const promptPreviewTask = ref<"assets" | "storyboard">("assets");
const nodeDialogVisible = ref(false);
const nodeDialogType = ref<LongProjectNodeType>("chapter");
const nodeDialogParentId = ref<string | null>(null);
const editingNode = ref<LongProjectNode | null>(null);
const deleteDialogVisible = ref(false);
const deletingNode = ref<LongProjectNode | null>(null);
const contextMenu = ref<{ x: number; y: number; node: LongProjectNode | null } | null>(null);

const nodes = computed(() => project.value?.longProjectData?.nodes ?? []);
const projectAssets = computed(() => project.value?.longProjectData?.assets ?? []);
const chapterAssets = computed(() => project.value?.longProjectData?.chapterAssets ?? []);
const selectedChapterAssets = computed(() => selectedChapter.value ? chapterAssets.value.filter((entry) => entry.chapterId === selectedChapter.value?.id) : []);
const storyboardAssetsForChapter = computed(() => {
  if (!selectedChapterAssets.value.length) return projectAssets.value;
  return projectAssets.value.flatMap((asset) => {
    const entries = selectedChapterAssets.value.filter((entry) => entry.assetId === asset.id);
    if (!entries.length) return [];
    const variantIds = new Set(entries.map((entry) => entry.variantId).filter((id): id is string => Boolean(id)));
    return [{ ...asset, variants: variantIds.size ? asset.variants.filter((variant) => variantIds.has(variant.id)) : asset.variants }];
  });
});
const assetsForSelectedCategory = computed(() => selectedAssetCategory.value ? projectAssets.value.filter((asset) => asset.type === selectedAssetCategory.value && asset.scope !== "chapter") : []);
const assetExtractionRuns = computed(() => project.value?.longProjectData?.assetExtractionRuns ?? []);
const storyboardRuns = computed(() => project.value?.longProjectData?.storyboardRuns ?? []);
const panelArtworks = computed(() => project.value?.longProjectData?.panelArtworks ?? []);
const latestStoryboardRun = computed(() => selectedChapter.value ? storyboardRuns.value.filter((run) => run.chapterId === selectedChapter.value!.id).sort((a, b) => b.updatedAt - a.updatedAt)[0] : undefined);
const activeExtractionRun = computed(() => assetExtractionRuns.value.find((run) => run.id === activeExtractionRunId.value) ?? null);
const chapterExtractionRuns = computed(() => selectedChapter.value
  ? assetExtractionRuns.value.filter((run) => run.chapterId === selectedChapter.value?.id).sort((a, b) => b.updatedAt - a.updatedAt)
  : []);
const continueEditingRun = computed(() => chapterExtractionRuns.value.find((run) => run.status === "completed" || run.status === "confirmed") ?? null);
const extractionButtonLabel = computed(() => chapterExtractionRuns.value.length ? "重新提取" : "提取资产");
const sourceExtractionStatus = computed(() => {
  const runs = chapterExtractionRuns.value;
  const latestRunning = runs.find((run) => run.status === "running");
  if (latestRunning) return { run: latestRunning, tone: "text-cyan-400", message: "正在提取中" };
  const latestPending = runs.find((run) => run.status === "completed");
  if (latestPending) {
    const outdated = latestPending.sourceContent !== draftContent.value;
    return { run: latestPending, tone: outdated ? "text-amber-300" : "text-cyan-400", message: outdated ? `待审核 ${latestPending.candidates.length} 项 · 原文已变更` : `待审核 ${latestPending.candidates.length} 项` };
  }
  const latestConfirmed = runs.find((run) => run.status === "confirmed");
  if (latestConfirmed) return { run: latestConfirmed, tone: "text-emerald-400", message: `已确认 ${latestConfirmed.candidates.length} 项资产` };
  const latestFailed = runs.find((run) => run.status === "failed");
  if (latestFailed) return { run: latestFailed, tone: "text-red-400", message: "上次提取失败" };
  return null;
});
const chapters = computed(() => nodes.value.filter((node) => node.type === "chapter").sort(sortNodes));
const chapterOrders = computed(() => Object.fromEntries(chapters.value.map((chapter, index) => [chapter.id, index])));
const chapterCount = computed(() => chapters.value.length);
const readyChapterCount = computed(() => chapters.value.filter((node) => Boolean(node.content?.trim())).length);
const selectedChapter = computed(() => chapters.value.find((node) => node.id === selectedChapterId.value) ?? null);
const isDirty = computed(() => draftContent.value !== (selectedChapter.value?.content ?? ""));
const paragraphCount = computed(() => draftContent.value.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).length);
const saveStatus = computed(() => saving.value ? "正在自动保存" : isDirty.value ? "正在编辑" : "已自动保存");
const llmModels = computed(() => models.value.filter((model) => model.category === "llm"));
const imageModels = computed(() => models.value.filter((model) => model.category === "image"));
const assetGenConfig = computed(() => project.value?.longProjectData?.assetGenConfig);
const aiTasks = [
  { key: "assets" as const, label: "提取资产", templateType: "extract" as const },
  { key: "storyboard" as const, label: "生成分镜", templateType: "storyboard" as const },
];
const currentAiTask = computed(() => aiTasks.find((task) => task.key === aiTask.value) ?? aiTasks[0]);
const templatesForCurrentTask = computed(() => promptTemplates.value
  .filter((template) => template.type === currentAiTask.value.templateType)
  .sort((a, b) => a.sortOrder - b.sortOrder));
const canRunAiTask = computed(() => Boolean(
  draftContent.value.trim()
  && selectedModelByTask.value[aiTask.value]
  && selectedTemplateByTask.value[aiTask.value],
));
const nodeDialogParentName = computed(() => nodeDialogParentId.value ? nodes.value.find((node) => node.id === nodeDialogParentId.value)?.name ?? "" : project.value?.name ?? "");
const deleteDialogContent = computed(() => {
  if (!deletingNode.value) return "删除后无法恢复，是否确认删除？";
  if (deletingNode.value.type === "folder") return `确定删除文件夹「${deletingNode.value.name}」吗？其中的 ${descendantsOf(deletingNode.value.id).filter((node) => node.type === "chapter").length} 个章节也会一并删除。`;
  return `确定删除章节「${deletingNode.value.name}」吗？章节正文和后续创作数据将一并删除。`;
});

const workflowSteps = [
  { title: "添加章节", description: "录入小说原文", icon: FileText }, { title: "解析内容", description: "拆分章节结构", icon: ScanText },
  { title: "提取资产", description: "人物、场景、道具", icon: Boxes }, { title: "生成分镜", description: "保留关键剧情", icon: ListTree },
  { title: "制作漫画", description: "提示词与画面", icon: FileImage },
];
const extractionLoadingSteps = [
  { label: "人物", icon: UserRound },
  { label: "场景", icon: MapPin },
  { label: "道具", icon: Package },
];
const storyboardLoadingSteps = [
  { label: "读取原文", icon: FileText },
  { label: "拆分镜头", icon: Rows3 },
  { label: "匹配资产", icon: Boxes },
];
const chapterTabs = [
  { key: "source", label: "原文", icon: FileText },
  { key: "assets", label: "资产", icon: Boxes },
  { key: "storyboard", label: "分镜", icon: ListTree },
];
const activeTabInfo = computed(() => chapterTabs.find((tab) => tab.key === activeTab.value) ?? chapterTabs[0]);
function sortNodes(a: LongProjectNode, b: LongProjectNode) { return a.order - b.order || a.createdAt - b.createdAt; }
function wordCount(content: string) { return content.replace(/\s/g, "").length; }
function descendantsOf(parentId: string) {
  const result: LongProjectNode[] = [];
  const pending = [parentId];
  while (pending.length) {
    const current = pending.shift()!;
    nodes.value.filter((node) => node.parentId === current).forEach((node) => {
      result.push(node);
      if (node.type === "folder") pending.push(node.id);
    });
  }
  return result;
}

const setSidebarCollapsed = (value: boolean) => { sidebarCollapsed.value = value; localStorage.setItem("comic-long-sidebar-collapsed", String(value)); };
const saveConfirmPromptPreference = () => localStorage.setItem("comic-long-confirm-prompt", String(confirmPromptBeforeRun.value));
const openExtractionRun = (run: LongProjectAssetExtractionRun) => {
  activeTab.value = "source";
  activeExtractionRunId.value = run.id;
};
const continueEditingExtraction = () => {
  if (continueEditingRun.value) openExtractionRun(continueEditingRun.value);
};
const runAiTask = async () => {
  if (!canRunAiTask.value) return;
  if (isDirty.value) await saveCurrentChapter(false);
  if (aiTask.value === "storyboard") {
    const model = llmModels.value.find((item) => item.id === selectedModelByTask.value.storyboard);
    const template = promptTemplates.value.find((item) => item.id === selectedTemplateByTask.value.storyboard);
    if (!model || !template) return;
    const prompt = buildStoryboardPrompt(template.content, draftContent.value, storyboardAssetsForChapter.value);
    if (confirmPromptBeforeRun.value) { promptPreviewTask.value = "storyboard"; promptPreviewContent.value = prompt; promptPreviewVisible.value = true; return; }
    await runStoryboard(prompt); return;
  }
  const model = llmModels.value.find((item) => item.id === selectedModelByTask.value.assets);
  const template = promptTemplates.value.find((item) => item.id === selectedTemplateByTask.value.assets);
  if (!model || !template || !selectedChapter.value || !project.value) return;
  const prompt = buildAssetExtractionPrompt(template.content, draftContent.value, projectAssets.value);
  if (confirmPromptBeforeRun.value) {
    promptPreviewTask.value = "assets";
    promptPreviewContent.value = prompt;
    promptPreviewVisible.value = true;
    return;
  }
  await sendAssetExtraction(prompt);
};
const runStoryboard = async (customPrompt?: string) => {
  const model = llmModels.value.find((item) => item.id === selectedModelByTask.value.storyboard);
  const template = promptTemplates.value.find((item) => item.id === selectedTemplateByTask.value.storyboard);
  if (!model || !template || !selectedChapter.value || !project.value) return;
  const storyboardAssets = storyboardAssetsForChapter.value;
  const prompt = customPrompt ?? buildStoryboardPrompt(template.content, draftContent.value, storyboardAssets);
  const now = Date.now();
  // 重跑前记录旧分镜，成功后用于对位迁移已推导描述与成图（panelArtworks）
  const previousRun = latestStoryboardRun.value;
  const run: LongProjectStoryboardRun = { id: uuidv4(), chapterId: selectedChapter.value.id, sourceContent: draftContent.value, modelId: model.id, templateId: template.id, prompt, status: 'running', panels: [], createdAt: now, updatedAt: now };
  await persistLongProjectData({ storyboardRuns: [...storyboardRuns.value, run] });
  activeTab.value = 'storyboard';
  try {
    const result = await generateStoryboard({ model, template, chapterContent: draftContent.value, assets: storyboardAssets, chapterId: selectedChapter.value.id, chapterOrders: chapterOrders.value, prompt });
    const nextRuns = storyboardRuns.value.map((item) => item.id === run.id ? { ...item, status: 'completed' as const, panels: result.panels, rawResponse: result.rawResponse, updatedAt: Date.now() } : item);
    const nextNodes = nodes.value.map((node) => node.id === selectedChapter.value?.id ? { ...node, stage: 'storyboard-ready' as const, updatedAt: Date.now() } : node);
    const nextPanelArtworks = migratePanelArtworks(panelArtworks.value, previousRun?.panels ?? [], result.panels, selectedChapter.value.id);
    await persistLongProjectData({ storyboardRuns: nextRuns, nodes: nextNodes, panelArtworks: nextPanelArtworks });
  } catch (error) {
    const message = error instanceof Error ? error.message : '分镜生成失败，请重试';
    await persistLongProjectData({ storyboardRuns: storyboardRuns.value.map((item) => item.id === run.id ? { ...item, status: 'failed' as const, error: message, updatedAt: Date.now() } : item) });
    toast.error(message);
  }
};

/** 进入当前章节的分镜生图工作台。 */
const openPanelGen = () => {
  if (selectedChapter.value) router.push(`/comic/panel-gen/${projectId}/${selectedChapter.value.id}`);
};

// ========== 分镜视图模式：双栏对照（默认）/ 表格 ==========
const STORYBOARD_VIEW_KEY = 'comic-storyboard-view';
type StoryboardViewMode = 'split' | 'table';
const storyboardViewMode = ref<StoryboardViewMode>(
  (localStorage.getItem(STORYBOARD_VIEW_KEY) as StoryboardViewMode) || 'split',
);
/** 切换分镜视图模式并持久化。 */
const setStoryboardViewMode = (mode: StoryboardViewMode) => {
  storyboardViewMode.value = mode;
  localStorage.setItem(STORYBOARD_VIEW_KEY, mode);
};

/** 分镜 ID → 生图工件映射，用于表格视图展示成图缩略图。 */
const artworkMap = computed(() => new Map(panelArtworks.value.map((item) => [item.panelId, item])));

// ========== 资产自动绑定同步与资产图预览 ==========

const assetPreviewVisible = ref(false);
const assetPreviewImages = ref<string[]>([]);
const assetPreviewIndex = ref(0);

/** 查看绑定资产的视觉状态参考图。 */
function inspectAssetBinding(asset: import("@comic/types").LongProjectAsset | null) {
  if (!asset) { toast.warning("资产未匹配，请在资产库中核对名称"); return; }
  const variant = asset.variants[0];
  const images = variant?.referenceImageIds ?? [];
  if (!images.length) { toast.info(`「${asset.name}」暂无参考图`); return; }
  assetPreviewImages.value = [...images];
  assetPreviewIndex.value = 0;
  assetPreviewVisible.value = true;
}

/**
 * 分镜文本自动绑定同步：编辑/合并/拆分后重扫全部分镜文本，
 * 出现资产名且未绑定 → 自动添加（延续上一镜视觉状态，否则章节范围默认）；
 * auto-text 绑定且名称消失 → 自动移除；其余来源绑定不动。
 */
function autoSyncBindings(panels: LongProjectStoryboardPanel[], chapterId: string): LongProjectStoryboardPanel[] {
  return syncPanelsAutoBindings(panels, buildAssetNameIndex(projectAssets.value), (asset) => defaultVariant(asset, chapterId, chapterOrders.value));
}

const splitSourceEl = ref<HTMLElement | null>(null);
const splitPanelsEl = ref<HTMLElement | null>(null);
let splitScrollSyncing = false;
/**
 * 双栏对照的按比例滚动联动：滚动一侧容器时，按滚动比例同步另一侧。
 * @param source 当前滚动的是哪一侧（原文 / 分镜）
 */
function onSplitScroll(source: 'source' | 'panels') {
  if (splitScrollSyncing) return;
  const from = source === 'source' ? splitSourceEl.value : splitPanelsEl.value;
  const to = source === 'source' ? splitPanelsEl.value : splitSourceEl.value;
  if (!from || !to) return;
  splitScrollSyncing = true;
  const ratio = from.scrollTop / Math.max(1, from.scrollHeight - from.clientHeight);
  to.scrollTop = ratio * (to.scrollHeight - to.clientHeight);
  requestAnimationFrame(() => { splitScrollSyncing = false; });
}

// ========== 分镜右键菜单：合并 / 拆分 / 复制 / 跳转 ==========

const mergeDialogVisible = ref(false);
const splitDialogVisible = ref(false);
const splitTargetPanel = ref<LongProjectStoryboardPanel | null>(null);
/** 拆分模式：multi 原地拆多段；up 新镜插入上方；down 新镜插入下方。 */
const splitMode = ref<"multi" | "up" | "down">("multi");
/** 合并方向与条数（由右键菜单选择）。 */
const mergeDirection = ref<"up" | "down">("up");
const mergeCount = ref(1);

/** 分镜右键菜单状态（与章节树 contextMenu 区分）。 */
const panelMenu = ref<{ visible: boolean; x: number; y: number; panel: LongProjectStoryboardPanel | null }>({ visible: false, x: 0, y: 0, panel: null });

/** 操作前快照（仅一步撤销），8 秒内可恢复。 */
let storyboardOpSnapshot: { runId: string; panels: LongProjectStoryboardPanel[]; artworks: LongProjectPanelArtwork[]; label: string } | null = null;
let storyboardUndoTimer: ReturnType<typeof setTimeout> | undefined;
const storyboardUndoAvailable = ref(false);
const storyboardUndoLabel = ref("");

/** 待合并分镜（按 order 升序）：当前分镜 + 上/下方相邻 mergeCount 个。 */
const mergeSelectedPanels = computed(() => {
  const run = latestStoryboardRun.value;
  const anchor = panelMenu.value.panel;
  if (!run || !anchor) return [];
  const index = run.panels.findIndex((panel) => panel.id === anchor.id);
  if (index < 0) return [];
  return mergeDirection.value === "up"
    ? run.panels.slice(Math.max(0, index - mergeCount.value), index + 1)
    : run.panels.slice(index, index + mergeCount.value + 1);
});

/** 打开分镜右键菜单（表格行 / 卡片上右键）。 */
function openPanelMenu(event: MouseEvent, panel: LongProjectStoryboardPanel) {
  panelMenu.value = { visible: true, x: event.clientX, y: event.clientY, panel };
}

/** 处理分镜右键菜单动作。 */
function handlePanelMenuAction(action: StoryboardMenuAction) {
  const panel = panelMenu.value.panel;
  if (!panel) return;
  if (action.action === "merge-up" || action.action === "merge-down") {
    mergeDirection.value = action.action === "merge-up" ? "up" : "down";
    mergeCount.value = action.count;
    mergeDialogVisible.value = true;
    return;
  }
  if (action.action === "split") { openSplitDialog(panel, "multi"); return; }
  if (action.action === "split-up") { openSplitDialog(panel, "up"); return; }
  if (action.action === "split-down") { openSplitDialog(panel, "down"); return; }
  if (action.action === "copy") {
    const text = [panel.content, panel.dialogue ? `对白：${panel.dialogue}` : "", panel.narration ? `旁白：${panel.narration}` : ""].filter(Boolean).join("\n");
    void navigator.clipboard?.writeText(text).then(() => toast.success("已复制分镜内容")).catch(() => toast.error("复制失败"));
    return;
  }
  if (action.action === "open-workbench" && selectedChapter.value) {
    router.push(`/comic/panel-gen/${projectId}/${selectedChapter.value.id}?panel=${panel.id}`);
  }
}

/** 打开拆分弹窗。 */
function openSplitDialog(panel: LongProjectStoryboardPanel, mode: "multi" | "up" | "down" = "multi") {
  splitTargetPanel.value = panel;
  splitMode.value = mode;
  splitDialogVisible.value = true;
}

/** 记录操作前快照并启动 8 秒撤销窗口。 */
function snapshotForUndo(label: string) {
  const run = latestStoryboardRun.value;
  if (!run) return;
  storyboardOpSnapshot = { runId: run.id, panels: run.panels, artworks: panelArtworks.value, label };
  storyboardUndoLabel.value = label;
  storyboardUndoAvailable.value = true;
  if (storyboardUndoTimer) clearTimeout(storyboardUndoTimer);
  storyboardUndoTimer = setTimeout(() => { storyboardUndoAvailable.value = false; storyboardOpSnapshot = null; }, 8000);
}

/** 撤销最近一次合并/拆分操作。 */
async function undoStoryboardOp() {
  const snapshot = storyboardOpSnapshot;
  if (!snapshot) return;
  if (storyboardUndoTimer) clearTimeout(storyboardUndoTimer);
  storyboardUndoAvailable.value = false;
  storyboardOpSnapshot = null;
  const nextRuns = storyboardRuns.value.map((item) => item.id === snapshot.runId ? { ...item, panels: snapshot.panels, updatedAt: Date.now() } : item);
  await persistLongProjectData({ storyboardRuns: nextRuns, panelArtworks: snapshot.artworks });
  toast.success("已撤销上一步操作");
}

/** 工件状态标记：内容变化且有描述时置为 stale；进行中置为 failed。 */
function reevaluatePromptStatus(artwork: LongProjectPanelArtwork, contentChanged: boolean): LongProjectPanelArtwork["promptStatus"] {
  if (artwork.promptStatus === "running" || artwork.promptStatus === "pending") return "failed";
  if (contentChanged && artwork.imagePrompt?.trim()) return "stale";
  return artwork.promptStatus;
}

/**
 * 执行合并：连续分镜合为 1 个，保留所选分镜的成图归属。
 * 被合并分镜的候选图并入保留工件的 generatedImageIds，不丢失。
 */
async function applyMerge(sourcePanelId: string) {
  const run = latestStoryboardRun.value;
  const chapter = selectedChapter.value;
  const panelsToMerge = mergeSelectedPanels.value;
  if (!run || !chapter || panelsToMerge.length < 2) return;
  snapshotForUndo(`已合并 ${panelsToMerge.length} 个分镜`);
  const sourcePanel = panelsToMerge.find((panel) => panel.id === sourcePanelId);
  if (!sourcePanel) return;

  // 资产绑定按 assetId+visualVersionId 去重取并集
  const seen = new Set<string>();
  const assetBindings = panelsToMerge.flatMap((panel) => panel.assetBindings).filter((binding) => {
    const key = `${binding.assetId ?? binding.assetName}::${binding.visualVersionId ?? binding.visualVersionName ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const merged: LongProjectStoryboardPanel = {
    id: sourcePanelId,
    order: panelsToMerge[0].order,
    content: panelsToMerge.map((panel) => panel.content).filter(Boolean).join("\n"),
    shot: panelsToMerge.map((panel) => panel.shot).find(Boolean),
    dialogue: panelsToMerge.map((panel) => panel.dialogue).filter(Boolean).join("\n") || undefined,
    narration: panelsToMerge.map((panel) => panel.narration).filter(Boolean).join("\n") || undefined,
    imagePrompt: panelsToMerge.map((panel) => panel.imagePrompt).find(Boolean),
    assetBindings,
  };

  const startIdx = run.panels.findIndex((panel) => panel.id === panelsToMerge[0].id);
  const nextPanels = autoSyncBindings([...run.panels.slice(0, startIdx), merged, ...run.panels.slice(startIdx + panelsToMerge.length)].map((panel, index) => ({ ...panel, order: index + 1 })), chapter.id);

  // 成图归属：保留所选分镜的工件（id 未变，panelId 不动）；其余分镜候选图并入
  const otherIds = panelsToMerge.filter((panel) => panel.id !== sourcePanelId).map((panel) => panel.id);
  const keptArtwork = artworkMap.value.get(sourcePanelId);
  const extraImages = otherIds.flatMap((id) => artworkMap.value.get(id)?.generatedImageIds ?? []);
  let nextArtworks = panelArtworks.value.filter((artwork) => artwork.chapterId !== chapter.id || !otherIds.includes(artwork.panelId));
  if (keptArtwork) {
    const contentChanged = merged.content !== sourcePanel.content;
    nextArtworks = nextArtworks.map((artwork) => artwork.panelId === sourcePanelId ? {
      ...artwork,
      generatedImageIds: [...new Set([...(artwork.generatedImageIds ?? []), ...extraImages])],
      promptStatus: reevaluatePromptStatus(artwork, contentChanged),
      genStatus: artwork.genStatus === "running" ? "failed" : artwork.genStatus,
      updatedAt: Date.now(),
    } : artwork);
  }

  const nextRuns = storyboardRuns.value.map((item) => item.id === run.id ? { ...item, panels: nextPanels, updatedAt: Date.now() } : item);
  await persistLongProjectData({ storyboardRuns: nextRuns, panelArtworks: nextArtworks });
  toast.success(`已合并为 1 个分镜，顺序号已重排`);
}

/**
 * 执行拆分：
 * - multi：原地拆成 N 段，第一段继承父 ID（保留成图）；
 * - up：拆成 2 段，第一段为新分镜插入父分镜上方，父分镜保留第二段（继承成图）；
 * - down：拆成 2 段，第二段为新分镜插入父分镜下方，父分镜保留第一段（继承成图）。
 * 新分镜继承镜头与资产绑定，无描述无成图。
 */
async function applySplit(parts: string[]) {
  const run = latestStoryboardRun.value;
  const chapter = selectedChapter.value;
  const parent = splitTargetPanel.value;
  const mode = splitMode.value;
  if (!run || !chapter || !parent || parts.length < 2) return;
  if (mode !== "multi" && parts.length !== 2) return;
  snapshotForUndo(`已拆分分镜 ${parent.order} 为 ${parts.length} 个`);

  /** 新分镜构造：继承镜头与绑定，新 ID。 */
  const makeChild = (content: string): LongProjectStoryboardPanel => ({
    id: uuidv4(), order: parent.order, content, shot: parent.shot,
    assetBindings: parent.assetBindings.map((binding) => ({ ...binding })),
  });
  const children: LongProjectStoryboardPanel[] =
    mode === "multi"
      ? parts.map((content, index) => index === 0 ? { ...parent, content } : { ...makeChild(content), order: parent.order + index })
      : mode === "up"
        ? [makeChild(parts[0]), { ...parent, content: parts[1] }]
        : [{ ...parent, content: parts[0] }, makeChild(parts[1])];

  const index = run.panels.findIndex((panel) => panel.id === parent.id);
  const nextPanels = autoSyncBindings([...run.panels.slice(0, index), ...children, ...run.panels.slice(index + 1)].map((panel, i) => ({ ...panel, order: i + 1 })), chapter.id);

  // 成图归属：父分镜保留段 panelId 未变自动继承；内容变化时标记 stale 提示重新推导
  const parentContent = mode === "up" ? parts[1] : parts[0];
  const parentArtwork = artworkMap.value.get(parent.id);
  let nextArtworks = panelArtworks.value;
  if (parentArtwork && parentContent !== parent.content) {
    nextArtworks = panelArtworks.value.map((artwork) => artwork.panelId === parent.id ? { ...artwork, promptStatus: reevaluatePromptStatus(artwork, true), updatedAt: Date.now() } : artwork);
  }

  const nextRuns = storyboardRuns.value.map((item) => item.id === run.id ? { ...item, panels: nextPanels, updatedAt: Date.now() } : item);
  await persistLongProjectData({ storyboardRuns: nextRuns, panelArtworks: nextArtworks });
  splitTargetPanel.value = null;
  toast.success(`已拆分为 ${parts.length} 个分镜`);
}

// ========== 分镜手动编辑（逐镜卡片，完整编辑镜头/画面/对白/旁白，按序对位保留绑定） ==========

/** 编辑卡片：key 供 v-for 稳定渲染（删除/新增不依赖下标）。 */
interface DraftPanel {
  key: number;
  shot: string;
  content: string;
  dialogue: string;
  narration: string;
}

const storyboardEditing = ref(false);
const storyboardDraftPanels = ref<DraftPanel[]>([]);
const storyboardSaving = ref(false);
let draftKeySeq = 0;

/** 有效分镜数（画面非空），用于保存按钮置灰与顶部计数。 */
const draftPanelCount = computed(() => storyboardDraftPanels.value.filter((item) => item.content.trim()).length);

/** 进入编辑：把当前分镜的完整字段序列化为卡片列表。 */
const enterStoryboardEditing = () => {
  const run = latestStoryboardRun.value;
  if (!run) return;
  storyboardDraftPanels.value = run.panels.map((panel) => ({
    key: draftKeySeq++,
    shot: panel.shot ?? "",
    content: panel.content,
    dialogue: panel.dialogue ?? "",
    narration: panel.narration ?? "",
  }));
  storyboardEditing.value = true;
};

const cancelStoryboardEditing = () => {
  storyboardEditing.value = false;
  storyboardDraftPanels.value = [];
};

/** 追加一个空白分镜卡片。 */
const addDraftPanel = () => {
  storyboardDraftPanels.value.push({ key: draftKeySeq++, shot: "", content: "", dialogue: "", narration: "" });
};

/** 删除指定下标的分镜卡片。 */
const removeDraftPanel = (index: number) => {
  storyboardDraftPanels.value.splice(index, 1);
};

/**
 * 保存分镜编辑：丢弃画面为空的卡片后按序对位迁移旧分镜的资产绑定/绘画提示词；
 * 新增分镜为空白绑定。panelArtworks 走迁移逻辑（内容变化的分镜其画面描述标记
 * stale，成图保留）。
 */
const saveStoryboardEditing = async () => {
  const run = latestStoryboardRun.value;
  const chapter = selectedChapter.value;
  if (!run || !chapter || storyboardSaving.value) return;
  const drafts = storyboardDraftPanels.value.filter((item) => item.content.trim());
  if (!drafts.length) { toast.warning("至少保留一个分镜（画面内容不能为空）"); return; }
  storyboardSaving.value = true;
  try {
    const oldPanels = run.panels;
    const newPanels = autoSyncBindings(drafts.map((item, index) => {
      const fields = {
        order: index + 1,
        content: item.content.trim(),
        shot: item.shot.trim(),
        dialogue: item.dialogue.trim(),
        narration: item.narration.trim(),
      };
      const old = oldPanels[index];
      return old ? { ...old, ...fields } : { id: uuidv4(), assetBindings: [], ...fields };
    }), chapter.id);
    const nextRuns = storyboardRuns.value.map((item) => item.id === run.id ? { ...item, panels: newPanels, updatedAt: Date.now() } : item);
    const nextPanelArtworks = migratePanelArtworks(panelArtworks.value, oldPanels, newPanels, chapter.id);
    await persistLongProjectData({ storyboardRuns: nextRuns, panelArtworks: nextPanelArtworks });
    storyboardEditing.value = false;
    storyboardDraftPanels.value = [];
    toast.success(`已保存 ${newPanels.length} 个分镜`);
  } finally {
    storyboardSaving.value = false;
  }
};
const closePromptPreview = () => {
  promptPreviewVisible.value = false;
  promptPreviewContent.value = "";
};
const sendPromptPreview = async () => {
  // 先捕获内容并关闭弹窗再执行，避免分镜分支执行期间弹窗遮挡页面
  const content = promptPreviewContent.value;
  const task = promptPreviewTask.value;
  closePromptPreview();
  if (task === "storyboard") await runStoryboard(content);
  else await sendAssetExtraction(content);
};
const sendAssetExtraction = async (prompt: string) => {
  const model = llmModels.value.find((item) => item.id === selectedModelByTask.value.assets);
  const template = promptTemplates.value.find((item) => item.id === selectedTemplateByTask.value.assets);
  if (!model || !template || !selectedChapter.value || !project.value || !prompt.trim()) return;
  closePromptPreview();

  const now = Date.now();
  const run: LongProjectAssetExtractionRun = {
    id: uuidv4(), chapterId: selectedChapter.value.id, sourceContent: draftContent.value,
    sourceWordCount: wordCount(draftContent.value), modelId: model.id, templateId: template.id,
    extractionConfig: template.assetExtractionConfig,
    prompt,
    status: "running", candidates: [], createdAt: now, updatedAt: now,
  };
  await persistLongProjectData({ assetExtractionRuns: [...assetExtractionRuns.value, run] });
  activeExtractionRunId.value = run.id;
  try {
    // 章节提取先保存为本章资产；传入已有资产用于状态名沿用与归属建议，不自动写入公共资产库。
    const result = await extractChapterAssets({ model, template, chapterContent: draftContent.value, existingAssets: projectAssets.value, prompt });
    await updateExtractionRun(run.id, { status: "completed", candidates: result.candidates, rawResponse: result.rawResponse, error: undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "资产提取失败，请重试";
    await updateExtractionRun(run.id, { status: "failed", error: message });
    toast.error(message);
  }
};
/** 持久化串行队列：并发 saveProject 会互相覆盖（后写赢），工作台批量回写必须串行。 */
let persistQueue: Promise<unknown> = Promise.resolve();
const runPersistTask = (task: () => Promise<void>): Promise<void> => {
  // 前一个任务失败也继续执行后续任务，失败只抛给当次调用方
  const run = persistQueue.then(task, task);
  persistQueue = run.then(() => undefined, () => undefined);
  return run;
};
/** 基于最新数据做局部修改后持久化（patch 在队列任务内计算，避免旧快照覆盖）。 */
const mutateLongProjectData = (mutate: (data: NonNullable<ComicProject["longProjectData"]>) => void) =>
  runPersistTask(async () => {
    if (!project.value) return;
    const current = project.value.longProjectData ?? { nodes: [] };
    // 先克隆出纯数据草稿，patch 后再次序列化以剥离 reactive proxy（IPC 安全）
    const draft = JSON.parse(JSON.stringify(current)) as NonNullable<ComicProject["longProjectData"]>;
    mutate(draft);
    const updated: ComicProject = {
      ...project.value,
      longProjectData: JSON.parse(JSON.stringify(draft)),
      updatedAt: Date.now(),
    };
    await comicDb.saveProject(updated);
    project.value = updated;
  });
const persistLongProjectData = (changes: Partial<NonNullable<ComicProject["longProjectData"]>>) =>
  mutateLongProjectData((data) => { Object.assign(data, changes); });
const persistNodes = async (nextNodes: LongProjectNode[]) => {
  // Computed nodes are Vue reactive proxies; strip them before crossing Electron IPC.
  const serializableNodes = nextNodes.map((node) => ({ ...node }));
  await persistLongProjectData({ nodes: serializableNodes });
};
/** 资产工作台回写：在持久化队列内基于最新数据 patch 视觉状态（提示词/参考图等）。 */
const updateAssetVariant = (payload: { assetId: string; variantId: string; patch: Partial<LongProjectAssetVariant> }) =>
  mutateLongProjectData((data) => {
    data.assets = (data.assets ?? []).map((asset) => {
      if (asset.id !== payload.assetId) return asset;
      if (!asset.variants.some((item) => item.id === payload.variantId)) return asset;
      return {
        ...asset,
        variants: asset.variants.map((item) => item.id === payload.variantId ? { ...item, ...payload.patch, updatedAt: Date.now() } : item),
        updatedAt: Date.now(),
      };
    });
  });
/** 保存资产生图配置（项目级默认）。 */
const updateAssetGenConfig = async (config: AssetGenConfig) => {
  await persistLongProjectData({ assetGenConfig: JSON.parse(JSON.stringify(config)) });
};
const toggleFolder = (folderId: string) => { const next = new Set(expandedFolders.value); next.has(folderId) ? next.delete(folderId) : next.add(folderId); expandedFolders.value = next; };
const selectChapter = async (chapter: LongProjectNode) => { if (isDirty.value) await saveCurrentChapter(false); activeExtractionRunId.value = null; selectedAssetCategory.value = null; selectedChapterId.value = chapter.id; draftContent.value = chapter.content ?? ""; contentHistory.value = []; activeTab.value = "source"; };
const selectAssetCategory = async (category: AssetLibraryCategory) => { if (isDirty.value) await saveCurrentChapter(false); activeExtractionRunId.value = null; selectedChapterId.value = null; selectedAssetCategory.value = category; };
const openCreateDialog = (type: LongProjectNodeType, parentId: string | null) => { editingNode.value = null; nodeDialogType.value = type; nodeDialogParentId.value = parentId; nodeDialogVisible.value = true; contextMenu.value = null; };
const openRenameDialog = (node: LongProjectNode) => { editingNode.value = node; nodeDialogType.value = node.type; nodeDialogParentId.value = node.parentId; contextMenu.value = null; nodeDialogVisible.value = true; };
const openContextMenu = (event: MouseEvent, node: LongProjectNode | null) => {
  contextMenu.value = { x: Math.min(event.clientX, window.innerWidth - 190), y: Math.min(event.clientY, window.innerHeight - 150), node };
};
const openFromContext = (type: LongProjectNodeType) => {
  const target = contextMenu.value;
  const parentId = target?.node?.type === "folder" ? target.node.id : null;
  editingNode.value = null;
  nodeDialogType.value = type;
  nodeDialogParentId.value = parentId;
  contextMenu.value = null;
  nodeDialogVisible.value = true;
};

const updateExtractionRun = async (runId: string, changes: Partial<LongProjectAssetExtractionRun>) => {
  const nextRuns = assetExtractionRuns.value.map((run) => run.id === runId ? { ...run, ...changes, updatedAt: Date.now() } : run);
  await persistLongProjectData({ assetExtractionRuns: nextRuns });
};
const updateExtractionCandidate = (candidate: LongProjectAssetExtractionCandidate) => {
  if (!activeExtractionRun.value) return;
  void updateExtractionRun(activeExtractionRun.value.id, {
    candidates: activeExtractionRun.value.candidates.map((item) => item.id === candidate.id ? candidate : item),
  });
};
const uniqueStrings = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
const createAssetFromCandidate = (candidate: LongProjectAssetExtractionCandidate, chapterId: string): LongProjectAsset => {
  const now = Date.now();
  return {
    id: uuidv4(), type: candidate.type, name: candidate.name, content: candidate.content || candidate.description, aliases: uniqueStrings(candidate.aliases),
    description: candidate.description || candidate.content, fixedTraits: [], attributes: candidate.attributes,
    sourceChapterIds: [chapterId], status: "confirmed", scope: "chapter",
    variants: getCandidateStates(candidate).filter((state) => state.name.trim()).map((state) => ({
      id: uuidv4(), name: state.name.trim(), description: state.description,
      firstAppearanceChapterId: chapterId, chapterRange: { startChapterId: chapterId }, tags: state.tags, imagePrompt: state.imagePrompt,
      referenceImageIds: [], sourceChapterIds: [chapterId], createdAt: now, updatedAt: now,
    })),
    createdAt: now, updatedAt: now,
  };
};
const mergeCandidateIntoAsset = (asset: LongProjectAsset, candidate: LongProjectAssetExtractionCandidate, chapterId: string): LongProjectAsset => {
  const now = Date.now();
  const variants = [...asset.variants];
  for (const state of getCandidateStates(candidate)) {
    const name = state.name.trim();
    if (!name) continue;
    // 归属到已有状态时不新建，只补充章节引用与空缺字段
    const existing = state.suggestedVariantId ? variants.find((variant) => variant.id === state.suggestedVariantId) : undefined;
    if (existing) {
      variants.splice(variants.indexOf(existing), 1, { ...existing, sourceChapterIds: uniqueStrings([...existing.sourceChapterIds, chapterId]), description: state.description || existing.description, imagePrompt: state.imagePrompt || existing.imagePrompt, tags: state.tags?.length ? state.tags : existing.tags, updatedAt: now });
      continue;
    }
    if (!variants.some((variant) => variant.name.trim() === name)) {
      variants.push({ id: uuidv4(), name, description: state.description, firstAppearanceChapterId: chapterId, chapterRange: { startChapterId: chapterId }, tags: state.tags, imagePrompt: state.imagePrompt, referenceImageIds: [], sourceChapterIds: [chapterId], createdAt: now, updatedAt: now });
    }
  }
  return {
    ...asset,
    content: candidate.content || asset.content || candidate.description,
    aliases: uniqueStrings([...asset.aliases, ...candidate.aliases]),
    description: asset.description || candidate.description,
    attributes: { ...candidate.attributes, ...asset.attributes },
    sourceChapterIds: uniqueStrings([...asset.sourceChapterIds, chapterId]),
    variants,
    updatedAt: now,
  };
};
const confirmAssetExtraction = async () => {
  const run = activeExtractionRun.value;
  const chapter = selectedChapter.value;
  if (!run || !chapter) return;
  if (run.candidates.some((candidate) => candidate.decision === "merge" && !candidate.suggestedAssetId)) {
    toast.error("请为所有“合并已有资产”的候选项选择目标资产");
    return;
  }
  // 每次确认都以本次审核结果作为当前章节唯一生效版本；历史提取任务仍保留。
  const currentChapterEntries = chapterAssets.value.filter((entry) => entry.chapterId === chapter.id);
  const currentChapterAssetIds = new Set(currentChapterEntries.map((entry) => entry.assetId));
  const referencedByOtherChapters = new Set(chapterAssets.value
    .filter((entry) => entry.chapterId !== chapter.id)
    .map((entry) => entry.assetId));
  const suggestedAssetIds = new Set(run.candidates.map((candidate) => candidate.suggestedAssetId).filter(Boolean) as string[]);
  let nextAssets = projectAssets.value
    .filter((asset) => asset.scope !== "chapter" || !currentChapterAssetIds.has(asset.id) || referencedByOtherChapters.has(asset.id) || suggestedAssetIds.has(asset.id))
    .map((asset) => ({ ...asset, variants: [...asset.variants] }));
  const nextChapterAssets = chapterAssets.value.filter((entry) => entry.chapterId !== chapter.id);
  for (const candidate of run.candidates) {
    if (candidate.decision === "ignore" || candidate.decision === "pending") continue;
    let asset = candidate.suggestedAssetId ? nextAssets.find((item) => item.id === candidate.suggestedAssetId) : undefined;
    if (!asset) {
      asset = createAssetFromCandidate(candidate, chapter.id);
      nextAssets.push(asset);
    } else {
      const merged = mergeCandidateIntoAsset(asset, candidate, chapter.id);
      nextAssets = nextAssets.map((item) => item.id === merged.id ? merged : item);
      asset = merged;
    }
    // 每个视觉状态一条章节引用；无状态资产保留一条无 variant 引用
    const states = getCandidateStates(candidate).filter((state) => state.name.trim());
    const entries = states.length ? states : [null];
    for (const state of entries) {
      const variant = state?.suggestedVariantId ? asset.variants.find((item) => item.id === state.suggestedVariantId) ?? asset.variants.find((item) => item.name.trim() === state.name.trim()) : asset.variants.find((item) => item.name.trim() === state?.name.trim());
      nextChapterAssets.push({ id: uuidv4(), chapterId: chapter.id, assetId: asset.id, variantId: variant?.id, appearance: candidate.suggestedAssetId ? "reused" : "introduced", evidence: candidate.evidence, sourceExtractionRunId: run.id, createdAt: Date.now(), updatedAt: Date.now() });
    }
  }
  const nextRuns = assetExtractionRuns.value.map((item) => item.id === run.id ? { ...item, status: "confirmed" as const, updatedAt: Date.now() } : item);
  const nextNodes = nodes.value.map((node) => node.id === chapter.id ? { ...node, stage: "assets-ready" as const, updatedAt: Date.now() } : node);
  await persistLongProjectData({ assets: nextAssets, chapterAssets: nextChapterAssets, assetExtractionRuns: nextRuns, nodes: nextNodes });
  activeExtractionRunId.value = null;
  activeTab.value = "assets";
  toast.success("已确认本章资产");
};

const handleNodeDialogSubmit = async ({ name, content }: { name: string; content: string }) => {
  if (editingNode.value) {
    const editingId = editingNode.value.id;
    await persistNodes(nodes.value.map((node) => node.id === editingId ? { ...node, name, updatedAt: Date.now() } : node));
    nodeDialogVisible.value = false; editingNode.value = null; contextMenu.value = null; return;
  }
  const now = Date.now();
  const newNode: LongProjectNode = {
    id: uuidv4(), type: nodeDialogType.value, name, parentId: nodeDialogParentId.value,
    order: nodes.value.filter((node) => node.parentId === nodeDialogParentId.value).length,
    createdAt: now, updatedAt: now,
  };
  if (nodeDialogType.value === "chapter") {
    newNode.content = content;
    newNode.stage = content ? "source-ready" : "empty";
  }
  await persistNodes([...nodes.value, newNode]);
  nodeDialogVisible.value = false;
  contextMenu.value = null;
  if (newNode.type === "folder") expandedFolders.value = new Set([...expandedFolders.value, newNode.id]);
  else {
    if (newNode.parentId) expandedFolders.value = new Set([...expandedFolders.value, newNode.parentId]);
    selectedChapterId.value = newNode.id;
    draftContent.value = "";
    activeTab.value = "source";
  }
};

const requestDelete = (node: LongProjectNode) => { deletingNode.value = node; deleteDialogVisible.value = true; contextMenu.value = null; };
const confirmDelete = async () => {
  if (!deletingNode.value) return;
  const ids = new Set([deletingNode.value.id]);
  if (deletingNode.value.type === "folder") descendantsOf(deletingNode.value.id).forEach((node) => ids.add(node.id));
  if (selectedChapterId.value && ids.has(selectedChapterId.value)) { selectedChapterId.value = null; draftContent.value = ""; }
  await persistNodes(nodes.value.filter((node) => !ids.has(node.id))); deletingNode.value = null;
};

const saveCurrentChapter = async (notify: boolean) => {
  if (!selectedChapter.value || !isDirty.value || saving.value) return;
  saving.value = true;
  try {
    const content = draftContent.value;
    await persistNodes(nodes.value.map((node) => node.id === selectedChapterId.value ? { ...node, content, stage: content.trim() ? "source-ready" as const : "empty" as const, updatedAt: Date.now() } : node));
    if (notify) toast.success("章节已保存");
  } catch (error) { console.error("保存章节失败", error); toast.error("章节保存失败，请重试"); }
  finally { saving.value = false; }
};

const formatContent = (operation: "empty-lines" | "line-numbers" | "merge-lines" | "indent" | "trim-lines") => {
  const source = draftContent.value;
  let formatted = source;
  if (operation === "empty-lines") formatted = source.replace(/\n[\t \u3000]*\n(?:[\t \u3000]*\n)+/g, "\n\n");
  if (operation === "line-numbers") formatted = source.replace(/^[\t \u3000 ]*(?:\d+[.、)]|[（(]\d+[）)]|[一二三四五六七八九十]+[、.])[\t \u3000 ]*/gm, "");
  if (operation === "indent") formatted = source.replace(/^[\t \u3000 ]+/gm, "");
  if (operation === "trim-lines") formatted = source.replace(/[\t \u3000 ]+$/gm, "");
  if (operation === "merge-lines") {
    formatted = source.split(/\r?\n/).reduce<string[]>((paragraphs, line) => {
      const text = line.trim();
      if (!text) { if (paragraphs.at(-1) !== "") paragraphs.push(""); return paragraphs; }
      if (!paragraphs.length || paragraphs.at(-1) === "") paragraphs.push(text);
      else paragraphs[paragraphs.length - 1] += text;
      return paragraphs;
    }, []).join("\n");
  }
  if (formatted === source) return;
  contentHistory.value = [...contentHistory.value.slice(-19), source];
  draftContent.value = formatted;
};

const undoFormat = () => {
  const previous = contentHistory.value.at(-1);
  if (previous === undefined) return;
  contentHistory.value = contentHistory.value.slice(0, -1);
  draftContent.value = previous;
};

watch(draftContent, () => {
  if (!selectedChapter.value || !isDirty.value) return;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => { void saveCurrentChapter(false); }, 900);
});

onBeforeUnmount(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  if (storyboardUndoTimer) clearTimeout(storyboardUndoTimer);
});

onMounted(async () => {
  try {
    project.value = await comicDb.getProject(projectId);
    if (!project.value || project.value.projectType !== "long") { await router.replace("/comic/projects"); return; }
    expandedFolders.value = new Set(nodes.value.filter((node) => node.type === "folder").map((node) => node.id));
    [models.value, promptTemplates.value] = await Promise.all([
      comicDb.getAllModelConfigs(),
      comicDb.getAllPromptTemplates(),
    ]);
    const defaultModelId = llmModels.value[0]?.id ?? "";
    const defaultAssetTemplateId = promptTemplates.value.find((template) => template.type === "extract")?.id ?? "";
    const defaultStoryboardTemplateId = promptTemplates.value.find((template) => template.type === "storyboard")?.id ?? "";
    selectedModelByTask.value = { assets: defaultModelId, storyboard: defaultModelId };
    selectedTemplateByTask.value = { assets: defaultAssetTemplateId, storyboard: defaultStoryboardTemplateId };
    // 异常恢复：页面刚加载时不可能有进行中的分镜任务，残留 running 的 run 标记为失败，避免分镜 tab 永远转圈、工作台空白
    if (storyboardRuns.value.some((run) => run.status === "running")) {
      await persistLongProjectData({
        storyboardRuns: storyboardRuns.value.map((run) => run.status === "running"
          ? { ...run, status: "failed" as const, error: "上次分镜生成被中断，请重新生成", updatedAt: Date.now() }
          : run),
      });
    }
    applyReturnQuery();
  } finally { loading.value = false; }
});

/**
 * 应用工作台返回参数（?tab=storyboard&chapter=xxx）：
 * 选中对应章节并停留在分镜 tab。组件被 keep-alive 缓存，返回时 onMounted 不重跑，
 * 因此同时 watch route.query 覆盖激活场景。
 */
function applyReturnQuery() {
  if (route.name !== "ComicLongProject" || route.params.projectId !== projectId) return;
  const queryChapter = typeof route.query.chapter === "string" ? route.query.chapter : "";
  if (queryChapter && queryChapter !== selectedChapterId.value) {
    const chapter = nodes.value.find((node) => node.id === queryChapter);
    if (chapter) {
      if (isDirty.value) void saveCurrentChapter(false);
      activeExtractionRunId.value = null;
      selectedAssetCategory.value = null;
      selectedChapterId.value = chapter.id;
      draftContent.value = chapter.content ?? "";
      contentHistory.value = [];
    }
  }
  if (route.query.tab === "storyboard") activeTab.value = "storyboard";
}

watch(() => route.query, () => { if (route.name === "ComicLongProject") applyReturnQuery(); });
</script>

<style scoped>
.icon-button, .sidebar-icon { display: flex; width: 2rem; height: 2rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 0.5rem; color: var(--text-secondary); transition: color 0.15s ease, background-color 0.15s ease; }
.sidebar-icon { width: 2.25rem; height: 2.25rem; }
.icon-button:hover, .sidebar-icon:hover { color: var(--text-primary); background: var(--bg-elevated); }
.primary-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.5rem; background: #06b6d4; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 500; color: #020617; transition: background-color 0.15s ease; }
.primary-button:hover { background: #22d3ee; }
.primary-button:disabled { cursor: not-allowed; opacity: 0.4; }
.editor-tool { display: flex; height: 1.875rem; align-items: center; gap: 0.3125rem; justify-content: center; border-radius: 0.375rem; padding: 0 0.5rem; color: var(--text-secondary); font-size: 0.75rem; transition: color 0.15s ease, background-color 0.15s ease; }
.editor-tool:hover:not(:disabled) { background: var(--bg-elevated); color: #67e8f9; }
.editor-tool:disabled { cursor: not-allowed; opacity: 0.35; }
.task-select { width: 100%; height: 2.25rem; border: 1px solid var(--border-subtle); border-radius: 0.375rem; background: var(--bg-app); padding: 0 0.625rem; color: var(--text-secondary); font-size: 0.75rem; outline: none; }
.task-select:focus { border-color: rgba(34, 211, 238, 0.55); color: var(--text-primary); }
.task-run-button { height: 2.25rem; padding-top: 0; padding-bottom: 0; }
.format-menu-action { display: flex; width: 100%; align-items: center; gap: 0.5rem; border-radius: 0.25rem; padding: 0.5rem 0.625rem; text-align: left; font-size: 0.75rem; color: var(--text-secondary); }
.format-menu-action:hover { background: var(--bg-elevated); color: var(--text-primary); }
.context-action { display: flex; width: 100%; align-items: center; gap: 0.5rem; border-radius: 0.375rem; padding: 0.5rem 0.625rem; text-align: left; font-size: 0.75rem; color: var(--text-secondary); transition: color 0.15s ease, background-color 0.15s ease; }
.context-action:hover { background: var(--bg-elevated); color: var(--text-primary); }
.extraction-ring { animation: extraction-ring 1.8s ease-out infinite; }
.extraction-step-icon { animation: extraction-step 1.5s ease-in-out infinite; }
.extraction-step-icon:nth-child(1) { animation-delay: 0.2s; }
.loading-dot { width: 0.3rem; height: 0.3rem; border-radius: 999px; background: #22d3ee; animation: loading-dot 1.2s ease-in-out infinite; }
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes extraction-ring { 0% { opacity: 0.8; transform: scale(0.88); } 100% { opacity: 0; transform: scale(1.28); } }
@keyframes extraction-step { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
@keyframes loading-dot { 0%, 100% { transform: translateY(0); opacity: 0.35; } 50% { transform: translateY(-0.2rem); opacity: 1; } }
</style>
