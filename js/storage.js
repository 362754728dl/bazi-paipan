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
  async function logout() {
    remove(CURRENT_USER_KEY);
    // 清除V2本地缓存数据
    localStorage.removeItem('v2_user');
    // 调用后端退出接口清除 HttpOnly Cookie
    try {
      await fetch('/api/user/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
    } catch (e) {
      // 忽略网络错误
    }
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
   * V2改为通过后端验证Cookie，不再检查localStorage token
   * @returns {boolean}
   */
  function isLoggedIn() {
    // V1本地登录状态
    if (!!load(CURRENT_USER_KEY, null)) return true;
    // V2通过后端验证Cookie（异步，这里返回缓存状态）
    // 实际登录状态以后端验证为准
    return false;
  }

  // ==================== 排盘记录管理（后端API版） ====================

  // 缓存机制：减少API调用
  var _recordsCache = null;
  var _recordsCacheTime = 0;
  var _recordsCacheTTL = 30000; // 缓存30秒

  /**
   * 获取当前用户的token（已废弃，Cookie由浏览器自动携带）
   * @returns {null}
   */
  function _getToken() {
    // HttpOnly Cookie 由浏览器自动携带，前端无法读取
    return null;
  }

  /**
   * 从 localStorage 读取本地备份的排盘记录（离线/未登录回退方案）
   * @returns {Array}
   */
  function _getLocalRecords() {
    try {
      var raw = localStorage.getItem('paipan_records_local');
      if (!raw) return [];
      var records = JSON.parse(raw);
      return Array.isArray(records) ? records : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 将排盘记录备份到 localStorage
   * @param {Array} records
   */
  function _saveLocalRecords(records) {
    try {
      localStorage.setItem('paipan_records_local', JSON.stringify(records));
    } catch (e) {
      // 忽略存储满等异常
    }
  }

  /**
   * 保存一条排盘记录（调用后端API）
   * @param {object} record - 排盘记录对象
   *   - id          {number}   时间戳作为唯一标识
   *   - name        {string}   姓名或备注
   *   - solarDate   {string}   公历日期
   *   - lunarDate   {string}   农历日期
   *   - gender      {string}   性别
   *   - shengXiao   {string}   生肖
   *   - baziStr     {string}   八字字符串
   *   - formData    {object}   表单数据
   *   - createTime  {number}   创建时间戳
   * @returns {Promise<object>}
   */
  async function saveRecord(record) {
    // 尝试通过 Cookie 认证保存到后端（浏览器自动携带 Cookie）
    try {
      const response = await fetch('/api/paipan/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: record.name || '',
          solarDate: record.solarDate || '',
          lunarDate: record.lunarDate || '',
          gender: record.gender === '男' ? 1 : 0,
          shengXiao: record.shengXiao || '',
          baziStr: record.baziStr || '',
          birthHour: record.birthHour,
          formData: record.formData || {}
        })
      });

      const data = await response.json();
      if (data.code === 401) {
        // 未登录，保存到本地备份
        console.log('[saveRecord] 未登录，保存到本地备份');
        var localRecords = _getLocalRecords();
        record.id = record.id || Date.now();
        record.createTime = record.createTime || Date.now();
        localRecords.unshift(record);
        if (localRecords.length > 50) localRecords = localRecords.slice(0, 50);
        _saveLocalRecords(localRecords);
        _recordsCache = localRecords;
        _recordsCacheTime = Date.now();
        return { success: true, data: record };
      }

      if (data.code === 200) {
        // 清除缓存，下次读取时重新加载
        _recordsCache = null;
        return { success: true, data: data.data };
      } else {
        console.error('[saveRecord] 保存失败:', data.message);
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error('[saveRecord] 请求失败:', err);
      return { success: false, message: '网络错误' };
    }
  }

  /**
   * 获取当前用户的所有排盘记录（调用后端API）
   * @param {boolean} forceRefresh - 强制刷新，忽略缓存
   * @returns {Promise<Array>} 排盘记录数组
   */
  async function getRecords(forceRefresh) {
    // 检查缓存
    if (!forceRefresh && _recordsCache && (Date.now() - _recordsCacheTime) < _recordsCacheTTL) {
      return _recordsCache;
    }

    try {
      const response = await fetch('/api/paipan/records?page=1&pageSize=100', {
        method: 'GET',
        credentials: 'same-origin'
      });

      // 401 未登录，回退到本地备份
      if (response.status === 401) {
        console.log('[getRecords] 未登录，回退到本地备份记录');
        return _getLocalRecords();
      }

      const data = await response.json();
      if (data.code === 200 && data.data && data.data.list) {
        // 转换后端数据格式为前端格式
        const records = data.data.list.map(function(item) {
          return {
            id: item.id,
            name: item.name,
            solarDate: item.solar_date,
            lunarDate: item.lunar_date,
            gender: item.gender === 1 ? '男' : '女',
            shengXiao: item.sheng_xiao,
            baziStr: item.bazi_str,
            birthHour: item.birth_hour,
            formData: typeof item.form_data === 'string' ? JSON.parse(item.form_data) : (item.form_data || {}),
            createTime: new Date(item.created_at).getTime()
          };
        });

        // 更新缓存
        _recordsCache = records;
        _recordsCacheTime = Date.now();
        console.log('[性能日志] 排盘记录加载完成，数量：' + records.length);

        // 同步备份到本地
        _saveLocalRecords(records);

        return records;
      } else {
        console.error('[getRecords] 获取失败:', data.message);
        // API失败时回退到本地备份
        return _getLocalRecords();
      }
    } catch (err) {
      console.error('[getRecords] 请求失败:', err);
      // 网络异常时回退到本地备份
      return _getLocalRecords();
    }
  }

  /**
   * 删除一条排盘记录（调用后端API）
   * @param {number} id - 记录的唯一标识
   * @returns {Promise<boolean>}
   */
  async function deleteRecord(id) {
    try {
      const response = await fetch('/api/paipan/record/' + id, {
        method: 'DELETE',
        credentials: 'same-origin'
      });

      // 401 未登录，从本地备份删除
      if (response.status === 401) {
        var localRecords = _getLocalRecords();
        localRecords = localRecords.filter(function(r) { return r.id !== id; });
        _saveLocalRecords(localRecords);
        _recordsCache = localRecords;
        _recordsCacheTime = Date.now();
        return true;
      }

      const data = await response.json();
      if (data.code === 200) {
        // 清除缓存
        _recordsCache = null;
        // 同步删除本地备份
        var localRecords = _getLocalRecords();
        localRecords = localRecords.filter(function(r) { return r.id !== id; });
        _saveLocalRecords(localRecords);
        return true;
      } else {
        console.error('[deleteRecord] 删除失败:', data.message);
        return false;
      }
    } catch (err) {
      console.error('[deleteRecord] 请求失败:', err);
      return false;
    }
  }

  /**
   * 清除排盘记录缓存
   */
  function clearRecordsCache() {
    _recordsCache = null;
    _recordsCacheTime = 0;
  }

  /**
   * 分页获取排盘记录（调用后端API）
   * @param {number} page - 页码，默认1
   * @param {number} pageSize - 每页条数，默认10
   * @returns {Promise<{list: Array, total: number, page: number, pageSize: number, hasMore: boolean}>}
   */
  async function getRecordsPage(page, pageSize) {
    page = Math.max(1, page || 1);
    pageSize = Math.min(50, Math.max(1, pageSize || 10));

    try {
      const response = await fetch('/api/paipan/records?page=' + page + '&pageSize=' + pageSize, {
        method: 'GET',
        credentials: 'same-origin'
      });

      // 401 未登录，回退到本地备份（模拟分页）
      if (response.status === 401) {
        var allRecords = _getLocalRecords();
        var total = allRecords.length;
        var offset = (page - 1) * pageSize;
        var list = allRecords.slice(offset, offset + pageSize);
        return { list: list, total: total, page: page, pageSize: pageSize, hasMore: offset + pageSize < total };
      }

      const data = await response.json();
      if (data.code === 200 && data.data && data.data.list) {
        const records = data.data.list.map(function(item) {
          return {
            id: item.id,
            name: item.name,
            solarDate: item.solar_date,
            lunarDate: item.lunar_date,
            gender: item.gender === 1 ? '男' : '女',
            shengXiao: item.sheng_xiao,
            baziStr: item.bazi_str,
            birthHour: item.birth_hour,
            formData: typeof item.form_data === 'string' ? JSON.parse(item.form_data) : (item.form_data || {}),
            createTime: new Date(item.created_at).getTime()
          };
        });

        return {
          list: records,
          total: data.data.total,
          page: data.data.page,
          pageSize: data.data.pageSize,
          hasMore: !!data.data.hasMore
        };
      } else {
        console.error('[getRecordsPage] 获取失败:', data.message);
        return { list: [], total: 0, page: page, pageSize: pageSize, hasMore: false };
      }
    } catch (err) {
      console.error('[getRecordsPage] 请求失败:', err);
      return { list: [], total: 0, page: page, pageSize: pageSize, hasMore: false };
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
    getRecordsPage: getRecordsPage,
    clearRecordsCache: clearRecordsCache,
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