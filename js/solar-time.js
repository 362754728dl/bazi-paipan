/**
 * solar-time.js - 真太阳时计算模块
 *
 * 真太阳时 = 平太阳时 + 均时差(Equation of Time)
 * 平太阳时 = 北京时间(120°E) + (当地经度 - 120°) × 4分钟/度
 * 均时差(EoT)采用简化公式计算，单位为分钟
 */
var SolarTime = (function () {
    'use strict';

    /**
     * 判断是否为闰年
     * @param {number} year - 年份
     * @returns {boolean}
     */
    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    /**
     * 获取某年某月的天数
     * @param {number} year - 年份
     * @param {number} month - 月份（1-12）
     * @returns {number}
     */
    function getDaysInMonth(year, month) {
        var daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (month === 2 && isLeapYear(year)) {
            return 29;
        }
        return daysPerMonth[month - 1];
    }

    /**
     * 计算某日期在一年中的第几天（1月1日为第1天）
     * @param {number} year - 年份
     * @param {number} month - 月份（1-12）
     * @param {number} day - 日（1-31）
     * @returns {number} 一年中的第几天
     */
    function getDayOfYear(year, month, day) {
        var dayOfYear = 0;
        for (var m = 1; m < month; m++) {
            dayOfYear += getDaysInMonth(year, m);
        }
        dayOfYear += day;
        return dayOfYear;
    }

    /**
     * 计算均时差（Equation of Time）
     * 使用简化公式：B = 360/365 × (dayOfYear - 81)
     * EoT = 9.87×sin(2B) - 7.53×cos(B) - 1.5×sin(B)
     *
     * @param {number} dayOfYear - 一年中的第几天
     * @returns {number} 均时差，单位为分钟（可正可负）
     */
    function getEquationOfTime(dayOfYear) {
        // 将角度转换为弧度
        var B = (360 / 365) * (dayOfYear - 81);
        var B_rad = B * Math.PI / 180;

        // 均时差公式（单位：分钟）
        var eot = 9.87 * Math.sin(2 * B_rad)
                - 7.53 * Math.cos(B_rad)
                - 1.5 * Math.sin(B_rad);

        return eot;
    }

    /**
     * 根据经度计算真太阳时
     *
     * 计算步骤：
     * 1. 将北京时间转换为总分钟数
     * 2. 计算经度修正：(当地经度 - 120°) × 4分钟/度
     * 3. 计算均时差(EoT)
     * 4. 真太阳时 = 北京时间 + 经度修正 + 均时差
     *
     * @param {number} year - 年份（如 2024）
     * @param {number} month - 月份（1-12）
     * @param {number} day - 日（1-31）
     * @param {number} hour - 小时（0-23）
     * @param {number} minute - 分钟（0-59）
     * @param {number} longitude - 当地经度（东经为正，如北京 116.4）
     * @returns {{ trueHour: number, trueMinute: number, diffMinutes: number }}
     *   - trueHour: 真太阳时的小时部分（0-23）
     *   - trueMinute: 真太阳时的分钟部分（0-59）
     *   - diffMinutes: 真太阳时与北京时间的差值（分钟），正数表示比北京时间快
     */
    function getTrueSolarTime(year, month, day, hour, minute, longitude) {
        // 北京时间转换为总分钟数（从0点开始）
        var beijingTotalMinutes = hour * 60 + minute;

        // 经度修正：当地经度与北京时间基准经度(120°E)的差值 × 4分钟/度
        var longitudeCorrection = (longitude - 120) * 4;

        // 计算一年中的第几天
        var dayOfYear = getDayOfYear(year, month, day);

        // 计算均时差（分钟）
        var eot = getEquationOfTime(dayOfYear);

        // 真太阳时总分钟数
        var trueTotalMinutes = beijingTotalMinutes + longitudeCorrection + eot;

        // 处理跨日情况（取模运算，确保在0-1439范围内）
        trueTotalMinutes = ((trueTotalMinutes % 1440) + 1440) % 1440;

        // 计算差值（真太阳时 - 北京时间），保留原始差值不取模
        var diffMinutes = longitudeCorrection + eot;

        // 分离小时和分钟
        var trueHour = Math.floor(trueTotalMinutes / 60) % 24;
        var trueMinute = Math.round(trueTotalMinutes % 60);

        // 处理四舍五入导致的分钟为60的情况
        if (trueMinute === 60) {
            trueMinute = 0;
            trueHour = (trueHour + 1) % 24;
        }

        return {
            trueHour: trueHour,
            trueMinute: trueMinute,
            diffMinutes: Math.round(diffMinutes * 10) / 10  // 保留一位小数
        };
    }

    // 公开API
    return {
        getTrueSolarTime: getTrueSolarTime
    };
})();
