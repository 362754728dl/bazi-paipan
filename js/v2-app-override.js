/**
 * v2-app-override.js - 覆盖app.js中需要异步API的关键函数
 * 在app.js之后加载
 *
 * 策略：
 * - 排盘记录保存/获取/删除：覆盖Storage方法为异步API版本
 * - renderRecords：改为异步从API获取（带请求锁+300ms防抖）
 * - 返回记录按钮：修复为正确返回到记录列表
 * - 登录成功后：刷新token和用户信息
 * - 分页：每页20条，记住页码，样式与现有UI一致
 */
(function () {
    'use strict';

    var TOKEN_KEY = 'v2_token';
    var USER_CACHE_KEY = 'v2_user';

    // ==================== 请求锁和防抖机制 ====================
    var isFetchingPaipanRecords = false;
    var recordsCache = null;
    var currentPage = 1;
    var pageSize = 20;
    var totalPages = 1;

    function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
    function getHeaders() {
        var h = { 'Content-Type': 'application/json' };
        var t = getToken();
        if (t) h['Authorization'] = 'Bearer ' + t;
        return h;
    }
    function getUserCache() {
        try { return JSON.parse(localStorage.getItem(USER_CACHE_KEY) || 'null'); }
        catch (e) { return null; }
    }

    // 防抖函数
    function debounce(func, wait) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                func.apply(context, args);
            }, wait);
        };
    }

    // ==================== 覆盖Storage.saveRecord：异步API保存 ====================
    Storage.saveRecord = function (record) {
        // 异步调API保存
        fetch('/api/paipan/save', {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({
                name: record.name,
                solarDate: record.solarDate,
                lunarDate: record.lunarDate,
                gender: record.gender,
                shengXiao: record.shengXiao,
                baziStr: record.baziStr,
                formData: JSON.stringify(record.formData)
            })
        }).then(function (r) { return r.json(); }).then(function (json) {
            if (json.code === 200) {
                if (typeof window.showToast === 'function') window.showToast('排盘记录已保存');
            } else {
                if (typeof window.showToast === 'function') window.showToast('保存失败：' + (json.message || ''));
            }
        }).catch(function (err) {
            console.error('保存排盘记录失败:', err);
            if (typeof window.showToast === 'function') window.showToast('保存记录失败，请检查网络');
        });
    };

    // ==================== 覆盖Storage.getRecords：返回缓存数据 ====================
    var _cachedRecords = [];
    Storage.getRecords = function () {
        return _cachedRecords;
    };

    // ==================== 覆盖Storage.deleteRecord：异步API删除 ====================
    Storage.deleteRecord = function (id) {
        fetch('/api/paipan/record/' + id, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        }).then(function (r) { return r.json(); }).catch(function (err) {
            console.error('删除排盘记录失败:', err);
        });
        // 同步更新缓存
        _cachedRecords = _cachedRecords.filter(function (r) { return r.id !== id; });
    };

    // ==================== 重写renderRecords为异步版本（带请求锁+防抖） ====================
    var _origSwitchPage = window.switchPage;

    // 核心异步渲染函数（无防抖，内部自带请求锁）
    function asyncRenderRecords(targetPage) {
        // 【请求锁】正在请求中则直接跳过，禁止重复拉取
        if (isFetchingPaipanRecords) {
            console.log('[v2] 排盘记录请求被锁，跳过重复请求');
            return;
        }

        var recordList = document.getElementById('recordList');
        var emptyState = document.getElementById('emptyState');
        if (!recordList || !emptyState) return;

        if (!Storage.isLoggedIn()) {
            recordList.innerHTML = '';
            emptyState.style.display = 'block';
            var icon = emptyState.querySelector('.empty-icon');
            if (icon) icon.textContent = '🔒';
            if (emptyState.children[1]) emptyState.children[1].textContent = '请先登录查看记录';
            if (emptyState.children[2]) emptyState.children[2].textContent = '点击上方用户栏进行登录';
            var btnLogin = document.getElementById('btnEmptyLogin');
            var btnReg = document.getElementById('btnEmptyRegister');
            if (btnLogin) btnLogin.style.display = 'inline-block';
            if (btnReg) btnReg.style.display = 'inline-block';
            return;
        }

        // 【请求锁】上锁
        isFetchingPaipanRecords = true;

        // 使用传入的页码或当前页码
        if (targetPage && targetPage > 0) {
            currentPage = targetPage;
        }

        // 显示加载状态
        recordList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">加载中...</div>';
        emptyState.style.display = 'none';

        fetch('/api/paipan/records?page=' + currentPage + '&pageSize=' + pageSize, { headers: getHeaders(), credentials: 'include' })
            .then(function (r) { return r.json(); })
            .then(function (json) {
                // 【请求锁】无论成功失败都强制释放
                isFetchingPaipanRecords = false;

                if (json.code !== 200) {
                    recordList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">加载失败</div>';
                    return;
                }

                var records = json.data.list || [];
                totalPages = json.data.totalPages || 1;
                var total = json.data.total || 0;

                if (records.length === 0) {
                    recordList.innerHTML = '';
                    emptyState.style.display = 'block';
                    var icon2 = emptyState.querySelector('.empty-icon');
                    if (icon2) icon2.textContent = '📋';
                    if (emptyState.children[1]) emptyState.children[1].textContent = '暂无排盘记录';
                    if (emptyState.children[2]) emptyState.children[2].textContent = '排盘后自动保存';
                    var btnLogin2 = document.getElementById('btnEmptyLogin');
                    var btnReg2 = document.getElementById('btnEmptyRegister');
                    if (btnLogin2) btnLogin2.style.display = 'none';
                    if (btnReg2) btnReg2.style.display = 'none';
                    return;
                }

                // 更新缓存
                recordsCache = records;
                _cachedRecords = records;

                emptyState.style.display = 'none';

                // 【精准DOM diff】用 record_id 做唯一key，数据未变化时复用现有DOM
                var existingItems = recordList.querySelectorAll('.record-item');
                var existingKeys = {};
                existingItems.forEach(function (el) {
                    existingKeys[el.getAttribute('data-key')] = el;
                });

                // 构建新数据的key集合
                var newKeys = [];
                records.forEach(function (r) {
                    newKeys.push('record_' + r.id);
                });

                // 判断数据是否发生变化（key集合对比）
                var oldKeyStr = Object.keys(existingKeys).sort().join(',');
                var newKeyStr = newKeys.sort().join(',');

                if (oldKeyStr === newKeyStr && existingItems.length === records.length) {
                    // 数据完全一致，复用现有DOM，不触发重渲染，零闪烁
                    console.log('[v2] 排盘记录数据未变化，复用现有DOM');
                    return;
                }

                // 数据有变化，执行精准DOM更新
                // 1. 移除不再存在的记录DOM
                var newKeySet = {};
                newKeys.forEach(function(k) { newKeySet[k] = true; });
                existingItems.forEach(function (el) {
                    var key = el.getAttribute('data-key');
                    if (!newKeySet[key]) {
                        el.remove();
                    }
                });

                // 2. 按顺序插入/移动记录DOM
                var fragment = document.createDocumentFragment();
                records.forEach(function (r) {
                    var recordKey = 'record_' + r.id;
                    var existing = existingKeys[recordKey];
                    if (existing) {
                        // 已有DOM，直接复用
                        fragment.appendChild(existing);
                    } else {
                        // 新记录，创建DOM节点
                        var createdStr = r.created_at || '';
                        var timeStr = createdStr.replace('T', ' ').substring(0, 19);
                        var genderText = (r.gender == 1 || r.gender === '男' || r.gender === 1) ? '男' : '女';

                        var div = document.createElement('div');
                        div.className = 'record-item';
                        div.setAttribute('data-id', r.id);
                        div.setAttribute('data-key', recordKey);
                        div.innerHTML =
                            '<div class="record-info">' +
                            '  <div class="record-name">' + escapeHtml(r.name) + '（' + genderText + '，' + escapeHtml(r.sheng_xiao || '') + '）</div>' +
                            '  <div class="record-date">' + escapeHtml(r.solar_date || '') + '（' + escapeHtml(r.lunar_date || '') + '）</div>' +
                            '  <div class="record-bazi">' + escapeHtml(r.bazi_str || '') + '</div>' +
                            '  <div class="record-date" style="margin-top:2px">保存于 ' + timeStr + '</div>' +
                            '</div>' +
                            '<div class="record-actions">' +
                            '  <button class="btn-delete" data-id="' + r.id + '">删除</button>' +
                            '</div>';
                        fragment.appendChild(div);
                    }
                });

                // 3. 用fragment替换列表内容（一次性DOM操作，减少重排）
                recordList.innerHTML = '';
                recordList.appendChild(fragment);

                // 4. 更新分页组件
                var existingPagination = recordList.querySelector('[data-pagination]');
                if (existingPagination) existingPagination.remove();
                if (totalPages > 1) {
                    var paginationDiv = document.createElement('div');
                    paginationDiv.setAttribute('data-pagination', 'true');
                    paginationDiv.innerHTML = renderPagination(currentPage, totalPages, total);
                    recordList.appendChild(paginationDiv);
                }

                bindRecordEvents(records);
            })
            .catch(function (err) {
                // 【请求锁】异常时也强制释放
                isFetchingPaipanRecords = false;
                console.error('获取排盘记录失败:', err);
                recordList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">加载失败，请刷新重试</div>';
            });
    }

    // 【300ms防抖包装】列表渲染加防抖，避免频繁重绘导致闪屏卡顿
    var debouncedAsyncRender = debounce(function (targetPage) {
        asyncRenderRecords(targetPage);
    }, 300);

    // 分页渲染函数（样式与现有国风UI一致）
    function renderPagination(current, total, totalCount) {
        var html = '<div style="display:flex;justify-content:center;align-items:center;gap:10px;padding:14px 8px;border-top:1px solid var(--border-color);margin-top:6px;">';

        // 上一页按钮
        if (current > 1) {
            html += '<button class="page-btn" data-page="' + (current - 1) + '" style="padding:6px 14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;color:var(--text-secondary);font-size:13px;cursor:pointer;">上一页</button>';
        } else {
            html += '<button disabled style="padding:6px 14px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;color:var(--text-light);font-size:13px;cursor:not-allowed;opacity:0.5;">上一页</button>';
        }

        // 页码信息
        html += '<span style="font-size:13px;color:var(--text-light);">第 ' + current + ' / ' + total + ' 页（共 ' + totalCount + ' 条）</span>';

        // 下一页按钮
        if (current < total) {
            html += '<button class="page-btn" data-page="' + (current + 1) + '" style="padding:6px 14px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;color:var(--text-secondary);font-size:13px;cursor:pointer;">下一页</button>';
        } else {
            html += '<button disabled style="padding:6px 14px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;color:var(--text-light);font-size:13px;cursor:not-allowed;opacity:0.5;">下一页</button>';
        }

        html += '</div>';
        return html;
    }

    // 绑定记录事件（分离出来便于防抖后调用）
    function bindRecordEvents(records) {
        var recordList = document.getElementById('recordList');
        if (!recordList) return;

        // 绑定分页按钮
        recordList.querySelectorAll('.page-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var page = parseInt(this.getAttribute('data-page'));
                if (page && page > 0 && page <= totalPages) {
                    currentPage = page;
                    // 保存当前页码到sessionStorage，返回时自动恢复
                    sessionStorage.setItem('paipan_current_page', currentPage);
                    debouncedAsyncRender(page);
                }
            });
        });

        // 绑定删除按钮
        recordList.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = parseInt(this.getAttribute('data-id'));
                if (confirm('确定要删除这条记录吗？')) {
                    Storage.deleteRecord(id);
                    // 删除后刷新当前页
                    debouncedAsyncRender();
                    if (typeof window.showToast === 'function') window.showToast('记录已删除');
                }
            });
        });

        // 绑定记录点击（查看排盘详情）
        recordList.querySelectorAll('.record-item').forEach(function (item) {
            item.addEventListener('click', function () {
                var id = parseInt(this.getAttribute('data-id'));
                var record = records.find(function (r) { return r.id === id; }) ||
                    (recordsCache && recordsCache.find(function (r) { return r.id === id; }));

                if (!record) {
                    console.error('[v2] 找不到记录数据，id:', id);
                    if (typeof window.showToast === 'function') window.showToast('记录数据加载失败');
                    return;
                }

                // 解析form_data
                var formData = {};
                try {
                    formData = JSON.parse(record.form_data || '{}');
                } catch (e) {
                    console.error('[v2] 解析form_data失败:', e);
                }

                // 数据完整性校验
                if (!formData || !formData.year) {
                    console.error('[v2] 记录数据不完整，缺少year字段:', formData);
                    if (typeof window.showToast === 'function') window.showToast('记录数据不完整，无法展示排盘');
                    return;
                }

                // 保存当前页码，返回时自动恢复
                sessionStorage.setItem('paipan_current_page', currentPage);
                sessionStorage.setItem('paipan_viewing_record_id', id);

                // 通过模拟点击来设置表单数据，确保App闭包变量被正确更新
                var inputName = document.getElementById('inputName');
                if (inputName) inputName.value = formData.name || record.name || '';

                var calType = formData.calendarType || 'solar';
                var calItems = document.querySelectorAll('#calendarSwitch .switch-item');
                calItems.forEach(function (ci) {
                    if (ci.getAttribute('data-type') === calType && !ci.classList.contains('active')) {
                        ci.click();
                    }
                });

                var selectYear = document.getElementById('selectYear');
                var selectMonth = document.getElementById('selectMonth');
                var selectDay = document.getElementById('selectDay');
                var selectHour = document.getElementById('selectHour');
                var selectMinute = document.getElementById('selectMinute');
                if (selectYear) selectYear.value = formData.year || '';
                if (selectMonth) selectMonth.value = formData.month || '';
                if (typeof window.fillDays === 'function') window.fillDays();
                if (selectDay) selectDay.value = formData.day || '';
                if (selectHour) selectHour.value = formData.hour !== undefined ? formData.hour : '';
                if (selectMinute) selectMinute.value = formData.minute !== undefined ? formData.minute : '';

                var genderVal = formData.gender !== undefined ? formData.gender : (record.gender || 1);
                var genderItems = document.querySelectorAll('#genderSwitch .gender-item');
                genderItems.forEach(function (gi) {
                    if (parseInt(gi.getAttribute('data-gender')) === parseInt(genderVal) && !gi.classList.contains('active')) {
                        gi.click();
                    }
                });

                if (formData.province) {
                    var selectProvince = document.getElementById('selectProvince');
                    if (selectProvince) {
                        selectProvince.value = formData.province;
                        selectProvince.dispatchEvent(new Event('change'));
                        if (formData.city) {
                            var selectCity = document.getElementById('selectCity');
                            if (selectCity) selectCity.value = formData.city;
                        }
                    }
                }

                // 隐藏输入表单
                var formSection = document.querySelector('.form-section');
                if (formSection) formSection.style.display = 'none';

                // 显示返回记录按钮
                var backBtn = document.getElementById('backToRecords');
                if (backBtn) backBtn.style.display = 'inline-block';

                // 切换到排盘页面
                if (typeof window.switchPage === 'function') window.switchPage('pagePaipan');

                // 标记为查看模式，防止doPaipan中重复保存
                window._v2_viewingRecord = true;

                setTimeout(function () {
                    var btnPaipan = document.getElementById('btnPaipan');
                    if (btnPaipan) btnPaipan.click();
                    window._v2_viewingRecord = false;
                }, 100);
            });
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ==================== 覆盖switchPage：拦截pageRecords切换 ====================
    window.switchPage = function (pageId) {
        // 调用原始switchPage（它处理DOM切换和导航高亮）
        if (_origSwitchPage) _origSwitchPage(pageId);

        // 如果切换到记录页，使用防抖异步版本
        if (pageId === 'pageRecords') {
            // 恢复保存的页码，禁止重置到第1页
            var savedPage = sessionStorage.getItem('paipan_current_page');
            if (savedPage) {
                currentPage = parseInt(savedPage);
            }
            debouncedRenderRecords();
        }
    };

    // ==================== 覆盖登录成功后的处理 ====================
    var _loginModalObserver = setInterval(function () {
        var modal = document.getElementById('loginModal');
        if (modal) {
            if (!modal.classList.contains('active') && getToken()) {
                var user = getUserCache();
                var userInfo = document.getElementById('userInfo');
                if (userInfo && user) {
                    userInfo.textContent = '欢迎，' + user.username;
                    userInfo.style.cursor = 'default';
                    userInfo.onclick = null;
                }
                var btnLogout = document.getElementById('btnLogout');
                if (btnLogout) btnLogout.style.display = 'inline-block';
                var btnChangePwdEntry = document.getElementById('btnChangePwdEntry');
                if (btnChangePwdEntry) btnChangePwdEntry.style.display = 'inline-block';

                // 如果在记录页，刷新
                if (document.querySelector('#pageRecords.active')) {
                    debouncedRenderRecords();
                }
            }
        }
    }, 500);

    // ==================== 修复退出登录：清除V2 token ====================
    var btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        var newBtnLogout = btnLogout.cloneNode(true);
        btnLogout.parentNode.replaceChild(newBtnLogout, btnLogout);

        newBtnLogout.addEventListener('click', function () {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_CACHE_KEY);
            Storage.logout();

            var userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.textContent = '未登录（排盘记录需登录保存）';
                userInfo.style.cursor = 'pointer';
                userInfo.onclick = function () {
                    if (typeof window.showLoginModal === 'function') window.showLoginModal();
                };
            }
            newBtnLogout.style.display = 'none';
            var btnChangePwdEntry = document.getElementById('btnChangePwdEntry');
            if (btnChangePwdEntry) btnChangePwdEntry.style.display = 'none';

            var resultArea = document.getElementById('resultArea');
            if (resultArea) resultArea.innerHTML = '';

            // 退出后重置页码
            currentPage = 1;
            sessionStorage.removeItem('paipan_current_page');

            if (document.querySelector('#pageRecords.active')) {
                debouncedRenderRecords();
            }

            if (typeof window.showToast === 'function') window.showToast('已退出登录');
        });
    }

    // ==================== 修复doPaipan中的保存逻辑 ====================
    var _origSaveRecord = Storage.saveRecord;
    Storage.saveRecord = function (record) {
        if (window._v2_viewingRecord) {
            console.log('[v2] 查看记录模式，跳过保存');
            return;
        }
        return _origSaveRecord(record);
    };

    console.log('[v2] App override applied');
})();

