<template>
  <Teleport to="body">
    <Transition name="fade">
      <!-- z-[130] 高于资产全屏抽屉（z-[101]）、低于大图预览（z-[200]） -->
      <div v-if="modelValue" class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" @click.self="handleClose">
        <section class="flex h-[min(760px,calc(100vh-3rem))] w-[min(980px,100%)] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-2xl">
          <header class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-text-primary">{{ title }}</h2>
              <p class="mt-1 text-xs text-text-muted">{{ subtitle }}</p>
            </div>
            <button class="icon-button" title="关闭" @click="handleClose"><X :size="18" /></button>
          </header>

          <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
            <!-- ===== 上方：模型 / 模板 / 范围 / 发送方式 ===== -->
            <div class="grid shrink-0 grid-cols-2 gap-4">
              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                LLM 模型
                <select v-model="modelId" class="task-select h-9 w-full" :disabled="running">
                  <option value="" disabled>选择模型</option>
                  <option v-for="model in llmModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
              </label>
              <label class="flex flex-col gap-1.5 text-xs text-text-secondary">
                提示词模板（资产提示词）
                <select v-model="templateId" class="task-select h-9 w-full" :disabled="running">
                  <option value="" disabled>选择模板</option>
                  <option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name }}</option>
                </select>
              </label>
            </div>

            <div v-if="allowScope" class="mt-4 flex shrink-0 items-center gap-4">
              <span class="text-xs text-text-secondary">生成范围</span>
              <label
                class="flex items-center gap-1.5 text-xs text-text-secondary"
                :class="{ 'pointer-events-none opacity-50': !missingCount || running || started }"
              >
                <input v-model="scope" type="radio" value="missing" class="h-3 w-3 accent-cyan-400" :disabled="!missingCount || running || started" />
                仅补缺失（{{ missingCount ?? 0 }}）
              </label>
              <label
                class="flex items-center gap-1.5 text-xs text-text-secondary"
                :class="{ 'pointer-events-none opacity-50': running || started }"
              >
                <input v-model="scope" type="radio" value="all" class="h-3 w-3 accent-cyan-400" :disabled="running || started" />
                全部重新生成（{{ totalCount ?? 0 }}）
              </label>
              <span v-if="started" class="text-[11px] text-text-muted">（本次已锁定，重新生成沿用同一范围）</span>
            </div>

            <!-- 发送方式：一次性发送（一份清单）/ 逐条发送（每条单独请求，可逐条查看修改） -->
            <div v-if="allowSendMode" class="mt-3 flex shrink-0 items-center gap-4">
              <span class="text-xs text-text-secondary">发送方式</span>
              <label class="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary" :class="{ 'pointer-events-none opacity-50': running }" title="全部状态拼成一份清单，一次请求返回所有提示词；下方文本框即这份清单">
                <input v-model="sendMode" type="radio" value="once" class="h-3 w-3 accent-cyan-400" :disabled="running" />
                一次性发送
              </label>
              <label class="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary" :class="{ 'pointer-events-none opacity-50': running }" title="每个视觉状态单独一次请求，单条失败不影响其余条目；下方可切换查看并修改每一条">
                <input v-model="sendMode" type="radio" value="per-item" class="h-3 w-3 accent-cyan-400" :disabled="running" />
                逐条发送
              </label>
              <span class="text-[11px] text-text-muted">（两种方式各自独立，切换不影响已生成结果）</span>
            </div>

            <p v-if="!templates.length" class="mt-3 shrink-0 rounded border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
              没有类型为「资产提示词」的模板。请先在系统设置中创建（模板类型选择 asset-prompt）。
            </p>

            <!-- ===== 下方：提示词区 ===== -->
            <div v-else class="mt-4 flex min-h-0 flex-1 flex-col">
              <!--
                视图切换：只要本次跑出过结果就出现，随时可在
                「提示词」（要发给大模型的内容，可改后重新生成）与
                「生成结果」（模型返回的提示词，可改后填充到资产）之间来回切。
              -->
              <div v-if="showViewTabs" class="mb-2 flex shrink-0 items-center gap-3">
                <div class="inline-flex shrink-0 rounded-md border border-border-subtle p-0.5">
                  <button :class="tabClass(effectiveView === 'prompt')" @click="setView('prompt')">提示词</button>
                  <button :class="tabClass(effectiveView === 'result')" @click="setView('result')">
                    生成结果（{{ resultCount }}）
                  </button>
                </div>
                <span class="min-w-0 truncate text-[11px] text-text-muted">{{ viewHint }}</span>
              </div>

              <!-- 提示词视图 · 一次性发送：整份清单（发送前/重发前都可改） -->
              <template v-if="effectiveView === 'prompt' && !isPerItem">
                <div class="flex shrink-0 items-center justify-between gap-3">
                  <span class="min-w-0 truncate text-xs text-text-secondary">最终发送的提示词（可在发送前修改）</span>
                  <button
                    class="shrink-0 text-xs text-cyan-500 hover:text-cyan-400 disabled:opacity-40 dark:text-cyan-400 dark:hover:text-cyan-300"
                    :disabled="running"
                    title="恢复系统按当前模板拼装的提示词"
                    @click="resetPrompt"
                  >重置</button>
                </div>
                <textarea
                  v-model="promptText"
                  class="custom-scrollbar mt-1.5 min-h-[120px] w-full resize-none rounded-md border border-border-subtle bg-app-bg p-3 font-mono text-xs leading-6 text-text-primary outline-none focus:border-cyan-500/50"
                  :class="started ? 'h-[160px] shrink-0' : 'flex-1'"
                  aria-label="最终发送提示词"
                />
              </template>

              <!-- 逐条视图：用于「逐条发送」的提示词视图，以及两种模式的「生成结果」视图 -->
              <template v-else>
                <div class="flex shrink-0 items-center gap-2">
                  <!-- 状态选择：下拉框（条目多时比标签条省横向空间） -->
                  <select
                    :value="run.activeIndex"
                    class="task-select h-8 min-w-0 flex-1 text-xs"
                    :disabled="running || !items.length"
                    aria-label="选择视觉状态"
                    @change="selectIndex(Number(($event.target as HTMLSelectElement).value))"
                  >
                    <option v-for="(item, index) in items" :key="item.key" :value="index">
                      {{ statusMark(item) }} {{ item.assetName }} · {{ item.variantName }}{{ isDirty(item) ? '（已改）' : '' }}
                    </option>
                  </select>

                  <!-- 快速切换：上一个 / 下一个 -->
                  <div class="flex shrink-0 items-center gap-1">
                    <button
                      class="icon-button h-8 w-8 disabled:opacity-30"
                      title="上一个视觉状态"
                      :disabled="running || run.activeIndex <= 0"
                      @click="selectIndex(run.activeIndex - 1)"
                    ><ChevronLeft :size="15" /></button>
                    <button
                      class="icon-button h-8 w-8 disabled:opacity-30"
                      title="下一个视觉状态"
                      :disabled="running || run.activeIndex >= items.length - 1"
                      @click="selectIndex(run.activeIndex + 1)"
                    ><ChevronRight :size="15" /></button>
                  </div>

                  <span class="shrink-0 text-xs text-text-muted">{{ items.length ? `${run.activeIndex + 1} / ${items.length}` : '0 / 0' }}</span>

                  <span v-if="activeItem && isDirty(activeItem)" class="shrink-0 text-xs text-amber-600 dark:text-amber-500">已修改</span>

                  <!-- 非精确命中：模糊名字匹配 / 顺序兜底，提示核对归属（避免静默错配） -->
                  <span
                    v-if="effectiveView === 'result' && activeItem && activeItem.match !== 'exact'"
                    class="shrink-0 rounded border border-amber-400/40 px-1.5 text-[11px] text-amber-600 dark:text-amber-400"
                    :title="activeItem.match === 'order'
                      ? '模型没写资产名/状态名，已按清单顺序自动对应 —— 请核对这一条是否属于该状态'
                      : '模型返回的名字与清单不完全一致，已按相似名匹配 —— 请核对这一条是否属于该状态'"
                  >{{ activeItem.match === 'order' ? '顺序对应' : '近似匹配' }}</span>

                  <!-- 重置本条：提示词视图恢复模板拼装默认值；结果视图恢复模型返回原文 -->
                  <button
                    class="shrink-0 text-xs text-cyan-500 hover:text-cyan-400 disabled:opacity-40 dark:text-cyan-400 dark:hover:text-cyan-300"
                    :disabled="!activeItem || activeItem.status === 'running'"
                    :title="effectiveView === 'result' ? '恢复模型返回的原文' : '恢复当前视觉状态按当前模板拼装的默认提示词'"
                    @click="resetActive"
                  >{{ effectiveView === 'result' ? '重置结果' : '重置本条' }}</button>
                </div>

                <!-- 提示词视图 -->
                <textarea
                  v-if="activeItem && effectiveView === 'prompt'"
                  v-model="activeItem.text"
                  class="custom-scrollbar mt-1.5 min-h-[120px] w-full resize-none rounded-md border border-border-subtle bg-app-bg p-3 font-mono text-xs leading-6 text-text-primary outline-none focus:border-cyan-500/50 disabled:opacity-60"
                  :class="started ? 'h-[160px] shrink-0' : 'flex-1'"
                  :disabled="activeItem.status === 'running'"
                  :placeholder="activeItem.status === 'running' ? '正在生成这一条…' : '填写或修改该视觉状态的提示词'"
                  :aria-label="`${activeItem.assetName} ${activeItem.variantName} 提示词`"
                  @input="markDirty"
                />

                <!-- 结果视图 -->
                <textarea
                  v-else-if="activeItem"
                  v-model="activeItem.result"
                  class="custom-scrollbar mt-1.5 min-h-[120px] w-full resize-none rounded-md border border-border-subtle bg-app-bg p-3 font-mono text-xs leading-6 text-text-primary outline-none focus:border-cyan-500/50 disabled:opacity-60"
                  :class="started ? 'h-[160px] shrink-0' : 'flex-1'"
                  :disabled="activeItem.status === 'running'"
                  :placeholder="resultPlaceholder(activeItem)"
                  :aria-label="`${activeItem.assetName} ${activeItem.variantName} 生成结果`"
                  @input="markDirty"
                />
              </template>

              <!-- ===== 进度区：就放在提示词输入框下面（未开始时隐藏） ===== -->
              <div v-if="started" class="mt-3 shrink-0 rounded-md border border-border-subtle bg-app-bg px-3 py-2.5">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-2">
                    <LoaderCircle v-if="running" :size="13" class="shrink-0 animate-spin text-cyan-400" />
                    <CircleCheck v-else :size="13" class="shrink-0" :class="failedCount || run.error ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'" />
                    <span class="min-w-0 truncate text-xs text-text-primary" :title="progressText">{{ progressText }}</span>
                  </div>
                  <span class="shrink-0 text-xs text-text-muted">{{ doneCount }} / {{ isPerItem ? items.length : 1 }}</span>
                </div>
                <div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :class="(failedCount || run.error) && !running ? 'bg-amber-400' : 'bg-cyan-400'"
                    :style="{ width: `${percent}%` }"
                  />
                </div>

                <!-- 未填充提醒：结果已在弹窗里，但还没写回资产 -->
                <div v-if="!running && resultCount && !run.filled" class="mt-2 min-w-0 rounded border border-cyan-400/25 bg-cyan-400/10 px-2 py-1.5">
                  <p class="truncate text-[11px] text-cyan-700 dark:text-cyan-200">
                    已生成 {{ resultCount }} 条，尚未填充到资产 · 点右下角「填充到资产」写入，或先逐条核对修改
                  </p>
                </div>

                <div v-if="!running && failedCount" class="mt-2 min-w-0">
                  <p class="truncate text-[11px] text-text-muted">
                    {{ isPerItem ? '失败项可在下拉框中选择查看原因，改完点「重新生成」按当前内容重发' : '可修改上方提示词后点「重新生成」，将整批按当前内容重发' }}
                  </p>
                </div>
                <!-- 一次性发送解析回执缺条：明确列出哪些视觉状态没拿到结果（避免静默丢失） -->
                <div v-if="!running && missingOneShotItems.length" class="mt-2 min-w-0 rounded border border-amber-400/25 bg-amber-400/10 px-2 py-1.5">
                  <p class="truncate text-[11px] text-amber-700 dark:text-amber-200">
                    有 {{ missingOneShotItems.length }} 个视觉状态未返回结果：{{ missingOneShotSummary }}
                  </p>
                  <p class="mt-0.5 text-[11px] text-text-muted">可点「重新生成」整批重发，或对单个资产用「AI 重写」</p>
                </div>

                <!-- 解析失败诊断：停在哪一层 + 期望条数 + 查看模型原始返回（避免只看到一句「解析失败」而盲猜重试） -->
                <div v-if="!running && run.diagnostics" class="mt-2 min-w-0 rounded border border-border-subtle px-2 py-1.5">
                  <p class="truncate text-[11px] text-text-secondary" :title="parseDiagnosticsSummary">{{ parseDiagnosticsSummary }}</p>
                  <p v-if="parseMissingSummary" class="mt-0.5 truncate text-[11px] text-text-muted" :title="parseMissingSummary">
                    未回填：{{ parseMissingSummary }}
                  </p>
                  <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button
                      type="button"
                      class="text-[11px] text-cyan-500 hover:text-cyan-400 dark:text-cyan-400 dark:hover:text-cyan-300"
                      @click="openRawResponse"
                    >查看模型原始返回（{{ run.diagnostics.raw.length.toLocaleString() }} 字）</button>
                    <span class="text-[11px] text-text-muted">可核对返回内容后在设置页改「解析方式」，或直接点「重新生成」重发</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer class="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle px-5 py-3">
            <p class="min-w-0 truncate text-xs text-text-muted">{{ footerHint }}</p>
            <div class="flex shrink-0 items-center gap-2">
              <button class="secondary-button" :disabled="running" @click="handleClose">{{ started ? '关闭' : '取消' }}</button>

              <template v-if="started">
                <!-- 只重跑失败/未完成项（逐条模式且有失败项时才出现） -->
                <button
                  v-if="isPerItem && remainingCount"
                  class="secondary-button h-9 px-3 text-xs"
                  :disabled="running"
                  title="仅重跑失败与未完成的条目，按输入框当前内容发送"
                  @click="handleRegenerate('failed')"
                >仅重跑失败（{{ remainingCount }}）</button>

                <button
                  class="secondary-button h-9 px-3 text-xs"
                  :disabled="running"
                  :title="regenerateAllTitle"
                  @click="handleRegenerate('all')"
                >
                  <LoaderCircle v-if="running" :size="15" class="animate-spin" />
                  {{ running ? `生成中 ${doneCount}/${items.length}` : '重新生成' }}
                </button>

                <button
                  class="primary-button h-9 px-4 text-xs"
                  :disabled="running || !resultCount"
                  :title="run.filled ? '把当前结果再写回资产一次' : '把生成结果写回资产（会覆盖这些视觉状态已有的绘画提示词）'"
                  @click="handleFill"
                >{{ run.filled ? '重新填充' : `填充到资产（${resultCount}）` }}</button>
              </template>

              <button
                v-else
                class="primary-button h-9 px-4 text-xs"
                :disabled="!canConfirm || busy"
                @click="handleConfirm"
              >
                <LoaderCircle v-if="busy" :size="15" class="animate-spin" />
                开始生成
              </button>
            </div>
          </footer>
        </section>

        <!-- 关闭确认：有结果但未填充时拦一下，避免手滑丢掉审核过的结果 -->
        <Transition name="fade">
          <div
            v-if="closeConfirmVisible"
            class="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
            @click.self="closeConfirmVisible = false"
          >
            <div class="w-[420px] max-w-full rounded-lg border border-border-subtle bg-surface p-5 shadow-2xl">
              <h3 class="text-sm font-semibold text-text-primary">还有生成结果未填充到资产</h3>
              <p class="mt-2 text-xs leading-5 text-text-secondary">
                本次生成了 {{ resultCount }} 条提示词，还没有写回资产{{ isPerItem && remainingCount ? `（另有 ${remainingCount} 条失败/未完成）` : '' }}。
                直接关闭将丢弃这些结果，资产里原有的绘画提示词不会被改动。
              </p>
              <div class="mt-4 flex items-center justify-end gap-2">
                <button class="secondary-button h-8 px-3 text-xs" @click="closeConfirmVisible = false">取消</button>
                <button class="secondary-button h-8 px-3 text-xs" @click="closeWithoutFill">直接关闭</button>
                <button class="primary-button h-9 px-4 text-xs" @click="fillAndClose">填充并关闭</button>
              </div>
            </div>
          </div>
        </Transition>

        <!-- 模型原始返回：解析失败时只读展示，便于核对是「模型没按协议输出」还是「解析方式选错」 -->
        <Transition name="fade">
          <div
            v-if="rawResponseVisible"
            class="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
            @click.self="rawResponseVisible = false"
          >
            <section class="flex h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-2xl">
              <header class="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-text-primary">模型原始返回</h3>
                  <p class="mt-0.5 truncate text-[11px] text-text-muted" :title="parseDiagnosticsSummary">
                    {{ parseDiagnosticsSummary }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <button class="secondary-button h-8 px-3 text-xs" @click="copyRawResponse">{{ rawCopied ? '已复制' : '复制全文' }}</button>
                  <button
                    class="rounded-md border border-border-subtle p-1.5 text-text-muted transition-colors hover:text-text-primary"
                    title="关闭"
                    @click="rawResponseVisible = false"
                  >
                    <X :size="15" />
                  </button>
                </div>
              </header>
              <pre class="custom-scrollbar min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all bg-app-bg px-4 py-3 font-mono text-[11px] leading-5 text-text-secondary">{{ run.diagnostics?.raw ?? '' }}</pre>
            </section>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 生成绘画提示词弹窗（批量 / 单条）——所有内容在一个弹窗内完成，不再二次弹进度窗口。
 *
 * 上方固定：LLM 模型 / 提示词模板 / 生成范围 / 发送方式（执行中锁定）。
 * 下方按「视图」切换（跑出结果后出现切换页签）：
 * - **提示词**：要发给大模型的内容，随时可改，点「重新生成」就按当前内容重发；
 * - **生成结果**：模型返回的提示词，可逐条修改，点「填充到资产」才写回。
 * 进度区就在提示词输入框下方（进度条 + 已完成 N/M + 未填充提醒 + 失败/缺条说明），不跳窗。
 *
 * 成功/失败约定：
 * - **不再自动落库**。生成/重试成功后结果只留在弹窗里（页面顶部有「未填充」提醒），
 *   必须人工核对后点「填充到资产」，避免直接覆盖资产里已有的绘画提示词；
 * - 有结果但未填充时关闭弹窗，会弹二次确认（取消 / 直接关闭 / 填充并关闭）；
 * - 失败或未完成时底部出现「仅重跑失败（N）」（逐条模式），「重新生成」则整批重跑；
 *   两者都按**输入框当前内容**发送。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, CircleCheck, LoaderCircle, X } from 'lucide-vue-next'
