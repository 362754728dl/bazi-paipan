# 八字排盘系统 Railway 部署指南

## 已完成的配置

以下配置已通过 Railway API 自动完成：

| 配置项 | 值 |
|--------|-----|
| 项目名称 | bazi-paipan |
| 项目ID | 7c2ee9e2-4f61-4621-b932-a0a62c8fa906 |
| PostgreSQL 服务ID | 98a32d2d-6fa8-4895-ace0-8cbdf09f90ad |
| 应用服务ID | 3f2a25b6-09b6-4d07-9457-9c228232c164 |
| 环境ID | 363204de-9428-45d1-91d9-292dd30df8fa |
| JWT_SECRET | 5726d9d6bde18a8d0d6f7ca889b8704fc5d0c8812aadbcc39d6dbdfc88c1f2e2（已设置） |
| ADMIN_PASSWORD | admin123456（已设置） |
| DEEPSEEK_API_KEY | 已设置 |
| DOUBAO_API_KEY | 已设置 |
| TONGYI_API_KEY | 已设置 |

## 剩余步骤（需要手动完成）

### 步骤1：将代码推送到 GitHub

```bash
cd /workspace/Railway部署包-final
git init
git add .
git commit -m "Initial commit"
# 在 GitHub 上创建一个新仓库（私有），然后：
git remote add origin https://github.com/<你的用户名>/bazi-paipan.git
git push -u origin main
```

### 步骤2：在 Railway Dashboard 连接 GitHub

1. 打开 https://railway.app，登录后进入项目 bazi-paipan
2. 点击 bazi-app 服务
3. 在 Settings → Source 中，选择 GitHub 仓库连接
4. 选择你刚创建的 bazi-paipan 仓库
5. Root Directory 设为 `/`
6. Start Command 设为 `node server/server.js`

### 步骤3：触发部署

1. 保存配置后，Railway 会自动触发部署
2. 等待构建完成（约 2-3 分钟）
3. 在 Deployments 标签页查看日志

### 步骤4：配置公网域名

1. 在 bazi-app 服务 → Settings → Networking
2. 点击 Generate Domain 获取公网域名
3. 或使用 Railway 提供的默认域名

### 步骤5：验证部署

打开浏览器访问你的域名，确认：
- 首页正常加载
- 注册新账号测试
- 管理员登录：admin / admin123456

## 环境变量说明

| 变量名 | 说明 | 状态 |
|--------|------|------|
| DATABASE_URL | PostgreSQL 连接串（Railway 自动注入） | 自动 |
| PORT | 服务端口（Railway 自动注入） | 自动 |
| JWT_SECRET | Token 签名密钥 | 已设置 |
| ADMIN_PASSWORD | 管理员密码 | 已设置 |
| DEEPSEEK_API_KEY | DeepSeek AI 密钥 | 已设置 |
| DOUBAO_API_KEY | 豆包 AI 密钥 | 已设置 |
| TONGYI_API_KEY | 通义千问 AI 密钥 | 已设置 |

## 重要提醒

- 首次登录后请立即修改管理员密码
- 数据已配置 PostgreSQL 持久化存储
- 本地开发不设置 DATABASE_URL 即可使用 SQLite
