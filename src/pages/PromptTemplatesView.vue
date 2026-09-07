<template>
  <div class="h-full flex flex-col overflow-hidden relative bg-app-bg">
    <!-- 顶部工具条 -->
    <header
      class="h-12 bg-surface border-b border-border-subtle flex items-center justify-between px-5 flex-shrink-0 z-20"
    >
      <h1 class="text-sm font-semibold text-text-primary">常用提示词</h1>
      <button
        class="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-gradient text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
        @click="openCreateDialog"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新建提示词
      </button>
    </header>

    <!-- 主内容区 -->
    <main class="flex-1 flex overflow-hidden">
      <!-- 左侧分类列表 -->
      <div class="w-64 shrink-0 border-r border-border-subtle bg-surface overflow-y-auto">
        <div class="p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text-primary">分类</h3>
            <button
              class="p-1 rounded hover:bg-elevated text-text-muted hover:text-text-primary transition-colors"
              title="新建分类"
              @click="showAddCategory = true"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <div class="space-y-1">
            <button
              class="w-full px-3 py-2 rounded-lg text-sm text-left transition-all duration-200 flex items-center justify-between group"
              :class="
                selectedCategoryId === ''
                  ? 'bg-cyan-500/10 text-accent border border-cyan-500/30'
                  : 'text-text-secondary hover:bg-elevated hover:text-text-primary border border-transparent'
              "
              @click="selectedCategoryId = ''"
            >
              <span>全部</span>
              <span class="text-xs text-text-muted">{{ store.promptTemplates.length }}</span>
            </button>
            <button
              v-for="cat in store.promptCategories"
              :key="cat.id"
              class="w-full px-3 py-2 rounded-lg text-sm text-left transition-all duration-200 flex items-center justify-between group"
              :class="
                selectedCategoryId === cat.id
                  ? 'bg-cyan-500/10 text-accent border border-cyan-500/30'
                  : 'text-text-secondary hover:bg-elevated hover:text-text-primary border border-transparent'
              "
              @click="selectedCategoryId = cat.id"
            >
              <span class="truncate">{{ cat.name }}</span>
              <div class="flex items-center gap-1">
                <span class="text-xs text-text-muted">{{ countByCategory(cat.id) }}</span>
                <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    v-if="cat.id !== 'default'"
                    class="p-1 rounded hover:bg-white/10"
                    @click.stop="editCategory(cat)"
                    title="重命名"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    v-if="cat.id !== 'default'"
                    class="p-1 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-400"
                    @click.stop="deleteCategory(cat.id)"
                    title="删除"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧提示词网格 -->
      <div class="flex-1 overflow-y-auto p-5">
        <!-- 工具栏 -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold text-text-primary">
              {{ currentCategoryName }}
            </h2>
            <p class="text-xs text-text-secondary mt-0.5">
              共 {{ filteredTemplates.length }} 条提示词
            </p>
          </div>
          <!-- 搜索框 -->
          <div class="relative">
            <svg class="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchKeyword"
              type="text"
              class="w-56 bg-input-bg border border-border-subtle rounded-lg pl-9 pr-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="搜索提示词..."
            />
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredTemplates.length === 0" class="flex flex-col items-center justify-center py-20 text-text-muted">
          <svg class="w-16 h-16 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-sm">暂无提示词</p>
          <button
            class="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-accent-gradient text-white hover:opacity-90 transition-opacity"
            @click="openCreateDialog"
          >
            新建提示词
          </button>
        </div>

        <!-- 提示词卡片网格 -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div
            v-for="tpl in filteredTemplates"
            :key="tpl.id"
            class="group bg-surface border border-border-subtle rounded-xl p-4 hover:border-border-default hover:shadow-md transition-all duration-200 flex flex-col"
          >
            <!-- 卡片头部 -->
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-sm font-semibold text-text-primary truncate flex-1">{{ tpl.title }}</h3>
              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  class="p-1 rounded hover:bg-elevated text-text-muted hover:text-accent transition-colors"
                  title="使用"
                  @click="useTemplate(tpl)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </button>
                <button
                  class="p-1 rounded hover:bg-elevated text-text-muted hover:text-text-primary transition-colors"
                  title="复制内容"
                  @click="copyTemplate(tpl)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  class="p-1 rounded hover:bg-elevated text-text-muted hover:text-text-primary transition-colors"
                  title="编辑"
                  @click="openEditDialog(tpl)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  class="p-1 rounded hover:bg-elevated text-text-muted hover:text-red-400 transition-colors"
                  title="删除"
                  @click="deleteTemplate(tpl.id)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <!-- 内容预览 -->
            <p class="text-xs text-text-secondary leading-relaxed line-clamp-4 flex-1">{{ tpl.content }}</p>
            <!-- 底部信息 -->
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-border-subtle">
              <span class="text-[10px] text-text-muted">
                {{ getCategoryName(tpl.categoryId) }}
              </span>
              <span class="text-[10px] text-text-muted">
                {{ store.formatRelativeTime(tpl.updatedAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 新建/编辑提示词弹窗 -->
    <teleport to="body">
      <div
        v-if="showEditor"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click="showEditor = false"
      >
        <div
          class="w-96 bg-surface border border-border-subtle rounded-2xl shadow-2xl p-5"
          @click.stop
        >
          <h3 class="text-base font-semibold text-text-primary mb-4">
            {{ editingTemplate ? '编辑提示词' : '新建提示词' }}
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-text-secondary block mb-1.5">标题</label>
              <input
                v-model="editorTitle"
                type="text"
                class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="给这个提示词起个名字"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-text-secondary block mb-1.5">分类</label>
              <select
                v-model="editorCategoryId"
                class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option v-for="cat in store.promptCategories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-text-secondary block mb-1.5">提示词内容</label>
              <textarea
                v-model="editorContent"
                rows="6"
                class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors resize-none leading-relaxed"
                placeholder="输入提示词内容..."
              />
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button
              class="flex-1 py-2 rounded-lg text-sm text-text-secondary border border-border-subtle hover:bg-elevated transition-colors"
              @click="showEditor = false"
            >
              取消
            </button>
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-accent-gradient hover:opacity-90 transition-opacity"
              @click="saveTemplate"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 新建分类弹窗 -->
    <teleport to="body">
      <div
        v-if="showAddCategory"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click="showAddCategory = false"
      >
        <div
          class="w-72 bg-surface border border-border-subtle rounded-2xl shadow-2xl p-5"
          @click.stop
        >
          <h3 class="text-base font-semibold text-text-primary mb-4">新建分类</h3>
          <input
            v-model="newCategoryName"
            type="text"
            class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
            placeholder="分类名称"
            @keyup.enter="confirmAddCategory"
          />
          <div class="flex gap-2 mt-4">
            <button
              class="flex-1 py-2 rounded-lg text-sm text-text-secondary border border-border-subtle hover:bg-elevated transition-colors"
              @click="showAddCategory = false"
            >
              取消
            </button>
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-accent-gradient hover:opacity-90 transition-opacity"
              @click="confirmAddCategory"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 重命名分类弹窗 -->
    <teleport to="body">
      <div
        v-if="showRenameCategory"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click="showRenameCategory = false"
      >
        <div
          class="w-72 bg-surface border border-border-subtle rounded-2xl shadow-2xl p-5"
          @click.stop
        >
          <h3 class="text-base font-semibold text-text-primary mb-4">重命名分类</h3>
          <input
            v-model="renameCategoryName"
            type="text"
            class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
            placeholder="分类名称"
            @keyup.enter="confirmRenameCategory"
          />
          <div class="flex gap-2 mt-4">
            <button
              class="flex-1 py-2 rounded-lg text-sm text-text-secondary border border-border-subtle hover:bg-elevated transition-colors"
              @click="showRenameCategory = false"
            >
              取消
            </button>
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-accent-gradient hover:opacity-90 transition-opacity"
              @click="confirmRenameCategory"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Toast 提示 -->
    <teleport to="body">
      <transition name="toast">
        <div
          v-if="toastMessage"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-surface border border-border-subtle shadow-lg text-sm text-text-primary"
        >
          {{ toastMessage }}
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'PromptTemplatesView' });
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useImageStudioStore } from '@/stores/imageStudio'
import type { PromptCategory, PromptTemplate } from '@/stores/imageStudio'

