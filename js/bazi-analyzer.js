/**
 * 命局基础分析公用模块 - bazi-analyzer.js
 * 提供日元强弱分析、五行统计、命理提示等功能
 * 供八字排盘页和八字合配页共用
 *
 * 依赖：lunar.js（万年历核心引擎）
 * 依赖：js/utils/bazi_strength_stable.js（日元强弱分析引擎）
 */
var BaziAnalyzer = (function() {
    'use strict';

    /**
     * 五行中文名称
     */
    var WU_XING_NAMES = ['金', '木', '水', '火', '土'];

    /**
     * 五行生克关系（我生者）
     */
    var WO_SHENG_MAP = {
        '金': '水', '水': '木', '木': '火', '火': '土', '土': '金'
    };

    /**
     * 五行生克关系（生我者 = 印星）
     */
    var SHENG_WO_MAP = {
        '金': '土', '木': '水', '水': '金', '火': '木', '土': '火'
    };

    /**
     * 五行对应方位/生活元素提示
     */
    var WU_XING_HINTS = {
        '金': '白色、西方、金属饰品',
        '木': '绿色、东方、植物',
        '水': '黑色/蓝色、北方、水相关',
        '火': '红色、南方、光照',
        '土': '黄色、中央、陶瓷玉石'
    };

    /**
     * 统计四柱天干地支的五行个数（仅天干+地支本气，不含藏干）
     * @param {object} pillars - result.pillars
     * @returns {object} 五行计数 {金:n, 木:n, 水:n, 火:n, 土:n}
     */
    function countWuXingFromPillars(pillars) {
        var count = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
        if (!pillars) return count;

        var keys = ['year', 'month', 'day', 'hour'];
        for (var i = 0; i < keys.length; i++) {
            var p = pillars[keys[i]];
            // 天干五行
            var ganIdx = p.ganIndex;
            if (ganIdx !== undefined && Lunar.wuXingGan) {
                var ganWX = Lunar.wuXingGan[ganIdx];
                if (count.hasOwnProperty(ganWX)) count[ganWX]++;
            }
            // 地支五行（本气）
            var zhiIdx = p.zhiIndex;
            if (zhiIdx !== undefined && Lunar.wuXingZhi) {
                var zhiWX = Lunar.wuXingZhi[zhiIdx];
                if (count.hasOwnProperty(zhiWX)) count[zhiWX]++;
            }
        }
        return count;
    }

    /**
     * 判断五行是否均衡
     * @param {object} count - 五行计数
     * @returns {string} 均衡描述
     */
    function getWuXingBalanceDesc(count) {
        var total = 0;
        var maxName = '', maxVal = 0;
        var minName = '', minVal = 99;
        var zeroNames = [];

        for (var i = 0; i < WU_XING_NAMES.length; i++) {
            var name = WU_XING_NAMES[i];
            var val = count[name] || 0;
            total += val;
            if (val > maxVal) { maxVal = val; maxName = name; }
            if (val < minVal) { minVal = val; minName = name; }
            if (val === 0) zeroNames.push(name);
        }

        if (total === 0) return '五行数据不足';

        // 有缺失的五行
        if (zeroNames.length > 0) {
            return '五行缺' + zeroNames.join('、');
        }

        // 判断偏旺/偏弱
        var avg = total / 5;
        if (maxVal >= avg + 2) {
            return maxName + '偏旺，' + minName + '偏弱';
        }
        if (maxVal >= avg + 1) {
            return maxName + '略旺，整体较均衡';
        }
        return '五行较均衡';
    }

    /**
     * 生成命理提示
     * @param {object} strengthResult - BaziStrengthStable.analyze() 的返回值
     * @param {object} wxCount - 五行计数
     * @returns {Array} 提示数组
     */
    function generateTips(strengthResult, wxCount) {
        var tips = [];
        if (!strengthResult) return tips;

        var level = strengthResult.level;
        var riZhuWX = strengthResult.riZhuWuXing;
        var yinXingWX = SHENG_WO_MAP[riZhuWX] || ''; // 印星五行（生我者）
        var woShengWX = WO_SHENG_MAP[riZhuWX] || ''; // 食伤五行（我生者）

        // 根据强弱给提示
        if (level === '从弱' || level === '弱' || level === '偏弱') {
            tips.push('身弱喜印比，宜补' + yinXingWX + '（印星）和' + riZhuWX + '（比劫）');
        } else if (level === '从强' || level === '强' || level === '偏强') {
            tips.push('身强喜食伤泄秀，宜补' + woShengWX + '（食伤）以泄秀');
        } else {
            tips.push('身主中和，五行较为平衡，宜保持现状');
        }

        // 检查五行缺失
        var zeroNames = [];
        for (var i = 0; i < WU_XING_NAMES.length; i++) {
            var name = WU_XING_NAMES[i];
            if ((wxCount[name] || 0) === 0) zeroNames.push(name);
        }
        if (zeroNames.length > 0) {
            tips.push('命局五行缺' + zeroNames.join('、') + '，宜在名字或生活中补' + zeroNames[0] + '（' + (WU_XING_HINTS[zeroNames[0]] || '') + '）');
        }

        // 检查比劫过旺
        var biJieCount = wxCount[riZhuWX] || 0;
        if (biJieCount >= 4) {
            tips.push(riZhuWX + '（比劫）较旺，需官杀制衡，宜补' + WO_SHENG_MAP[WO_SHENG_MAP[riZhuWX]] || '官杀');
        }

        // 最多3条
        return tips.slice(0, 3);
    }

    /**
     * 完整的命局基础分析
     * @param {object} baziResult - Bazi.generate() 返回的排盘结果
     * @returns {object|null} 分析结果
     */
    function analyze(baziResult) {
        if (!baziResult || !baziResult.pillars) return null;

        // 1. 日元强弱分析（使用已有的 bazi_strength_stable.js）
        var strengthResult = null;
        if (typeof BaziStrengthStable !== 'undefined' && BaziStrengthStable.analyze) {
            strengthResult = BaziStrengthStable.analyze(baziResult);
        }

        // 2. 五行统计（四柱天干+地支本气）
        var wxCount = countWuXingFromPillars(baziResult.pillars);

        // 3. 五行均衡描述
        var balanceDesc = getWuXingBalanceDesc(wxCount);

        // 4. 命理提示
        var tips = generateTips(strengthResult, wxCount);

        return {
            strength: strengthResult,
            wuXingCount: wxCount,
            balanceDesc: balanceDesc,
            tips: tips
        };
    }

    /**
     * 渲染命局基础分析HTML
     * @param {object} baziResult - Bazi.generate() 返回的排盘结果
     * @returns {string} HTML字符串
     */
    function renderHTML(baziResult) {
        var analysis = analyze(baziResult);
        if (!analysis) return '';

        var html = '<div class="result-card mingju-analysis-card" style="padding:16px;margin-bottom:12px;background:var(--card-bg, #fff);border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">';
        html += '<div style="font-size:15px;font-weight:bold;color:var(--primary, #2B5797);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border, #eee);">命局基础分析</div>';

        // 日元强弱
        if (analysis.strength) {
            var s = analysis.strength;
            html += '<div style="margin-bottom:12px;">';
            html += '<div style="font-size:13px;font-weight:bold;color:#333;margin-bottom:6px;">【日元强弱】</div>';
            html += '<div style="font-size:12px;color:#555;line-height:1.8;">';
            html += '日主<strong>' + s.riZhuGan + '</strong>（' + s.riZhuWuXing + '），生于<strong>' + baziResult.pillars.month.zhi + '</strong>月，' + (s.deLing ? '得月令' : '失月令') + '。';
            html += '天干' + (s.deShi ? '得势' : '失势') + '，地支' + (s.deDi ? '有根' : '无根') + '。';
            html += '<br>综合判断：<strong style="color:' + getLevelColor(s.level) + ';">' + s.level + '</strong>（' + s.levelDetail + '）';
            html += '</div></div>';
        }

        // 五行统计
        html += '<div style="margin-bottom:12px;">';
        html += '<div style="font-size:13px;font-weight:bold;color:#333;margin-bottom:6px;">【五行统计】</div>';
        html += '<div style="font-size:12px;color:#555;line-height:1.8;">';
        var wxParts = [];
        for (var i = 0; i < WU_XING_NAMES.length; i++) {
            var name = WU_XING_NAMES[i];
            wxParts.push(name + '\u00D7' + (analysis.wuXingCount[name] || 0));
        }
        html += wxParts.join('、');
        html += '<br>五行' + analysis.balanceDesc + '。';
        html += '</div></div>';

        // 命理提示
        if (analysis.tips.length > 0) {
            html += '<div>';
            html += '<div style="font-size:13px;font-weight:bold;color:#333;margin-bottom:6px;">【命理提示】</div>';
            html += '<div style="font-size:12px;color:#666;line-height:1.8;">';
            for (var j = 0; j < analysis.tips.length; j++) {
                html += '<div style="padding:4px 0;border-bottom:1px dashed var(--border, #eee);">' + (j + 1) + '. ' + analysis.tips[j] + '</div>';
            }
            html += '</div></div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * 根据强弱等级返回颜色
     */
    function getLevelColor(level) {
        var colors = {
            '从强': '#DC143C', '强': '#E85D04', '偏强': '#F48C06',
            '均衡': '#2B5797', '偏弱': '#3A86A8', '弱': '#5A9BD5', '从弱': '#7FB3D3'
        };
        return colors[level] || '#333';
    }

    // ==================== 导出 ====================
    return {
        analyze: analyze,
        renderHTML: renderHTML,
        countWuXingFromPillars: countWuXingFromPillars,
        getWuXingBalanceDesc: getWuXingBalanceDesc,
        generateTips: generateTips
    };
})();
