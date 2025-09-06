import { apiService } from './api';
import { storageService } from './storage';
import router from '@ohos.router';
import promptAction from '@ohos.promptAction';

class AuthService {
  private isAuthenticated: boolean = false;

  async login(phoneNumber: string, password: string): Promise<boolean> {
    try {
      const result = await apiService.login(phoneNumber, password);
      
      await storageService.setToken(result.token);
      await storageService.setUser(result.user);
      
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.error('登录失败:', error);
      promptAction.showToast({ message: '登录失败，请重试' });
      return false;
    }
  }

  async register(phoneNumber: string, password: string, nickname: string): Promise<boolean> {
    try {
      const user = await apiService.register(phoneNumber, password, nickname);
      
      // 注册成功后自动登录
      return await this.login(phoneNumber, password);
    } catch (error) {
      console.error('注册失败:', error);
      promptAction.showToast({ message: '注册失败，请重试' });
      return false;
    }
  }

  async logout(): Promise<void> {
    await storageService.clearAuth();
    this.isAuthenticated = false;
    router.replaceUrl({ url: 'pages/Login' });
  }

  async checkAuth(): Promise<boolean> {
    try {
      const token = await storageService.getToken();
      if (!token) {
        return false;
      }

      // 验证token有效性
      const user = await storageService.getUser();
      this.isAuthenticated = !!user;
      return this.isAuthenticated;
    } catch (error) {
      console.error('验证登录状态失败:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<any> {
    return await storageService.getUser();
  }

  async getToken(): Promise<string | null> {
    return await storageService.getToken();
  }

  redirectToLogin() {
    router.replaceUrl({ url: 'pages/Login' });
  }
}

export const authService = new AuthService();