const router = useRouter()
const store = useImageStudioStore()

const selectedCategoryId = ref('')
const searchKeyword = ref('')
const showAddCategory = ref(false)
const showRenameCategory = ref(false)
const newCategoryName = ref('')
const renameCategoryName = ref('')
const editingCategory = ref<PromptCategory | null>(null)

// 编辑器状态
const showEditor = ref(false)
const editingTemplate = ref<PromptTemplate | null>(null)
const editorTitle = ref('')
const editorContent = ref('')
const editorCategoryId = ref('default')

const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

/** 当前分类名称 */
const currentCategoryName = computed(() => {
  if (selectedCategoryId.value === '') return '全部'
  return store.promptCategories.find(c => c.id === selectedCategoryId.value)?.name || '全部'
})

/** 按分类和搜索关键词过滤的提示词列表 */
const filteredTemplates = computed(() => {
  let list = store.promptTemplates
  if (selectedCategoryId.value !== '') {
    list = list.filter(t => t.categoryId === selectedCategoryId.value)
  }
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(t =>
      t.title.toLowerCase().includes(kw) || t.content.toLowerCase().includes(kw)
    )
  }
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt)
})

/** 统计某分类下的提示词数量 */
const countByCategory = (categoryId: string) =>
  store.promptTemplates.filter(t => t.categoryId === categoryId).length