// 排盘记录列表渲染稳定性补丁（仅修复闪烁/卡顿/重复刷新）
(function () {
    'use strict';

    // 二次请求锁：防止同一时段重复触发记录列表渲染
    var isFetchingPaipanRecords = false;
    var pendingRenderTimer = null;
    var lastRenderTs = 0;

    function normalizeRecordItemKeys() {
        var recordList = document.getElementById('recordList');
        if (!recordList) return;
        var items = recordList.querySelectorAll('.record-item');
        items.forEach(function (item) {
            var id = item.getAttribute('data-id');
            if (!id) return;
            // 统一使用 record_id 唯一标识，绝不使用 index
            item.setAttribute('data-key', 'record_' + id);
        });
    }

    function safeRenderRecords() {
        if (typeof window.renderRecords !== 'function') return;
        // 已在渲染窗口内时直接跳过，阻断重复刷新
        if (isFetchingPaipanRecords) return;
        isFetchingPaipanRecords = true;

        try {
            window.renderRecords();
            normalizeRecordItemKeys();
        } finally {
            // 短窗口释放锁，避免同一帧内多次触发
            setTimeout(function () {
                isFetchingPaipanRecords = false;
            }, 180);
        }
    }

    function debouncedRenderRecords() {
        var now = Date.now();
        if (pendingRenderTimer) {
            clearTimeout(pendingRenderTimer);
        }

        // 防抖 + 节流双保险，减少频繁重绘闪烁
        var delay = (now - lastRenderTs < 220) ? 260 : 120;
        pendingRenderTimer = setTimeout(function () {
            pendingRenderTimer = null;
            lastRenderTs = Date.now();
            asyncRenderRecords();
        }, delay);
    }

    // 对外暴露稳定版渲染入口（不影响分页、登录等其他功能）
    window.renderPaipanRecordsStable = debouncedRenderRecords;

    // 当记录页变为激活态时，触发一次防抖渲染
    function tryRenderWhenRecordsActive() {
        var pageRecords = document.getElementById('pageRecords');
        if (pageRecords && pageRecords.classList.contains('active')) {
            debouncedRenderRecords();
        }
    }

    // 监听记录页显隐变化，减少重复刷新引起的闪烁
    var pageRecordsNode = document.getElementById('pageRecords');
    if (pageRecordsNode) {
        var observer = new MutationObserver(function () {
            tryRenderWhenRecordsActive();
            normalizeRecordItemKeys();
        });
        observer.observe(pageRecordsNode, { attributes: true, attributeFilter: ['class', 'style'] });
    }

    // 已移除 setInterval(normalizeRecordItemKeys, 400) 持续扫描，避免不必要的DOM操作导致闪烁
})();

