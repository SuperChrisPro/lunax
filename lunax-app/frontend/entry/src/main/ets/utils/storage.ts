import dataStorage from '@ohos.data.storage';

const STORAGE_FILE = 'lunax_storage';

interface StorageData {
  token?: string;
  user?: any;
  settings?: any;
}

class StorageService {
  private storage: any = null;

  async initStorage() {
    try {
      this.storage = await dataStorage.getStorage(`/${STORAGE_FILE}`);
    } catch (error) {
      console.error('初始化存储失败:', error);
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    if (!this.storage) await this.initStorage();
    return this.storage.put(key, JSON.stringify(value));
  }

  async getItem(key: string): Promise<any> {
    if (!this.storage) await this.initStorage();
    try {
      const value = await this.storage.get(key, null);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.storage) await this.initStorage();
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    if (!this.storage) await this.initStorage();
    return this.storage.clear();
  }

  // 用户相关存储
  async setToken(token: string): Promise<void> {
    return this.setItem('token', token);
  }

  async getToken(): Promise<string | null> {
    return this.getItem('token');
  }

  async setUser(user: any): Promise<void> {
    return this.setItem('user', user);
  }

  async getUser(): Promise<any> {
    return this.getItem('user');
  }

  async clearAuth(): Promise<void> {
    await this.removeItem('token');
    await this.removeItem('user');
  }

  // 设置相关存储
  async setSettings(settings: any): Promise<void> {
    return this.setItem('settings', settings);
  }

  async getSettings(): Promise<any> {
    return this.getItem('settings');
  }
}

export const storageService = new StorageService();