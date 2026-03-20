/**
 * Chaves iguais ao nfl-blog-brasil-v2 para compartilhar configuração no mesmo navegador.
 */
const STORAGE_ACCOUNT_ID = 'instagram_account_id';
const STORAGE_ACCESS_TOKEN = 'instagram_access_token';

export interface InstagramConfig {
  accountId: string;
  accessToken: string;
}

export function getInstagramConfig(): InstagramConfig {
  if (typeof window === 'undefined') {
    return { accountId: '', accessToken: '' };
  }
  return {
    accountId: localStorage.getItem(STORAGE_ACCOUNT_ID) ?? '',
    accessToken: localStorage.getItem(STORAGE_ACCESS_TOKEN) ?? '',
  };
}

export function saveInstagramConfig(config: Partial<InstagramConfig>): void {
  if (typeof window === 'undefined') return;
  if (config.accountId !== undefined) {
    localStorage.setItem(STORAGE_ACCOUNT_ID, config.accountId);
  }
  if (config.accessToken !== undefined) {
    localStorage.setItem(STORAGE_ACCESS_TOKEN, config.accessToken);
  }
}

export function clearInstagramConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_ACCOUNT_ID);
  localStorage.removeItem(STORAGE_ACCESS_TOKEN);
}

export function hasInstagramConfig(): boolean {
  const { accountId, accessToken } = getInstagramConfig();
  return Boolean(accountId?.trim() && accessToken?.trim());
}
