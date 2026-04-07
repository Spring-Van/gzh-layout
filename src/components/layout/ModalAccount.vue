<template>
  <div
    class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity"
    :class="[visible ? 'opacity-100' : 'opacity-0 pointer-events-none']"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden transform transition-transform"
      :class="[visible ? 'scale-100' : 'scale-95']"
    >
      <div
        class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"
      >
        <h3 class="font-bold text-slate-800">微信公众号接口网关绑定</h3>
        <button
          class="text-slate-400 hover:text-slate-600"
          @click="$emit('close')"
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
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
      <div class="p-6 space-y-5">
        <div v-if="accountStore.hasActiveAccount" class="bg-green-50 border border-green-100 p-4 rounded-xl">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
              {{ accountStore.activeAccount?.nickname?.charAt(0) || '微' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-green-800 truncate">{{ accountStore.activeAccount?.nickname }}</div>
              <div class="text-[10px] text-green-600 font-medium">
                {{ accountStore.activeAccount?.appId }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs font-medium text-green-700">活跃账号</div>
              <div class="text-[10px] text-green-600">
                Token 有效期: {{ tokenExpiresInText }}
              </div>
            </div>
          </div>
        </div>

        <div v-else class="bg-amber-50 border border-amber-100 p-4 rounded-xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white flex-shrink-0">
              !
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-amber-800">暂未绑定公众号</div>
              <div class="text-[10px] text-amber-600">
                请填写 AppID 和 AppSecret 完成鉴权
              </div>
            </div>
          </div>
        </div>

        <div v-if="accountStore.hasAccounts && accountStore.accounts.length > 1" class="space-y-2">
          <label class="block text-xs font-medium text-slate-500">已绑定账号</label>
          <div class="space-y-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2">
            <div
              v-for="account in accountStore.accounts"
              :key="account.id"
              class="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all"
              :class="[
                account.isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
              ]"
              @click="switchAccount(account.id)"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  :class="account.isActive ? 'bg-blue-500' : 'bg-slate-400'"
                >
                  {{ account.nickname?.charAt(0) || '微' }}
                </div>
                <div>
                  <div class="text-sm font-medium text-slate-700">{{ account.nickname }}</div>
                  <div class="text-[10px] text-slate-400">{{ account.appId }}</div>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <span
                  v-if="account.isActive"
                  class="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded"
                >
                  当前
                </span>
                <button
                  class="text-red-400 hover:text-red-600 p-1"
                  @click.stop="deleteAccount(account.id)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100">
          <div class="mb-4">
            <label class="block text-xs font-medium text-slate-500 mb-1.5">AppID</label>
            <input
              type="text"
              class="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 bg-slate-50 outline-none focus:border-primary focus:bg-white transition"
              v-model="form.appId"
              placeholder="微信公众号 AppID"
            />
          </div>
          <div class="mb-4">
            <label class="block text-xs font-medium text-slate-500 mb-1.5">AppSecret (接口凭据)</label>
            <input
              type="password"
              class="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 bg-slate-50 outline-none focus:border-primary focus:bg-white transition"
              v-model="form.appSecret"
              placeholder="输入 AppSecret"
            />
          </div>

          <div v-if="accountStore.lastAuthError" class="mb-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg p-3">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <div class="font-medium">鉴权失败</div>
                <div class="text-xs mt-0.5">{{ accountStore.lastAuthError }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button
          class="flex-1 px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded hover:bg-slate-100 transition"
          @click="$emit('close')"
        >
          关闭
        </button>
        <button
          class="flex-1 px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover transition flex items-center justify-center gap-2"
          :disabled="accountStore.isAuthenticating || !form.appId || !form.appSecret"
          @click="handleAuthenticate"
        >
          <svg
            v-if="accountStore.isAuthenticating"
            class="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ accountStore.isAuthenticating ? '鉴权中...' : '请求鉴权' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useWechatAccountStore } from '../../stores/wechatAccount';
import { useToast } from '../../hooks/useToast';

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['close']);

const accountStore = useWechatAccountStore();
const { success } = useToast();

const form = ref({
  appId: '',
  appSecret: '',
});

const tokenExpiresInText = computed(() => {
  if (!accountStore.activeAccount?.tokenExpiresAt) return '未知';
  const remaining = Math.max(0, Math.floor((accountStore.activeAccount.tokenExpiresAt - Date.now()) / 1000 / 60));
  if (remaining > 60) {
    return `${Math.floor(remaining / 60)}小时`;
  }
  return `${remaining}分钟`;
});

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await accountStore.loadAccounts();
    if (accountStore.activeAccount) {
      form.value.appId = accountStore.activeAccount.appId;
      form.value.appSecret = '';
    }
    accountStore.clearError();
  }
});

async function handleAuthenticate() {
  if (!form.value.appId || !form.value.appSecret) return;

  const result = await accountStore.authenticateAndSaveAccount(form.value.appId, form.value.appSecret);
  if (result) {
    success('鉴权成功！');
    form.value.appSecret = '';
  }
}

async function switchAccount(accountId: string) {
  await accountStore.setActiveAccount(accountId);
  success('账号已切换');
}

async function deleteAccount(accountId: string) {
  if (!confirm('确定要删除这个账号吗？')) return;
  await accountStore.deleteAccount(accountId);
  success('账号已删除');
}
</script>