// 精准修复返回记录按钮 —— 硬编码DOM切换，不依赖任何通用函数，一次性绑定
(function() {
    function bindBackButton() {
        var btn = document.getElementById('backToRecords');
        if (!btn || btn._v2BackFixed) return;
        btn._v2BackFixed = true;

        // 移除所有旧事件（cloneNode方式彻底清除）
        var newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            // 硬编码DOM切换：直接隐藏排盘页、显示记录页
            var pagePaipan = document.getElementById('pagePaipan');
            var pageRecords = document.getElementById('pageRecords');
            if (pagePaipan) pagePaipan.classList.remove('active');
            if (pageRecords) pageRecords.classList.add('active');
            // 隐藏返回按钮
            newBtn.style.display = 'none';
            // 显示输入表单
            var formSection = document.querySelector('.form-section');
            if (formSection) formSection.style.display = '';
            // 隐藏排盘结果
            var resultArea = document.getElementById('resultArea');
            if (resultArea) resultArea.style.display = 'none';
            // 更新底部导航高亮
            var navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(function(item) {
                item.classList.remove('active');
                if (item.getAttribute('data-page') === 'pageRecords') {
                    item.classList.add('active');
                }
            });
            // 触发记录列表渲染（通过已有的防抖版本）
            if (typeof debouncedRenderRecords === 'function') {
                debouncedRenderRecords();
            }
        });
        console.log('[v2] 返回记录按钮已精准绑定（硬编码DOM切换）');
    }

    // DOM加载后绑定一次
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindBackButton);
    } else {
        bindBackButton();
    }
    // 兜底：页面完全加载后再检查一次
    window.addEventListener('load', bindBackButton);
})();