import type { ModelConfig, PromptTemplate } from '@comic/types'

/** 逐条模式下的单个条目（由父组件在打开弹窗 / 切换配置时提供）。 */
export interface AssetPromptRunItem {
  /** 稳定键：variantId。 */
  key: string
  assetId: string
  variantId: string
  assetName: string
  variantName: string
}

/** 回传给父组件的待填充结果（只含模型产出，不含纯模板拼装文本）。 */
export interface AssetPromptRunResult {
  assetId: string
  variantId: string
  assetName: string
  variantName: string
  imagePrompt: string
  /** 命中方式：exact 精确 / fuzzy 模糊 / order 顺序兜底（非 exact 时提示用户核对归属）。 */
  match?: 'exact' | 'fuzzy' | 'order'
}

/**
 * 解析诊断（由父组件从解析错误里带出）。
 * 结构上兼容 assetPromptParser 的 AssetPromptParseDiagnostics，但这里不引入 service 依赖。
 */
export interface AssetPromptParseDiagnosticsView {
  /** 本次使用的解析方式 */
  parser: string
  /** 解析停在哪一层（ok / bracket / json / indexed / order / plain） */
  stage: string
  expected: number
  parsed: number
  missing: string[]
  /** 模型原始返回全文 */
  raw: string
}

