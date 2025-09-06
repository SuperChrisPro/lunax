import http from '@ohos.net.http';

const API_BASE_URL = 'https://your-api-domain.com/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PeriodRecord {
  id?: number;
  date: string;
  flowLevel: 'light' | 'medium' | 'heavy';
  symptoms: string[];
  notes?: string;
}

interface PredictionData {
  nextPeriodStart: string;
  nextPeriodEnd: string;
  accuracy: number;
  algorithm: string;
  confidenceLevel: string;
  lastPeriodStart?: string;
  averageCycleLength?: number;
  cycleStd?: number;
}

interface User {
  id: string;
  phoneNumber: string;
  nickname: string;
  email?: string;
  birthDate?: string;
}

class ApiService {
  private token: string = '';

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    method: http.RequestMethod = http.RequestMethod.GET,
    data?: any
  ): Promise<T> {
    const httpRequest = http.createHttp();
    
    const options: any = {
      method,
      header: {
        'Content-Type': 'application/json',
      }
    };

    if (this.token) {
      options.header['Authorization'] = `Bearer ${this.token}`;
    }

    if (data) {
      options.extraData = data;
    }

    try {
      const response = await httpRequest.request(`${API_BASE_URL}${endpoint}`, options);
      
      if (response.responseCode === 200 || response.responseCode === 201) {
        const result = JSON.parse(response.result.toString());
        return result.data;
      } else {
        throw new Error(`HTTP ${response.responseCode}: ${response.result}`);
      }
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  // 认证相关
  async login(phoneNumber: string, password: string): Promise<{ token: string; user: User }> {
    return this.request('/auth/login', http.RequestMethod.POST, { phoneNumber, password });
  }

  async register(phoneNumber: string, password: string, nickname: string): Promise<User> {
    return this.request('/auth/register', http.RequestMethod.POST, { phoneNumber, password, nickname });
  }

  // 生理期记录相关
  async getPeriodRecords(limit: number = 50): Promise<PeriodRecord[]> {
    return this.request(`/periods?limit=${limit}`);
  }

  async createPeriodRecord(record: PeriodRecord): Promise<PeriodRecord> {
    return this.request('/periods', http.RequestMethod.POST, record);
  }

  async updatePeriodRecord(id: number, record: Partial<PeriodRecord>): Promise<void> {
    return this.request(`/periods/${id}`, http.RequestMethod.PUT, record);
  }

  async deletePeriodRecord(id: number): Promise<void> {
    return this.request(`/periods/${id}`, http.RequestMethod.DELETE);
  }

  // 预测相关
  async getPrediction(): Promise<PredictionData> {
    return this.request('/predictions');
  }

  async getPredictionHistory(limit: number = 30): Promise<any[]> {
    return this.request(`/predictions/history?limit=${limit}`);
  }

  // 用户相关
  async getUserProfile(): Promise<User> {
    return this.request('/users/profile');
  }

  async updateUserProfile(data: Partial<User>): Promise<void> {
    return this.request('/users/profile', http.RequestMethod.PUT, data);
  }

  async getDashboard(): Promise<any> {
    return this.request('/users/dashboard');
  }
}

export const apiService = new ApiService();