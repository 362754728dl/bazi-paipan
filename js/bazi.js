/**
 * 八字排盘引擎 - bazi.js
 * 依赖：lunar.js（万年历核心）
 * 功能：四柱八字排盘、藏干、十神、大运、五行统计
 * 校验标准：1990年1月30日08:50 → 己巳 丁丑 乙未 庚辰
 */

const Bazi = (function() {
    'use strict';

    // ==================== 完整排盘 ====================
    /**
     * 生成完整八字排盘
     * @param {number} year - 公历年
     * @param {number} month - 公历月
     * @param {number} day - 公历日
     * @param {number} hour - 时(0-23)
     * @param {number} minute - 分(0-59)
     * @param {number} gender - 性别 1=男 0=女
     * @param {number} longitude - 经度(可选，用于真太阳时)
     * @returns {object} 完整排盘结果
     */
    function generate(year, month, day, hour, minute, gender, longitude) {
        let lunar = Lunar.solarToLunar(year, month, day);
        if (!lunar) return null;

        // 确定实际使用的时辰
        let actualHour = hour;
        let actualMinute = minute;
        let trueSolarTime = null;

        if (longitude !== undefined && longitude !== null) {
            trueSolarTime = SolarTime.getTrueSolarTime(year, month, day, hour, minute, longitude);
            actualHour = trueSolarTime.trueHour;
            actualMinute = trueSolarTime.trueMinute;
        }

        // 处理跨日
        let adjYear = year, adjMonth = month, adjDay = day;
        if (actualHour >= 24) {
            let nextDate = new Date(year, month - 1, day + 1);
            adjYear = nextDate.getFullYear();
            adjMonth = nextDate.getMonth() + 1;
            adjDay = nextDate.getDate();
            actualHour = actualHour - 24;
        }
        if (actualHour < 0) {
            let prevDate = new Date(year, month - 1, day - 1);
            adjYear = prevDate.getFullYear();
            adjMonth = prevDate.getMonth() + 1;
            adjDay = prevDate.getDate();
            actualHour = actualHour + 24;
        }

        // 四柱干支（使用真太阳时或北京时间）
        let yearGZ = Lunar.getYearGanZhi(adjYear, adjMonth, adjDay, actualHour, actualMinute);
        let monthGZ = Lunar.getMonthGanZhi(adjYear, adjMonth, adjDay, actualHour, actualMinute);
        let dayGZ = Lunar.getDayGanZhi(adjYear, adjMonth, adjDay);
        let hourGZ = Lunar.getHourGanZhi(dayGZ.ganIndex, Math.floor(actualHour));

        let pillars = buildPillars(yearGZ, monthGZ, dayGZ, hourGZ, dayGZ.ganIndex);
        let wuXingCount = Lunar.countWuXing(yearGZ, monthGZ, dayGZ, hourGZ);
        let daYun = calculateDaYun(yearGZ, monthGZ, dayGZ, adjYear, adjMonth, adjDay, gender, actualHour, actualMinute);

        // 神煞计算
        let shenSha = Lunar.getShenSha(
            yearGZ.ganIndex, yearGZ.zhiIndex,
            monthGZ.ganIndex, monthGZ.zhiIndex,
            dayGZ.ganIndex, dayGZ.zhiIndex,
            hourGZ.ganIndex, hourGZ.zhiIndex
        );

        // 干支关系分析（天干合冲、地支合冲刑害）
        let ganZhiRelations = analyzeGanZhiRelations(yearGZ, monthGZ, dayGZ, hourGZ);

        // 空亡信息（每柱基于自身干支所在旬的空亡）
        let kongWang = {
            year: Lunar.getKongWang(yearGZ.ganIndex, yearGZ.zhiIndex),
            month: Lunar.getKongWang(monthGZ.ganIndex, monthGZ.zhiIndex),
            day: Lunar.getKongWang(dayGZ.ganIndex, dayGZ.zhiIndex),
            hour: Lunar.getKongWang(hourGZ.ganIndex, hourGZ.zhiIndex)
        };

        // 十二长生（日主五行在各柱地支上的状态）
        let dayGanWuXing = Lunar.wuXingGan[dayGZ.ganIndex];
        let changSheng = {
            year: Lunar.getChangSheng(dayGanWuXing, yearGZ.zhiIndex),
            month: Lunar.getChangSheng(dayGanWuXing, monthGZ.zhiIndex),
            day: Lunar.getChangSheng(dayGanWuXing, dayGZ.zhiIndex),
            hour: Lunar.getChangSheng(dayGanWuXing, hourGZ.zhiIndex)
        };

        // 胎元
        let taiYuan = Lunar.getTaiYuan(monthGZ.ganIndex, monthGZ.zhiIndex);

        // 命宫
        let mingGong = Lunar.getMingGong(yearGZ.ganIndex, monthGZ.zhiIndex, hourGZ.zhiIndex);

        // 称骨算命
        let chengGu = Lunar.chengGuSuanMing(lunar.lunarYear, lunar.lunarMonth, lunar.lunarDay, hourGZ.zhiIndex, gender);

        // 北京时间盘（用于对比，仅当有经度时才生成）
        let beijingPillars = null;
        if (longitude !== undefined && longitude !== null) {
            let bjHourGZ = Lunar.getHourGanZhi(dayGZ.ganIndex, hour); // 使用原始北京时间
            beijingPillars = buildPillars(yearGZ, monthGZ, dayGZ, bjHourGZ, dayGZ.ganIndex);
        }

        // 节气精确时间信息
        let xiaohanTime = Lunar.getSolarTermTime(adjYear, 0);
        let lichunTime = Lunar.getSolarTermTime(adjYear, 2);
        let solarTermInfo = {
            xiaohan: xiaohanTime ? xiaohanTime.dateStr : '',
            lichun: lichunTime ? lichunTime.dateStr : ''
        };

        // 起运信息
        let qiYun = '';
        let jiaoYun = '';
        let huanYun = '';
        if (daYun && daYun.startAge) {
            let sa = daYun.startAge;
            qiYun = '命主于出生后' + sa.years + '年' + sa.months + '个月' + sa.days + '天' + sa.hours + '小时起运';
            // 交运日期 = 出生日期 + 起运年月日时分（逐年月日分别累加，避免跨月溢出）
            var jiaoYunDate = new Date(adjYear, adjMonth - 1, adjDay, actualHour || 0, actualMinute || 0);
            jiaoYunDate.setFullYear(jiaoYunDate.getFullYear() + sa.years);
            jiaoYunDate.setMonth(jiaoYunDate.getMonth() + sa.months);
            jiaoYunDate.setDate(jiaoYunDate.getDate() + sa.days);
            jiaoYunDate.setHours(jiaoYunDate.getHours() + sa.hours);
            let jyYear = jiaoYunDate.getFullYear();
            let jyMonth = jiaoYunDate.getMonth() + 1;
            let jyDay = jiaoYunDate.getDate();
            let jyHour = jiaoYunDate.getHours();
            let jyMinute = jiaoYunDate.getMinutes();
            jiaoYun = '命主于公历' + jyYear + '年' + (jyMonth < 10 ? '0' : '') + jyMonth + '月' + (jyDay < 10 ? '0' : '') + jyDay + '日' + (jyHour < 10 ? '0' : '') + jyHour + '时' + (jyMinute < 10 ? '0' : '') + jyMinute + '分交运';
            huanYun = '以后每逢尾数带8的年份换运';
        }

        return {
            solarDate: { year, month, day, hour, minute },
            lunarDate: {
                year: lunar.lunarYear, month: lunar.lunarMonth, day: lunar.lunarDay,
                isLeap: lunar.isLeap,
                monthName: Lunar.getLunarMonthName(lunar.lunarMonth, lunar.isLeap),
                dayName: Lunar.getLunarDayName(lunar.lunarDay),
                shengXiao: Lunar.shengXiao[yearGZ.zhiIndex]
            },
            gender: gender === 1 ? '男' : '女',
            pillars: pillars,
            wuXing: wuXingCount,
            daYun: daYun,
            shenSha: shenSha,
            ganZhiRelations: ganZhiRelations,
            kongWang: kongWang,
            changSheng: changSheng,
            taiYuan: taiYuan,
            mingGong: mingGong,
            chengGu: chengGu,
            trueSolarTime: trueSolarTime,
            liuNian: calculateLiuNian(adjYear, dayGZ.ganIndex, 88),
            liuYue: calculateLiuYue(adjYear, dayGZ.ganIndex),
            xiaoYun: calculateXiaoYun(yearGZ, monthGZ, dayGZ, adjYear, gender, daYun.startAge),
            beijingPillars: beijingPillars,
            solarTermInfo: solarTermInfo,
            qiYun: qiYun,
            jiaoYun: jiaoYun,
            huanYun: huanYun
        };
    }

    // ==================== 构建四柱详细信息 ====================
    function buildPillars(yearGZ, monthGZ, dayGZ, hourGZ, dayGanIndex) {
        return {
            year: {
                gan: yearGZ.gan, zhi: yearGZ.zhi, ganZhi: yearGZ.ganZhi,
                ganIndex: yearGZ.ganIndex, zhiIndex: yearGZ.zhiIndex,
                wuXing: yearGZ.wuXing, naiYin: yearGZ.naiYin,
                cangGan: Lunar.zhiCangGan[yearGZ.zhiIndex].map(g => ({ gan: g, shiShen: Lunar.getShiShen(dayGanIndex, Lunar.tianGan.indexOf(g)) })),
                shiShen: Lunar.getShiShen(dayGanIndex, yearGZ.ganIndex)
            },
            month: {
                gan: monthGZ.gan, zhi: monthGZ.zhi, ganZhi: monthGZ.ganZhi,
                ganIndex: monthGZ.ganIndex, zhiIndex: monthGZ.zhiIndex,
                wuXing: monthGZ.wuXing, naiYin: monthGZ.naiYin,
                cangGan: Lunar.zhiCangGan[monthGZ.zhiIndex].map(g => ({ gan: g, shiShen: Lunar.getShiShen(dayGanIndex, Lunar.tianGan.indexOf(g)) })),
                shiShen: Lunar.getShiShen(dayGanIndex, monthGZ.ganIndex)
            },
            day: {
                gan: dayGZ.gan, zhi: dayGZ.zhi, ganZhi: dayGZ.ganZhi,
                ganIndex: dayGZ.ganIndex, zhiIndex: dayGZ.zhiIndex,
                wuXing: dayGZ.wuXing, naiYin: dayGZ.naiYin,
                cangGan: Lunar.zhiCangGan[dayGZ.zhiIndex].map(g => ({ gan: g, shiShen: '日主' })),
                shiShen: '日主'
            },
            hour: {
                gan: hourGZ.gan, zhi: hourGZ.zhi, ganZhi: hourGZ.ganZhi,
                ganIndex: hourGZ.ganIndex, zhiIndex: hourGZ.zhiIndex,
                wuXing: hourGZ.wuXing, naiYin: hourGZ.naiYin,
                cangGan: Lunar.zhiCangGan[hourGZ.zhiIndex].map(g => ({ gan: g, shiShen: Lunar.getShiShen(dayGanIndex, Lunar.tianGan.indexOf(g)) })),
                shiShen: Lunar.getShiShen(dayGanIndex, hourGZ.ganIndex)
            }
        };
    }

    // ==================== 大运计算 ====================
    function calculateDaYun(yearGZ, monthGZ, dayGZ, year, month, day, gender, birthHour, birthMinute) {
        // 大运方向判断：
        // 阳年男命/阴年女命 → 顺行
        // 阴年男命/阳年女命 → 逆行
        let isYangYear = yearGZ.ganIndex % 2 === 0; // 甲丙戊庚壬为阳
        let isMale = gender === 1;
        let isForward = (isYangYear && isMale) || (!isYangYear && !isMale);

        // 计算起运年龄（从出生日到最近节气的天数）
        let startAge = calculateStartAge(year, month, day, isForward, birthHour, birthMinute);

        // 生成大运列表（10步）
        let daYunList = [];
        let monthGanIdx = monthGZ.ganIndex;
        let monthZhiIdx = monthGZ.zhiIndex;

        for (let i = 1; i <= 10; i++) {
            let ganIdx, zhiIdx;
            if (isForward) {
                ganIdx = (monthGanIdx + i) % 10;
                zhiIdx = (monthZhiIdx + i) % 12;
            } else {
                ganIdx = (monthGanIdx - i + 100) % 10;
                zhiIdx = (monthZhiIdx - i + 120) % 12;
            }

            let gan = Lunar.tianGan[ganIdx];
            let zhi = Lunar.diZhi[zhiIdx];
            let ganZhi = gan + zhi;

            daYunList.push({
                index: i,
                ganZhi: ganZhi,
                gan: gan,
                zhi: zhi,
                ganIndex: ganIdx,
                zhiIndex: zhiIdx,
                wuXing: (Lunar.wuXingGan[ganIdx] || '') + (Lunar.wuXingZhi[zhiIdx] || ''),
                naiYin: Lunar.getNaiYin(ganIdx, zhiIdx),
                startAge: startAge.years + (i - 1) * 10,
                endAge: startAge.years + i * 10 - 1,
                cangGan: Lunar.zhiCangGan[zhiIdx],
                shiShen: Lunar.getShiShen(dayGZ.ganIndex, ganIdx)
            });
        }

        return {
            isForward: isForward,
            direction: isForward ? '顺行' : '逆行',
            startAge: startAge,
            list: daYunList
        };
    }

    // ==================== 起运年龄计算 ====================
    function calculateStartAge(year, month, day, isForward, birthHour, birthMinute) {
        // 顺行：从出生时刻到下一个节气的天数（精确到小时）
        // 逆行：从出生时刻到上一个节气的天数（精确到小时）
        // 每3天折1年

        // 节气索引（只取"节"，不取"气"）
        const jieIndices = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

        let birthTimestamp = new Date(year, month - 1, day, birthHour || 0, birthMinute || 0).getTime();
        let minDiffMs = Infinity;

        for (let idx of jieIndices) {
            let termInfo = Lunar.getSolarTermTime(year, idx);
            if (!termInfo) continue;
            let termTimestamp = new Date(termInfo.year, termInfo.month - 1, termInfo.day, termInfo.hour, termInfo.minute).getTime();

            let diffMs = termTimestamp - birthTimestamp;
            let diffDays = diffMs / 86400000;

            if (isForward && diffDays > 0 && diffDays < minDiffMs) {
                minDiffMs = diffDays;
            } else if (!isForward && diffDays < 0 && Math.abs(diffDays) < minDiffMs) {
                minDiffMs = Math.abs(diffDays);
            }
        }

        // 如果本年没找到，查下一年（顺行）或上一年（逆行）
        if (minDiffMs === Infinity) {
            if (isForward) {
                let nextTermInfo = Lunar.getSolarTermTime(year + 1, 0);
                if (nextTermInfo) {
                    let termTimestamp = new Date(nextTermInfo.year, nextTermInfo.month - 1, nextTermInfo.day, nextTermInfo.hour, nextTermInfo.minute).getTime();
                    minDiffMs = (termTimestamp - birthTimestamp) / 86400000;
                }
            } else {
                let prevTermInfo = Lunar.getSolarTermTime(year - 1, 22);
                if (prevTermInfo) {
                    let termTimestamp = new Date(prevTermInfo.year, prevTermInfo.month - 1, prevTermInfo.day, prevTermInfo.hour, prevTermInfo.minute).getTime();
                    minDiffMs = (birthTimestamp - termTimestamp) / 86400000;
                }
            }
        }

        if (minDiffMs === Infinity) minDiffMs = 30;

        // 3天=1年, 1天=4个月, 1个月=30命理天, 精确到小时
        // 换算体系: 3天=1年=12个月=360命理天, 所以1天=120命理天
        let totalDays = minDiffMs;
        let ageYears = Math.floor(totalDays / 3);
        let remainDays = totalDays - ageYears * 3;
        let ageMonths = Math.floor(remainDays * 4);
        let remainDaysAfterMonth = remainDays - ageMonths / 4;
        let ageDays = Math.floor(remainDaysAfterMonth * 120);
        let ageHours = Math.round((remainDaysAfterMonth * 120 - ageDays) * 24);

        return {
            years: ageYears,
            months: ageMonths,
            days: ageDays,
            hours: ageHours,
            totalDays: Math.round(totalDays)
        };
    }

    // ==================== 干支关系分析 ====================
    function analyzeGanZhiRelations(yearGZ, monthGZ, dayGZ, hourGZ) {
        var relations = { tianGan: [], diZhi: [] };

        // 天干关系：检查四干之间的合与冲
        var gans = [
            { idx: yearGZ.ganIndex, label: '年干' + yearGZ.gan },
            { idx: monthGZ.ganIndex, label: '月干' + monthGZ.gan },
            { idx: dayGZ.ganIndex, label: '日干' + dayGZ.gan },
            { idx: hourGZ.ganIndex, label: '时干' + hourGZ.gan }
        ];
        for (var i = 0; i < gans.length; i++) {
            for (var j = i + 1; j < gans.length; j++) {
                var he = Lunar.getTianGanHe(gans[i].idx, gans[j].idx);
                if (he) relations.tianGan.push({ type: '合', desc: he, from: gans[i].label, to: gans[j].label });
                var chong = Lunar.getTianGanChong(gans[i].idx, gans[j].idx);
                if (chong) relations.tianGan.push({ type: '冲', desc: chong, from: gans[i].label, to: gans[j].label });
            }
        }

        // 地支关系：检查四支之间的合、冲、刑、害
        var zhis = [
            { idx: yearGZ.zhiIndex, label: '年支' + yearGZ.zhi },
            { idx: monthGZ.zhiIndex, label: '月支' + monthGZ.zhi },
            { idx: dayGZ.zhiIndex, label: '日支' + dayGZ.zhi },
            { idx: hourGZ.zhiIndex, label: '时支' + hourGZ.zhi }
        ];
        for (var i = 0; i < zhis.length; i++) {
            for (var j = i + 1; j < zhis.length; j++) {
                var he = Lunar.getDiZhiHe(zhis[i].idx, zhis[j].idx);
                if (he) relations.diZhi.push({ type: '合', desc: he, from: zhis[i].label, to: zhis[j].label });
                var chong = Lunar.getDiZhiChong(zhis[i].idx, zhis[j].idx);
                if (chong) relations.diZhi.push({ type: '冲', desc: chong, from: zhis[i].label, to: zhis[j].label });
                var xing = Lunar.getDiZhiXing(zhis[i].idx, zhis[j].idx);
                if (xing) relations.diZhi.push({ type: '刑', desc: xing, from: zhis[i].label, to: zhis[j].label });
                var hai = Lunar.getDiZhiHai(zhis[i].idx, zhis[j].idx);
                if (hai) relations.diZhi.push({ type: '害', desc: hai, from: zhis[i].label, to: zhis[j].label });
                var po = Lunar.getDiZhiPo(zhis[i].idx, zhis[j].idx);
                if (po) relations.diZhi.push({ type: '破', desc: po, from: zhis[i].label, to: zhis[j].label });
            }
        }

        // 三刑检测（需要三个地支同时存在于四柱中）
        var zhiSet = new Set();
        for (var z = 0; z < zhis.length; z++) { zhiSet.add(zhis[z].idx); }
        var sanXingSets = [
            { zhis: [2, 5, 8], name: '寅巳申为无恩之刑' },
            { zhis: [1, 7, 10], name: '丑未戌为恃势之刑' }
        ];
        for (var sx = 0; sx < sanXingSets.length; sx++) {
            var found = sanXingSets[sx].zhis.every(function(z) { return zhiSet.has(z); });
            if (found) relations.diZhi.push({ type: '刑', desc: sanXingSets[sx].name });
        }

        return relations;
    }

    // ==================== 流年计算 ====================
    function calculateLiuNian(birthYear, dayGanIndex, count) {
        var liuNianList = [];
        for (var i = 0; i < count; i++) {
            var year = birthYear + i;
            // 流年干支直接按公历年份计算，不考虑立春
            // 命理中流年以立春为界，但流年干支名称与公历年份对应
            // 例如2026年流年=丙午，不因立春前而变成乙巳
            var ganIdx = (year - 4) % 10;
            var zhiIdx = (year - 4) % 12;
            var gan = Lunar.tianGan[ganIdx];
            var zhi = Lunar.diZhi[zhiIdx];
            var ganZhi = gan + zhi;
            liuNianList.push({
                year: year,
                gan: gan,
                zhi: zhi,
                ganZhi: ganZhi,
                ganIndex: ganIdx,
                zhiIndex: zhiIdx,
                shiShen: Lunar.getShiShen(dayGanIndex, ganIdx),
                zhiShiShen: Lunar.getShiShen(dayGanIndex, Lunar.zhiCangGan[zhiIdx][0] ? Lunar.tianGan.indexOf(Lunar.zhiCangGan[zhiIdx][0]) : 0),
                naiYin: Lunar.getNaiYin(ganIdx, zhiIdx)
            });
        }
        return liuNianList;
    }

    // ==================== 流月计算 ====================
    function calculateLiuYue(year, dayGanIndex) {
        var liuYueList = [];
        for (var m = 1; m <= 12; m++) {
            // 每月以节气为界，简化取每月15日
            var monthGZ = Lunar.getMonthGanZhi(year, m, 15, 12, 0);
            liuYueList.push({
                month: m,
                gan: monthGZ.gan,
                zhi: monthGZ.zhi,
                ganZhi: monthGZ.ganZhi,
                ganIndex: monthGZ.ganIndex,
                zhiIndex: monthGZ.zhiIndex,
                shiShen: Lunar.getShiShen(dayGanIndex, monthGZ.ganIndex)
            });
        }
        return liuYueList;
    }

    // ==================== 小运计算 ====================
    function calculateXiaoYun(yearGZ, monthGZ, dayGZ, birthYear, gender, startAge) {
        // 小运从出生年起，每年一换
        // 阳年男命/阴年女命 → 顺行，否则逆行
        var isYangYear = yearGZ.ganIndex % 2 === 0;
        var isMale = gender === 1;
        var isForward = (isYangYear && isMale) || (!isYangYear && !isMale);

        var xiaoYunList = [];
        var baseGanIdx = monthGZ.ganIndex;
        var baseZhiIdx = monthGZ.zhiIndex;

        for (var i = 0; i < 88; i++) {
            var ganIdx, zhiIdx;
            if (isForward) {
                ganIdx = (baseGanIdx + i) % 10;
                zhiIdx = (baseZhiIdx + i) % 12;
            } else {
                ganIdx = (baseGanIdx - i + 100) % 10;
                zhiIdx = (baseZhiIdx - i + 120) % 12;
            }
            xiaoYunList.push({
                age: i + 1,
                gan: Lunar.tianGan[ganIdx],
                zhi: Lunar.diZhi[zhiIdx],
                ganZhi: Lunar.tianGan[ganIdx] + Lunar.diZhi[zhiIdx],
                ganIndex: ganIdx,
                zhiIndex: zhiIdx,
                shiShen: Lunar.getShiShen(dayGZ.ganIndex, ganIdx)
            });
        }
        return xiaoYunList;
    }

    // ==================== 流日计算 ====================
    function calculateLiuRi(year, month, day, dayGanIndex) {
        var dayGZ = Lunar.getDayGanZhi(year, month, day);
        return {
            gan: dayGZ.gan,
            zhi: dayGZ.zhi,
            ganZhi: dayGZ.ganZhi,
            ganIndex: dayGZ.ganIndex,
            zhiIndex: dayGZ.zhiIndex,
            shiShen: Lunar.getShiShen(dayGanIndex, dayGZ.ganIndex)
        };
    }

    // ==================== 导出 ====================
    return {
        generate,
        calculateDaYun,
        buildPillars,
        calculateLiuNian,
        calculateLiuYue,
        calculateXiaoYun,
        calculateLiuRi
    };
})();