export interface AssetPromptConfirmPayload {
  modelId: string
  templateId: string
  prompt?: string
  scope?: 'missing' | 'all'
  sendMode?: 'once' | 'per-item'
  /** 逐条发送时：每条各自的最终发送文本（用户可在弹窗内逐条修改后再发）。 */
  perItemPrompts?: Array<{ variantId: string; prompt: string }>
}

export interface AssetPromptItemProgress {
  variantId: string
  status: 'running' | 'done' | 'failed'
  text?: string
  error?: string
  /** 一次性发送完成后展开为逐条结果（每条仍可在弹窗内切看与修改）。 */
  items?: AssetPromptRunResult[]
  /** 整批解析失败时的诊断（停在那一层 / 期望条数 / 模型原始返回）。 */
  diagnostics?: AssetPromptParseDiagnosticsView
}

/**
 * 重新生成载荷：一律携带输入框的**当前内容**（不是首次发送的原始文本）。
 * - 逐条发送：回传每条当前文本（父组件按 `scope` 决定只重跑失败项还是整批）；
 * - 一次性发送：整份清单的当前文本。
 *
 * 显式带上 `sendMode`：两种发送方式各跑过一次后，父组件里「上一次执行上下文」可能属于另一种模式，
 * 以弹窗回传的为准才不会串台。
 */
