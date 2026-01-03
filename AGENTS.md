# AGENTS.md

此文件用于指导 AI 代理（Coding Agents）了解 LunaX (月汐) 项目的上下文、开发环境设置及编码规范。

## 项目概述
LunaX 是一个基于 HarmonyOS 的智能生理期追踪应用，包含 ArkTS 前端和 Node.js 后端。
**注意：本项目数据库已统一迁移至 PostgreSQL，所有代码已完全适配 PostgreSQL 语法。**

## 目录结构
- **backend/**: Node.js (Express) 后端服务代码
  - **config/**: 数据库配置 (`database.js`)
  - **middleware/**: 中间件 (`auth.js` - JWT 认证)
  - **routes/**: API 路由
    - `auth.js` - 认证相关（注册、登录、验证）
    - `periods.js` - 生理期记录管理
    - `predictions.js` - 预测功能
    - `users.js` - 用户信息管理
  - **services/**: 业务逻辑服务
    - `predictionService.js` - 生理期预测算法服务
  - **tests/**: 测试文件（Jest）
  - `server.js` - Express 服务器入口
  - `jest.config.js` - Jest 测试配置
  - `package.json` - 项目依赖配置
- **lunax-app/frontend/**: HarmonyOS (ArkTS) 前端应用代码
- **database/**: 数据库初始化脚本 (`schema.sql` - PostgreSQL 语法)
- **deploy.sh**: 部署脚本

## 开发环境提示 (Dev environment tips)

### 后端 (Backend)

#### 环境设置
- **路径**: `./backend`
- **Node.js 版本**: >= 16.0.0
- **设置步骤**:
  1. 进入后端目录: `cd backend`
  2. 安装依赖: `npm install` (确保包含 `pg` 驱动)
  3. 配置环境变量: 创建 `.env` 文件
     ```env
     # 数据库配置（必需）
     DB_HOST=localhost
     DB_PORT=5432
     DB_USER=postgres
     DB_PASS=your_password
     DB_NAME=lunax_db
     
     # JWT 配置（必需）
     JWT_SECRET=your_jwt_secret_key_here
     JWT_EXPIRES_IN=7d
     
     # 服务器配置
     PORT=3000
     NODE_ENV=development
     ```

#### 运行服务器
- **启动**: `npm run start` 或 `npm run dev` (开发模式，使用 nodemon)
- **健康检查**: 服务器启动后访问 `http://localhost:3000/health`

#### 数据库 (PostgreSQL)

**驱动**: 使用 `pg` (node-postgres) 版本 ^8.11.3

**连接配置**:
- 连接池最大连接数: 20
- 空闲超时: 30秒
- 连接超时: 2秒
- 连接池在 `backend/config/database.js` 中配置

**初始化数据库**:
```bash
# 使用 psql 导入 Schema
psql -h <host> -U <user> -d <db_name> -f database/schema.sql
```

**SQL 语法规范** (PostgreSQL):
- ✅ 使用 `BIGSERIAL`/`SERIAL` 替代 `AUTO_INCREMENT`
- ✅ 使用 `CHECK` 约束替代 `ENUM` 类型
- ✅ 使用触发器实现 `ON UPDATE CURRENT_TIMESTAMP`
- ✅ 使用 `json_build_object()` 替代 `JSON_OBJECT()`
- ✅ 参数占位符使用 `$1, $2, $3...` 而非 `?`
- ✅ 使用双引号 `"` 处理字段名大小写，而非反引号 `` ` ``
- ✅ 查询结果使用 `result.rows` 访问数据
- ✅ 使用 `RETURNING` 子句获取插入后的 ID: `INSERT ... RETURNING id`
- ✅ 使用 `result.rowCount` 获取受影响行数
- ✅ 日期函数: `CURRENT_DATE`, `CURRENT_TIMESTAMP`, `EXTRACT(DAY FROM ...)`
- ✅ 日期运算: `CURRENT_DATE - INTERVAL '30 days'`

**数据库查询示例**:
```javascript
// ✅ 正确 - PostgreSQL 语法
const result = await pool.query(
  'SELECT * FROM users WHERE id = $1 AND is_active = $2',
  [userId, true]
);
const user = result.rows[0];

// ✅ 插入并返回 ID
const insertResult = await pool.query(
  'INSERT INTO users (name) VALUES ($1) RETURNING id',
  ['John']
);
const newId = insertResult.rows[0].id;

// ❌ 错误 - MySQL 语法（不要使用）
const [result] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

**数据库表结构**:
- `users` - 用户表
- `period_records` - 生理期记录表
- `user_cycle_stats` - 用户周期统计表
- `predictions` - 预测记录表
- `user_privacy` - 用户隐私设置表
- `algorithm_config` - 算法参数配置表
- `data_cleanup_log` - 数据清理任务日志表

### 前端 (Frontend)
- **路径**: `./lunax-app/frontend`
- **技术栈**: HarmonyOS SDK, ArkTS, ArkUI
- **注意**: 前端构建依赖 DevEco Studio。生成代码时请严格遵循 ArkTS 静态类型规则。

## API 路由结构

### 认证路由 (`/api/auth`)
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/verify` - 验证 JWT token

### 生理期记录路由 (`/api/periods`)
- `GET /api/periods` - 获取生理期记录列表（需认证）
- `POST /api/periods` - 创建生理期记录（需认证）
- `PUT /api/periods/:id` - 更新生理期记录（需认证）
- `DELETE /api/periods/:id` - 删除生理期记录（需认证）
- `GET /api/periods/stats` - 获取周期统计（需认证）

### 预测路由 (`/api/predictions`)
- `GET /api/predictions` - 获取预测结果（需认证）
- `GET /api/predictions/history` - 获取历史预测（需认证）
- `POST /api/predictions/update-stats` - 更新周期统计（需认证）

### 用户路由 (`/api/users`)
- `GET /api/users/profile` - 获取用户信息（需认证）
- `PUT /api/users/profile` - 更新用户信息（需认证）
- `PUT /api/users/privacy` - 更新隐私设置（需认证）
- `GET /api/users/dashboard` - 获取用户统计概览（需认证）

## 测试指南 (Testing instructions)

### 后端测试

**测试框架**: Jest

**运行测试**:
```bash
cd backend
npm test
```

**测试配置**:
- 配置文件: `backend/jest.config.js`
- 测试文件位置: `backend/tests/*.test.js`
- 测试超时: 10秒

**测试文件**:
- `tests/database.test.js` - 数据库连接和基本功能测试
- `tests/routes.test.js` - API 路由集成测试

**测试注意事项**:
- 在编写测试 Mock 数据或集成测试时，请确保模拟的是 PostgreSQL 的行为
- 日期时间格式返回 ISO 字符串
- 查询结果使用 `result.rows` 数组格式
- 测试环境需要设置 `NODE_ENV=test` 以避免服务器自动启动

**测试数据库连接**:
```bash
# 运行数据库连接测试脚本
node backend/test-db-connection.js
```

### 前端测试
- 遵循项目规范，保持单元测试覆盖率 ≥ 80%

## 代码规范与 PR 指南 (PR instructions)

### 语言规范
- **前端**: **ArkTS**
- **后端**: **JavaScript/TypeScript**

### 提交信息格式
- 格式: `type(scope): description`
- 示例: `feat(auth): 添加用户注册功能`

### PR 检查清单
1. ✅ 确保 `package.json` 中已移除 `mysql`/`mysql2` 依赖，并添加 `pg`
2. ✅ 确保所有 SQL 查询已适配 PostgreSQL 语法
   - 参数占位符使用 `$1, $2...`
   - 查询结果使用 `result.rows`
   - 使用 `RETURNING` 子句获取插入 ID
   - 使用 `result.rowCount` 获取受影响行数
3. ✅ API 文档已更新
4. ✅ 测试通过 (`npm test`)
5. ✅ 代码通过 lint 检查 (`npm run lint`)
6. ✅ 环境变量配置已更新（如有新增）

### 代码风格
- 使用 ES6+ 语法
- 异步操作使用 `async/await`
- 错误处理使用 try-catch
- 使用 Joi 进行数据验证
- 使用 bcryptjs 进行密码加密
- 使用 jsonwebtoken 进行身份认证

## 关键业务逻辑上下文

### 生理期预测算法
- **基础算法**: 平均周期 ± 标准差
  - 数据点 < 3: 使用默认预测（28天周期）
  - 数据点 >= 3: 使用基础算法
  - 数据点 >= 50: 可启用机器学习（规划中）
- **预测准确率计算**: 基于周期数量和标准差动态调整
- **置信度级别**: high (≥90%), medium (≥80%), low (<80%)

### 用户周期统计
- 自动计算平均周期长度和标准差
- 自动计算平均经期长度和标准差
- 数据充足性评估: low (<10), medium (10-49), high (≥50)

### 安全与隐私
- 敏感数据需通过 JWT 验证
- 密码使用 bcryptjs 加密存储
- 使用 helmet 和 express-rate-limit 增强安全性
- 支持用户隐私设置（数据分析、机器学习训练等）

### 数据库特性
- 使用触发器自动更新 `updated_at` 字段
- 使用视图 (`user_prediction_summary`) 简化查询
- 使用存储函数 (`update_user_cycle_stats`) 更新统计信息
- 支持 JSONB 类型存储复杂数据结构

## 常见问题

### 数据库连接失败
- 检查 `.env` 文件中的数据库配置
- 确认 PostgreSQL 服务正在运行
- 检查防火墙和网络连接
- 运行 `node backend/test-db-connection.js` 进行诊断

### SQL 语法错误
- 确保使用 PostgreSQL 语法，而非 MySQL
- 检查参数占位符是否正确使用 `$1, $2...`
- 确认字段名大小写处理（使用双引号）

### 测试失败
- 确认测试环境变量已正确配置
- 检查测试数据库连接
- 确认测试数据清理逻辑正确
