/**
 * 紫微斗数排盘引擎 - ziwei.js
 * 正统三合派排盘算法
 * 依赖：lunar.js（农历转换、天干地支）
 */

const Ziwei = (function() {
    'use strict';

    // ==================== 常量定义 ====================

    // 十天干
    const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    // 十二地支
    const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    // 天干五行
    const GAN_WUXING = ['木','木','火','火','土','土','金','金','水','水'];
    // 地支五行
    const ZHI_WUXING = ['水','土','木','木','土','火','火','土','金','金','土','水'];
    // 纳音（六十甲子纳音）
    const NAYIN = [
        '海中金','海中金','炉中火','炉中火','大林木','大林木',
        '路旁土','路旁土','剑锋金','剑锋金','山头火','山头火',
        '涧下水','涧下水','城头土','城头土','白蜡金','白蜡金',
        '杨柳木','杨柳木','泉中水','泉中水','屋上土','屋上土',
        '霹雳火','霹雳火','松柏木','松柏木','长流水','长流水',
        '砂石金','砂石金','山下火','山下火','平地木','平地木',
        '壁上土','壁上土','金箔金','金箔金','覆灯火','覆灯火',
        '天河水','天河水','大驿土','大驿土','钗钏金','钗钏金',
        '桑柘木','桑柘木','大溪水','大溪水','沙中土','沙中土',
        '天上火','天上火','石榴木','石榴木','大海水','大海水'
    ];

    // 十二宫名
    const PALACE_NAMES = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','交友','官禄','田宅','福德','父母'];

    // 十四主星
    const MAIN_STARS = [
        {name:'紫微',type:'帝星',wuxing:'阴土'},
        {name:'天机',type:'智慧',wuxing:'阴木'},
        {name:'太阳',type:'光明',wuxing:'阳火'},
        {name:'武曲',type:'财星',wuxing:'阴金'},
        {name:'天同',type:'福星',wuxing:'阳水'},
        {name:'廉贞',type:'囚星',wuxing:'阴火'},
        {name:'天府',type:'财星',wuxing:'阳土'},
        {name:'太阴',type:'富星',wuxing:'阴水'},
        {name:'贪狼',type:'桃花',wuxing:'阳木'},
        {name:'巨门',type:'暗星',wuxing:'阴土'},
        {name:'天相',type:'印星',wuxing:'阳水'},
        {name:'天梁',type:'荫星',wuxing:'阳土'},
        {name:'七杀',type:'将星',wuxing:'阴金'},
        {name:'破军',type:'耗星',wuxing:'阴水'}
    ];

    // 六吉星
    const LUCKY_STARS = [
        {name:'文昌',type:'科甲'},
        {name:'文曲',type:'科甲'},
        {name:'左辅',type:'辅佐'},
        {name:'右弼',type:'辅佐'},
        {name:'天魁',type:'贵人'},
        {name:'天钺',type:'贵人'}
    ];

    // 六煞星
    const EVIL_STARS = [
        {name:'擎羊',type:'煞'},
        {name:'陀罗',type:'煞'},
        {name:'火星',type:'煞'},
        {name:'铃星',type:'煞'},
        {name:'天空',type:'空'},
        {name:'地劫',type:'空'}
    ];

    // 其他辅星
    const OTHER_STARS = [
        {name:'禄存',type:'财'},
        {name:'天马',type:'驿马'},
        {name:'天刑',type:'刑'},
        {name:'天姚',type:'桃花'},
        {name:'解神',type:'解'},
        {name:'天巫',type:'巫'},
        {name:'天月',type:'病'},
        {name:'阴煞',type:'煞'},
        {name:'天德',type:'德'},
        {name:'天才',type:'才'},
        {name:'天寿',type:'寿'},
        {name:'蜚廉',type:'煞'},
        {name:'破碎',type:'煞'},
        {name:'华盖',type:'煞'},
        {name:'咸池',type:'桃花'},
        {name:'孤辰',type:'孤'},
        {name:'寡宿',type:'孤'},
        {name:'天虚',type:'空'},
        {name:'吊客',type:'丧'},
        {name:'天哭',type:'丧'}
    ];

    // 紫微星系安星表（按五行局和出生日）
    // key: 五行局数(2-6), value: [紫微在寅宫的起始日, ...]
    // 紫微星从寅宫起，按日数递推
    const ZIWEI_START = {
        2: [1, 13, 25],    // 水二局
        3: [1, 11, 21, 31], // 木三局
        4: [1, 9, 17, 25],  // 金四局
        5: [1, 8, 15, 22, 29], // 土五局
        6: [1, 7, 13, 19, 25, 31]  // 火六局
    };

    // 天府星系与紫微星系的对应关系
    // 天府宫位 = (4 - 紫微宫位 + 12) % 12（从寅宫起算的偏移）
    const TIANFU_OFFSET_MAP = {
        0: 4,   // 紫微在寅(0) → 天府在申(4)
        1: 4,   // 紫微在卯(1) → 天府在未(4)  -- 实际需要特殊处理
        2: 4,   // 紫微在辰(2) → 天府在午(4)
        3: 4,   // 紫微在巳(3) → 天府在巳(4)
        4: 4,   // 紫微在午(4) → 天府在辰(4)
        5: 4,   // 紫微在未(5) → 天府在卯(4)
        6: 4,   // 紫微在申(6) → 天府在寅(4)
        7: 4,   // 紫微在酉(7) → 天府在丑(4)
        8: 4,   // 紫微在戌(8) → 天府在子(4)
        9: 4,   // 紫微在亥(9) → 天府在亥(4)
        10: 4,  // 紫微在子(10) → 天府在戌(4)
        11: 4   // 紫微在丑(11) → 天府在酉(4)
    };

    // 四化表（按生年天干索引）
    // [化禄, 化权, 化科, 化忌]
    const SI_HUA = {
        0:  ['廉贞','破军','武曲','太阳'],   // 甲
        1:  ['天机','天梁','紫微','太阴'],   // 乙
        2:  ['天同','天机','文昌','廉贞'],   // 丙
        3:  ['天机','太阴','天同','天机'],   // 丁
        4:  ['贪狼','太阴','右弼','天机'],   // 戊
        5:  ['天梁','天同','天机','文昌'],   // 己
        6:  ['太阳','武曲','天同','天同'],   // 庚
        7:  ['巨门','太阳','文曲','文昌'],   // 辛
        8:  ['贪狼','天梁','紫微','武曲'],   // 壬
        9:  ['破军','巨门','太阴','贪狼']    // 癸
    };

    // ==================== 工具函数 ====================

    // 获取天干地支的纳音
    function getNayin(ganIdx, zhiIdx) {
        // 六十甲子序号
        var idx;
        if (ganIdx % 2 === 0) {
            idx = (ganIdx / 2) * 6 + (zhiIdx % 6);
        } else {
            idx = ((ganIdx - 1) / 2) * 6 + ((zhiIdx + 3) % 6);
        }
        return NAYIN[idx % 60];
    }

    // 获取地支索引
    function getZhiIdx(zhi) {
        return DI_ZHI.indexOf(zhi);
    }

    // 获取天干索引
    function getGanIdx(gan) {
        return TIAN_GAN.indexOf(gan);
    }

    // ==================== 核心排盘 ====================

    /**
     * 生成完整紫微斗数排盘
     * @param {number} year - 公历年
     * @param {number} month - 公历月
     * @param {number} day - 公历日
     * @param {number} hour - 时(0-23)
     * @param {number} minute - 分(0-59)
     * @param {number} gender - 性别 1=男 0=女
     * @param {number} longitude - 经度(可选)
     * @returns {object} 完整排盘结果
     */
    function generate(year, month, day, hour, minute, gender, longitude) {
        // 使用lunar.js获取农历信息
        var lunar = Lunar.solarToLunar(year, month, day);
        if (!lunar) return null;

        // 真太阳时处理
        var actualHour = hour;
        var actualMinute = minute;
        var trueSolarTime = null;

        if (longitude !== undefined && longitude !== null) {
            trueSolarTime = SolarTime.getTrueSolarTime(year, month, day, hour, minute, longitude);
            actualHour = trueSolarTime.trueHour;
            actualMinute = trueSolarTime.trueMinute;
        }

        // 处理跨日
        var adjYear = year, adjMonth = month, adjDay = day;
        if (actualHour >= 24) {
            var nextDate = new Date(year, month - 1, day + 1);
            adjYear = nextDate.getFullYear();
            adjMonth = nextDate.getMonth() + 1;
            adjDay = nextDate.getDate();
            actualHour = actualHour - 24;
        }
        if (actualHour < 0) {
            var prevDate = new Date(year, month - 1, day - 1);
            adjYear = prevDate.getFullYear();
            adjMonth = prevDate.getMonth() + 1;
            adjDay = prevDate.getDate();
            actualHour = actualHour + 24;
        }

        // 重新获取农历（跨日后）
        if (adjYear !== year || adjMonth !== month || adjDay !== day) {
            lunar = Lunar.solarToLunar(adjYear, adjMonth, adjDay);
        }

        // 获取年干支
        var yearGZ = Lunar.getYearGanZhi(adjYear, adjMonth, adjDay);
        var yearGanIdx = yearGZ.ganIndex;
        var yearZhiIdx = yearGZ.zhiIndex;

        // 获取农历月日
        var lunarMonth = lunar.lunarMonth;
        var lunarDay = lunar.lunarDay;

        // 时辰地支索引
        var shiChen = Math.floor(actualHour) % 24;
        if (shiChen < 0) shiChen += 24;
        var hourZhiIdx;
        if (shiChen === 23 || shiChen === 0) {
            hourZhiIdx = 0; // 子时
        } else {
            hourZhiIdx = Math.ceil(shiChen / 2);
        }
        if (hourZhiIdx > 11) hourZhiIdx = 11;

        // ========== 第一步：定命宫 ==========
        // 命宫位置 = (14 - 农历月 - 时辰地支) % 12
        var mingGongIdx = (14 - lunarMonth - hourZhiIdx) % 12;
        if (mingGongIdx < 0) mingGongIdx += 12;

        // ========== 第二步：定身宫 ==========
        // 身宫位置 = (14 - 农历月 + 时辰地支) % 12
        var shenGongIdx = (14 - lunarMonth + hourZhiIdx) % 12;
        if (shenGongIdx < 0) shenGongIdx += 12;

        // ========== 第三步：起十二宫天干 ==========
        // 命宫天干：根据年干和命宫地支推算
        // 五虎遁：甲己年起丙寅，乙庚年起戊寅，丙辛年起庚寅，丁壬年起壬寅，戊癸年起甲寅
        var yinGanIdx = (yearGanIdx % 5) * 2 + 2; // 寅宫天干
        // 命宫天干 = 寅宫天干 + (命宫地支 - 寅)
        var mingGongGanIdx = (yinGanIdx + mingGongIdx) % 10;

        // 各宫天干
        var palaceGans = [];
        for (var i = 0; i < 12; i++) {
            palaceGans.push((mingGongGanIdx + i) % 10);
        }

        // ========== 第四步：定五行局 ==========
        // 五行局由命宫天干地支的纳音决定
        var mingGongGanZhi = palaceGans[0] + DI_ZHI[mingGongIdx];
        var wuxingJu = getWuXingJu(palaceGans[0], mingGongIdx);

        // ========== 第五步：安紫微星系 ==========
        var ziweiPos = calcZiweiPosition(wuxingJu, lunarDay);
        var ziweiStars = placeZiweiSeries(ziweiPos);

        // ========== 第六步：安天府星系 ==========
        var tianfuPos = calcTianfuPosition(ziweiPos);
        var tianfuStars = placeTianfuSeries(tianfuPos);

        // ========== 第七步：安辅星 ==========
        var auxStars = placeAuxStars(yearGanIdx, yearZhiIdx, month, lunarMonth, hourZhiIdx, mingGongIdx);

        // ========== 第八步：安四化 ==========
        var sihua = SI_HUA[yearGanIdx] || [];

        // ========== 第九步：安煞星 ==========
        var evilStars = placeEvilStars(yearZhiIdx, month, mingGongIdx);

        // ========== 第十步：安其他星曜 ==========
        var otherStars = placeOtherStars(yearGanIdx, yearZhiIdx, hourZhiIdx, mingGongIdx);

        // ========== 第十一步：构建十二宫 ==========
        var palaces = buildPalaces(
            mingGongIdx, shenGongIdx, palaceGans,
            ziweiStars, tianfuStars, auxStars, evilStars, otherStars, sihua
        );

        // ========== 第十二步：大限 ==========
        var daXian = calcDaXian(mingGongIdx, gender, yearGanIdx);

        return {
            solarDate: { year, month, day, hour, minute },
            lunarDate: {
                year: lunar.lunarYear,
                month: lunarMonth,
                day: lunarDay,
                isLeap: lunar.isLeap,
                monthName: Lunar.getLunarMonthName(lunarMonth, lunar.isLeap),
                dayName: Lunar.getLunarDayName(lunarDay),
                shengXiao: Lunar.shengXiao[yearZhiIdx]
            },
            gender: gender === 1 ? '男' : '女',
            yearGanZhi: yearGZ.ganZhi,
            wuxingJu: wuxingJu,
            mingGongIdx: mingGongIdx,
            shenGongIdx: shenGongIdx,
            palaces: palaces,
            sihua: sihua,
            daXian: daXian,
            trueSolarTime: trueSolarTime
        };
    }

    // ==================== 五行局计算 ====================
    function getWuXingJu(ganIdx, zhiIdx) {
        var nayin = getNayin(ganIdx, zhiIdx);
        if (nayin.indexOf('水') >= 0) return 2;
        if (nayin.indexOf('木') >= 0) return 3;
        if (nayin.indexOf('金') >= 0) return 4;
        if (nayin.indexOf('土') >= 0) return 5;
        if (nayin.indexOf('火') >= 0) return 6;
        return 5; // 默认土五局
    }

    // ==================== 紫微星定位 ====================
    function calcZiweiPosition(wuxingJu, lunarDay) {
        // 紫微星位置根据五行局和农历日期推算
        // 从寅宫(0)开始，按五行局数递增
        var startPositions = ZIWEI_START[wuxingJu];
        if (!startPositions) return 0;

        // 找到包含该日的区间
        var pos = 0;
        for (var i = startPositions.length - 1; i >= 0; i--) {
            if (lunarDay >= startPositions[i]) {
                pos = i;
                break;
            }
        }

        // 紫微在寅宫的基础上，每过一个周期偏移
        var ziweiIdx = pos; // 从寅宫(0)起算
        return ziweiIdx;
    }

    // ==================== 安紫微星系 ====================
    function placeZiweiSeries(ziweiPos) {
        // 紫微星系各星与紫微的相对位置
        var stars = {};

        // 紫微
        stars['紫微'] = ziweiPos;

        // 天机：紫微逆行1位
        stars['天机'] = (ziweiPos + 11) % 12;

        // 太阳：紫微逆行3位（隔两位）
        stars['太阳'] = (ziweiPos + 9) % 12;

        // 武曲：紫微逆行4位
        stars['武曲'] = (ziweiPos + 8) % 12;

        // 天同：紫微逆行5位
        stars['天同'] = (ziweiPos + 7) % 12;

        // 廉贞：紫微顺行8位（或逆行4位取对宫）
        stars['廉贞'] = (ziweiPos + 8) % 12;

        // 紫微星系排布（按三合派规则）
        // 紫微、天机、(空)、太阳、武曲、天同、(空)、(空)、廉贞
        // 按逆时针排列：紫微→天机→(空)→太阳→武曲→天同→(空)→(空)→廉贞
        stars['紫微'] = ziweiPos;
        stars['天机'] = (ziweiPos + 11) % 12;
        stars['太阳'] = (ziweiPos + 9) % 12;
        stars['武曲'] = (ziweiPos + 8) % 12;
        stars['天同'] = (ziweiPos + 7) % 12;
        stars['廉贞'] = (ziweiPos + 4) % 12;

        return stars;
    }

    // ==================== 天府定位 ====================
    function calcTianfuPosition(ziweiPos) {
        // 天府与紫微的对应关系（三合派）
        // 紫微在寅→天府在申，紫微在卯→天府在未... 对称分布
        var tianfuMap = {
            0: 6,   // 寅→申
            1: 5,   // 卯→未
            2: 4,   // 辰→午
            3: 3,   // 巳→巳
            4: 2,   // 午→辰
            5: 1,   // 未→卯
            6: 0,   // 申→寅
            7: 11,  // 酉→丑
            8: 10,  // 戌→子
            9: 9,   // 亥→亥
            10: 8,  // 子→戌
            11: 7   // 丑→酉
        };
        return tianfuMap[ziweiPos] !== undefined ? tianfuMap[ziweiPos] : 6;
    }

    // ==================== 安天府星系 ====================
    function placeTianfuSeries(tianfuPos) {
        var stars = {};

        // 天府星系按顺时针排列
        stars['天府'] = tianfuPos;
        stars['太阴'] = (tianfuPos + 1) % 12;
        stars['贪狼'] = (tianfuPos + 2) % 12;
        stars['巨门'] = (tianfuPos + 3) % 12;
        stars['天相'] = (tianfuPos + 4) % 12;
        stars['天梁'] = (tianfuPos + 5) % 12;
        stars['七杀'] = (tianfuPos + 6) % 12;
        stars['破军'] = (tianfuPos + 10) % 12;

        return stars;
    }

    // ==================== 安辅星 ====================
    function placeAuxStars(yearGanIdx, yearZhiIdx, solarMonth, lunarMonth, hourZhiIdx, mingGongIdx) {
        var stars = {};

        // 文昌：按生年干
        // 甲戌庚→辰宫，乙己壬→申宫，丙辛丁→戌宫
        var wenChangMap = [4, 8, 10, 10, 4, 8, 4, 10, 8, 8];
        stars['文昌'] = wenChangMap[yearGanIdx];

        // 文曲：按生年干
        // 甲己→辰宫，乙庚→子宫，丙辛→戌宫，丁壬→寅宫，戊癸→申宫
        var wenQuMap = [4, 0, 10, 2, 8, 4, 0, 10, 2, 8];
        stars['文曲'] = wenQuMap[yearGanIdx];

        // 左辅：按生月
        stars['左辅'] = (lunarMonth + 3) % 12;

        // 右弼：按生月
        stars['右弼'] = (13 - lunarMonth) % 12;

        // 天魁：按年支
        var tianKuiMap = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
        stars['天魁'] = tianKuiMap[yearZhiIdx];

        // 天钺：按年支
        var tianYueMap = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8];
        stars['天钺'] = tianYueMap[yearZhiIdx];

        // 禄存：按年干
        var luCunMap = [2, 3, 5, 6, 5, 6, 2, 3, 5, 6];
        stars['禄存'] = luCunMap[yearGanIdx];

        // 天马：按年支
        var tianMaMap = [2, 9, 10, 7, 4, 1, 8, 3, 6, 11, 0, 5];
        stars['天马'] = tianMaMap[yearZhiIdx];

        return stars;
    }

    // ==================== 安煞星 ====================
    function placeEvilStars(yearZhiIdx, solarMonth, mingGongIdx) {
        var stars = {};

        // 擎羊：按年支
        stars['擎羊'] = (yearZhiIdx + 5) % 12;

        // 陀罗：按年支
        stars['陀罗'] = (yearZhiIdx + 7) % 12;

        // 火星：按年支和时辰
        // 寅午戌年→卯宫起，申子辰年→寅宫起，巳酉丑年→戌宫起，亥卯未年→午宫起
        var huoXingBase;
        if (yearZhiIdx === 2 || yearZhiIdx === 6 || yearZhiIdx === 10) {
            huoXingBase = 3; // 寅午戌→卯
        } else if (yearZhiIdx === 0 || yearZhiIdx === 4 || yearZhiIdx === 8) {
            huoXingBase = 2; // 申子辰→寅
        } else if (yearZhiIdx === 5 || yearZhiIdx === 9 || yearZhiIdx === 1) {
            huoXingBase = 10; // 巳酉丑→戌
        } else {
            huoXingBase = 6; // 亥卯未→午
        }
        stars['火星'] = huoXingBase;

        // 铃星：与火星对称
        stars['铃星'] = (huoXingBase + 6) % 12;

        // 天空：按年支
        stars['天空'] = (yearZhiIdx + 11) % 12;

        // 地劫：按年支
        stars['地劫'] = (yearZhiIdx + 5) % 12;

        return stars;
    }

    // ==================== 安其他星曜 ====================
    function placeOtherStars(yearGanIdx, yearZhiIdx, hourZhiIdx, mingGongIdx) {
        var stars = {};

        // 天刑：按年支
        stars['天刑'] = (yearZhiIdx + 3) % 12;

        // 天姚：按年支
        stars['天姚'] = (yearZhiIdx + 9) % 12;

        // 解神：按年支
        stars['解神'] = (yearZhiIdx + 2) % 12;

        // 天巫：按年支
        stars['天巫'] = (yearZhiIdx + 3) % 12;

        // 天月：按年支
        stars['天月'] = (yearZhiIdx + 7) % 12;

        // 阴煞：按年支
        stars['阴煞'] = (yearZhiIdx + 6) % 12;

        // 天德：按年支
        var tianDeMap = [10, 9, 2, 1, 0, 11, 8, 7, 6, 5, 4, 3];
        stars['天德'] = tianDeMap[yearZhiIdx];

        // 天才：按年支
        stars['天才'] = (yearZhiIdx + 10) % 12;

        // 天寿：按年支
        stars['天寿'] = (yearZhiIdx + 1) % 12;

        // 蜚廉：按年支
        stars['蜚廉'] = (yearZhiIdx + 8) % 12;

        // 破碎：按年支
        stars['破碎'] = (yearZhiIdx + 4) % 12;

        // 华盖：按年支
        stars['华盖'] = (yearZhiIdx + 3) % 12;

        // 咸池：按年支
        stars['咸池'] = (yearZhiIdx + 8) % 12;

        // 孤辰：按年支
        var guChenMap = [2, 2, 2, 11, 11, 11, 8, 8, 8, 5, 5, 5];
        stars['孤辰'] = guChenMap[yearZhiIdx];

        // 寡宿：与孤辰对称
        stars['寡宿'] = (guChenMap[yearZhiIdx] + 6) % 12;

        // 天虚：按年支
        stars['天虚'] = (yearZhiIdx + 1) % 12;

        // 吊客：按年支
        stars['吊客'] = (yearZhiIdx + 10) % 12;

        // 天哭：按年支
        stars['天哭'] = (yearZhiIdx + 1) % 12;

        return stars;
    }

    // ==================== 构建十二宫 ====================
    function buildPalaces(mingGongIdx, shenGongIdx, palaceGans,
                          ziweiStars, tianfuStars, auxStars, evilStars, otherStars, sihua) {
        var palaces = [];

        // 主星名称集合
        var mainStarNames = MAIN_STARS.map(function(s) { return s.name; });
        var luckyStarNames = LUCKY_STARS.map(function(s) { return s.name; });
        var evilStarNames = EVIL_STARS.map(function(s) { return s.name; });
        var otherStarNames = OTHER_STARS.map(function(s) { return s.name; });

        for (var i = 0; i < 12; i++) {
            // 宫位索引（从命宫开始顺时针）
            var posIdx = (mingGongIdx + i) % 12;

            var palace = {
                index: i,
                name: PALACE_NAMES[i],
                posIdx: posIdx,
                gan: TIAN_GAN[palaceGans[i]],
                zhi: DI_ZHI[posIdx],
                ganIdx: palaceGans[i],
                zhiIdx: posIdx,
                wuxing: GAN_WUXING[palaceGans[i]] + ZHI_WUXING[posIdx],
                nayin: getNayin(palaceGans[i], posIdx),
                isShenGong: (posIdx === shenGongIdx),
                mainStars: [],
                luckyStars: [],
                evilStars: [],
                otherStars: [],
                sihua: []
            };

            // 收集主星
            for (var sn in ziweiStars) {
                if (ziweiStars[sn] === posIdx && mainStarNames.indexOf(sn) >= 0) {
                    palace.mainStars.push(sn);
                }
            }
            for (var sn in tianfuStars) {
                if (tianfuStars[sn] === posIdx && mainStarNames.indexOf(sn) >= 0) {
                    palace.mainStars.push(sn);
                }
            }

            // 收集吉星
            for (var sn in auxStars) {
                if (auxStars[sn] === posIdx && luckyStarNames.indexOf(sn) >= 0) {
                    palace.luckyStars.push(sn);
                }
            }

            // 收集煞星
            for (var sn in evilStars) {
                if (evilStars[sn] === posIdx && evilStarNames.indexOf(sn) >= 0) {
                    palace.evilStars.push(sn);
                }
            }

            // 收集其他星
            for (var sn in auxStars) {
                if (auxStars[sn] === posIdx && luckyStarNames.indexOf(sn) < 0) {
                    palace.otherStars.push(sn);
                }
            }
            for (var sn in otherStars) {
                if (otherStars[sn] === posIdx && otherStarNames.indexOf(sn) >= 0) {
                    palace.otherStars.push(sn);
                }
            }

            // 收集四化
            if (sihua && sihua.length === 4) {
                var huaTypes = ['化禄','化权','化科','化忌'];
                for (var h = 0; h < 4; h++) {
                    var huaStar = sihua[h];
                    // 检查该星是否在本宫
                    var allStars = palace.mainStars.concat(palace.luckyStars);
                    if (allStars.indexOf(huaStar) >= 0) {
                        palace.sihua.push(huaTypes[h]);
                    }
                }
            }

            palaces.push(palace);
        }

        return palaces;
    }

    // ==================== 大限计算 ====================
    function calcDaXian(mingGongIdx, gender, yearGanIdx) {
        // 阳男阴女顺行，阴男阳女逆行
        var isYangYear = yearGanIdx % 2 === 0;
        var isMale = gender === 1;
        var isForward = (isYangYear && isMale) || (!isYangYear && !isMale);

        // 大限起始年龄（约2岁起运）
        var startAge = 2;

        var daXianList = [];
        for (var i = 0; i < 10; i++) {
            var palaceIdx;
            if (isForward) {
                palaceIdx = i;
            } else {
                palaceIdx = (12 - i) % 12;
            }
            daXianList.push({
                index: i,
                startAge: startAge + i * 10,
                endAge: startAge + (i + 1) * 10 - 1,
                palaceIdx: palaceIdx,
                direction: isForward ? '顺行' : '逆行'
            });
        }

        return {
            isForward: isForward,
            direction: isForward ? '顺行' : '逆行',
            startAge: startAge,
            list: daXianList
        };
    }

    // ==================== 导出 ====================
    return {
        generate: generate,
        PALACE_NAMES: PALACE_NAMES,
        MAIN_STARS: MAIN_STARS,
        LUCKY_STARS: LUCKY_STARS,
        EVIL_STARS: EVIL_STARS,
        OTHER_STARS: OTHER_STARS,
        SI_HUA: SI_HUA,
        TIAN_GAN: TIAN_GAN,
        DI_ZHI: DI_ZHI,
        GAN_WUXING: GAN_WUXING,
        ZHI_WUXING: ZHI_WUXING
    };
})();