// ==================== 会员系统：统一AI次数检查与会员弹窗 ====================
(function() {
    'use strict';

    var TOKEN_KEY = 'v2_token';

    function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
    function getHeaders() {
        var h = { 'Content-Type': 'application/json' };
        var t = getToken();
        if (t) h['Authorization'] = 'Bearer ' + t;
        return h;
    }

    /**
     * 查询AI使用配额
     * @returns {Promise<Object>} 配额信息
     */
    window.V2Member = {
        getQuota: function() {
            return fetch('/api/user/ai-quota', { headers: getHeaders(), credentials: 'include' })
                .then(function(r) { return r.json(); })
                .then(function(json) {
                    if (json.code === 200) return json.data;
                    return null;
                })
                .catch(function() { return null; });
        },

        /**
         * 使用AI前检查并扣减次数
         * @returns {Promise<Object>} { allowed: boolean, message?: string, data?: object }
         */
        checkAndUse: function() {
            return fetch('/api/user/ai-use', {
                method: 'POST',
                headers: getHeaders(),
                credentials: 'include'
            })
            .then(function(r) { return r.json(); })
            .then(function(json) {
                if (json.code === 200) {
                    return { allowed: true, data: json.data };
                } else if (json.code === 403) {
                    return { allowed: false, message: json.message, data: json.data };
                }
                return { allowed: false, message: json.message || '操作失败' };
            })
            .catch(function() {
                // 网络错误时放行，后端会二次校验
                return { allowed: true };
            });
        },

        /**
         * 显示会员弹窗（蓝色系主题）
         * @param {string} message - 提示信息
         */
        showMemberModal: function(message) {
            var defaultMsg = '您的AI体验资格已用完，办理月度会员（19.8元/月）即可每天使用5次AI功能';
            var msg = message || defaultMsg;

            // 如果已存在弹窗，先移除
            var existing = document.getElementById('v2MemberModal');
            if (existing) existing.remove();

            var overlay = document.createElement('div');
            overlay.id = 'v2MemberModal';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
            overlay.innerHTML =
                '<div style="background:#fff;border-radius:16px;padding:28px 24px;max-width:340px;width:88%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.15);">' +
                    '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1E90FF,#00BFFF);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">' +
                        '<span style="font-size:28px;color:#fff;">👑</span>' +
                    '</div>' +
                    '<div style="font-size:18px;font-weight:bold;margin-bottom:8px;color:#1a1a2e;">月度会员</div>' +
                    '<div style="font-size:14px;color:#666;margin-bottom:20px;line-height:1.7;">' + msg + '</div>' +
                    '<div style="background:linear-gradient(135deg,#E8F4FD,#D6ECFA);border-radius:12px;padding:16px;margin-bottom:20px;">' +
                        '<div style="font-size:13px;color:#1E90FF;font-weight:600;margin-bottom:10px;">会员权益</div>' +
                        '<div style="font-size:13px;color:#444;line-height:2;text-align:left;">' +
                            '<div>✓ 每天可使用 <strong>5次</strong> AI功能</div>' +
                            '<div>✓ 排盘专业评测 · 六爻解卦</div>' +
                            '<div>✓ 取名测名 · 八字合配</div>' +
                            '<div>✓ 所有AI功能通用次数</div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="font-size:22px;font-weight:bold;color:#1E90FF;margin-bottom:20px;">¥19.8<span style="font-size:13px;font-weight:normal;color:#999;"> /月</span></div>' +
                    '<div style="display:flex;gap:12px;">' +
                        '<button id="v2MemberCancel" style="flex:1;padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;font-size:15px;cursor:pointer;color:#666;">取消</button>' +
                        '<button id="v2MemberPay" style="flex:1;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#1E90FF,#00BFFF);color:#fff;font-size:15px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(30,144,255,0.3);">立即办理</button>' +
                    '</div>' +
                '</div>';

            document.body.appendChild(overlay);

            // 绑定事件
            document.getElementById('v2MemberCancel').addEventListener('click', function() {
                overlay.remove();
            });
            document.getElementById('v2MemberPay').addEventListener('click', function() {
                overlay.remove();
                // 跳转到支付页面
                window.location.href = '/pages/v2_backup_1776960364/pay.html';
            });
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) overlay.remove();
            });
        },

        /**
         * 显示今日次数用完提示
         */
        showDailyLimitModal: function() {
            var existing = document.getElementById('v2MemberModal');
            if (existing) existing.remove();

            var overlay = document.createElement('div');
            overlay.id = 'v2MemberModal';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
            overlay.innerHTML =
                '<div style="background:#fff;border-radius:16px;padding:28px 24px;max-width:340px;width:88%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.15);">' +
                    '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#FFB347,#FF8C00);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">' +
                        '<span style="font-size:28px;">⏰</span>' +
                    '</div>' +
                    '<div style="font-size:18px;font-weight:bold;margin-bottom:12px;color:#1a1a2e;">次数已用完</div>' +
                    '<div style="font-size:14px;color:#666;margin-bottom:24px;line-height:1.7;">您今日的AI使用次数已用完，明天再来吧</div>' +
                    '<button id="v2MemberOk" style="width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#1E90FF,#00BFFF);color:#fff;font-size:15px;cursor:pointer;font-weight:600;">我知道了</button>' +
                '</div>';

            document.body.appendChild(overlay);

            document.getElementById('v2MemberOk').addEventListener('click', function() {
                overlay.remove();
            });
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) overlay.remove();
            });
        }
    };

    console.log('[v2] 会员系统模块已加载');
})();
