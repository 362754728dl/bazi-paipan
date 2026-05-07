/**
 * 日元强弱分析工具 - bazi_strength.js
 * 基于子平派标准
 * 依赖：lunar.js（万年历核心引擎）
 *
 * 算法核心：通过得令、得地、得势三个维度评估日主强弱
 * - 得令：月令地支五行是否为日主印星或比劫（权重2分）
 * - 得地：四柱地支藏干中是否含日主同类天干（权重2分）
 * - 得势：天干（年干、月干、时干）中是否有同类五行（权重2分）
 */

const BaziStrength = (function() {
    'use strict';

    // ==================== 五行生克关系 ====================
    // 木生火、火生土、土生金、金生水、水生木
    var SHENG_MAP = {
        '木': '火',
        '火': '土',
        '土': '金',
        '金': '水',
        '水': '木'
    };

    // 反向映射：被某五行所生（即印星五行）
    // 例如：木被水所生，所以木的印星是水
    var BEI_SHENG_MAP = {
        '木': '水',
        '火': '木',
        '土': '火',
        '金': '土',
        '水': '金'
    };

    // 五行对应十神名称（用于描述）
    var WU_XING_NAMES = {
        '木': '木',
        '火': '火',
        '土': '土',
        '金': '金',
        '水': '水'
    };

    // 柱位名称映射
    var PILLAR_NAMES = ['年', '月', '日', '时'];

    // 藏干层级名称
    var CANG_GAN_LEVEL = ['本气', '中气', '余气'];

    // ==================== 辅助函数 ====================

    /**
     * 获取某天干的五行属性
     * @param {string} gan - 天干字符
     * @returns {string} 五行名称
     */
    function getGanWuXing(gan) {
        var idx = Lunar.tianGan.indexOf(gan);
        if (idx === -1) return '';
        return Lunar.wuXingGan[idx];
    }

    /**
     * 获取某地支的五行属性（地支本气五行）
     * @param {number} zhiIndex - 地支索引
     * @returns {string} 五行名称
     */
    function getZhiWuXing(zhiIndex) {
        return Lunar.wuXingZhi[zhiIndex];
    }

    /**
     * 获取生我者的五行（印星五行）
     * @param {string} wuXing - 五行名称
     * @returns {string} 生我者的五行
     */
    function getYinXing(wuXing) {
        return BEI_SHENG_MAP[wuXing] || '';
    }

    /**
     * 判断两个天干是否为同类五行
     * @param {string} gan1 - 天干1
     * @param {string} gan2 - 天干2
     * @returns {boolean}
     */
    function isSameWuXing(gan1, gan2) {
        return getGanWuXing(gan1) === getGanWuXing(gan2);
    }

    /**
     * 获取十神名称（比劫类）
     * @param {string} dayGan - 日干
     * @param {string} otherGan - 其他天干
     * @returns {string} 十神名称
     */
    function getShiShenName(dayGan, otherGan) {
        var dayIdx = Lunar.tianGan.indexOf(dayGan);
        var otherIdx = Lunar.tianGan.indexOf(otherGan);
        return Lunar.getShiShen(dayIdx, otherIdx);
    }

    // ==================== 得令判断 ====================

    /**
     * 判断日主是否得令
     * 月令地支的五行属性，看是否为日主的印星或比劫
     * @param {object} dayPillar - 日柱
     * @param {object} monthPillar - 月柱
     * @returns {object} { deLing: boolean, score: number, detail: string }
     */
    function analyzeDeLing(dayPillar, monthPillar) {
        var dayGan = dayPillar.gan;
        var dayWX = getGanWuXing(dayGan);
        var monthZhiWX = getZhiWuXing(monthPillar.zhiIndex);
        var monthZhi = monthPillar.zhi;
        var yinXingWX = getYinXing(dayWX); // 印星五行

        // 月令本气为日主同类（比劫）→ 得令
        if (monthZhiWX === dayWX) {
            var shiShen = getShiShenName(dayGan, Lunar.tianGan[Lunar.wuXingGan.indexOf(dayWX)]);
            return {
                deLing: true,
                score: 2,
                detail: '月令' + monthZhi + '(' + monthZhiWX + ')为日主' + dayGan + dayWX + '之比劫，得令'
            };
        }

        // 月令本气为日主印星（生我者）→ 得令
        if (monthZhiWX === yinXingWX) {
            return {
                deLing: true,
                score: 2,
                detail: '月令' + monthZhi + '(' + monthZhiWX + ')为日主' + dayGan + dayWX + '之印星，得令'
            };
        }

        // 月令藏干中有日主本气根（藏干第一个天干与日干同类）→ 半得令
        var cangGan = Lunar.zhiCangGan[monthPillar.zhiIndex];
        if (cangGan && cangGan.length > 0) {
            var benQiGan = cangGan[0]; // 本气藏干
            if (isSameWuXing(benQiGan, dayGan)) {
                var benQiShiShen = getShiShenName(dayGan, benQiGan);
                return {
                    deLing: true,
                    score: 1,
                    detail: '月令' + monthZhi + '藏干本气' + benQiGan + '(' + benQiShiShen + ')与日主' + dayGan + dayWX + '同类，半得令'
                };
            }
        }

        // 否则 → 不得令
        return {
            deLing: false,
            score: 0,
            detail: '月令' + monthZhi + '(' + monthZhiWX + ')非日主' + dayGan + dayWX + '之印星或比劫，不得令'
        };
    }

    // ==================== 得地判断 ====================

    /**
     * 判断日主是否得地
     * 检查四个地支的藏干中是否有日主天干（同类五行）
     * @param {object} pillars - 四柱对象
     * @returns {object} { deDi: boolean, score: number, detail: string }
     */
    function analyzeDeDi(pillars) {
        var dayGan = pillars.day.gan;
        var dayWX = getGanWuXing(dayGan);
        var pillarKeys = ['year', 'month', 'day', 'hour'];
        var rootCount = 0; // 含日主根的地支数量
        var rootDetails = []; // 详细描述

        for (var i = 0; i < pillarKeys.length; i++) {
            var key = pillarKeys[i];
            var pillar = pillars[key];
            var cangGan = Lunar.zhiCangGan[pillar.zhiIndex];
            var zhiName = pillar.zhi;

            if (!cangGan || cangGan.length === 0) continue;

            for (var j = 0; j < cangGan.length; j++) {
                var cg = cangGan[j];
                if (isSameWuXing(cg, dayGan)) {
                    rootCount++;
                    var level = CANG_GAN_LEVEL[j] || '';
                    var ss = getShiShenName(dayGan, cg);
                    rootDetails.push(PILLAR_NAMES[i] + '支' + zhiName + '藏' + cg + '(' + ss + ')');
                    break; // 每个地支只计一次
                }
            }
        }

        // 至少有2个地支含日主藏干 → 得地
        if (rootCount >= 2) {
            return {
                deDi: true,
                score: 2,
                detail: rootDetails.join('，') + '，通根有力'
            };
        }

        // 只有1个地支含日主藏干 → 半得地
        if (rootCount === 1) {
            return {
                deDi: true,
                score: 1,
                detail: rootDetails[0] + '，根气不足'
            };
        }

        // 无 → 不得地
        return {
            deDi: false,
            score: 0,
            detail: '四柱地支藏干中无日主' + dayGan + dayWX + '同类，不得地'
        };
    }

    // ==================== 得势判断 ====================

    /**
     * 判断日主是否得势
     * 检查天干（年干、月干、时干，不含日干自身）中是否有同类五行
     * @param {object} pillars - 四柱对象
     * @returns {object} { deShi: boolean, score: number, detail: string }
     */
    function analyzeDeShi(pillars) {
        var dayGan = pillars.day.gan;
        var dayWX = getGanWuXing(dayGan);
        var otherGanKeys = ['year', 'month', 'hour']; // 不含日干自身
        var sameCount = 0;
        var sameDetails = [];

        for (var i = 0; i < otherGanKeys.length; i++) {
            var key = otherGanKeys[i];
            var gan = pillars[key].gan;
            if (isSameWuXing(gan, dayGan)) {
                sameCount++;
                var ss = getShiShenName(dayGan, gan);
                sameDetails.push(gan + '(' + ss + ')');
            }
        }

        // 有1个及以上同类天干 → 得势
        if (sameCount >= 1) {
            return {
                deShi: true,
                score: 2,
                detail: '天干出现' + sameDetails.join('、') + '，得势'
            };
        }

        // 无 → 不得势
        return {
            deShi: false,
            score: 0,
            detail: '天干无日主' + dayGan + dayWX + '同类，不得势'
        };
    }

    // ==================== 强弱等级划分 ====================

    /**
     * 根据得分和五行占比确定强弱等级
     * @param {number} score - 综合得分 0-6
     * @param {object} wuXing - 五行统计
     * @param {string} riZhuWuXing - 日主五行
     * @returns {object} { level: string, levelDetail: string }
     */
    function getLevel(score, wuXing, riZhuWuXing) {
        // 计算日主五行在全局中的占比
        var totalCount = 0;
        var keys = ['金', '木', '水', '火', '土'];
        for (var i = 0; i < keys.length; i++) {
            totalCount += (wuXing[keys[i]] || 0);
        }
        var riZhuCount = wuXing[riZhuWuXing] || 0;
        var ratio = totalCount > 0 ? riZhuCount / totalCount : 0;

        // 6分：从强（得令+得地+得势，且日主五行在全局中占比极高）
        if (score === 6) {
            if (ratio >= 0.4) {
                return {
                    level: '从强',
                    levelDetail: '得令、得地、得势，日主' + riZhuWuXing + '在全局占比极高，综合评定为从强'
                };
            }
            return {
                level: '强',
                levelDetail: '得令、得地、得势，综合评定为强'
            };
        }

        // 5分：强
        if (score === 5) {
            return {
                level: '强',
                levelDetail: '得令、得地、得势中占其二且有一项半得，综合评定为强'
            };
        }

        // 4分：偏强
        if (score === 4) {
            return {
                level: '偏强',
                levelDetail: '得令、得地、得势中占其二，综合评定为偏强'
            };
        }

        // 3分：均衡
        if (score === 3) {
            return {
                level: '均衡',
                levelDetail: '得令、得地、得势各得其一或半，综合评定为均衡'
            };
        }

        // 2分：偏弱
        if (score === 2) {
            return {
                level: '偏弱',
                levelDetail: '得令、得地、得势中仅占其一，综合评定为偏弱'
            };
        }

        // 1分：弱
        if (score === 1) {
            return {
                level: '弱',
                levelDetail: '得令、得地、得势中仅得半项，综合评定为弱'
            };
        }

        // 0分：从弱（不得令+不得地+不得势，且日主五行在全局中占比极低）
        if (ratio <= 0.1) {
            return {
                level: '从弱',
                levelDetail: '不得令、不得地、不得势，日主' + riZhuWuXing + '在全局占比极低，综合评定为从弱'
            };
        }
        return {
            level: '从弱',
            levelDetail: '不得令、不得地、不得势，综合评定为从弱'
        };
    }

    /**
     * 生成综合评定描述
     * @param {object} deLingResult - 得令结果
     * @param {object} deDiResult - 得地结果
     * @param {object} deShiResult - 得势结果
     * @returns {string}
     */
    function buildSummaryDetail(deLingResult, deDiResult, deShiResult) {
        var parts = [];
        if (deLingResult.deLing) parts.push('得令');
        if (deDiResult.deDi) parts.push('得地');
        if (deShiResult.deShi) parts.push('得势');

        if (parts.length === 0) {
            return '不得令、不得地、不得势';
        }

        return parts.join('、');
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

        // 1. 得令判断
        var deLingResult = analyzeDeLing(pillars.day, pillars.month);

        // 2. 得地判断
        var deDiResult = analyzeDeDi(pillars);

        // 3. 得势判断
        var deShiResult = analyzeDeShi(pillars);

        // 4. 综合得分
        var score = deLingResult.score + deDiResult.score + deShiResult.score;

        // 5. 强弱等级
        var wuXing = baziResult.wuXing || {};
        var levelResult = getLevel(score, wuXing, dayWX);

        // 6. 综合评定描述
        var summaryParts = buildSummaryDetail(deLingResult, deDiResult, deShiResult);
        var levelDetail = summaryParts + '，综合评定为' + levelResult.level;

        return {
            riZhuGan: dayGan,
            riZhuWuXing: dayWX,
            deLing: deLingResult.deLing,
            deLingDetail: deLingResult.detail,
            deDi: deDiResult.deDi,
            deDiDetail: deDiResult.detail,
            deShi: deShiResult.deShi,
            deShiDetail: deShiResult.detail,
            score: score,
            level: levelResult.level,
            levelDetail: levelDetail
        };
    }

    // ==================== 导出 ====================
    return {
        analyze: analyze
    };
})();
