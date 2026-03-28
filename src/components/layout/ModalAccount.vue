<template>
  <div
    class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity"
    :class="[visible ? 'opacity-100' : 'opacity-0 pointer-events-none']"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden transform transition-transform"
      :class="[visible ? 'scale-100' : 'scale-95']"
    >
      <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 class="font-bold text-slate-800">微信公众号接口网关绑定</h3>
        <button class="text-slate-400 hover:text-slate-600" @click="$emit('close')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="p-6 space-y-4">
        <div class="bg-green-50 border border-green-100 p-3 rounded-lg flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</div>
          <div>
            <div class="text-sm font-bold text-green-800">当前活跃账号：{{ activeAccount?.nickname || '壁纸情报局' }}</div>
            <div class="text-[10px] text-green-600">
              Token 校验正常，有效期剩余 {{ tokenExpiresIn }} 分钟
            </div>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">AppID</label>
          <input
            type="text"
            class="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 bg-slate-50 outline-none"
            v-model="form.appId"
            readonly
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">AppSecret (接口凭据)</label>
          <input
            type="password"
            class="w-full border border-slate-200 rounded-lg text-sm px-3 py-2 bg-slate-50 outline-none focus:border-primary focus:bg-white transition"
            v-model="form.appSecret"
            placeholder="输入新的AppSecret将重新鉴权"
          >
        </div>
      </div>
      <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button class="flex-1 px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded hover:bg-slate-100 transition" @click="handleReauth">
          请求重新鉴权
        </button>
        <button class="flex-1 px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover transition" @click="handleSave">
          保存并关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { WechatAccount } from '../../types';
import { ElMessage } from 'element-plus';

interface Props {
  visible: boolean;
  activeAccount?: WechatAccount | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['close', 'save', 'reauth']);

const form = ref({
  appId: 'wx1a2b3c4d5e6f7g8h',
  appSecret: '••••••••••••••••••••••••••••••••',
});

const tokenExpiresIn = ref(98);

function handleReauth() {
  ElMessage.info('正在请求重新鉴权...');
  emit('reauth');
}

function handleSave() {
  ElMessage.success('账号配置保存成功');
  emit('save');
  emit('close');
}
</script>