export interface AssetPromptRetryPayload {
  /** 发起重发的发送方式（弹窗当前模式）。 */
  sendMode?: 'once' | 'per-item'
  /** 重新生成范围：只重跑失败/未完成项（逐条模式可用），或整批重跑。 */
  scope?: 'failed' | 'all'
  /** 逐条发送时：各条目的当前文本。 */
  perItemPrompts?: Array<{ variantId: string; prompt: string }>
  /** 一次性发送时：整份清单的当前文本。 */
  prompt?: string
}

interface Props {
  modelValue: boolean
  llmModels: ModelConfig[]
  templates: PromptTemplate[]
  defaultModelId?: string
  defaultTemplateId?: string
  targetCount: number
  busy: boolean
  /** 构建一次性发送用的最终 prompt。 */
  buildPrompt: (template: PromptTemplate, scope?: 'missing' | 'all', sendMode?: 'once' | 'per-item') => string
  /**
   * 逐条模式：按当前配置返回全部条目，以及每条按模板拼装的初始文本（用户可改后发送）。
   * 弹窗打开、模板/范围变化时调用；不传时逐条模式退化为只读预览。
   */
  buildItems?: (template: PromptTemplate, scope?: 'missing' | 'all') => Array<AssetPromptRunItem & { prompt: string }>
  /** 批量模式：允许选择生成范围（仅补缺失 / 全部重新生成）。 */
  allowScope?: boolean
  /** 批量模式：允许选择发送方式（一次性 / 逐条）。 */
  allowSendMode?: boolean
  /** 缺少提示词的视觉状态数（allowScope 时展示）。 */
  missingCount?: number
  /** 全部视觉状态数（allowScope 时展示）。 */
  totalCount?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: AssetPromptConfirmPayload): void
  /**
   * 重新生成：把输入框当前内容重新发给大模型。
   * 父组件按 `payload.sendMode` + `payload.scope` 决定本次重跑范围。
   */
  (e: 'retry', payload: AssetPromptRetryPayload): void
  /** 填充到资产：仅包含模型产出的结果（含用户手动修改）。 */
  (e: 'save', results: AssetPromptRunResult[]): void
}>()

const modelId = ref('')
const templateId = ref('')
/** 生成范围：仅补缺失（默认）/ 全部重新生成。 */
const scope = ref<'missing' | 'all'>('missing')
/** 发送方式：一次性（默认，全部状态一份清单）/ 逐条（每个状态单独请求）。 */
const sendMode = ref<'once' | 'per-item'>('once')

/** 视图：提示词（要发送的内容）/ 生成结果（模型返回、待填充）。 */
type PromptView = 'prompt' | 'result'

/**
 * 运行态**按发送方式分别保存**（一次性 / 逐条各管各，互不污染）：
 * 在逐条模式跑完切到一次性，不应还看到逐条的进度条与结果。
 */
