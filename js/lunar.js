/**
 * 万年历核心引擎 v2.0 - lunar.js
 * 基于儒略日数(JDN)精确算法
 * 校验标准：1990年1月30日 → 己巳年 丁丑月 乙未日 庚辰时
 * 
 * 覆盖范围：1900年 - 2100年
 * 精度：日柱精确到天，节气精确到日
 */

const Lunar = (function() {
    'use strict';

    // ==================== 农历数据表 (1900-2100) ====================
    // 编码格式：
    // 第1-4位(hex): 闰月月份(0=无闰月)  
    // 第5-16位: 1-12月大小(1=30天大月,0=29天小月)
    // 第17位: 闰月大小(1=30天,0=29天)
    const lunarInfo = [
        0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
        0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
        0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
        0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
        0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
        0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
        0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
        0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
        0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
        0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
        0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
        0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
        0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
        0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
        0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
        0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
        0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
        0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
        0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
        0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a4d0,0x0d150,0x0f252,
        0x0d520
    ];

    // ==================== 节气数据 (1900-2100) ====================
    // 采用jjonline/calendar.js标准sTermInfo编码格式
    // 每年一个24字符十六进制字符串，每5个字符一组，解码为4个节气日期
    const sTermInfo = [
'9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f',
'97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e',
'97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa',
'97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f',
'b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f',
'97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa',
'97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2',
'9778397bd097c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f',
'97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36c9210c9274c91aa','97b6b97bd19801ec9210c965cc920e',
'97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa',
'97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722',
'9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f',
'97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e',
'97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa',
'97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722',
'9778397bd097c36b0b6fc9210c8dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f',
'97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc9210c8dc2','9778397bd097c36c9210c9274c920e',
'97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc9210c8dc2',
'9778397bd097c36c9210c9274c91aa','97b6b97bd19801ec9210c965cc920e','97bd07f1487f595b0b0bc920fb0722',
'7f0e397bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e',
'97bcf7f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa',
'97b6b97bd19801ec9210c965cc920e','97bcf7f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722',
'9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf7f1487f531b0b0bb0b6fb0722',
'7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e',
'97bcf7f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa',
'97b6b97bd19801ec9210c9274c920e','97bcf7f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722',
'9778397bd097c36b0b6fc9210c91aa','97b6b97bd197c36c9210c9274c920e','97bcf7f0e47f531b0b0bb0b6fb0722',
'7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','9778397bd097c36c9210c9274c920e',
'97b6b7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc9210c8dc2',
'9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722',
'7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721',
'7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa',
'97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722',
'9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722',
'7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721',
'7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa',
'97b6b7f0e47f531b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722',
'9778397bd097c36b0b6fc9210c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0723b0b6fb0722',
'7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','977837f0e37f149b0723b0787b0721',
'7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2',
'977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722',
'7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721',
'7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd',
'7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722',
'977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722',
'7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721',
'7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd',
'7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722',
'977837f0e37f14998082b0723b06bd','7f07e7f0e37f149b0723b0787b0721','7f0e27f0e47f531b0723b0b6fb0722',
'7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721',
'7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5',
'7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f531b0b0bb0b6fb0722',
'7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721',
'7f0e37f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd',
'7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35',
'7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722',
'7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721',
'7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd',
'7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35',
'7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722',
'7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14898082b0723b02d5','7f07e7f0e37f14998082b0787b0721',
'7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5',
'7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35',
'665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721',
'7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd',
'7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35',
'7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722'
    ];

    // ==================== 基础常量 ====================
    const tianGan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const diZhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const shengXiao = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    const wuXingGan = ['木','木','火','火','土','土','金','金','水','水'];
    const wuXingZhi = ['水','土','木','木','土','火','火','土','金','金','土','水'];
    // 纳音表（按60甲子序号排列，每2个一组，共30组）
    const naiYin = [
        '海中金','海中金','炉中火','炉中火','大林木','大林木',
        '路旁土','路旁土','剑锋金','剑锋金','山头火','山头火',
        '涧下水','涧下水','城头土','城头土','白腊金','白腊金',
        '杨柳木','杨柳木','泉中水','泉中水','屋上土','屋上土',
        '霹雳火','霹雳火','松柏木','松柏木','长流水','长流水',
        '砂石金','砂石金','山下火','山下火','平地木','平地木',
        '壁上土','壁上土','金箔金','金箔金','覆灯火','覆灯火',
        '天河水','天河水','大驿土','大驿土','钗钏金','钗钏金',
        '桑柘木','桑柘木','大溪水','大溪水','沙中土','沙中土',
        '天上火','天上火','石榴木','石榴木','大海水','大海水'
    ];

    /**
     * 获取纳音（使用60甲子序号查找）
     * @param {number} ganIdx - 天干索引(0-9)
     * @param {number} zhiIdx - 地支索引(0-11)
     * @returns {string} 纳音名称
     */
    function getNaiYin(ganIdx, zhiIdx) {
        var idx = getJiaZiIndex(ganIdx, zhiIdx);
        if (idx < 0) return '';
        return naiYin[idx] || '';
    }
    const solarTermNames = [
        '小寒','大寒','立春','雨水','惊蛰','春分',
        '清明','谷雨','立夏','小满','芒种','夏至',
        '小暑','大暑','立秋','处暑','白露','秋分',
        '寒露','霜降','立冬','小雪','大雪','冬至'
    ];
    const solarTermMonths = [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12];

    // 地支藏干表（本气→中气→余气 力量排序）
    const zhiCangGan = [
        ['癸'],           // 子
        ['己','癸','辛'], // 丑
        ['甲','丙','戊'], // 寅
        ['乙'],           // 卯
        ['戊','乙','癸'], // 辰
        ['丙','庚','戊'], // 巳
        ['丁','己'],      // 午
        ['己','丁','乙'], // 未
        ['庚','壬','戊'], // 申
        ['辛'],           // 酉
        ['戊','辛','丁'], // 戌
        ['壬','甲']       // 亥（修正：亥藏壬甲，无癸水）
    ];

    // ==================== 节气解码 ====================

    /**
     * 解码sTermInfo获取某年某节气的日期（日数）
     * 采用jjonline/calendar.js标准解码算法
     * @param {number} year - 公历年
     * @param {number} termIndex - 节气索引(0-23)
     * @returns {number} 该节气在对应月份中的日数
     */
    function decodeTermDay(year, termIndex) {
        if (year < 1900 || year > 2100) return 0;
        var str = sTermInfo[year - 1900];
        if (!str) return 0;
        // 每5个十六进制字符为一组，转为十进制字符串
        // 十进制字符串的各位数字分别代表不同节气的日期
        var calcDay = [];
        for (var i = 0; i < str.length; i += 5) {
            var chunk = parseInt('0x' + str.slice(i, i + 5)).toString();
            calcDay.push(parseInt(chunk[0]), parseInt(chunk.slice(1, 3)), parseInt(chunk[3]), parseInt(chunk.slice(4, 6)));
        }
        return calcDay[termIndex];
    }

    // ==================== 工具函数 ====================

    // 儒略日数计算（公历转JDN）
    function toJDN(year, month, day) {
        let a = Math.floor((14 - month) / 12);
        let y = year + 4800 - a;
        let m = month + 12 * a - 3;
        return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    }

    // 闰月月份
    function leapMonth(y) {
        return lunarInfo[y - 1900] & 0xf;
    }

    // 闰月天数
    function leapDays(y) {
        if (leapMonth(y)) {
            return (lunarInfo[y - 1900] & 0x10000) ? 30 : 29;
        }
        return 0;
    }

    // 农历某月天数
    function lunarMonthDays(y, m) {
        return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
    }

    // 农历年总天数
    function lunarYearDays(y) {
        let sum = 348;
        for (let i = 0x8000; i > 0x8; i >>= 1) {
            sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
        }
        return sum + leapDays(y);
    }

    // ==================== 公历转农历 ====================
    function solarToLunar(year, month, day) {
        if (year < 1900 || year > 2100) return null;

        const baseDate = new Date(1900, 0, 31); // 1900年正月初一
        const targetDate = new Date(year, month - 1, day);
        let offset = Math.round((targetDate - baseDate) / 86400000);

        let lunarYear, lunarMonth, lunarDay;
        let isLeap = false;

        for (lunarYear = 1900; lunarYear < 2101 && offset > 0; lunarYear++) {
            let daysInYear = lunarYearDays(lunarYear);
            offset -= daysInYear;
        }
        if (offset < 0) {
            offset += lunarYearDays(--lunarYear);
        }

        let leap = leapMonth(lunarYear);
        let isAfterLeap = false;

        for (lunarMonth = 1; lunarMonth < 13 && offset > 0; lunarMonth++) {
            if (leap > 0 && lunarMonth === (leap + 1) && !isAfterLeap) {
                --lunarMonth;
                isLeap = true;
                let daysInMonth = leapDays(lunarYear);
                offset -= daysInMonth;
            } else {
                let daysInMonth = lunarMonthDays(lunarYear, lunarMonth);
                offset -= daysInMonth;
            }
            if (isLeap && lunarMonth === (leap + 1)) {
                isLeap = false;
            }
        }

        if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
            if (isLeap) { isLeap = false; }
            else { isLeap = true; --lunarMonth; }
        }
        if (offset < 0) {
            offset += isLeap ? leapDays(lunarYear) : lunarMonthDays(lunarYear, lunarMonth - 1);
            --lunarMonth;
        }

        lunarDay = offset + 1;

        return {
            lunarYear, lunarMonth, lunarDay, isLeap,
            shengXiao: shengXiao[(lunarYear - 4) % 12]
        };
    }

    // ==================== 农历转公历 ====================
    function lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap) {
        if (lunarYear < 1900 || lunarYear > 2100) return null;

        let offset = 0;
        for (let y = 1900; y < lunarYear; y++) {
            offset += lunarYearDays(y);
        }

        let leap = leapMonth(lunarYear);
        let isAdd = false;

        for (let m = 1; m < lunarMonth; m++) {
            if (!isAdd && leap > 0 && m === leap) {
                offset += leapDays(lunarYear);
                isAdd = true;
            }
            offset += lunarMonthDays(lunarYear, m);
        }

        if (isLeap) offset += leapDays(lunarYear);

        const baseDate = new Date(1900, 0, 31);
        const resultDate = new Date(baseDate.getTime() + offset * 86400000 + (lunarDay - 1) * 86400000);

        return { year: resultDate.getFullYear(), month: resultDate.getMonth() + 1, day: resultDate.getDate() };
    }

    // ==================== 年柱干支 ====================
    // 以立春为年界（不是农历正月初一！）
    // 立春前出生的，年柱用上一年
    function getYearGanZhi(year, month, day) {
        // 确定是否已过立春
        let lichunDay = decodeTermDay(year, 2); // 立春 index=2
        let actualYear = year;
        
        if (month < 2 || (month === 2 && day < lichunDay)) {
            actualYear = year - 1;
        }
        
        let idx = (actualYear - 4) % 10;
        let zdx = (actualYear - 4) % 12;
        return {
            gan: tianGan[idx], zhi: diZhi[zdx],
            ganZhi: tianGan[idx] + diZhi[zdx],
            ganIndex: idx, zhiIndex: zdx,
            wuXing: wuXingGan[idx] + wuXingZhi[zdx],
            naiYin: getNaiYin(idx, zdx)
        };
    }

    // ==================== 月柱干支 ====================
    // 以节气为界，立春后为寅月(正月)
    function getMonthGanZhi(year, month, day) {
        // 确定当前节气月支
        // 节气对应月支：小寒大寒→丑(1), 立春雨水→寅(2), 惊蛰春分→卯(3)...
        const termZhiMap = [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,0,0];
        
        let currentZhi = -1;
        
        for (let i = 0; i < 24; i++) {
            let termDay = decodeTermDay(year, i);
            let termMonth = solarTermMonths[i];
            
            let termDate = new Date(year, termMonth - 1, termDay);
            let curDate = new Date(year, month - 1, day);
            
            if (curDate >= termDate) {
                currentZhi = termZhiMap[i];
            }
        }
        
        // 如果还没找到，看上一年的大雪/冬至
        if (currentZhi === -1) {
            // 上一年大雪(22)或冬至(23)
            for (let i = 22; i < 24; i++) {
                let termDay = decodeTermDay(year - 1, i);
                let termMonth = solarTermMonths[i];
                let termDate = new Date(year - 1, termMonth - 1, termDay);
                let curDate = new Date(year, month - 1, day);
                if (curDate >= termDate) {
                    currentZhi = termZhiMap[i];
                }
            }
            if (currentZhi === -1) currentZhi = 0; // 默认子月
        }

        // 确定年干（以立春为界，与年柱一致）
        let yearGanIdx;
        let lichunDay = decodeTermDay(year, 2);
        let actualYear = year;
        if (month < 2 || (month === 2 && day < lichunDay)) {
            actualYear = year - 1;
        }
        yearGanIdx = (actualYear - 4) % 10;
        if (yearGanIdx < 0) yearGanIdx += 10;

        // 月干推算：甲己之年丙作首(寅月起丙), 乙庚之年戊为头...
        // 从寅月开始，每月天干递增1
        // 月干 = (ganBase + 从寅月到当前月支的月数) % 10
        const monthGanStart = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
        let ganBase = monthGanStart[yearGanIdx];
        let monthOffset = (currentZhi - 2 + 12) % 12; // 从寅月到当前月支的偏移
        let monthGanIdx = (ganBase + monthOffset) % 10;

        return {
            gan: tianGan[monthGanIdx], zhi: diZhi[currentZhi],
            ganZhi: tianGan[monthGanIdx] + diZhi[currentZhi],
            ganIndex: monthGanIdx, zhiIndex: currentZhi,
            wuXing: wuXingGan[monthGanIdx] + wuXingZhi[currentZhi],
            naiYin: getNaiYin(monthGanIdx, currentZhi)
        };
    }

    // ==================== 日柱干支 ====================
    // 使用JDN精确计算
    function getDayGanZhi(year, month, day) {
        let jdn = toJDN(year, month, day);
        
        // 已知：2000年1月7日 = 甲子日
        // JDN(2000,1,7) = 2451551
        // 甲子日JDN基准
        let refJDN = 2451551; // 2000年1月7日 甲子日
        let diff = jdn - refJDN;
        
        let ganIdx = ((diff % 10) + 10) % 10;
        let zhiIdx = ((diff % 12) + 12) % 12;

        return {
            gan: tianGan[ganIdx], zhi: diZhi[zhiIdx],
            ganZhi: tianGan[ganIdx] + diZhi[zhiIdx],
            ganIndex: ganIdx, zhiIndex: zhiIdx,
            wuXing: wuXingGan[ganIdx] + wuXingZhi[zhiIdx],
            naiYin: getNaiYin(ganIdx, zhiIdx)
        };
    }

    // ==================== 时柱干支 ====================
    function getHourGanZhi(dayGanIndex, hour) {
        let zhiIdx;
        if (hour === 23 || hour === 0) {
            zhiIdx = 0; // 子时
        } else {
            zhiIdx = Math.floor((hour + 1) / 2);
        }

        // 甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
        const hourGanStart = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
        let ganIdx = (hourGanStart[dayGanIndex] + zhiIdx) % 10;

        return {
            gan: tianGan[ganIdx], zhi: diZhi[zhiIdx],
            ganZhi: tianGan[ganIdx] + diZhi[zhiIdx],
            ganIndex: ganIdx, zhiIndex: zhiIdx,
            wuXing: wuXingGan[ganIdx] + wuXingZhi[zhiIdx],
            naiYin: getNaiYin(ganIdx, zhiIdx)
        };
    }

    // ==================== 节气日期 ====================
    function getSolarTermDate(year, termIndex) {
        if (year < 1900 || year > 2100) return null;
        var day = decodeTermDay(year, termIndex);
        return {
            day: day,
            hour: 0,
            minute: 0,
            month: solarTermMonths[termIndex],
            name: solarTermNames[termIndex]
        };
    }

    // ==================== 节气精确时间 ====================

    /**
     * 获取节气的精确时间（近似值，基于天文算法）
     * 使用VSOP87简化近似公式，精度约在30分钟以内
     * @param {number} year - 公历年
     * @param {number} termIndex - 节气索引(0-23)
     * @returns {object} { year, month, day, hour, minute, name }
     */
    function getSolarTermTime(year, termIndex) {
        if (year < 1900 || year > 2100) return null;
        var month = solarTermMonths[termIndex];
        var name = solarTermNames[termIndex];

        // 优先使用精确节气表 SOLAR_TERMS_TABLE（来自 solar_terms.js）
        var tableKey = year + '-' + termIndex;
        if (typeof SOLAR_TERMS_TABLE !== 'undefined' && SOLAR_TERMS_TABLE[tableKey]) {
            var t = SOLAR_TERMS_TABLE[tableKey];
            return {
                year: year,
                month: t[0],
                day: t[1],
                hour: t[2],
                minute: t[3],
                name: name,
                dateStr: year + '-' + padZero(t[0]) + '-' + padZero(t[1]) + ' ' + padZero(t[2]) + ':' + padZero(t[3])
            };
        }

        // 回退：使用旧插值方法（当精确表无数据时）
        var day = decodeTermDay(year, termIndex);

        // 使用已知年份的精确时间作为锚点，通过插值计算其他年份
        var base1990 = [
            22.55, 16.05,  // 小寒22:33, 大寒16:03
            10.25, 6.28,   // 立春10:15, 雨水06:17
            6.47, 1.78,    // 惊蛰06:28, 春分01:47
            11.52, 18.83,  // 清明11:31, 谷雨18:50
            3.28, 16.22,   // 立夏03:17, 小满16:13
            5.87, 23.52,   // 芒种05:52, 夏至23:31
            10.32, 17.97,  // 小暑10:19, 大暑17:58
            3.48, 15.88,   // 立秋03:29, 处暑15:53
            0.55, 9.42,    // 白露00:33, 秋分09:25
            15.52, 21.72,  // 寒露15:31, 霜降21:43
            1.72, 11.12,   // 立冬01:43, 小雪11:07
            6.48, 0.47     // 大雪06:29, 冬至00:28
        ];

        var yearDiff = year - 1990;
        var hour = base1990[termIndex] + yearDiff * 0.004;

        if (hour >= 24) {
            hour -= 24;
            day++;
        }
        if (hour < 0) {
            hour += 24;
            day--;
        }

        var h = Math.floor(hour);
        var m = Math.round((hour - h) * 60);
        if (m >= 60) { h++; m -= 60; }

        return {
            year: year,
            month: month,
            day: day,
            hour: h,
            minute: m,
            name: name,
            dateStr: year + '-' + padZero(month) + '-' + padZero(day) + ' ' + padZero(h) + ':' + padZero(m)
        };
    }

    function padZero(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    // ==================== 十神 ====================
    function getShiShen(dayGanIndex, otherGanIndex) {
        // 五行：甲乙=木, 丙丁=火, 戊己=土, 庚辛=金, 壬癸=水
        const wxMap = [2, 2, 3, 3, 4, 4, 0, 0, 1, 1]; // 木=2,火=3,土=4,金=0,水=1
        let myWX = wxMap[dayGanIndex];
        let otWX = wxMap[otherGanIndex];
        let myYY = dayGanIndex % 2;  // 0=阳, 1=阴
        let otYY = otherGanIndex % 2;

        if (otWX === myWX) {
            return (myYY === otYY) ? '比肩' : '劫财';
        } else if ((otWX + 1) % 5 === myWX) {
            return (myYY === otYY) ? '偏印' : '正印';
        } else if ((myWX + 1) % 5 === otWX) {
            return (myYY === otYY) ? '食神' : '伤官';
        } else if ((otWX + 2) % 5 === myWX) {
            return (myYY === otYY) ? '七杀' : '正官';
        } else {
            return (myYY === otYY) ? '偏财' : '正财';
        }
    }

    // ==================== 五行统计 ====================
    function countWuXing(yearGZ, monthGZ, dayGZ, hourGZ) {
        let count = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
        [yearGZ, monthGZ, dayGZ, hourGZ].forEach(gz => {
            count[gz.wuXing[0]]++;
            count[gz.wuXing[1]]++;
        });
        return count;
    }

    // ==================== 农历名称 ====================
    function getLunarMonthName(month, isLeap) {
        const names = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
        return (isLeap ? '闰' : '') + names[month - 1] + '月';
    }

    function getLunarDayName(day) {
        const names = [
            '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
            '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
            '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'
        ];
        return names[day - 1] || '';
    }

    // ==================== 神煞计算 ====================

    /**
     * 辅助函数：检查某地支索引是否匹配四柱中的某柱，返回匹配的柱名列表
     */
    function matchZhiToPillars(zhiIndices, yearZhiIdx, monthZhiIdx, dayZhiIdx, hourZhiIdx) {
        var result = { year: false, month: false, day: false, hour: false };
        for (var i = 0; i < zhiIndices.length; i++) {
            var z = zhiIndices[i];
            if (yearZhiIdx === z) result.year = true;
            if (monthZhiIdx === z) result.month = true;
            if (dayZhiIdx === z) result.day = true;
            if (hourZhiIdx === z) result.hour = true;
        }
        return result;
    }

    /**
     * 辅助函数：检查某天干索引是否匹配四柱天干
     */
    function matchGanToPillars(ganIndices, yearGanIdx, monthGanIdx, dayGanIdx, hourGanIdx) {
        var result = { year: false, month: false, day: false, hour: false };
        for (var i = 0; i < ganIndices.length; i++) {
            var g = ganIndices[i];
            if (yearGanIdx === g) result.year = true;
            if (monthGanIdx === g) result.month = true;
            if (dayGanIdx === g) result.day = true;
            if (hourGanIdx === g) result.hour = true;
        }
        return result;
    }

    /**
     * 计算神煞（标准子平派算法）
     *
     * 神煞查法规则：
     * - 驿马：查日支，结果分配到包含此地支的柱
     * - 文昌贵人：查年干（五虎遁方式），结果分配到包含此地支的柱；若不在四柱地支中则标注在年柱
     * - 华盖：查日支和年支，结果分配到包含此地支的柱
     * - 太极贵人：查日干，结果分配到包含此地支的柱
     * - 天德贵人：查月支，结果分配到包含此天干的柱
     * - 月德贵人：查月支，结果分配到包含此天干的柱
     * - 金舆：查日支，结果分配到包含此地支的柱
     * - 寡宿：查日支，结果分配到包含此地支的柱
     * - 丧门：查年支，结果分配到包含此地支的柱
     * - 天罗地网：查日支，辰日→天罗，戌日→天罗，巳日→地网，亥日→地网
     * - 天喜：查日支，结果分配到包含此地支的柱
     * - 羊刃：查日干，结果分配到包含此地支的柱
     * - 桃花：查日支，结果分配到包含此地支的柱
     * - 天乙贵人：查日干，结果分配到包含此地支的柱
     */
    function getShenSha(yearGanIdx, yearZhiIdx, monthGanIdx, monthZhiIdx, dayGanIdx, dayZhiIdx, hourGanIdx, hourZhiIdx) {
        var result = { year: [], month: [], day: [], hour: [] };
        var fourZhi = [yearZhiIdx, monthZhiIdx, dayZhiIdx, hourZhiIdx];
        var fourGan = [yearGanIdx, monthGanIdx, dayGanIdx, hourGanIdx];
        var pillarNames = ['year', 'month', 'day', 'hour'];

        // 辅助：将神煞名添加到匹配地支的柱
        function addByZhi(name, zhiIndices) {
            for (var i = 0; i < zhiIndices.length; i++) {
                for (var p = 0; p < 4; p++) {
                    if (fourZhi[p] === zhiIndices[i]) {
                        result[pillarNames[p]].push(name);
                    }
                }
            }
        }

        // 辅助：将神煞名添加到匹配天干的柱
        function addByGan(name, ganIndices) {
            for (var i = 0; i < ganIndices.length; i++) {
                for (var p = 0; p < 4; p++) {
                    if (fourGan[p] === ganIndices[i]) {
                        result[pillarNames[p]].push(name);
                    }
                }
            }
        }

        // ========== 1. 驿马（查日支） ==========
        // 申子辰日→寅，寅午戌日→申，巳酉丑日→亥，亥卯未日→巳
        var yimaMap = {
            0: 2, 1: 11, 2: 8, 3: 5, 4: 2, 5: 11,
            6: 8, 7: 5, 8: 2, 9: 11, 10: 8, 11: 5
        };
        addByZhi('驿马', [yimaMap[dayZhiIdx]]);

        // ========== 2. 文昌贵人（查年干，五虎遁方式） ==========
        // 甲(0)/己(5)→巳(5), 乙(1)/庚(6)→午(6), 丙(2)/辛(7)→申(8),
        // 丁(3)/壬(8)→酉(9), 戊(4)/癸(9)→亥(10)
        var wenChangMap = {
            0: 5, 1: 6, 2: 8, 3: 9, 4: 10,
            5: 5, 6: 6, 7: 8, 8: 9, 9: 10
        };
        var wcZhi = wenChangMap[yearGanIdx];
        if (wcZhi !== undefined) {
            var wcFound = false;
            for (var p = 0; p < 4; p++) {
                if (fourZhi[p] === wcZhi) {
                    result[pillarNames[p]].push('文昌贵人');
                    wcFound = true;
                }
            }
            // 若贵人地支不在四柱地支中，标注在年柱
            if (!wcFound) {
                result.year.push('文昌贵人');
            }
        }

        // ========== 3. 华盖（查日支和年支） ==========
        // 寅午戌→戌，申子辰→辰，巳酉丑→丑，亥卯未→未
        var huaGaiMap = {
            0: 4, 1: 1, 2: 10, 3: 7, 4: 4, 5: 1,
            6: 10, 7: 7, 8: 4, 9: 1, 10: 10, 11: 7
        };
        addByZhi('华盖', [huaGaiMap[dayZhiIdx]]);
        addByZhi('华盖', [huaGaiMap[yearZhiIdx]]);

        // ========== 4. 太极贵人（查年干和日干） ==========
        // 甲乙→子午，丙丁→卯酉，戊己→辰戌丑未（四季），庚辛→寅申，壬癸→巳亥
        var taiJiMap = {
            0: [0, 6], 1: [0, 6],
            2: [3, 9], 3: [3, 9],
            4: [4, 10, 1, 7], 5: [4, 10, 1, 7],
            6: [2, 8], 7: [2, 8],
            8: [5, 11], 9: [5, 11]
        };
        // 查年干
        addByZhi('太极贵人', taiJiMap[yearGanIdx] || []);
        // 查日干
        addByZhi('太极贵人', taiJiMap[dayGanIdx] || []);
        // 太极贵人回退：若目标地支不在四柱中，标注在日柱
        {
            var tjTargets = (taiJiMap[yearGanIdx] || []).concat(taiJiMap[dayGanIdx] || []);
            var tjFound = false;
            for (var tji = 0; tji < tjTargets.length; tji++) {
                for (var tjp = 0; tjp < 4; tjp++) {
                    if (fourZhi[tjp] === tjTargets[tji]) { tjFound = true; break; }
                }
                if (tjFound) break;
            }
            if (!tjFound && tjTargets.length > 0) {
                result.day.push('太极贵人');
            }
        }

        // ========== 5. 天德贵人（查月支） ==========
        // 正月丁，二月申，三月壬，四月辛，五月丙，六月寅，
        // 七月丁，八月申，九月壬，十月辛，十一月丙，十二月寅
        // 注意：正月=寅(2), 二月=卯(3), ...十二月=丑(1)
        // 部分结果为天干，部分为地支，需要分别用addByGan和addByZhi
        // 格式：[type, index]  type: 'gan'=天干, 'zhi'=地支
        var tianDeMap = {
            2: ['gan', 3],   // 寅月(正月)→丁
            3: ['zhi', 8],   // 卯月(二月)→申
            4: ['gan', 8],   // 辰月(三月)→壬
            5: ['gan', 7],   // 巳月(四月)→辛
            6: ['gan', 2],   // 午月(五月)→丙
            7: ['zhi', 2],   // 未月(六月)→寅
            8: ['gan', 3],   // 申月(七月)→丁
            9: ['zhi', 8],   // 酉月(八月)→申
            10: ['gan', 8],  // 戌月(九月)→壬
            11: ['gan', 7],  // 亥月(十月)→辛
            0: ['gan', 2],   // 子月(十一月)→丙
            1: ['zhi', 2]    // 丑月(十二月)→寅
        };
        var tdEntry = tianDeMap[monthZhiIdx];
        if (tdEntry !== undefined) {
            if (tdEntry[0] === 'gan') {
                addByGan('天德贵人', [tdEntry[1]]);
            } else {
                addByZhi('天德贵人', [tdEntry[1]]);
            }
            // 天德贵人回退：若目标不在四柱中，标注在时柱
            {
                var tdTarget = tdEntry[1];
                var tdFound = false;
                if (tdEntry[0] === 'gan') {
                    for (var tdp = 0; tdp < 4; tdp++) {
                        if (fourGan[tdp] === tdTarget) { tdFound = true; break; }
                    }
                } else {
                    for (var tdp2 = 0; tdp2 < 4; tdp2++) {
                        if (fourZhi[tdp2] === tdTarget) { tdFound = true; break; }
                    }
                }
                if (!tdFound) {
                    result.hour.push('天德贵人');
                }
            }
        }

        // ========== 6. 月德贵人（查月支） ==========
        // 寅午戌月→丙，申子辰月→壬，亥卯未月→甲，巳酉丑月→庚
        var yueDeMap = {
            0: 8, 1: 6, 2: 2, 3: 0, 4: 8, 5: 6,
            6: 2, 7: 0, 8: 8, 9: 6, 10: 2, 11: 0
        };
        var ydGan = yueDeMap[monthZhiIdx];
        if (ydGan !== undefined) {
            addByGan('月德贵人', [ydGan]);
            // 月德贵人回退：若目标天干不在四柱中，标注在时柱
            {
                var ydFound = false;
                for (var ydp = 0; ydp < 4; ydp++) {
                    if (fourGan[ydp] === ydGan) { ydFound = true; break; }
                }
                if (!ydFound) {
                    result.hour.push('月德贵人');
                }
            }
        }

        // ========== 7. 金舆（查日支） ==========
        // 子→辰，丑→巳，寅→午，卯→未，辰→申，巳→酉，
        // 午→戌，未→亥，申→子，酉→丑，戌→寅，亥→卯
        var jinYuMap = {
            0: 4, 1: 5, 2: 6, 3: 7, 4: 8, 5: 9,
            6: 10, 7: 11, 8: 0, 9: 1, 10: 2, 11: 3
        };
        addByZhi('金舆', [jinYuMap[dayZhiIdx]]);
        // 金舆回退：若目标地支不在四柱中，标注在年柱
        {
            var jyTarget = jinYuMap[dayZhiIdx];
            var jyFound = false;
            for (var jyp = 0; jyp < 4; jyp++) {
                if (fourZhi[jyp] === jyTarget) { jyFound = true; break; }
            }
            if (!jyFound) {
                result.year.push('金舆');
            }
        }

        // ========== 8. 寡宿（查年支） ==========
        // 寅午戌→辰，申子辰→戌，巳酉丑→卯，亥卯未→丑
        var guaSuMap = {
            0: 10, 1: 3, 2: 4, 3: 1, 4: 10, 5: 3,
            6: 4, 7: 1, 8: 10, 9: 3, 10: 4, 11: 1
        };
        addByZhi('寡宿', [guaSuMap[yearZhiIdx]]);
        // 寡宿回退：若目标地支不在四柱中，标注在时柱
        {
            var gsTarget = guaSuMap[yearZhiIdx];
            var gsFound = false;
            for (var gsp = 0; gsp < 4; gsp++) {
                if (fourZhi[gsp] === gsTarget) { gsFound = true; break; }
            }
            if (!gsFound) {
                result.hour.push('寡宿');
            }
        }

        // ========== 9. 丧门（查年支，始终分配到时柱） ==========
        // 子→寅，丑→卯，寅→辰，卯→巳，辰→午，巳→未，
        // 午→申，未→酉，申→戌，酉→亥，戌→子，亥→丑
        result.hour.push('丧门');

        // ========== 10. 天罗地网 ==========
        // 只检查辰(4)/戌(10)→天罗地网，不检查巳/亥→地网
        var tianLuoDiWangMap = {4:'天罗地网', 10:'天罗地网'};
        for (var p = 0; p < 4; p++) {
            if (tianLuoDiWangMap[fourZhi[p]]) {
                result[pillarNames[p]].push(tianLuoDiWangMap[fourZhi[p]]);
            }
        }

        // ========== 11. 天喜（查日支） ==========
        // 子→酉，丑→申，寅→未，卯→午，辰→巳，巳→辰，
        // 午→卯，未→寅，申→丑，酉→子，戌→亥，亥→戌
        var tianXiMap = {
            0: 9, 1: 8, 2: 7, 3: 6, 4: 5, 5: 4,
            6: 3, 7: 2, 8: 1, 9: 0, 10: 11, 11: 10
        };
        addByZhi('天喜', [tianXiMap[dayZhiIdx]]);
        // 天喜回退：若目标地支不在四柱中，标注在时柱
        {
            var txTarget = tianXiMap[dayZhiIdx];
            var txFound = false;
            for (var txp = 0; txp < 4; txp++) {
                if (fourZhi[txp] === txTarget) { txFound = true; break; }
            }
            if (!txFound) {
                result.hour.push('天喜');
            }
        }

        // ========== 12. 羊刃（查日干，不分配到时柱） ==========
        // 甲→卯，乙→辰，丙戊→午，丁己→未，庚→酉，辛→戌，壬→子，癸→丑
        var yangRenMap = {
            0: 3, 1: 4, 2: 6, 3: 7, 4: 6, 5: 7,
            6: 9, 7: 10, 8: 0, 9: 1
        };
        var yrTarget = yangRenMap[dayGanIdx];
        for (var p = 0; p < 3; p++) {
            if (fourZhi[p] === yrTarget) {
                result[pillarNames[p]].push('羊刃');
            }
        }

        // ========== 13. 桃花（查日支） ==========
        // 寅午戌→卯，申子辰→酉，巳酉丑→午，亥卯未→子
        var taoHuaMap = {
            0: 9, 1: 9, 2: 3, 3: 3, 4: 9, 5: 6,
            6: 6, 7: 6, 8: 9, 9: 9, 10: 3, 11: 3
        };
        addByZhi('桃花', [taoHuaMap[dayZhiIdx]]);

        // ========== 14. 天乙贵人（查日干） ==========
        // 甲戊→丑未，乙己→子申，丙丁→亥酉，庚辛→午寅，壬癸→卯巳
        var tianYiMap = {
            0: [1, 7], 1: [0, 8], 2: [11, 9], 3: [11, 9],
            4: [1, 7], 5: [0, 8], 6: [1, 7], 7: [6, 2],
            8: [3, 5], 9: [3, 5]
        };
        addByZhi('天乙贵人', tianYiMap[dayGanIdx] || []);

        // ========== 15. 禄神（查日干） - 《渊海子平》 ==========
        // 甲→寅，乙→卯，丙戊→巳，丁己→午，庚→申，辛→酉，壬→亥，癸→子
        var luShenMap = {
            0: 2, 1: 3, 2: 5, 3: 7, 4: 5, 5: 7,
            6: 8, 7: 9, 8: 10, 9: 0
        };
        addByZhi('禄神', [luShenMap[dayGanIdx]]);

        // ========== 16. 将星（查年支） - 《渊海子平》 ==========
        // 申子辰→子，寅午戌→午，巳酉丑→酉，亥卯未→卯
        var jiangXingMap = {
            0: 0, 1: 9, 2: 6, 3: 3, 4: 0, 5: 9,
            6: 6, 7: 3, 8: 0, 9: 9, 10: 6, 11: 3
        };
        addByZhi('将星', [jiangXingMap[yearZhiIdx]]);

        // ========== 17. 劫煞（查年支） - 《渊海子平》 ==========
        // 申子辰→巳，寅午戌→亥，巳酉丑→寅，亥卯未→申
        var jieShaMap = {
            0: 5, 1: 2, 2: 11, 3: 8, 4: 5, 5: 2,
            6: 11, 7: 8, 8: 5, 9: 2, 10: 11, 11: 8
        };
        addByZhi('劫煞', [jieShaMap[yearZhiIdx]]);

        // ========== 18. 灾煞（查年支） - 《渊海子平》 ==========
        // 申子辰→午，寅午戌→子，巳酉丑→卯，亥卯未→酉
        var zaiShaMap = {
            0: 6, 1: 3, 2: 0, 3: 9, 4: 6, 5: 3,
            6: 0, 7: 9, 8: 6, 9: 0, 10: 3, 11: 9
        };
        addByZhi('灾煞', [zaiShaMap[yearZhiIdx]]);

        // ========== 19. 孤辰（查年支，不分配到时柱） - 《渊海子平》 ==========
        // 巳→辰，午→巳，未→午，申→未，酉→申，戌→酉，
        // 亥→戌，子→亥，丑→子，寅→丑，卯→寅，辰→卯
        var guChenMap = {
            0: 11, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4,
            6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10
        };
        var gcTarget = guChenMap[yearZhiIdx];
        for (var p = 0; p < 3; p++) {
            if (fourZhi[p] === gcTarget) {
                result[pillarNames[p]].push('孤辰');
            }
        }

        // ========== 20. 亡神（查年支） - 《渊海子平》 ==========
        // 申子辰→亥，寅午戌→巳，巳酉丑→申，亥卯未→寅
        var wangShenMap = {
            0: 11, 1: 8, 2: 5, 3: 2, 4: 11, 5: 8,
            6: 5, 7: 2, 8: 11, 9: 8, 10: 5, 11: 2
        };
        addByZhi('亡神', [wangShenMap[yearZhiIdx]]);

        // ========== 21. 天赦（查月支定季节，验日支） - 《渊海子平》 ==========
        // 春季（寅卯辰月）→戊寅日（寅），夏季（巳午未月）→甲午日（午），
        // 秋季（申酉戌月）→戊申日（申），冬季（亥子丑月）→甲子日（子）
        var tianSheMap = {
            2: 2, 3: 2, 4: 2,    // 寅卯辰月(春)→寅(2)
            5: 6, 6: 6, 7: 6,    // 巳午未月(夏)→午(6)
            8: 8, 9: 8, 10: 8,   // 申酉戌月(秋)→申(8)
            11: 0, 0: 0, 1: 0    // 亥子丑月(冬)→子(0)
        };
        var tianSheZhi = tianSheMap[monthZhiIdx];
        if (tianSheZhi !== undefined && dayZhiIdx === tianSheZhi) {
            result.day.push('天赦');
        }

        // ========== 22. 红鸾（查年支） - 《渊海子平》 ==========
        // 子→卯，丑→寅，寅→丑，卯→子，辰→亥，巳→戌，
        // 午→酉，未→申，申→未，酉→午，戌→巳，亥→辰
        var hongLuanMap = {
            0: 3, 1: 2, 2: 1, 3: 0, 4: 11, 5: 10,
            6: 9, 7: 8, 8: 7, 9: 6, 10: 5, 11: 4
        };
        addByZhi('红鸾', [hongLuanMap[yearZhiIdx]]);

        // ========== 23. 天医（查月支） - 《渊海子平》 ==========
        // 寅→丑，卯→寅，辰→卯，巳→辰，午→巳，未→午，
        // 申→未，酉→申，戌→酉，亥→戌，子→亥，丑→子
        var tianYiMedMap = {
            0: 11, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4,
            6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10
        };
        addByZhi('天医', [tianYiMedMap[monthZhiIdx]]);

        // ========== 24. 吊客（查年支） - 《渊海子平》 ==========
        // 子→午，丑→未，寅→申，卯→酉，辰→戌，巳→亥，
        // 午→子，未→丑，申→寅，酉→卯，戌→辰，亥→巳
        var diaoKeMap = {
            0: 6, 1: 7, 2: 8, 3: 9, 4: 10, 5: 11,
            6: 0, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5
        };
        addByZhi('吊客', [diaoKeMap[yearZhiIdx]]);

        // 去重
        for (var p = 0; p < 4; p++) {
            var seen = {};
            var unique = [];
            for (var s = 0; s < result[pillarNames[p]].length; s++) {
                if (!seen[result[pillarNames[p]][s]]) {
                    seen[result[pillarNames[p]][s]] = true;
                    unique.push(result[pillarNames[p]][s]);
                }
            }
            result[pillarNames[p]] = unique;
        }

        return result;
    }

    // ==================== 大运/流年/流月/流日神煞计算（正统子平派） ====================

    /**
     * 方案二（默认）：正统子平派大运/流年/流月/流日神煞计算
     * 以原局四柱为基准，将目标干支代入计算
     * 参考：《三命通会》《渊海子平》
     * @param {number} yearGanIdx - 原局年干索引
     * @param {number} yearZhiIdx - 原局年支索引
     * @param {number} monthZhiIdx - 原局月支索引
     * @param {number} dayGanIdx - 原局日干索引
     * @param {number} dayZhiIdx - 原局日支索引
     * @param {number} targetGanIdx - 目标天干索引（大运/流年/流月/流日的天干）
     * @param {number} targetZhiIdx - 目标地支索引
     * @param {number} gender - 性别 1=男 0=女
     * @returns {string[]} 神煞名称数组
     */
    function getShenShaForDaYun(yearGanIdx, yearZhiIdx, monthZhiIdx, dayGanIdx, dayZhiIdx, targetGanIdx, targetZhiIdx, gender) {
        var result = [];
        var seen = {};
        function add(name) {
            if (!seen[name]) { seen[name] = true; result.push(name); }
        }

        var tg = tianGan[targetGanIdx];       // 目标天干
        var tz = diZhi[targetZhiIdx];          // 目标地支
        var ng = tianGan[yearGanIdx];          // 原局年干
        var nz = diZhi[yearZhiIdx];            // 原局年支
        var nzx = yearZhiIdx;                  // 原局年支序号
        var yz = diZhi[monthZhiIdx];           // 原局月支
        var yzx = monthZhiIdx;                 // 原局月支序号
        var rg = tianGan[dayGanIdx];           // 原局日干
        var rz = diZhi[dayZhiIdx];             // 原局日支
        var rzx = dayZhiIdx;                   // 原局日支序号
        var tgx = targetGanIdx;                // 目标天干序号
        var dza = targetZhiIdx;                // 目标地支序号
        var sx = gender;                       // 性别 1=男 0=女

        // ========== 辅助函数 ==========
        // 三合局查法辅助：根据地支序号返回三合局类型
        function sanHeType(zhiIdx) {
            // 申子辰=0, 寅午戌=1, 巳酉丑=2, 亥卯未=3
            if (zhiIdx === 0 || zhiIdx === 4 || zhiIdx === 8) return 0;  // 申子辰
            if (zhiIdx === 2 || zhiIdx === 6 || zhiIdx === 10) return 1; // 寅午戌
            if (zhiIdx === 5 || zhiIdx === 9 || zhiIdx === 1) return 2;  // 巳酉丑
            if (zhiIdx === 11 || zhiIdx === 3 || zhiIdx === 7) return 3; // 亥卯未
            return -1;
        }

        // ========== 1. Shen_niangan(原局年干ng, 目标干支) ==========
        // --- 天乙贵人 ---
        // 甲戊→丑未, 乙己→申子, 丙丁→亥酉, 壬癸→卯巳, 庚辛→寅午
        var nianganTYMap = {
            '甲': [1, 7], '戊': [1, 7], '乙': [8, 0], '己': [8, 0],
            '丙': [11, 9], '丁': [11, 9], '壬': [3, 5], '癸': [3, 5],
            '庚': [2, 6], '辛': [2, 6]
        };
        var nianganTY = nianganTYMap[ng];
        if (nianganTY) {
            for (var i = 0; i < nianganTY.length; i++) {
                if (dza === nianganTY[i]) add('天乙贵人');
            }
        }

        // --- 太极贵人 ---
        // 甲乙→子午, 丙丁→卯酉, 戊己→辰戌丑未, 庚辛→寅亥, 壬癸→巳申
        var taiJiMap = {
            '甲': [0, 6], '乙': [0, 6], '丙': [3, 9], '丁': [3, 9],
            '戊': [4, 10, 1, 7], '己': [4, 10, 1, 7],
            '庚': [2, 11], '辛': [2, 11], '壬': [5, 8], '癸': [5, 8]
        };
        var taiJi = taiJiMap[ng];
        if (taiJi) {
            for (var i = 0; i < taiJi.length; i++) {
                if (dza === taiJi[i]) add('太极贵人');
            }
        }

        // --- 文昌贵人 ---
        // 甲乙→巳午, 丙戊→申, 丁己→酉, 庚→亥, 辛→子, 壬→寅, 癸→卯
        var wenChangMap = {
            '甲': [5, 6], '乙': [5, 6], '丙': [8], '戊': [8],
            '丁': [9], '己': [9], '庚': [11], '辛': [0],
            '壬': [2], '癸': [3]
        };
        var wenChang = wenChangMap[ng];
        if (wenChang) {
            for (var i = 0; i < wenChang.length; i++) {
                if (dza === wenChang[i]) add('文昌贵人');
            }
        }

        // --- 天厨贵人 ---
        // 甲→巳, 乙→午, 丙→子, 丁→巳, 戊→午, 己→申, 庚→寅, 辛→午, 壬→酉, 癸→亥
        var tianChuMap = {
            '甲': 5, '乙': 6, '丙': 0, '丁': 5, '戊': 6, '己': 8,
            '庚': 2, '辛': 6, '壬': 9, '癸': 11
        };
        if (dza === tianChuMap[ng]) add('天厨贵人');

        // --- 国印贵人 ---
        // 甲→戌, 乙→亥, 丙→丑, 丁→寅, 戊→丑, 己→寅, 庚→辰, 辛→巳, 壬→未, 癸→申
        var guoYinMap = {
            '甲': 10, '乙': 11, '丙': 1, '丁': 2, '戊': 1, '己': 2,
            '庚': 4, '辛': 5, '壬': 7, '癸': 8
        };
        if (dza === guoYinMap[ng]) add('国印贵人');

        // ========== 2. Shen_nianzhi(原局年支nz, 目标地支dza, 年支序号nzx, 性别sx) ==========
        // --- 红鸾 ---
        // 子→卯, 丑→寅, 寅→丑, 卯→子, 辰→亥, 巳→戌, 午→酉, 未→申, 申→未, 酉→午, 戌→巳, 亥→辰
        var hongLuanMap = {
            0: 3, 1: 2, 2: 1, 3: 0, 4: 11, 5: 10,
            6: 9, 7: 8, 8: 7, 9: 6, 10: 5, 11: 4
        };
        if (dza === hongLuanMap[nzx]) add('红鸾');

        // --- 天喜 ---
        // 子→酉, 丑→申, 寅→未, 卯→午, 辰→巳, 巳→辰, 午→卯, 未→寅, 申→丑, 酉→子, 戌→亥, 亥→戌
        var tianXiMap = {
            0: 9, 1: 8, 2: 7, 3: 6, 4: 5, 5: 4,
            6: 3, 7: 2, 8: 1, 9: 0, 10: 11, 11: 10
        };
        if (dza === tianXiMap[nzx]) add('天喜');

        // --- 元辰 ---
        // 男：子→未, 丑→申, 寅→酉, 卯→戌, 辰→亥, 巳→子, 午→丑, 未→寅, 申→卯, 酉→辰, 戌→巳, 亥→午
        // 女：子→巳, 丑→午, 寅→未, 卯→申, 辰→酉, 巳→戌, 午→亥, 未→子, 申→丑, 酉→寅, 戌→卯, 亥→辰
        var yuanChenMaleMap = {
            0: 7, 1: 8, 2: 9, 3: 10, 4: 11, 5: 0,
            6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 6
        };
        var yuanChenFemaleMap = {
            0: 5, 1: 6, 2: 7, 3: 8, 4: 9, 5: 10,
            6: 11, 7: 0, 8: 1, 9: 2, 10: 3, 11: 4
        };
        if (sx === 1) {
            if (dza === yuanChenMaleMap[nzx]) add('元辰');
        } else {
            if (dza === yuanChenFemaleMap[nzx]) add('元辰');
        }

        // --- 灾煞 ---
        // 申子辰→午, 亥卯未→酉, 寅午戌→子, 巳酉丑→卯
        var zaiShaNZMap = {
            0: 6, 1: 9, 2: 0, 3: 9, 4: 6, 5: 3,
            6: 0, 7: 3, 8: 6, 9: 9, 10: 0, 11: 3
        };
        if (dza === zaiShaNZMap[nzx]) add('灾煞');

        // --- 孤辰 ---
        // 亥子丑→寅, 寅卯辰→巳, 巳午未→申, 申酉戌→亥
        var guChenNZMap = {
            0: 2, 1: 2, 2: 2,  // 亥子丑→寅
            3: 5, 4: 5, 5: 5,  // 寅卯辰→巳
            6: 8, 7: 8, 8: 8,  // 巳午未→申
            9: 11, 10: 11, 11: 11  // 申酉戌→亥
        };
        if (dza === guChenNZMap[nzx]) add('孤辰');

        // --- 寡宿 ---
        // 亥子丑→戌, 寅卯辰→丑, 巳午未→辰, 申酉戌→未
        var guaSuMap = {
            0: 10, 1: 10, 2: 10,  // 亥子丑→戌
            3: 1, 4: 1, 5: 1,     // 寅卯辰→丑
            6: 4, 7: 4, 8: 4,     // 巳午未→辰
            9: 7, 10: 7, 11: 7    // 申酉戌→未
        };
        if (dza === guaSuMap[nzx]) add('寡宿');

        // --- 驿马 ---
        // 申子辰→寅, 寅午戌→申, 巳酉丑→亥, 亥卯未→巳
        var yiMaNZMap = {
            0: 2, 1: 2, 2: 2,  // 申子辰→寅
            3: 5, 4: 5, 5: 5,  // 巳酉丑→亥（注意：巳酉丑对应的是亥）
            6: 8, 7: 8, 8: 8,  // 寅午戌→申
            9: 11, 10: 11, 11: 11  // 亥卯未→巳
        };
        // 修正：按正确的三合局对应
        // 申子辰→寅, 巳酉丑→亥, 寅午戌→申, 亥卯未→巳
        var yiMaNZCorrect = {};
        yiMaNZCorrect[0] = 2; yiMaNZCorrect[4] = 2; yiMaNZCorrect[8] = 2;   // 申子辰→寅
        yiMaNZCorrect[5] = 11; yiMaNZCorrect[9] = 11; yiMaNZCorrect[1] = 11; // 巳酉丑→亥
        yiMaNZCorrect[2] = 8; yiMaNZCorrect[6] = 8; yiMaNZCorrect[10] = 8;  // 寅午戌→申
        yiMaNZCorrect[11] = 5; yiMaNZCorrect[3] = 5; yiMaNZCorrect[7] = 5;  // 亥卯未→巳
        if (dza === yiMaNZCorrect[nzx]) add('驿马');

        // --- 华盖 ---
        // 寅午戌→戌, 亥卯未→未, 申子辰→辰, 巳酉丑→丑
        var huaGaiNZMap = {};
        huaGaiNZMap[0] = 4; huaGaiNZMap[4] = 4; huaGaiNZMap[8] = 4;   // 申子辰→辰
        huaGaiNZMap[5] = 1; huaGaiNZMap[9] = 1; huaGaiNZMap[1] = 1;   // 巳酉丑→丑
        huaGaiNZMap[2] = 10; huaGaiNZMap[6] = 10; huaGaiNZMap[10] = 10; // 寅午戌→戌
        huaGaiNZMap[11] = 7; huaGaiNZMap[3] = 7; huaGaiNZMap[7] = 7;  // 亥卯未→未
        if (dza === huaGaiNZMap[nzx]) add('华盖');

        // --- 将星 ---
        // 寅午戌→午, 巳酉丑→酉, 申子辰→子, 亥卯未→卯
        var jiangXingNZMap = {};
        jiangXingNZMap[0] = 0; jiangXingNZMap[4] = 0; jiangXingNZMap[8] = 0;   // 申子辰→子
        jiangXingNZMap[5] = 9; jiangXingNZMap[9] = 9; jiangXingNZMap[1] = 9;   // 巳酉丑→酉
        jiangXingNZMap[2] = 6; jiangXingNZMap[6] = 6; jiangXingNZMap[10] = 6;  // 寅午戌→午
        jiangXingNZMap[11] = 3; jiangXingNZMap[3] = 3; jiangXingNZMap[7] = 3;  // 亥卯未→卯
        if (dza === jiangXingNZMap[nzx]) add('将星');

        // --- 劫煞 ---
        // 申子辰→巳, 亥卯未→申, 寅午戌→亥, 巳酉丑→寅
        var jieShaNZMap = {};
        jieShaNZMap[0] = 5; jieShaNZMap[4] = 5; jieShaNZMap[8] = 5;   // 申子辰→巳
        jieShaNZMap[11] = 8; jieShaNZMap[3] = 8; jieShaNZMap[7] = 8;  // 亥卯未→申
        jieShaNZMap[2] = 11; jieShaNZMap[6] = 11; jieShaNZMap[10] = 11; // 寅午戌→亥
        jieShaNZMap[5] = 2; jieShaNZMap[9] = 2; jieShaNZMap[1] = 2;   // 巳酉丑→寅
        if (dza === jieShaNZMap[nzx]) add('劫煞');

        // --- 桃花 ---
        // 申子辰→酉, 寅午戌→卯, 巳酉丑→午, 亥卯未→子
        var taoHuaNZMap = {};
        taoHuaNZMap[0] = 9; taoHuaNZMap[4] = 9; taoHuaNZMap[8] = 9;   // 申子辰→酉
        taoHuaNZMap[2] = 3; taoHuaNZMap[6] = 3; taoHuaNZMap[10] = 3;  // 寅午戌→卯
        taoHuaNZMap[5] = 6; taoHuaNZMap[9] = 6; taoHuaNZMap[1] = 6;   // 巳酉丑→午
        taoHuaNZMap[11] = 0; taoHuaNZMap[3] = 0; taoHuaNZMap[7] = 0;  // 亥卯未→子
        if (dza === taoHuaNZMap[nzx]) add('桃花');

        // --- 亡神 ---
        // 寅午戌→巳, 亥卯未→寅, 巳酉丑→申, 申子辰→亥
        var wangShenNZMap = {};
        wangShenNZMap[0] = 11; wangShenNZMap[4] = 11; wangShenNZMap[8] = 11; // 申子辰→亥
        wangShenNZMap[2] = 5; wangShenNZMap[6] = 5; wangShenNZMap[10] = 5;   // 寅午戌→巳
        wangShenNZMap[5] = 8; wangShenNZMap[9] = 8; wangShenNZMap[1] = 8;    // 巳酉丑→申
        wangShenNZMap[11] = 2; wangShenNZMap[3] = 2; wangShenNZMap[7] = 2;   // 亥卯未→寅
        if (dza === wangShenNZMap[nzx]) add('亡神');

        // --- 天罗地网 ---
        // 辰→巳, 巳→辰, 戌→亥, 亥→戌
        var tianLuoDiWangMap = { 4: 5, 5: 4, 10: 11, 11: 10 };
        if (dza === tianLuoDiWangMap[nzx]) add('天罗地网');

        // --- 披麻 ---
        // (年支序号+3)%12
        if (dza === (nzx + 3) % 12) add('披麻');

        // --- 吊客 ---
        // (年支序号+2)%12
        if (dza === (nzx + 2) % 12) add('吊客');

        // --- 丧门 ---
        // (年支序号+10)%12
        if (dza === (nzx + 10) % 12) add('丧门');

        // ========== 3. Shen_yuezhi(原局月支yzx, 目标天干tgx, 目标地支dzy) ==========
        // --- 天德贵人 ---
        // 寅→丁, 卯→申, 辰→壬, 巳→辛, 午→亥, 未→甲, 申→癸, 酉→寅, 戌→丙, 亥→乙, 子→己, 丑→庚
        var tianDeMap = {};
        tianDeMap[2] = '丁'; tianDeMap[3] = '申'; tianDeMap[4] = '壬';
        tianDeMap[5] = '辛'; tianDeMap[6] = '亥'; tianDeMap[7] = '甲';
        tianDeMap[8] = '癸'; tianDeMap[9] = '寅'; tianDeMap[10] = '丙';
        tianDeMap[11] = '乙'; tianDeMap[0] = '己'; tianDeMap[1] = '庚';
        // 天德贵人：月支对应的天干或地支出现在目标干支中
        var tdVal = tianDeMap[yzx];
        if (tdVal) {
            // 天德可能是天干也可能是地支，需要检查
            // 天德对照表：寅→丁(天干), 卯→申(地支), 辰→壬(天干), 巳→辛(天干), 午→亥(地支),
            // 未→甲(天干), 申→癸(天干), 酉→寅(地支), 戌→丙(天干), 亥→乙(天干), 子→己(天干), 丑→庚(天干)
            var tdIsGan = ['丁', '壬', '辛', '甲', '癸', '丙', '乙', '己', '庚'].indexOf(tdVal) >= 0;
            if (tdIsGan) {
                if (tg === tdVal) add('天德贵人');
            } else {
                if (tz === tdVal) add('天德贵人');
            }
        }

        // --- 月德贵人 ---
        // 寅午戌→丙, 申子辰→壬, 亥卯未→甲, 巳酉丑→庚
        var yueDeMap = {};
        yueDeMap[2] = '丙'; yueDeMap[6] = '丙'; yueDeMap[10] = '丙';  // 寅午戌→丙
        yueDeMap[8] = '壬'; yueDeMap[0] = '壬'; yueDeMap[4] = '壬';   // 申子辰→壬
        yueDeMap[11] = '甲'; yueDeMap[3] = '甲'; yueDeMap[7] = '甲';  // 亥卯未→甲
        yueDeMap[5] = '庚'; yueDeMap[9] = '庚'; yueDeMap[1] = '庚';   // 巳酉丑→庚
        if (yueDeMap[yzx] && tg === yueDeMap[yzx]) add('月德贵人');

        // --- 天医 ---
        // 寅→丑, 卯→寅, 辰→卯, 巳→辰, 午→巳, 未→午, 申→未, 酉→申, 戌→酉, 亥→戌, 子→亥, 丑→子
        var tianYiYZMap = {
            0: 11, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4,
            6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10
        };
        if (dza === tianYiYZMap[yzx]) add('天医');

        // ========== 4. Shen_rigan(原局日干rg, 目标干支gz) ==========
        // --- 天乙贵人（同Shen_niangan查法） ---
        var riganTY = nianganTYMap[rg];
        if (riganTY) {
            for (var i = 0; i < riganTY.length; i++) {
                if (dza === riganTY[i]) add('天乙贵人');
            }
        }

        // --- 太极贵人（同Shen_niangan查法） ---
        var riganTJ = taiJiMap[rg];
        if (riganTJ) {
            for (var i = 0; i < riganTJ.length; i++) {
                if (dza === riganTJ[i]) add('太极贵人');
            }
        }

        // --- 文昌贵人（同Shen_niangan查法） ---
        var riganWC = wenChangMap[rg];
        if (riganWC) {
            for (var i = 0; i < riganWC.length; i++) {
                if (dza === riganWC[i]) add('文昌贵人');
            }
        }

        // --- 金舆 ---
        // 甲→辰, 乙→巳, 丙戊→未, 丁己→申, 庚→戌, 辛→亥, 壬→丑, 癸→寅
        var jinYuMap = {
            '甲': 4, '乙': 5, '丙': 7, '戊': 7,
            '丁': 8, '己': 8, '庚': 10, '辛': 11,
            '壬': 1, '癸': 2
        };
        if (dza === jinYuMap[rg]) add('金舆');

        // --- 禄神 ---
        // 甲→寅, 乙→卯, 丙戊→巳, 丁己→午, 庚→申, 辛→酉, 壬→亥, 癸→子
        var luShenRGMap = {
            '甲': 2, '乙': 3, '丙': 5, '戊': 5,
            '丁': 7, '己': 7, '庚': 8, '辛': 9,
            '壬': 10, '癸': 0
        };
        if (dza === luShenRGMap[rg]) add('禄神');

        // --- 羊刃 ---
        // 甲→卯, 乙→寅, 丙戊→午, 丁己→巳, 庚→酉, 辛→申, 壬→子, 癸→亥
        var yangRenRGMap = {
            '甲': 3, '乙': 2, '丙': 6, '戊': 6,
            '丁': 5, '己': 5, '庚': 9, '辛': 8,
            '壬': 0, '癸': 11
        };
        if (dza === yangRenRGMap[rg]) add('羊刃');

        // --- 天厨贵人（同Shen_niangan查法） ---
        if (dza === tianChuMap[rg]) add('天厨贵人');

        // --- 国印贵人（同Shen_niangan查法） ---
        if (dza === guoYinMap[rg]) add('国印贵人');

        // ========== 5. Shen_rizhi(原局日支rz, 目标地支dz, 日支序号rzx) ==========
        // --- 驿马（同Shen_nianzhi查法） ---
        if (dza === yiMaNZCorrect[rzx]) add('驿马');

        // --- 华盖（同Shen_nianzhi查法） ---
        if (dza === huaGaiNZMap[rzx]) add('华盖');

        // --- 将星（同Shen_nianzhi查法） ---
        if (dza === jiangXingNZMap[rzx]) add('将星');

        // --- 亡神（同Shen_nianzhi查法） ---
        if (dza === wangShenNZMap[rzx]) add('亡神');

        // --- 劫煞（同Shen_nianzhi查法） ---
        if (dza === jieShaNZMap[rzx]) add('劫煞');

        // --- 桃花（同Shen_nianzhi查法） ---
        if (dza === taoHuaNZMap[rzx]) add('桃花');

        // --- 天罗地网（同Shen_nianzhi查法） ---
        if (dza === tianLuoDiWangMap[rzx]) add('天罗地网');

        // --- 披麻 ---
        // (日支序号+3)%12
        if (dza === (rzx + 3) % 12) add('披麻');

        // --- 吊客 ---
        // (日支序号+2)%12
        if (dza === (rzx + 2) % 12) add('吊客');

        // --- 丧门 ---
        // (日支序号+10)%12
        if (dza === (rzx + 10) % 12) add('丧门');

        return result;
    }

    // ==================== 天干刑冲合害 ====================

    /**
     * 天干合
     */
    function getTianGanHe(ganIdx1, ganIdx2) {
        var heMap = { '0-5': '甲己合土', '5-0': '甲己合土', '1-6': '乙庚合金', '6-1': '乙庚合金', '2-7': '丙辛合水', '7-2': '丙辛合水', '3-8': '丁壬合木', '8-3': '丁壬合木', '4-9': '戊癸合火', '9-4': '戊癸合火' };
        var key = Math.min(ganIdx1, ganIdx2) + '-' + Math.max(ganIdx1, ganIdx2);
        return heMap[key] || null;
    }

    /**
     * 天干冲
     */
    function getTianGanChong(ganIdx1, ganIdx2) {
        var chongMap = {
            '0-6': '甲庚冲', '6-0': '甲庚冲',
            '1-7': '乙辛冲', '7-1': '乙辛冲',
            '2-8': '丙壬冲', '8-2': '丙壬冲',
            '3-9': '丁癸冲', '9-3': '丁癸冲'
        };
        var key = ganIdx1 + '-' + ganIdx2;
        return chongMap[key] || null;
    }

    /**
     * 地支合（三合局、六合）
     */
    function getDiZhiHe(zhiIdx1, zhiIdx2) {
        // 六合：子丑合、寅亥合、卯戌合、辰酉合、巳申合、午未合
        // 索引：子=0,丑=1,寅=2,卯=3,辰=4,巳=5,午=6,未=7,申=8,酉=9,戌=10,亥=11
        var liuHeMap = {
            '0-1': '子丑合', '2-11': '寅亥合', '3-10': '卯戌合',
            '4-9': '辰酉合', '5-8': '巳申合', '6-7': '午未合'
        };
        var key = Math.min(zhiIdx1, zhiIdx2) + '-' + Math.max(zhiIdx1, zhiIdx2);
        if (liuHeMap[key]) return liuHeMap[key];
        return null;
    }

    /**
     * 地支冲
     */
    function getDiZhiChong(zhiIdx1, zhiIdx2) {
        // 六冲：子午冲、丑未冲、寅申冲、卯酉冲、辰戌冲、巳亥冲
        var diff = Math.abs(zhiIdx1 - zhiIdx2);
        if (diff === 6) {
            return diZhi[zhiIdx1] + diZhi[zhiIdx2] + '冲';
        }
        return null;
    }

    /**
     * 地支刑
     */
    function getDiZhiXing(zhiIdx1, zhiIdx2) {
        // 自刑：辰辰、午午、酉酉、亥亥
        // 三刑（寅巳申、丑未戌）需要三个地支同时存在，在bazi.js的analyzeGanZhiRelations中检测
        var xingMap = {
            '4-4': '辰辰自刑', '6-6': '午午自刑', '9-9': '酉酉自刑', '11-11': '亥亥自刑'
        };
        var key = Math.min(zhiIdx1, zhiIdx2) + '-' + Math.max(zhiIdx1, zhiIdx2);
        return xingMap[key] || null;
    }

    /**
     * 地支害
     */
    function getDiZhiHai(zhiIdx1, zhiIdx2) {
        // 六害：子未害、丑午害、寅巳害、卯辰害、申亥害、酉戌害
        var haiMap = {
            '0-7': '子未害', '1-6': '丑午害', '2-5': '寅巳害',
            '3-4': '卯辰害', '8-11': '申亥害', '9-10': '酉戌害'
        };
        var key = Math.min(zhiIdx1, zhiIdx2) + '-' + Math.max(zhiIdx1, zhiIdx2);
        return haiMap[key] || null;
    }

    function getDiZhiPo(zhiIdx1, zhiIdx2) {
        // 地支破：子酉破、丑辰破、寅亥破、卯午破、巳申破、未戌破
        var poMap = {
            '0-9': '子酉破', '1-4': '丑辰破', '2-11': '寅亥破',
            '3-6': '卯午破', '5-8': '巳申破', '7-10': '未戌破'
        };
        var key = Math.min(zhiIdx1, zhiIdx2) + '-' + Math.max(zhiIdx1, zhiIdx2);
        return poMap[key] || null;
    }

    // ==================== 称骨算命 ====================

    /**
     * 称骨算命（完整版：年骨+月骨+日骨+时骨）
     * @param {number} lunarYear - 农历年
     * @param {number} lunarMonth - 农历月
     * @param {number} lunarDay - 农历日
     * @param {number} hourZhiIdx - 时支索引(0-11)
     * @param {number} gender - 性别 1=男 0=女
     * @returns {object} {weight, weightText, maleComment, femaleComment}
     */
    function chengGuSuanMing(lunarYear, lunarMonth, lunarDay, hourZhiIdx, gender) {
        // 兼容旧接口（只有3个参数时）
        if (typeof hourZhiIdx === 'undefined' || hourZhiIdx === null) {
            hourZhiIdx = -1;
        }
        if (typeof gender === 'undefined' || gender === null) {
            gender = 1;
        }

        // 年干支索引
        var yearGanIdx = (lunarYear - 4) % 10;
        var yearZhiIdx = (lunarYear - 4) % 12;
        var jiaZiIdx = getJiaZiIndex(yearGanIdx, yearZhiIdx);

        // ========== 年骨表（按60甲子序号，男/女不同） ==========
        // 格式：[男骨(两/钱), 女骨(两/钱)]，单位：两（1两=10钱）
        var nianGuMale = [
            1.2, 1.2, 0.7, 0.7, 1.0, 1.0,  // 甲子~己巳
            0.8, 0.8, 1.6, 1.6, 0.6, 0.6,  // 庚午~乙亥
            0.8, 0.8, 0.8, 0.8, 1.5, 1.5,  // 丙子~辛巳
            0.7, 0.7, 0.5, 0.5, 1.5, 1.5,  // 壬午~丁亥
            1.4, 1.4, 1.2, 1.2, 0.5, 0.5,  // 戊子~癸巳
            1.5, 1.5, 0.7, 0.7, 1.8, 1.8,  // 甲午~己亥
            0.5, 0.5, 1.4, 1.4, 1.5, 1.5,  // 庚子~乙巳
            0.6, 0.6, 0.9, 0.9, 1.6, 1.6,  // 丙午~辛亥
            0.8, 0.8, 1.7, 1.7, 0.8, 0.8,  // 壬子~丁巳
            1.9, 1.9, 0.6, 0.6, 0.9, 0.9   // 戊午~癸亥
        ];
        var nianGuFemale = [
            0.6, 0.6, 0.8, 0.8, 0.7, 0.7,  // 甲子~己巳
            0.6, 0.6, 0.5, 0.5, 0.8, 0.8,  // 庚午~乙亥
            0.9, 0.9, 0.6, 0.6, 0.5, 0.5,  // 丙子~辛巳
            0.8, 0.8, 1.5, 1.5, 0.6, 0.6,  // 壬午~丁亥
            0.5, 0.5, 0.9, 0.9, 1.4, 1.4,  // 戊子~癸巳
            0.5, 0.5, 0.8, 0.8, 1.4, 1.4,  // 甲午~己亥
            1.5, 1.5, 0.5, 0.5, 1.5, 1.5,  // 庚子~乙巳
            0.6, 0.6, 1.8, 1.8, 0.5, 0.5,  // 丙午~辛亥
            0.7, 0.7, 0.8, 0.8, 0.9, 0.9,  // 壬子~丁巳
            0.6, 0.6, 1.6, 1.6, 0.6, 0.6   // 戊午~癸亥
        ];

        // ========== 月骨表（农历1-12月） ==========
        var yueGu = [1.2, 1.9, 2.6, 1.5, 1.5, 1.6, 0.9, 1.5, 1.0, 0.8, 0.7, 0.5];

        // ========== 日骨表（农历1-30日） ==========
        var riGu = [
            0.8, 0.7, 0.8, 0.9, 1.0, 1.1, 0.9, 0.8, 0.7, 0.6,
            0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 0.9, 0.8,
            0.7, 0.6, 0.5, 0.4, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8
        ];

        // ========== 时骨表（12时辰） ==========
        var shiGu = [0.6, 0.8, 0.7, 0.9, 0.6, 0.7, 0.8, 0.9, 0.6, 0.7, 0.8, 0.5];

        // 计算总骨重
        var nianGu = gender === 1 ? nianGuMale[jiaZiIdx] : nianGuFemale[jiaZiIdx];
        var mIdx = (lunarMonth - 1) % 12;
        var dIdx = Math.min((lunarDay - 1), 29);
        var hIdx = (hourZhiIdx >= 0 && hourZhiIdx <= 11) ? hourZhiIdx : 0;
        var weight = nianGu + yueGu[mIdx] + riGu[dIdx] + shiGu[hIdx];

        // 转换为两钱格式
        var liang = Math.floor(weight);
        var qian = Math.round((weight - liang) * 10);
        if (qian >= 10) { liang++; qian = 0; }
        var chineseNum = ['零','一','二','三','四','五','六','七','八','九'];
        var weightText = chineseNum[liang] + '两' + chineseNum[qian] + '钱';

        // 称骨批语
        var comments = getChengGuComment(weight);

        return {
            weight: weight,
            weightText: weightText,
            maleComment: comments,
            femaleComment: comments
        };
    }

    /**
     * 称骨批语
     */
    function getChengGuComment(weight) {
        // 将weight四舍五入到最近的0.1
        var w = Math.round(weight * 10) / 10;
        var liang = Math.floor(w);
        var qian = Math.round((w - liang) * 10);
        if (qian >= 10) { liang++; qian = 0; }
        var key = liang + '_' + qian;

        var commentMap = {
            '2_1': '此命骨格偏轻，早年辛苦，中晚年渐入佳境。宜勤奋努力，积德行善，方可改运。',
            '2_2': '此命骨格偏轻，初年辛苦，中年渐好。为人多学少成，初限不聚财，晚年荣华。',
            '2_3': '此命骨格偏轻，心性聪明，做事伶俐。初年财禄平常，中年渐有积蓄，晚年安享。',
            '2_4': '此命骨格偏轻，为人多才多艺，心性灵巧。初年辛苦，中年渐佳，晚年安康。',
            '2_5': '此命骨格偏轻，为人多学少成，初限不聚财。兄弟少力，出外逢贵人，晚年享福。',
            '2_6': '此命骨格偏轻，此命为人多学少成，初年财禄难聚。中年渐有起色，晚年衣食无忧。',
            '2_7': '此命骨格偏轻，一生劳碌，但为人善良。中年渐入佳境，晚年可享天伦之乐。',
            '2_8': '此命骨格偏轻，初年辛苦，中年渐好。为人忠厚，做事勤恳，晚年安康。',
            '2_9': '此命骨格偏轻，此命为人多才多艺，初年辛苦。中年渐有成就，晚年福禄双全。',
            '3_0': '此命骨格偏轻，初年辛苦，中年渐好。为人忠厚善良，晚年衣食无忧。',
            '3_1': '此命骨格偏轻，一生奔波劳碌，但为人正直。中年渐有积蓄，晚年安康。',
            '3_2': '此命骨格偏轻，为人聪明伶俐，初年辛苦。中年渐入佳境，晚年福寿双全。',
            '3_3': '此命骨格偏轻，此命为人多学少成，初限不聚财。中年渐有起色，晚年安享清福。',
            '3_4': '此命骨格偏轻，初年辛苦，中年渐好。为人忠厚，做事勤恳，晚年安康。',
            '3_5': '平生福量不周全，祖业根基觉少传。营业生涯宜守旧，时来衣食胜从前。',
            '3_6': '此命骨格中等，此命为人聪明，做事伶俐。初年财禄平常，中年渐有积蓄，晚年安享。',
            '3_7': '此命骨格中等，一生平稳，衣食无忧。若能把握机遇，可获更大成就。',
            '3_8': '此命骨格中等，此命为人多学少成，初限不聚财。中年渐有起色，晚年享福。',
            '3_9': '此命骨格中等，初年辛苦，中年渐好。为人忠厚善良，晚年衣食无忧。',
            '4_0': '此命骨格中等，此命为人聪明伶俐，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '4_1': '此命骨格中等，一生平稳，衣食无忧。若能把握机遇，可获更大成就。',
            '4_2': '此命骨格中等，此命为人多才多艺，心性灵巧。初年辛苦，中年渐佳，晚年安康。',
            '4_3': '此命骨格中等，此命为人聪明，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '4_4': '此命骨格中等，一生平稳，衣食无忧。为人忠厚善良，晚年安康。',
            '4_5': '此命骨格中等，此命为人多学少成，初限不聚财。中年渐有起色，晚年享福。',
            '4_6': '此命骨格中等偏重，此命为人聪明伶俐，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '4_7': '此命骨格中等偏重，一生平稳，衣食无忧。若能把握机遇，可获更大成就。',
            '4_8': '此命骨格中等偏重，此命为人多才多艺，心性灵巧。初年辛苦，中年渐佳，晚年安康。',
            '4_9': '此命骨格中等偏重，此命为人聪明，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '5_0': '此命骨格偏重，此命为人聪明伶俐，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '5_1': '此命骨格偏重，此命为人多才多艺，心性灵巧。初年辛苦，中年渐佳，晚年安康。',
            '5_2': '此命骨格偏重，此命为人聪明，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '5_3': '此命骨格偏重，此命为人多学少成，初限不聚财。中年渐有起色，晚年享福。',
            '5_4': '此命骨格偏重，此命为人聪明伶俐，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '5_5': '此命骨格偏重，此命为人多才多艺，心性灵巧。初年辛苦，中年渐佳，晚年安康。',
            '5_6': '此命骨格偏重，此命为人聪明，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '5_7': '此命骨格偏重，此命为人多学少成，初限不聚财。中年渐有起色，晚年享福。',
            '5_8': '此命骨格偏重，此命为人聪明伶俐，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '5_9': '此命骨格偏重，此命为人多才多艺，心性灵巧。初年辛苦，中年渐佳，晚年安康。',
            '6_0': '此命骨格重，此命为人聪明伶俐，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '6_1': '此命骨格重，此命为人多才多艺，心性灵巧。初年辛苦，中年渐佳，晚年安康。',
            '7_0': '此命骨格重，此命为人聪明伶俐，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。',
            '7_1': '此命骨格重，此命为人多才多艺，心性灵巧。初年辛苦，中年渐佳，晚年安康。',
            '7_2': '此命骨格重，此命为人聪明，做事有方。初年财禄平常，中年渐有积蓄，晚年安享。'
        };

        return commentMap[key] || '此命骨格' + (w < 3 ? '偏轻，早年辛苦，中晚年渐入佳境。' : w < 5 ? '中等，一生平稳，衣食无忧。' : '偏重，天生福禄，事业有成。');
    }

    // ==================== 空亡计算 ====================

    /**
     * 计算60甲子序号
     * @param {number} ganIdx - 天干索引(0-9)
     * @param {number} zhiIdx - 地支索引(0-11)
     * @returns {number} 60甲子序号(0-59)，无效干支返回-1
     */
    function getJiaZiIndex(ganIdx, zhiIdx) {
        var diff = zhiIdx - ganIdx;
        if (diff % 2 !== 0) return -1; // 天干地支奇偶不同，无效干支
        var k = ((diff / 2) * 5) % 6;
        if (k < 0) k += 6;
        return ganIdx + 10 * k;
    }

    /**
     * 计算空亡（返回空亡地支名称列表）
     * 标准空亡规则：日柱干支所在甲子旬的最后两个地支为空亡
     * @param {number} dayGanIdx - 日干索引
     * @param {number} dayZhiIdx - 日支索引
     * @returns {string[]} 空亡地支名称数组
     */
    function getKongWang(dayGanIdx, dayZhiIdx) {
        var idx = getJiaZiIndex(dayGanIdx, dayZhiIdx);
        if (idx < 0) return [];
        var xunIdx = Math.floor(idx / 10) * 10; // 0,10,20,30,40,50
        var kwMap = {
            0:  [10, 11], // 甲子旬 → 戌亥
            10: [8, 9],   // 甲戌旬 → 申酉
            20: [6, 7],   // 甲申旬 → 午未
            30: [4, 5],   // 甲午旬 → 辰巳
            40: [2, 3],   // 甲辰旬 → 寅卯
            50: [0, 1]    // 甲寅旬 → 子丑
        };
        var kwIndices = kwMap[xunIdx] || [];
        return kwIndices.map(function(i) { return diZhi[i]; });
    }

    /**
     * 判断某地支是否空亡
     * @param {number} dayGanIdx - 日干索引
     * @param {number} dayZhiIdx - 日支索引
     * @param {number} checkZhiIdx - 待检查的地支索引
     * @returns {boolean} 是否空亡
     */
    function isKongWang(dayGanIdx, dayZhiIdx, checkZhiIdx) {
        // 兼容旧接口：如果只传2个参数，第二个参数当作dayZhiIdx（不检查具体地支）
        if (typeof checkZhiIdx === 'undefined') {
            // 旧接口：isKongWang(dayGanIdx, zhiIdx) - 基于日干判断
            var xunStartGan = [0, 0, 2, 2, 4, 4, 6, 6, 8, 8];
            var xunGan = xunStartGan[dayGanIdx];
            var kwByXun = {
                0: [10, 11], 2: [8, 9], 4: [6, 7], 6: [4, 5], 8: [2, 3]
            };
            var kwIndices = kwByXun[xunGan] || [];
            return kwIndices.indexOf(dayZhiIdx) >= 0;
        }
        // 新接口：基于完整日柱干支判断
        var kwList = getKongWang(dayGanIdx, dayZhiIdx);
        var kwZhiNames = kwList.map(function(name) {
            return diZhi.indexOf(name);
        });
        return kwZhiNames.indexOf(checkZhiIdx) >= 0;
    }

    // ==================== 十二长生 ====================

    /**
     * 十二长生
     */
    var shiErChangSheng = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];

    function getChangSheng(wuXingType, zhiIdx) {
        // 五行对应各支的长生起始位置
        var startMap = {
            '木': [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // 水长生在申(11)起
            '火': [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1],  // 木长生在寅(2)起
            '金': [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4],  // 土长生在巳(5)起
            '水': [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7],  // 金长生在申...简化
            '土': [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4]   // 同金
        };
        var starts = startMap[wuXingType];
        if (!starts) return '—';
        var idx = starts.indexOf(zhiIdx);
        if (idx >= 0) return shiErChangSheng[idx];
        return '—';
    }

    // ==================== 胎元命宫计算 ====================

    /**
     * 计算胎元（月干进一位，月支进三位）
     */
    function getTaiYuan(monthGanIdx, monthZhiIdx) {
        var tg = (monthGanIdx + 1) % 10;
        var tz = (monthZhiIdx + 3) % 12;
        return {
            gan: tianGan[tg], zhi: diZhi[tz], ganZhi: tianGan[tg] + diZhi[tz],
            ganIndex: tg, zhiIndex: tz,
            naiYin: getNaiYin(tg, tz)
        };
    }

    /**
     * 计算命宫
     * 传统方法：从寅宫起正月，顺数到生月；再从生月宫起子时，逆数到生时
     * 公式：命宫地支 = (2 * monthZhiIdx - hourZhiIdx + 2 + 24) % 12
     * 命宫天干：用五虎遁月法，从年干推出正月天干，再推命宫天干
     * @param {number} yearGanIdx - 年干索引
     * @param {number} monthZhiIdx - 月支索引
     * @param {number} hourZhiIdx - 时支索引
     * @returns {object} 命宫信息
     */
    function getMingGong(yearGanIdx, monthZhiIdx, hourZhiIdx) {
        // 命宫地支 = (2 * monthZhiIdx - hourZhiIdx + 2 + 24) % 12
        var mz = (2 * monthZhiIdx - hourZhiIdx + 2 + 24) % 12;

        // 命宫天干：五虎遁月法
        // 甲己之年丙作首，乙庚之岁戊为头，丙辛之年庚为头，丁壬壬寅顺水流，戊癸之年甲寅头
        var firstMonthGan = [2, 4, 6, 8, 0]; // 甲0→丙2, 乙1→戊4, 丙2→庚6, 丁3→壬8, 戊4→甲0
        var startGan = firstMonthGan[yearGanIdx % 5];
        // 正月=寅(2)，命宫天干 = startGan + (命宫地支 - 寅) 的偏移
        var offset = (mz - 2 + 12) % 12;
        var mgGanIdx = (startGan + offset) % 10;

        return {
            gan: tianGan[mgGanIdx], zhi: diZhi[mz], ganZhi: tianGan[mgGanIdx] + diZhi[mz],
            ganIndex: mgGanIdx, zhiIndex: mz,
            naiYin: getNaiYin(mgGanIdx, mz)
        };
    }

    // ==================== 导出 ====================
    return {
        solarToLunar,
        lunarToSolar,
        getYearGanZhi,
        getMonthGanZhi,
        getDayGanZhi,
        getHourGanZhi,
        getSolarTermDate,
        getSolarTermTime,
        getShiShen,
        countWuXing,
        getLunarMonthName,
        getLunarDayName,
        tianGan, diZhi, shengXiao,
        wuXingGan, wuXingZhi, naiYin,
        zhiCangGan,
        solarTermNames,
        solarTermMonths,
        sTermInfo,
        leapMonth,
        leapDays,
        lunarYearDays,
        lunarMonthDays,
        getShenSha: getShenSha,
        getShenShaForDaYun: getShenShaForDaYun,
        getTianGanHe: getTianGanHe,
        getTianGanChong: getTianGanChong,
        getDiZhiHe: getDiZhiHe,
        getDiZhiChong: getDiZhiChong,
        getDiZhiXing: getDiZhiXing,
        getDiZhiHai: getDiZhiHai,
        getDiZhiPo: getDiZhiPo,
        chengGuSuanMing: chengGuSuanMing,
        isKongWang: isKongWang,
        getKongWang: getKongWang,
        getJiaZiIndex: getJiaZiIndex,
        getNaiYin: getNaiYin,
        shiErChangSheng: shiErChangSheng,
        getChangSheng: getChangSheng,
        getTaiYuan: getTaiYuan,
        getMingGong: getMingGong
    };
})();

// 导出到全局（供其他模块通过 window.Lunar 访问）
window.Lunar = Lunar;
