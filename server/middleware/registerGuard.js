/**
 * 注册防护模块：验证码校验 + 注册IP限流
 * 仅用于 /api/user/register 接口
 */

// ==================== 验证码存储 ====================
const captchaStore = new Map();

// 每10分钟清理过期验证码
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of captchaStore.entries()) {
    if (now - data.createdAt >= 600000) {
      captchaStore.delete(key);
    }
  }
}, 600000);

/**
 * 存储验证码
 * @param {string} ip - 客户端IP
 * @param {string} text - 验证码文本（已转小写）
 */
function setCaptcha(ip, text) {
  captchaStore.set(ip, {
    text: text,
    createdAt: Date.now()
  });
}

/**
 * 校验验证码（一次一失效）
 * @param {string} ip - 客户端IP
 * @param {string} inputCode - 用户输入的验证码
 * @returns {boolean} 是否通过
 */
function verifyCaptcha(ip, inputCode) {
  if (!inputCode) return false;
  const record = captchaStore.get(ip);
  if (!record) return false;
  if (Date.now() - record.createdAt >= 600000) {
    captchaStore.delete(ip);
    return false;
  }
  // 一次一失效：无论校验成功与否，使用后立即删除
  captchaStore.delete(ip);
  return record.text === inputCode.toLowerCase().trim();
}

// ==================== 注册IP限流（仅统计注册成功） ====================
const registerSuccessCounts = new Map();

// 每24小时清理一次
setInterval(() => {
  registerSuccessCounts.clear();
}, 86400000);

/**
 * 检查注册限流（在注册前调用，但不扣减——仅在成功时扣减）
 * @param {string} ip - 客户端IP
 * @returns {{ allowed: boolean, message?: string }}
 */
function checkRegisterRateLimit(ip) {
  const now = Date.now();
  let record = registerSuccessCounts.get(ip);
  if (!record) {
    record = { hourly: [], daily: [] };
    registerSuccessCounts.set(ip, record);
  }
  // 清理1小时前的记录
  record.hourly = record.hourly.filter(t => now - t < 3600000);
  // 清理24小时前的记录
  record.daily = record.daily.filter(t => now - t < 86400000);
  // 检查限制：1小时内最多2次，24小时内最多5次
  if (record.hourly.length >= 2) {
    return { allowed: false, message: '注册过于频繁，请1小时后再试' };
  }
  if (record.daily.length >= 5) {
    return { allowed: false, message: '注册过于频繁，请24小时后再试' };
  }
  return { allowed: true };
}

/**
 * 记录注册成功（仅在注册成功后调用）
 * @param {string} ip - 客户端IP
 */
function recordRegisterSuccess(ip) {
  const now = Date.now();
  let record = registerSuccessCounts.get(ip);
  if (!record) {
    record = { hourly: [], daily: [] };
    registerSuccessCounts.set(ip, record);
  }
  record.hourly.push(now);
  record.daily.push(now);
}

module.exports = {
  setCaptcha,
  verifyCaptcha,
  checkRegisterRateLimit,
  recordRegisterSuccess
};