interface RunState {
  /** 是否已点过「开始生成」。 */
  started: boolean
  /** 逐条条目（一次性发送成功后也会用解析结果填充，便于逐条核对修改）。 */
  items: RunItem[]
  /** 当前选中的条目下标。 */
  activeIndex: number
  /** 用户是否手动选过条目（手动选过后，生成进度不再自动抢焦点）。 */
  userPickedIndex: boolean
  /** 结果是否已写回资产（填充过）。 */
  filled: boolean
  /** 一次性发送的清单文本（生成前可改；每次切回本模式沿用）。 */
  prompt: string
  /**
   * 本次一次性发送的**全部目标状态**（确认时的快照）。
   * 用于回执解析后对比：未出现在结果里的状态即「模型没返回」，需要显式提示用户，避免静默缺失。
   */
  targets: AssetPromptRunItem[]
  /** 一次性发送**整批失败**时的错误信息（逐条模式不用，逐条失败记在各条目自己的 error 上）。 */
  error: string
  /** 整批解析失败的诊断（有原始返回时可在弹窗内查看）。 */
  diagnostics: AssetPromptParseDiagnosticsView | null
  /** 当前视图（提示词 / 生成结果）。 */
  view: PromptView
  /** 用户是否手动切过视图（切过后，结果到达时不再自动跳到「生成结果」）。 */
  userPickedView: boolean
}
function createRunState(): RunState {
  return {
    started: false,
    items: [],
    activeIndex: 0,
    userPickedIndex: false,
    filled: false,
    prompt: '',
    targets: [],
    error: '',
    diagnostics: null,
    view: 'prompt',
    userPickedView: false,
  }
}

/** 逐条条目类型（一次性发送成功后也会用解析结果填充）。 */
interface RunItem extends AssetPromptRunItem {
  status: 'pending' | 'running' | 'done' | 'failed'
  /** 提示词（发送内容），用户可改。 */
  text: string
  /** 该条按模板拼装的默认文本，用于「重置本条」。 */
  originalText: string
  /** 用户是否手动改过提示词。 */
  dirty: boolean
  /** 模型返回的生成结果，用户可改（只有它会被填充到资产）。 */
  result: string
  /** 模型返回的原文，用于「重置结果」。 */
  resultOriginal: string
  /** 用户是否手动改过结果。 */
  dirtyResult: boolean
  /** 命中方式：非 exact（模糊匹配 / 顺序兜底）时提示用户核对归属。 */
  match: 'exact' | 'fuzzy' | 'order'
  error: string
}

/** 一次性 / 逐条两套独立运行态。 */
const runStates = reactive<{ once: RunState; 'per-item': RunState }>({ once: createRunState(), 'per-item': createRunState() })
/** 当前发送方式对应的运行态（模板里访问它，切换发送方式即切换整套状态）。 */
const state = computed<RunState>(() => runStates[sendMode.value])
/** 当前运行态的条目数组（保持 reactive 引用，供模板与父组件读写）。 */
const items = computed<RunItem[]>(() => state.value.items)
/** 当前发送方式下运行态的代理（模板里用 `run.xxx` 访问）。 */
const run = computed(() => state.value)
/** 一次性发送清单文本的双向绑定（写回当前模式自己的 state）。 */
const promptText = computed({
  get: () => state.value.prompt,
  set: (value: string) => { state.value.prompt = value },
})
const started = computed(() => state.value.started)

const activeItem = computed<RunItem | null>(() => items.value[state.value.activeIndex] ?? null)
const isPerItem = computed(() => Boolean(props.allowSendMode && sendMode.value === 'per-item'))
const isOverwrite = computed(() => Boolean(props.allowScope && scope.value === 'all'))
const effectiveCount = computed(() => {
  if (!props.allowScope) return props.targetCount
  return scope.value === 'missing' ? (props.missingCount ?? 0) : (props.totalCount ?? 0)
})
const builtPrompt = computed(() => {
  const template = props.templates.find((t) => t.id === templateId.value)
  if (!template) return ''
  return props.buildPrompt(template, props.allowScope ? scope.value : undefined, props.allowSendMode ? sendMode.value : undefined)
})
const canConfirm = computed(() => Boolean(modelId.value && templateId.value && effectiveCount.value > 0))
const doneCount = computed(() => items.value.filter((item) => item.status === 'done' || item.status === 'failed').length)
const failedCount = computed(() => items.value.filter((item) => item.status === 'failed').length)
/** 未完成条目数（逐条发送中途失败/未跑到的，重试时一并带上）。 */
const pendingCount = computed(() => items.value.filter((item) => item.status === 'pending').length)
/** 失败 + 未完成，用于「仅重跑失败」按钮与提示文案。 */
const remainingCount = computed(() => failedCount.value + pendingCount.value)
/** 有模型产出的条目数（= 可填充条数）。 */
const resultCount = computed(() => items.value.filter((item) => item.result.trim()).length)

/** 是否有条目正在生成（只看当前发送方式那套状态）。 */
const localRunning = computed(() => items.value.some((item) => item.status === 'running'))
/**
 * 当前发送方式是否处于执行中：`props.busy` 是全局标记（父组件一次只跑一批），
 * 只在**本模式已经开始过**时才把 busy 算进来，避免另一个模式跑的时候这边也显示「生成中」。
 */
const running = computed(() => localRunning.value || (props.busy && state.value.started))

/** 跑出过结果 → 出现「提示词 / 生成结果」页签。 */
const showViewTabs = computed(() => state.value.started && resultCount.value > 0)
/** 没有结果时强制回到提示词视图，避免停在空的结果页。 */
const effectiveView = computed<PromptView>(() => (showViewTabs.value ? state.value.view : 'prompt'))

const viewHint = computed(() => (effectiveView.value === 'result'
  ? '模型返回的提示词 · 逐条核对/修改后点「填充到资产」写回（不会自动覆盖）'
  : '将发送给大模型的内容 · 改完点「重新生成」按当前内容重发'))

/**
 * 「重新生成」的悬停说明。逐条模式有失败项时另有一个「仅重跑失败」按钮，
 * 这里说明的是「整批重跑」这一支。
 */
const regenerateAllTitle = computed(() => (isPerItem.value
  ? '全部视觉状态按输入框当前内容重新发送'
  : '整批按输入框当前内容重新发送'))

/**
 * 一次性发送：模型返回里**没有对应结果**的目标状态。
 * 回执 `items` 只含解析成功的条目，这里用确认时的目标快照做差集，把缺的显式列出来。
 */
