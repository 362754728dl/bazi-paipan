/**
 * liuyao-ui.js - 六爻排盘 UI 渲染模块
 * IIFE模式，负责六爻页面的交互、铜钱动画、卦象渲染
 * 依赖：window.LiuYao（liuyao.js）、window.Lunar（lunar.js）、window.App（app.js）
 */
const LiuYaoUI = (function () {
    'use strict';

    // ==================== 状态变量 ====================

    /** 摇卦状态机：IDLE / SPINNING / RESULT */
    var _yaoState = 'IDLE';

    /** 摇卦结果数组，存储6爻的结果（字符串如 '老阳','少阴' 等） */
    var _yaoResults = [];

    /** 当前已摇爻数（0-6） */
    var _yaoCount = 0;

    /** 旋转定时器 */
    var _spinTimer = null;

    /** 事项名称 */
    var matter = '';

    /** 起卦时间 */
    var guaTime = null;

    /** 当前结果页签：0=排盘, 1=传统解卦, 2=卦辞爻辞 */
    var currentResultTab = 0;

    /** 排盘结果数据缓存 */
    var lastHexData = null;

    // ==================== DOM辅助 ====================

    /**
     * 获取DOM元素
     * @param {string} id - 元素ID
     * @returns {HTMLElement|null}
     */
    function $(id) {
        return document.getElementById(id);
    }

    /**
     * 显示Toast提示（复用App模块的showToast）
     * @param {string} msg - 提示消息
     */
    function showToast(msg) {
        if (window.App && window.App.showToast) {
            window.App.showToast(msg);
        } else if (window.showToast) {
            window.showToast(msg);
        } else {
            var toast = $('toast');
            if (toast) {
                toast.textContent = msg;
                toast.classList.add('show');
                setTimeout(function () { toast.classList.remove('show'); }, 2500);
            }
        }
    }

    // ==================== 爻位名称常量 ====================

    /** 从下到上的爻位名称 */
    var YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

    /** 阳爻的爻名后缀 */
    var YAO_YANG_SUFFIX = ['', '', '', '', '', ''];

    /** 阴爻的爻名后缀 */
    var YAO_YIN_SUFFIX = ['', '', '', '', '', ''];

    /**
     * 获取爻位完整名称
     * @param {number} index - 爻位索引（0=初爻，5=上爻）
     * @param {boolean} isYang - 是否阳爻
     * @returns {string} 爻位名称，如"初九"、"六二"
     */
    function getYaoName(index, isYang) {
        var names = ['初', '二', '三', '四', '五', '上'];
        if (isYang) {
            return names[index] + '九';
        } else {
            return names[index] + '六';
        }
    }

    // ==================== 持世分析数据 ====================

    /**
     * 持世分析文本
     * 根据世爻所持六亲生成分析文本
     * @param {string} liuQin - 六亲名称（父母、兄弟、子孙、妻财、官鬼）
     * @returns {string} 持世分析文本
     */
    function getShiShiAnalysis(liuQin) {
        var analysisMap = {
            '父母': '世爻持父母，主文书、长辈、辛苦劳碌。父母持世，利于考试、文书、契约之事，但多劳少得，操心费力。若父母旺相，主长辈有助力；若休囚，则多劳累而少收获。占婚姻，主长辈干涉；占财运，主辛苦求财。',
            '兄弟': '世爻持兄弟，主劫财、竞争、同辈。兄弟持世，不利于求财，有劫财之象，凡占皆多竞争阻碍。若兄弟旺相，朋友多助力但易有口舌争执；若休囚，则孤立无援。占婚姻，主有竞争者；占事业，主同事掣肘。',
            '子孙': '世爻持子孙，主福气、平安、无忧。子孙持世，为福神持世，百事无忧，最利消灾解厄。子孙旺相，主有贵人暗助，诸事顺遂；若休囚，则虽无忧但缺乏进取之力。占官司，主胜诉；占疾病，主易愈；占求财，主财源广进。',
            '妻财': '世爻持妻财，主财运、女性、物质。妻财持世，利于求财、经商、女性缘。妻财旺相，主财运亨通，妻缘美满；若休囚，则财运平淡，感情有波折。占婚姻，男占主妻缘佳；占事业，主有实际收益。',
            '官鬼': '世爻持官鬼，主官职、名望、压力。官鬼持世，利于求名、升迁、考试。官鬼旺相，主有权势，受人尊重；若休囚，则压力大，易有是非。占婚姻，女占主夫缘佳；占疾病，主病情较重；占出行，主有阻碍。'
        };
        return analysisMap[liuQin] || '世爻持' + (liuQin || '未知') + '，需结合整体卦象综合分析。';
    }

    // ==================== 卦象总断数据 ====================

    /**
     * 生成卦象总断文本
     * @param {object} hexData - 卦象数据
     * @returns {string} 卦象总断文本
     */
    function getSummaryText(hexData) {
        if (!hexData) return '卦象数据不足，无法生成总断。';

        var name = hexData.name || '';
        var shortName = hexData.shortName || '';
        var changedName = hexData.changedName || '';
        var dongYaoCount = 0;
        var dongYaoPositions = [];

        if (hexData.lines) {
            for (var i = 0; i < hexData.lines.length; i++) {
                if (hexData.lines[i] && hexData.lines[i].isDong) {
                    dongYaoCount++;
                    dongYaoPositions.push(YAO_NAMES[i]);
                }
            }
        }

        var text = '';

        // 卦名总论
        text += '本卦' + (name || shortName) + '，';
        if (changedName && changedName !== name) {
            text += '变卦' + changedName + '。';
        } else {
            text += '无变卦。';
        }

        // 动爻分析
        if (dongYaoCount === 0) {
            text += '六爻安静，无动爻，主事态稳定，按部就班。';
        } else if (dongYaoCount === 1) {
            text += '一爻独发（' + dongYaoPositions[0] + '），事有专一之象，以此爻为主断。';
        } else if (dongYaoCount === 2) {
            text += '二爻齐动（' + dongYaoPositions.join('、') + '），事有两端，需权衡取舍。';
        } else if (dongYaoCount === 3) {
            text += '三爻同动（' + dongYaoPositions.join('、') + '），事态复杂，变化较多。';
        } else if (dongYaoCount === 4) {
            text += '四爻俱动（' + dongYaoPositions.join('、') + '），事多变故，宜静待时机。';
        } else if (dongYaoCount === 5) {
            text += '五爻俱动，主事态纷乱，以不动之一爻为断。';
        } else {
            text += '六爻皆动，乾坤翻覆，以变卦为主断。';
        }

        // 世应关系
        if (hexData.shiIndex !== undefined && hexData.yingIndex !== undefined) {
            text += '世在' + YAO_NAMES[hexData.shiIndex] + '，应在' + YAO_NAMES[hexData.yingIndex] + '。';
            if (hexData.shiIndex === hexData.yingIndex) {
                text += '世应同位，主事不分彼此。';
            } else {
                text += '世应异位，主彼此有别。';
            }
        }

        return text;
    }

    // ==================== 爻画与动爻标记 ====================

    /**
     * 获取爻画符号
     * @param {string} yaoType - 爻类型：'老阳','少阳','少阴','老阴'
     * @returns {string} 爻画符号
     */
    function getYaoHua(yaoType) {
        if (yaoType === '老阳' || yaoType === '少阳') {
            return '\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
        } else {
            return '\u2501\u2501 \u2501\u2501';
        }
    }

    /**
     * 获取动爻标记
     * @param {string} yaoType - 爻类型
     * @returns {string} 动爻标记符号
     */
    function getDongBiao(yaoType) {
        if (yaoType === '老阳') return '\u25CB'; // ○
        if (yaoType === '老阴') return '\u00D7'; // ×
        return '';
    }

    // ==================== 初始化 ====================

    /**
     * 模块初始化
     * 设置事件监听，初始化铜钱动画系统
     */
    function init() {
        // 延迟初始化，确保DOM已就绪
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', _initInternal);
        } else {
            _initInternal();
        }
    }

    function _initInternal() {
        // 绑定六爻页面相关事件
        _bindEvents();
    }

    /**
     * 绑定事件监听
     */
    function _bindEvents() {
        // 铜钱区域点击事件（摇卦）
        var coinArea = document.querySelector('.ly-coin-area');
        if (coinArea) {
            coinArea.addEventListener('click', function (e) {
                e.preventDefault();
                startCoinAnimation();
            });
        }

        // 开始排盘按钮
        var submitBtn = document.querySelector('.ly-btn-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', function (e) {
                e.preventDefault();
                submitHexagram();
            });
        }

        // 重新摇卦按钮
        var resetBtn = document.querySelector('.ly-btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', function (e) {
                e.preventDefault();
                resetYao();
            });
        }

        // 结果页签切换
        var tabs = document.querySelectorAll('.ly-page-tab');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-tab')) || 0;
                switchResultTab(idx);
            });
        });

        // 事项输入框
        var matterInput = $('lyMatter');
        if (matterInput) {
            matterInput.addEventListener('input', function () {
                matter = this.value.trim();
            });
        }
    }

    // ==================== 页面显示 ====================

    /**
     * 显示六爻页面
     * 隐藏其他页面，重置表单
     */
    function showPage() {
        // 重置表单
        resetYao();

        // 渲染输入页面
        renderInputPage();
    }

    // ==================== 输入页面渲染 ====================

    /**
     * 渲染摇卦输入页面
     */
    function renderInputPage() {
        var container = $('pageLiuyao');
        if (!container) return;

        // 记录当前时间
        var now = new Date();
        guaTime = now;

        var dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
        var timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        // 获取农历日期
        var lunarInfo = null;
        var lunarDateStr = '';
        if (window.Lunar) {
            lunarInfo = window.Lunar.solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
            if (lunarInfo) {
                lunarDateStr = window.Lunar.getLunarMonthName(lunarInfo.lunarMonth, lunarInfo.isLeap) +
                    window.Lunar.getLunarDayName(lunarInfo.lunarDay) + '（' + lunarInfo.shengXiao + '年）';
            }
        }

        var html = '';
        html += '<div class="ly-input-page">';

        // 标题
        html += '<div class="result-title">六爻摇卦</div>';

        // 事项输入
        html += '<div class="form-group">';
        html += '  <label>所占事项</label>';
        html += '  <input type="text" id="lyMatter" placeholder="请输入所占事项（如：财运、婚姻、事业等）" maxlength="50">';
        html += '</div>';

        // 起卦时间
        html += '<div class="info-bar">';
        html += '  <div class="info-item">';
        html += '    <span class="info-label">起卦时间：</span>';
        html += '    <span class="info-value">' + dateStr + ' ' + timeStr + '</span>';
        html += '  </div>';
        if (lunarDateStr) {
            html += '  <div class="info-item">';
            html += '    <span class="info-label">农历：</span>';
            html += '    <span class="info-value">' + lunarDateStr + '</span>';
            html += '  </div>';
        }
        html += '</div>';

        // 铜钱区域
        html += '<div id="lyCoinArea" class="ly-coin-area">';
        html += '  <div class="ly-coins">';
        html += '    <div class="ly-coin" id="lyCoin0"><div class="ly-coin-face"></div><div class="ly-coin-hole"></div></div>';
        html += '    <div class="ly-coin" id="lyCoin1"><div class="ly-coin-face"></div><div class="ly-coin-hole"></div></div>';
        html += '    <div class="ly-coin" id="lyCoin2"><div class="ly-coin-face"></div><div class="ly-coin-hole"></div></div>';
        html += '  </div>';
        html += '  <p class="ly-tip">请集中精力默想所占之事，点击铜钱开始旋转</p>';
        html += '</div>';

        // 爻象结果显示区
        html += '<div class="ly-yao-display" id="lyYaoDisplay"></div>';

        // 操作按钮
        html += '<div style="margin-top:15px;display:flex;gap:10px;">';
        html += '  <button class="btn btn-primary ly-btn-submit" id="lyBtnSubmit" style="flex:1;display:none;">开始排盘</button>';
        html += '  <button class="btn btn-secondary ly-btn-reset" id="lyBtnReset" style="flex:1;">重新摇卦</button>';
        html += '</div>';

        html += '</div>';

        // 结果页面（初始隐藏）
        html += '<div class="ly-result-page" id="lyResultPage" style="display:none;">';
        html += '  <div class="ly-result-tabs" id="lyResultTabs">';
        html += '    <div class="ly-page-tab active" data-tab="0">六爻排盘</div>';
        html += '    <div class="ly-page-tab" data-tab="1">传统解卦</div>';
        html += '    <div class="ly-page-tab" data-tab="2">卦辞爻辞</div>';
        html += '  </div>';
        html += '  <div id="lyResultContent"></div>';
        html += '  <div style="margin-top:15px;">';
        html += '    <button class="btn btn-secondary" onclick="LiuYaoUI.showPage()">返回重摇</button>';
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;

        // 重新绑定事件（因为innerHTML重建了DOM）
        _bindEvents();
    }

    // ==================== 铜钱动画 ====================

    /**
     * 开始/停止铜钱动画（状态机驱动）
     * IDLE → 点击 → SPINNING（铜钱旋转）
     * SPINNING → 点击 → RESULT（停止旋转，生成结果）
     * RESULT → 1.5秒后 → IDLE（如果未满6次）
     */
    function startCoinAnimation() {
        if (_yaoState === 'IDLE') {
            // 开始旋转
            _yaoState = 'SPINNING';
            var coins = document.querySelectorAll('.ly-coin');
            coins.forEach(function(coin) {
                coin.classList.add('ly-coin-spin');
            });
            // 更新提示文字
            var tip = document.querySelector('.ly-tip');
            if (tip) tip.textContent = '点击任意位置停止摇卦';
        } else if (_yaoState === 'SPINNING') {
            // 停止旋转，生成结果
            stopCoinAnimation();
        }
    }

    /**
     * 停止铜钱动画，生成一爻结果
     */
    function stopCoinAnimation() {
        _yaoState = 'RESULT';

        // 停止旋转动画
        var coins = document.querySelectorAll('.ly-coin');
        coins.forEach(function(coin) {
            coin.classList.remove('ly-coin-spin');
        });

        // 随机生成三枚铜钱结果（0=字面/阴, 1=背面/阳）
        var results = [];
        for (var i = 0; i < 3; i++) {
            results.push(Math.random() < 0.5 ? 0 : 1);
        }

        // 显示铜钱正反面
        coins.forEach(function(coin, idx) {
            if (results[idx] === 1) {
                coin.classList.add('ly-coin-back');  // 背面
                coin.classList.remove('ly-coin-front');
            } else {
                coin.classList.add('ly-coin-front'); // 字面
                coin.classList.remove('ly-coin-back');
            }
        });

        // 计算爻象
        var backCount = results.filter(function(r) { return r === 1; }).length;
        var yaoType;
        if (backCount === 3) yaoType = '老阳';      // 3背=老阳
        else if (backCount === 2) yaoType = '少阴';  // 2背=少阴
        else if (backCount === 1) yaoType = '少阳';  // 1背=少阳
        else yaoType = '老阴';                       // 0背=老阴

        // 记录结果
        _yaoResults.push(yaoType);
        _yaoCount++;

        // 更新爻象显示
        updateYaoDisplay(_yaoResults);

        // 更新提示文字
        var tip = document.querySelector('.ly-tip');
        if (tip) {
            if (_yaoCount < 6) {
                tip.textContent = '第' + _yaoCount + '爻：' + yaoType + '（还差' + (6 - _yaoCount) + '爻）';
            } else {
                tip.textContent = '六爻已满，请点击"开始排盘"';
            }
        }

        // 显示/隐藏按钮
        var submitBtn = document.querySelector('.ly-btn-submit');
        if (submitBtn) {
            submitBtn.style.display = _yaoCount >= 6 ? 'block' : 'none';
        }

        // 1.5秒后回到IDLE状态（如果未满6次）
        if (_yaoCount < 6) {
            setTimeout(function() {
                _yaoState = 'IDLE';
                var tip2 = document.querySelector('.ly-tip');
                if (tip2) tip2.textContent = '点击铜钱继续摇卦';
            }, 1500);
        }
    }

    // ==================== 爻象显示更新 ====================

    /**
     * 更新爻象结果显示区（从下到上：初爻到上爻）
     * @param {string[]} results - 爻结果数组
     */
    function updateYaoDisplay(results) {
        var container = document.querySelector('.ly-yao-display');
        if (!container) return;

        var html = '';
        var yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

        for (var i = 0; i < 6; i++) {
            if (i < results.length) {
                var yao = results[i];
                var isYang = (yao === '老阳' || yao === '少阳');
                var isDong = (yao === '老阳' || yao === '老阴');
                var lineSymbol = isYang ? '━━━' : '━ ━';
                var dongSymbol = '';
                if (yao === '老阳') dongSymbol = ' \u25CB';
                if (yao === '老阴') dongSymbol = ' \u00D7';

                html += '<div class="ly-yao-line">';
                html += '<span class="ly-yao-name">' + yaoNames[i] + '</span>';
                html += '<span class="ly-yao-symbol">' + lineSymbol + dongSymbol + '</span>';
                html += '<span class="ly-yao-type">' + yao + '</span>';
                html += '</div>';
            } else {
                html += '<div class="ly-yao-line ly-yao-empty">';
                html += '<span class="ly-yao-name">' + yaoNames[i] + '</span>';
                html += '<span class="ly-yao-symbol">━ ━</span>';
                html += '<span class="ly-yao-type">待摇</span>';
                html += '</div>';
            }
        }
        container.innerHTML = html;
    }

    // ==================== 重置摇卦 ====================

    /**
     * 重置摇卦状态
     */
    function resetYao() {
        _yaoState = 'IDLE';
        _yaoCount = 0;
        _yaoResults = [];
        if (_spinTimer) {
            clearInterval(_spinTimer);
            _spinTimer = null;
        }
        // 重置UI
        updateYaoDisplay([]);
        var tip = document.querySelector('.ly-tip');
        if (tip) tip.textContent = '请集中精力默想所占之事，点击铜钱开始旋转';
        var submitBtn = document.querySelector('.ly-btn-submit');
        if (submitBtn) submitBtn.style.display = 'none';
        matter = '';
        lastHexData = null;
        currentResultTab = 0;
    }

    // ==================== 提交排盘 ====================

    /**
     * 提交排盘
     * 当6爻摇完后，调用计算引擎并渲染结果
     */
    function submitHexagram() {
        if (_yaoResults.length < 6) {
            showToast('请先完成6爻摇卦');
            return;
        }

        // 获取事项
        var matterInput = $('lyMatter');
        if (matterInput) {
            matter = matterInput.value.trim();
        }

        // 调用计算引擎
        var hexData = null;
        if (window.LiuYao && window.LiuYao.calculateHexagram) {
            // 将字符串爻结果转换为数字数组（0=老阴, 1=少阳, 2=少阴, 3=老阳）
            var numResults = _yaoResults.map(function(y) {
                if (y === '老阴') return 0;
                if (y === '少阳') return 1;
                if (y === '少阴') return 2;
                if (y === '老阳') return 3;
                return 1;
            });
            hexData = window.LiuYao.calculateHexagram(numResults);
        } else {
            // 如果LiuYao模块未加载，使用本地简易计算
            hexData = _calculateHexagramLocal(_yaoResults);
        }

        if (!hexData) {
            showToast('排盘计算失败，请重试');
            return;
        }

        // 附加时间信息
        hexData.matter = matter || '未指定事项';
        hexData.guaTime = guaTime;

        // 获取干支等信息
        if (guaTime && window.Lunar) {
            var y = guaTime.getFullYear();
            var m = guaTime.getMonth() + 1;
            var d = guaTime.getDate();
            var h = guaTime.getHours();

            var yearGZ = window.Lunar.getYearGanZhi(y, m, d);
            var monthGZ = window.Lunar.getMonthGanZhi(y, m, d);
            var dayGZ = window.Lunar.getDayGanZhi(y, m, d);
            var hourGZ = window.Lunar.getHourGanZhi(dayGZ.ganIndex, h);

            hexData.yearGZ = yearGZ;
            hexData.monthGZ = monthGZ;
            hexData.dayGZ = dayGZ;
            hexData.hourGZ = hourGZ;

            // 农历日期
            var lunar = window.Lunar.solarToLunar(y, m, d);
            if (lunar) {
                hexData.lunarDate = window.Lunar.getLunarMonthName(lunar.lunarMonth, lunar.isLeap) +
                    window.Lunar.getLunarDayName(lunar.lunarDay);
            }

            // 空亡
            hexData.kongWang = _getKongWang(dayGZ.ganIndex);

            // 节气
            hexData.solarTerm = _getCurrentSolarTerm(y, m, d);

            // 神煞
            hexData.guaShen = _getGuaShen(hexData);
            hexData.yiMa = _getYiMa(dayGZ.zhiIndex);
            hexData.taoHua = _getTaoHua(dayGZ.ganIndex);
            hexData.riLu = _getRiLu(dayGZ.ganIndex);
        }

        // 合并LiuYao.HEXAGRAMS中的丰富数据
        if (window.LiuYao && window.LiuYao.HEXAGRAMS) {
            var origData = window.LiuYao.HEXAGRAMS[hexData.original.binary];
            var changedData = window.LiuYao.HEXAGRAMS[hexData.changed.binary];
            if (origData) {
                hexData.name = origData.name || hexData.name;
                hexData.shortName = origData.shortName || hexData.shortName;
                hexData.palace = origData.palace || hexData.palace;
                hexData.description = origData.description || '';
                hexData.xiangYue = origData.xiangYue || '';
                hexData.shiYue = origData.shiYue || '';
                hexData.duanYue = origData.duanYue || '';
                hexData.jieGua = origData.jieGua || '';
                hexData.categoryJudgments = origData.categoryJudgments || {};
                hexData.lineTexts = origData.lineTexts || [];
                hexData.upperName = origData.upper || '';
                hexData.lowerName = origData.lower || '';
            }
            if (changedData) {
                hexData.changedName = changedData.name || hexData.changedName;
                hexData.changedShort = changedData.shortName || hexData.changedShort;
                hexData.changedPalace = changedData.palace || hexData.changedPalace;
                hexData.changedLineTexts = changedData.lineTexts || [];
                hexData.changedUpperName = changedData.upper || '';
                hexData.changedLowerName = changedData.lower || '';
            }
        }

        // 使用LiuYao模块函数构建完整爻数据
        if (window.LiuYao && hexData.palace && window.LiuYao.getNajia) {
            var palaceWX = window.LiuYao.BA_GUA[hexData.palace].wuXing;
            var dayGanIdx = hexData.dayGZ ? hexData.dayGZ.ganIndex : 0;
            var monthZhiIdx = hexData.monthGZ ? hexData.monthGZ.zhiIndex : 0;
            var dayZhiIdx = hexData.dayGZ ? hexData.dayGZ.zhiIndex : 0;

            var fullLines = [];
            for (var i = 0; i < 6; i++) {
                var najia = window.LiuYao.getNajia(hexData.palace, i);
                var liuQin = window.LiuYao.getLiuQin(najia.wuXing, palaceWX);
                var liuShenArr = window.LiuYao.getLiuShen(dayGanIdx);
                var isYang = hexData.original.binary[i] === '1';
                var isDong = hexData.changingLines.indexOf(i) !== -1;

                fullLines.push({
                    index: i,
                    yaoType: _yaoResults[i],
                    isYang: isYang,
                    isDong: isDong,
                    gan: najia.gan,
                    zhi: najia.zhi,
                    wuXing: najia.wuXing,
                    liuQin: liuQin,
                    liuShen: liuShenArr[i],
                    yaoHua: getYaoHua(_yaoResults[i]),
                    dongBiao: getDongBiao(_yaoResults[i])
                });
            }

            var shiYing = window.LiuYao.getShiYing(hexData.palace, hexData.original.binary);
            var fuShen = window.LiuYao.getFuShen(hexData.palace, fullLines);
            var kongWang = window.LiuYao.getKongWang(dayGanIdx);
            var shenSha = window.LiuYao.getShenSha(dayZhiIdx, monthZhiIdx);

            hexData.lines = fullLines;
            hexData.shiIndex = shiYing.shi;
            hexData.yingIndex = shiYing.ying;
            hexData.fuShen = fuShen.map(function(f) { return f.qinType + '(' + f.fuZhi + ')'; }).join('、') || '六亲齐全';
            hexData.shiShiQin = fullLines[shiYing.shi] ? fullLines[shiYing.shi].liuQin : '未知';
            hexData.kongWang = kongWang.map(function(idx) { return window.LiuYao.DI_ZHI[idx]; }).join('');
            hexData.yiMa = shenSha.yiMa;
            hexData.taoHua = shenSha.taoHua;
            hexData.huaGai = shenSha.huaGai;
        }

        lastHexData = hexData;

        // 渲染结果
        renderResult(hexData);

        // 保存到记录
        _saveRecord(hexData);
    }

    // ==================== 本地简易卦象计算 ====================

    /**
     * 本地简易卦象计算（当LiuYao模块未加载时的备用方案）
     * @param {string[]} yaoResults - 爻结果数组
     * @returns {object} 卦象数据
     */
    function _calculateHexagramLocal(yaoResults) {
        // 八卦名称
        var baGuaNames = ['坤', '艮', '坎', '巽', '震', '离', '兑', '乾'];

        // 计算本卦二进制（从下到上）
        var benGua = 0;
        var bianGua = 0;
        var lines = [];

        for (var i = 0; i < 6; i++) {
            var isYang = (yaoResults[i] === '老阳' || yaoResults[i] === '少阳');
            var isDong = (yaoResults[i] === '老阳' || yaoResults[i] === '老阴');

            benGua |= (isYang ? 1 : 0) << i;

            // 变卦：动爻阴阳互换
            var changedYang = isDong ? !isYang : isYang;
            bianGua |= (changedYang ? 1 : 0) << i;

            lines.push({
                index: i,
                yaoType: yaoResults[i],
                isYang: isYang,
                isDong: isDong
            });
        }

        // 下卦（初爻到三爻）和上卦（四爻到上爻）
        var lowerIdx = benGua & 7;
        var upperIdx = (benGua >> 3) & 7;
        var changedLowerIdx = bianGua & 7;
        var changedUpperIdx = (bianGua >> 3) & 7;

        var lowerName = baGuaNames[lowerIdx];
        var upperName = baGuaNames[upperIdx];
        var changedLowerName = baGuaNames[changedLowerIdx];
        var changedUpperName = baGuaNames[changedUpperIdx];

        var name = upperName + '上' + lowerName + '下';
        var shortName = upperName + lowerName;
        var changedName = changedUpperName + '上' + changedLowerName + '下';
        var changedShort = changedUpperName + changedLowerName;

        // 宫位（简化）
        var palaceMap = {
            '乾': '乾', '兑': '兑', '离': '离', '震': '震',
            '巽': '巽', '坎': '坎', '艮': '艮', '坤': '坤'
        };
        var palace = palaceMap[lowerName] || lowerName;
        var changedPalace = palaceMap[changedLowerName] || changedLowerName;

        // 世应位置（简化：根据卦序）
        var shiYingMap = {
            0: [6, 3], 1: [0, 3], 2: [1, 4], 3: [2, 5],
            4: [3, 0], 5: [4, 1], 6: [5, 2], 7: [0, 3]
        };
        var guaIdx = (upperIdx * 8 + lowerIdx) % 8;
        var shiYing = shiYingMap[guaIdx] || [6, 3];
        var shiIndex = shiYing[0] >= 6 ? 5 : shiYing[0];
        var yingIndex = shiYing[1] >= 6 ? 5 : shiYing[1];

        // 六亲分配（简化：以本卦下卦五行为我）
        var wuXingMap = { '乾': '金', '兑': '金', '离': '火', '震': '木', '巽': '木', '坎': '水', '艮': '土', '坤': '土' };
        var myWX = wuXingMap[lowerName] || '金';

        // 地支分配（简化）
        var zhiMap = {
            '乾': ['子', '寅', '辰', '午', '申', '戌'],
            '坎': ['寅', '辰', '午', '申', '戌', '子'],
            '艮': ['辰', '午', '申', '戌', '子', '寅'],
            '震': ['子', '寅', '辰', '午', '申', '戌'],
            '巽': ['丑', '亥', '酉', '未', '巳', '卯'],
            '离': ['卯', '丑', '亥', '酉', '未', '巳'],
            '坤': ['未', '巳', '卯', '丑', '亥', '酉'],
            '兑': ['巳', '卯', '丑', '亥', '酉', '未']
        };

        // 六神（简化：按日干排列）
        var liuShenOrder = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
        var dayGanIdx = guaTime ? (new Date().getDay()) : 0;
        var liuShenBase = dayGanIdx % 6;

        // 天干分配
        var ganMap = {
            '乾': ['壬', '壬', '壬', '甲', '甲', '甲'],
            '坎': ['戊', '戊', '戊', '戊', '戊', '戊'],
            '艮': ['丙', '丙', '丙', '丙', '丙', '丙'],
            '震': ['庚', '庚', '庚', '庚', '庚', '庚'],
            '巽': ['辛', '辛', '辛', '辛', '辛', '辛'],
            '离': ['己', '己', '己', '己', '己', '己'],
            '坤': ['癸', '癸', '癸', '乙', '乙', '乙'],
            '兑': ['丁', '丁', '丁', '丁', '丁', '丁']
        };

        // 五行对应地支
        var zhiWXMap = {
            '子': '水', '丑': '土', '寅': '木', '卯': '木',
            '辰': '土', '巳': '火', '午': '火', '未': '土',
            '申': '金', '酉': '金', '戌': '土', '亥': '水'
        };

        // 六亲计算
        function getLiuQin(zhiWX) {
            if (zhiWX === myWX) return '兄弟';
            if (_isSheng(zhiWX, myWX)) return '父母';
            if (_isSheng(myWX, zhiWX)) return '子孙';
            if (_isKe(myWX, zhiWX)) return '妻财';
            return '官鬼';
        }

        function _isSheng(a, b) {
            var sheng = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
            return sheng[a] === b;
        }

        function _isKe(a, b) {
            var ke = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
            return ke[a] === b;
        }

        // 构建爻数据
        var fullLines = [];
        var zhiList = zhiMap[lowerName] || zhiMap['乾'];
        var ganList = ganMap[lowerName] || ganMap['乾'];

        for (var i = 0; i < 6; i++) {
            var zhi = zhiList[i];
            var gan = ganList[i];
            var zhiWX = zhiWXMap[zhi] || '土';
            var liuQin = getLiuQin(zhiWX);
            var liuShen = liuShenOrder[(liuShenBase + i) % 6];

            fullLines.push({
                index: i,
                yaoType: yaoResults[i],
                isYang: lines[i].isYang,
                isDong: lines[i].isDong,
                zhi: zhi,
                wuXing: zhiWX,
                gan: gan,
                liuQin: liuQin,
                liuShen: liuShen,
                yaoHua: getYaoHua(yaoResults[i]),
                dongBiao: getDongBiao(yaoResults[i])
            });
        }

        // 伏神（简化：找本卦中没有出现的六亲）
        var existingQin = {};
        fullLines.forEach(function (l) { existingQin[l.liuQin] = true; });
        var fuShenList = ['父母', '兄弟', '子孙', '妻财', '官鬼'].filter(function (q) { return !existingQin[q]; });
        var fuShenStr = fuShenList.length > 0 ? fuShenList.join('、') + '伏藏' : '六亲齐全';

        // 持世六亲
        var shiShiQin = fullLines[shiIndex] ? fullLines[shiIndex].liuQin : '未知';

        return {
            name: name,
            shortName: shortName,
            changedName: changedName,
            changedShort: changedShort,
            palace: palace,
            changedPalace: changedPalace,
            lines: fullLines,
            shiIndex: shiIndex,
            yingIndex: yingIndex,
            fuShen: fuShenStr,
            shiShiQin: shiShiQin,
            lowerName: lowerName,
            upperName: upperName,
            changedLowerName: changedLowerName,
            changedUpperName: changedUpperName
        };
    }

    // ==================== 辅助计算函数 ====================

    /**
     * 获取空亡
     * @param {number} dayGanIdx - 日干索引
     * @returns {string} 空亡地支
     */
    function _getKongWang(dayGanIdx) {
        var kongMap = {
            0: '戌亥', 5: '戌亥',
            1: '申酉', 6: '申酉',
            2: '午未', 7: '午未',
            3: '辰巳', 8: '辰巳',
            4: '寅卯', 9: '寅卯'
        };
        return kongMap[dayGanIdx] || '未知';
    }

    /**
     * 获取当前节气
     * @param {number} year - 年
     * @param {number} month - 月
     * @param {number} day - 日
     * @returns {string} 节气名称
     */
    function _getCurrentSolarTerm(year, month, day) {
        if (!window.Lunar || !window.Lunar.solarTermNames) return '未知';

        var termNames = window.Lunar.solarTermNames;
        var termMonths = window.Lunar.solarTermMonths;

        for (var i = 23; i >= 0; i--) {
            var termDate = window.Lunar.getSolarTermDate(year, i);
            if (termDate && termDate.month === month && termDate.day <= day) {
                return termNames[i];
            }
        }
        return '未知';
    }

    /**
     * 获取卦身
     * @param {object} hexData - 卦象数据
     * @returns {string} 卦身爻位
     */
    function _getGuaShen(hexData) {
        if (!hexData || !hexData.lines) return '未定';
        // 卦身：世爻所在爻的六亲
        var shiLine = hexData.lines[hexData.shiIndex];
        return shiLine ? (YAO_NAMES[hexData.shiIndex] + '爻') : '未定';
    }

    /**
     * 获取驿马
     * @param {number} dayZhiIdx - 日支索引
     * @returns {string} 驿马地支
     */
    function _getYiMa(dayZhiIdx) {
        var diZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
        var yimaMap = { 0: '申', 1: '巳', 2: '寅', 3: '亥', 4: '申', 5: '巳', 6: '寅', 7: '亥', 8: '申', 9: '巳', 10: '寅', 11: '亥' };
        return yimaMap[dayZhiIdx] || '未知';
    }

    /**
     * 获取桃花
     * @param {number} dayGanIdx - 日干索引
     * @returns {string} 桃花地支
     */
    function _getTaoHua(dayGanIdx) {
        var taoHuaMap = { 0: '卯', 1: '卯', 2: '酉', 3: '酉', 4: '酉', 5: '午', 6: '午', 7: '午', 8: '酉', 9: '酉' };
        return taoHuaMap[dayGanIdx] || '未知';
    }

    /**
     * 获取日禄
     * @param {number} dayGanIdx - 日干索引
     * @returns {string} 日禄地支
     */
    function _getRiLu(dayGanIdx) {
        var riLuMap = { 0: '寅', 1: '卯', 2: '巳', 3: '午', 4: '巳', 5: '午', 6: '申', 7: '酉', 8: '亥', 9: '子' };
        return riLuMap[dayGanIdx] || '未知';
    }

    // ==================== 结果渲染（核心函数） ====================

    /**
     * 渲染完整卦象结果
     * 包含三个页面：六爻排盘、传统解卦、卦辞爻辞
     * @param {object} hexData - 卦象数据
     */
    function renderResult(hexData) {
        // 隐藏输入页，显示结果页
        var inputPage = document.querySelector('.ly-input-page');
        var resultPage = $('lyResultPage');
        if (inputPage) inputPage.style.display = 'none';
        if (resultPage) resultPage.style.display = 'block';

        // 渲染当前选中的页签
        switchResultTab(currentResultTab);
    }

    /**
     * 切换结果页签
     * @param {number} tabIdx - 页签索引：0=排盘, 1=传统解卦, 2=卦辞爻辞
     */
    function switchResultTab(tabIdx) {
        currentResultTab = tabIdx;

        // 更新页签高亮
        var tabs = document.querySelectorAll('.ly-page-tab');
        tabs.forEach(function (t) {
            t.classList.remove('active');
            if (parseInt(t.getAttribute('data-tab')) === tabIdx) {
                t.classList.add('active');
            }
        });

        // 渲染对应内容
        var contentEl = $('lyResultContent');
        if (!contentEl || !lastHexData) return;

        switch (tabIdx) {
            case 0:
                contentEl.innerHTML = _renderPage1(lastHexData);
                break;
            case 1:
                contentEl.innerHTML = _renderPage2(lastHexData);
                break;
            case 2:
                contentEl.innerHTML = _renderPage3(lastHexData);
                break;
        }
    }

    // ==================== 页面1：六爻排盘 ====================

    /**
     * 渲染第一页：六爻排盘核心图表
     * @param {object} hexData - 卦象数据
     * @returns {string} HTML字符串
     */
    function _renderPage1(hexData) {
        var html = '';
        html += '<div class="liuyao-result">';

        // ---- 基础信息表 ----
        html += '<div class="ly-info-table">';
        html += _renderInfoRow('事项', hexData.matter || '未指定事项');
        html += _renderInfoRow('日期', _formatDate(hexData.guaTime) + '（' + (hexData.lunarDate || '') + '）');
        html += _renderInfoRow('卦式', '【在线摇卦】');
        html += _renderInfoRow('节气', hexData.solarTerm || '未知');
        html += _renderInfoRow('干支',
            (hexData.yearGZ ? hexData.yearGZ.ganZhi : '—') + ' / ' +
            '<b>' + (hexData.monthGZ ? hexData.monthGZ.ganZhi : '—') + '</b> / ' +
            '<b>' + (hexData.dayGZ ? hexData.dayGZ.ganZhi : '—') + '</b> / ' +
            (hexData.hourGZ ? hexData.hourGZ.ganZhi : '—'));
        html += _renderInfoRow('空亡', hexData.kongWang || '未知');
        html += _renderInfoRow('神煞',
            '卦身--' + (hexData.guaShen || '未定') +
            ' / 驿马--' + (hexData.yiMa || '未知') +
            ' / 桃花--' + (hexData.taoHua || '未知') +
            ' / 日禄--' + (hexData.riLu || '未知'));
        html += '</div>';

        // ---- 核心卦象：本卦+变卦 并排 ----
        html += '<div class="ly-hexagram-pair">';

        // 本卦
        html += _renderHexagramBlock(hexData, 'original');

        // 变卦
        html += _renderHexagramBlock(hexData, 'changed');

        html += '</div>';

        // ---- 卦象总断 ----
        html += '<div class="ly-summary">';
        html += '  <div class="ly-summary-title">卦象总断</div>';
        html += '  <div class="ly-summary-text">' + getSummaryText(hexData) + '</div>';
        html += '</div>';

        // ---- 持世分析 ----
        html += '<div class="ly-shishi">';
        html += '  <div class="ly-shishi-title">持世分析</div>';
        html += '  <div class="ly-shishi-text">' + getShiShiAnalysis(hexData.shiShiQin) + '</div>';
        html += '</div>';

        html += '</div>';
        return html;
    }

    /**
     * 渲染信息行
     * @param {string} label - 标签
     * @param {string} value - 值
     * @returns {string} HTML字符串
     */
    function _renderInfoRow(label, value) {
        return '<div class="ly-info-row"><span>' + label + '</span><span>' + value + '</span></div>';
    }

    /**
     * 渲染单个卦象块（本卦或变卦）
     * @param {object} hexData - 卦象数据
     * @param {string} type - 'original' 或 'changed'
     * @returns {string} HTML字符串
     */
    function _renderHexagramBlock(hexData, type) {
        var isOriginal = (type === 'original');
        var name = isOriginal ? (hexData.name || '') : (hexData.changedName || '');
        var shortName = isOriginal ? (hexData.shortName || '') : (hexData.changedShort || '');
        var palace = isOriginal ? (hexData.palace || '') : (hexData.changedPalace || '');
        var lines = hexData.lines || [];

        var html = '';
        html += '<div class="ly-hexagram ' + type + '">';
        html += '  <div class="ly-hex-title">' + (isOriginal ? '本卦' : '变卦') + '：' + name + '（' + shortName + '\u00B7' + palace + '宫）</div>';

        // 6爻从上到下显示（上爻在顶部，初爻在底部）
        for (var i = 5; i >= 0; i--) {
            var line = lines[i];
            if (!line) continue;

            var tag = '';
            if (isOriginal) {
                if (i === hexData.shiIndex) tag = '世';
                if (i === hexData.yingIndex) tag = '应';
                if (line.isDong) tag += (tag ? ' ' : '') + '动';
            }

            html += '<div class="ly-line">';
            html += '  <span class="ly-shen">' + (line.liuShen || '') + '</span>';
            html += '  <span class="ly-qin">' + (line.liuQin || '') + '</span>';
            html += '  <span class="ly-zhi">' + (line.zhi || '') + (line.wuXing || '') + '</span>';
            html += '  <span class="ly-gan">' + (line.gan || '') + '</span>';
            html += '  <span class="ly-yao-hua">' + (line.yaoHua || '') + '</span>';
            html += '  <span class="ly-tag">' + tag + '</span>';
            html += '</div>';
        }

        // 伏神（仅本卦显示）
        if (isOriginal && hexData.fuShen) {
            html += '<div class="ly-fushen">伏神：' + hexData.fuShen + '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * 格式化日期
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的日期字符串
     */
    function _formatDate(date) {
        if (!date) return '未知';
        return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' +
            date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    }

    // ==================== 页面2：传统解卦 ====================

    /**
     * 渲染第二页：传统解卦
     * @param {object} hexData - 卦象数据
     * @returns {string} HTML字符串
     */
    function _renderPage2(hexData) {
        var html = '';
        html += '<div class="ly-traditional">';

        // 标题
        var name = hexData.name || '';
        var shortName = hexData.shortName || '';
        html += '<div class="ly-trad-title">' + name + '（' + shortName + '）</div>';

        // 传统解卦数据（使用内置数据或从hexData获取）
        var tradData = _getTraditionalData(hexData);

        // 象曰
        html += '<div class="ly-trad-section">';
        html += '  <div class="ly-trad-label">象曰</div>';
        html += '  <div class="ly-trad-text">' + (tradData.xiangYue || '') + '</div>';
        html += '</div>';

        // 诗曰
        html += '<div class="ly-trad-section">';
        html += '  <div class="ly-trad-label">诗曰</div>';
        html += '  <div class="ly-trad-text">' + (tradData.shiYue || '') + '</div>';
        html += '</div>';

        // 断曰
        html += '<div class="ly-trad-section">';
        html += '  <div class="ly-trad-label">断曰</div>';
        html += '  <div class="ly-trad-text">' + (tradData.duanYue || '') + '</div>';
        html += '</div>';

        // 解卦
        html += '<div class="ly-trad-section">';
        html += '  <div class="ly-trad-label">解卦</div>';
        html += '  <div class="ly-trad-text">' + (tradData.jieGua || '') + '</div>';
        html += '</div>';

        // 分类占断
        html += '<div class="ly-categories">';
        var categories = tradData.categories || {};
        var catLabels = ['事业', '经商', '求名', '出行', '婚姻', '恋爱', '决策', '财运', '健康', '诉讼', '失物', '学业'];
        catLabels.forEach(function (label) {
            if (categories[label]) {
                html += '<div class="ly-cat-item">';
                html += '  <span class="ly-cat-label">' + label + '</span>';
                html += '  <span class="ly-cat-text">' + categories[label] + '</span>';
                html += '</div>';
            }
        });
        html += '</div>';

        html += '</div>';
        return html;
    }

    /**
     * 获取传统解卦数据
     * @param {object} hexData - 卦象数据
     * @returns {object} 传统解卦数据
     */
    function _getTraditionalData(hexData) {
        // 优先使用hexData中的传统数据（来自LiuYao.HEXAGRAMS）
        if (hexData.xiangYue || hexData.shiYue) {
            return {
                xiangYue: hexData.xiangYue || '',
                shiYue: hexData.shiYue || '',
                duanYue: hexData.duanYue || '',
                jieGua: hexData.jieGua || '',
                categories: hexData.categoryJudgments || {}
            };
        }

        // 如果LiuYao模块有传统数据，优先使用
        if (window.LiuYao && window.LiuYao.getTraditionalData) {
            return window.LiuYao.getTraditionalData(hexData);
        }

        // 使用内置简化数据
        var shortName = hexData.shortName || '';
        var data = _TRADITIONAL_DB[shortName];

        if (data) return data;

        // 通用数据
        return {
            xiangYue: '天行健，君子以自强不息。卦象显示当前形势需积极进取，不可懈怠。',
            shiYue: '卦象初成，吉凶未定。须知天时地利人和，三者缺一不可。凡事审慎而行，自有佳音。',
            duanYue: '此卦大吉，利于进取。但需注意时机，不可操之过急。守正待时，终有所成。',
            jieGua: hexData.name + '，' + (hexData.palace || '') + '宫之卦。' +
                '世在' + YAO_NAMES[hexData.shiIndex] + '，应在' + YAO_NAMES[hexData.yingIndex] + '。' +
                '整体卦象显示事情正处于发展变化之中，需根据具体事项综合判断。' +
                '动爻提示变化的关键所在，宜重点关注。',
            categories: {
                '事业': '事业运势中等偏上，有发展机会但需把握时机。宜稳扎稳打，不宜冒进。',
                '经商': '经商财运平稳，有小利可图。但需注意资金周转，不可贪大求全。',
                '求名': '求名有望，但需付出努力。贵人暗助，不可错失良机。',
                '出行': '出行平安，但需注意行程安排。途中可能有小波折，不影响大局。',
                '婚姻': '婚姻运势需审慎。有缘则聚，无缘则散。双方需多沟通理解。',
                '恋爱': '恋爱运势尚可，有心仪之人可大胆表达。但需注意对方真实想法。',
                '决策': '决策宜谨慎，不可轻率。多听取他人意见，综合分析后再做决定。',
                '财运': '财运平稳，正财为主。偏财运一般，不宜投机冒险。',
                '健康': '健康运势尚可，注意作息规律。有小恙及时就医，不可拖延。',
                '诉讼': '诉讼事宜宜和解，不宜强硬对抗。退一步海阔天空。',
                '失物': '失物有找回的可能，但需耐心寻找。近期留意周围环境。',
                '学业': '学业运势良好，用功读书必有收获。考试运佳，正常发挥即可。'
            }
        };
    }

    // ==================== 页面3：卦辞爻辞 ====================

    /**
     * 渲染第三页：卦辞爻辞
     * @param {object} hexData - 卦象数据
     * @returns {string} HTML字符串
     */
    function _renderPage3(hexData) {
        var html = '';
        html += '<div class="ly-classic">';

        // Tab切换：本卦 / 变卦
        html += '<div class="ly-classic-tabs">';
        html += '  <div class="ly-tab active" data-gua="original" onclick="LiuYaoUI._switchClassicTab(this,\'original\')">本卦: ' + (hexData.name || '') + '</div>';
        html += '  <div class="ly-tab" data-gua="changed" onclick="LiuYaoUI._switchClassicTab(this,\'changed\')">变卦: ' + (hexData.changedName || '') + '</div>';
        html += '</div>';

        // 卦辞内容区
        html += '<div id="lyClassicContent">';
        html += _renderClassicContent(hexData, 'original');
        html += '</div>';

        // 断语详解
        html += '<div class="ly-detail-judgments">';
        html += '  <div class="ly-dj-title">断语详解</div>';

        var judgments = _getDetailJudgments(hexData);
        var jLabels = ['总断', '运势', '事业', '财运', '婚姻', '恋爱', '健康', '出行', '诉讼', '失物', '学业', '家宅'];
        jLabels.forEach(function (label) {
            if (judgments[label]) {
                html += '<div class="ly-dj-item">';
                html += '  <span>' + label + '</span>';
                html += '  <span>' + judgments[label] + '</span>';
                html += '</div>';
            }
        });

        html += '</div>';

        html += '</div>';
        return html;
    }

    /**
     * 渲染卦辞爻辞内容
     * @param {object} hexData - 卦象数据
     * @param {string} type - 'original' 或 'changed'
     * @returns {string} HTML字符串
     */
    function _renderClassicContent(hexData, type) {
        var isOriginal = (type === 'original');
        var name = isOriginal ? (hexData.shortName || '') : (hexData.changedShort || '');
        var lines = hexData.lines || [];

        // 获取经典数据
        var classicData = _getClassicData(hexData, type);

        var html = '';

        // 卦辞
        html += '<div class="ly-guaci">';
        html += '  <div class="ly-guaci-title">卦辞</div>';
        html += '  <div class="ly-guaci-text">' + (classicData.guaCi || '') + '</div>';
        html += '</div>';

        // 象传
        html += '<div class="ly-xiangzhuan">';
        html += '  <div class="ly-xiangzhuan-title">象传</div>';
        html += '  <div class="ly-xiangzhuan-text">' + (classicData.xiangZhuan || '') + '</div>';
        html += '</div>';

        // 彖传
        html += '<div class="ly-tuanzhuan">';
        html += '  <div class="ly-tuanzhuan-title">彖传</div>';
        html += '  <div class="ly-tuanzhuan-text">' + (classicData.tuanZhuan || '') + '</div>';
        html += '</div>';

        // 六爻爻辞
        html += '<div class="ly-yaoci-list">';
        html += '  <div class="ly-yaoci-title">爻辞</div>';

        for (var i = 0; i < 6; i++) {
            var line = lines[i];
            if (!line) continue;

            var isYang = isOriginal ? line.isYang : !line.isYang;
            if (!line.isDong) isYang = line.isYang;
            var yaoName = getYaoName(i, isYang);
            var yaoCi = classicData.yaoCi ? (classicData.yaoCi[i] || '') : '';

            html += '<div class="ly-yaoci-item">';
            html += '  <div class="ly-yaoci-label">' + yaoName + '：</div>';
            html += '  <div class="ly-yaoci-text">' + yaoCi + '</div>';
            html += '</div>';
        }

        html += '</div>';

        return html;
    }

    /**
     * 获取经典卦辞数据
     * @param {object} hexData - 卦象数据
     * @param {string} type - 'original' 或 'changed'
     * @returns {object} 经典数据
     */
    function _getClassicData(hexData, type) {
        var isOriginal = (type === 'original');
        var shortName = isOriginal ? (hexData.shortName || '') : (hexData.changedShort || '');

        // 优先使用hexData中的经典数据（来自LiuYao.HEXAGRAMS）
        if (isOriginal && hexData.lineTexts && hexData.lineTexts.length > 0) {
            return {
                guaCi: hexData.description || (shortName + '：卦辞待补。'),
                xiangZhuan: hexData.xiangYue || '',
                tuanZhuan: hexData.jieGua || '',
                yaoCi: hexData.lineTexts
            };
        }
        if (!isOriginal && hexData.changedLineTexts && hexData.changedLineTexts.length > 0) {
            return {
                guaCi: (hexData.changedName || shortName) + '：变卦卦辞。',
                xiangZhuan: '',
                tuanZhuan: '',
                yaoCi: hexData.changedLineTexts
            };
        }

        // 如果LiuYao模块有经典数据，优先使用
        if (window.LiuYao && window.LiuYao.getClassicData) {
            return window.LiuYao.getClassicData(hexData, type);
        }

        var data = _CLASSIC_DB[shortName];

        if (data) return data;

        // 通用数据
        return {
            guaCi: shortName + '：元亨利贞。卦象显示天地之道，万物之理。君子观此卦，当明辨是非，审时度势。',
            xiangZhuan: '象曰：天行健，君子以自强不息。观乎天文以察时变，观乎人文以化成天下。',
            tuanZhuan: '彖曰：大哉乾元，万物资始，乃统天。云行雨施，品物流形。大明终始，六位时成。',
            yaoCi: [
                '初爻：潜龙勿用。阳气潜藏，宜韬光养晦，不可轻举妄动。',
                '二爻：见龙在田，利见大人。阳气渐显，宜有所作为，贵人相助。',
                '三爻：君子终日乾乾，夕惕若厉，无咎。勤勉谨慎，可保无虞。',
                '四爻：或跃在渊，无咎。进退自如，审时度势，把握时机。',
                '五爻：飞龙在天，利见大人。如日中天，事业有成，名利双收。',
                '上爻：亢龙有悔。盛极而衰，宜知进退，不可贪得无厌。'
            ]
        };
    }

    /**
     * 获取断语详解
     * @param {object} hexData - 卦象数据
     * @returns {object} 断语详解数据
     */
    function _getDetailJudgments(hexData) {
        if (window.LiuYao && window.LiuYao.getDetailJudgments) {
            return window.LiuYao.getDetailJudgments(hexData);
        }

        return {
            '总断': hexData.name + '，' + (hexData.palace || '') + '宫卦。世在' + YAO_NAMES[hexData.shiIndex] +
                '，应在' + YAO_NAMES[hexData.yingIndex] + '。' + getSummaryText(hexData),
            '运势': '整体运势平稳，有升有降。关键在于把握时机，顺势而为。近期宜守不宜攻，待机而动。',
            '事业': '事业方面有发展空间，但需耐心等待。贵人运尚可，可寻求长辈或上级帮助。',
            '财运': '财运中等，正财为主。投资宜谨慎，不可贪图暴利。节约开支，积少成多。',
            '婚姻': '婚姻运势需关注双方沟通。已有伴侣者关系稳定，未婚者有机会遇到心仪对象。',
            '恋爱': '恋爱运势良好，感情生活丰富多彩。但需注意不要过于冲动，理性对待感情问题。',
            '健康': '健康方面无大碍，注意饮食作息规律。适当运动，保持身心健康。',
            '出行': '出行顺利，但需提前做好准备。注意交通安全，避免前往偏远地区。',
            '诉讼': '诉讼事宜宜和解为主。对簿公堂未必有利，退一步海阔天空。',
            '失物': '失物有找回的可能。仔细回忆遗失地点，近期可能有意想不到的发现。',
            '学业': '学业运势良好，用功读书必有收获。考试运佳，发挥正常水平即可取得好成绩。',
            '家宅': '家宅平安，家庭和睦。近期可考虑家居调整，改善居住环境。'
        };
    }

    /**
     * 切换经典文本Tab（本卦/变卦）
     * @param {HTMLElement} tabEl - 点击的Tab元素
     * @param {string} type - 'original' 或 'changed'
     */
    function _switchClassicTab(tabEl, type) {
        // 更新Tab高亮
        var tabs = tabEl.parentElement.querySelectorAll('.ly-tab');
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tabEl.classList.add('active');

        // 更新内容
        var contentEl = $('lyClassicContent');
        if (contentEl && lastHexData) {
            contentEl.innerHTML = _renderClassicContent(lastHexData, type);
        }
    }

    // ==================== 保存记录 ====================

    /**
     * 保存排盘记录到本地存储
     * @param {object} hexData - 卦象数据
     */
    function _saveRecord(hexData) {
        try {
            var records = [];
            var stored = localStorage.getItem('liuyao_records');
            if (stored) {
                records = JSON.parse(stored);
            }

            var record = {
                id: Date.now(),
                matter: hexData.matter,
                name: hexData.name,
                changedName: hexData.changedName,
                yaoResults: _yaoResults.slice(),
                time: _formatDate(hexData.guaTime),
                timestamp: Date.now()
            };

            records.unshift(record);
            // 最多保存50条
            if (records.length > 50) records = records.slice(0, 50);

            localStorage.setItem('liuyao_records', JSON.stringify(records));
        } catch (e) {
            // 存储失败不影响主流程
        }
    }

    // ==================== 内置传统解卦数据库（简化版） ====================

    var _TRADITIONAL_DB = {
        '乾乾': {
            xiangYue: '天行健，君子以自强不息。乾为天，刚健中正，自强不息之象。',
            shiYue: '困龙得水好运交，不由喜气上眉梢。一切谋望皆如意，向后时运渐渐高。',
            duanYue: '此卦大吉，诸事亨通。但亢龙有悔，物极必反，宜知进退。',
            jieGua: '乾卦纯阳，象征刚健。占得此卦，主事有刚健之象，宜积极进取。但需注意刚柔并济，不可一味强硬。',
            categories: {
                '事业': '大吉大利，事业蒸蒸日上。有贵人相助，前途光明。',
                '经商': '财运亨通，生意兴隆。但需诚信经营，不可投机取巧。',
                '求名': '名利双收，声名远播。考试运极佳，可金榜题名。',
                '出行': '出行大吉，一路顺风。途中可能遇到贵人。',
                '婚姻': '婚姻美满，天作之合。双方感情深厚，白头偕老。',
                '恋爱': '恋爱顺利，感情升温。有望修成正果。',
                '决策': '果断决策，大胆行动。天时地利人和，万事俱备。',
                '财运': '财运极佳，正财偏财皆有。投资有利，可大胆尝试。',
                '健康': '身体健康，精力充沛。注意不可过度劳累。',
                '诉讼': '诉讼必胜，正义得到伸张。',
                '失物': '失物可寻，方向在西北或正南。',
                '学业': '学业大成，名列前茅。'
            }
        },
        '坤坤': {
            xiangYue: '地势坤，君子以厚德载物。坤为地，柔顺承天，包容万物之象。',
            shiYue: '泥中藏珠费找寻，费尽功夫始得金。如今运到终有得，管教欢喜不出心。',
            duanYue: '此卦先迷后得，宜顺势而行。柔顺谦和，终有所成。',
            jieGua: '坤卦纯阴，象征柔顺。占得此卦，宜守不宜攻，以柔克刚。耐心等待，时机成熟自然水到渠成。',
            categories: {
                '事业': '事业平稳，不宜冒进。脚踏实地，稳中求进。',
                '经商': '财运平稳，细水长流。宜守成，不宜扩张。',
                '求名': '求名需耐心，厚积薄发。终有出头之日。',
                '出行': '出行平安，但行程可能较慢。宜结伴而行。',
                '婚姻': '婚姻和谐，以柔克刚。女方为主，家庭和睦。',
                '恋爱': '恋爱需耐心培养，不可操之过急。',
                '决策': '决策宜谨慎，多听取他人意见。退一步海阔天空。',
                '财运': '财运平稳，正财为主。不宜冒险投资。',
                '健康': '健康尚可，注意脾胃保养。',
                '诉讼': '诉讼宜和解，退让为上。',
                '失物': '失物难寻，可能已遗失。',
                '学业': '学业需勤奋，日积月累方有所成。'
            }
        }
    };

    // ==================== 内置经典卦辞数据库（简化版） ====================

    var _CLASSIC_DB = {
        '乾乾': {
            guaCi: '乾：元，亨，利，贞。',
            xiangZhuan: '象曰：天行健，君子以自强不息。',
            tuanZhuan: '彖曰：大哉乾元，万物资始，乃统天。云行雨施，品物流形。大明终始，六位时成，时乘六龙以御天。乾道变化，各正性命，保合大和，乃利贞。首出庶物，万国咸宁。',
            yaoCi: [
                '初九：潜龙勿用。',
                '九二：见龙在田，利见大人。',
                '九三：君子终日乾乾，夕惕若，厉，无咎。',
                '九四：或跃在渊，无咎。',
                '九五：飞龙在天，利见大人。',
                '上九：亢龙有悔。',
                '用九：见群龙无首，吉。'
            ]
        },
        '坤坤': {
            guaCi: '坤：元，亨，利牝马之贞。君子有攸往，先迷后得主，利西南得朋，东北丧朋。安贞，吉。',
            xiangZhuan: '象曰：地势坤，君子以厚德载物。',
            tuanZhuan: '彖曰：至哉坤元，万物资生，乃顺承天。坤厚载物，德合无疆。含弘光大，品物咸亨。牝马地类，行地无疆，柔顺利贞。君子攸行，先迷失道，后顺得常。西南得朋，乃与类行；东北丧朋，乃终有庆。安贞之吉，应地无疆。',
            yaoCi: [
                '初六：履霜，坚冰至。',
                '六二：直、方、大，不习无不利。',
                '六三：含章可贞。或从王事，无成有终。',
                '六四：括囊；无咎无誉。',
                '六五：黄裳，元吉。',
                '上六：龙战于野，其血玄黄。',
                '用六：利永贞。'
            ]
        }
    };

    // ==================== 导出公共接口 ====================
    return {
        init: init,
        showPage: showPage,
        startCoinAnimation: startCoinAnimation,
        updateYaoDisplay: updateYaoDisplay,
        submitHexagram: submitHexagram,
        renderResult: renderResult,
        renderInputPage: renderInputPage,
        getShiShiAnalysis: getShiShiAnalysis,
        getSummaryText: getSummaryText,
        getYaoHua: getYaoHua,
        getDongBiao: getDongBiao,
        _switchClassicTab: _switchClassicTab,
        switchResultTab: switchResultTab
    };
})();

// 导出到全局
window.LiuYaoUI = LiuYaoUI;
