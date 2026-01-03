const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const periodRoutes = require('./routes/periods');
const predictionRoutes = require('./routes/predictions');
const userRoutes = require('./routes/users');

const app = express();

// 安全中间件
app.use(helmet());
app.use(compression());

// CORS配置
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-app-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
};
app.use(cors(corsOptions));

// 限流配置
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP每15分钟最多100个请求
  message: '请求过于频繁，请稍后再试'
});
app.use(limiter);

// 请求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/users', userRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后再试'
  });
});

const PORT = process.env.PORT || 3000;

// 初始化数据库连接并启动服务器（仅在非测试环境）
if (process.env.NODE_ENV !== 'test') {
  testConnection().then(connected => {
    if (connected) {
      app.listen(PORT, () => {
        console.log(`LunaX后端服务器运行在端口 ${PORT}`);
        console.log(`环境: ${process.env.NODE_ENV}`);
      });
    } else {
      console.error('数据库连接失败，服务器无法启动');
      process.exit(1);
    }
  });
}

module.exports = app;