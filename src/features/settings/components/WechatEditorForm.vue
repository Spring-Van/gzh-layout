<template>
  <div class="flex h-full min-h-0 flex-col">
    <header class="shrink-0 border-b border-border-subtle px-6 pb-3 pt-4">
      <h2 class="truncate text-base font-semibold text-text-primary">
        {{ account ? account.nickname : '添加公众号账号' }}
      </h2>
      <p class="mt-0.5 text-xs text-text-secondary">
        微信公众号 · {{ account ? (account.isActive ? '当前账号 · 编辑后需重新鉴权' : '编辑后需重新鉴权') : '鉴权成功后加入列表' }}
      </p>
    </header>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-xs text-text-secondary">
          <span class="mb-1.5 block">AppID</span>
          <input v-model="form.appId" type="text" class="field-control" placeholder="微信公众号 AppID" />
        </label>
        <label class="block text-xs text-text-secondary">
          <span class="mb-1.5 block">AppSecret (接口凭据)</span>
          <span class="relative block">
            <input
              v-model="form.appSecret"
              :type="showSecret ? 'text' : 'password'"
              class="field-control pr-10"
              placeholder="输入 AppSecret"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary"
              :title="showSecret ? '隐藏 AppSecret' : '显示 AppSecret'"
              @click="showSecret = !showSecret"
            >
              <EyeOff v-if="showSecret" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </span>
        </label>
      </div>

      <div v-if="wechatStore.lastAuthError" class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
        <div class="flex items-start gap-2">
          <CircleAlert class="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div class="font-medium">鉴权失败</div>
            <div class="mt-0.5 text-xs">{{ wechatStore.lastAuthError }}</div>
          </div>
        </div>
      </div>
    </div>

    <footer class="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle bg-surface px-6 py-3">
      <div class="flex min-w-0 items-center gap-2">
        <template v-if="account">
          <button
            type="button"
            class="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-cyan-500/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="account.isActive"
            @click="switchAccount"
          >
            {{ account.isActive ? '当前账号' : '切换为当前账号' }}
          </button>
          <button
            type="button"
            class="rounded-md border px-3 py-1.5 text-xs transition-colors"
            :class="account.isDefaultSync
              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
              : 'border-border-subtle text-text-secondary hover:border-emerald-500/30 hover:text-emerald-400'"
            @click="toggleDefault"
          >
            {{ account.isDefaultSync ? '已设为默认同步' : '设为默认同步' }}
          </button>
        </template>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
          @click="resetForm"
        >
          重置
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-md bg-accent-gradient px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
          :disabled="isAuthenticating || !canSave"
          @click="save"
        >
          <LoaderCircle v-if="isAuthenticating" class="h-3.5 w-3.5 animate-spin" />
          {{ account ? '保存并重新鉴权' : '请求鉴权并添加' }}
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CircleAlert, Eye, EyeOff, LoaderCircle } from 'lucide-vue-next';
import { useToast } from '@/hooks/useToast';
import { useWechatAccountStore } from '@/stores/wechatAccount';
import type { WechatAccount } from '@/types';

const props = defineProps<{
  account: WechatAccount | null;
}>();

const emit = defineEmits<{
  saved: [accountId: string];
  'dirty-change': [dirty: boolean];
}>();

const wechatStore = useWechatAccountStore();
const { success: toastSuccess } = useToast();

const form = ref({ appId: '', appSecret: '' });
const showSecret = ref(false);

let snapshot = '';

const canSave = computed(() => Boolean(form.value.appId.trim() && form.value.appSecret.trim()));
const isAuthenticating = computed(() => wechatStore.isAuthenticating);

function fillForm() {
  form.value = {
    appId: props.account?.appId ?? '',
    appSecret: props.account?.appSecret || '',
  };
  showSecret.value = false;
  wechatStore.clearError();
  snapshot = JSON.stringify(form.value);
  emit('dirty-change', false);
}

watch(() => props.account, fillForm, { immediate: true });

watch(form, () => {
  emit('dirty-change', JSON.stringify(form.value) !== snapshot);
}, { deep: true });

function resetForm() {
  fillForm();
}

async function save() {
  if (!canSave.value) return;
  const result = props.account
    ? await wechatStore.updateAccount(props.account.id, form.value.appId, form.value.appSecret)
    : await wechatStore.authenticateAndSaveAccount(form.value.appId, form.value.appSecret);
  if (!result) return;
  toastSuccess(props.account ? '账号更新成功！' : '鉴权成功！');
  emit('saved', result.id);
}

async function switchAccount() {
  if (!props.account || props.account.isActive) return;
  await wechatStore.setActiveAccount(props.account.id);
  toastSuccess('账号已切换');
}

async function toggleDefault() {
  if (!props.account) return;
  const willCancel = props.account.isDefaultSync;
  await wechatStore.setDefaultSyncAccount(props.account.id);
  toastSuccess(willCancel ? '已取消默认同步' : '默认同步账号已设置');
}
</script>

<style scoped>
.field-control {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-input);
  padding: 0.5rem 0.75rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
}

.field-control:focus {
  border-color: rgb(6 182 212 / 0.5);
}
</style>
