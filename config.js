// zydx.top 账号配置（用于数据校准参考）
var ZYDX_CONFIG = {
    phone: '13810747083',
    password: 'guit0089',
    url: 'https://www.zydx.top'
};

// 大模型 API 配置
// API Key 已迁移至后端代理，前端通过 /api/proxy/ai 调用，不再暴露密钥
var AI_CONFIG = {
    proxyUrl: '/api/proxy/ai',
    // 可选模型标识（传给后端代理的 provider 参数）
    deepseek: 'deepseek',
    doubao: 'doubao',
    tongyi: 'tongyi',
    // 默认使用的模型
    default: 'deepseek'
};
