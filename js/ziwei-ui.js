/**
 * 紫微斗数排盘UI渲染 - ziwei-ui.js
 * 依赖：ziwei.js, lunar.js, app.js（共享表单数据）
 * 
 * 输入表单已提取为独立共享容器（#sharedFormSection），
 * 本模块仅负责排盘结果的渲染。
 */

const ZiweiUI = (function() {
    'use strict';

    // 当前排盘结果缓存
    var currentResult = null;

    /**
     * 显示紫微斗数页面（切换到紫微结果页时调用）
     * 不再渲染输入区域，输入由共享表单处理
     */
    function showPage() {
        // 如果已有结果，直接显示；否则显示提示
        var area = document.getElementById('ziweiResultArea');
        if (!area) return;

        if (!currentResult) {
            area.innerHTML = '<div class="result-card">' +
                '<div class="result-title" style="text-align:center;font-size:16px;color:var(--red-primary);margin-bottom:12px;">紫微斗数排盘</div>' +
                '<div style="text-align:center;color:var(--text-secondary);font-size:13px;">请在上方输入出生信息后，点击「开始紫微斗数排盘」按钮</div>' +
                '</div>';
        }
    }

    /**
     * 执行紫微斗数排盘
     * 从共享输入表单获取数据
     */
    function doZiweiPaipan() {
        try {
            _doZiweiPaipanInternal();
        } catch (e) {
            console.error('紫微斗数排盘出错:', e);
            if (typeof showToast === 'function') {
                showToast('紫微斗数排盘出错：' + e.message);
            }
        }
    }

    function _doZiweiPaipanInternal() {
        // 从共享输入表单获取数据
        var year = parseInt(document.getElementById('selectYear').value);
        var month = parseInt(document.getElementById('selectMonth').value);
        var day = parseInt(document.getElementById('selectDay').value);
        var hour = parseInt(document.getElementById('selectHour').value);
        var minute = parseInt(document.getElementById('selectMinute').value);
        var genderEl = document.querySelector('#genderSwitch .gender-item.active');
        var gender = genderEl ? parseInt(genderEl.getAttribute('data-gender')) : 1;

        // 吉时吉分处理
        if (hour === -1 || minute === -1) {
            var province = document.getElementById('selectProvince').value;
            if (!province || province === '请选择省份') {
                if (hour === -1) hour = Math.floor(Math.random() * 24);
                if (minute === -1) minute = Math.floor(Math.random() * 60);
            } else {
                if (hour === -1) hour = 0;
                if (minute === -1) minute = 0;
            }
        }

        // 检查农历模式
        var isLunar = document.querySelector('#calendarSwitch .switch-item.active');
        if (isLunar && isLunar.getAttribute('data-type') === 'lunar') {
            var lunarMonthEl = document.getElementById('selectMonth');
            var lunarDayEl = document.getElementById('selectDay');
            var isLeap = lunarMonthEl.options[lunarMonthEl.selectedIndex] &&
                         lunarMonthEl.options[lunarMonthEl.selectedIndex].getAttribute('data-leap') === '1';
            var lunarMonth = parseInt(lunarMonthEl.value);
            var lunarDay = parseInt(lunarDayEl.value);

            if (typeof Lunar !== 'undefined' && typeof Lunar.lunarToSolar === 'function') {
                var solar = Lunar.lunarToSolar(year, lunarMonth, lunarDay, isLeap);
                if (solar) {
                    year = solar.year;
                    month = solar.month;
                    day = solar.day;
                }
            }
        }

        // 获取经度
        var longitude = null;
        var provinceName = document.getElementById('selectProvince').value;
        var cityName = document.getElementById('selectCity').value;
        if (provinceName && cityName && typeof CityData !== 'undefined' && typeof CityData.getCoord === 'function') {
            var coord = CityData.getCoord(provinceName, cityName);
            if (coord) longitude = coord.longitude;
        }

        // 输入验证
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            if (typeof showToast === 'function') showToast('请先选择出生日期');
            return;
        }

        // 执行排盘
        currentResult = Ziwei.generate(year, month, day, hour, minute, gender, longitude);

        if (!currentResult) {
            if (typeof showToast === 'function') showToast('排盘失败，请检查日期');
            return;
        }

        // 切换到紫微结果页面并渲染
        if (typeof switchPage === 'function') {
            switchPage('pageZiwei');
        }

        // 渲染结果
        renderResult(currentResult);
    }

    /**
     * 渲染排盘结果
     */
    function renderResult(result) {
        var area = document.getElementById('ziweiResultArea');
        if (!area) return;

        var html = '';

        // 基本信息栏
        html += '<div class="result-card" style="margin-bottom:12px;">';
        html += '<div class="result-title" style="text-align:center;font-size:16px;color:var(--red-primary);">紫微斗数命盘</div>';
        html += '<div style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px 16px;font-size:13px;color:var(--text-secondary);margin:10px 0;">';
        html += '<span>农历：' + result.lunarDate.year + '年' + result.lunarDate.monthName + result.lunarDate.dayName + '</span>';
        html += '<span>生肖：' + result.lunarDate.shengXiao + '</span>';
        html += '<span>性别：' + result.gender + '</span>';
        html += '<span>五行局：' + getWuXingJuName(result.wuxingJu) + '</span>';
        html += '<span>年干支：' + result.yearGanZhi + '</span>';
        if (result.trueSolarTime) {
            html += '<span>真太阳时：' + result.trueSolarTime.trueHour + ':' + String(result.trueSolarTime.trueMinute).padStart(2,'0') + '</span>';
        }
        html += '</div>';

        // 四化信息
        html += '<div style="text-align:center;font-size:13px;margin:8px 0;">';
        var huaTypes = ['化禄','化权','化科','化忌'];
        var huaColors = ['#2E8B57','#C41A1A','#4A6B8A','#333'];
        for (var h = 0; h < 4; h++) {
            html += '<span style="color:' + huaColors[h] + ';margin:0 6px;font-weight:bold;">' +
                    huaTypes[h] + '：' + result.sihua[h] + '</span>';
        }
        html += '</div>';
        html += '</div>';

        // 十二宫排盘（方形网格）
        html += renderPalaceGrid(result);

        // 大限信息
        html += renderDaXian(result);

        area.innerHTML = html;
    }

    /**
     * 获取五行局名称
     */
    function getWuXingJuName(ju) {
        var names = {2:'水二局', 3:'木三局', 4:'金四局', 5:'土五局', 6:'火六局'};
        return names[ju] || '土五局';
    }

    /**
     * 渲染十二宫方形网格
     */
    function renderPalaceGrid(result) {
        var palaces = result.palaces;

        // 创建宫位映射：posIdx -> palace
        var posMap = {};
        for (var i = 0; i < palaces.length; i++) {
            posMap[palaces[i].posIdx] = palaces[i];
        }

        var html = '<div class="zw-palace-grid">';

        // 上排：巳(4) 午(5) 未(6) 申(7)
        html += '<div class="zw-grid-row">';
        for (var p = 4; p <= 7; p++) {
            html += renderPalaceCell(posMap[p], result);
        }
        html += '</div>';

        // 中间行1
        html += '<div class="zw-grid-row zw-grid-mid">';
        html += renderPalaceCell(posMap[3], result);
        html += '<div class="zw-center-info">';
        html += '<div class="zw-center-title">' + result.yearGanZhi + '年</div>';
        html += '<div class="zw-center-info-item">' + result.gender + '命</div>';
        html += '<div class="zw-center-info-item">' + getWuXingJuName(result.wuxingJu) + '</div>';
        html += '<div class="zw-center-info-item">农历' + result.lunarDate.monthName + result.lunarDate.dayName + '</div>';
        html += '<div class="zw-center-info-item">' + result.lunarDate.shengXiao + '年</div>';
        html += '</div>';
        html += renderPalaceCell(posMap[8], result);
        html += '</div>';

        // 中间行2
        html += '<div class="zw-grid-row zw-grid-mid">';
        html += renderPalaceCell(posMap[2], result);
        html += '<div class="zw-center-info">';
        var huaTypes = ['化禄','化权','化科','化忌'];
        var huaColors = ['#2E8B57','#C41A1A','#4A6B8A','#333'];
        for (var h = 0; h < 4; h++) {
            html += '<div style="color:' + huaColors[h] + ';font-size:12px;margin:2px 0;">' +
                    huaTypes[h] + ' ' + result.sihua[h] + '</div>';
        }
        html += '</div>';
        html += renderPalaceCell(posMap[9], result);
        html += '</div>';

        // 下排：寅(1) 丑(12→0) 子(0) 亥(11)
        html += '<div class="zw-grid-row">';
        html += renderPalaceCell(posMap[1], result);
        html += renderPalaceCell(posMap[0], result);
        html += renderPalaceCell(posMap[11], result);
        html += renderPalaceCell(posMap[10], result);
        html += '</div>';

        html += '</div>';
        return html;
    }

    /**
     * 渲染单个宫格
     */
    function renderPalaceCell(palace, result) {
        if (!palace) return '<div class="zw-palace-cell zw-palace-empty"></div>';

        var html = '<div class="zw-palace-cell">';
        html += '<div class="zw-palace-header">';
        html += '<span class="zw-palace-name">' + palace.name + (palace.isShenGong ? '(身)' : '') + '</span>';
        html += '<span class="zw-palace-ganzhi">' + palace.gan + palace.zhi + '</span>';
        html += '</div>';

        // 主星
        if (palace.mainStars.length > 0) {
            html += '<div class="zw-star-group zw-main-stars">';
            for (var i = 0; i < palace.mainStars.length; i++) {
                var starName = palace.mainStars[i];
                var colorClass = getMainStarColorClass(starName);
                html += '<div class="zw-star ' + colorClass + '">';
                html += '<span class="zw-star-name">' + starName + '</span>';
                if (palace.sihua.length > 0) {
                    for (var s = 0; s < palace.sihua.length; s++) {
                        if (isStarHasHua(starName, palace.sihua[s], result)) {
                            html += '<span class="zw-sihua ' + getSihuaClass(palace.sihua[s]) + '">' +
                                    palace.sihua[s].charAt(1) + '</span>';
                        }
                    }
                }
                html += '</div>';
            }
            html += '</div>';
        }

        // 吉星
        if (palace.luckyStars.length > 0) {
            html += '<div class="zw-star-group zw-lucky-stars">';
            for (var i = 0; i < palace.luckyStars.length; i++) {
                html += '<span class="zw-star-small zw-lucky">' + palace.luckyStars[i] + '</span>';
            }
            html += '</div>';
        }

        // 煞星
        if (palace.evilStars.length > 0) {
            html += '<div class="zw-star-group zw-evil-stars">';
            for (var i = 0; i < palace.evilStars.length; i++) {
                html += '<span class="zw-star-small zw-evil">' + palace.evilStars[i] + '</span>';
            }
            html += '</div>';
        }

        // 其他星
        if (palace.otherStars.length > 0) {
            html += '<div class="zw-star-group zw-other-stars">';
            for (var i = 0; i < palace.otherStars.length; i++) {
                html += '<span class="zw-star-small zw-other">' + palace.otherStars[i] + '</span>';
            }
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    function getMainStarColorClass(name) {
        var redStars = ['紫微','天府','太阳','太阴','天梁','天同','天相'];
        if (redStars.indexOf(name) >= 0) return 'zw-star-red';
        var purpleStars = ['廉贞','贪狼','七杀','破军'];
        if (purpleStars.indexOf(name) >= 0) return 'zw-star-purple';
        return 'zw-star-dark';
    }

    function isStarHasHua(starName, huaType, result) {
        if (!result.sihua) return false;
        var huaIdx = {'化禄':0,'化权':1,'化科':2,'化忌':3};
        var idx = huaIdx[huaType];
        return idx !== undefined && result.sihua[idx] === starName;
    }

    function getSihuaClass(huaType) {
        var map = {'化禄':'zw-hua-lu','化权':'zw-hua-quan','化科':'zw-hua-ke','化忌':'zw-hua-ji'};
        return map[huaType] || '';
    }

    /**
     * 渲染大限信息
     */
    function renderDaXian(result) {
        if (!result.daXian || !result.daXian.list) return '';

        var html = '<div class="result-card" style="margin-top:12px;">';
        html += '<div class="result-title" style="text-align:center;font-size:15px;color:var(--red-primary);margin-bottom:10px;">大限</div>';
        html += '<div style="font-size:12px;color:var(--text-secondary);text-align:center;margin-bottom:8px;">' +
                result.daXian.direction + ' · ' + result.daXian.startAge + '岁起运</div>';

        html += '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;">';
        for (var i = 0; i < result.daXian.list.length; i++) {
            var dx = result.daXian.list[i];
            var palace = result.palaces[dx.palaceIdx];
            html += '<div class="zw-daxian-item">';
            html += '<div class="zw-daxian-age">' + dx.startAge + '-' + dx.endAge + '岁</div>';
            html += '<div class="zw-daxian-palace">' + (palace ? palace.name : '') + '</div>';
            html += '<div class="zw-daxian-ganzhi">' + (palace ? palace.gan + palace.zhi : '') + '</div>';
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';
        return html;
    }

    // ==================== 导出 ====================
    return {
        showPage: showPage,
        doZiweiPaipan: doZiweiPaipan,
        renderResult: renderResult
    };
})();
