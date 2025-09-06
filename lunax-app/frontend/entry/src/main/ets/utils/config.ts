export const config = {
  API_BASE_URL: 'https://lunax-api.aliyun.com/api',
  API_TIMEOUT: 30000,
  
  // 阿里云OSS配置
  OSS: {
    BUCKET: 'lunax-assets',
    REGION: 'oss-cn-hangzhou',
    ACCESS_KEY_ID: 'your-access-key-id',
    ACCESS_KEY_SECRET: 'your-access-key-secret'
  },
  
  // 预测算法配置
  PREDICTION: {
    MIN_CYCLES: 3,
    ML_THRESHOLD: 50,
    PREDICTION_RANGE_DAYS: 5,
    DEFAULT_CYCLE_LENGTH: 28,
    DEFAULT_PERIOD_LENGTH: 5
  },
  
  // 本地存储键名
  STORAGE_KEYS: {
    TOKEN: 'lunax_token',
    USER: 'lunax_user',
    SETTINGS: 'lunax_settings',
    FIRST_LAUNCH: 'lunax_first_launch'
  },
  
  // 页面路由
  ROUTES: {
    LOGIN: 'pages/Login',
    REGISTER: 'pages/Register',
    INDEX: 'pages/Index',
    RECORD_PERIOD: 'pages/RecordPeriod',
    HISTORY: 'pages/History',
    SETTINGS: 'pages/Settings',
    DASHBOARD: 'pages/Dashboard'
  }
};