const missingOneShotItems = computed<AssetPromptRunItem[]>(() => {
  if (isPerItem.value || running.value || !state.value.started || !state.value.targets.length) return []
  const got = new Set(items.value.map((item) => item.variantId))
  return state.value.targets.filter((target) => !got.has(target.variantId))
})
/** 缺失项摘要：最多列 6 条，超出用「等 N 个」收尾。 */
const missingOneShotSummary = computed(() => {
  const names = missingOneShotItems.value.map((item) => `${item.assetName}·${item.variantName}`)
  return names.length > 6 ? `${names.slice(0, 6).join('、')} 等 ${names.length} 个` : names.join('、')
})

// ========== 解析诊断（一次性发送整批解析失败时） ==========

/** 模型原始返回浮层是否可见。 */
const rawResponseVisible = ref(false)
/** 复制反馈：按钮文案短暂变为「已复制」。 */
const rawCopied = ref(false)

/** 解析方式中文名（诊断行展示）。 */
const PARSE_PARSER_LABELS: Record<string, string> = {
  auto: '自动识别',
  bracket: '【资产名｜状态名】逐条',
  json: 'JSON 结构化',
  indexed: '状态N：提示词',
  sequential: '严格顺序（无标记）',
  plain: '全文直接回填',
}

/** 解析停在哪一层的中文名（诊断行展示）。 */
const PARSE_STAGE_LABELS: Record<string, string> = {
  ok: '全部命中',
  bracket: '「资产名｜状态名」头部识别',
  json: 'JSON 结构识别',
  indexed: '「状态N」序号识别',
  order: '清单顺序回填',
  plain: '全文直接回填',
}

/** 解析诊断摘要：解析方式 · 停在哪一层 · 命中条数。 */
const parseDiagnosticsSummary = computed(() => {
  const diagnostics = state.value.diagnostics
  if (!diagnostics) return ''
  return [
    `解析方式 ${PARSE_PARSER_LABELS[diagnostics.parser] ?? diagnostics.parser}`,
    `停在「${PARSE_STAGE_LABELS[diagnostics.stage] ?? diagnostics.stage}」`,
    `命中 ${diagnostics.parsed}/${diagnostics.expected} 条`,
  ].join(' · ')
})

/** 未回填的状态名（诊断行第二条）。 */
const parseMissingSummary = computed(() => {
  const missing = state.value.diagnostics?.missing ?? []
  if (!missing.length) return ''
  return missing.length > 6 ? `${missing.slice(0, 6).join('、')} 等 ${missing.length} 个` : missing.join('、')
})

function openRawResponse() {
  if (!state.value.diagnostics?.raw) return
  rawCopied.value = false
  rawResponseVisible.value = true
}

/** 复制原始返回（剪贴板不可用时静默，不打断核对流程）。 */
async function copyRawResponse() {
  const raw = state.value.diagnostics?.raw
  if (!raw) return
  try {
    await navigator.clipboard.writeText(raw)
    rawCopied.value = true
    window.setTimeout(() => { rawCopied.value = false }, 1600)
  } catch {
    /* 忽略：仅影响复制按钮反馈 */
  }
}

// 切换发送方式时关掉浮层（两个模式的诊断互不相关）
watch(sendMode, () => { rawResponseVisible.value = false })

/** 一次性发送时进度分母固定为 1（整批一次请求）。 */
const totalForProgress = computed(() => (isPerItem.value ? items.value.length : 1))
const percent = computed(() => {
  if (!state.value.started) return 0
  // 一次性整批失败：进度条走满并标色，避免停在 0% 看起来像「没跑」
  if (state.value.error) return 100
  const done = isPerItem.value ? doneCount.value : (items.value.length ? 1 : 0)
  return totalForProgress.value ? Math.round((done / totalForProgress.value) * 100) : 0
})

const title = computed(() => (props.allowScope ? '批量生成绘画提示词' : '生成绘画提示词'))
const subtitle = computed(() => {
  if (!props.allowSendMode) return '将使用所选 LLM 生成提示词，结果需人工核对后点「填充到资产」写回。'
  return isPerItem.value
    ? '逐条发送：每个视觉状态单独一次请求，可切换查看并修改每一条；结果需点「填充到资产」写回。'
    : `一次性发送：全部 ${effectiveCount.value} 个视觉状态拼成一份清单，下方即最终发送内容${isOverwrite.value ? '（覆盖已有提示词）' : ''}。`
})
const progressText = computed(() => {
  if (running.value) return isPerItem.value ? '逐条生成中…' : '一次性生成中…'
  // 一次性整批失败：直接显示错误原因（否则界面上看不到任何失败痕迹）
  if (state.value.error) return state.value.error
  if (failedCount.value) return `已生成 ${resultCount.value} 条，失败 ${failedCount.value} 条`
  return state.value.filled ? `已生成并填充 ${resultCount.value} 条` : `已生成 ${resultCount.value} 条`
})
const footerHint = computed(() => {
  if (!state.value.started) {
    return isPerItem.value ? `共 ${items.value.length} 条 · 当前第 ${state.value.activeIndex + 1} 条` : `${state.value.prompt.length.toLocaleString()} 个字符`
  }
  if (running.value) return isPerItem.value ? '逐条生成中…' : '一次性生成中…'
  if (state.value.error) return '本次请求失败 · 点「重新生成」按当前内容重发'
  if (remainingCount.value) return `失败/未完成 ${remainingCount.value} 条 · 可「仅重跑失败」或整批「重新生成」`
  if (missingOneShotItems.value.length) return `有 ${missingOneShotItems.value.length} 个状态未返回 · 点「重新生成」整批重发`
  if (resultCount.value && !state.value.filled) return `已生成 ${resultCount.value} 条待填充 · 点「填充到资产」写回`
  if (resultCount.value) return `已填充 ${resultCount.value} 条 · 改动后点「重新填充」再写回`
  return '暂无结果'
})

/** 页签样式（当前视图高亮）。 */
function tabClass(active: boolean): string {
  return active
    ? 'rounded bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-600 dark:text-cyan-300'
    : 'rounded px-2.5 py-1 text-xs text-text-muted transition-colors hover:text-text-primary'
}

/** 当前视图下该条目是否被手动改过。 */
function isDirty(item: RunItem): boolean {
  return effectiveView.value === 'result' ? item.dirtyResult : item.dirty
}

