import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { WechatAccount } from '../types';
import {
  dbGetAllWechatAccounts,
  dbGetActiveWechatAccount,
  dbSaveWechatAccount,
  dbSetActiveWechatAccount,
  dbDeleteWechatAccount,
  wechatAuthenticate,
} from '../api/wechat';

export const useWechatAccountStore = defineStore('wechatAccount', () => {
  const accounts = ref<WechatAccount[]>([]);
  const activeAccount = ref<WechatAccount | null>(null);
  const isLoading = ref(false);
  const isAuthenticating = ref(false);
  const lastAuthError = ref<string | null>(null);

  const hasAccounts = computed(() => accounts.value.length > 0);
  const hasActiveAccount = computed(() => activeAccount.value !== null);

  async function loadAccounts() {
    isLoading.value = true;
    lastAuthError.value = null;
    try {
      const [allAccounts, active] = await Promise.all([
        dbGetAllWechatAccounts(),
        dbGetActiveWechatAccount(),
      ]);
      accounts.value = allAccounts;
      activeAccount.value = active;
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
        nickname: authResult.accountInfo.nickname || '未知公众号',
        headImg: authResult.accountInfo.headImg,
        accessToken: authResult.accessToken,
        tokenExpiresAt: Date.now() + authResult.expiresIn * 1000,
        isActive: true,
      };

      accounts.value.forEach(a => a.isActive = false);
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

    accounts.value.forEach(a => a.isActive = a.id === accountId);
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

    await dbDeleteWechatAccount(accountId);
  }

  function clearError() {
    lastAuthError.value = null;
  }

  return {
    accounts,
    activeAccount,
    isLoading,
    isAuthenticating,
    lastAuthError,
    hasAccounts,
    hasActiveAccount,
    loadAccounts,
    authenticateAndSaveAccount,
    setActiveAccount,
    deleteAccount,
    clearError,
  };
});
