/**
 * 本地存储管理模块
 * 提供基础存储操作、账号系统和排盘记录管理功能
 */
const Storage = (function () {
  'use strict';

  // ==================== 基础存储操作 ====================

  /**
   * 保存数据到 localStorage，value 自动 JSON 序列化
   * @param {string} key   - 存储键名
   * @param {*}      value - 要存储的值（自动序列化）
   */
  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage.save 失败:', e);
      return false;
    }
  }

  /**
   * 读取数据，自动 JSON 反序列化
   * @param {string} key          - 存储键名
   * @param {*}      defaultValue - 键不存在时的默认返回值
   * @returns {*} 反序列化后的值，或 defaultValue
   */
  function load(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return defaultValue;
      }
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * 删除指定键的数据
   * @param {string} key - 存储键名
   */
  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Storage.remove 失败:', e);
    }
  }

  /**
   * 清空所有 localStorage 数据
   */
  function clear() {
    localStorage.clear();
  }

  // ==================== 账号系统 ====================

  /** 用户数据存储键 */
  const USERS_KEY = 'bazi_users';

  /** 当前登录用户存储键 */
  const CURRENT_USER_KEY = 'bazi_current_user';

  /**
   * 注册账号
   * @param {string} username - 用户名
   * @param {string} password - 密码（前端演示用，简单存储）
   * @returns {{ success: boolean, message: string }}
   */
  function register(username, password) {
    if (!username || !password) {
      return { success: false, message: '用户名和密码不能为空' };
    }

    const users = load(USERS_KEY, {});

    if (users[username]) {
      return { success: false, message: '用户名已存在' };
    }

    users[username] = {
      password: password,
      createTime: Date.now()
    };

    save(USERS_KEY, users);
    return { success: true, message: '注册成功' };
  }

  /**
   * 登录验证
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {object|null} 登录成功返回用户信息，失败返回 null
   */
  function login(username, password) {
    const users = load(USERS_KEY, {});
    const user = users[username];

    if (!user) {
      return null;
    }

    if (user.password !== password) {
      return null;
    }

    // 保存当前登录状态
    const userInfo = { username: username, createTime: user.createTime };
    save(CURRENT_USER_KEY, userInfo);
    return userInfo;
  }

  /**
   * 退出登录，清除当前用户状态（同时清除V1和V2登录数据）
   */
  function logout() {
    remove(CURRENT_USER_KEY);
    // 同时清除V2登录凭证，确保全站退出彻底
    localStorage.removeItem('v2_token');
    localStorage.removeItem('v2_user');
  }

  /**
   * 获取当前登录用户信息（兼容V1和V2）
   * @returns {object|null} 当前用户信息，未登录返回 null
   */
  function getCurrentUser() {
    // 优先V1
    var user = load(CURRENT_USER_KEY, null);
    if (user) return user;
    // 兼容V2：从v2_user缓存读取
    try {
      var v2User = JSON.parse(localStorage.getItem('v2_user') || 'null');
      if (v2User) return { username: v2User.username, createTime: Date.now() };
    } catch (e) {}
    return null;
  }

  /**
   * 判断是否已登录（兼容V1和V2）
   * @returns {boolean}
   */
  function isLoggedIn() {
    return !!load(CURRENT_USER_KEY, null) || !!localStorage.getItem('v2_token');
  }

  // ==================== 排盘记录管理 ====================

  /**
   * 获取当前用户的排盘记录存储键
   * @returns {string|null}
   */
  function _getRecordsKey() {
    const user = getCurrentUser();
    if (!user) return null;
    return 'bazi_records_' + user.username;
  }

  /**
   * 保存一条排盘记录
   * @param {object} record - 排盘记录对象
   *   - id          {number}   时间戳作为唯一标识
   *   - name        {string}   姓名或备注
   *   - solarDate   {string}   公历日期
   *   - lunarDate   {string}   农历日期
   *   - gender      {string}   性别
   *   - pillars     {object}   四柱信息
   *   - createTime  {number}   创建时间戳
   */
  function saveRecord(record) {
    const key = _getRecordsKey();
    if (!key) return;

    const records = load(key, []);
    records.push(record);
    save(key, records);
  }

  /**
   * 获取当前用户的所有排盘记录，按创建时间倒序排列
   * @returns {Array} 排盘记录数组
   */
  function getRecords() {
    const key = _getRecordsKey();
    if (!key) return [];

    const records = load(key, []);
    // 按创建时间倒序
    return records.slice().sort(function (a, b) {
      return b.createTime - a.createTime;
    });
  }

  /**
   * 删除一条排盘记录
   * @param {number} id - 记录的唯一标识（时间戳）
   */
  function deleteRecord(id) {
    try {
    const key = _getRecordsKey();
    if (!key) return;

    const records = load(key, []);
    const filtered = records.filter(function (r) {
      return r.id !== id;
    });
    save(key, filtered);
    } catch (e) {
      console.error('[deleteRecord] error:', e);
    }
  }

  // ==================== 管理员系统 ====================

  const ADMIN_KEY = 'bazi_admin';

  /**
   * 初始化管理员账号（首次使用时创建默认账号）
   */
  function initAdmin() {
    var admin = load(ADMIN_KEY, null);
    if (!admin) {
      save(ADMIN_KEY, { username: 'admin', password: '123456' });
    }
  }

  /**
   * 管理员登录验证
   */
  function adminLogin(username, password) {
    initAdmin();
    var admin = load(ADMIN_KEY, null);
    if (!admin) return false;
    return admin.username === username && admin.password === password;
  }

  /**
   * 修改管理员密码
   */
  function adminChangePassword(oldPwd, newPwd) {
    initAdmin();
    var admin = load(ADMIN_KEY, null);
    if (!admin) return { success: false, message: '系统错误' };
    if (admin.password !== oldPwd) return { success: false, message: '原密码错误' };
    admin.password = newPwd;
    save(ADMIN_KEY, admin);
    return { success: true, message: '密码修改成功' };
  }

  /**
   * 获取所有注册用户列表
   */
  function getAllUsers() {
    return load(USERS_KEY, {});
  }

  /**
   * 删除指定用户
   */
  function deleteUser(username) {
    var users = load(USERS_KEY, {});
    if (users[username]) {
      delete users[username];
      save(USERS_KEY, users);
      // 同时删除该用户的排盘记录
      remove('bazi_records_' + username);
      return true;
    }
    return false;
  }

  /**
   * 获取所有用户的排盘记录
   */
  function getAllRecords() {
    var users = load(USERS_KEY, {});
    var allRecords = [];
    for (var username in users) {
      var records = load('bazi_records_' + username, []);
      records.forEach(function (r) {
        r._username = username;
      });
      allRecords = allRecords.concat(records);
    }
    return allRecords.sort(function (a, b) { return b.createTime - a.createTime; });
  }

  /**
   * 获取今日新增用户数
   */
  function getTodayNewUsers() {
    var users = load(USERS_KEY, {});
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var count = 0;
    for (var username in users) {
      if (users[username].createTime >= today.getTime()) {
        count++;
      }
    }
    return count;
  }

  /**
   * 获取总排盘数
   */
  function getTotalRecords() {
    var users = load(USERS_KEY, {});
    var total = 0;
    for (var username in users) {
      var records = load('bazi_records_' + username, []);
      total += records.length;
    }
    return total;
  }

  /**
   * 用户修改密码
   */
  function changePassword(username, oldPwd, newPwd) {
    var users = load(USERS_KEY, {});
    var user = users[username];
    if (!user) return { success: false, message: '用户不存在' };
    if (user.password !== oldPwd) return { success: false, message: '原密码错误' };
    user.password = newPwd;
    save(USERS_KEY, users);
    return { success: true, message: '密码修改成功' };
  }

  // ==================== 会员管理 ====================

  /**
   * 获取用户会员信息
   * @param {string} username - 用户名
   * @returns {object|null} 会员信息对象
   */
  function getUserMembership(username) {
    if (!username) return null;
    var data = JSON.parse(localStorage.getItem('bazi_membership_' + username) || 'null');
    return data;
  }

  /**
   * 设置用户会员信息
   * @param {string} username    - 用户名
   * @param {object} membership  - 会员信息对象
   */
  function setUserMembership(username, membership) {
    if (!username) return;
    localStorage.setItem('bazi_membership_' + username, JSON.stringify(membership));
  }

  /**
   * 开通/续费会员（管理员调用）
   * @param {string} username   - 用户名
   * @param {string} plan       - 套餐类型: 'trial' | 'yearly' | 'lifetime'
   * @param {string} expireDate - 到期日期字符串 'YYYY-MM-DD'，lifetime为空
   * @returns {object} 会员信息对象
   */
  function activateMembership(username, plan, expireDate) {
    var membership = {
      plan: plan,
      activateDate: new Date().toISOString().split('T')[0],
      expireDate: plan === 'lifetime' ? '9999-12-31' : expireDate,
      aiQuota: plan === 'trial' ? 3 : 999,
      isActive: true
    };
    setUserMembership(username, membership);
    return membership;
  }

  /**
   * 检查用户是否为有效会员
   * @param {string} username - 用户名
   * @returns {boolean}
   */
  function isVipUser(username) {
    var m = getUserMembership(username);
    if (!m || !m.isActive) return false;
    if (m.plan === 'lifetime') return true;
    var today = new Date().toISOString().split('T')[0];
    return m.expireDate >= today;
  }

  /**
   * 获取用户今日AI剩余次数
   * @param {string} username - 用户名
   * @returns {number} 剩余次数，-1表示无限
   */
  function getAiQuotaRemaining(username) {
    var m = getUserMembership(username);
    if (!m || !m.isActive) return 0;
    if (m.plan === 'lifetime' || m.plan === 'yearly') return -1;
    var today = new Date().toISOString().split('T')[0];
    var lastReset = localStorage.getItem('bazi_ai_reset_' + username) || '';
    if (lastReset !== today) {
      localStorage.setItem('bazi_ai_reset_' + username, today);
      setUserMembership(username, Object.assign({}, m, { aiQuota: 3 }));
      return 3;
    }
    return m.aiQuota;
  }

  /**
   * 消耗一次AI次数
   * @param {string} username - 用户名
   * @returns {boolean} 是否消耗成功
   */
  function consumeAiQuota(username) {
    var m = getUserMembership(username);
    if (!m || !m.isActive) return false;
    if (m.plan === 'lifetime' || m.plan === 'yearly') return true;
    if (m.aiQuota <= 0) return false;
    m.aiQuota--;
    setUserMembership(username, m);
    return true;
  }

  /**
   * 获取所有会员列表（管理员用）
   * @returns {Array} 会员信息数组
   */
  function getAllMemberships() {
    var members = [];
    var users = getAllUsers();
    for (var username in users) {
      var m = getUserMembership(username);
      if (m) {
        members.push({
          username: username,
          plan: m.plan,
          activateDate: m.activateDate,
          expireDate: m.expireDate,
          aiQuota: m.aiQuota,
          isActive: m.isActive
        });
      }
    }
    return members;
  }

  /**
   * 管理员手动调整AI次数
   * @param {string} username - 用户名
   * @param {number} quota    - 次数，-1为无限
   * @returns {object} 更新后的会员信息
   */
  function adjustAiQuota(username, quota) {
    var m = getUserMembership(username);
    if (!m) {
      m = { plan: 'trial', activateDate: new Date().toISOString().split('T')[0], expireDate: '9999-12-31', aiQuota: quota, isActive: true };
    } else {
      m.aiQuota = quota;
    }
    setUserMembership(username, m);
    return m;
  }

  // ==================== 导出公共接口 ====================

  return {
    save: save,
    load: load,
    remove: remove,
    clear: clear,
    register: register,
    login: login,
    logout: logout,
    getCurrentUser: getCurrentUser,
    isLoggedIn: isLoggedIn,
    saveRecord: saveRecord,
    getRecords: getRecords,
    deleteRecord: deleteRecord,
    initAdmin: initAdmin,
    adminLogin: adminLogin,
    adminChangePassword: adminChangePassword,
    getAllUsers: getAllUsers,
    deleteUser: deleteUser,
    getAllRecords: getAllRecords,
    getTodayNewUsers: getTodayNewUsers,
    getTotalRecords: getTotalRecords,
    changePassword: changePassword,
    getUserMembership: getUserMembership,
    setUserMembership: setUserMembership,
    activateMembership: activateMembership,
    isVipUser: isVipUser,
    getAiQuotaRemaining: getAiQuotaRemaining,
    consumeAiQuota: consumeAiQuota,
    getAllMemberships: getAllMemberships,
    adjustAiQuota: adjustAiQuota
  };
})();