/** 结果视图里空结果的占位提示（区分「没跑」与「跑失败了」）。 */
function resultPlaceholder(item: RunItem): string {
  if (item.status === 'running') return '正在生成这一条…'
  if (item.status === 'failed') return item.error || '这一条生成失败，可点「重新生成」重跑'
  if (item.status === 'pending') return '还没跑到这一条'
  return '该条暂无结果'
}

function setView(view: PromptView) {
  state.value.view = view
  state.value.userPickedView = true
}

/**
 * 按当前配置刷新逐条条目。
 * 关键约定：**切换模板 / 范围不作废已有文本** —— 已存在的条目一律原样保留（含用户改动），
 * 只补充新出现的条目、移除已不在目标范围内的条目。用户想按新模板重算时点「重置本条」。
 */
function refreshItems() {
  if (!isPerItem.value || !props.buildItems) return
  const template = props.templates.find((t) => t.id === templateId.value)
  if (!template) return
  const list = state.value.items
  const planned = props.buildItems(template, props.allowScope ? scope.value : undefined)
  const existing = new Map(list.map((item) => [item.variantId, item]))
  // 保留用户在旧条目上的排序位置：先按现有 items 的顺序保留交集，再追加新增条目
  const kept = list
    .filter((item) => planned.some((plan) => plan.variantId === item.variantId))
    .map((item) => item)
  const added = planned
    .filter((plan) => !existing.has(plan.variantId))
    .map((plan) => ({
      key: plan.key,
      assetId: plan.assetId,
      variantId: plan.variantId,
      assetName: plan.assetName,
      variantName: plan.variantName,
      status: 'pending' as const,
      text: plan.prompt,
      originalText: plan.prompt,
      dirty: false,
      result: '',
      resultOriginal: '',
      dirtyResult: false,
      match: 'exact' as const,
      error: '',
    }))
  list.splice(0, list.length, ...kept, ...added)
  if (state.value.activeIndex >= list.length) state.value.activeIndex = Math.max(0, list.length - 1)
}

/** 重置某一发送模式的整套运行态（回到「未开始」）。 */
function resetRunState(mode: 'once' | 'per-item') {
  Object.assign(runStates[mode], createRunState())
}

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  // 每次打开把两套运行态都清干净，避免上次的结果残留
  resetRunState('once')
  resetRunState('per-item')
  closeConfirmVisible.value = false
  if (!modelId.value) modelId.value = props.defaultModelId || props.llmModels[0]?.id || ''
  if (!templateId.value) templateId.value = props.defaultTemplateId || props.templates[0]?.id || ''
  if (props.allowScope) scope.value = (props.missingCount ?? 0) > 0 ? 'missing' : 'all'
  // 两种发送方式各自初始化清单文本
  runStates['per-item'].prompt = builtPromptFor('per-item')
  runStates.once.prompt = builtPromptFor('once')
  refreshItems()
})

/** 取指定发送方式下的拼装清单文本（用于初始化两套 state.prompt）。 */
function builtPromptFor(mode: 'once' | 'per-item'): string {
  const template = props.templates.find((t) => t.id === templateId.value)
  if (!template) return ''
  return props.buildPrompt(template, props.allowScope ? scope.value : undefined, props.allowSendMode ? mode : undefined)
}

// 切换模板 / 范围 / 发送方式：未开始执行时同步刷新。
// 注意：**换模板不作废用户已编辑的文本**（与逐条模式一致），想按新模板重算时点「重置」。
watch([builtPrompt, isPerItem], () => {
  if (state.value.started) return
  refreshItems()
})

function handleConfirm() {
  if (!canConfirm.value || props.busy) return
  state.value.started = true
  state.value.activeIndex = 0
  state.value.userPickedIndex = false
  // 起始停在「提示词」视图：可以在下方看着进度，结果到了再自动跳过去
  state.value.view = 'prompt'
  state.value.userPickedView = false
  state.value.filled = false
  // 一次性发送：记下本次全部目标状态，用于回执解析后比对「哪些没返回」
  if (!isPerItem.value) {
    const template = props.templates.find((t) => t.id === templateId.value)
    state.value.targets = template && props.buildItems
      ? props.buildItems(template, props.allowScope ? scope.value : undefined).map(({ key, assetId, variantId, assetName, variantName }) => ({ key, assetId, variantId, assetName, variantName }))
      : []
  }
  const payload: AssetPromptConfirmPayload = {
    modelId: modelId.value,
    templateId: templateId.value,
    prompt: state.value.prompt,
    scope: props.allowScope ? scope.value : undefined,
    sendMode: props.allowSendMode ? sendMode.value : undefined,
    perItemPrompts: isPerItem.value
      ? items.value.map((item) => ({ variantId: item.variantId, prompt: item.text }))
      : undefined,
  }
  emit('confirm', payload)
}

/** 输入即标记 dirty（提示词视图 / 结果视图各记各的）。不再自动落库，只用于展示「已修改」。 */
function markDirty() {
  const item = activeItem.value
  if (!item) return
  if (effectiveView.value === 'result') {
    item.dirtyResult = item.result !== item.resultOriginal
    // 填充后又改了结果 → 视为重新变为「待填充」，关闭时仍会提醒
    if (item.dirtyResult) state.value.filled = false
    return
  }
  item.dirty = item.text !== item.originalText
}

/**
 * 重置当前条：按当前视图恢复「默认」值。
 * - 提示词视图：按**当前模板**重新拼装该视觉状态的默认提示词（不能只回退 `originalText`——换模板后旧原文已过期）；
 * - 结果视图：回退到模型返回原文（模板拼装值不是结果，不能拿来顶替）。
 */
function resetActive() {
  const item = activeItem.value
  if (!item || item.status === 'running') return
  if (effectiveView.value === 'result') {
    item.result = item.resultOriginal
    item.dirtyResult = false
    return
  }
  const template = props.templates.find((t) => t.id === templateId.value)
  const fresh = template && props.buildItems
    ? props.buildItems(template, props.allowScope ? scope.value : undefined).find((plan) => plan.variantId === item.variantId)
    : undefined
  item.text = fresh?.prompt ?? item.originalText
  item.originalText = item.text
  item.dirty = false
}

