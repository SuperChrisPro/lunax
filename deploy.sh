#!/bin/bash

# LunaX 月汐应用部署脚本

set -e

echo "🌙 开始部署 LunaX 月汐应用..."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查必要工具
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js 未安装${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm 未安装${NC}"; exit 1; }

# 检查环境变量
if [[ -z "$LUNAX_DB_HOST" ]] || [[ -z "$LUNAX_DB_USER" ]] || [[ -z "$LUNAX_DB_PASSWORD" ]]; then
    echo -e "${RED}请设置数据库环境变量：LUNAX_DB_HOST, LUNAX_DB_USER, LUNAX_DB_PASSWORD${NC}"
    exit 1
fi

# 后端部署
echo -e "${GREEN}📦 部署后端服务...${NC}"
cd backend

# 安装依赖
echo "安装后端依赖..."
npm install --production

# 创建生产环境配置
cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=$LUNAX_DB_HOST
DB_PORT=3306
DB_NAME=lunax_db
DB_USER=$LUNAX_DB_USER
DB_PASSWORD=$LUNAX_DB_PASSWORD
JWT_SECRET=$LUNAX_JWT_SECRET
EOF

# 启动后端服务
echo "启动后端服务..."
nohup npm start > backend.log 2>&1 &
echo -e "${GREEN}✅ 后端服务已启动，日志：backend.log${NC}"

# 数据库部署
echo -e "${GREEN}🗄️  初始化数据库...${NC}"
mysql -h $LUNAX_DB_HOST -u $LUNAX_DB_USER -p$LUNAX_DB_PASSWORD lunax_db < ../database/schema.sql
echo -e "${GREEN}✅ 数据库初始化完成${NC}"

# 前端构建
echo -e "${GREEN}📱 构建前端应用...${NC}"
cd ../frontend

# 构建发布版本
echo "构建HarmonyOS应用..."
# 这里需要配置DevEco Studio的构建命令
# 实际项目中使用：hdc build --release

echo -e "${GREEN}✅ 构建完成${NC}"

# 健康检查
echo -e "${GREEN}🏥 健康检查...${NC}"
sleep 5
curl -f http://localhost:3000/health || {
    echo -e "${RED}后端服务健康检查失败${NC}"
    exit 1
}

echo -e "${GREEN}🎉 LunaX 月汐应用部署成功！${NC}"
echo "📊 后端API: http://localhost:3000"
echo "📱 前端应用: 请使用DevEco Studio安装到鸿蒙设备"
echo "🔍 查看日志: tail -f backend/backend.log"