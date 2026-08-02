import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { WechatAccount } from '../types';
import {
  dbGetAllWechatAccounts,
  dbGetActiveWechatAccount,
  dbGetDefaultSyncWechatAccount,
  dbSaveWechatAccount,
  dbSetActiveWechatAccount,
  dbSetDefaultSyncWechatAccount,
  dbDeleteWechatAccount,
  wechatAuthenticate,
} from '../api/wechat';

export const useWechatAccountStore = defineStore('wechatAccount', () => {
  const accounts = ref<WechatAccount[]>([]);
  const activeAccount = ref<WechatAccount | null>(null);
  const defaultSyncAccount = ref<WechatAccount | null>(null);
  const isLoading = ref(false);
  const isAuthenticating = ref(false);
  const lastAuthError = ref<string | null>(null);

  const hasAccounts = computed(() => accounts.value.length > 0);
  const hasActiveAccount = computed(() => activeAccount.value !== null);
  const hasDefaultSyncAccount = computed(() => defaultSyncAccount.value !== null);

  async function loadAccounts() {
    isLoading.value = true;
    lastAuthError.value = null;
    try {
      const [allAccounts, active, defaultSync] = await Promise.all([
        dbGetAllWechatAccounts(),
        dbGetActiveWechatAccount(),
        dbGetDefaultSyncWechatAccount(),
      ]);
      accounts.value = allAccounts;
      activeAccount.value = active;
      defaultSyncAccount.value = defaultSync;
    } catch (error) {
      console.error('加载微信账号失败:', error);
      lastAuthError.value = error instanceof Error ? error.message : '加载账号失败';
    } finally {
      isLoading.value = false;
    }
  }

  async function authenticateAndSaveAccount(appId: string, appSecret: string): Promise<WechatAccount | null> {
    isAuthenticating.value = true;
    lastAuthError.value = null;

    try {
      const authResult = await wechatAuthenticate(appId, appSecret);

      const existingAccount = accounts.value.find(a => a.appId === appId);
      const account: WechatAccount = {
        id: existingAccount?.id || crypto.randomUUID(),
        appId,
        appSecret,
        nickname: authResult.accountInfo.nickname || '未知公众号',
        headImg: authResult.accountInfo.headImg,
        accessToken: authResult.accessToken,
        tokenExpiresAt: Date.now() + authResult.expiresIn * 1000,
        isActive: true,
        isDefaultSync: existingAccount?.isDefaultSync || false,
      };

      const oldActive = accounts.value.find(a => a.isActive);
      if (oldActive) {
        oldActive.isActive = false;
      }
      if (existingAccount) {
        const index = accounts.value.findIndex(a => a.id === existingAccount.id);
        accounts.value[index] = account;
      } else {
        accounts.value.push(account);
      }
      activeAccount.value = account;

      await dbSaveWechatAccount(account);
      await dbSetActiveWechatAccount(account.id);

      return account;
    } catch (error) {
      const message = error instanceof Error ? error.message : '鉴权失败';
      lastAuthError.value = message;
      console.error('微信鉴权失败:', error);
      return null;
    } finally {
      isAuthenticating.value = false;
    }
  }

  async function setActiveAccount(accountId: string) {
    const account = accounts.value.find(a => a.id === accountId);
    if (!account) return;

    const oldActive = accounts.value.find(a => a.isActive && a.id !== accountId);
    if (oldActive) {
      oldActive.isActive = false;
    }
    account.isActive = true;
    activeAccount.value = account;

    await dbSetActiveWechatAccount(accountId);
  }

  async function deleteAccount(accountId: string) {
    accounts.value = accounts.value.filter(a => a.id !== accountId);
    if (activeAccount.value?.id === accountId) {
      activeAccount.value = null;
      if (accounts.value.length > 0) {
        await setActiveAccount(accounts.value[0].id);
      }
    }
    if (defaultSyncAccount.value?.id === accountId) {
      defaultSyncAccount.value = null;
      if (accounts.value.length > 0) {
        await setDefaultSyncAccount(accounts.value[0].id);
      }
    }

    await dbDeleteWechatAccount(accountId);
  }

  async function updateAccount(accountId: string, appId: string, appSecret: string): Promise<WechatAccount | null> {
    isAuthenticating.value = true;
    lastAuthError.value = null;

    try {
      const existingAccount = accounts.value.find(a => a.id === accountId);
      if (!existingAccount) {
        throw new Error('账号不存在');
      }

      const authResult = await wechatAuthenticate(appId, appSecret);

      const updatedAccount: WechatAccount = {
        ...existingAccount,
        appId,
        appSecret,
        nickname: authResult.accountInfo.nickname || existingAccount.nickname,
        headImg: authResult.accountInfo.headImg,
        accessToken: authResult.accessToken,
        tokenExpiresAt: Date.now() + authResult.expiresIn * 1000,
      };

      const index = accounts.value.findIndex(a => a.id === accountId);
      if (index !== -1) {
        accounts.value[index] = updatedAccount;
      }

      if (activeAccount.value?.id === accountId) {
        activeAccount.value = updatedAccount;
      }
      if (defaultSyncAccount.value?.id === accountId) {
        defaultSyncAccount.value = updatedAccount;
      }

      await dbSaveWechatAccount(updatedAccount);

      return updatedAccount;
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新失败';
      lastAuthError.value = message;
      console.error('更新微信账号失败:', error);
      return null;
    } finally {
      isAuthenticating.value = false;
    }
  }

  async function setDefaultSyncAccount(accountId: string) {
    const account = accounts.value.find(a => a.id === accountId);
    if (!account) return;

    // toggle 模式：如果该账号已是默认同步，则取消（允许全部取消）
    if (account.isDefaultSync) {
      // 仅当前默认账号需要取消
      account.isDefaultSync = false;
      defaultSyncAccount.value = null;
    } else {
      // 先取消旧默认账号，再置目标为 true
      const oldDefault = accounts.value.find(a => a.isDefaultSync && a.id !== accountId);
      if (oldDefault) {
        oldDefault.isDefaultSync = false;
      }
      account.isDefaultSync = true;
      defaultSyncAccount.value = account;
    }

    await dbSetDefaultSyncWechatAccount(accountId);
  }

  function clearError() {
    lastAuthError.value = null;
  }

  return {
    accounts,
    activeAccount,
    defaultSyncAccount,
    isLoading,
    isAuthenticating,
    lastAuthError,
    hasAccounts,
    hasActiveAccount,
    hasDefaultSyncAccount,
    loadAccounts,
    authenticateAndSaveAccount,
    updateAccount,
    setActiveAccount,
    setDefaultSyncAccount,
    deleteAccount,
    clearError,
  };
});
