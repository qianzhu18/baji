# 使用官方 Node.js 运行时作为基础镜像
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制所有文件
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 生成Prisma客户端
RUN npx prisma generate

# 构建 TypeScript
RUN npm run build

# 生产阶段
FROM node:18-alpine AS runner
WORKDIR /app

# 安装 dumb-init（用于信号处理）
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

# 复制 package.json 和 package-lock.json
COPY package*.json ./
COPY prisma/ ./prisma/

# 仅安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 生成Prisma客户端
RUN npx prisma generate

# 复制构建产物
COPY --from=builder --chown=backend:nodejs /app/dist ./dist

# 创建必要的目录
RUN mkdir -p /app/logs /app/uploads && \
    chown -R backend:nodejs /app/logs /app/uploads

# 切换到非 root 用户
USER backend

# 暴露端口
EXPOSE 3001

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app-v2.js"]