/** 重置一次性发送的整份提示词：按当前模板重新拼装。 */
function resetPrompt() {
  if (running.value) return
  state.value.prompt = builtPrompt.value
}

/** 切换当前条目（下拉框 / 前后按钮共用）；标记用户已手动选择，避免生成进度抢焦点。 */
function selectIndex(index: number) {
  if (!items.value.length) return
  state.value.activeIndex = Math.min(Math.max(index, 0), items.value.length - 1)
  state.value.userPickedIndex = true
}

/** 下拉框选项前缀：用字符标记状态（下拉框内无法放图标组件）。 */
function statusMark(item: RunItem): string {
  if (item.status === 'running') return '◐'
  if (item.status === 'done') return item.result.trim() ? '✓' : '○'
  if (item.status === 'failed') return '✕'
  return '○'
}

/**
 * 父组件回放单条进度。
 * 关键：进度只写进对应发送方式那套运行态。一次性批量回执（variantId === 'batch-once'）归 once，
 * 其余归 per-item —— 否则切换发送方式时两套进度互相污染。
 * 自动跟随策略：**只在用户没有手动切过视图/条目时**才自动跳到结果视图与当前条目。
 *
 * 注意：**不在这里落库**。结果只留在弹窗内，等用户点「填充到资产」才写回。
 */
function applyProgress(update: AssetPromptItemProgress) {
  const target = update.items?.length || update.variantId === 'batch-once' ? runStates.once : runStates['per-item']
  target.started = true
  const list = target.items
  // 一次性发送完成：用解析出的逐条结果替换条目，让每条都能切看/修改
  if (update.status === 'done' && update.items?.length) {
    const template = props.templates.find((t) => t.id === templateId.value)
    const planned = template && props.buildItems ? props.buildItems(template, props.allowScope ? scope.value : undefined) : []
    const plannedMap = new Map(planned.map((plan) => [plan.variantId, plan.prompt]))
    list.splice(0, list.length, ...update.items.map((item) => ({
      key: item.variantId,
      assetId: item.assetId,
      variantId: item.variantId,
      assetName: item.assetName,
      variantName: item.variantName,
      status: 'done' as const,
      // text 存该条的模板拼装文本（提示词视图用），result 存模型返回（结果视图 / 填充用）
      text: plannedMap.get(item.variantId) ?? '',
      originalText: plannedMap.get(item.variantId) ?? '',
      dirty: false,
      result: item.imagePrompt,
      resultOriginal: item.imagePrompt,
      dirtyResult: false,
      match: item.match ?? 'exact',
      error: '',
    })))
    target.activeIndex = 0
    target.userPickedIndex = false
    target.filled = false
    target.error = ''
    target.diagnostics = null
    if (!target.userPickedView) target.view = 'result'
    return
  }
  // 一次性整批回执（running / failed / 解析出 0 条）：没有逐条条目可落，
  // 把错误与解析诊断记在本模式 state 上，供进度区展示（含「查看模型原始返回」）—— 否则整批失败在界面上毫无痕迹。
  if (update.variantId === 'batch-once') {
    target.error = update.status === 'failed' ? (update.error || '生成失败') : ''
    target.diagnostics = update.status === 'failed' ? (update.diagnostics ?? null) : null
    return
  }
  const item = list.find((entry) => entry.variantId === update.variantId)
  if (!item) return
  if (update.status === 'running') {
    item.status = 'running'
    item.error = ''
    if (!target.userPickedIndex) {
      const currentIndex = list.findIndex((entry) => entry.status === 'running')
      if (currentIndex >= 0) target.activeIndex = currentIndex
    }
    return
  }
  if (update.status === 'done') {
    item.status = 'done'
    item.error = ''
    // 结果单独存：**不动 item.text**，这样切回「提示词」还能看到/改发送内容
    item.result = update.text ?? item.result
    item.resultOriginal = update.text ?? item.resultOriginal
    item.dirtyResult = false
    if (!target.userPickedView) target.view = 'result'
    return
  }
  item.status = 'failed'
  item.error = update.error ?? '生成失败'
}

/**
 * 收集可填充的结果：**只取模型产出**（含用户在结果视图里的修改），
 * 绝不把纯模板拼装的 text 当结果写回，否则会把资产里已有的提示词覆盖成模板文本。
 */
function collectResults(from: RunState = state.value): AssetPromptRunResult[] {
  return from.items
    .filter((item) => item.result.trim())
    .map(({ assetId, variantId, assetName, variantName, result }) => ({ assetId, variantId, assetName, variantName, imagePrompt: result.trim() }))
}

/** 填充到资产：把结果写回（不关弹窗，方便继续核对或重新生成）。 */
function handleFill() {
  if (running.value) return
  const results = collectResults()
  if (!results.length) return
  emit('save', results)
  state.value.filled = true
}

/**
 * 重新生成：把**输入框当前内容**重新发给大模型。
 * - `scope = 'failed'`：只重跑失败/未完成项（逐条模式）；
 * - `scope = 'all'`：整批重跑（一次性发送只有这一种，因为单次请求没法只补几条）。
 */
function handleRegenerate(scopeMode: 'failed' | 'all') {
  if (running.value) return
  const effectiveScope = isPerItem.value ? scopeMode : 'all'
  emit('retry', {
    sendMode: isPerItem.value ? 'per-item' : 'once',
    scope: effectiveScope,
    perItemPrompts: isPerItem.value ? items.value.map((item) => ({ variantId: item.variantId, prompt: item.text })) : undefined,
    prompt: isPerItem.value ? undefined : state.value.prompt,
  })
}

// ===== 关闭：有结果但未填充时先确认，避免手滑丢掉已审核的结果 =====
const closeConfirmVisible = ref(false)

function handleClose() {
  if (running.value) return
  if (resultCount.value > 0 && !state.value.filled) {
    closeConfirmVisible.value = true
    return
  }
  emit('update:modelValue', false)
}

/** 直接关闭：丢弃本次结果（资产里原有的提示词不受影响）。 */
function closeWithoutFill() {
  closeConfirmVisible.value = false
  emit('update:modelValue', false)
}

/** 填充并关闭。 */
function fillAndClose() {
  closeConfirmVisible.value = false
  handleFill()
  emit('update:modelValue', false)
}

defineExpose({ applyProgress, items, started })
</script>
