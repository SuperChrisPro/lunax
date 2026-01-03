# AGENTS.md

此文件用于指导 AI 代理（Coding Agents）了解 LunaX (月汐) 项目的上下文、开发环境设置及编码规范。

## 项目概述
LunaX 是一个基于 HarmonyOS 的智能生理期追踪应用，包含 ArkTS 前端和 Node.js 后端。
**注意：本项目数据库已统一迁移至 PostgreSQL。**

## 目录结构
- **backend/**: Node.js (Express) 后端服务代码。
- **lunax-app/frontend/**: HarmonyOS (ArkTS) 前端应用代码。
- **database/**: 数据库初始化脚本 (`schema.sql`)。
- **deploy.sh**: 部署脚本。

## 开发环境提示 (Dev environment tips)

### 后端 (Backend)
- **路径**: `./backend`
- **设置**:
  1. 进入后端目录: `cd backend`
  2. 安装依赖: `npm install` (确保包含 `pg` 驱动)
  3. 配置环境变量: `cp .env.example .env`
     - 必须配置: `DB_HOST`, `DB_PORT` (默认 5432), `DB_USER`, `DB_PASS`, `DB_NAME`。
- **运行**: 使用 `npm run start` 启动服务器。
- **数据库 (PostgreSQL)**:
  - **驱动**: 使用 `pg` (node-postgres) 或相应的 ORM 适配器。
  - **初始化**:
    - 使用 psql 导入 Schema: `psql -h <host> -U <user> -d <db_name> -f ../database/schema.sql`
  - **SQL 方言**:
    - 编写 SQL 时请使用 PostgreSQL 标准语法 (例如: 使用 `SERIAL` 或 `GENERATED ALWAYS AS IDENTITY` 替代 `AUTO_INCREMENT`; 使用双引号 `"` 处理字段名大小写，而非反引号 `` ` ``)。

### 前端 (Frontend)
- **路径**: `./lunax-app/frontend`
- **技术栈**: HarmonyOS SDK, ArkTS, ArkUI。
- **注意**: 前端构建依赖 DevEco Studio。生成代码时请严格遵循 ArkTS 静态类型规则。

## 测试指南 (Testing instructions)

- **后端测试**:
  - 运行 `npm test`。
  - **重要**: 在编写测试 Mock 数据或集成测试时，请确保模拟的是 PostgreSQL 的行为（例如日期时间格式返回 ISO 字符串）。
- **前端测试**:
  - 遵循项目规范，保持单元测试覆盖率 ≥ 80%。

## 代码规范与 PR 指南 (PR instructions)

- **语言规范**:
  - 前端: **ArkTS**
  - 后端: **JavaScript/TypeScript**
- **提交信息**:
  - 格式: `type(scope): description`
- **PR 检查清单**:
  1. 确保 `package.json` 中已移除 `mysql`/`mysql2` 依赖，并添加 `pg`。
  2. 确保所有 SQL 查询已适配 PostgreSQL 语法。
  3. API 文档已更新。

## 关键业务逻辑上下文
- **生理期预测**:
  - 基础算法: 平均周期 ± 标准差。
  - 机器学习(规划中): 数据点 > 50 时启用。
- **隐私**:
  - 敏感数据需通过 JWT 验证。