<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const activeTab = ref('account');
const autoBackupEnabled = ref(true);
const keepBackupDays = ref(30);

const wechatAccounts = [
  {
    id: '1',
    appId: 'wx1234567890abcdef',
    nickname: '我的公众号',
    headImg: '',
    isActive: true,
  },
];

const navigateTo = (view: string) => {
  const routeMap: Record<string, string> = {
    project: '/project',
    templates: '/templates',
    history: '/history',
    settings: '/settings',
  };
  router.push(routeMap[view] || '/project');
};
</script>

<template>
  <div class="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
    <!-- 侧边栏 -->
    <aside class="w-64 bg-slate-900 flex flex-col p-6 shrink-0">
      <div class="flex items-center gap-3 mb-10 px-2">
        <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          ⚡
        </div>
        <h1 class="text-xl font-bold text-white tracking-tight">闪电排版</h1>
      </div>

      <nav class="flex-1 space-y-2">
        <button
          @click="navigateTo('project')"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <span class="text-lg">📁</span>
          <span class="font-medium">项目处理</span>
        </button>
        <button
          @click="navigateTo('templates')"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <span class="text-lg">📄</span>
          <span class="font-medium">自定义模板库</span>
        </button>
        <button
          @click="navigateTo('history')"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <span class="text-lg">📜</span>
          <span class="font-medium">历史记录</span>
        </button>
        <button
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 bg-blue-600 text-white shadow-lg shadow-blue-500/30"
        >
          <span class="text-lg">⚙️</span>
          <span class="font-medium">账号设置</span>
        </button>
      </nav>

      <div class="mt-auto pt-6 border-t border-slate-800">
        <div class="bg-slate-800/50 rounded-2xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-slate-400 font-medium">系统状态</span>
            <div class="flex items-center gap-1.5">
              <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span class="text-[10px] text-green-500 font-bold uppercase">Online</span>
            </div>
          </div>
          <div class="flex items-center gap-3 text-slate-300">
            <span class="text-blue-500">📊</span>
            <span class="text-xs">API 链路正常</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col min-w-0">
      <header class="h-20 bg-white border-b border-slate-200 flex items-center px-8 sticky top-0 z-10">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">设置</h1>
        </div>
      </header>

      <div class="flex-1 flex">
        <!-- 设置侧边栏 -->
        <div class="w-56 border-r border-slate-200 p-4 shrink-0 bg-white">
          <nav class="space-y-1">
            <button
              v-for="tab in [
                { id: 'account', name: '公众号账号', icon: '🔗' },
                { id: 'backup', name: '备份设置', icon: '💾' },
                { id: 'template', name: '默认模板', icon: '📄' },
                { id: 'ai', name: 'AI 设置', icon: '🤖' },
                { id: 'about', name: '关于', icon: 'ℹ️' },
              ]"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all',
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              ]"
            >
              <span class="text-lg">{{ tab.icon }}</span>
              <span class="text-sm font-medium">{{ tab.name }}</span>
            </button>
          </nav>
        </div>

        <!-- 设置内容区 -->
        <div class="flex-1 p-8 overflow-auto bg-slate-50">
          <!-- 公众号账号 -->
          <div v-if="activeTab === 'account'" class="max-w-xl">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">公众号账号</h2>

            <div class="space-y-4">
              <div
                v-for="account in wechatAccounts"
                :key="account.id"
                class="bg-white border border-slate-200 rounded-2xl p-5"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xl">
                      微
                    </div>
                    <div>
                      <div class="font-semibold text-slate-800">{{ account.nickname }}</div>
                      <div class="text-sm text-slate-500 font-mono">{{ account.appId }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span
                      v-if="account.isActive"
                      class="flex items-center gap-2 text-emerald-600 text-sm"
                    >
                      <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                      已授权
                    </span>
                    <button class="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                      移除
                    </button>
                  </div>
                </div>
              </div>

              <button class="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
                添加公众号
              </button>
            </div>
          </div>

          <!-- 备份设置 -->
          <div v-else-if="activeTab === 'backup'" class="max-w-xl">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">备份设置</h2>

            <div class="space-y-6">
              <div class="bg-white border border-slate-200 rounded-2xl p-5">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <div class="font-medium text-slate-800">自动备份</div>
                    <div class="text-sm text-slate-500">选择素材后自动备份</div>
                  </div>
                  <div
                    @click="autoBackupEnabled = !autoBackupEnabled"
                    :class="[
                      'w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer',
                      autoBackupEnabled ? 'bg-blue-500' : 'bg-slate-300'
                    ]"
                  >
                    <div
                      :class="[
                        'absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200',
                        autoBackupEnabled ? 'left-6' : 'left-1'
                      ]"
                    />
                  </div>
                </div>
              </div>

              <div class="bg-white border border-slate-200 rounded-2xl p-5">
                <div class="mb-4">
                  <div class="font-medium text-slate-800 mb-2">备份路径</div>
                  <div class="text-sm text-slate-500 mb-3">选择备份文件存储位置</div>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      placeholder="D:\gzh-layout\backups"
                      readonly
                      class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600"
                    />
                    <button class="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm transition-colors">
                      浏览
                    </button>
                  </div>
                </div>
              </div>

              <div class="bg-white border border-slate-200 rounded-2xl p-5">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <div class="font-medium text-slate-800">保留备份</div>
                    <div class="text-sm text-slate-500">自动删除旧备份</div>
                  </div>
                </div>
                <select
                  v-model="keepBackupDays"
                  class="w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option :value="7">保留 7 天</option>
                  <option :value="30">保留 30 天</option>
                  <option :value="90">保留 90 天</option>
                  <option :value="0">永久保留</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 其他设置页面 -->
          <div v-else>
            <h2 class="text-2xl font-bold text-slate-800 mb-6">
              {{ activeTab === 'template' ? '默认模板' : activeTab === 'ai' ? 'AI 设置' : '关于' }}
            </h2>
            <div class="text-slate-500">开发中...</div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
