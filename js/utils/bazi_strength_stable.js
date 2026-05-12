/**
 * 日元强弱分析工具 - bazi_strength_stable.js
 * 基于用户提供的七级判定标准（严格规则，无动态计算）
 * 依赖：lunar.js（万年历核心引擎）
 *
 * 七级判定：从强、强、偏强、均衡、偏弱、弱、从弱
 *
 * 判定规则：
 * 1. 从强：七字全生助日元
 * 2. 强：得令+得地+得势
 * 3. 偏强：得令+得地+不得势 或 得令+不得地+得势
 * 4. 均衡：不得令+得地+得势 或 得令+不得地+不得势
 * 5. 偏弱：不得令+不得地+得势 或 不得令+得地+不得势
 * 6. 弱：不得令+不得地+不得势
 * 7. 从弱：七字全克泄耗日元
 */

const BaziStrengthStable = (function() {
    'use strict';

    // ==================== 得令对照表 ====================
    // 日主 → 得令月支列表
    var DE_LING_MAP = {
        '甲': ['寅', '卯', '亥', '子'],
        '乙': ['寅', '卯', '亥', '子'],
        '丙': ['巳', '午', '寅', '卯'],
        '丁': ['巳', '午', '寅', '卯'],
        '戊': ['辰', '戌', '丑', '未', '巳', '午'],
        '己': ['辰', '戌', '丑', '未', '巳', '午'],
        '庚': ['辰', '戌', '丑', '未', '申', '酉'],
        '辛': ['辰', '戌', '丑', '未', '申', '酉'],
        '壬': ['申', '酉', '亥', '子'],
        '癸': ['申', '酉', '亥', '子']
    };

    // ==================== 得地对照表 ====================
    // 日主五行 → 含同类五行的地支列表
    var DE_DI_MAP = {
        '木': ['寅', '卯', '辰', '亥', '未'],  // 藏干中有木的地支
        '火': ['巳', '午', '未', '寅', '戌'],  // 藏干中有火的地支
        '土': ['辰', '戌', '丑', '未', '巳', '午', '寅'],  // 藏干中有土的地支
        '金': ['申', '酉', '戌', '巳', '丑'],  // 藏干中有金的地支
        '水': ['亥', '子', '丑', '申', '辰']   // 藏干中有水的地支
    };

    // ==================== 天干五行映射 ====================
    var GAN_WU_XING = {
        '甲': '木', '乙': '木',
        '丙': '火', '丁': '火',
        '戊': '土', '己': '土',
        '庚': '金', '辛': '金',
        '壬': '水', '癸': '水'
    };

    // ==================== 五行生我关系（印星） ====================
    var SHENG_WO = {
        '木': '水',  // 水生木
        '火': '木',  // 木生火
        '土': '火',  // 火生土
        '金': '土',  // 土生金
        '水': '金'   // 金生水
    };

    // ==================== 五行我生关系（食伤） ====================
    var WO_SHENG = {
        '木': '火',
        '火': '土',
        '土': '金',
        '金': '水',
        '水': '木'
    };

    // ==================== 五行克我关系（官杀） ====================
    var KE_WO = {
        '木': '金',
        '火': '水',
        '土': '木',
        '金': '火',
        '水': '土'
    };

    // ==================== 五行我克关系（财星） ====================
    var WO_KE = {
        '木': '土',
        '火': '金',
        '土': '水',
        '金': '木',
        '水': '火'
    };

    // ==================== 辅助函数 ====================

    /**
     * 获取天干五行
     */
    function getGanWuXing(gan) {
        return GAN_WU_XING[gan] || '';
    }

    /**
     * 判断两个字是否同类五行
     */
    function isSameWuXing(gan1, gan2) {
        return getGanWuXing(gan1) === getGanWuXing(gan2);
    }

    /**
     * 判断五行是否生助日主（印星或比劫）
     */
    function isShengZhu(wx, riZhuWX) {
        // 比劫：同类五行
        if (wx === riZhuWX) return true;
        // 印星：生我者
        if (SHENG_WO[riZhuWX] === wx) return true;
        return false;
    }

    /**
     * 判断五行是否克泄耗日主
     */
    function isKeXieHao(wx, riZhuWX) {
        return !isShengZhu(wx, riZhuWX);
    }

    // ==================== 得令判断 ====================

    /**
     * 判断日主是否得令
     * 规则：月支在对应的得令列表中 → 得令
     */
    function analyzeDeLing(dayGan, monthZhi) {
        var deLingList = DE_LING_MAP[dayGan];
        if (!deLingList) {
            return { deLing: false, detail: '无法识别日主' };
        }

        var deLing = deLingList.indexOf(monthZhi) !== -1;
        var dayWX = getGanWuXing(dayGan);

        if (deLing) {
            return {
                deLing: true,
                detail: '月支' + monthZhi + '在' + dayGan + '日主的得令列表中，得令'
            };
        } else {
            return {
                deLing: false,
                detail: '月支' + monthZhi + '不在' + dayGan + '日主的得令列表中，不得令'
            };
        }
    }

    // ==================== 得地判断 ====================

    /**
     * 判断日主是否得地
     * 规则：四柱地支藏干中有同类五行 → 得地
     */
    function analyzeDeDi(pillars) {
        var dayGan = pillars.day.gan;
        var dayWX = getGanWuXing(dayGan);
        var deDiList = DE_DI_MAP[dayWX];
        var pillarNames = ['年', '月', '日', '时'];
        var pillarKeys = ['year', 'month', 'day', 'hour'];
        var foundZhi = [];

        for (var i = 0; i < pillarKeys.length; i++) {
            var zhi = pillars[pillarKeys[i]].zhi;
            if (deDiList.indexOf(zhi) !== -1) {
                foundZhi.push(pillarNames[i] + '支' + zhi);
            }
        }

        if (foundZhi.length > 0) {
            return {
                deDi: true,
                detail: foundZhi.join('、') + '藏干中有' + dayWX + '，得地'
            };
        } else {
            return {
                deDi: false,
                detail: '四柱地支藏干中无' + dayWX + '同类，不得地'
            };
        }
    }

    // ==================== 得势判断 ====================

    /**
     * 判断日主是否得势
     * 规则：年、月、时三天干中出现≥1个同五行字 → 得势
     */
    function analyzeDeShi(pillars) {
        var dayGan = pillars.day.gan;
        var dayWX = getGanWuXing(dayGan);
        var otherGanKeys = ['year', 'month', 'hour'];
        var foundGan = [];

        for (var i = 0; i < otherGanKeys.length; i++) {
            var gan = pillars[otherGanKeys[i]].gan;
            if (isSameWuXing(gan, dayGan)) {
                foundGan.push(gan);
            }
        }

        if (foundGan.length >= 1) {
            return {
                deShi: true,
                detail: '天干出现' + foundGan.join('、') + '，与日主同属' + dayWX + '，得势'
            };
        } else {
            return {
                deShi: false,
                detail: '年、月、时三天干中无' + dayWX + '同类，不得势'
            };
        }
    }

    // ==================== 藏干表 ====================
    var ZHI_CANG_GAN = {
        '子': ['癸'],
        '丑': ['己', '癸', '辛'],
        '寅': ['甲', '丙', '戊'],
        '卯': ['乙'],
        '辰': ['戊', '乙', '癸'],
        '巳': ['丙', '戊', '庚'],
        '午': ['丁', '己'],
        '未': ['己', '丁', '乙'],
        '申': ['庚', '壬', '戊'],
        '酉': ['辛'],
        '戌': ['戊', '辛', '丁'],
        '亥': ['壬', '甲']
    };

    // ==================== 从强/从弱判断 ====================

    /**
     * 判断是否从强：七字全生助日元
     * 需要检查：天干五行 + 地支本气五行 + 地支藏干五行
     */
    function isCongQiang(pillars) {
        var dayGan = pillars.day.gan;
        var dayWX = getGanWuXing(dayGan);
        var yinWX = SHENG_WO[dayWX]; // 印星五行

        // 检查除日干外的7个字
        var allShengZhu = true;
        var details = [];

        // 年、月、时天干
        var ganKeys = ['year', 'month', 'hour'];
        for (var i = 0; i < ganKeys.length; i++) {
            var gan = pillars[ganKeys[i]].gan;
            var ganWX = getGanWuXing(gan);
            if (!isShengZhu(ganWX, dayWX)) {
                allShengZhu = false;
                details.push(ganKeys[i] + '干' + gan + '(' + ganWX + ')不生助');
            }
        }

        // 四个地支（检查本气+藏干）
        var zhiKeys = ['year', 'month', 'day', 'hour'];
        for (var j = 0; j < zhiKeys.length; j++) {
            var zhi = pillars[zhiKeys[j]].zhi;
            var zhiWX = Lunar.wuXingZhi[pillars[zhiKeys[j]].zhiIndex];

            // 检查地支本气
            if (!isShengZhu(zhiWX, dayWX)) {
                // 本气不生助，再检查藏干中是否有生助的
                var cangGan = ZHI_CANG_GAN[zhi] || [];
                var hasShengZhuCangGan = false;
                for (var k = 0; k < cangGan.length; k++) {
                    var cgWX = getGanWuXing(cangGan[k]);
                    if (isShengZhu(cgWX, dayWX)) {
                        hasShengZhuCangGan = true;
                        break;
                    }
                }
                if (!hasShengZhuCangGan) {
                    allShengZhu = false;
                    details.push(zhiKeys[j] + '支' + zhi + '(' + zhiWX + ')不生助');
                }
            }
        }

        return { result: allShengZhu, details: details };
    }

    /**
     * 判断是否从弱：七字全克泄耗日元
     * 需要检查：天干五行 + 地支本气五行 + 地支藏干五行
     */
    function isCongRuo(pillars) {
        var dayGan = pillars.day.gan;
        var dayWX = getGanWuXing(dayGan);

        // 检查除日干外的7个字
        var allKeXieHao = true;
        var details = [];

        // 年、月、时天干
        var ganKeys = ['year', 'month', 'hour'];
        for (var i = 0; i < ganKeys.length; i++) {
            var gan = pillars[ganKeys[i]].gan;
            var ganWX = getGanWuXing(gan);
            if (isShengZhu(ganWX, dayWX)) {
                allKeXieHao = false;
                details.push(ganKeys[i] + '干' + gan + '(' + ganWX + ')生助');
            }
        }

        // 四个地支（检查本气+藏干）
        var zhiKeys = ['year', 'month', 'day', 'hour'];
        for (var j = 0; j < zhiKeys.length; j++) {
            var zhi = pillars[zhiKeys[j]].zhi;
            var zhiWX = Lunar.wuXingZhi[pillars[zhiKeys[j]].zhiIndex];

            // 检查地支本气
            if (isShengZhu(zhiWX, dayWX)) {
                // 本气生助，则不是从弱
                allKeXieHao = false;
                details.push(zhiKeys[j] + '支' + zhi + '(' + zhiWX + ')生助');
            } else {
                // 本气不生助，再检查藏干中是否有生助的
                var cangGan = ZHI_CANG_GAN[zhi] || [];
                for (var k = 0; k < cangGan.length; k++) {
                    var cgWX = getGanWuXing(cangGan[k]);
                    if (isShengZhu(cgWX, dayWX)) {
                        allKeXieHao = false;
                        details.push(zhiKeys[j] + '支' + zhi + '藏干' + cangGan[k] + '(' + cgWX + ')生助');
                        break;
                    }
                }
            }
        }

        return { result: allKeXieHao, details: details };
    }

    // ==================== 七级综合判定 ====================

    /**
     * 根据得令、得地、得势判定强弱等级
     */
    function getLevel(deLing, deDi, deShi) {
        // 强：得令+得地+得势
        if (deLing && deDi && deShi) {
            return { level: '强', levelDetail: '得令+得地+得势' };
        }

        // 偏强：得令+得地+不得势 或 得令+不得地+得势
        if (deLing && deDi && !deShi) {
            return { level: '偏强', levelDetail: '得令+得地+不得势' };
        }
        if (deLing && !deDi && deShi) {
            return { level: '偏强', levelDetail: '得令+不得地+得势' };
        }

        // 均衡：不得令+得地+得势 或 得令+不得地+不得势
        if (!deLing && deDi && deShi) {
            return { level: '均衡', levelDetail: '不得令+得地+得势' };
        }
        if (deLing && !deDi && !deShi) {
            return { level: '均衡', levelDetail: '得令+不得地+不得势' };
        }

        // 偏弱：不得令+不得地+得势 或 不得令+得地+不得势
        if (!deLing && !deDi && deShi) {
            return { level: '偏弱', levelDetail: '不得令+不得地+得势' };
        }
        if (!deLing && deDi && !deShi) {
            return { level: '偏弱', levelDetail: '不得令+得地+不得势' };
        }

        // 弱：不得令+不得地+不得势
        if (!deLing && !deDi && !deShi) {
            return { level: '弱', levelDetail: '不得令+不得地+不得势' };
        }

        // 兜底（理论上不会到达）
        return { level: '均衡', levelDetail: '综合判定' };
    }

    // ==================== 核心分析方法 ====================

    /**
     * 分析日主强弱
     * @param {object} baziResult - Bazi.generate() 返回的排盘结果
     * @returns {object} 强弱分析结果
     */
    function analyze(baziResult) {
        if (!baziResult || !baziResult.pillars) {
            return null;
        }

        var pillars = baziResult.pillars;
        var dayGan = pillars.day.gan;
        var dayWX = getGanWuXing(dayGan);
        var monthZhi = pillars.month.zhi;

        // 1. 优先检查特殊状态：从强、从弱
        var congQiang = isCongQiang(pillars);
        var congRuo = isCongRuo(pillars);

        if (congQiang.result) {
            return {
                riZhuGan: dayGan,
                riZhuWuXing: dayWX,
                deLing: true,
                deLingDetail: '七字全生助日元',
                deDi: true,
                deDiDetail: '七字全生助日元',
                deShi: true,
                deShiDetail: '七字全生助日元',
                level: '从强',
                levelDetail: '七字全生助日元，从强'
            };
        }

        if (congRuo.result) {
            return {
                riZhuGan: dayGan,
                riZhuWuXing: dayWX,
                deLing: false,
                deLingDetail: '七字全克泄耗日元',
                deDi: false,
                deDiDetail: '七字全克泄耗日元',
                deShi: false,
                deShiDetail: '七字全克泄耗日元',
                level: '从弱',
                levelDetail: '七字全克泄耗日元，从弱'
            };
        }

        // 2. 常规判断：得令、得地、得势
        var deLingResult = analyzeDeLing(dayGan, monthZhi);
        var deDiResult = analyzeDeDi(pillars);
        var deShiResult = analyzeDeShi(pillars);

        // 3. 七级综合判定
        var levelResult = getLevel(deLingResult.deLing, deDiResult.deDi, deShiResult.deShi);

        return {
            riZhuGan: dayGan,
            riZhuWuXing: dayWX,
            deLing: deLingResult.deLing,
            deLingDetail: deLingResult.detail,
            deDi: deDiResult.deDi,
            deDiDetail: deDiResult.detail,
            deShi: deShiResult.deShi,
            deShiDetail: deShiResult.detail,
            level: levelResult.level,
            levelDetail: levelResult.levelDetail
        };
    }

    // ==================== 导出 ====================
    return {
        analyze: analyze,
        // 导出对照表供测试验证
        DE_LING_MAP: DE_LING_MAP,
        DE_DI_MAP: DE_DI_MAP,
        GAN_WU_XING: GAN_WU_XING
    };
})();
