<template>
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
    <article
      v-for="template in templates"
      :key="template.id"
      class="bg-surface border border-border-subtle rounded-lg p-4 hover:bg-elevated hover:border-border-default hover:shadow-lg hover:shadow-cyan-500/5 transition-[background-color,border-color,box-shadow] flex flex-col"
      :class="{ 'opacity-50': draggedId === template.id }"
      draggable="true"
      @dragstart="startDrag($event, template.id)"
      @dragover.prevent
      @drop="dropOn($event, template.id)"
    >
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2 pr-2 min-w-0">
          <GripVertical class="w-4 h-4 text-text-secondary cursor-grab shrink-0" />
          <h3 class="text-sm font-semibold text-text-primary truncate">{{ template.name }}</h3>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-accent border border-cyan-500/20 shrink-0">
            {{ typeLabel(template.type) }}
          </span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <IconButton title="编辑模板" @click="openEdit(template)"><Pencil class="w-3.5 h-3.5" /></IconButton>
          <IconButton title="复制模板" tone="success" @click="duplicate(template)"><Copy class="w-3.5 h-3.5" /></IconButton>
          <IconButton title="删除模板" tone="danger" @click="remove(template.id)"><Trash2 class="w-3.5 h-3.5" /></IconButton>
        </div>
      </div>
      <dl class="flex-1 space-y-2 min-w-0">
        <div v-if="template.description">
          <dt class="text-[11px] text-text-secondary mb-0.5">描述</dt>
          <dd class="text-xs text-text-secondary truncate">{{ template.description }}</dd>
        </div>
        <div>
          <dt class="text-[11px] text-text-secondary mb-0.5">提示词内容</dt>
          <dd class="text-xs text-text-secondary truncate" :title="template.content">{{ template.content }}</dd>
        </div>
      </dl>
    </article>

    <div v-if="templates.length === 0" class="col-span-full text-center text-text-muted text-sm py-12 bg-surface border border-border-subtle rounded-lg">
      暂无提示词模板，点击右上角添加
    </div>
  </div>

  <div
    v-if="modalVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    @click.self="closeModal"
  >
    <form class="flex max-h-[calc(100vh-2rem)] w-[560px] max-w-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface" @submit.prevent="save">
      <h3 class="shrink-0 px-6 pt-6 text-base font-semibold text-text-primary">
        {{ editingId ? '编辑' : '添加' }}提示词模板
      </h3>
      <div class="custom-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto px-6">
        <div class="space-y-4 pb-2">
        <SettingsFieldInput v-model="form.name" label="模板名称" placeholder="例如：角色提取模板" />
        <div>
          <label class="block text-xs text-text-secondary mb-1.5">模板类型</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in typeOptions"
              :key="option.value"
              type="button"
              class="px-3 py-2 rounded-lg text-sm border transition-colors"
              :class="form.type === option.value
                ? 'border-cyan-500/50 bg-cyan-500/10 text-accent'
                : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default'"
              @click="form.type = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <SettingsFieldInput v-model="form.description" label="模板描述" placeholder="简要描述该模板的用途" />
        <label class="block text-xs text-text-secondary">
          <span class="mb-1.5 flex items-center justify-between gap-3"><span>提示词内容</span><button v-if="form.type === 'extract'" type="button" class="text-cyan-400 hover:text-cyan-300" @click="applyRecommendedExtractionTemplate">填入推荐资产提取模板</button><button v-else-if="form.type === 'storyboard'" type="button" class="text-cyan-400 hover:text-cyan-300" @click="applyRecommendedStoryboardTemplate">填入推荐分镜模板</button><button v-else-if="form.type === 'asset-prompt'" type="button" class="text-cyan-400 hover:text-cyan-300" @click="applyRecommendedAssetPromptTemplate">填入推荐资产绘画提示词模板</button><button v-else-if="form.type === 'panel-prompt'" type="button" class="text-cyan-400 hover:text-cyan-300" @click="applyRecommendedPanelPromptTemplate">填入推荐分镜画面描述模板</button></span>
          <textarea
            v-model="form.content"
            rows="7"
            class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
            placeholder="输入提示词内容"
          />
        </label>
        </div>
      </div>
      <div class="mt-4 flex shrink-0 justify-end gap-2 border-t border-border-subtle px-6 py-4">
        <button type="button" class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary" @click="closeModal">取消</button>
        <button
          type="submit"
          class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
          :disabled="!form.name.trim() || !form.content.trim()"
        >
          {{ editingId ? '保存修改' : '确认添加' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { Copy, GripVertical, Pencil, Trash2 } from 'lucide-vue-next';
import { comicDb } from '@/api/comic';
import type { PromptTemplate, TemplateType } from '@comic/types';
import IconButton from './SettingsIconButton.vue';
import SettingsFieldInput from './SettingsFieldInput.vue';

const templates = ref<PromptTemplate[]>([]);
const modalVisible = ref(false);
const editingId = ref<string | null>(null);
const draggedId = ref<string | null>(null);
const form = reactive({ name: '', type: 'extract' as TemplateType, description: '', content: '' });
const typeOptions: Array<{ value: TemplateType; label: string }> = [
  { value: 'style', label: '风格模板' },
  { value: 'extract', label: '资产提取模板' },
  { value: 'story', label: '故事模板' },
  { value: 'storyboard', label: '分镜模板' },
  { value: 'asset-prompt', label: '资产绘画提示词模板' },
  { value: 'panel-prompt', label: '分镜画面描述模板' },
];
const recommendedExtractionPrompt = `你是一名专业的小说漫画化资产分析师。请从当前章节中识别后续漫画创作需要反复引用、并保持视觉一致性的核心资产。

【提取范围】
仅提取人物、场景、道具三类。
- 人物：有姓名或明确身份、推动剧情、持续出现，或需要稳定视觉形象的角色。不要提取泛称路人、群众或无画面必要的一次性人物。
- 场景：承载关键事件、可能重复使用，或具有明确空间与视觉识别度的地点。不要把普通“路上”“房间里”等缺少特征的泛化地点独立成资产。
- 道具：推动剧情、反复出现、具有独特外观，或会成为镜头重点的物品。不要提取日常且无视觉重点的普通物件。

【合并与连续性】
- 同一对象的姓名、称谓、代号和代词指代应合并为同一资产；将其他称谓写入“别名”。
- 人物的年龄阶段、服装、身份、伤势、情绪外显、变身或特殊形态，不是新人物，写为“视觉状态”。
- 场景的昼夜、季节、天气、破损、节庆布置等，不是新场景，写为“视觉状态”。
- 道具的使用前后、展开/收起、损坏/修复等，不是新道具，写为“视觉状态”。
- 视觉状态必须是原文已明确的稳定形象或形态；镜头正侧背面、景别和构图不属于视觉状态。

【信息要求】
- 每项写明“重要性”：会在当前或后续分镜中重点保持一致的写“主要”，其余写“次要”。
- 每项写“描述”和 1 至 3 条“原文依据”。描述只归纳原文已经明确的信息；原文未说明的外貌、材质、环境和关系不得补写。
- 有明确外观信息时，为视觉状态写“视觉描述”和“绘画提示词”；绘画提示词只能使用本项描述中已有的信息。信息不足时留空，不要猜测。
- 可按原文补充有价值的中文属性。人物优先考虑身份、阵营/门派、职业、关系、年龄阶段、能力/境界；场景优先考虑地点类型、时代、氛围、时间/天气；道具优先考虑用途、材质、持有者、能力/状态。没有依据的属性不要输出。

【输出原则】
- 宁缺毋滥：只提取真正会影响后续画面一致性的资产。
- 不要输出原文中没有根据的设定、外貌细节、背景故事或绘画风格。
- 系统会自动处理输出结构；请严格遵守系统附加的格式要求。

【章节原文】
{{chapter_content}}`;
const recommendedAssetPromptPrompt = `你是一名资深的漫画绘画提示词工程师。请根据下面的状态清单与风格上下文，为每一个视觉状态撰写一段可直接用于生图的中文绘画提示词。

【目标生图模型】
{{target_model}}

【风格上下文】
{{style}}

【待生成状态清单】
{{assets}}

【写作要求】
- 每段提示词为一段完整、连贯的中文描述，不要分点。
- 人物包含：外貌与体型、服饰与材质、表情姿态与氛围；场景包含：空间结构、环境元素、光线与氛围；道具包含：外形、材质、细节特征。
- 结尾附上画风要求，与风格上下文保持一致。
- 严格基于清单给定信息撰写，不要编造与原文冲突的细节，不要出现镜头语言（如特写、仰视等）。`;
const recommendedStoryboardPrompt = `你是一名小说漫画分镜设计师。请将当前章节拆分为可直接绘制的关键分镜。

保留推动剧情、情绪转折、角色行动和重要信息的画面；删除重复叙述与不能画面化的内心独白。每个分镜只呈现一个清晰的主要动作或画面重点，并根据项目资产库选择正确的人物、场景、道具和视觉状态。

“出场资产”必须引用资产库中的资产名称；角色服装、年龄、伤势、身份阶段等必须填写对应视觉状态。若原文是回忆、倒叙、变身或特殊状态，以原文为准，不要机械按章节推断。

绘画提示词只描述本镜头明确的构图、动作、情绪、环境和已绑定资产状态，不要补写原文没有的细节。

【章节原文】
{{chapter_content}}`;
const recommendedPanelPromptPrompt = `你是一名专业的漫画分镜画面描述师。请根据当前分镜信息，写出一段可直接用于漫画生图的中文画面描述。

【目标生图模型】
{{target_model}}

【风格上下文】
{{style}}

【本章分镜概要】
{{chapter_outline}}

【前文分镜与画面】
{{prev_panels}}

【当前分镜】
镜头：{{shot}}
画面内容：{{panel_content}}

【本分镜绑定资产视觉设定】
{{assets}}

【写作要求】
- 描述画面中的人物位置、动作、表情、场景环境与氛围，构图遵循当前镜头类型；
- 出场资产必须严格遵循给定的资产视觉设定（外观、服饰等固定特征），不要改动；
- 与前文分镜保持剧情与画面的连续性（人物位置关系、光线、场景细节等）；
- 严格基于给定信息撰写，不要补写原文没有的细节；
- 不写对白与旁白，只描述画面本身；
- 输出为一段完整、连贯的中文描述。`;

function typeLabel(type: TemplateType): string {
  return ({ style: '风格', extract: '资产提取', story: '故事', storyboard: '分镜', 'asset-prompt': '资产绘画提示词', 'panel-prompt': '分镜画面描述' })[type] ?? type;
}

async function load() {
  const result = await comicDb.getAllPromptTemplates();
  templates.value = result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function resetForm() {
  Object.assign(form, { name: '', type: 'extract', description: '', content: '' });
  editingId.value = null;
}

function applyRecommendedExtractionTemplate() {
  form.name = form.name.trim() || '长篇章节资产提取';
  form.description = form.description.trim() || '从章节原文中识别人物、场景、道具，并输出可审核的结构化资产。';
  form.content = recommendedExtractionPrompt;
}

function applyRecommendedStoryboardTemplate() {
  form.name = form.name.trim() || '长篇章节分镜';
  form.description = form.description.trim() || '根据章节原文与项目资产库生成可审核的漫画分镜。';
  form.content = recommendedStoryboardPrompt;
}

function applyRecommendedAssetPromptTemplate() {
  form.name = form.name.trim() || '资产绘画提示词';
  form.description = form.description.trim() || '按状态清单与风格上下文，为资产视觉状态批量生成绘画提示词。';
  form.content = recommendedAssetPromptPrompt;
}

function applyRecommendedPanelPromptTemplate() {
  form.name = form.name.trim() || '分镜画面描述';
  form.description = form.description.trim() || '按分镜内容、前文画面与资产视觉设定，逐镜生成可直接生图的画面描述。';
  form.content = recommendedPanelPromptPrompt;
}

function openCreate() {
  resetForm();
  modalVisible.value = true;
}

function openEdit(template: PromptTemplate) {
  editingId.value = template.id;
  Object.assign(form, {
    name: template.name,
    type: template.type,
    description: template.description,
    content: template.content,
  });
  modalVisible.value = true;
}

function closeModal() {
  modalVisible.value = false;
  resetForm();
}

async function save() {
  if (!form.name.trim() || !form.content.trim()) return;
  const existing = editingId.value ? templates.value.find((item) => item.id === editingId.value) : null;
  const maxOrder = templates.value.length ? Math.max(...templates.value.map((item) => item.sortOrder ?? 0)) : 0;
  const now = Date.now();
  await comicDb.savePromptTemplate({
    id: existing?.id || uuidv4(),
    name: form.name.trim(),
    type: form.type,
    description: form.description.trim(),
    content: form.content,
    assetExtractionConfig: undefined,
    sortOrder: existing?.sortOrder ?? maxOrder + 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  await load();
  closeModal();
}

async function duplicate(template: PromptTemplate) {
  const maxOrder = templates.value.length ? Math.max(...templates.value.map((item) => item.sortOrder ?? 0)) : 0;
  const now = Date.now();
  await comicDb.savePromptTemplate({
    ...template,
    id: uuidv4(),
    name: `${template.name} (副本)`,
    sortOrder: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  });
  await load();
}

async function remove(id: string) {
  if (!confirm('确定要删除这个提示词模板吗？')) return;
  await comicDb.deletePromptTemplate(id);
  await load();
}

function startDrag(event: DragEvent, id: string) {
  draggedId.value = id;
  event.dataTransfer?.setData('text/plain', id);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

async function dropOn(event: DragEvent, targetId: string) {
  event.preventDefault();
  const sourceId = draggedId.value;
  draggedId.value = null;
  if (!sourceId || sourceId === targetId) return;
  const source = templates.value.find((item) => item.id === sourceId);
  const target = templates.value.find((item) => item.id === targetId);
  if (!source || !target) return;
  await Promise.all([
    comicDb.savePromptTemplate({ ...source, sortOrder: target.sortOrder ?? 0, updatedAt: Date.now() }),
    comicDb.savePromptTemplate({ ...target, sortOrder: source.sortOrder ?? 0, updatedAt: Date.now() }),
  ]);
  await load();
}

defineExpose({ openCreate });
onMounted(load);
</script>

<style scoped>
.settings-input { min-width: 0; border: 1px solid var(--border-subtle); border-radius: 0.375rem; background: var(--bg-app); padding: 0.4rem 0.55rem; color: var(--text-primary); font-size: 0.75rem; outline: none; }
.settings-input:focus { border-color: rgba(34, 211, 238, 0.55); }
</style>