/** 获取分类名称 */
const getCategoryName = (categoryId: string) =>
  store.promptCategories.find(c => c.id === categoryId)?.name || '默认'

/** 显示 Toast */
const showToast = (msg: string) => {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2000)
}

/** 打开新建弹窗 */
const openCreateDialog = () => {
  editingTemplate.value = null
  editorTitle.value = ''
  editorContent.value = ''
  editorCategoryId.value = selectedCategoryId.value || 'default'
  showEditor.value = true
}

/** 打开编辑弹窗 */
const openEditDialog = (tpl: PromptTemplate) => {
  editingTemplate.value = tpl
  editorTitle.value = tpl.title
  editorContent.value = tpl.content
  editorCategoryId.value = tpl.categoryId
  showEditor.value = true
}

/** 保存提示词（新建或更新） */
const saveTemplate = () => {
  if (!editorContent.value.trim()) {
    showToast('请输入提示词内容')
    return
  }
  if (editingTemplate.value) {
    store.updatePromptTemplate(editingTemplate.value.id, {
      title: editorTitle.value,
      content: editorContent.value,
      categoryId: editorCategoryId.value
    })
    showToast('已更新')
  } else {
    store.savePromptTemplate(editorTitle.value, editorContent.value, editorCategoryId.value)
    showToast('已创建')
  }
  showEditor.value = false
}

/** 使用提示词，跳转到工作台 */
const useTemplate = (tpl: PromptTemplate) => {
  store.usePromptTemplate(tpl)
  showToast('已填入提示词')
  setTimeout(() => router.push('/image-studio'), 400)
}

/** 复制提示词到剪贴板 */
const copyTemplate = async (tpl: PromptTemplate) => {
  try {
    await navigator.clipboard.writeText(tpl.content)
    showToast('已复制到剪贴板')
  } catch {
    showToast('复制失败')
  }
}

/** 删除提示词 */
const deleteTemplate = (id: string) => {
  if (confirm('确定删除这条提示词？')) {
    store.deletePromptTemplate(id)
    showToast('已删除')
  }
}

/** 确认新建分类 */
const confirmAddCategory = () => {
  const name = newCategoryName.value.trim()
  if (!name) return
  store.addPromptCategory(name)
  newCategoryName.value = ''
  showAddCategory.value = false
  showToast('已创建分类')
}

/** 编辑分类 */
const editCategory = (cat: PromptCategory) => {
  editingCategory.value = cat
  renameCategoryName.value = cat.name
  showRenameCategory.value = true
}

/** 确认重命名分类 */
const confirmRenameCategory = () => {
  const name = renameCategoryName.value.trim()
  if (!name || !editingCategory.value) return
  store.renamePromptCategory(editingCategory.value.id, name)
  showRenameCategory.value = false
  showToast('已重命名')
}

/** 删除分类 */
const deleteCategory = (id: string) => {
  if (confirm('删除分类后，其下提示词将归到「默认」分类，确定删除？')) {
    store.deletePromptCategory(id)
    if (selectedCategoryId.value === id) {
      selectedCategoryId.value = ''
    }
    showToast('已删除分类')
  }
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
