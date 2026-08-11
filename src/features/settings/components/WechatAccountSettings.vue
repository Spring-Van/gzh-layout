<template>
  <WechatAccountList
    :accounts="wechatStore.accounts"
    @edit="openEdit"
    @delete="remove"
    @switch-account="switchAccount"
    @toggle-default="toggleDefault"
  />

  <div
    v-if="modalVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    @click.self="closeModal"
  >
    <form class="bg-surface border border-border-subtle rounded-lg w-[480px] max-w-full p-6" @submit.prevent="save">
      <h3 class="text-base font-semibold text-text-primary mb-4">{{ editingAccount ? '编辑公众号账号' : '添加公众号账号' }}</h3>
      <div class="space-y-4">
        <label class="block text-xs text-text-secondary">
          <span class="block mb-1.5">AppID</span>
          <input v-model="form.appId" type="text" class="field-control" placeholder="微信公众号 AppID" />
        </label>
        <label class="block text-xs text-text-secondary">
          <span class="block mb-1.5">AppSecret (接口凭据)</span>
          <span class="relative block">
            <input v-model="form.appSecret" :type="showSecret ? 'text' : 'password'" class="field-control pr-10" placeholder="输入 AppSecret" />
            <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1" :title="showSecret ? '隐藏 AppSecret' : '显示 AppSecret'" @click="showSecret = !showSecret">
              <EyeOff v-if="showSecret" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </span>
        </label>
        <div v-if="wechatStore.lastAuthError" class="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div class="flex items-start gap-2">
            <CircleAlert class="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div class="font-medium">鉴权失败</div>
              <div class="text-xs mt-0.5">{{ wechatStore.lastAuthError }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 mt-6">
        <button type="button" class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary" @click="closeModal">取消</button>
        <button type="submit" class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 flex items-center gap-2 disabled:opacity-50" :disabled="wechatStore.isAuthenticating || !form.appId || !form.appSecret">
          <LoaderCircle v-if="wechatStore.isAuthenticating" class="w-4 h-4 animate-spin" />
          <span>{{ wechatStore.isAuthenticating ? '鉴权中...' : editingAccount ? '请求鉴权并更新' : '请求鉴权并添加' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CircleAlert, Eye, EyeOff, LoaderCircle } from 'lucide-vue-next';
import { useToast } from '@/hooks/useToast';
import { useWechatAccountStore } from '@/stores/wechatAccount';
import type { WechatAccount } from '@/types';
import WechatAccountList from './WechatAccountList.vue';

const wechatStore = useWechatAccountStore();
const { success: toastSuccess } = useToast();
const modalVisible = ref(false);
const editingAccount = ref<WechatAccount | null>(null);
const showSecret = ref(false);
const form = ref({ appId: '', appSecret: '' });

function resetForm() {
  editingAccount.value = null;
  showSecret.value = false;
  form.value = { appId: '', appSecret: '' };
  wechatStore.clearError();
}

function openCreate() {
  resetForm();
  modalVisible.value = true;
}

function openEdit(account: WechatAccount) {
  resetForm();
  editingAccount.value = account;
  form.value = { appId: account.appId, appSecret: account.appSecret || '' };
  modalVisible.value = true;
}

function closeModal() {
  modalVisible.value = false;
  resetForm();
}

async function save() {
  if (!form.value.appId || !form.value.appSecret) return;
  const result = editingAccount.value
    ? await wechatStore.updateAccount(editingAccount.value.id, form.value.appId, form.value.appSecret)
    : await wechatStore.authenticateAndSaveAccount(form.value.appId, form.value.appSecret);
  if (!result) return;
  toastSuccess(editingAccount.value ? '账号更新成功！' : '鉴权成功！');
  closeModal();
}

async function switchAccount(accountId: string) {
  await wechatStore.setActiveAccount(accountId);
  toastSuccess('账号已切换');
}

async function toggleDefault(accountId: string) {
  const willCancel = wechatStore.accounts.find(account => account.id === accountId)?.isDefaultSync;
  await wechatStore.setDefaultSyncAccount(accountId);
  toastSuccess(willCancel ? '已取消默认同步' : '默认同步账号已设置');
}

async function remove(accountId: string) {
  if (!confirm('确定要删除这个账号吗？')) return;
  await wechatStore.deleteAccount(accountId);
  toastSuccess('账号已删除');
}

defineExpose({ openCreate });
onMounted(() => wechatStore.loadAccounts());
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
