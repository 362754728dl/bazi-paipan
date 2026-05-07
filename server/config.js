const path = require('path');
module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
  jwtExpiresIn: '7d',
  dbPath: path.resolve(__dirname, '../data/bazi.db'),
  // 免费次数限制
  freeLimits: { nameCount: 3, evalCount: 3, liuyaoCount: 1 },
  // VIP次数限制
  vipLimits: { nameCount: 5, evalCount: 20, liuyaoCount: 5 },
  // 会员价格
  vipPrice: 19.8,
  // VIP有效期（天）
  vipDuration: 30,
  // 管理员默认账号（生产环境请通过环境变量设置）
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123456',
  // AI 大模型配置（仅后端持有，不暴露给前端）
  ai: {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat'
    },
    doubao: {
      apiKey: process.env.DOUBAO_API_KEY || '',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      model: 'doubao-pro-32k'
    },
    tongyi: {
      apiKey: process.env.TONGYI_API_KEY || '',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: 'qwen-max'
    },
    default: 'deepseek'
  }
};
