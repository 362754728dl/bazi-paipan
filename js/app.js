/**
 * app.js - 四柱八字排盘主应用逻辑
 * IIFE模式，负责页面交互、排盘调用、记录管理、登录注册等
 */
const App = (function () {
    'use strict';

    // ==================== 状态变量 ====================

    /** 当前日历类型：solar=公历, lunar=农历 */
    var calendarType = 'solar';

    /** 当前性别：1=男, 0=女 */
    var gender = 1;

    /** 当前登录模式：login=登录, register=注册 */
    var loginMode = 'login';

    /** 最近一次排盘结果（供AI评测使用） */
    var lastPaipanResult = null;
    var _viewingRecord = false;
    var calendarYear = new Date().getFullYear();
    var calendarMonth = new Date().getMonth() + 1;
    var calendarDay = new Date().getDate();

    // ==================== DOM元素缓存 ====================

    var $ = function (id) {
        return document.getElementById(id);
    };

    // ==================== 初始化 ====================

    /**
     * 应用初始化
     * 检查登录状态、填充省份下拉框、初始化日期选择器、绑定事件
     */
    function init() {
        // 检查登录状态，更新用户信息栏
        updateUserBar();

        // 填充省份下拉框
        fillProvinces();

        // 初始化日期选择器
        initDateSelectors();

        // 绑定所有事件
        bindEvents();
    }

    // ==================== 用户信息栏 ====================

    /**
     * 更新用户信息栏的显示状态
     * 已登录显示用户名和退出按钮，未登录显示提示
     */
    function updateUserBar() {
        var userInfo = $('userInfo');
        var btnLogout = $('btnLogout');
        var btnChangePwdEntry = $('btnChangePwdEntry');

        if (Storage.isLoggedIn()) {
            var user = Storage.getCurrentUser();
            userInfo.textContent = '欢迎，' + user.username;
            btnLogout.style.display = 'inline-block';
            if (btnChangePwdEntry) btnChangePwdEntry.style.display = 'inline-block';
        } else {
            userInfo.textContent = '未登录（排盘记录需登录保存）';
            btnLogout.style.display = 'none';
            if (btnChangePwdEntry) btnChangePwdEntry.style.display = 'none';
        }

        // 未登录时点击用户信息弹出登录框
        if (!Storage.isLoggedIn()) {
            userInfo.style.cursor = 'pointer';
            userInfo.onclick = function() { showLoginModal(); };
        } else {
            userInfo.style.cursor = 'default';
            userInfo.onclick = null;
        }
    }

    // ==================== 日期选择器初始化 ====================

    /**
     * 初始化年、月、日、时、分下拉框
     * 公历范围：1900-2100年
     * 农历范围：1902-2031年
     */
    function initDateSelectors() {
        updateDateSelectors();
    }

    /**
     * 根据当前日历类型（公历/农历）更新所有下拉框选项
     */
    function updateDateSelectors() {
        var selectYear = $('selectYear');
        var selectMonth = $('selectMonth');
        var selectHour = $('selectHour');
        var selectMinute = $('selectMinute');

        // 年份
        selectYear.innerHTML = '';
        if (calendarType === 'lunar') {
            // 农历年份：1902-2031，格式 XXXX年(干支)
            var tianGanArr = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
            var diZhiArr = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
            for (var y = 1902; y <= 2031; y++) {
                var opt = document.createElement('option');
                opt.value = y;
                var ganIdx = (y - 4) % 10;
                var zhiIdx = (y - 4) % 12;
                opt.textContent = y + '年(' + tianGanArr[ganIdx] + diZhiArr[zhiIdx] + ')';
                if (y === 2026) opt.selected = true;
                selectYear.appendChild(opt);
            }
        } else {
            // 公历年份：1900-2100
            for (var y = 1900; y <= 2100; y++) {
                var opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y + '年';
                if (y === 1990) opt.selected = true;
                selectYear.appendChild(opt);
            }
        }

        // 月份
        selectMonth.innerHTML = '';
        if (calendarType === 'lunar') {
            // 农历月份：正月、二月、...、十二月
            var lunarMonthNames = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
            for (var m = 1; m <= 12; m++) {
                var opt2 = document.createElement('option');
                opt2.value = m;
                opt2.textContent = lunarMonthNames[m - 1];
                selectMonth.appendChild(opt2);
            }
        } else {
            for (var m = 1; m <= 12; m++) {
                var opt2 = document.createElement('option');
                opt2.value = m;
                opt2.textContent = padZero(m) + '月';
                selectMonth.appendChild(opt2);
            }
        }

        // 日期
        fillDays();

        // 时辰
        selectHour.innerHTML = '';
        var optJiShi = document.createElement('option');
        optJiShi.value = '-1';
        optJiShi.textContent = '吉时';
        selectHour.appendChild(optJiShi);
        if (calendarType === 'lunar') {
            // 农历小时：X->时辰名
            var shiChenNames = ['子时','丑时','丑时','寅时','寅时','卯时','卯时','辰时','辰时','巳时','巳时','午时','午时','未时','未时','申时','申时','酉时','酉时','戌时','戌时','亥时','亥时','子时'];
            for (var h = 0; h <= 23; h++) {
                var opt3 = document.createElement('option');
                opt3.value = h;
                opt3.textContent = '\u00a0' + h + '->' + shiChenNames[h];
                selectHour.appendChild(opt3);
            }
        } else {
            for (var h = 0; h <= 23; h++) {
                var opt3 = document.createElement('option');
                opt3.value = h;
                opt3.textContent = padZero(h) + '时';
                selectHour.appendChild(opt3);
            }
        }

        // 分钟（0-59分，全部分钟）+ 吉分选项
        selectMinute.innerHTML = '';
        var optJiFen = document.createElement('option');
        optJiFen.value = '-1';
        optJiFen.textContent = '吉分';
        selectMinute.appendChild(optJiFen);
        for (var mi = 0; mi < 60; mi++) {
            var opt4 = document.createElement('option');
            opt4.value = mi;
            opt4.textContent = padZero(mi) + '分';
            selectMinute.appendChild(opt4);
        }

        // 农历模式下，根据当前年份更新月份列表（含闰月选项）
        if (calendarType === 'lunar') {
            updateLunarMonthOptions();
        }
    }

    /**
     * 根据当前年份更新农历月份下拉列表（含闰月选项）
     * 始终根据年份判断是否有闰月，有则直接在月份列表中包含"闰X月"选项
     */
    function updateLunarMonthOptions() {
        var yearSelect = $('selectYear');
        var monthSelect = $('selectMonth');
        if (!yearSelect || !monthSelect || calendarType !== 'lunar') return;

        var year = parseInt(yearSelect.value) || 2026;
        var leapMonth = 0;
        try {
            leapMonth = Lunar.leapMonth(year);
        } catch(e) {
            leapMonth = 0;
        }

        var monthNames = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
        var currentMonth = parseInt(monthSelect.value) || 1;

        var html = '';
        for (var m = 1; m <= 12; m++) {
            html += '<option value="' + m + '">' + monthNames[m-1] + '</option>';
            if (m === leapMonth) {
                // 直接在对应月份后面插入"闰X月"选项
                html += '<option value="' + m + '" data-leap="1">闰' + monthNames[m-1] + '</option>';
            }
        }
        monthSelect.innerHTML = html;

        // 恢复之前选择的月份
        var found = false;
        for (var i = 0; i < monthSelect.options.length; i++) {
            if (parseInt(monthSelect.options[i].value) === currentMonth) {
                monthSelect.options[i].selected = true;
                found = true;
                break;
            }
        }
        if (!found && monthSelect.options.length > 0) {
            monthSelect.options[0].selected = true;
        }
    }

    /**
     * 根据当前年月填充日期下拉框
     */
    function fillDays() {
        var selectYear = $('selectYear');
        var selectMonth = $('selectMonth');
        var selectDay = $('selectDay');
        var year = parseInt(selectYear.value);
        var month = parseInt(selectMonth.value);

        // 计算当月天数
        var daysInMonth;
        if (calendarType === 'solar') {
            // 公历天数
            var daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            daysInMonth = daysPerMonth[month - 1];
            // 闰年2月
            if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0))) {
                daysInMonth = 29;
            }
        } else {
            // 农历天数（使用Lunar模块查询）
            // 检查是否选中了闰月选项
            var selectedMonthOption = selectMonth.selectedOptions && selectMonth.selectedOptions[0];
            var isLeapMonth = selectedMonthOption && selectedMonthOption.getAttribute('data-leap') === '1';
            if (isLeapMonth) {
                daysInMonth = Lunar.leapDays(year);
            } else {
                daysInMonth = Lunar.lunarMonthDays(year, month);
            }
        }

        var currentDay = parseInt(selectDay.value) || 1;
        selectDay.innerHTML = '';
        for (var d = 1; d <= daysInMonth; d++) {
            var opt = document.createElement('option');
            opt.value = d;
            if (calendarType === 'lunar') {
                // 农历日期：初一、初二、...、三十
                var lunarDayNames = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
                    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
                    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
                opt.textContent = lunarDayNames[d - 1] || (d + '日');
            } else {
                opt.textContent = padZero(d) + '日';
            }
            if (d === currentDay) opt.selected = true;
            selectDay.appendChild(opt);
        }
    }

    // ==================== 省市联动 ====================

    /**
     * 填充省份下拉框
     */
    function fillProvinces() {
        var selectProvince = $('selectProvince');
        selectProvince.innerHTML = '<option value="">请选择省份</option>';
        CityData.provinces.forEach(function (p) {
            var opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            selectProvince.appendChild(opt);
        });
    }

    /**
     * 根据选中的省份填充城市下拉框
     */
    function onProvinceChange() {
        var provinceName = $('selectProvince').value;
        var selectCity = $('selectCity');
        selectCity.innerHTML = '<option value="">请选择城市</option>';

        if (!provinceName) return;

        var cities = CityData.getCities(provinceName);
        cities.forEach(function (c) {
            var opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            selectCity.appendChild(opt);
        });
    }

    // ==================== 事件绑定 ====================

    /**
     * 绑定所有交互事件
     */
    function bindEvents() {
        // 底部导航切换（跳过「更多」按钮，它由 toggleDrawer 独立处理）
        var navItems = document.querySelectorAll('#bottomNav .nav-item');
        navItems.forEach(function (item) {
            item.addEventListener('click', function () {
                if (!this.getAttribute('data-page')) return; // 跳过无 data-page 的按钮（如「更多」）
                switchPage(this.getAttribute('data-page'));
            });
        });

        // 公历/农历切换
        var calItems = document.querySelectorAll('#calendarSwitch .switch-item');
        calItems.forEach(function (item) {
            item.addEventListener('click', function () {
                calItems.forEach(function (i) { i.classList.remove('active'); });
                this.classList.add('active');
                calendarType = this.getAttribute('data-type');
                updateDateSelectors();
            });
        });

        // 年月变化时更新日期
        $('selectYear').addEventListener('change', function() {
            // 农历模式下更新月份列表（含闰月选项）
            if (calendarType === 'lunar') {
                updateLunarMonthOptions();
            }
            fillDays();
        });
        $('selectMonth').addEventListener('change', fillDays);

        // 性别切换
        var genderItems = document.querySelectorAll('#genderSwitch .gender-item');
        genderItems.forEach(function (item) {
            item.addEventListener('click', function () {
                genderItems.forEach(function (i) { i.classList.remove('active'); });
                this.classList.add('active');
                gender = parseInt(this.getAttribute('data-gender'));
            });
        });

        // 省份变化 -> 城市联动
        $('selectProvince').addEventListener('change', onProvinceChange);

        // 开始排盘
        $('btnPaipan').addEventListener('click', doPaipan);

        // 退出登录
        $('btnLogout').addEventListener('click', function () {
            Storage.logout();
            updateUserBar();
            // 清理排盘结果和状态
            lastPaipanResult = null;
            var resultArea = $('resultArea');
            if (resultArea) resultArea.innerHTML = '';
            // 如果在记录页，刷新列表
            if (document.querySelector('#pageRecords.active')) {
                renderRecords();
            }
            showToast('已退出登录');
        });

        // 登录/注册按钮
        $('btnLogin').addEventListener('click', doLoginOrRegister);

        // 登录/注册切换链接
        $('switchToRegister').addEventListener('click', function () {
            toggleLoginMode();
        });

        // 验证码图片点击刷新
        var captchaImg = document.getElementById('captchaImg');
        if (captchaImg) {
            captchaImg.addEventListener('click', function () {
                this.src = '/api/captcha?t=' + Date.now();
            });
        }

        // 点击弹窗遮罩关闭
        $('loginModal').addEventListener('click', function (e) {
            if (e.target === this) {
                hideLoginModal();
            }
        });

        // 记录页空状态登录/注册按钮
        var btnEmptyLogin = document.getElementById('btnEmptyLogin');
        var btnEmptyRegister = document.getElementById('btnEmptyRegister');
        if (btnEmptyLogin) {
            btnEmptyLogin.addEventListener('click', function () {
                showLoginModal();
            });
        }
        if (btnEmptyRegister) {
            btnEmptyRegister.addEventListener('click', function () {
                showLoginModal();
                toggleLoginMode();
            });
        }

        // 修改密码入口按钮
        var btnChangePwdEntry = document.getElementById('btnChangePwdEntry');
        if (btnChangePwdEntry) {
            btnChangePwdEntry.addEventListener('click', function () {
                showChangePwdModal();
            });
        }

        // 修改密码弹窗
        var btnChangePwd = document.getElementById('btnChangePwd');
        if (btnChangePwd) {
            btnChangePwd.addEventListener('click', doChangePassword);
        }
        var cancelChangePwd = document.getElementById('cancelChangePwd');
        if (cancelChangePwd) {
            cancelChangePwd.addEventListener('click', function () {
                document.getElementById('changePwdModal').classList.remove('active');
            });
        }
        var changePwdModal = document.getElementById('changePwdModal');
        if (changePwdModal) {
            changePwdModal.addEventListener('click', function (e) {
                if (e.target === this) this.classList.remove('active');
            });
        }

        // 管理员入口
        var adminEntry = document.getElementById('adminEntry');
        if (adminEntry) {
            adminEntry.addEventListener('click', function () {
                showAdminLoginModal();
            });
        }

        // 管理员登录
        var btnAdminLogin = document.getElementById('btnAdminLogin');
        if (btnAdminLogin) {
            btnAdminLogin.addEventListener('click', doAdminLogin);
        }
        var cancelAdminLogin = document.getElementById('cancelAdminLogin');
        if (cancelAdminLogin) {
            cancelAdminLogin.addEventListener('click', function () {
                document.getElementById('adminLoginModal').classList.remove('active');
            });
        }
        var adminLoginModal = document.getElementById('adminLoginModal');
        if (adminLoginModal) {
            adminLoginModal.addEventListener('click', function (e) {
                if (e.target === this) this.classList.remove('active');
            });
        }

        // 管理员后台选项卡切换
        var adminTabs = document.querySelectorAll('#adminTabs .admin-tab');
        adminTabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                adminTabs.forEach(function (t) { t.classList.remove('active'); });
                document.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('active'); });
                this.classList.add('active');
                document.getElementById(this.getAttribute('data-tab')).classList.add('active');
            });
        });

        // 管理员修改密码
        var btnAdminChangePwd = document.getElementById('btnAdminChangePwd');
        if (btnAdminChangePwd) {
            btnAdminChangePwd.addEventListener('click', doAdminChangePwd);
        }

        // 返回记录按钮 —— 硬编码DOM切换，100%跳转到排盘记录列表，不经过任何通用跳转函数
        var backToRecords = $('backToRecords');
        if (backToRecords) {
            backToRecords.addEventListener('click', function() {
                // 1. 隐藏排盘结果区
                var resultArea = $('resultArea');
                if (resultArea) {
                    resultArea.style.display = 'none';
                }
                // 2. 隐藏返回按钮自身
                backToRecords.style.display = 'none';
                // 3. 显示输入表单
                var formSection = document.querySelector('.form-section');
                if (formSection) formSection.style.display = '';
                // 4. 清空姓名输入
                $('inputName').value = '';
                // 5. 硬编码切换：直接操作页面DOM，隐藏排盘页、显示记录页
                var pagePaipan = document.getElementById('pagePaipan');
                var pageRecords = document.getElementById('pageRecords');
                if (pagePaipan) pagePaipan.classList.remove('active');
                if (pageRecords) pageRecords.classList.add('active');
                // 6. 更新底部导航高亮（硬编码，不依赖通用函数）
                var navItems = document.querySelectorAll('.nav-item');
                navItems.forEach(function(item) {
                    item.classList.remove('active');
                    if (item.getAttribute('data-page') === 'pageRecords') {
                        item.classList.add('active');
                    }
                });
            });
        }

        // 登录/注册切换（事件委托，避免重复绑定）
        var switchLinkEl = $('switchLink');
        if (switchLinkEl) {
            switchLinkEl.addEventListener('click', function(e) {
                if (e.target && e.target.id === 'switchToRegister') {
                    toggleLoginMode();
                }
            });
        }

        // ====== 事件委托：今日运势日历（#fortuneCalendar） ======
        var fortuneCalEl = $('fortuneCalendar');
        if (fortuneCalEl) {
            fortuneCalEl.addEventListener('click', function(e) {
                var target = e.target;
                // 上一月按钮
                var prevBtn = target.closest('#calPrevMonth');
                if (prevBtn) {
                    var pm = calendarMonth - 1;
                    var py = calendarYear;
                    if (pm < 1) { pm = 12; py--; }
                    calendarYear = py;
                    calendarMonth = pm;
                    calendarDay = 1;
                    fortuneCalEl.innerHTML = renderCalendar(py, pm, 1);
                    updateTodayPaipan(py, pm, 1);
                    return;
                }
                // 下一月按钮
                var nextBtn = target.closest('#calNextMonth');
                if (nextBtn) {
                    var nm = calendarMonth + 1;
                    var ny = calendarYear;
                    if (nm > 12) { nm = 1; ny++; }
                    calendarYear = ny;
                    calendarMonth = nm;
                    calendarDay = 1;
                    fortuneCalEl.innerHTML = renderCalendar(ny, nm, 1);
                    updateTodayPaipan(ny, nm, 1);
                    return;
                }
                // 日期点击
                var dayEl = target.closest('.calendar-day');
                if (dayEl && dayEl.getAttribute('data-year')) {
                    var dy = parseInt(dayEl.getAttribute('data-year'));
                    var dm = parseInt(dayEl.getAttribute('data-month'));
                    var dd = parseInt(dayEl.getAttribute('data-day'));
                    calendarYear = dy;
                    calendarMonth = dm;
                    calendarDay = dd;
                    fortuneCalEl.innerHTML = renderCalendar(dy, dm, dd);
                    updateTodayPaipan(dy, dm, dd);
                }
            });
        }

        // ====== 事件委托：今日运势页面（#pageToday） ======
        var todayPageEl = $('pageToday');
        if (todayPageEl) {
            // 年月选择器 + 时辰按钮委托
            todayPageEl.addEventListener('change', function(e) {
                var target = e.target;
                if (target.id === 'todayPageYear') {
                    var ny = parseInt(target.value);
                    var nm = parseInt(($('todayPageMonth') || {}).value || 1);
                    todayPageYear = ny;
                    todayPageMonth = nm;
                    todayPageDay = 1;
                    renderTodayPageCalendar(ny, nm, 1);
                    renderTodayPagePaipan(ny, nm, 1, todayPageHour);
                } else if (target.id === 'todayPageMonth') {
                    var ny2 = parseInt(($('todayPageYear') || {}).value || 2026);
                    var nm2 = parseInt(target.value);
                    todayPageYear = ny2;
                    todayPageMonth = nm2;
                    todayPageDay = 1;
                    renderTodayPageCalendar(ny2, nm2, 1);
                    renderTodayPagePaipan(ny2, nm2, 1, todayPageHour);
                }
            });
            todayPageEl.addEventListener('click', function(e) {
                // 时辰按钮
                var shichenBtn = e.target.closest('#todayPageShichenBar .shichen-btn');
                if (shichenBtn) {
                    document.querySelectorAll('#todayPageShichenBar .shichen-btn').forEach(function(b) { b.classList.remove('active'); });
                    shichenBtn.classList.add('active');
                    todayPageHour = parseInt(shichenBtn.getAttribute('data-shichen-hour'));
                    renderTodayPagePaipan(todayPageYear, todayPageMonth, todayPageDay, todayPageHour);
                    return;
                }
                // 日历日期点击（#todayPageCalendar 是动态元素，委托到 pageToday）
                var dayEl = e.target.closest('.calendar-day:not(.empty)');
                if (dayEl && dayEl.getAttribute('data-tp-year')) {
                    var dy = parseInt(dayEl.getAttribute('data-tp-year'));
                    var dm = parseInt(dayEl.getAttribute('data-tp-month'));
                    var dd = parseInt(dayEl.getAttribute('data-tp-day'));
                    todayPageYear = dy;
                    todayPageMonth = dm;
                    todayPageDay = dd;
                    renderTodayPageCalendar(dy, dm, dd);
                    renderTodayPagePaipan(dy, dm, dd, todayPageHour);
                }
            });
        }
    }

    // ==================== 页面切换 ====================

    /**
     * 切换底部导航页面
     * @param {string} pageId - 目标页面的ID
     */
    function switchPage(pageId) {
        // 每次切换页面时更新用户信息栏（确保登录状态持久显示）
        updateUserBar();

        // 切换页面显示
        var pages = document.querySelectorAll('.page');
        pages.forEach(function (p) { p.classList.remove('active'); });
        $(pageId).classList.add('active');

        // 切换导航高亮
        var navItems = document.querySelectorAll('#bottomNav .nav-item');
        navItems.forEach(function (item) {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageId) {
                item.classList.add('active');
            }
        });

        // 切换到记录页时刷新记录列表
        if (pageId === 'pageRecords') {
            renderRecords();
        }

        // 切换到管理员页面时刷新数据
        if (pageId === 'pageAdmin') {
            renderAdminPanel();
        }

        // 切换到六爻页面时初始化界面
        if (pageId === 'pageLiuyao') {
            if (typeof LiuYaoUI !== 'undefined' && typeof LiuYaoUI.showPage === 'function') {
                LiuYaoUI.showPage();
            }
        }

        // 切换到今日运势页面时渲染
        if (pageId === 'pageToday') {
            renderTodayPage();
        }

        // 切换到会员页面时渲染
        if (pageId === 'pageVip') {
            renderVipPage();
        }

        // 切换到排盘页面时，恢复显示输入表单并隐藏返回按钮
        if (pageId === 'pagePaipan') {
            var formSection = document.querySelector('.form-section');
            if (formSection) formSection.style.display = '';
            var backBtn = $('backToRecords');
            if (backBtn) backBtn.style.display = 'none';
        }
    }

    // ==================== 排盘功能 ====================

    /**
     * 执行排盘操作
     * 收集表单数据 -> 验证 -> 调用Bazi.generate() -> 渲染结果 -> 保存记录
     */
    function doPaipan() {
        var btn = $('btnPaipan');
        if (btn && btn.disabled) return; // 防止重复点击
        var year = parseInt($('selectYear').value);
        var month = parseInt($('selectMonth').value);
        var day = parseInt($('selectDay').value);
        var hour = parseInt($('selectHour').value);
        var minute = parseInt($('selectMinute').value);
        // 吉时吉分随机逻辑
        if (hour === -1 || minute === -1) {
            var province = $('selectProvince').value;
            if (!province || province === '请选择省份') {
                // 未选地区：随机生成时间
                if (hour === -1) hour = Math.floor(Math.random() * 24);
                if (minute === -1) minute = Math.floor(Math.random() * 60);
            } else {
                // 已选地区：吉时吉分转为0，让真太阳时逻辑处理
                if (hour === -1) hour = 0;
                if (minute === -1) minute = 0;
            }
        }
        var name = $('inputName').value.trim();

        // 输入验证
        if (!name) {
            showToast('请输入姓名');
            $('inputName').focus();
            return;
        }

        // 显示loading状态
        if (btn) {
            btn.disabled = true;
            btn.textContent = '排盘中...';
        }

        // 如果是农历输入，需要转换为公历再排盘
        var solarYear = year;
        var solarMonth = month;
        var solarDay = day;

        if (calendarType === 'lunar') {
            // 检查是否为闰月：通过月份选项的data-leap属性判断
            var selectedMonthOption = $('selectMonth').selectedOptions[0];
            var isLeap = selectedMonthOption && selectedMonthOption.getAttribute('data-leap') === '1';
            var solarResult = Lunar.lunarToSolar(year, month, day, isLeap);
            if (!solarResult) {
                showToast('农历日期转换失败，请检查日期');
                if (btn) { btn.disabled = false; btn.textContent = '开始排盘'; }
                return;
            }
            solarYear = solarResult.year;
            solarMonth = solarResult.month;
            solarDay = solarResult.day;
        }

        // 获取出生地经度
        var provinceName = $('selectProvince').value;
        var cityName = $('selectCity').value;
        var longitude = null;

        if (provinceName && cityName) {
            var coord = CityData.getCoord(provinceName, cityName);
            if (coord) {
                longitude = coord.longitude;
            }
        }

        // 调用排盘引擎
        var result = Bazi.generate(solarYear, solarMonth, solarDay, hour, minute, gender, longitude);

        if (!result) {
            showToast('排盘失败，请检查日期是否在1900-2100范围内');
            if (btn) { btn.disabled = false; btn.textContent = '开始排盘'; }
            return;
        }

        // 渲染排盘结果
        renderResult(result);

        // 保存排盘结果到全局变量（供AI评测使用）
        lastPaipanResult = result;

        // 显示结果区域
        $('resultArea').style.display = 'block';

        // 自动保存记录（如果已登录且非查看模式）- 异步调用
        if (Storage.isLoggedIn() && !_viewingRecord) {
            saveRecordAsync(result, name);
        } else if (!Storage.isLoggedIn()) {
            showToast('排盘成功！登录后可保存记录');
        }

        // 独立滚动：将浏览器窗口重置到页面顶部（不触发任何组件内部状态）
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    /**
     * 渲染排盘结果
     * @param {object} result - Bazi.generate() 返回的排盘结果
     */
    function renderResult(result) {
        // 清理之前动态插入的分析模块（按类名精确清理）
        document.querySelectorAll('.yuanju-analysis, .chenggu-card, .today-fortune, .liuhe-table-card, .realtime-shensha-card, .dayun-liunian-card, .fortune-layout-wrapper, .ai-eval-card, .dayun-flow-table, .gan-relations-card, .zhi-relations-card, .dyt-container, .mingju-analysis-card, .mingli-analysis-card').forEach(function(el) { el.remove(); });
        // 清理动态添加的result-card（保留静态的static-result-card）
        document.querySelectorAll('.result-card:not(.static-result-card)').forEach(function(el) { el.remove(); });
        // 强制清空resultArea中所有非static-result-card的子节点，防止表格叠加
        var ra = $('resultArea');
        if (ra) {
            var staticCard = ra.querySelector('.static-result-card');
            var children = Array.from(ra.children);
            children.forEach(function(child) {
                if (child !== staticCard) {
                    ra.removeChild(child);
                }
            });
        }

        var pillars = result.pillars;

        // 1. 顶部基础信息区
        renderInfoBar(result);

        // 2. 四柱核心表格（十神、天干、地支、藏干、纳音、空亡、神煞）
        renderBaziTable(pillars, result.shenSha, result.kongWang);

        // 3. 天干留意（统一分析器）
        renderGanZhiRelationsUnified(result);

        // 4. 地支留意（统一分析器）
        // 已在 renderGanZhiRelationsUnified 中一并渲染

        // 5. 五行统计
        renderWuXing(result);

        // 6. 大运流年总表（重新设计）
        renderDaYunLiuNianTable(result);

        // 7. 命局基础分析（日元强弱+五行统计+命理提示）
        renderMingJuAnalysis(result);

        // 7.5 命理专业评测（格局/强弱喜忌/调候/神煞/综合评述）
        renderMingLiAnalysis(result);

        // 8. 专业命理评测按钮
        renderAIEvalButton();

        // 恢复排盘按钮状态
        var btn2 = $('btnPaipan');
        if (btn2) {
            btn2.disabled = false;
            btn2.textContent = '开始排盘';
        }
    }

    /**
     * 渲染基本信息栏
     */
    function renderInfoBar(result) {
        var sd = result.solarDate;
        var ld = result.lunarDate;
        var p = result.pillars;
        var html = '';

        // 姓名
        var name = $('inputName').value.trim();
        html += '<div class="info-item"><span class="info-label">姓名：</span><span class="info-value">' + escapeHtml(name) + '</span></div>';

        // 五行（姓名五行分析）
        var nameWxText = analyzeNameWuXing(name);
        html += '<div class="info-item"><span class="info-label">五行：</span><span class="info-value">' + nameWxText + '</span></div>';

        // 性别
        html += '<div class="info-item"><span class="info-label">性别：</span><span class="info-value">' + result.gender + '</span></div>';

        // 胎元
        if (result.taiYuan) {
            html += '<div class="info-item"><span class="info-label">胎元：</span><span class="info-value">' + result.taiYuan.ganZhi + '[' + result.taiYuan.naiYin + ']</span></div>';
        }

        // 命宫
        if (result.mingGong) {
            html += '<div class="info-item"><span class="info-label">命宫：</span><span class="info-value">' + result.mingGong.ganZhi + '[' + result.mingGong.naiYin + ']</span></div>';
        }

        // 节气
        if (result.solarTermInfo) {
            var stInfo = result.solarTermInfo;
            var stText = '';
            if (stInfo.xiaohan) stText += '小寒 ' + stInfo.xiaohan;
            if (stInfo.lichun) stText += (stText ? '  ' : '') + '立春 ' + stInfo.lichun;
            if (!stText) stText = String(stInfo);
            html += '<div class="info-item"><span class="info-label">节气：</span><span class="info-value">' + stText + '</span></div>';
        }

        // 起运
        if (result.daYun && result.daYun.startAge) {
            html += '<div class="info-item"><span class="info-label">起运：</span><span class="info-value">命主于出生后' + result.daYun.startAge.years + '年' + result.daYun.startAge.months + '个月' + (result.daYun.startAge.days || '') + '天' + (result.daYun.startAge.hours || '') + '小时起运</span></div>';
        }

        // 排盘方式
        html += '<div class="info-item"><span class="info-label">排盘方式：</span><span class="info-value">' + (calendarType === 'lunar' ? '农历排盘' : '公历排盘') + '</span></div>';

        // 交运
        if (result.jiaoYun) {
            html += '<div class="info-item"><span class="info-label">交运：</span><span class="info-value">' + result.jiaoYun + '</span></div>';
        }

        // 换运
        if (result.huanYun) {
            html += '<div class="info-item"><span class="info-label">换运：</span><span class="info-value">' + result.huanYun + '</span></div>';
        }

        // 公历日期
        html += '<div class="info-item"><span class="info-label">公历：</span><span class="info-value">' + sd.year + '年' + padZero(sd.month) + '月' + padZero(sd.day) + '日 ' + padZero(sd.hour) + ':' + padZero(sd.minute) + '</span></div>';

        // 农历日期
        var hourZhiName = result.pillars ? result.pillars.hour.zhi : '';
        html += '<div class="info-item"><span class="info-label">农历：</span><span class="info-value">' + ld.year + '年' + ld.monthName + ld.dayName + hourZhiName + '时</span></div>';

        // 生肖
        html += '<div class="info-item"><span class="info-label">生肖：</span><span class="info-value">' + ld.shengXiao + '</span></div>';

        // 真太阳时
        if (result.trueSolarTime) {
            html += '<div class="info-item"><span class="info-label">真太阳时：</span><span class="info-value">' + padZero(result.trueSolarTime.trueHour) + ':' + padZero(result.trueSolarTime.trueMinute) + '</span></div>';
        }

        var infoBarEl = $('infoBar');
        if (!infoBarEl) {
            // 如果infoBar被意外移除，重新创建
            var staticCard = document.querySelector('.static-result-card');
            if (staticCard) {
                var titleEl = staticCard.querySelector('.result-title');
                infoBarEl = document.createElement('div');
                infoBarEl.className = 'info-bar';
                infoBarEl.id = 'infoBar';
                if (titleEl && titleEl.nextSibling) {
                    staticCard.insertBefore(infoBarEl, titleEl.nextSibling);
                } else {
                    staticCard.appendChild(infoBarEl);
                }
            } else {
                return; // 无法恢复
            }
        }
        infoBarEl.innerHTML = html;
    }

    /**
     * 渲染四柱八字表格
     * @param {object} pillars - 四柱数据 {year, month, day, hour}
     */
    function renderBaziTable(pillars, shenSha, kongWang) {
        var pillarNames = ['年柱', '月柱', '日柱', '时柱'];
        var pillarKeys = ['year', 'month', 'day', 'hour'];
        var html = '';

        // 第一行：十神
        var genderLabel = (gender === 1) ? '元男' : '元女';
        html += '<tr>';
        html += '<td class="label-cell">十神</td>';
        pillarKeys.forEach(function (key) {
            var ss = pillars[key].shiShen;
            if (ss === '日主') ss = genderLabel;
            html += '<td class="shishen-cell">' + ss + '</td>';
        });
        html += '</tr>';

        // 第二行：天干（带五行颜色）- 深色
        html += '<tr class="bazi-bg-dark">';
        html += '<td class="label-cell">天干</td>';
        pillarKeys.forEach(function (key) {
            html += '<td class="gan-cell" style="color:' + getGanColor(pillars[key].ganIndex) + '">' + pillars[key].gan + '</td>';
        });
        html += '</tr>';

        // 第三行：地支（带五行颜色）
        html += '<tr>';
        html += '<td class="label-cell">地支</td>';
        pillarKeys.forEach(function (key) {
            html += '<td class="zhi-cell" style="color:' + getZhiColor(pillars[key].zhiIndex) + '">' + pillars[key].zhi + '</td>';
        });
        html += '</tr>';

        // 第四行：藏干（每个藏干+十神单独一行，垂直排列）- 深色
        html += '<tr class="bazi-bg-dark">';
        html += '<td class="label-cell">藏干</td>';
        pillarKeys.forEach(function (key) {
            var cgHtml = pillars[key].cangGan.map(function (cg) {
                var cgIdx = Lunar.tianGan.indexOf(cg.gan);
                var ssName = Lunar.getShiShen(pillars.day.ganIndex, cgIdx);
                return '<div class="canggan-item"><span style="color:' + getGanColor(cgIdx) + '">' + cg.gan + '</span><span class="canggan-ss">(' + ssName + ')</span></div>';
            }).join('');
            html += '<td class="canggan-cell">' + cgHtml + '</td>';
        });
        html += '</tr>';

        // 第五行：纳音 - 浅色
        html += '<tr class="bazi-bg-light">';
        html += '<td class="label-cell">纳音</td>';
        pillarKeys.forEach(function (key) {
            html += '<td class="nayin-cell">' + pillars[key].naiYin + '</td>';
        });
        html += '</tr>';

        // 空亡行
        if (kongWang) {
            html += '<tr class="bazi-bg-dark">';
            html += '<td class="label-cell">空亡</td>';
            pillarKeys.forEach(function (key) {
                var kw = kongWang[key] || [];
                html += '<td class="kongwang-cell">' + kw.join(' ') + '</td>';
            });
            html += '</tr>';
        }

        // 第六行：神煞（每个神煞单独一行，垂直排列）
        if (shenSha) {
            html += '<tr>';
            html += '<td class="label-cell">神煞</td>';
            pillarKeys.forEach(function (key) {
                var ssList = shenSha[key] || [];
                var ssHtml = ssList.map(function (ss) {
                    return '<div class="shensha-item">' + ss + '</div>';
                }).join('');
                html += '<td class="shensha-cell">' + ssHtml + '</td>';
            });
            html += '</tr>';
        }

        var baziBody = $('baziTableBody');
        if (baziBody) baziBody.innerHTML = html;
    }

    /**
     * 渲染天干留意 / 地支留意
     * @param {object} result - 排盘结果
     * @param {string} type - 'gan' 或 'zhi'
     */
    function renderGanZhiRelations(result, type) {
        var p = result.pillars;
        var ganIndices = [p.year.ganIndex, p.month.ganIndex, p.day.ganIndex, p.hour.ganIndex];
        var zhiIndices = [p.year.zhiIndex, p.month.zhiIndex, p.day.zhiIndex, p.hour.zhiIndex];
        var pillarNames = ['年柱', '月柱', '日柱', '时柱'];
        var relations = [];

        if (type === 'gan') {
            // 天干合化
            for (var i = 0; i < ganIndices.length; i++) {
                for (var j = i + 1; j < ganIndices.length; j++) {
                    var he = Lunar.getTianGanHe(ganIndices[i], ganIndices[j]);
                    if (he) relations.push(pillarNames[i] + pillarNames[j] + '：' + he);
                }
            }
            var title = '天干留意';
        } else {
            // 地支冲合破
            for (var i = 0; i < zhiIndices.length; i++) {
                for (var j = i + 1; j < zhiIndices.length; j++) {
                    var chong = Lunar.getDiZhiChong(zhiIndices[i], zhiIndices[j]);
                    if (chong) relations.push(pillarNames[i] + pillarNames[j] + '：' + chong);
                    var po = Lunar.getDiZhiPo(zhiIndices[i], zhiIndices[j]);
                    if (po) relations.push(pillarNames[i] + pillarNames[j] + '：' + po);
                }
            }
            var title = '地支留意';
        }

        var html = '<div class="result-card ' + (type === 'gan' ? 'gan-relations-card' : 'zhi-relations-card') + '">';
        html += '<div class="result-title">' + title + '</div>';
        html += '<div class="paipan-desc">';
        html += relations.length > 0 ? relations.join('；') : '无';
        html += '</div></div>';

        var ra = $('resultArea');
        if (ra) {
            var div = document.createElement('div');
            div.innerHTML = html;
            ra.appendChild(div);
        }
    }

    /**
     * 渲染天干地支关系（统一分析器）
     */
    function renderGanZhiRelationsUnified(result) {
        if (!result || !result.pillars) return;
        var p = result.pillars;
        var baziForAnalyze = {
            year: { gan: p.year.gan, zhi: p.year.zhi },
            month: { gan: p.month.gan, zhi: p.month.zhi },
            day: { gan: p.day.gan, zhi: p.day.zhi },
            hour: { gan: p.hour.gan, zhi: p.hour.zhi }
        };
        var analysis = RelationAnalyzer.analyzeRelations(baziForAnalyze);

        // 天干留意
        var tgHtml = '<div class="result-card gan-relations-card"><div class="result-title">天干留意</div>';
        if (analysis.tianGanRelations.length > 0) {
            analysis.tianGanRelations.forEach(function(r) {
                var color = r.category === '冲' ? '#DC143C' : '#2E8B57';
                tgHtml += '<div style="padding:6px 0;font-size:13px;"><span style="color:' + color + ';font-weight:bold;">' + r.name + '</span> <span style="color:#999;">（' + r.pos1 + '柱' + r.gan1 + ' ↔ ' + r.pos2 + '柱' + r.gan2 + '）</span></div>';
            });
        } else {
            tgHtml += '<div style="padding:6px 0;font-size:13px;color:#999;">天干无冲合关系</div>';
        }
        tgHtml += '</div>';

        // 地支留意
        var dzHtml = '<div class="result-card zhi-relations-card"><div class="result-title">地支留意</div>';
        if (analysis.diZhiRelations.length > 0) {
            analysis.diZhiRelations.forEach(function(r) {
                var colors = { '刑': '#8B0000', '冲': '#DC143C', '害': '#FF6347', '破': '#FF8C00', '合': '#2E8B57', '会': '#4169E1' };
                var color = colors[r.category] || '#333';
                dzHtml += '<div style="padding:6px 0;font-size:13px;"><span style="color:' + color + ';font-weight:bold;">[' + r.category + '] ' + r.display + '</span></div>';
            });
        } else {
            dzHtml += '<div style="padding:6px 0;font-size:13px;color:#999;">地支无特殊关系</div>';
        }
        dzHtml += '<div style="padding:6px 0;font-size:11px;color:#bbb;">以上为传统命理文化推演，仅供了解参考，不构成任何人生决策依据。</div></div>';

        var ra = $('resultArea');
        if (ra) {
            var div = document.createElement('div');
            div.innerHTML = tgHtml + dzHtml;
            ra.appendChild(div);
        }
    }

    /**
     * 渲染五行统计
     */
    function renderWuXing(result) {
        var wx = result.wuXing;
        var wxClassMap = {
            '金': 'wx-jin',
            '木': 'wx-mu',
            '水': 'wx-shui',
            '火': 'wx-huo',
            '土': 'wx-tu'
        };

        var html = '';
        ['木', '火', '土', '金', '水'].forEach(function (name) {
            html += '<div class="wuxing-item">';
            html += '<div class="wx-name ' + wxClassMap[name] + '">' + name + '</div>';
            html += '<div class="wx-count">' + (wx[name] || 0) + '</div>';
            html += '</div>';
        });

        var wxBar = $('wuxingBar');
        if (wxBar) wxBar.innerHTML = html;
    }

    /**
     * 渲染万年历日历
     */
    function renderCalendar(year, month, selectedDay) {
        var weekHeaders = ['日', '一', '二', '三', '四', '五', '六'];
        var firstDay = new Date(year, month - 1, 1).getDay();
        var daysInMonth = new Date(year, month, 0).getDate();

        var html = '<div style="margin-bottom:10px;">';
        // 年月切换
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
        html += '<button id="calPrevMonth" class="cal-nav-btn-inline">&lt;</button>';
        html += '<span style="font-size:14px;font-weight:600;">' + year + '年' + padZero(month) + '月</span>';
        html += '<button id="calNextMonth" class="cal-nav-btn-inline">&gt;</button>';
        html += '</div>';

        // 星期头
        html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;text-align:center;">';
        weekHeaders.forEach(function(w) {
            html += '<div style="font-size:11px;color:var(--text-light);padding:4px 0;">' + w + '</div>';
        });

        // 空白填充
        for (var i = 0; i < firstDay; i++) {
            html += '<div></div>';
        }

        // 日期格子
        for (var d = 1; d <= daysInMonth; d++) {
            var isSelected = (d === selectedDay);
            // 使用轻量级方法获取干支和农历日，避免完整排盘计算
            var lunarDate = Lunar.solarToLunar(year, month, d);
            var dayGZ = Lunar.getDayGanZhi(year, month, d);
            var lunarStr = lunarDate ? Lunar.getLunarDayName(lunarDate.day) : '';
            var gzStr = dayGZ ? dayGZ.gan + dayGZ.zhi : '';
            html += '<div class="calendar-day' + (isSelected ? ' selected' : '') + '" data-year="' + year + '" data-month="' + month + '" data-day="' + d + '" style="padding:4px 2px;font-size:11px;cursor:pointer;border-radius:4px;background:' + (isSelected ? 'var(--red-primary)' : 'transparent') + ';color:' + (isSelected ? '#fff' : 'var(--text-primary)') + ';">';
            html += '<div style="font-weight:600;">' + d + '</div>';
            html += '<div style="font-size:9px;color:' + (isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-light)') + ';">' + lunarStr + '</div>';
            html += '<div style="font-size:9px;color:' + (isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-light)') + ';">' + gzStr + '</div>';
            html += '</div>';
        }

        html += '</div></div>';

        // 事件已通过bindEvents中的事件委托处理，无需setTimeout绑定

        return html;
    }

    /**
     * 更新当日排盘（切换日期后）
     */
    function updateTodayPaipan(y, m, d) {
        var h = new Date().getHours();
        var result = Bazi.generate(y, m, d, h, 0, 1, null);
        if (!result) return;
        var tableContainer = document.getElementById('todayPaipanTable');
        if (tableContainer) tableContainer.innerHTML = renderTodayPaipanTable(result.pillars, result);
        var infoContainer = document.getElementById('todayGanZhiInfo');
        if (infoContainer) infoContainer.innerHTML = renderTodayGanZhiInfo(result);

        // 更新时辰按钮高亮
        var shichenBtns = document.querySelectorAll('.shichen-btn');
        var activeIdx = Math.floor((h + 1) / 2) % 12;
        shichenBtns.forEach(function(btn, idx) {
            if (idx === activeIdx) {
                btn.classList.add('active');
                btn.style.background = 'var(--red-primary)';
                btn.style.color = '#fff';
            } else {
                btn.classList.remove('active');
                btn.style.background = 'var(--bg-secondary)';
                btn.style.color = 'var(--text-primary)';
            }
        });
    }

    /**
     * 渲染当日排盘表格（带五行颜色）
     */
    function renderTodayPaipanTable(pillars, result) {
        var pillarKeys = ['year', 'month', 'day', 'hour'];
        var pillarLabels = ['年柱', '月柱', '日柱', '时柱'];
        var shenSha = result.shenSha || {};

        var html = '<table class="bazi-table" style="margin-bottom:10px;"><thead><tr><th></th>';
        pillarLabels.forEach(function(l) { html += '<th>' + l + '</th>'; });
        html += '</tr></thead><tbody>';

        // 十神行
        html += '<tr><td class="today-label-cell">十神</td>';
        pillarKeys.forEach(function(key) {
            html += '<td style="font-size:11px;">' + pillars[key].shiShen + '</td>';
        });
        html += '</tr>';

        // 天干行（带颜色）
        html += '<tr><td class="today-label-cell">天干</td>';
        pillarKeys.forEach(function(key) {
            html += '<td style="font-size:14px;font-weight:700;color:' + getGanColor(pillars[key].ganIndex) + '">' + pillars[key].gan + '</td>';
        });
        html += '</tr>';

        // 地支行（带颜色）
        html += '<tr><td class="today-label-cell">地支</td>';
        pillarKeys.forEach(function(key) {
            html += '<td style="font-size:14px;font-weight:700;color:' + getZhiColor(pillars[key].zhiIndex) + '">' + pillars[key].zhi + '</td>';
        });
        html += '</tr>';

        // 藏干行（带颜色）
        html += '<tr><td class="today-label-cell">藏干</td>';
        pillarKeys.forEach(function(key) {
            var cgStr = pillars[key].cangGan.map(function(cg) {
                var idx = Lunar.tianGan.indexOf(cg.gan);
                return '<span style="color:' + getGanColor(idx) + ';font-size:11px;">' + cg.gan + '</span>';
            }).join(' ');
            html += '<td>' + cgStr + '</td>';
        });
        html += '</tr>';

        // 空亡行
        html += '<tr><td class="today-label-cell">空亡</td>';
        var dayGanIdx = pillars.day.ganIndex;
        pillarKeys.forEach(function(key) {
            var kw = Lunar.isKongWang(dayGanIdx, pillars[key].zhiIndex) ? '空' : '';
            html += '<td style="font-size:11px;color:' + (kw ? 'var(--red-primary)' : 'var(--text-light)') + ';">' + kw + '</td>';
        });
        html += '</tr>';

        // 纳音行
        html += '<tr><td class="today-label-cell">纳音</td>';
        pillarKeys.forEach(function(key) {
            html += '<td style="font-size:11px;color:var(--text-secondary);">' + pillars[key].naiYin + '</td>';
        });
        html += '</tr>';

        // 神煞行
        html += '<tr class="shensha-row"><td class="today-label-cell">神煞</td>';
        pillarKeys.forEach(function(key) {
            var ssList = shenSha[key] || [];
            html += '<td style="font-size:10px;color:var(--text-secondary);">' + ssList.join('、') + '</td>';
        });
        html += '</tr>';

        html += '</tbody></table>';
        return html;
    }

    /**
     * 渲染天干留意、地支留意信息
     */
    function renderTodayGanZhiInfo(result) {
        var p = result.pillars;
        var dayGanIdx = p.day.ganIndex;
        var zhiIndices = [p.year.zhiIndex, p.month.zhiIndex, p.day.zhiIndex, p.hour.zhiIndex];
        var ganIndices = [p.year.ganIndex, p.month.ganIndex, p.day.ganIndex, p.hour.ganIndex];
        var pillarNames = ['年柱', '月柱', '日柱', '时柱'];

        // 天干刑冲合害
        var tgRelations = [];
        for (var i = 0; i < ganIndices.length; i++) {
            for (var j = i + 1; j < ganIndices.length; j++) {
                var he = Lunar.getTianGanHe(ganIndices[i], ganIndices[j]);
                if (he) tgRelations.push(pillarNames[i] + pillarNames[j] + '：' + he);
            }
        }

        // 地支刑冲合害
        var dzRelations = [];
        for (var i = 0; i < zhiIndices.length; i++) {
            for (var j = i + 1; j < zhiIndices.length; j++) {
                var he = Lunar.getDiZhiHe(zhiIndices[i], zhiIndices[j]);
                if (he) dzRelations.push(pillarNames[i] + pillarNames[j] + '：' + he);
                var chong = Lunar.getDiZhiChong(zhiIndices[i], zhiIndices[j]);
                if (chong) dzRelations.push(pillarNames[i] + pillarNames[j] + '：' + chong);
                var xing = Lunar.getDiZhiXing(zhiIndices[i], zhiIndices[j]);
                if (xing) dzRelations.push(pillarNames[i] + pillarNames[j] + '：' + xing);
                var hai = Lunar.getDiZhiHai(zhiIndices[i], zhiIndices[j]);
                if (hai) dzRelations.push(pillarNames[i] + pillarNames[j] + '：' + hai);
            }
        }

        var html = '';
        html += '<div style="margin-top:10px;padding:8px;background:var(--bg-secondary);border-radius:6px;">';
        html += '<div class="relation-title">天干留意</div>';
        html += '<div class="relation-desc">' + (tgRelations.length > 0 ? tgRelations.join('；') : '无天干合化冲克') + '</div>';
        html += '</div>';
        html += '<div style="margin-top:6px;padding:8px;background:var(--bg-secondary);border-radius:6px;">';
        html += '<div class="relation-title">地支留意</div>';
        html += '<div class="relation-desc">' + (dzRelations.length > 0 ? dzRelations.join('；') : '无地支刑冲合害') + '</div>';
        html += '</div>';

        return html;
    }

    /**
     * 加载大黄道吉日列表（近30天）
     */
    function loadDaHuangDaoList() {
        var el = document.getElementById('daHuangDaoList');
        if (!el) return;
        if (el.getAttribute('data-loaded') === 'true') return;
        el.setAttribute('data-loaded', 'true');

        var now = new Date();
        var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
        var daHuangDao = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
        var jiZhi = { '建': true, '除': true, '满': true, '平': true, '定': true, '执': true };
        var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        var html = '';

        for (var i = 0; i < 30; i++) {
            var checkDate = new Date(y, m - 1, d + i);
            var cy = checkDate.getFullYear(), cm = checkDate.getMonth() + 1, cd = checkDate.getDate();
            var ch = checkDate.getHours();
            var result = Bazi.generate(cy, cm, cd, ch, 0, 1, null);
            if (!result) continue;

            var tp = result.pillars;
            var daHDIdx = (tp.day.zhiIndex - (tp.month.zhiIndex % 12) + 24) % 12;
            var value = daHuangDao[daHDIdx];
            var isJi = jiZhi[value];
            var dow = checkDate.getDay();

            if (isJi) {
                html += '<div style="padding:4px 0;border-bottom:1px solid var(--border-color);">';
                html += '<span class="jiri-date">' + cy + '/' + padZero(cm) + '/' + padZero(cd) + ' 周' + weekDays[dow] + '</span>';
                html += ' <span class="jiri-value">' + value + '</span>';
                html += ' <span style="color:var(--text-light);">(' + tp.day.ganZhi + ')</span>';
                html += '</div>';
            }
        }

        if (!html) {
            html = '<div style="color:var(--text-light);">近30天无大黄道吉日</div>';
        }
        el.innerHTML = html;
    }

    /**
     * 加载小黄道吉日列表（近30天）
     */
    function loadXiaoHuangDaoList() {
        var el = document.getElementById('xiaoHuangDaoList');
        if (!el) return;
        if (el.getAttribute('data-loaded') === 'true') return;
        el.setAttribute('data-loaded', 'true');

        var now = new Date();
        var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
        var xingXiu = ['角', '亢', '氐', '房', '心', '尾', '箕', '斗', '牛', '女', '虚', '危', '室', '壁', '奎', '娄', '胃', '昴', '毕', '觜', '参', '井', '鬼', '柳', '星', '张', '翼', '轸'];
        // 吉宿：角、房、尾、斗、室、壁、奎、胃、昴、井、张、翼
        var jiXiu = { '角': true, '房': true, '尾': true, '斗': true, '室': true, '壁': true, '奎': true, '胃': true, '昴': true, '井': true, '张': true, '翼': true };
        var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        var html = '';

        for (var i = 0; i < 30; i++) {
            var checkDate = new Date(y, m - 1, d + i);
            var cy = checkDate.getFullYear(), cm = checkDate.getMonth() + 1, cd = checkDate.getDate();
            var ch = checkDate.getHours();
            var result = Bazi.generate(cy, cm, cd, ch, 0, 1, null);
            if (!result) continue;

            var tp = result.pillars;
            var xhdIdx = (tp.day.zhiIndex * 2 + tp.day.ganIndex) % 28;
            var xiu = xingXiu[xhdIdx];
            var isJi = jiXiu[xiu];
            var dow = checkDate.getDay();

            if (isJi) {
                html += '<div style="padding:4px 0;border-bottom:1px solid var(--border-color);">';
                html += '<span class="jiri-date">' + cy + '/' + padZero(cm) + '/' + padZero(cd) + ' 周' + weekDays[dow] + '</span>';
                html += ' <span class="jiri-value">' + xiu + '宿</span>';
                html += ' <span style="color:var(--text-light);">(' + tp.day.ganZhi + ')</span>';
                html += '</div>';
            }
        }

        if (!html) {
            html = '<div style="color:var(--text-light);">近30天无小黄道吉日</div>';
        }
        el.innerHTML = html;
    }

    // ==================== 今日运势独立页面 ====================

    // 今日运势页面选中的日期时辰状态
    var todayPageYear, todayPageMonth, todayPageDay, todayPageHour;

    /**
     * 渲染今日运势独立页面
     * 包含年月选择器、日历、十二时辰栏、完整八字排盘
     */
    function renderTodayPage() {
        var now = new Date();
        var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate(), h = now.getHours();

        // 初始化状态
        todayPageYear = y;
        todayPageMonth = m;
        todayPageDay = d;
        todayPageHour = Math.floor(h / 2) * 2;

        var container = $('todayContent');
        if (!container) return;

        var html = '';

        // ====== 顶部：年月选择器 ======
        html += '<div class="today-page-selector">';
        html += '<div class="today-page-selector-row">';
        html += '<label class="today-page-label">选择年月：</label>';
        html += '<select id="todayPageYear" class="today-page-select">';
        for (var sy = 1900; sy <= 2100; sy++) {
            html += '<option value="' + sy + '"' + (sy === y ? ' selected' : '') + '>' + sy + '年</option>';
        }
        html += '</select>';
        html += '<select id="todayPageMonth" class="today-page-select">';
        for (var sm = 1; sm <= 12; sm++) {
            html += '<option value="' + sm + '"' + (sm === m ? ' selected' : '') + '>' + padZero(sm) + '月</option>';
        }
        html += '</select>';
        html += '</div>';
        html += '</div>';

        // ====== 中部：日历 ======
        html += '<div id="todayPageCalendar" class="today-page-calendar">';
        html += '</div>';

        // ====== 十二时辰选择栏 ======
        html += '<div class="shichen-bar">';
        html += '<div class="shichen-title">选择时辰</div>';
        html += '<div class="shichen-list" id="todayPageShichenBar">';
        var shiChenNames = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
        var shiChenHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
        var shiChenRanges = ['23:00-01:00', '01:00-03:00', '03:00-05:00', '05:00-07:00', '07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00', '21:00-23:00'];
        shiChenNames.forEach(function(sc, idx) {
            var isActive = (shiChenHours[idx] === todayPageHour);
            html += '<button class="shichen-btn' + (isActive ? ' active' : '') + '" data-shichen-idx="' + idx + '" data-shichen-hour="' + shiChenHours[idx] + '" title="' + sc + ' ' + shiChenRanges[idx] + '">';
            html += '<span class="shichen-name">' + sc + '</span>';
            html += '<span class="shichen-range">' + shiChenRanges[idx] + '</span>';
            html += '</button>';
        });
        html += '</div>';
        html += '</div>';

        // ====== 底部：排盘结果区域 ======
        html += '<div id="todayPageResult" class="today-page-result">';
        html += '</div>';

        // ====== 入口按钮 ======
        html += '<div style="display:flex;gap:12px;margin-top:20px;padding:0 16px;">';
        html += '<button onclick="switchPage(\'pageVip\')" style="flex:1;padding:14px;border:2px solid var(--gold);background:linear-gradient(135deg,#FFF8EE,#FFF);border-radius:12px;color:var(--text-primary);font-size:15px;font-weight:600;cursor:pointer;">';
        html += '👑 会员套餐';
        html += '</button>';
        html += '</div>';

        container.innerHTML = html;

        // 渲染日历
        renderTodayPageCalendar(y, m, d);

        // 渲染初始排盘
        renderTodayPagePaipan(y, m, d, todayPageHour);

        // 事件已通过bindEvents中的事件委托处理，无需setTimeout绑定
    }

    /**
     * 渲染今日运势页面的日历
     */
    function renderTodayPageCalendar(year, month, selectedDay) {
        var weekHeaders = ['日', '一', '二', '三', '四', '五', '六'];
        var firstDay = new Date(year, month - 1, 1).getDay();
        var daysInMonth = new Date(year, month, 0).getDate();
        var today = new Date();
        var isCurrentMonth = (year === today.getFullYear() && month === today.getMonth() + 1);

        // 上月末天数
        var prevMonth = month - 1;
        var prevYear = year;
        if (prevMonth < 1) { prevMonth = 12; prevYear--; }
        var daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

        var html = '<div class="calendar-grid">';
        // 星期头
        html += '<div class="calendar-weekday">';
        weekHeaders.forEach(function(w, wi) {
            var isWeekend = (wi === 0 || wi === 6);
            html += '<div class="calendar-weekday-cell' + (isWeekend ? ' weekend' : '') + '">' + w + '</div>';
        });
        html += '</div>';

        // 日期格子
        html += '<div class="calendar-days">';
        // 上月补位日期（灰色显示）
        for (var i = 0; i < firstDay; i++) {
            var prevDay = daysInPrevMonth - firstDay + 1 + i;
            html += '<div class="calendar-day empty other-month">';
            html += '<div class="day-solar">' + prevDay + '</div>';
            html += '</div>';
        }

        for (var d = 1; d <= daysInMonth; d++) {
            var isSelected = (d === selectedDay);
            var isToday = isCurrentMonth && (d === today.getDate());
            var dow = new Date(year, month - 1, d).getDay();
            var isWeekend = (dow === 0 || dow === 6);

            // 获取干支信息（使用轻量级方法）
            var gzStr = '';
            var lunarStr = '';
            try {
                var tpLunar = Lunar.solarToLunar(year, month, d);
                var tpDayGZ = Lunar.getDayGanZhi(year, month, d);
                if (tpLunar) lunarStr = Lunar.getLunarDayName(tpLunar.day);
                if (tpDayGZ) gzStr = tpDayGZ.gan + tpDayGZ.zhi;
            } catch(e) { console.warn('[Calendar] 干支计算异常:', e); }

            html += '<div class="calendar-day' + (isSelected ? ' selected' : '') + (isToday ? ' today' : '') + (isWeekend ? ' weekend' : '') + '" data-tp-year="' + year + '" data-tp-month="' + month + '" data-tp-day="' + d + '">';
            html += '<div class="day-solar">' + d + '</div>';
            html += '<div class="day-lunar">' + lunarStr + '</div>';
            html += '<div class="day-ganzhi">' + gzStr + '</div>';
            html += '</div>';
        }

        // 下月补位日期（灰色显示）
        var totalCells = firstDay + daysInMonth;
        var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (var j = 1; j <= remaining; j++) {
            html += '<div class="calendar-day empty other-month">';
            html += '<div class="day-solar">' + j + '</div>';
            html += '</div>';
        }

        html += '</div>';
        html += '</div>';

        var calEl = document.getElementById('todayPageCalendar');
        if (calEl) calEl.innerHTML = html;

        // 事件已通过bindEvents中的事件委托处理，无需setTimeout绑定
    }

    /**
     * 渲染今日运势页面的八字排盘
     */
    function renderTodayPagePaipan(year, month, day, hour) {
        var result = Bazi.generate(year, month, day, hour, 0, 1, 116.4);
        if (!result) return;

        var p = result.pillars;
        var shenSha = result.shenSha || {};
        var kongWang = result.kongWang || {};
        var wx = result.wuXing || {};
        var sd = result.solarDate;
        var ld = result.lunarDate;

        var html = '';

        // 日期信息栏
        html += '<div class="today-page-info">';
        html += '<div class="info-item"><span class="info-label">公历：</span><span class="info-value">' + sd.year + '年' + padZero(sd.month) + '月' + padZero(sd.day) + '日 ' + padZero(hour) + '时</span></div>';
        html += '<div class="info-item"><span class="info-label">农历：</span><span class="info-value">' + ld.year + '年' + ld.monthName + ld.dayName + '</span></div>';
        html += '<div class="info-item"><span class="info-label">生肖：</span><span class="info-value">' + ld.shengXiao + '</span></div>';
        if (result.solarTermInfo) {
            html += '<div class="info-item"><span class="info-label">节气：</span><span class="info-value">' +
                (result.solarTermInfo ?
                    ((result.solarTermInfo.xiaohan ? '小寒 ' + result.solarTermInfo.xiaohan : '') +
                     (result.solarTermInfo.lichun ? '  立春 ' + result.solarTermInfo.lichun : ''))
                    : '—') + '</span></div>';
        }
        html += '</div>';

        // 四柱八字表格
        var pillarKeys = ['year', 'month', 'day', 'hour'];
        var pillarLabels = ['年柱', '月柱', '日柱', '时柱'];

        html += '<div class="result-card bazi-table-card">';
        html += '<div class="result-title">八字排盘</div>';
        html += '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;"><table class="bazi-table"><thead><tr><th></th>';
        pillarLabels.forEach(function(l) { html += '<th>' + l + '</th>'; });
        html += '</tr></thead><tbody>';

        // 十神行
        var genderLabel = (gender === 1) ? '元男' : '元女';
        html += '<tr>';
        html += '<td class="label-cell">十神</td>';
        pillarKeys.forEach(function(key) {
            var ss = p[key].shiShen;
            if (ss === '日主') ss = genderLabel;
            html += '<td class="shishen-cell">' + ss + '</td>';
        });
        html += '</tr>';

        // 天干行（深色背景）
        html += '<tr class="bazi-bg-dark">';
        html += '<td class="label-cell">天干</td>';
        pillarKeys.forEach(function(key) {
            html += '<td class="gan-cell" style="color:' + getGanColor(p[key].ganIndex) + '">' + p[key].gan + '</td>';
        });
        html += '</tr>';

        // 地支行
        html += '<tr>';
        html += '<td class="label-cell">地支</td>';
        pillarKeys.forEach(function(key) {
            html += '<td class="zhi-cell" style="color:' + getZhiColor(p[key].zhiIndex) + '">' + p[key].zhi + '</td>';
        });
        html += '</tr>';

        // 藏干行（每个藏干+十神单独一行，垂直排列，深色背景）
        html += '<tr class="bazi-bg-dark">';
        html += '<td class="label-cell">藏干</td>';
        pillarKeys.forEach(function(key) {
            var cgHtml = p[key].cangGan.map(function(cg) {
                var cgIdx = Lunar.tianGan.indexOf(cg.gan);
                var ssName = Lunar.getShiShen(p.day.ganIndex, cgIdx);
                return '<div class="canggan-item"><span style="color:' + getGanColor(cgIdx) + '">' + cg.gan + '</span><span class="canggan-ss">(' + ssName + ')</span></div>';
            }).join('');
            html += '<td class="canggan-cell">' + cgHtml + '</td>';
        });
        html += '</tr>';

        // 纳音行（浅色背景）
        html += '<tr class="bazi-bg-light">';
        html += '<td class="label-cell">纳音</td>';
        pillarKeys.forEach(function(key) {
            html += '<td class="nayin-cell">' + p[key].naiYin + '</td>';
        });
        html += '</tr>';

        // 空亡行（深色背景）
        if (kongWang) {
            html += '<tr class="bazi-bg-dark">';
            html += '<td class="label-cell">空亡</td>';
            pillarKeys.forEach(function(key) {
                var kw = kongWang[key] || [];
                html += '<td class="kongwang-cell">' + kw.join(' ') + '</td>';
            });
            html += '</tr>';
        }

        // 神煞行（每个神煞单独一行，垂直排列）
        if (shenSha) {
            html += '<tr>';
            html += '<td class="label-cell">神煞</td>';
            pillarKeys.forEach(function(key) {
                var ssList = shenSha[key] || [];
                var ssHtml = ssList.map(function(ss) {
                    return '<div class="shensha-item">' + ss + '</div>';
                }).join('');
                html += '<td class="shensha-cell">' + ssHtml + '</td>';
            });
            html += '</tr>';
        }

        html += '</tbody></table></div></div>';

        // 五行统计（带比例条形图）
        html += '<div class="result-card">';
        html += '<div class="result-title">五行统计</div>';
        html += '<div class="wuxing-bar">';
        var wxClassMap = { '金': 'wx-jin', '木': 'wx-mu', '水': 'wx-shui', '火': 'wx-huo', '土': 'wx-tu' };
        var wxColorMap = { '金': '#DAA520', '木': '#2E8B57', '水': '#4169E1', '火': '#DC143C', '土': '#8B4513' };
        var totalCount = 0;
        ['木', '火', '土', '金', '水'].forEach(function(name) { totalCount += (wx[name] || 0); });
        ['木', '火', '土', '金', '水'].forEach(function(name) {
            var count = wx[name] || 0;
            var pct = totalCount > 0 ? Math.round(count / totalCount * 100) : 0;
            var statusLabel = '';
            var statusClass = '';
            if (count === 0) { statusLabel = '缺'; statusClass = 'wx-status-missing'; }
            else if (count >= 4) { statusLabel = '旺'; statusClass = 'wx-status-strong'; }
            html += '<div class="wuxing-item">';
            html += '<div class="wx-name ' + wxClassMap[name] + '">' + name + '</div>';
            html += '<div class="wx-bar-chart"><div class="wx-bar-fill" style="width:' + pct + '%;background:' + wxColorMap[name] + ';"></div></div>';
            html += '<div class="wx-count">' + count + (statusLabel ? '<span class="wx-status ' + statusClass + '">' + statusLabel + '</span>' : '') + '</div>';
            html += '</div>';
        });
        html += '</div></div>';

        // 天干留意
        var ganIndices = [p.year.ganIndex, p.month.ganIndex, p.day.ganIndex, p.hour.ganIndex];
        var zhiIndices = [p.year.zhiIndex, p.month.zhiIndex, p.day.zhiIndex, p.hour.zhiIndex];
        var pillarNames = ['年柱', '月柱', '日柱', '时柱'];
        var tgRelations = [];
        for (var i = 0; i < ganIndices.length; i++) {
            for (var j = i + 1; j < ganIndices.length; j++) {
                var he = Lunar.getTianGanHe(ganIndices[i], ganIndices[j]);
                if (he) tgRelations.push(pillarNames[i] + pillarNames[j] + '：' + he);
            }
        }
        html += '<div class="result-card">';
        html += '<div class="result-title">天干留意</div>';
        html += '<div class="paipan-desc">';
        html += tgRelations.length > 0 ? tgRelations.join('；') : '无';
        html += '</div></div>';

        // 地支留意
        var dzRelations = [];
        for (var i = 0; i < zhiIndices.length; i++) {
            for (var j = i + 1; j < zhiIndices.length; j++) {
                var chong = Lunar.getDiZhiChong(zhiIndices[i], zhiIndices[j]);
                if (chong) dzRelations.push(pillarNames[i] + pillarNames[j] + '：' + chong);
                var po = Lunar.getDiZhiPo(zhiIndices[i], zhiIndices[j]);
                if (po) dzRelations.push(pillarNames[i] + pillarNames[j] + '：' + po);
            }
        }
        html += '<div class="result-card">';
        html += '<div class="result-title">地支留意</div>';
        html += '<div class="paipan-desc">';
        html += dzRelations.length > 0 ? dzRelations.join('；') : '无';
        html += '</div></div>';

        // 返回顶部按钮
        html += '<div style="text-align:center;margin:20px 0 10px;">';
        html += '<button class="btn-back-top" onclick="window.scrollTo({top:0,behavior:\'smooth\'})" style="padding:8px 24px;background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border-color);border-radius:20px;font-size:13px;cursor:pointer;">返回顶部</button>';
        html += '</div>';

        var resultEl = document.getElementById('todayPageResult');
        if (resultEl) resultEl.innerHTML = html;
    }



    // ==================== 大运流年总表（新版） ====================

    // 内部状态：当前选中的流日/大运/流年/流月索引
    var _dytSelectedLiuRiIdx = -1;
    var _dytSelectedDaYunIdx = -1;
    var _dytSelectedLiuNianIdx = -1;
    var _dytSelectedLiuYueIdx = -1;
    var _dytLastResult = null;
    // 过滤后的流年/流月数组（解决原始数组与DOM索引错位问题）
    var _dytFilteredLiuNian = [];
    var _dytFilteredLiuYue = [];
    // 当前选中的实际日期（由 selectLiuYue/selectLiuRi 计算）
    var _dytSelYear = 0;
    var _dytSelMonth = 0;
    var _dytSelDay = 0;

    function selectDaYun(idx) {
        _dytSelectedDaYunIdx = idx;
        _dytSelectedLiuNianIdx = -1;
        _dytSelectedLiuYueIdx = -1;
        _dytSelectedLiuRiIdx = -1;
        _dytFilteredLiuNian = [];
        _dytFilteredLiuYue = [];
        document.querySelectorAll('.dyt-dayun-cell').forEach(function(el) { el.classList.remove('active'); });
        var cells = document.querySelectorAll('.dyt-dayun-cell');
        if (cells[idx]) cells[idx].classList.add('active');

        if (!_dytLastResult) return;
        var result = _dytLastResult;
        var dyList = (result.daYun && result.daYun.list) || [];
        var liuNian = result.liuNian || [];
        var birthYear = result.solarDate.year;
        var dy = dyList[idx];
        if (!dy) { _dytUpdateHeader(); _dytUpdateInfo(); return; }

        var startYear = birthYear + dy.startAge;
        var endYear = startYear + 9;
        _dytFilteredLiuNian = [];
        for (var y = startYear; y <= endYear; y++) {
            for (var ni = 0; ni < liuNian.length; ni++) {
                if (liuNian[ni].year === y) { _dytFilteredLiuNian.push(liuNian[ni]); break; }
            }
        }

        var lnRow = document.querySelector('.dyt-liunian-row');
        if (lnRow) {
            var lnHtml = '';
            for (var fi = 0; fi < _dytFilteredLiuNian.length; fi++) {
                var lnItem = _dytFilteredLiuNian[fi];
                lnHtml += '<div class="dyt-liunian-cell" onclick="window.selectLiuNian(' + fi + ')">';
                lnHtml += '<div class="dyt-muted-sm">' + lnItem.year + '</div>';
                lnHtml += '<div style="font-size:10px;font-weight:600;"><span style="color:' + getGanColor(lnItem.ganIndex) + '">' + lnItem.gan + '</span><span style="color:' + getZhiColor(lnItem.zhiIndex) + '">' + lnItem.zhi + '</span></div>';
                lnHtml += '</div>';
            }
            lnRow.innerHTML = lnHtml;
        }

        // 级联触发：自动定位到当前年份对应的流年
        var nowForLN = new Date();
        var curYearForLN = nowForLN.getFullYear();
        var autoLNIdx = 0;
        for (var ai = 0; ai < _dytFilteredLiuNian.length; ai++) {
            if (_dytFilteredLiuNian[ai].year === curYearForLN) { autoLNIdx = ai; break; }
        }
        if (_dytFilteredLiuNian.length > 0) _dytSelectedLiuNianIdx = autoLNIdx;

        // 级联触发：过滤流月为当前流年的12个月
        selectLiuNian(autoLNIdx);
    }

    function selectLiuNian(idx) {
        _dytSelectedLiuNianIdx = idx;
        _dytSelectedLiuYueIdx = -1;
        _dytSelectedLiuRiIdx = -1;
        _dytFilteredLiuYue = [];
        document.querySelectorAll('.dyt-liunian-cell').forEach(function(el) { el.classList.remove('active'); });
        var cells = document.querySelectorAll('.dyt-liunian-cell');
        if (cells[idx]) cells[idx].classList.add('active');

        if (!_dytLastResult) return;
        // 使用过滤后的流年数组（如果没有过滤则回退到原始数组）
        var liuNian = _dytFilteredLiuNian.length > 0 ? _dytFilteredLiuNian : (_dytLastResult.liuNian || []);
        var selLN = liuNian[idx];
        if (!selLN) { _dytUpdateHeader(); _dytUpdateInfo(); return; }

        _dytSelYear = selLN.year;
        _dytFilteredLiuYue = [];
        for (var yi = 0; yi < 12; yi++) {
            var mGZ = Lunar.getMonthGanZhi(_dytSelYear, yi + 1, 15);
            _dytFilteredLiuYue.push({ month: yi + 1, gan: mGZ.gan, zhi: mGZ.zhi, ganIndex: mGZ.ganIndex, zhiIndex: mGZ.zhiIndex });
        }

        var lyRow = document.querySelector('.dyt-liuyue-row');
        if (lyRow) {
            var lyHtml = '';
            for (var fi = 0; fi < _dytFilteredLiuYue.length; fi++) {
                var lyItem = _dytFilteredLiuYue[fi];
                lyHtml += '<div class="dyt-liuyue-cell" onclick="window.selectLiuYue(' + fi + ')">';
                lyHtml += '<div class="dyt-muted-sm">' + lyItem.month + '月</div>';
                lyHtml += '<div style="font-size:10px;font-weight:600;"><span style="color:' + getGanColor(lyItem.ganIndex) + '">' + lyItem.gan + '</span><span style="color:' + getZhiColor(lyItem.zhiIndex) + '">' + lyItem.zhi + '</span></div>';
                lyHtml += '</div>';
            }
            lyRow.innerHTML = lyHtml;
        }

        // 级联触发：自动定位到当前月份对应的流月
        var nowForLY = new Date();
        var curMonthForLY = nowForLY.getMonth() + 1;
        var autoLYIdx = 0;
        for (var bi = 0; bi < _dytFilteredLiuYue.length; bi++) {
            if (_dytFilteredLiuYue[bi].month === curMonthForLY) { autoLYIdx = bi; break; }
        }
        if (_dytFilteredLiuYue.length > 0) _dytSelectedLiuYueIdx = autoLYIdx;

        // 级联触发：过滤流日为当前流月的实际日期
        selectLiuYue(autoLYIdx);
    }

    function selectLiuYue(idx) {
        _dytSelectedLiuYueIdx = idx;
        _dytSelectedLiuRiIdx = -1;
        document.querySelectorAll('.dyt-liuyue-cell').forEach(function(el) { el.classList.remove('active'); });
        var cells = document.querySelectorAll('.dyt-liuyue-cell');
        if (cells[idx]) cells[idx].classList.add('active');

        if (!_dytLastResult) return;
        // 使用过滤后的流月数组获取月份
        var liuYue = _dytFilteredLiuYue.length > 0 ? _dytFilteredLiuYue : (_dytLastResult.liuYue || []);
        var selMonth = idx + 1;
        _dytSelMonth = selMonth;
        // 确定年份：优先使用 selectLiuNian 设置的年份
        if (_dytSelYear <= 0) {
            var liuNian = _dytFilteredLiuNian.length > 0 ? _dytFilteredLiuNian : (_dytLastResult.liuNian || []);
            _dytSelYear = (liuNian[_dytSelectedLiuNianIdx] || {}).year || new Date().getFullYear();
        }

        var daysInMonth = new Date(_dytSelYear, selMonth, 0).getDate();
        var riRow = document.querySelector('.dyt-liuri-row');
        if (riRow) {
            var riHtml = '';
            for (var d = 1; d <= daysInMonth; d++) {
                var riGZ = Lunar.getDayGanZhi(_dytSelYear, selMonth, d);
                var isToday = (_dytSelYear === new Date().getFullYear() && selMonth === new Date().getMonth() + 1 && d === new Date().getDate());
                riHtml += '<div class="dyt-liuri-cell' + (isToday ? ' active' : '') + '" onclick="window.selectLiuRi(' + (d - 1) + ')">';
                riHtml += '<div style="font-size:8px;color:var(--text-light);">' + selMonth + '/' + d + '</div>';
                riHtml += '<div style="font-size:9px;font-weight:600;"><span style="color:' + getGanColor(riGZ.ganIndex) + '">' + riGZ.gan + '</span><span style="color:' + getZhiColor(riGZ.zhiIndex) + '">' + riGZ.zhi + '</span></div>';
                riHtml += '</div>';
            }
            riRow.innerHTML = riHtml;
        }

        // 默认选中：如果当前年月匹配今天，则选中今天；否则选中第一天
        if (daysInMonth > 0) {
            var now = new Date();
            var todayDay = (_dytSelYear === now.getFullYear() && selMonth === now.getMonth() + 1) ? now.getDate() : 1;
            _dytSelectedLiuRiIdx = todayDay - 1;
            _dytSelDay = todayDay;
            // 确保对应的流日cell有active class
            var riCells = document.querySelectorAll('.dyt-liuri-cell');
            riCells.forEach(function(el) { el.classList.remove('active'); });
            if (riCells[_dytSelectedLiuRiIdx]) riCells[_dytSelectedLiuRiIdx].classList.add('active');
        }

        _dytUpdateHeader();
        _dytUpdateInfo();
    }

    function selectLiuRi(idx) {
        _dytSelectedLiuRiIdx = idx;
        _dytSelDay = idx + 1; // idx是0-based，日期是1-based
        document.querySelectorAll('.dyt-liuri-cell').forEach(function(el) { el.classList.remove('active'); });
        var cells = document.querySelectorAll('.dyt-liuri-cell');
        if (cells[idx]) cells[idx].classList.add('active');
        _dytUpdateHeader();
        _dytUpdateInfo();
    }

    // 生成大运流年表地支藏干HTML（zydx.top格式：地支字+右侧垂直十神简写）
    function _dytGetZhiCangGanHtml(dayGanIdx, zhiIdx) {
        var cangGan = Lunar.zhiCangGan[zhiIdx];
        if (!cangGan || cangGan.length === 0) return '';
        var ssMap = {'比肩':'比','劫财':'劫','食神':'食','伤官':'伤','正财':'财','偏财':'才','正官':'官','七杀':'杀','正印':'印','偏印':'枭'};
        var html = '<div class="dyt-zhi-cg">';
        for (var i = 0; i < cangGan.length; i++) {
            var ganIdx = Lunar.tianGan.indexOf(cangGan[i]);
            if (ganIdx < 0) continue;
            var ssFull = Lunar.getShiShen(dayGanIdx, ganIdx);
            var ssShort = ssMap[ssFull] || ssFull.substring(0, 1);
            html += '<div class="dyt-zhi-ss-item">' + ssShort + '</div>';
        }
        html += '</div>';
        return html;
    }

    // 十神缩写映射（用于表格紧凑显示）
    function _dytShortSS(ss) {
        if (!ss) return '';
        var map = {'比肩':'比','劫财':'劫','食神':'食','伤官':'伤','正财':'才','偏财':'财','正官':'官','七杀':'杀','正印':'印','偏印':'枭','日主':'主','元男':'主','元女':'主'};
        return map[ss] || ss.substring(0, 1);
    }

    // 获取地支藏干十神缩写字符串（如"才枭杀"）
    function _dytGetZhiShortSS(dayGanIdx, zhiIdx) {
        var cangGan = Lunar.zhiCangGan[zhiIdx];
        if (!cangGan || cangGan.length === 0) return '';
        var tianGan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
        var parts = [];
        for (var i = 0; i < cangGan.length; i++) {
            var ganIdx = tianGan.indexOf(cangGan[i]);
            if (ganIdx >= 0) {
                parts.push(_dytShortSS(Lunar.getShiShen(dayGanIdx, ganIdx)));
            }
        }
        return parts.join('');
    }

    function _dytUpdateHeader() {
        if (!_dytLastResult) return;
        var result = _dytLastResult;
        var p = result.pillars;
        var dayGanIdx = p.day.ganIndex;
        var now = new Date();
        var birthYear = result.solarDate.year;

        // 确定当前选中的实际日期（使用状态变量，不再从数组反查）
        var selYear = _dytSelYear > 0 ? _dytSelYear : now.getFullYear();
        var selMonth = _dytSelMonth > 0 ? _dytSelMonth : (now.getMonth() + 1);
        var selDay = _dytSelDay > 0 ? _dytSelDay : now.getDate();

        // 计算选中日的干支
        var dayGZ = Lunar.getDayGanZhi(selYear, selMonth, selDay);

        // 从过滤后的流年数组获取流年数据
        var liuNianFiltered = _dytFilteredLiuNian.length > 0 ? _dytFilteredLiuNian : (result.liuNian || []);
        var selLN = (_dytSelectedLiuNianIdx >= 0 && liuNianFiltered[_dytSelectedLiuNianIdx]) ? liuNianFiltered[_dytSelectedLiuNianIdx] : null;

        // 从过滤后的流月数组获取流月数据
        var liuYueFiltered = _dytFilteredLiuYue.length > 0 ? _dytFilteredLiuYue : (result.liuYue || []);
        var selLY = (_dytSelectedLiuYueIdx >= 0 && liuYueFiltered[_dytSelectedLiuYueIdx]) ? liuYueFiltered[_dytSelectedLiuYueIdx] : null;

        // 流月干支：优先使用选中的流月数据，否则按日期计算
        var monthGZ;
        if (selLY) {
            monthGZ = { gan: selLY.gan, zhi: selLY.zhi, ganIndex: selLY.ganIndex, zhiIndex: selLY.zhiIndex };
        } else {
            monthGZ = Lunar.getMonthGanZhi(selYear, selMonth, 15);
        }
        // 流年干支：优先使用选中的流年数据，否则按日期计算
        var yearGZ;
        if (selLN) {
            yearGZ = { gan: selLN.gan, zhi: selLN.zhi, ganIndex: selLN.ganIndex, zhiIndex: selLN.zhiIndex };
        } else {
            yearGZ = Lunar.getYearGanZhi(selYear);
        }

        // 更新Section A前4列
        var elDate = document.getElementById('dyt-col-date');
        var elRi = document.getElementById('dyt-col-liuri');
        var elYue = document.getElementById('dyt-col-liuyue');
        var elNian = document.getElementById('dyt-col-liunian');
        var elRiGan = document.getElementById('dyt-gan-liuri');
        var elYueGan = document.getElementById('dyt-gan-liuyue');
        var elNianGan = document.getElementById('dyt-gan-liunian');
        var elRiZhi = document.getElementById('dyt-zhi-liuri');
        var elYueZhi = document.getElementById('dyt-zhi-liuyue');
        var elNianZhi = document.getElementById('dyt-zhi-liunian');
        var elRiKw = document.getElementById('dyt-kw-liuri');
        var elYueKw = document.getElementById('dyt-kw-liuyue');
        var elNianKw = document.getElementById('dyt-kw-liunian');

        // 岁年行更新（按截图一格式）
        var selLunar = Lunar.solarToLunar(selYear, selMonth, selDay);
        var selLunarDay = selLunar ? Lunar.getLunarDayName(selLunar.lunarDay) : '';
        var selLunarMonth = selLunar ? Lunar.getLunarMonthName(selLunar.lunarMonth, selLunar.isLeap) : '';
        var selAge = selLN ? (selLN.year - birthYear) : 0;
        if (elDate) elDate.textContent = '岁年';
        if (elRi) elRi.innerHTML = selLunarDay + '<br>' + selDay + '日';
        if (elYue) elYue.innerHTML = selLunarMonth + '<br>' + selMonth + '月';
        if (elNian) elNian.innerHTML = selAge + '岁<br>' + selYear;

        // 天干行（流日列更新）
        if (elRiGan) elRiGan.innerHTML = '<span class="dyt-ganzhi-char" style="color:' + getGanColor(dayGZ.ganIndex) + ';">' + dayGZ.gan + '</span> <span class="dyt-ss-label">' + _dytShortSS(Lunar.getShiShen(dayGanIdx, dayGZ.ganIndex)) + '</span>';
        if (elYueGan) elYueGan.innerHTML = '<span class="dyt-ganzhi-char" style="color:' + getGanColor(monthGZ.ganIndex) + ';">' + monthGZ.gan + '</span> <span class="dyt-ss-label">' + _dytShortSS(Lunar.getShiShen(dayGanIdx, monthGZ.ganIndex)) + '</span>';
        if (elNianGan) elNianGan.innerHTML = '<span class="dyt-ganzhi-char" style="color:' + getGanColor(yearGZ.ganIndex) + ';">' + yearGZ.gan + '</span> <span class="dyt-ss-label">' + _dytShortSS(Lunar.getShiShen(dayGanIdx, yearGZ.ganIndex)) + '</span>';

        // 地支行（流日列更新）
        if (elRiZhi) elRiZhi.innerHTML = '<div class="dyt-zhi-cell"><span class="dyt-ganzhi-char" style="color:' + getZhiColor(dayGZ.zhiIndex) + ';">' + dayGZ.zhi + '</span>' + _dytGetZhiCangGanHtml(dayGanIdx, dayGZ.zhiIndex) + '</div>';
        if (elYueZhi) elYueZhi.innerHTML = '<div class="dyt-zhi-cell"><span class="dyt-ganzhi-char" style="color:' + getZhiColor(monthGZ.zhiIndex) + ';">' + monthGZ.zhi + '</span>' + _dytGetZhiCangGanHtml(dayGanIdx, monthGZ.zhiIndex) + '</div>';
        if (elNianZhi) elNianZhi.innerHTML = '<div class="dyt-zhi-cell"><span class="dyt-ganzhi-char" style="color:' + getZhiColor(yearGZ.zhiIndex) + ';">' + yearGZ.zhi + '</span>' + _dytGetZhiCangGanHtml(dayGanIdx, yearGZ.zhiIndex) + '</div>';

        // 空亡行（流日列更新）
        var riKw = Lunar.getKongWang(dayGZ.ganIndex, dayGZ.zhiIndex);
        var yueKw = Lunar.getKongWang(monthGZ.ganIndex, monthGZ.zhiIndex);
        var nianKw = Lunar.getKongWang(yearGZ.ganIndex, yearGZ.zhiIndex);
        if (elRiKw) elRiKw.textContent = riKw.join(' ');
        if (elYueKw) elYueKw.textContent = yueKw.join(' ');
        if (elNianKw) elNianKw.textContent = nianKw.join(' ');

        // 同步高亮流年和流月（使用过滤后的索引，与DOM一致）
        document.querySelectorAll('.dyt-liunian-cell').forEach(function(el) { el.classList.remove('active'); });
        var lnCells = document.querySelectorAll('.dyt-liunian-cell');
        if (_dytSelectedLiuNianIdx >= 0 && lnCells[_dytSelectedLiuNianIdx]) lnCells[_dytSelectedLiuNianIdx].classList.add('active');
        document.querySelectorAll('.dyt-liuyue-cell').forEach(function(el) { el.classList.remove('active'); });
        var lyCells = document.querySelectorAll('.dyt-liuyue-cell');
        if (_dytSelectedLiuYueIdx >= 0 && lyCells[_dytSelectedLiuYueIdx]) lyCells[_dytSelectedLiuYueIdx].classList.add('active');

        // 更新大运列
        var daYun = result.daYun || {};
        var dyList = daYun.list || [];
        var selDY = null;
        if (_dytSelectedDaYunIdx >= 0 && _dytSelectedDaYunIdx < dyList.length) {
            selDY = dyList[_dytSelectedDaYunIdx];
        } else if (dyList.length > 0) {
            selDY = dyList[0];
        }
        var elDyCol = document.getElementById('dyt-col-dayun');
        var elDyGan = document.getElementById('dyt-gan-dayun');
        var elDyZhi = document.getElementById('dyt-zhi-dayun');
        var elDyKw = document.getElementById('dyt-kw-dayun');
        if (selDY) {
            if (elDyCol) elDyCol.innerHTML = selDY.startAge + '岁<br>' + (birthYear + selDY.startAge);
            if (elDyGan) elDyGan.innerHTML = '<span class="dyt-ganzhi-char" style="color:' + getGanColor(selDY.ganIndex) + ';">' + selDY.gan + '</span> <span class="dyt-ss-label">' + _dytShortSS(Lunar.getShiShen(dayGanIdx, selDY.ganIndex)) + '</span>';
            if (elDyZhi) elDyZhi.innerHTML = '<div class="dyt-zhi-cell"><span class="dyt-ganzhi-char" style="color:' + getZhiColor(selDY.zhiIndex) + ';">' + selDY.zhi + '</span>' + _dytGetZhiCangGanHtml(dayGanIdx, selDY.zhiIndex) + '</div>';
            var dyKw2 = Lunar.getKongWang(selDY.ganIndex, selDY.zhiIndex);
            if (elDyKw) elDyKw.textContent = dyKw2.join(' ');
        }
    }

    function _dytUpdateInfo() {
        if (!_dytLastResult) return;
        var result = _dytLastResult;
        var p = result.pillars;
        var dayGanIdx = p.day.ganIndex;

        // ===== 8柱天干/地支关系计算（原局4柱 + 大运 + 流年 + 流月 + 流日）=====
        // 收集8柱干支
        var eightGans = [
            { idx: p.year.ganIndex, label: '年干' + p.year.gan },
            { idx: p.month.ganIndex, label: '月干' + p.month.gan },
            { idx: p.day.ganIndex, label: '日干' + p.day.gan },
            { idx: p.hour.ganIndex, label: '时干' + p.hour.gan }
        ];
        var eightZhis = [
            { idx: p.year.zhiIndex, label: '年支' + p.year.zhi },
            { idx: p.month.zhiIndex, label: '月支' + p.month.zhi },
            { idx: p.day.zhiIndex, label: '日支' + p.day.zhi },
            { idx: p.hour.zhiIndex, label: '时支' + p.hour.zhi }
        ];

        // 添加大运干支
        var dyList = (result.daYun && result.daYun.list) || [];
        var selDY = (_dytSelectedDaYunIdx >= 0 && dyList[_dytSelectedDaYunIdx]) ? dyList[_dytSelectedDaYunIdx] : null;
        if (selDY) {
            eightGans.push({ idx: selDY.ganIndex, label: '大运' + selDY.gan });
            eightZhis.push({ idx: selDY.zhiIndex, label: '大运' + selDY.zhi });
        }

        // 添加流年干支（使用过滤后的数组）
        var liuNian = _dytFilteredLiuNian.length > 0 ? _dytFilteredLiuNian : (result.liuNian || []);
        var selLN = (_dytSelectedLiuNianIdx >= 0 && liuNian[_dytSelectedLiuNianIdx]) ? liuNian[_dytSelectedLiuNianIdx] : null;
        if (selLN) {
            eightGans.push({ idx: selLN.ganIndex, label: '流年' + selLN.gan });
            eightZhis.push({ idx: selLN.zhiIndex, label: '流年' + selLN.zhi });
        }

        // 添加流月干支（使用状态日期）
        var now = new Date();
        var birthYear = result.solarDate.year;
        var selYear = _dytSelYear > 0 ? _dytSelYear : now.getFullYear();
        var selMonth = _dytSelMonth > 0 ? _dytSelMonth : (now.getMonth() + 1);
        var selDay = _dytSelDay > 0 ? _dytSelDay : now.getDate();
        var monthGZ = Lunar.getMonthGanZhi(selYear, selMonth, 15);
        eightGans.push({ idx: monthGZ.ganIndex, label: '流月' + monthGZ.gan });
        eightZhis.push({ idx: monthGZ.zhiIndex, label: '流月' + monthGZ.zhi });

        // 添加流日干支
        var dayGZ = Lunar.getDayGanZhi(selYear, selMonth, selDay);
        eightGans.push({ idx: dayGZ.ganIndex, label: '流日' + dayGZ.gan });
        eightZhis.push({ idx: dayGZ.zhiIndex, label: '流日' + dayGZ.zhi });

        // 天干留意：8柱天干两两检查合与冲
        var ganRelations = [];
        for (var gi = 0; gi < eightGans.length; gi++) {
            for (var gj = gi + 1; gj < eightGans.length; gj++) {
                var tgHe = Lunar.getTianGanHe(eightGans[gi].idx, eightGans[gj].idx);
                if (tgHe) ganRelations.push({ type: '合', desc: tgHe, from: eightGans[gi].label, to: eightGans[gj].label });
                var tgChong = Lunar.getTianGanChong(eightGans[gi].idx, eightGans[gj].idx);
                if (tgChong) ganRelations.push({ type: '冲', desc: tgChong, from: eightGans[gi].label, to: eightGans[gj].label });
            }
        }

        // 地支留意：8柱地支两两检查合、冲、刑、害、破
        var zhiRelations = [];
        for (var zi = 0; zi < eightZhis.length; zi++) {
            for (var zj = zi + 1; zj < eightZhis.length; zj++) {
                var dzHe = Lunar.getDiZhiHe(eightZhis[zi].idx, eightZhis[zj].idx);
                if (dzHe) zhiRelations.push({ type: '合', desc: dzHe, from: eightZhis[zi].label, to: eightZhis[zj].label });
                var dzChong = Lunar.getDiZhiChong(eightZhis[zi].idx, eightZhis[zj].idx);
                if (dzChong) zhiRelations.push({ type: '冲', desc: dzChong, from: eightZhis[zi].label, to: eightZhis[zj].label });
                var dzXing = Lunar.getDiZhiXing(eightZhis[zi].idx, eightZhis[zj].idx);
                if (dzXing) zhiRelations.push({ type: '刑', desc: dzXing, from: eightZhis[zi].label, to: eightZhis[zj].label });
                var dzHai = Lunar.getDiZhiHai(eightZhis[zi].idx, eightZhis[zj].idx);
                if (dzHai) zhiRelations.push({ type: '害', desc: dzHai, from: eightZhis[zi].label, to: eightZhis[zj].label });
                var dzPo = Lunar.getDiZhiPo(eightZhis[zi].idx, eightZhis[zj].idx);
                if (dzPo) zhiRelations.push({ type: '破', desc: dzPo, from: eightZhis[zi].label, to: eightZhis[zj].label });
            }
        }

        // 三合检测（申子辰、寅午戌、巳酉丑、亥卯未）
        var sanHeGroups = [[8,0,4],[2,6,10],[5,9,1],[11,3,7]]; // 申子辰、寅午戌、巳酉丑、亥卯未
        var zhiIdxSet = eightZhis.map(function(z) { return z.idx; });
        var sanHeNames = ['申子辰合水局','寅午戌合火局','巳酉丑合金局','亥卯未合木局'];
        for (var sh = 0; sh < sanHeGroups.length; sh++) {
            var grp = sanHeGroups[sh];
            if (zhiIdxSet.indexOf(grp[0]) >= 0 && zhiIdxSet.indexOf(grp[1]) >= 0 && zhiIdxSet.indexOf(grp[2]) >= 0) {
                zhiRelations.push({ type: '三合', desc: sanHeNames[sh] });
            }
        }

        // 三会检测（寅卯辰、巳午未、申酉戌、亥子丑）
        var sanHuiGroups = [[2,3,4],[5,6,7],[8,9,10],[11,0,1]];
        var sanHuiNames = ['寅卯辰会东方木','巳午未会南方火','申酉戌会西方金','亥子丑会北方水'];
        for (var shi = 0; shi < sanHuiGroups.length; shi++) {
            var hgrp = sanHuiGroups[shi];
            if (zhiIdxSet.indexOf(hgrp[0]) >= 0 && zhiIdxSet.indexOf(hgrp[1]) >= 0 && zhiIdxSet.indexOf(hgrp[2]) >= 0) {
                zhiRelations.push({ type: '三会', desc: sanHuiNames[shi] });
            }
        }

        // 渲染天干留意
        var elGanRel = document.getElementById('dyt-info-gan');
        if (elGanRel) {
            var ganHtml = '';
            ganRelations.forEach(function(r) {
                ganHtml += '<span class="dyt-shensha-tag">' + r.type + ':' + r.desc + '</span>';
            });
            elGanRel.innerHTML = ganHtml || '<span class="dyt-empty-text">无</span>';
        }

        // 渲染地支留意
        var elZhiRel = document.getElementById('dyt-info-zhi');
        if (elZhiRel) {
            var zhiHtml = '';
            zhiRelations.forEach(function(r) {
                zhiHtml += '<span class="dyt-shensha-tag">' + r.type + ':' + r.desc + '</span>';
            });
            elZhiRel.innerHTML = zhiHtml || '<span class="dyt-empty-text">无</span>';
        }

        // 大运神煞
        var elDYSS = document.getElementById('dyt-info-dyss');
        if (elDYSS) {
            var dySS = _dytGetDaYunShenSha();
            elDYSS.innerHTML = dySS.length ? dySS.map(function(s) { return '<span class="dyt-shensha-tag">' + s + '</span>'; }).join('') : '<span class="dyt-empty-text">无</span>';
        }

        // 流年神煞
        var elLNSS = document.getElementById('dyt-info-lnss');
        if (elLNSS) {
            var lnSS = _dytGetLiuNianShenSha();
            elLNSS.innerHTML = lnSS.length ? lnSS.map(function(s) { return '<span class="dyt-shensha-tag">' + s + '</span>'; }).join('') : '<span class="dyt-empty-text">无</span>';
        }

        // 流月神煞
        var elLYSS = document.getElementById('dyt-info-lyss');
        if (elLYSS) {
            var lySS = _dytGetLiuYueShenSha();
            elLYSS.innerHTML = lySS.length ? lySS.map(function(s) { return '<span class="dyt-shensha-tag">' + s + '</span>'; }).join('') : '<span class="dyt-empty-text">无</span>';
        }

        // 流日神煞
        var elLRSS = document.getElementById('dyt-info-lrss');
        if (elLRSS) {
            var lrSS = _dytGetLiuRiShenSha();
            elLRSS.innerHTML = lrSS.length ? lrSS.map(function(s) { return '<span class="dyt-shensha-tag">' + s + '</span>'; }).join('') : '<span class="dyt-empty-text">无</span>';
        }
    }

    // === 方案一：对齐zydx.top（与方案二逻辑相同，因为zydx.top本身就是正统子平派） ===
    // === 方案二（默认）：正统子平派大运/流年/流月/流日神煞计算 ===
    // 以原局四柱为基准，将目标干支代入计算，参考《三命通会》《渊海子平》
    function _dytGetDaYunShenSha() {
        if (!_dytLastResult || _dytSelectedDaYunIdx < 0) return [];
        var dyList = _dytLastResult.daYun && _dytLastResult.daYun.list;
        if (!dyList) return [];
        var dy = dyList[_dytSelectedDaYunIdx];
        if (!dy) return [];
        var p = _dytLastResult.pillars;
        // 正统子平派：以原局四柱为基准，将大运干支代入计算
        return Lunar.getShenShaForDaYun(
            p.year.ganIndex, p.year.zhiIndex, p.month.zhiIndex,
            p.day.ganIndex, p.day.zhiIndex,
            dy.ganIndex, dy.zhiIndex,
            _dytLastResult.gender
        );
        // === 旧方案（已废弃）：把大运干支替换年柱位置计算 ===
        // var dayGanIdx = p.day.ganIndex;
        // var dySS = Lunar.getShenSha(dy.ganIndex, dy.zhiIndex, p.month.ganIndex, p.month.zhiIndex, dayGanIdx, p.day.zhiIndex, p.hour.ganIndex, p.hour.zhiIndex);
        // return dySS.year || [];
    }

    function _dytGetLiuNianShenSha() {
        if (!_dytLastResult || _dytSelectedLiuNianIdx < 0) return [];
        // 使用过滤后的流年数组
        var lnList = _dytFilteredLiuNian.length > 0 ? _dytFilteredLiuNian : _dytLastResult.liuNian;
        if (!lnList) return [];
        var ln = lnList[_dytSelectedLiuNianIdx];
        if (!ln) return [];
        var p = _dytLastResult.pillars;
        // 正统子平派：以原局四柱为基准，将流年干支代入计算
        return Lunar.getShenShaForDaYun(
            p.year.ganIndex, p.year.zhiIndex, p.month.zhiIndex,
            p.day.ganIndex, p.day.zhiIndex,
            ln.ganIndex, ln.zhiIndex,
            _dytLastResult.gender
        );
        // === 旧方案（已废弃）：把流年干支替换年柱位置计算 ===
        // var dayGanIdx = p.day.ganIndex;
        // var lnSS = Lunar.getShenSha(ln.ganIndex, ln.zhiIndex, p.month.ganIndex, p.month.zhiIndex, dayGanIdx, p.day.zhiIndex, p.hour.ganIndex, p.hour.zhiIndex);
        // return lnSS.year || [];
    }

    function _dytGetLiuYueShenSha() {
        if (!_dytLastResult) return [];
        var p = _dytLastResult.pillars;
        var now = new Date();
        var selYear = _dytSelYear > 0 ? _dytSelYear : now.getFullYear();
        var selMonth = _dytSelMonth > 0 ? _dytSelMonth : (now.getMonth() + 1);
        var monthGZ = Lunar.getMonthGanZhi(selYear, selMonth, 15);
        // 正统子平派：以原局四柱为基准，将流月干支代入计算
        return Lunar.getShenShaForDaYun(
            p.year.ganIndex, p.year.zhiIndex, p.month.zhiIndex,
            p.day.ganIndex, p.day.zhiIndex,
            monthGZ.ganIndex, monthGZ.zhiIndex,
            _dytLastResult.gender
        );
        // === 旧方案（已废弃）：把流月干支替换月柱位置计算 ===
        // var dayGanIdx = p.day.ganIndex;
        // var lySS = Lunar.getShenSha(p.year.ganIndex, p.year.zhiIndex, monthGZ.ganIndex, monthGZ.zhiIndex, dayGanIdx, p.day.zhiIndex, p.hour.ganIndex, p.hour.zhiIndex);
        // return lySS.month || [];
    }

    function _dytGetLiuRiShenSha() {
        if (!_dytLastResult) return [];
        var p = _dytLastResult.pillars;
        var now = new Date();
        var selYear = _dytSelYear > 0 ? _dytSelYear : now.getFullYear();
        var selMonth = _dytSelMonth > 0 ? _dytSelMonth : (now.getMonth() + 1);
        var selDay = _dytSelDay > 0 ? _dytSelDay : now.getDate();
        var dayGZ = Lunar.getDayGanZhi(selYear, selMonth, selDay);
        // 正统子平派：以原局四柱为基准，将流日干支代入计算
        return Lunar.getShenShaForDaYun(
            p.year.ganIndex, p.year.zhiIndex, p.month.zhiIndex,
            p.day.ganIndex, p.day.zhiIndex,
            dayGZ.ganIndex, dayGZ.zhiIndex,
            _dytLastResult.gender
        );
        // === 旧方案（已废弃）：把流日干支替换日柱位置计算 ===
        // var dayGanIdx = p.day.ganIndex;
        // var lrSS = Lunar.getShenSha(p.year.ganIndex, p.year.zhiIndex, p.month.ganIndex, p.month.zhiIndex, dayGZ.ganIndex, dayGZ.zhiIndex, p.hour.ganIndex, p.hour.zhiIndex);
        // return lrSS.day || [];
    }

    function renderDaYunLiuNianTable(result) {
        _dytLastResult = result;
        _dytSelectedLiuRiIdx = -1;
        _dytSelectedDaYunIdx = -1;
        _dytSelectedLiuNianIdx = -1;
        _dytSelectedLiuYueIdx = -1;
        _dytFilteredLiuNian = [];
        _dytFilteredLiuYue = [];
        _dytSelYear = 0;
        _dytSelMonth = 0;
        _dytSelDay = 0;

        var p = result.pillars;
        var dayGanIdx = p.day.ganIndex;
        var daYun = result.daYun || {};
        var dyList = daYun.list || [];
        var birthYear = result.solarDate.year;
        var liuNian = result.liuNian || [];
        var liuYue = result.liuYue || [];
        var now = new Date();
        var currentAge = now.getFullYear() - birthYear;

        // 找到当前大运索引
        var currentDaYunIdx = -1;
        for (var ci = 0; ci < dyList.length; ci++) {
            if (currentAge >= dyList[ci].startAge && currentAge <= dyList[ci].endAge) {
                currentDaYunIdx = ci;
                break;
            }
        }
        _dytSelectedDaYunIdx = currentDaYunIdx;

        // 初始化为今天的日期（selectDaYun级联会覆盖流年/流月/流日索引）
        var curMonth = now.getMonth() + 1;
        _dytSelYear = now.getFullYear();
        _dytSelMonth = curMonth;
        _dytSelDay = now.getDate();

        // 当前日干支
        var todayGZ = Lunar.getDayGanZhi(now.getFullYear(), now.getMonth() + 1, now.getDate());
        var todayMonthGZ = Lunar.getMonthGanZhi(now.getFullYear(), now.getMonth() + 1, 15);
        var todayYearGZ = Lunar.getYearGanZhi(now.getFullYear());

        var html = '<div class="dyt-container">';

        // ===== Section A: 固定头部9列表格 =====
        html += '<table class="dyt-header-table">';
        // Row 1: headers
        html += '<tr><th>日期</th><th>流日</th><th>流月</th><th>流年</th><th>大运</th><th>年柱</th><th>月柱</th><th>日柱</th><th>时柱</th></tr>';
        // Row 2: 岁年行（按截图一格式：上农历/年龄，下阳历/年份）
        var todayLunar = Lunar.solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
        var lunarDayName = todayLunar ? Lunar.getLunarDayName(todayLunar.lunarDay) : '';
        var lunarMonthName = todayLunar ? Lunar.getLunarMonthName(todayLunar.lunarMonth, todayLunar.isLeap) : '';
        var selLNInit = liuNian.find(function(ln) { return ln.year === now.getFullYear(); });
        var selAge = selLNInit ? (now.getFullYear() - birthYear) : 0;
        var curDY = (currentDaYunIdx >= 0 && dyList[currentDaYunIdx]) ? dyList[currentDaYunIdx] : null;
        var dyStartYear = curDY ? (birthYear + curDY.startAge) : 0;

        html += '<tr>';
        html += '<td id="dyt-col-date" class="dyt-header-sm">岁年</td>';
        html += '<td id="dyt-col-liuri" class="dyt-header-sm">' + lunarDayName + '<br>' + now.getDate() + '日</td>';
        html += '<td id="dyt-col-liuyue" class="dyt-header-sm">' + lunarMonthName + '<br>' + (now.getMonth() + 1) + '月</td>';
        html += '<td id="dyt-col-liunian" class="dyt-header-sm">' + selAge + '岁<br>' + now.getFullYear() + '</td>';
        html += '<td id="dyt-col-dayun" class="dyt-header-sm">' + (curDY ? curDY.startAge + '岁<br>' + dyStartYear : '*') + '</td>';
        html += '<td class="dyt-header-sm">*</td>';
        html += '<td class="dyt-header-sm">*</td>';
        html += '<td class="dyt-header-sm">*</td>';
        html += '<td class="dyt-header-sm">*</td>';
        html += '</tr>';
        // Row 3: 天干（十神缩写，无括号）
        html += '<tr><td class="dyt-muted-sm">天干</td>';
        html += '<td id="dyt-gan-liuri"><span class="dyt-ganzhi-char" style="color:' + getGanColor(todayGZ.ganIndex) + ';">' + todayGZ.gan + '</span> <span class="dyt-ss-label">' + _dytShortSS(Lunar.getShiShen(dayGanIdx, todayGZ.ganIndex)) + '</span></td>';
        html += '<td id="dyt-gan-liuyue"><span class="dyt-ganzhi-char" style="color:' + getGanColor(todayMonthGZ.ganIndex) + ';">' + todayMonthGZ.gan + '</span> <span class="dyt-ss-label">' + _dytShortSS(Lunar.getShiShen(dayGanIdx, todayMonthGZ.ganIndex)) + '</span></td>';
        html += '<td id="dyt-gan-liunian"><span class="dyt-ganzhi-char" style="color:' + getGanColor(todayYearGZ.ganIndex) + ';">' + todayYearGZ.gan + '</span> <span class="dyt-ss-label">' + _dytShortSS(Lunar.getShiShen(dayGanIdx, todayYearGZ.ganIndex)) + '</span></td>';
        if (curDY) {
            html += '<td id="dyt-gan-dayun"><span class="dyt-ganzhi-char" style="color:' + getGanColor(curDY.ganIndex) + ';">' + curDY.gan + '</span> <span class="dyt-ss-label">' + _dytShortSS(Lunar.getShiShen(dayGanIdx, curDY.ganIndex)) + '</span></td>';
        } else {
            html += '<td id="dyt-gan-dayun" style="font-size:13px;">*</td>';
        }
        var pillarKeys = ['year', 'month', 'day', 'hour'];
        var dytGenderLabel = (gender === 1) ? '元男' : '元女';
        for (var pk = 0; pk < pillarKeys.length; pk++) {
            var pp = p[pillarKeys[pk]];
            var ppSS = pp.shiShen;
            if (ppSS === '日主') ppSS = dytGenderLabel;
            html += '<td><span class="dyt-ganzhi-char" style="color:' + getGanColor(pp.ganIndex) + ';">' + pp.gan + '</span> <span class="dyt-ss-label">' + _dytShortSS(ppSS) + '</span></td>';
        }
        html += '</tr>';
        // Row 4: 地支（藏干十神简写，地支字左+十神右）
        html += '<tr><td class="dyt-muted-sm">地支</td>';
        html += '<td id="dyt-zhi-liuri"><div class="dyt-zhi-cell"><span class="dyt-ganzhi-char" style="color:' + getZhiColor(todayGZ.zhiIndex) + ';">' + todayGZ.zhi + '</span>' + _dytGetZhiCangGanHtml(dayGanIdx, todayGZ.zhiIndex) + '</div></td>';
        html += '<td id="dyt-zhi-liuyue"><div class="dyt-zhi-cell"><span class="dyt-ganzhi-char" style="color:' + getZhiColor(todayMonthGZ.zhiIndex) + ';">' + todayMonthGZ.zhi + '</span>' + _dytGetZhiCangGanHtml(dayGanIdx, todayMonthGZ.zhiIndex) + '</div></td>';
        html += '<td id="dyt-zhi-liunian"><div class="dyt-zhi-cell"><span class="dyt-ganzhi-char" style="color:' + getZhiColor(todayYearGZ.zhiIndex) + ';">' + todayYearGZ.zhi + '</span>' + _dytGetZhiCangGanHtml(dayGanIdx, todayYearGZ.zhiIndex) + '</div></td>';
        if (curDY) {
            html += '<td id="dyt-zhi-dayun"><div class="dyt-zhi-cell"><span class="dyt-ganzhi-char" style="color:' + getZhiColor(curDY.zhiIndex) + ';">' + curDY.zhi + '</span>' + _dytGetZhiCangGanHtml(dayGanIdx, curDY.zhiIndex) + '</div></td>';
        } else {
            html += '<td id="dyt-zhi-dayun" style="font-size:13px;">*</td>';
        }
        for (var pk2 = 0; pk2 < pillarKeys.length; pk2++) {
            var pp2 = p[pillarKeys[pk2]];
            html += '<td><div class="dyt-zhi-cell"><span class="dyt-ganzhi-char" style="color:' + getZhiColor(pp2.zhiIndex) + ';">' + pp2.zhi + '</span>' + _dytGetZhiCangGanHtml(dayGanIdx, pp2.zhiIndex) + '</div></td>';
        }
        html += '</tr>';
        // Row 5: 空亡
        html += '<tr><td class="dyt-muted-sm">空亡</td>';
        var todayKw = Lunar.getKongWang(todayGZ.ganIndex, todayGZ.zhiIndex);
        var monthKw = Lunar.getKongWang(todayMonthGZ.ganIndex, todayMonthGZ.zhiIndex);
        var yearKw = Lunar.getKongWang(todayYearGZ.ganIndex, todayYearGZ.zhiIndex);
        // 日期列：空亡留空（日期列无干支空亡数据）
        html += '<td id="dyt-kw-liuri" class="dyt-kw-cell">' + todayKw.join(' ') + '</td>';
        html += '<td id="dyt-kw-liuyue" class="dyt-kw-cell">' + monthKw.join(' ') + '</td>';
        html += '<td id="dyt-kw-liunian" class="dyt-kw-cell">' + yearKw.join(' ') + '</td>';
        if (curDY) {
            var dyKw = Lunar.getKongWang(curDY.ganIndex, curDY.zhiIndex);
            html += '<td id="dyt-kw-dayun" class="dyt-kw-cell">' + dyKw.join(' ') + '</td>';
        } else {
            html += '<td id="dyt-kw-dayun" class="dyt-kw-cell">*</td>';
        }
        for (var pk3 = 0; pk3 < pillarKeys.length; pk3++) {
            var pp3 = p[pillarKeys[pk3]];
            var pillarKw = result.kongWang ? (result.kongWang[pillarKeys[pk3]] || []) : [];
            html += '<td class="dyt-kw-cell">' + pillarKw.join(' ') + '</td>';
        }
        html += '</tr>';
        html += '</table>';

        // ===== Section B: 大运时间线 =====
        html += '<div class="dyt-section"><span class="dyt-section-label">大运</span></div>';
        // 大运年龄+年份行（在大运按钮行上方）
        html += '<div class="dyt-age-year-row">';
        for (var di = 0; di < daYun.list.length; di++) {
            var dyItem = daYun.list[di];
            var startYear = birthYear + dyItem.startAge;
            html += '<div class="dyt-age-year-cell">';
            html += '<div class="dyt-age-val">' + dyItem.startAge + '岁</div>';
            html += '<div class="dyt-year-val">' + startYear + '</div>';
            html += '</div>';
        }
        html += '</div>';
        html += '<div class="dyt-dayun-row">';
        for (var di = 0; di < daYun.list.length; di++) {
            var dyItem = daYun.list[di];
            var isActive = (di === currentDaYunIdx);
            html += '<div class="dyt-dayun-cell' + (isActive ? ' active' : '') + '" onclick="window.selectDaYun(' + di + ')">';
            html += '<div class="dyt-muted-sm">' + dyItem.startAge + '-' + dyItem.endAge + '岁</div>';
            html += '<div style="font-size:11px;font-weight:600;"><span style="color:' + getGanColor(dyItem.ganIndex) + '">' + dyItem.gan + '</span><span style="color:' + getZhiColor(dyItem.zhiIndex) + '">' + dyItem.zhi + '</span></div>';
            html += '</div>';
        }
        html += '</div>';

        // ===== Section C: 流年 =====
        html += '<div class="dyt-section"><span class="dyt-section-label">流年</span></div>';
        html += '<div class="dyt-liunian-scroll">';
        html += '<div class="dyt-liunian-row">';
        for (var lni = 0; lni < liuNian.length; lni++) {
            var lnItem = liuNian[lni];
            var isCurYear = (lnItem.year === now.getFullYear());
            html += '<div class="dyt-liunian-cell' + (isCurYear ? ' active' : '') + '" onclick="window.selectLiuNian(' + lni + ')">';
            html += '<div class="dyt-muted-sm">' + lnItem.year + '</div>';
            html += '<div style="font-size:10px;font-weight:600;"><span style="color:' + getGanColor(lnItem.ganIndex) + '">' + lnItem.gan + '</span><span style="color:' + getZhiColor(lnItem.zhiIndex) + '">' + lnItem.zhi + '</span></div>';
            html += '</div>';
        }
        html += '</div></div>';

        // ===== Section D: 流月 =====
        html += '<div class="dyt-section"><span class="dyt-section-label">流月</span></div>';
        html += '<div class="dyt-liuyue-row">';
        for (var lyi = 0; lyi < liuYue.length; lyi++) {
            var lyItem = liuYue[lyi];
            var isCurMonth = (lyItem.month === curMonth);
            html += '<div class="dyt-liuyue-cell' + (isCurMonth ? ' active' : '') + '" onclick="window.selectLiuYue(' + lyi + ')">';
            html += '<div class="dyt-muted-sm">' + lyItem.month + '月</div>';
            html += '<div style="font-size:10px;font-weight:600;"><span style="color:' + getGanColor(lyItem.ganIndex) + '">' + lyItem.gan + '</span><span style="color:' + getZhiColor(lyItem.zhiIndex) + '">' + lyItem.zhi + '</span></div>';
            html += '</div>';
        }
        html += '</div>';

        // ===== Section E: 流日（由 selectLiuYue 级联动态生成当月实际天数） =====
        html += '<div class="dyt-section"><span class="dyt-section-label">流日</span></div>';
        html += '<div class="dyt-liuri-scroll">';
        html += '<div class="dyt-liuri-row"></div>';
        html += '</div>';

        // ===== Section F: 底部信息 =====
        html += '<div class="dyt-info-section">';
        // 天干留意
        html += '<div class="dyt-info-row"><span class="dyt-info-label">天干留意</span><div id="dyt-info-gan" class="dyt-shensha-tags"></div></div>';
        // 地支留意
        html += '<div class="dyt-info-row"><span class="dyt-info-label">地支留意</span><div id="dyt-info-zhi" class="dyt-shensha-tags"></div></div>';
        // 大运神煞
        html += '<div class="dyt-info-row"><span class="dyt-info-label">大运神煞</span><div id="dyt-info-dyss" class="dyt-shensha-tags"></div></div>';
        // 流年神煞
        html += '<div class="dyt-info-row"><span class="dyt-info-label">流年神煞</span><div id="dyt-info-lnss" class="dyt-shensha-tags"></div></div>';
        // 流月神煞
        html += '<div class="dyt-info-row"><span class="dyt-info-label">流月神煞</span><div id="dyt-info-lyss" class="dyt-shensha-tags"></div></div>';
        // 流日神煞
        html += '<div class="dyt-info-row"><span class="dyt-info-label">流日神煞</span><div id="dyt-info-lrss" class="dyt-shensha-tags"></div></div>';
        html += '</div>';

        html += '</div>'; // end dyt-container

        var ra = $('resultArea');
        if (ra) {
            var div = document.createElement('div');
            div.innerHTML = html;
            ra.appendChild(div);
        }

        // 初始化底部信息 & 触发初始联动过滤
        setTimeout(function() {
            _dytUpdateInfo();
            // 触发大运联动：过滤流年为当前大运的10年
            if (_dytSelectedDaYunIdx >= 0) {
                selectDaYun(_dytSelectedDaYunIdx);
            }
            // 滚动流日到今天（仅水平滚动容器，不触发页面垂直滚动）
            var activeRi = document.querySelector('.dyt-liuri-cell.active');
            if (activeRi) {
                var riScroll = activeRi.closest('.dyt-liuri-scroll');
                if (riScroll) {
                    riScroll.scrollLeft += activeRi.offsetLeft - riScroll.offsetWidth / 2 + activeRi.offsetWidth / 2;
                }
            }
        }, 0);
    }

    // 地支十神辅助（取藏干本气）
    function _dytGetZhiSS(dayGanIdx, zhiIdx) {
        var cangGan = Lunar.zhiCangGan[zhiIdx];
        if (!cangGan || cangGan.length === 0) return '';
        var mainGan = cangGan[0];
        var mainGanIdx = Lunar.tianGan.indexOf(mainGan);
        return Lunar.getShiShen(dayGanIdx, mainGanIdx);
    }

    // ==================== 命局基础分析 ====================

    /**
     * 渲染命局基础分析区（日元强弱+五行统计+命理提示）
     * 纯前端JS计算，不调用任何大模型API
     */
    function renderMingJuAnalysis(result) {
        if (typeof BaziAnalyzer === 'undefined' || !BaziAnalyzer.renderHTML) return;

        var html = BaziAnalyzer.renderHTML(result);
        if (!html) return;

        var ra = $('resultArea');
        if (ra) {
            var div = document.createElement('div');
            div.innerHTML = html;
            ra.appendChild(div);
        }
    }

    // ==================== 命理专业评测（格局/强弱喜忌/调候/神煞/综合评述） ====================

    function renderMingLiAnalysis(result) {
        if (typeof MingliAnalyzer === 'undefined') return;

        try {
            var mlResult = MingliAnalyzer.analyze(result);
            if (!mlResult || !mlResult.html) return;

            var ra = $('resultArea');
            if (ra) {
                var div = document.createElement('div');
                div.innerHTML = mlResult.html;
                ra.appendChild(div);
            }
        } catch(e) {
            console.warn('命理专业评测渲染异常:', e);
        }
    }

    // ==================== 专业命理评测 ====================

    function renderAIEvalButton() {
        var html = '<div class="result-card ai-eval-card" style="text-align:center;padding:16px;">';
        html += '<button id="btnAIEval" style="padding:12px 32px;background:linear-gradient(135deg,#DC143C,#8B4513);color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);">专业命理评测</button>';
        html += '<div style="font-size:11px;color:var(--text-light);margin-top:8px;">免费查看300字基础评测，完整流年大运心理疏导需消耗积分</div>';
        html += '</div>';

        var ra = $('resultArea');
        if (ra) {
            var div = document.createElement('div');
            div.innerHTML = html;
            ra.appendChild(div);
        }

        // 绑定AI评测按钮事件
        var btn = document.getElementById('btnAIEval');
        if (btn) {
            btn.addEventListener('click', function() {
                showAIEval();
            });
        }
    }

    function showAIEval() {
        // 先检查AI次数限制
        if (typeof window.V2Member !== 'undefined' && window.V2Member.checkAndUse) {
            var token = localStorage.getItem('v2_token');
            if (!token) {
                // 未登录用户：弹出会员弹窗提示登录
                window.V2Member.showMemberModal('请先登录后再使用专业命理评测功能');
                return;
            }
            // 已登录，走统一会员检查
            window.V2Member.checkAndUse().then(function(result) {
                if (!result.allowed) {
                    if (result.data && result.data.reason === 'daily_limit') {
                        window.V2Member.showDailyLimitModal();
                    } else {
                        window.V2Member.showMemberModal(result.message);
                    }
                    return;
                }
                _doAIEval();
            });
            return;
        }
        // 未登录或V2Member未加载，直接执行
        _doAIEval();
    }

    function _doAIEval() {
        // 基础免费评测（500字左右）
        var result = lastPaipanResult;
        if (!result) { showToast('请先排盘'); return; }

        var p = result.pillars;
        var dayGanIdx = p.day.ganIndex;
        var dayGan = p.day.gan;
        var dayWX = Lunar.wuXingGan[dayGanIdx];

        // 五行统计
        var wx = result.wuXing;
        var dayWXCount = wx[dayWX] || 0;

        // 日主强弱分析（综合月令、得令、得地、得势）
        var monthWX = Lunar.wuXingZhi[p.month.zhiIndex];
        var monthSupport = (monthWX === dayWX) ? 2 : 0;
        // 藏干中的同五行
        var cangGanSupport = 0;
        ['year', 'month', 'day', 'hour'].forEach(function(key) {
            p[key].cangGan.forEach(function(cg) {
                var cgWX = Lunar.wuXingGan[Lunar.tianGan.indexOf(cg.gan)];
                if (cgWX === dayWX) cangGanSupport++;
            });
        });
        var totalSupport = dayWXCount + monthSupport + cangGanSupport;
        var strength = totalSupport >= 5 ? '身强' : (totalSupport >= 3 ? '身中和' : '身弱');

        // 找出最旺和最弱的五行
        var wxNames = ['木', '火', '土', '金', '水'];
        var wxCounts = wxNames.map(function(n) { return { name: n, count: wx[n] || 0 }; });
        wxCounts.sort(function(a, b) { return b.count - a.count; });
        var strongestWX = wxCounts[0];
        var weakestWX = wxCounts[wxCounts.length - 1];

        // 喜忌分析
        var xiYongShen = '';
        var jiShen = '';
        var xiYongDetail = '';
        var jiShenDetail = '';
        if (strength === '身强') {
            xiYongShen = weakestWX.count < 2 ? weakestWX.name : '食伤';
            jiShen = strongestWX.name;
            xiYongDetail = '身强之命，日主力量充沛，宜泄耗为用。喜用神为' + xiYongShen + '，宜从事消耗日主五行的行业，如' + getWXIndustry(xiYongShen) + '。在' + xiYongShen + '旺相的流年大运中，事业财运多有提升。';
            jiShenDetail = '忌神为' + jiShen + '，' + jiShen + '过旺会使命局失衡，需注意克制。在' + jiShen + '流年需谨慎行事，避免冲动决策。';
        } else if (strength === '身弱') {
            xiYongShen = dayWX;
            jiShen = strongestWX.count >= 3 ? strongestWX.name : '财星';
            xiYongDetail = '身弱之命，日主力量不足，宜生扶为用。喜用神为' + xiYongShen + '，宜从事生助日主五行的行业，如' + getWXIndustry(xiYongShen) + '。多结交贵人，借助他人之力成就事业。';
            jiShenDetail = '忌神为' + jiShen + '，' + jiShen + '会进一步消耗日主力量。在' + jiShen + '流年需注意身体保养，避免过度劳累。';
        } else {
            xiYongShen = '平衡';
            jiShen = '无明显忌神';
            xiYongDetail = '身中和之命，日主力量适中，五行相对平衡。进退有度，运势较为平稳，适合稳中求进。宜保持五行互补，不宜偏颇。';
            jiShenDetail = '五行分布较为均衡，无明显忌神。只需注意流年大运中某一五行过旺或过弱时的调和。';
        }

        // 日主性格分析
        var ganCharMap = {
            '甲': '甲木为参天大树，性格正直刚毅，有领导才能，做事有条理，但有时过于固执。为人宽厚仁慈，有上进心，适合从事管理、教育等行业。',
            '乙': '乙木为花草藤蔓，性格柔顺温和，善于交际，适应力强。心思细腻，有艺术天赋，但有时优柔寡断。适合从事文艺、设计等行业。',
            '丙': '丙火为太阳之火，性格热情开朗，光明磊落，有感染力。做事果断大方，乐于助人，但有时急躁冲动。适合从事演艺、公关等行业。',
            '丁': '丁火为灯烛之火，性格内敛细腻，心思缜密，有洞察力。做事认真负责，追求完美，但有时多疑敏感。适合从事研究、策划等行业。',
            '戊': '戊土为高山大地，性格沉稳厚重，诚实守信，有包容力。做事踏实稳重，有耐心，但有时过于保守。适合从事房地产、农业等行业。',
            '己': '己土为田园之土，性格温和谦逊，善于照顾他人，有服务精神。做事细心周到，注重细节，但有时缺乏主见。适合从事服务、医疗等行业。',
            '庚': '庚金为刀剑之金，性格刚毅果断，有正义感，行动力强。做事雷厉风行，不拖泥带水，但有时过于强硬。适合从事军警、法律等行业。',
            '辛': '辛金为珠玉之金，性格精致优雅，有审美眼光，追求品质。做事认真细致，有自尊心，但有时过于挑剔。适合从事珠宝、金融等行业。',
            '壬': '壬水为江河之水，性格聪明机智，思维敏捷，有智慧。做事灵活变通，善于把握机会，但有时不够专注。适合从事贸易、物流等行业。',
            '癸': '癸水为雨露之水，性格温柔细腻，有想象力，直觉敏锐。做事耐心细致，有包容力，但有时过于内向。适合从事文学、艺术等行业。'
        };
        var dayCharDesc = ganCharMap[dayGan] || '日主' + dayGan + '属' + dayWX + '，性格特点需结合命局综合分析。';

        // 五行旺衰详细分析
        var wxDetailDesc = '';
        wxNames.forEach(function(name) {
            var count = wx[name] || 0;
            var status = '';
            if (count === 0) status = '【缺】';
            else if (count >= 4) status = '【过旺】';
            else if (count >= 3) status = '【偏旺】';
            else if (count === 1) status = '【偏弱】';
            else status = '【适中】';
            wxDetailDesc += name + '：' + count + '个 ' + status + '；';
        });
        wxDetailDesc = wxDetailDesc.slice(0, -1) + '。';

        // 夫妻宫分析（日支）
        var dayZhi = p.day.zhi;
        var dayZhiWX = Lunar.wuXingZhi[p.day.zhiIndex];
        var fuqiDesc = '';
        var zhiCangGan = Lunar.zhiCangGan[p.day.zhiIndex];
        if (zhiCangGan.length > 0) {
            var mainGan = zhiCangGan[0];
            var mainGanIdx = Lunar.tianGan.indexOf(mainGan);
            var mainSS = Lunar.getShiShen(dayGanIdx, mainGanIdx);
            if (mainSS === '正财' || mainSS === '偏财') {
                fuqiDesc = '日支' + dayZhi + '藏' + mainGan + '为' + mainSS + '，夫妻宫坐财星，配偶善于理财，婚姻生活富足。配偶多为务实之人，重视物质基础，家庭观念较强。';
            } else if (mainSS === '正官' || mainSS === '七杀') {
                fuqiDesc = '日支' + dayZhi + '藏' + mainGan + '为' + mainSS + '，夫妻宫坐官杀，配偶有威严，事业心强。配偶多为有能力之人，在事业上有成就，但需注意沟通方式。';
            } else if (mainSS === '正印' || mainSS === '偏印') {
                fuqiDesc = '日支' + dayZhi + '藏' + mainGan + '为' + mainSS + '，夫妻宫坐印星，配偶温厚贤良，注重家庭。配偶多为有学识之人，善于持家，婚姻关系和谐稳定。';
            } else {
                fuqiDesc = '日支' + dayZhi + '藏' + mainGan + '为' + mainSS + '，夫妻宫坐比劫，配偶性格刚强，需注意沟通。双方容易产生分歧，建议多包容理解，保持良好沟通。';
            }
        }

        // 事业宫分析（时柱）
        var hourGan = p.hour.gan;
        var hourZhi = p.hour.zhi;
        var hourSS = p.hour.shiShen;
        var shiyeDesc = '';
        if (hourSS === '正官' || hourSS === '七杀') {
            shiyeDesc = '时柱' + hourGan + hourZhi + '，时干为' + hourSS + '，适合从事管理、公职或技术类工作，事业运势稳健。中晚年事业有成，有升迁之象，宜在体制内或大型企业发展。';
        } else if (hourSS === '正财' || hourSS === '偏财') {
            shiyeDesc = '时柱' + hourGan + hourZhi + '，时干为' + hourSS + '，适合从事商业、金融或投资类工作，财运亨通。中晚年财运渐佳，善于理财投资，有聚财之能。';
        } else if (hourSS === '食神' || hourSS === '伤官') {
            shiyeDesc = '时柱' + hourGan + hourZhi + '，时干为' + hourSS + '，适合从事创意、艺术或技术类工作，才华横溢。中晚年凭借才华获得成就，适合自由职业或创业。';
        } else if (hourSS === '正印' || hourSS === '偏印') {
            shiyeDesc = '时柱' + hourGan + hourZhi + '，时干为' + hourSS + '，适合从事教育、学术或文化类工作，学识渊博。中晚年受人尊敬，适合从事教育培训或研究工作。';
        } else {
            shiyeDesc = '时柱' + hourGan + hourZhi + '，时干为' + hourSS + '，适合自主创业或合伙经营，有独立发展能力。中晚年人脉广阔，适合团队合作发展事业。';
        }

        // 健康宫分析
        var jiankangDesc = '';
        var missingWX = wxNames.filter(function(n) { return (wx[n] || 0) === 0; });
        var wxOrganMap = { '木': '肝胆', '火': '心脏小肠', '土': '脾胃', '金': '肺大肠', '水': '肾膀胱' };
        var wxAdviceMap = { '木': '多吃绿色蔬菜，保持情绪舒畅，适当运动', '火': '注意作息规律，避免过度劳累，多食红色食物', '土': '饮食规律，避免暴饮暴食，注意消化系统', '金': '注意呼吸系统保养，多食白色食物，避免干燥', '水': '注意肾脏保养，多饮水，注意保暖' };
        if (missingWX.length > 0) {
            var organs = missingWX.map(function(n) { return wxOrganMap[n]; }).join('、');
            var advices = missingWX.map(function(n) { return n + '：' + wxAdviceMap[n]; }).join('；');
            jiankangDesc = '五行缺' + missingWX.join('、') + '，需注意' + organs + '方面的健康保养。建议：' + advices + '。';
        } else if (strongestWX.count >= 4) {
            jiankangDesc = strongestWX.name + '过旺（' + strongestWX.count + '个），需注意' + wxOrganMap[strongestWX.name] + '方面的健康问题。建议适当调理，保持五行平衡。';
        } else {
            jiankangDesc = '五行分布较为均衡，身体素质总体良好。建议注意日常养生，保持规律作息和均衡饮食。';
        }

        // 流年运势预测
        var currentYear = new Date().getFullYear();
        var liuNianGZ = Lunar.getYearGanZhi(currentYear, new Date().getMonth() + 1, new Date().getDate());
        var liuNianGanWX = Lunar.wuXingGan[liuNianGZ.ganIndex];
        var liuNianZhiWX = Lunar.wuXingZhi[liuNianGZ.zhiIndex];
        var liuNianSS = Lunar.getShiShen(dayGanIdx, liuNianGZ.ganIndex);
        var liuNianDesc = '';
        if (liuNianSS === '正财' || liuNianSS === '偏财') {
            liuNianDesc = currentYear + '年流年天干为' + liuNianGZ.gan + '（' + liuNianSS + '），财运方面有较好表现，正财稳定，偏财有机会。适合积极拓展业务，把握投资机会。';
        } else if (liuNianSS === '正官' || liuNianSS === '七杀') {
            liuNianDesc = currentYear + '年流年天干为' + liuNianGZ.gan + '（' + liuNianSS + '），事业方面压力与机遇并存，有升职加薪的可能，但也需承担更多责任。注意人际关系处理。';
        } else if (liuNianSS === '食神' || liuNianSS === '伤官') {
            liuNianDesc = currentYear + '年流年天干为' + liuNianGZ.gan + '（' + liuNianSS + '），才华得以展现，适合发挥创意和技能。但伤官见官需注意口舌是非，保持低调。';
        } else if (liuNianSS === '正印' || liuNianSS === '偏印') {
            liuNianDesc = currentYear + '年流年天干为' + liuNianGZ.gan + '（' + liuNianSS + '），学业和贵人运较好，有进修学习的机会。适合提升自我，考取证书或学习新技能。';
        } else {
            liuNianDesc = currentYear + '年流年天干为' + liuNianGZ.gan + '（' + liuNianSS + '），人际关系活跃，社交运佳。适合拓展人脉，团队合作有成效。但需注意避免与人发生冲突。';
        }

        // 构建卡片式UI
        var html = '<div class="result-card ai-eval-card">';
        html += '<div class="result-title">专业命理评测</div>';

        // 卡片1：日主分析
        html += '<div class="ai-eval-item">';
        html += '<div class="ai-eval-item-header"><span class="ai-eval-icon">👤</span><span class="ai-eval-item-title">日主分析</span></div>';
        html += '<div class="ai-eval-item-body">';
        html += '<p>日主<strong>' + dayGan + '</strong>属<strong>' + dayWX + '</strong>，命局' + dayWX + '共计' + dayWXCount + '个，月令' + p.month.zhi + '属' + monthWX + (monthSupport > 0 ? '得令' : '不得令') + '，综合判定为<strong>' + strength + '</strong>（得力因素' + totalSupport + '项）。</p>';
        html += '<p>' + dayCharDesc + '</p>';
        html += '</div></div>';

        // 卡片2：八字喜忌
        html += '<div class="ai-eval-item">';
        html += '<div class="ai-eval-item-header"><span class="ai-eval-icon">⚖️</span><span class="ai-eval-item-title">八字喜忌</span></div>';
        html += '<div class="ai-eval-item-body">';
        html += '<p>喜用神：<span class="xi-yong-shen">' + xiYongShen + '</span></p>';
        html += '<p>' + xiYongDetail + '</p>';
        html += '<p>忌神：<span class="ji-shen">' + jiShen + '</span></p>';
        html += '<p>' + jiShenDetail + '</p>';
        html += '</div></div>';

        // 卡片3：五行旺衰
        html += '<div class="ai-eval-item">';
        html += '<div class="ai-eval-item-header"><span class="ai-eval-icon">🔥</span><span class="ai-eval-item-title">五行旺衰</span></div>';
        html += '<div class="ai-eval-item-body">';
        html += '<div class="wuxing-detail-bar">';
        wxNames.forEach(function(name) {
            var count = wx[name] || 0;
            var status = '';
            var statusClass = '';
            if (count === 0) { status = '缺'; statusClass = 'wx-missing'; }
            else if (count >= 4) { status = '旺'; statusClass = 'wx-strong'; }
            else if (count >= 3) { status = '偏旺'; statusClass = 'wx-strong'; }
            else if (count === 1) { status = '弱'; statusClass = ''; }
            else { status = ''; statusClass = ''; }
            html += '<div class="wuxing-detail-item">';
            html += '<span class="wuxing-detail-name ' + 'wx-' + name + '">' + name + '</span>';
            html += '<div class="wuxing-detail-bar-bg"><div class="wuxing-detail-bar-fill wx-bg-' + name + '" style="width:' + (count * 20) + '%;"></div></div>';
            html += '<span class="wuxing-detail-count">' + count + '</span>';
            if (status) html += '<span class="wuxing-detail-status ' + statusClass + '">' + status + '</span>';
            html += '</div>';
        });
        html += '</div>';
        html += '<p style="margin-top:8px;">' + wxDetailDesc + '</p>';
        html += '</div></div>';

        // 卡片4：夫妻宫
        html += '<div class="ai-eval-item">';
        html += '<div class="ai-eval-item-header"><span class="ai-eval-icon">💑</span><span class="ai-eval-item-title">夫妻宫分析</span></div>';
        html += '<div class="ai-eval-item-body">';
        html += '<p>' + fuqiDesc + '</p>';
        html += '</div></div>';

        // 卡片5：事业宫
        html += '<div class="ai-eval-item">';
        html += '<div class="ai-eval-item-header"><span class="ai-eval-icon">💼</span><span class="ai-eval-item-title">事业宫分析</span></div>';
        html += '<div class="ai-eval-item-body">';
        html += '<p>' + shiyeDesc + '</p>';
        html += '</div></div>';

        // 卡片6：健康宫
        html += '<div class="ai-eval-item">';
        html += '<div class="ai-eval-item-header"><span class="ai-eval-icon">🏥</span><span class="ai-eval-item-title">健康宫分析</span></div>';
        html += '<div class="ai-eval-item-body">';
        html += '<p>' + jiankangDesc + '</p>';
        html += '</div></div>';

        // 卡片7：流年运势
        html += '<div class="ai-eval-item">';
        html += '<div class="ai-eval-item-header"><span class="ai-eval-icon">📅</span><span class="ai-eval-item-title">' + currentYear + '年流年运势</span></div>';
        html += '<div class="ai-eval-item-body">';
        html += '<p>流年干支：<strong>' + liuNianGZ.gan + liuNianGZ.zhi + '</strong>（' + liuNianGanWX + liuNianZhiWX + '）</p>';
        html += '<p>' + liuNianDesc + '</p>';
        html += '</div></div>';

        // 分享按钮
        html += '<div style="text-align:center;margin-top:16px;">';
        html += '<button id="btnShareEval" style="padding:8px 24px;background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border-color);border-radius:20px;font-size:13px;cursor:pointer;">分享评测结果</button>';
        html += '</div>';

        // 分隔线
        html += '<div class="ai-eval-divider"></div>';

        // 引导区域
        html += '<div class="ai-eval-paid-section">';
        html += '<div class="ai-eval-paid-title">完整流年大运心理疏导</div>';
        html += '<div class="ai-eval-paid-features">';
        html += '<div class="paid-feature-item">✓ 十年大运逐年详细分析</div>';
        html += '<div class="paid-feature-item">✓ 每年流月运势预测</div>';
        html += '<div class="paid-feature-item">✓ 事业财运婚姻健康综合指导</div>';
        html += '<div class="paid-feature-item">✓ 个性化心理疏导建议</div>';
        html += '</div>';
        html += '<button id="btnAIEvalFull" class="btn-ai-eval-full">添加站长微信了解更多</button>';
        html += '<div class="ai-eval-paid-note">微信号：DLing3313</div>';
        html += '</div>';

        html += '</div>';

        // 替换AI评测按钮
        var oldCard = document.querySelector('.ai-eval-card');
        if (oldCard) {
            var div = document.createElement('div');
            div.innerHTML = html;
            oldCard.parentNode.replaceChild(div, oldCard);
        }

        // 绑定完整评测按钮事件
        var fullBtn = document.getElementById('btnAIEvalFull');
        if (fullBtn) {
            fullBtn.addEventListener('click', function() {
                showWechatGuide();
            });
        }

        // 绑定分享按钮事件
        var shareBtn = document.getElementById('btnShareEval');
        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                showToast('分享功能开发中');
            });
        }
    }

    /**
     * 获取五行对应行业
     */
    function getWXIndustry(wxName) {
        var map = {
            '木': '教育、出版、园林、服装',
            '火': '电子、餐饮、能源、传媒',
            '土': '房地产、农业、矿业、建筑',
            '金': '金融、机械、珠宝、法律',
            '水': '物流、旅游、贸易、渔业'
        };
        return map[wxName] || '相关行业';
    }

    function getGanColor(ganIdx) {
        var wx = Lunar.wuXingGan[ganIdx];
        var colors = { '金': '#DAA520', '木': '#2E8B57', '水': '#4169E1', '火': '#DC143C', '土': '#8B4513' };
        return colors[wx] || '#333';
    }

    function getZhiColor(zhiIdx) {
        var wx = Lunar.wuXingZhi[zhiIdx];
        var colors = { '金': '#DAA520', '木': '#2E8B57', '水': '#4169E1', '火': '#DC143C', '土': '#8B4513' };
        return colors[wx] || '#333';
    }

    // ==================== 记录管理 ====================

    /**
     * 保存排盘记录到后端（异步）
     * @param {object} result - 排盘结果
     * @param {string} name - 姓名
     */
    async function saveRecordAsync(result, name) {
        var sd = result.solarDate;
        var ld = result.lunarDate;
        var pillars = result.pillars;

        // 重名自动编号：检查已有记录中同名数量（先获取现有记录）
        var existingRecords = await Storage.getRecords();
        var sameNameCount = 0;
        existingRecords.forEach(function(r) {
            if (r.name === name || r.name.indexOf(name) === 0) {
                sameNameCount++;
            }
        });
        var displayName = sameNameCount > 0 ? name + sameNameCount : name;

        var record = {
            id: Date.now(),
            name: displayName,
            solarDate: sd.year + '-' + padZero(sd.month) + '-' + padZero(sd.day),
            lunarDate: ld.monthName + ld.dayName,
            gender: result.gender,
            shengXiao: ld.shengXiao,
            baziStr: pillars.year.ganZhi + ' ' + pillars.month.ganZhi + ' ' + pillars.day.ganZhi + ' ' + pillars.hour.ganZhi,
            formData: {
                year: sd.year,
                month: sd.month,
                day: sd.day,
                hour: sd.hour,
                minute: sd.minute,
                gender: result.gender,
                calendarType: calendarType,
                name: name,
                province: $('selectProvince').value,
                city: $('selectCity').value
            },
            createTime: Date.now()
        };

        var res = await Storage.saveRecord(record);
        if (res.success) {
            showToast('排盘记录已保存');
        } else {
            showToast('记录保存失败：' + (res.message || '未知错误'));
        }
    }

    /**
     * 渲染记录列表（异步版本）
     */
    async function renderRecords() {
        try {
        var recordList = $('recordList');
        var emptyState = $('emptyState');

        // 安全检查：确保DOM元素存在
        if (!recordList || !emptyState) {
            console.error('[renderRecords] DOM元素不存在: recordList=', !!recordList, 'emptyState=', !!emptyState);
            return;
        }

        if (!Storage.isLoggedIn()) {
            recordList.innerHTML = '';
            emptyState.style.display = 'block';
            emptyState.querySelector('.empty-icon').textContent = '🔒';
            emptyState.children[1].textContent = '请先登录查看记录';
            emptyState.children[2].textContent = '点击上方用户栏进行登录';
            // 显示登录/注册按钮
            var btnLogin = $('btnEmptyLogin');
            var btnReg = $('btnEmptyRegister');
            if (btnLogin) btnLogin.style.display = 'inline-block';
            if (btnReg) btnReg.style.display = 'inline-block';
            return;
        }

        // 显示加载中
        recordList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">加载中...</div>';

        // 异步获取记录
        var records = await Storage.getRecords();

        if (records.length === 0) {
            recordList.innerHTML = '';
            emptyState.style.display = 'block';
            emptyState.querySelector('.empty-icon').textContent = '📋';
            emptyState.children[1].textContent = '暂无排盘记录';
            emptyState.children[2].textContent = '排盘后自动保存';
            // 已登录但无记录：隐藏登录/注册按钮
            var btnLogin = $('btnEmptyLogin');
            var btnReg = $('btnEmptyRegister');
            if (btnLogin) btnLogin.style.display = 'none';
            if (btnReg) btnReg.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';

        var html = '';
        records.forEach(function (r) {
            var date = new Date(r.createTime);
            var timeStr = date.getFullYear() + '/' + padZero(date.getMonth() + 1) + '/' + padZero(date.getDate()) + ' ' + padZero(date.getHours()) + ':' + padZero(date.getMinutes()) + ':' + padZero(date.getSeconds());

            html += '<div class="record-item" data-id="' + r.id + '">';
            html += '  <div class="record-info">';
            html += '    <div class="record-name">' + escapeHtml(r.name) + '（' + escapeHtml(r.gender) + '，' + escapeHtml(r.shengXiao) + '）</div>';
            html += '    <div class="record-date">' + escapeHtml(r.solarDate) + '（' + escapeHtml(r.lunarDate) + '）</div>';
            html += '    <div class="record-bazi">' + escapeHtml(r.baziStr) + '</div>';
            html += '    <div class="record-date" style="margin-top:2px">保存于 ' + timeStr + '</div>';
            html += '  </div>';
            html += '  <div class="record-actions">';
            html += '    <button class="btn-delete" data-id="' + r.id + '">删除</button>';
            html += '  </div>';
            html += '</div>';
        });

        recordList.innerHTML = html;

        // 绑定删除按钮事件（异步）
        recordList.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                e.stopPropagation();
                var id = parseInt(this.getAttribute('data-id'));
                try {
                    if (confirm('确定要删除这条记录吗？')) {
                        var success = await Storage.deleteRecord(id);
                        if (success) {
                            renderRecords();
                            showToast('记录已删除');
                        } else {
                            showToast('删除失败，请重试');
                        }
                    }
                } catch (err) {
                    console.error('[deleteRecord] 删除出错:', err);
                    showToast('删除失败，请刷新页面重试');
                    renderRecords();
                }
            });
        });

        // 绑定记录点击事件（查看排盘详情，不重复保存）
        recordList.querySelectorAll('.record-item').forEach(function (item) {
            item.addEventListener('click', function () {
                var id = parseInt(this.getAttribute('data-id'));
                var record = records.find(function (r) { return r.id === id; });
                if (record && record.formData) {
                    loadFormData(record.formData);
                    // 先切换到排盘页面
                    switchPage('pagePaipan');
                    // 再隐藏输入表单、显示返回记录按钮（在switchPage之后执行，覆盖其恢复逻辑）
                    var formSection = document.querySelector('.form-section');
                    if (formSection) formSection.style.display = 'none';
                    var backBtn = $('backToRecords');
                    if (backBtn) backBtn.style.display = 'inline-block';
                    // 标记为查看模式，不自动保存记录
                    _viewingRecord = true;
                    doPaipan();
                    _viewingRecord = false;
                }
            });
        });
        } catch (err) {
            console.error('[renderRecords] 渲染出错:', err);
            // 确保不会白屏：恢复空状态显示
            try {
                var recordList = $('recordList');
                var emptyState = $('emptyState');
                if (recordList) recordList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">记录加载异常，请刷新页面</div>';
                if (emptyState) emptyState.style.display = 'none';
            } catch(e) {}
        }
    }

    /**
     * 从记录数据加载到表单
     * @param {object} formData - 表单数据
     */
    function loadFormData(formData) {
        $('inputName').value = formData.name || '';

        // 设置日历类型
        calendarType = formData.calendarType || 'solar';
        var calItems = document.querySelectorAll('#calendarSwitch .switch-item');
        calItems.forEach(function (item) {
            item.classList.remove('active');
            if (item.getAttribute('data-type') === calendarType) {
                item.classList.add('active');
            }
        });

        // 设置日期
        $('selectYear').value = formData.year;
        $('selectMonth').value = formData.month;
        fillDays();
        $('selectDay').value = formData.day;
        $('selectHour').value = formData.hour;
        $('selectMinute').value = formData.minute;

        // 设置性别
        gender = formData.gender;
        var genderItems = document.querySelectorAll('#genderSwitch .gender-item');
        genderItems.forEach(function (item) {
            item.classList.remove('active');
            if (parseInt(item.getAttribute('data-gender')) === gender) {
                item.classList.add('active');
            }
        });

        // 设置出生地
        if (formData.province) {
            $('selectProvince').value = formData.province;
            onProvinceChange();
            if (formData.city) {
                $('selectCity').value = formData.city;
            }
        }
    }

    // ==================== 登录/注册 ====================

    /**
     * 显示登录弹窗
     */
    function showLoginModal() {
        loginMode = 'login';
        $('modalTitle').textContent = '登录';
        $('btnLogin').textContent = '登录';
        $('switchLink').innerHTML = '没有账号？<a id="switchToRegister">去注册</a>';
        $('loginUsername').value = '';
        $('loginPassword').value = '';
        // 确保登录模式下隐藏验证码区域
        var captchaGroup = document.getElementById('captchaGroup');
        var captchaInput = document.getElementById('captchaInput');
        if (captchaGroup) captchaGroup.style.display = 'none';
        if (captchaInput) captchaInput.value = '';
        $('loginModal').classList.add('active');
    }

    /**
     * 隐藏登录弹窗
     */
    function hideLoginModal() {
        $('loginModal').classList.remove('active');
    }

    /**
     * 切换登录/注册模式
     */
    function toggleLoginMode() {
        var captchaGroup = document.getElementById('captchaGroup');
        var captchaInput = document.getElementById('captchaInput');
        var captchaImg = document.getElementById('captchaImg');
        if (loginMode === 'login') {
            loginMode = 'register';
            $('modalTitle').textContent = '注册';
            $('btnLogin').textContent = '注册';
            $('switchLink').innerHTML = '已有账号？<a id="switchToRegister">去登录</a>';
            // 显示验证码区域并刷新
            if (captchaGroup) captchaGroup.style.display = '';
            if (captchaInput) captchaInput.value = '';
            if (captchaImg) captchaImg.src = '/api/captcha?t=' + Date.now();
        } else {
            loginMode = 'login';
            $('modalTitle').textContent = '登录';
            $('btnLogin').textContent = '登录';
            $('switchLink').innerHTML = '没有账号？<a id="switchToRegister">去注册</a>';
            // 隐藏验证码区域
            if (captchaGroup) captchaGroup.style.display = 'none';
            if (captchaInput) captchaInput.value = '';
        }
    }

    /**
     * 执行登录或注册操作（异步，支持V2API）
     */
    async function doLoginOrRegister() {
        var username = $('loginUsername').value.trim();
        var password = $('loginPassword').value.trim();

        if (!username) {
            showToast('请输入用户名');
            return;
        }
        if (username.length < 2) {
            showToast('用户名至少2个字符');
            return;
        }
        if (!password) {
            showToast('请输入密码');
            return;
        }
        if (password.length < 6) {
            showToast('密码至少6位');
            return;
        }

        if (loginMode === 'register') {
            // 注册：前端验证码校验
            var captchaInput = document.getElementById('captchaInput');
            var captchaValue = captchaInput ? captchaInput.value.trim() : '';
            if (!captchaValue) {
                showToast('请输入验证码');
                return;
            }
            // 注册
            try {
                var regResult;
                if (typeof V2API !== 'undefined') {
                    regResult = await V2API.register(username, password, captchaValue);
                } else {
                    regResult = Storage.register(username, password);
                }
                if (regResult.success) {
                    showToast('注册成功，请登录');
                    toggleLoginMode();
                } else {
                    showToast(regResult.message);
                    // 注册失败时刷新验证码
                    var captchaImg = document.getElementById('captchaImg');
                    if (captchaImg) captchaImg.src = '/api/captcha?t=' + Date.now();
                    if (captchaInput) captchaInput.value = '';
                }
            } catch (err) {
                showToast('注册失败，请检查网络');
            }
        } else {
            // 登录
            try {
                var loginResult;
                if (typeof V2API !== 'undefined') {
                    loginResult = await V2API.login(username, password);
                } else {
                    // 优先尝试 API 登录（支持数据库中的账号如 admin）
                    try {
                        var resp = await fetch('/api/user/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: username, password: password })
                        });
                        var json = await resp.json();
                        if (json.code === 200 && json.data && json.data.token) {
                            // API 登录成功，保存 token 到 localStorage
                            localStorage.setItem('v2_token', json.data.token);

                            // 稳健获取 member_level：优先从 member_level 取，再用 level 兜底
                            var memberLevel = (json.data && json.data.member_level !== undefined) ? json.data.member_level : -1;
                            if (memberLevel === -1) {
                                memberLevel = (json.data && json.data.level === 'vip') ? 1 : 0;
                            }

                            localStorage.setItem('v2_user', JSON.stringify({
                                username: json.data.username,
                                level: json.data.level,
                                role: json.data.role || (json.data.username === 'admin' ? 'admin' : ''),
                                member_level: memberLevel,
                                member_expire_time: json.data.member_expire_time || 0,
                                vip_expire_time: json.data.vip_expire_time || ''
                            }));

                            // 修复验证日志
                            console.log('[v2_user存储确认] member_level 实际写入值:', memberLevel);
                            var confirmRead = JSON.parse(localStorage.getItem('v2_user'));
                            console.log('[v2_user回读确认] member_level:', confirmRead.member_level);

                            localStorage.setItem('bazi_current_user', JSON.stringify({
                                username: json.data.username,
                                createTime: Date.now()
                            }));
                            loginResult = { success: true, user: json.data };
                        } else {
                            throw new Error(json.message || 'API登录失败');
                        }
                    } catch (apiErr) {
                        // API 登录失败，回退到 localStorage 登录
                        var user = Storage.login(username, password);
                        loginResult = user ? { success: true, user: user } : { success: false, message: '用户名或密码错误' };
                    }
                }
                if (loginResult.success) {
                    hideLoginModal();
                    updateUserBar();
                    // 如果当前在记录页，刷新记录列表
                    if ($('pageRecords').classList.contains('active')) {
                        renderRecords();
                    }
                    showToast('登录成功，欢迎 ' + (loginResult.user ? loginResult.user.username : username));
                } else {
                    showToast(loginResult.message || '用户名或密码错误');
                }
            } catch (err) {
                showToast('登录失败，请检查网络');
            }
        }
    }

    // ==================== 修改密码 ====================

    function showChangePwdModal() {
        $('oldPassword').value = '';
        $('newPassword').value = '';
        $('confirmPassword').value = '';
        $('changePwdModal').classList.add('active');
    }

    function doChangePassword() {
        var user = Storage.getCurrentUser();
        if (!user) { showToast('请先登录'); return; }
        var oldPwd = $('oldPassword').value.trim();
        var newPwd = $('newPassword').value.trim();
        var confirmPwd = $('confirmPassword').value.trim();
        if (!oldPwd || !newPwd || !confirmPwd) { showToast('请填写完整'); return; }
        if (newPwd !== confirmPwd) { showToast('两次密码不一致'); return; }
        if (newPwd.length < 6) { showToast('密码至少6位'); return; }
        var result = Storage.changePassword(user.username, oldPwd, newPwd);
        showToast(result.message);
        if (result.success) {
            $('changePwdModal').classList.remove('active');
        }
    }

    // ==================== 管理员后台 ====================

    function showAdminLoginModal() {
        $('adminUsername').value = '';
        $('adminPassword').value = '';
        $('adminLoginModal').classList.add('active');
    }

    function doAdminLogin() {
        var username = $('adminUsername').value.trim();
        var password = $('adminPassword').value.trim();
        if (!username || !password) { showToast('请输入账号和密码'); return; }
        if (Storage.adminLogin(username, password)) {
            $('adminLoginModal').classList.remove('active');
            // 切换到管理员页面
            var pages = document.querySelectorAll('.page');
            pages.forEach(function (p) { p.classList.remove('active'); });
            $('pageAdmin').classList.add('active');
            var navItems = document.querySelectorAll('#bottomNav .nav-item');
            navItems.forEach(function (item) { item.classList.remove('active'); });
            renderAdminPanel();
            showToast('管理员登录成功');
        } else {
            showToast('管理员账号或密码错误');
        }
    }

    function renderAdminPanel() {
        // 显示会员管理页面链接
        var membersLink = $('adminMembersLink');
        if (membersLink) membersLink.style.display = 'inline';

        // 统计数据
        var users = Storage.getAllUsers();
        var totalUsers = Object.keys(users).length;
        var totalRecords = Storage.getTotalRecords();
        var todayUsers = Storage.getTodayNewUsers();
        $('statTotalUsers').textContent = totalUsers;
        $('statTotalRecords').textContent = totalRecords;
        $('statTodayUsers').textContent = todayUsers;

        // 用户列表
        var userHtml = '';
        for (var username in users) {
            var u = users[username];
            var date = new Date(u.createTime);
            var timeStr = date.getFullYear() + '/' + padZero(date.getMonth() + 1) + '/' + padZero(date.getDate());
            userHtml += '<div class="admin-user-item">';
            userHtml += '  <div class="admin-user-name">' + escapeHtml(username) + '</div>';
            userHtml += '  <div class="admin-user-info">注册时间：' + timeStr + '</div>';
            userHtml += '  <button class="admin-btn-delete" data-username="' + escapeHtml(username) + '">删除用户</button>';
            userHtml += '</div>';
        }
        if (!userHtml) userHtml = '<div style="text-align:center;color:var(--text-light);padding:20px;">暂无注册用户</div>';
        $('adminUserList').innerHTML = userHtml;

        // 绑定删除用户事件
        $('adminUserList').querySelectorAll('.admin-btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var uname = this.getAttribute('data-username');
                if (confirm('确定删除用户 "' + uname + '" 及其所有记录？')) {
                    Storage.deleteUser(uname);
                    renderAdminPanel();
                    showToast('用户已删除');
                }
            });
        });

        // 排盘记录列表
        var records = Storage.getAllRecords();
        var recordHtml = '';
        records.slice(0, 50).forEach(function (r) {
            var date = new Date(r.createTime);
            var timeStr = date.getFullYear() + '/' + padZero(date.getMonth() + 1) + '/' + padZero(date.getDate()) + ' ' + padZero(date.getHours()) + ':' + padZero(date.getMinutes());
            recordHtml += '<div class="admin-record-item">';
            recordHtml += '  <div class="admin-user-name">' + escapeHtml(r._username || '未知') + ' - ' + escapeHtml(r.name || '') + '</div>';
            recordHtml += '  <div class="admin-user-info">' + (r.solarDate || '') + ' | ' + (r.baziStr || '') + '</div>';
            recordHtml += '  <div class="admin-user-info">保存于 ' + timeStr + '</div>';
            recordHtml += '</div>';
        });
        if (!recordHtml) recordHtml = '<div style="text-align:center;color:var(--text-light);padding:20px;">暂无排盘记录</div>';
        $('adminRecordList').innerHTML = recordHtml;

        // 会员列表
        renderMembershipList();
    }

    function doAdminChangePwd() {
        var oldPwd = $('adminOldPwd').value.trim();
        var newPwd = $('adminNewPwd').value.trim();
        var confirmPwd = $('adminConfirmPwd').value.trim();
        if (!oldPwd || !newPwd || !confirmPwd) { showToast('请填写完整'); return; }
        if (newPwd !== confirmPwd) { showToast('两次密码不一致'); return; }
        if (newPwd.length < 6) { showToast('密码至少6位'); return; }
        var result = Storage.adminChangePassword(oldPwd, newPwd);
        showToast(result.message);
        if (result.success) {
            $('adminOldPwd').value = '';
            $('adminNewPwd').value = '';
            $('adminConfirmPwd').value = '';
        }
    }

    // ==================== 会员管理 ====================

    /**
     * 管理员功能
     */
    function adminActivateVip() {
        var username = $('vipUsername').value.trim();
        var plan = $('vipPlan').value;
        if (!username) { showToast('请输入用户名'); return; }
        var expireDate = new Date();
        if (plan === 'trial') expireDate.setMonth(expireDate.getMonth() + 1);
        else if (plan === 'yearly') expireDate.setFullYear(expireDate.getFullYear() + 1);
        var expireStr = expireDate.toISOString().split('T')[0];
        Storage.activateMembership(username, plan, expireStr);
        showToast('已为 ' + username + ' 开通' + (plan === 'trial' ? '体验' : plan === 'yearly' ? '年度' : '终身') + '会员');
        renderMembershipList();
    }

    /**
     * 管理员调整AI次数
     */
    function adminAdjustQuota() {
        var username = $('quotaUsername').value.trim();
        var quota = parseInt($('quotaNumber').value);
        if (!username) { showToast('请输入用户名'); return; }
        if (isNaN(quota)) { showToast('请输入有效次数'); return; }
        Storage.adjustAiQuota(username, quota);
        showToast('已调整 ' + username + ' 的AI次数为 ' + (quota === -1 ? '无限' : quota));
        renderMembershipList();
    }

    /**
     * 渲染会员列表
     */
    function renderMembershipList() {
        var members = Storage.getAllMemberships();
        var container = $('membershipList');
        if (!container) return;
        if (members.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:30px;">暂无会员数据</div>';
            return;
        }
        var planNames = { trial: '体验', yearly: '年度', lifetime: '永久' };
        var html = '<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:var(--bg-secondary);"><th style="padding:8px;border:1px solid var(--border-color);">用户名</th><th style="padding:8px;border:1px solid var(--border-color);">套餐</th><th style="padding:8px;border:1px solid var(--border-color);">开通日期</th><th style="padding:8px;border:1px solid var(--border-color);">到期日期</th><th style="padding:8px;border:1px solid var(--border-color);">AI次数</th><th style="padding:8px;border:1px solid var(--border-color);">状态</th></tr></thead><tbody>';
        for (var i = 0; i < members.length; i++) {
            var m = members[i];
            var statusText = m.isActive ? '有效' : '过期';
            var statusColor = m.isActive ? 'var(--green)' : 'var(--red-primary)';
            html += '<tr><td style="padding:8px;border:1px solid var(--border-color);">' + escapeHtml(m.username) + '</td><td style="padding:8px;border:1px solid var(--border-color);">' + planNames[m.plan] + '</td><td style="padding:8px;border:1px solid var(--border-color);">' + m.activateDate + '</td><td style="padding:8px;border:1px solid var(--border-color);">' + m.expireDate + '</td><td style="padding:8px;border:1px solid var(--border-color);">' + (m.aiQuota === -1 ? '无限' : m.aiQuota) + '</td><td style="padding:8px;border:1px solid var(--border-color);color:' + statusColor + ';">' + statusText + '</td></tr>';
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // ==================== Toast提示 ====================

    /** Toast定时器 */
    var toastTimer = null;

    /**
     * 显示Toast提示
     * @param {string} msg - 提示消息
     */
    function showToast(msg) {
        var toast = $('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');

        // 清除之前的定时器
        if (toastTimer) {
            clearTimeout(toastTimer);
        }

        toastTimer = setTimeout(function () {
            toast.classList.remove('show');
            toastTimer = null;
        }, 2500);
    }

    // ==================== 工具函数 ====================

    /**
     * 数字补零
     * @param {number} n - 数字
     * @returns {string} 补零后的字符串
     */
    function padZero(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    /**
     * 姓名五行分析
     */
    function analyzeNameWuXing(name) {
        if (!name) return '—';
        var ganWuXing = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
        var zhiWuXing = {'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
        var parts = [];
        for (var i = 0; i < name.length; i++) {
            var ch = name.charAt(i);
            var wx = null;
            if (ganWuXing[ch]) wx = ganWuXing[ch];
            else if (zhiWuXing[ch]) wx = zhiWuXing[ch];
            else {
                var code = ch.charCodeAt(0);
                var radical = Math.floor((code - 0x4E00) % 5);
                wx = ['木','火','土','金','水'][radical];
            }
            parts.push(ch + '(' + wx + ')');
        }
        return parts.join('，');
    }

    // ==================== 服务介绍页面 ====================

    /**
     * 渲染服务介绍页面
     */
    function renderVipPage() {
        var container = $('vipContent');
        if (!container) return;

        var html = '';

        // 顶部标题区
        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">';
        html += '<button onclick="switchPage(\'pageToday\')" style="background:none;border:none;font-size:20px;color:var(--text-primary);cursor:pointer;padding:4px;">&#8592;</button>';
        html += '<h2 style="font-size:17px;font-weight:600;color:var(--text-primary);margin:0;">AI专业命理疏导 · 服务介绍</h2>';
        html += '</div>';

        // 核心说明文案
        html += '<div class="vip-desc-card">';
        html += '<p>本平台不搞迷信、不恐吓、不改运，仅以正统子平命理、五行旺衰、十神逻辑为基础，结合主流大模型（Kimi/DeepSeek/豆包/智谱）专业命理提示词，为用户提供五行缺失测算、日主强弱分析、喜忌判定、大运流年理性疏导、心理情绪引导，帮助用户认清自身命理结构，做到顺势而为、生活顺遂。</p>';
        html += '</div>';

        // 微信引导卡片
        html += '<div class="vip-card featured">';
        html += '<div class="vip-card-header">';
        html += '<span class="vip-tag vip-tag-red">联系站长</span>';
        html += '<span class="vip-card-title">添加站长微信了解更多</span>';
        html += '</div>';
        html += '<div style="font-size:16px;font-weight:bold;color:#333;text-align:center;margin:16px 0 8px;">微信号：DLing3313</div>';
        html += '<div class="vip-qr-area">';
        html += '<div class="vip-qr-img"><img src="images/wechat-qr.jpg" alt="站长微信二维码"><span>站长微信二维码</span></div>';
        html += '</div>';
        html += '<p style="text-align:center;color:#666;font-size:14px;margin-top:12px;">了解更多，请添加微信</p>';
        html += '</div>';

        // 底部合规说明
        html += '<p class="vip-disclaimer">以上服务均为民俗文化咨询与命理知识解读，不涉及封建迷信。如有心理疾病请及时就医。</p>';

        container.innerHTML = html;
    }

    /**
     * HTML转义，防止XSS
     * @param {string} str - 原始字符串
     * @returns {string} 转义后的安全字符串
     */
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ==================== 暴露showToast到全局（供HTML onclick使用） ====================
    window.showToast = showToast;
    window.adminActivateVip = adminActivateVip;
    window.adminAdjustQuota = adminAdjustQuota;

    // 暴露到全局
    window.switchPage = switchPage;

    // 大运流年总表交互函数
    window.selectDaYun = selectDaYun;
    window.selectLiuNian = selectLiuNian;
    window.selectLiuYue = selectLiuYue;
    window.selectLiuRi = selectLiuRi;

    // ==================== DOM加载完成后初始化 ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ==================== 辅助函数 ====================

    /**
     * 获取天干五行颜色（按天干字符）
     */
    function getGanColorByChar(gan) {
        var idx = Lunar.tianGan.indexOf(gan);
        return idx >= 0 ? getGanColor(idx) : '#333';
    }

    /**
     * 获取地支五行颜色（按地支字符）
     */
    function getZhiColorByChar(zhi) {
        var idx = Lunar.diZhi.indexOf(zhi);
        return idx >= 0 ? getZhiColor(idx) : '#333';
    }

    /**
     * 高亮大运/流年单元格
     */
    function highlightDayun(el, index) {
        // 移除所有高亮
        document.querySelectorAll('.dayun-highlight').forEach(function(e) { e.classList.remove('dayun-highlight'); });
        // 添加高亮
        el.classList.add('dayun-highlight');
    }

    // ==================== 导出公共接口 ====================
    return {
        init: init,
        showToast: showToast,
        showLoginModal: showLoginModal,
        hideLoginModal: hideLoginModal,
        getGanColor: getGanColor,
        getZhiColor: getZhiColor,
        getGanColorByChar: getGanColorByChar,
        getZhiColorByChar: getZhiColorByChar,
        highlightDayun: highlightDayun
    };
})();
