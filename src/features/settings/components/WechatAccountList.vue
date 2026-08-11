<template>
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
    <article
      v-for="account in accounts"
      :key="account.id"
      class="bg-surface border rounded-lg p-4 hover:bg-elevated hover:border-border-default hover:shadow-lg hover:shadow-cyan-500/5 transition-[background-color,border-color,box-shadow] duration-300 flex flex-col"
      :class="account.isActive ? 'border-accent/40 bg-accent/5' : 'border-border-subtle'"
    >
      <div class="flex items-start justify-between mb-3">
        <button
          class="flex items-center gap-2 min-w-0 text-left"
          title="切换到此账号"
          @click="$emit('switch-account', account.id)"
        >
          <span
            class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            :class="account.isActive ? 'bg-accent' : 'bg-text-muted'"
          >
            <img
              v-if="account.headImg"
              :src="account.headImg"
              :alt="`${account.nickname} 头像`"
              class="w-full h-full object-cover"
            />
            <span v-else>{{ account.nickname?.charAt(0) || '微' }}</span>
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-semibold text-text-primary truncate">{{ account.nickname }}</span>
            <span class="flex items-center gap-1 mt-0.5">
              <span v-if="account.isActive" class="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded">当前</span>
              <span v-if="account.isDefaultSync" class="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">默认同步</span>
            </span>
          </span>
        </button>
        <div class="flex items-center gap-1 shrink-0">
          <button
            class="w-7 h-7 inline-flex items-center justify-center text-text-secondary hover:text-accent transition-colors"
            title="编辑账号"
            @click="$emit('edit', account)"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <button
            class="w-7 h-7 inline-flex items-center justify-center text-text-secondary hover:text-red-400 transition-colors"
            title="删除账号"
            @click="$emit('delete', account.id)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <dl class="flex-1 space-y-2">
        <div>
          <dt class="text-[11px] text-text-secondary mb-0.5">AppID</dt>
          <dd class="text-xs text-text-secondary truncate" :title="account.appId">{{ account.appId }}</dd>
        </div>
        <div>
          <dt class="text-[11px] text-text-secondary mb-0.5">Token 有效期</dt>
          <dd class="text-xs text-text-secondary">{{ tokenExpiresInText(account) }}</dd>
        </div>
      </dl>

      <div class="pt-3 mt-3 border-t border-border-subtle">
        <button
          class="w-full px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          :class="account.isDefaultSync
            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
            : 'border-border-subtle text-text-secondary hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/10'"
          @click="$emit('toggle-default', account.id)"
        >
          {{ account.isDefaultSync ? '已设为默认同步' : '设为默认同步' }}
        </button>
      </div>
    </article>

    <div
      v-if="accounts.length === 0"
      class="col-span-full text-center text-text-muted text-sm py-12 bg-surface border border-border-subtle rounded-lg"
    >
      暂无公众号账号，点击右上角添加
    </div>
  </div>
</template>

<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next';
import type { WechatAccount } from '@/types';

defineProps<{ accounts: WechatAccount[] }>();
defineEmits<{
  edit: [account: WechatAccount];
  delete: [accountId: string];
  'switch-account': [accountId: string];
  'toggle-default': [accountId: string];
}>();

function tokenExpiresInText(account: WechatAccount): string {
  if (!account.tokenExpiresAt) return '未知';
  const remainingMinutes = Math.max(0, Math.floor((account.tokenExpiresAt - Date.now()) / 60_000));
  if (remainingMinutes > 60) return `${Math.floor(remainingMinutes / 60)}小时`;
  return `${remainingMinutes}分钟`;
}
</script>
