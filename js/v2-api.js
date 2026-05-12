/**
 * v2-api.js - v2版本核心API模块
 * 替代storage.js中的localStorage操作，改用后端API
 * 仅在v2页面中使用，不影响v1.5.0
 */
var V2API = (function () {
    'use strict';

    var TOKEN_KEY = 'v2_token';
    var USER_CACHE_KEY = 'v2_user';
    var V1_USER_KEY = 'bazi_current_user';

    // ==================== Token管理 ====================

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    function removeToken() {
        localStorage.removeItem(TOKEN_KEY);
    }

    function getHeaders() {
        var headers = { 'Content-Type': 'application/json' };
        var token = getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    }

    // ==================== 用户缓存 ====================

    function getUserCache() {
        try {
            return JSON.parse(localStorage.getItem(USER_CACHE_KEY) || 'null');
        } catch (e) { return null; }
    }

    function setUserCache(user) {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    }

    function clearUserCache() {
        localStorage.removeItem(USER_CACHE_KEY);
    }

    // ==================== 登录状态判断（兼容V1+V2） ====================

    function isLoggedIn() {
        return !!localStorage.getItem(TOKEN_KEY) || !!localStorage.getItem(V1_USER_KEY);
    }

    function getCurrentUser() {
        // 优先从V2缓存读取
        var user = getUserCache();
        if (user) return user;
        // 兼容V1：从bazi_current_user读取
        try {
            var v1User = JSON.parse(localStorage.getItem(V1_USER_KEY) || 'null');
            if (v1User) {
                return { username: v1User.username, level: 'normal' };
            }
        } catch (e) {}
        return null;
    }

    function logout() {
        // 清除V2
        removeToken();
        clearUserCache();
        // 清除V1
        localStorage.removeItem(V1_USER_KEY);
    }

    // ==================== 登录/注册 ====================

    async function login(username, password) {
        var resp = await fetch('/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username: username, password: password })
        });
        var json = await resp.json();
        if (json.code === 200) {
            setToken(json.data.token);
            setUserCache({ username: json.data.username || username, level: json.data.level });
            // 同步写入V1的bazi_current_user，让V1页面也能识别登录状态
            localStorage.setItem(V1_USER_KEY, JSON.stringify({
                username: json.data.username || username,
                createTime: Date.now()
            }));
            return { success: true, user: json.data };
        }
        return { success: false, message: json.message || '登录失败' };
    }

    async function register(username, password, captcha) {
        var resp = await fetch('/api/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username: username, password: password, captcha: captcha || '' })
        });
        var json = await resp.json();
        if (json.code === 200) {
            // 注册成功后自动登录：保存token和用户信息
            if (json.data && json.data.token) {
                setToken(json.data.token);
                setUserCache({ username: json.data.username || username, level: json.data.level || 'normal' });
                // 同步写入V1的bazi_current_user
                localStorage.setItem(V1_USER_KEY, JSON.stringify({
                    username: json.data.username || username,
                    createTime: Date.now()
                }));
            }
            return { success: true, message: '注册成功' };
        }
        return { success: false, message: json.message || '注册失败' };
    }

    // ==================== 修改密码 ====================

    async function changePassword(oldPwd, newPwd) {
        var resp = await fetch('/api/user/change-password', {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
        });
        var json = await resp.json();
        if (json.code === 200) {
            return { success: true, message: '密码修改成功' };
        }
        return { success: false, message: json.message || '修改失败' };
    }

    // ==================== 用户信息 ====================

    async function getUserInfo() {
        var resp = await fetch('/api/user/info', { headers: getHeaders(), credentials: 'include' });
        var json = await resp.json();
        if (json.code === 200) {
            setUserCache({ username: json.data.username, level: json.data.level });
            return json.data;
        }
        return null;
    }

    // ==================== 排盘记录 ====================

    async function savePaipanRecord(record) {
        var resp = await fetch('/api/paipan/save', {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(record)
        });
        var json = await resp.json();
        return json;
    }

    async function getPaipanRecords(page, pageSize) {
        var url = '/api/paipan/records?page=' + (page || 1) + '&pageSize=' + (pageSize || 50);
        var resp = await fetch(url, { headers: getHeaders(), credentials: 'include' });
        var json = await resp.json();
        if (json.code === 200) {
            return json.data; // { list, total, page, pageSize }
        }
        return { list: [], total: 0, page: 1, pageSize: 50 };
    }

    async function deletePaipanRecord(id) {
        var resp = await fetch('/api/paipan/record/' + id, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        });
        var json = await resp.json();
        return json;
    }

    // ==================== 姓名记录 ====================

    async function getNameRecords(type, page, pageSize) {
        var url = type === 'evaluate'
            ? '/api/name/eval-records?page=' + (page || 1) + '&pageSize=' + (pageSize || 50)
            : '/api/name/records?page=' + (page || 1) + '&pageSize=' + (pageSize || 50);
        var resp = await fetch(url, { headers: getHeaders(), credentials: 'include' });
        var json = await resp.json();
        if (json.code === 200) {
            return json.data;
        }
        return { list: [], total: 0, page: 1, pageSize: 50 };
    }

    // ==================== 会员信息 ====================

    function getUserMembership() {
        // 从用户缓存中获取会员信息
        var user = getUserCache();
        if (!user) return null;
        // 通过 /api/user/info 获取最新信息
        // 这里简化处理：从缓存读取level
        var isVip = user.level === 'vip';
        return {
            isActive: isVip,
            plan: isVip ? 'monthly' : 'normal',
            expireDate: isVip ? '2099-12-31' : ''
        };
    }

    function isVipUser() {
        var user = getUserCache();
        return user && user.level === 'vip';
    }

    // ==================== 每日次数 ====================

    async function getDailyCount() {
        var resp = await fetch('/api/user/daily-count', { headers: getHeaders(), credentials: 'include' });
        var json = await resp.json();
        if (json.code === 200) {
            return json.data;
        }
        return { name_count: 0, eval_count: 0, liuyao_count: 0 };
    }

    // ==================== 导出 ====================

    return {
        TOKEN_KEY: TOKEN_KEY,
        getToken: getToken,
        setToken: setToken,
        removeToken: removeToken,
        getHeaders: getHeaders,
        getUserCache: getUserCache,
        setUserCache: setUserCache,
        clearUserCache: clearUserCache,
        isLoggedIn: isLoggedIn,
        getCurrentUser: getCurrentUser,
        logout: logout,
        login: login,
        register: register,
        changePassword: changePassword,
        getUserInfo: getUserInfo,
        savePaipanRecord: savePaipanRecord,
        getPaipanRecords: getPaipanRecords,
        deletePaipanRecord: deletePaipanRecord,
        getNameRecords: getNameRecords,
        getUserMembership: getUserMembership,
        isVipUser: isVipUser,
        getDailyCount: getDailyCount
    };
})();
