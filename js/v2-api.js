/**
 * V2API 兼容层（精简版）
 * 
 * 说明：主站认证已改为 HttpOnly Cookie，此文件仅提供兼容性函数外壳，
 * 避免 v2 页面报 ReferenceError。实际认证由浏览器自动携带 Cookie 完成。
 */
var V2API = {
    /**
     * 判断是否已登录（已废弃，返回 false 让后端验证）
     * @returns {boolean}
     */
    isLoggedIn: function() {
        // HttpOnly Cookie 无法在前端读取，返回 false 让后端验证
        return false;
    },

    /**
     * 获取请求头（不再需要 Authorization）
     * @returns {Object}
     */
    getHeaders: function() {
        return { 'Content-Type': 'application/json' };
    },

    /**
     * 获取每日使用次数（已废弃）
     * @returns {number} -1 表示已废弃
     */
    getDailyCount: function() {
        return -1;
    },

    /**
     * 判断是否为 VIP 用户（会员系统已移除）
     * @returns {boolean}
     */
    isVipUser: function() {
        return false;
    },

    /**
     * 获取当前用户信息（由各页面自行从后端获取）
     * @returns {null}
     */
    getCurrentUser: function() {
        return null;
    },

    /**
     * 登录（已废弃，使用主站登录）
     * @returns {Promise}
     */
    login: function() {
        return Promise.reject(new Error('请使用主站登录功能'));
    },

    /**
     * 注册（已废弃，使用主站注册）
     * @returns {Promise}
     */
    register: function() {
        return Promise.reject(new Error('请使用主站注册功能'));
    },

    /**
     * 退出登录（已废弃，使用主站退出）
     */
    logout: function() {
        // 调用主站退出接口
        fetch('/api/user/logout', {
            method: 'POST',
            credentials: 'same-origin'
        }).catch(function() {});
    },

    /**
     * 获取用户会员信息（会员系统已移除）
     * @returns {null}
     */
    getUserMembership: function() {
        return null;
    },

    /**
     * 获取排盘记录（已废弃，使用 Storage 模块）
     * @returns {Promise}
     */
    getPaipanRecords: function() {
        return Promise.resolve({ list: [], total: 0 });
    },

    /**
     * 修改密码（已废弃，使用主站功能）
     * @returns {Promise}
     */
    changePassword: function() {
        return Promise.reject(new Error('请使用主站修改密码功能'));
    }
};

/**
 * V2Member 兼容层（精简版）
 * 
 * 说明：会员系统已完全移除，此对象仅提供兼容性函数外壳。
 */
var V2Member = {
    /**
     * 检查并使用次数（已废弃）
     * @returns {Promise}
     */
    checkAndUse: function() {
        return Promise.resolve({ allowed: true, data: { reason: 'deprecated' } });
    },

    /**
     * 显示会员弹窗（已废弃）
     */
    showMemberModal: function(message) {
        alert(message || '会员功能已下线');
    },

    /**
     * 显示每日限制弹窗（已废弃）
     */
    showDailyLimitModal: function() {
        alert('每日使用次数已用完');
    }
};

// 暴露到全局
if (typeof window !== 'undefined') {
    window.V2API = V2API;
    window.V2Member = V2Member;
}
