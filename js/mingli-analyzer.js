/**
 * 单人命理专业评测模块 - mingli-analyzer.js
 * 基于《渊海子平》等传统命理典籍，提供格局判断、日主强弱、调候分析、神煞查询、综合评述
 *
 * 依赖：lunar.js（天干地支、五行、藏干等基础数据）
 *
 * 使用方式：
 *   var mlResult = MingliAnalyzer.analyze(baziResult);
 *   // mlResult 包含 geJu, strength, tiaoHou, shenSha, summary, html
 */
var MingliAnalyzer = (function() {
    'use strict';

    // ==================== 基础数据常量 ====================

    // 天干
    var TG = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];

    // 地支
    var DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

    // 天干五行
    var TG_WX = ['木','木','火','火','土','土','金','金','水','水'];

    // 地支五行
    var DZ_WX = ['水','土','木','木','土','火','火','土','金','金','土','水'];

    // 地支藏干（本气、中气、余气）
    var ZHI_CANG_GAN = [
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
        ['壬','甲']       // 亥
    ];

    // 五行生克关系
    var WX_SHENG = { '木':'火', '火':'土', '土':'金', '金':'水', '水':'木' }; // 我生
    var WX_SHENG_ME = { '木':'水', '火':'木', '土':'火', '金':'土', '水':'金' }; // 生我
    var WX_KE = { '木':'土', '火':'金', '土':'水', '金':'木', '水':'火' }; // 我克
    var WX_KE_ME = { '木':'金', '火':'水', '土':'木', '金':'火', '水':'土' }; // 克我
    var WX_TONG = { '木':'木', '火':'火', '土':'土', '金':'金', '水':'水' }; // 同我

    // 五行阴阳对应天干
    var WX_TO_YIN_YANG = {
        '木': ['甲','乙'], '火': ['丙','丁'], '土': ['戊','己'],
        '金': ['庚','辛'], '水': ['壬','癸']
    };

    // 天干阴阳
    var TG_YINYANG = ['阳','阴','阳','阴','阳','阴','阳','阴','阳','阴'];

    // 月支名称（农历月份）
    var MONTH_NAMES = ['寅月(正月)','卯月(二月)','辰月(三月)','巳月(四月)',
                       '午月(五月)','未月(六月)','申月(七月)','酉月(八月)',
                       '戌月(九月)','亥月(十月)','子月(十一月)','丑月(十二月)'];

    // ==================== 1. 格局判断 analyzeGeJu ====================

    /**
     * 根据月令和日主关系判断格局
     * 基于《渊海子平》格局法
     * @param {object} bazi - Bazi.generate() 返回的排盘结果
     * @returns {object} { name, description }
     */
    function analyzeGeJu(bazi) {
        if (!bazi || !bazi.pillars) return { name: '未知', description: '排盘数据不完整' };

        var p = bazi.pillars;
        var dayGanIdx = p.day.ganIndex;
        var dayGan = TG[dayGanIdx];
        var dayWX = TG_WX[dayGanIdx];
        var monthZhiIdx = p.month.zhiIndex;
        var monthZhi = DZ[monthZhiIdx];

        // 取月支藏干本气
        var cangGan = ZHI_CANG_GAN[monthZhiIdx];
        var benQi = cangGan[0]; // 本气
        var benQiWX = TG_WX[TG.indexOf(benQi)];

        // 判断本气与日主的关系
        var relation = getWuXingRelation(dayWX, benQiWX);

        // 检查天干是否透出本气
        var tianGanList = [p.year.gan, p.month.gan, p.day.gan, p.hour.gan];
        var benQiTianGan = tianGanList.indexOf(benQi) !== -1;

        // 检查天干是否透出其他藏干
        var otherCangGanTianGan = null;
        for (var i = 1; i < cangGan.length; i++) {
            if (tianGanList.indexOf(cangGan[i]) !== -1) {
                otherCangGanTianGan = cangGan[i];
                break;
            }
        }

        // 建禄格/羊刃格判断：月支本气就是日主
        if (benQi === dayGan) {
            // 判断是建禄还是羊刃
            var dayGanZhiIdx = TG.indexOf(dayGan);
            // 羊刃：阳干禄位之前一位（即禄位的帝旺位）
            var luZhi = getLuZhi(dayGanIdx);
            if (monthZhiIdx === luZhi) {
                return {
                    name: '建禄格',
                    description: '月令' + monthZhi + '，日主' + dayGan + '，月支本气透出日主，归为建禄格。建禄格者，身旺得令，需看财官食伤之有无以定高低。'
                };
            }
            // 羊刃判断：阳干的羊刃位
            var yangRenZhi = getYangRenZhi(dayGanIdx);
            if (yangRenZhi !== -1 && monthZhiIdx === yangRenZhi) {
                return {
                    name: '羊刃格',
                    description: '月令' + monthZhi + '，日主' + dayGan + '，月支为日主羊刃之地，归为羊刃格。羊刃格者，刚健过旺，宜官杀制之或食伤泄之。'
                };
            }
            return {
                name: '建禄格',
                description: '月令' + monthZhi + '，日主' + dayGan + '，月支本气透出日主，归为建禄格。建禄格者，身旺得令，需看财官食伤之有无以定高低。'
            };
        }

        // 正格/偏格判断
        var geJuName = '';
        var geJuDesc = '';

        // 十神名称映射
        var shiShenMap = {
            '印': { zheng: '正印', pian: '偏印' },
            '食伤': { zheng: '食神', pian: '伤官' },
            '官杀': { zheng: '正官', pian: '七杀' },
            '财': { zheng: '正财', pian: '偏财' },
            '比劫': { zheng: '比肩', pian: '劫财' }
        };

        if (benQiTianGan) {
            // 天干透出本气 → 正格
            geJuName = shiShenMap[relation].zheng;
            geJuDesc = '月令' + monthZhi + '，本气' + benQi + '透出天干，日主' + dayGan + '，归为' + geJuName + '格。';
        } else if (otherCangGanTianGan) {
            // 天干透出其他藏干 → 偏格
            var otherWX = TG_WX[TG.indexOf(otherCangGanTianGan)];
            var otherRelation = getWuXingRelation(dayWX, otherWX);
            geJuName = shiShenMap[otherRelation].pian;
            geJuDesc = '月令' + monthZhi + '，中余气' + otherCangGanTianGan + '透出天干，日主' + dayGan + '，归为' + geJuName + '格。';
        } else {
            // 藏干均未透出天干，以本气取格
            geJuName = shiShenMap[relation].zheng;
            geJuDesc = '月令' + monthZhi + '，本气' + benQi + '未透天干，以本气取格，日主' + dayGan + '，归为' + geJuName + '格。';
        }

        // 附加格局特征描述
        var extraDesc = getGeJuExtraDesc(geJuName, dayGan, dayWX);
        geJuDesc += extraDesc;

        return { name: geJuName, description: geJuDesc };
    }

    /**
     * 获取五行关系名称
     */
    function getWuXingRelation(myWX, otherWX) {
        if (WX_SHENG_ME[myWX] === otherWX) return '印';
        if (WX_SHENG[myWX] === otherWX) return '食伤';
        if (WX_KE_ME[myWX] === otherWX) return '官杀';
        if (WX_KE[myWX] === otherWX) return '财';
        if (WX_TONG[myWX] === otherWX) return '比劫';
        return '未知';
    }

    /**
     * 获取禄神对应的地支索引
     */
    function getLuZhi(ganIdx) {
        var luMap = { 0:2, 1:3, 2:5, 3:6, 4:5, 5:6, 6:8, 7:9, 8:10, 9:0 };
        return luMap[ganIdx] !== undefined ? luMap[ganIdx] : -1;
    }

    /**
     * 获取羊刃对应的地支索引（仅阳干有羊刃）
     */
    function getYangRenZhi(ganIdx) {
        // 阳干羊刃 = 禄位 + 1（即帝旺位）
        var luZhi = getLuZhi(ganIdx);
        if (TG_YINYANG[ganIdx] === '阳' && luZhi !== -1) {
            return (luZhi + 1) % 12;
        }
        return -1;
    }

    /**
     * 格局附加描述
     */
    function getGeJuExtraDesc(geJuName, dayGan, dayWX) {
        var descMap = {
            '正官格': '正官主贵，为人端正守规，有管理才能，宜从事行政、管理类事业。',
            '七杀格': '七杀主威，性格刚毅果断，有魄力有胆识，宜从事军警、竞技类事业。',
            '正印格': '正印主文，为人聪慧仁慈，好学善思，宜从事教育、文化类事业。',
            '偏印格': '偏印主奇，思维独特，善于钻研，宜从事技术、研究、创意类事业。',
            '正财格': '正财主富，为人勤恳务实，善于理财，宜从事商业、金融类事业。',
            '偏财格': '偏财主缘，为人豪爽大方，交际广泛，宜从事贸易、社交类事业。',
            '食神格': '食神主福，性情温和有福气，善于享受生活，多才多艺。',
            '伤官格': '伤官主秀，才华横溢，口才出众，宜从事艺术、演艺类事业。',
            '比肩格': '比肩主助，性格独立自主，有合作精神，适合合伙经营。',
            '劫财格': '劫财主动，精力旺盛，行动力强，宜从事开拓性事业。',
            '建禄格': '',
            '羊刃格': ''
        };
        return descMap[geJuName] || '';
    }

    // ==================== 2. 日主强弱与喜忌 analyzeStrength ====================

    /**
     * 分析日主强弱，推算喜用神和忌神
     * @param {object} bazi - Bazi.generate() 返回的排盘结果
     * @returns {object} { score, level, xiYong, jiShen, description }
     */
    function analyzeStrength(bazi) {
        if (!bazi || !bazi.pillars) return { score: 50, level: '中和', xiYong: [], jiShen: [], description: '排盘数据不完整' };

        var p = bazi.pillars;
        var dayGanIdx = p.day.ganIndex;
        var dayGan = TG[dayGanIdx];
        var dayWX = TG_WX[dayGanIdx];

        var score = 0;

        // (1) 得月令 (40%)
        var monthWX = DZ_WX[p.month.zhiIndex];
        var monthCangGan = ZHI_CANG_GAN[p.month.zhiIndex];
        var monthBenQiWX = TG_WX[TG.indexOf(monthCangGan[0])];

        if (monthBenQiWX === dayWX) {
            score += 40; // 月令本气与日主同五行
        } else if (WX_SHENG_ME[dayWX] === monthBenQiWX) {
            score += 30; // 月令本气生日主
        } else if (WX_SHENG[dayWX] === monthBenQiWX) {
            score -= 10; // 月令本气泄日主
        } else if (WX_KE_ME[dayWX] === monthBenQiWX) {
            score -= 20; // 月令本气克日主
        } else if (WX_KE[dayWX] === monthBenQiWX) {
            score -= 15; // 日主克月令本气（耗力）
        }

        // (2) 天干得势 (30%)
        var tianGanList = [
            { gan: p.year.gan, idx: p.year.ganIndex },
            { gan: p.month.gan, idx: p.month.ganIndex },
            { gan: p.hour.gan, idx: p.hour.ganIndex }
        ]; // 排除日干自身
        var tianGanScore = 0;
        tianGanList.forEach(function(item) {
            var itemWX = TG_WX[item.idx];
            if (itemWX === dayWX) {
                tianGanScore += 10; // 比劫帮身
            } else if (WX_SHENG_ME[dayWX] === itemWX) {
                tianGanScore += 8; // 印星生身
            }
        });
        tianGanScore = Math.min(tianGanScore, 30);
        score += tianGanScore;

        // (3) 地支通根 (30%)
        var diZhiList = [
            p.year.zhiIndex,
            p.day.zhiIndex,
            p.hour.zhiIndex
        ]; // 排除月支（已在月令中计算）
        var diZhiScore = 0;
        diZhiList.forEach(function(zhiIdx) {
            var cangGan = ZHI_CANG_GAN[zhiIdx];
            cangGan.forEach(function(cg) {
                var cgWX = TG_WX[TG.indexOf(cg)];
                if (cgWX === dayWX) {
                    diZhiScore += 5; // 藏干中有日主五行
                } else if (WX_SHENG_ME[dayWX] === cgWX) {
                    diZhiScore += 3; // 藏干中有生日主的五行
                }
            });
        });
        diZhiScore = Math.min(diZhiScore, 30);
        score += diZhiScore;

        // 限制分数范围
        score = Math.max(0, Math.min(100, score));

        // 判断身强/中和/身弱
        var level = '';
        if (score > 60) {
            level = '身强';
        } else if (score >= 40) {
            level = '中和';
        } else {
            level = '身弱';
        }

        // 推算喜用神和忌神
        var xiYong = [];
        var jiShen = [];

        if (level === '身弱') {
            // 身弱喜印比（生扶日主的五行）
            xiYong.push(WX_SHENG_ME[dayWX]); // 印星（生我者）
            xiYong.push(dayWX); // 比劫（同我者）
            // 忌神：克泄耗
            jiShen.push(WX_KE_ME[dayWX]); // 官杀（克我者）
            jiShen.push(WX_SHENG[dayWX]); // 食伤（我生者，泄气）
            jiShen.push(WX_KE[dayWX]); // 财星（我克者，耗力）
        } else if (level === '身强') {
            // 身强喜食伤财（泄耗日主的五行）
            xiYong.push(WX_SHENG[dayWX]); // 食伤（泄秀）
            xiYong.push(WX_KE[dayWX]); // 财星（耗力）
            xiYong.push(WX_KE_ME[dayWX]); // 官杀（克身）
            // 忌神：生扶
            jiShen.push(WX_SHENG_ME[dayWX]); // 印星
            jiShen.push(dayWX); // 比劫
        } else {
            // 中和：看格局需要，一般喜财官
            xiYong.push(WX_KE[dayWX]); // 财星
            xiYong.push(WX_KE_ME[dayWX]); // 官杀
            jiShen = [];
        }

        // 去重
        xiYong = uniqueArray(xiYong);
        jiShen = uniqueArray(jiShen);

        var description = '日主' + dayGan + '（' + dayWX + '），综合评分' + score + '分，' +
            level + '。' +
            (level === '身强' ? '日主得令得势，力量充沛，宜泄耗为宜。' :
             level === '身弱' ? '日主力量不足，宜生扶为要。' :
             '日主力量均衡，进退自如。') +
            '喜用神：' + xiYong.join('、') +
            (jiShen.length > 0 ? '；忌神：' + jiShen.join('、') : '。');

        return {
            score: score,
            level: level,
            xiYong: xiYong,
            jiShen: jiShen,
            description: description
        };
    }

    // ==================== 3. 五行调候分析 analyzeTiaoHou ====================

    /**
     * 五行调候分析
     * 根据出生月份和日主五行，判断命局是否需要调候
     * @param {object} bazi - Bazi.generate() 返回的排盘结果
     * @returns {object} { need, reason, description }
     */
    function analyzeTiaoHou(bazi) {
        if (!bazi || !bazi.pillars) return { need: '', reason: '排盘数据不完整', description: '' };

        var p = bazi.pillars;
        var dayGanIdx = p.day.ganIndex;
        var dayGan = TG[dayGanIdx];
        var dayWX = TG_WX[dayGanIdx];
        var monthZhiIdx = p.month.zhiIndex;
        var monthZhi = DZ[monthZhiIdx];
        var monthName = MONTH_NAMES[monthZhiIdx] || monthZhi + '月';

        // 调候规则表：月支索引 → { need: 需要的五行, reason: 原因 }
        // 简化版调候，主要考虑月份气候特征
        var tiaoHouRules = {
            2:  { need: '火', reason: '生于寅月(正月)，初春木旺金寒，气候尚寒，命局需火调候暖局。' },
            3:  { need: '金', reason: '生于卯月(二月)，仲春木旺，需金克木或火泄木以调候。' },
            4:  { need: '木', reason: '生于辰月(三月)，季春土旺，需木疏土以调候。' },
            5:  { need: '水', reason: '生于巳月(四月)，初夏火旺，命局渐热，需水调候降温。' },
            6:  { need: '水', reason: '生于午月(五月)，仲夏火旺极，气候炎热，急需水调候润局。' },
            7:  { need: '水', reason: '生于未月(六月)，季夏土燥，气候偏燥，需水润泽调候。' },
            8:  { need: '火', reason: '生于申月(七月)，初秋金旺，气候转凉，需火炼金暖局。' },
            9:  { need: '火', reason: '生于酉月(八月)，仲秋金旺，气候偏凉，需火炼金或水洗金。' },
            10: { need: '水', reason: '生于戌月(九月)，深秋土燥，气候干燥，需水润泽调候。' },
            11: { need: '木', reason: '生于亥月(十月)，初冬水旺，气候寒冷，需木泄水或火暖局。' },
            0:  { need: '火', reason: '生于子月(十一月)，仲冬水旺极，严寒之际，急需火暖调候。' },
            1:  { need: '火', reason: '生于丑月(十二月)，季冬寒湿，气候极寒，需火调候去寒。' }
        };

        var rule = tiaoHouRules[monthZhiIdx];
        if (!rule) {
            return { need: '', reason: '暂无调候建议', description: '' };
        }

        // 检查命局中是否已有足够的调候五行
        var tianGanList = [p.year.gan, p.month.gan, p.day.gan, p.hour.gan];
        var diZhiList = [p.year.zhiIndex, p.month.zhiIndex, p.day.zhiIndex, p.hour.zhiIndex];
        var needCount = 0;

        tianGanList.forEach(function(gan) {
            if (TG_WX[TG.indexOf(gan)] === rule.need) needCount++;
        });
        diZhiList.forEach(function(zhiIdx) {
            if (DZ_WX[zhiIdx] === rule.need) needCount++;
            // 藏干中也检查
            ZHI_CANG_GAN[zhiIdx].forEach(function(cg) {
                if (TG_WX[TG.indexOf(cg)] === rule.need) needCount += 0.5;
            });
        });

        var isSufficient = needCount >= 2;
        var description = rule.reason;
        if (isSufficient) {
            description += '命局中' + rule.need + '已有' + Math.round(needCount) + '个，调候基本充足。';
        } else {
            description += '命局中' + rule.need + '仅有' + Math.round(needCount) + '个，调候略显不足，宜在取名、择方等方面适当补充' + rule.need + '的元素。';
        }

        return {
            need: rule.need,
            sufficient: isSufficient,
            needCount: Math.round(needCount),
            reason: rule.reason,
            description: description
        };
    }

    // ==================== 4. 神煞查询 queryShenSha ====================

    /**
     * 查询命局中的神煞
     * @param {object} bazi - Bazi.generate() 返回的排盘结果
     * @returns {object} { list: [{name, value, source}] }
     */
    function queryShenSha(bazi) {
        if (!bazi || !bazi.pillars) return { list: [] };

        var p = bazi.pillars;
        var dayGanIdx = p.day.ganIndex;
        var yearZhiIdx = p.year.zhiIndex;
        var monthZhiIdx = p.month.zhiIndex;
        var list = [];

        // --- 天乙贵人（以日干查） ---
        var tianYiMap = {
            0: ['丑','未'], // 甲戊庚牛羊
            4: ['丑','未'],
            6: ['丑','未'],
            1: ['子','申'], // 乙己鼠猴乡
            5: ['子','申'],
            2: ['亥','酉'], // 丙丁猪鸡位
            3: ['亥','酉'],
            8: ['卯','巳'], // 壬癸兔蛇藏
            9: ['卯','巳'],
            7: ['午','寅']  // 六辛逢马虎
        };
        var tianYiZhi = tianYiMap[dayGanIdx];
        if (tianYiZhi) {
            var tianYiFound = [];
            var allZhi = [p.year.zhi, p.month.zhi, p.day.zhi, p.hour.zhi];
            tianYiZhi.forEach(function(z) {
                if (allZhi.indexOf(z) !== -1) tianYiFound.push(z);
            });
            if (tianYiFound.length > 0) {
                list.push({ name: '天乙贵人', value: tianYiFound.join('、'), source: '日干' + TG[dayGanIdx] + '查' });
            }
        }

        // --- 文昌（以日干查） ---
        var wenChangMap = {
            0: ['巳','午'], // 甲己巳午（注：传统口诀中甲己不同，此处按常见版本）
            5: ['巳','午'],
            1: ['申','子'], // 乙己申子（乙）
            2: ['寅','辰'], // 丙戊寅辰
            4: ['寅','辰'],
            3: ['酉','亥'], // 丁酉亥
            6: ['丑','未'], // 庚丑未
            7: ['寅','午'], // 辛寅午
            8: ['卯','巳'], // 壬卯巳
            9: ['辰','午']  // 癸辰午
        };
        var wenChangZhi = wenChangMap[dayGanIdx];
        if (wenChangZhi) {
            var wenChangFound = [];
            var allZhi2 = [p.year.zhi, p.month.zhi, p.day.zhi, p.hour.zhi];
            wenChangZhi.forEach(function(z) {
                if (allZhi2.indexOf(z) !== -1) wenChangFound.push(z);
            });
            if (wenChangFound.length > 0) {
                list.push({ name: '文昌', value: wenChangFound.join('、'), source: '日干' + TG[dayGanIdx] + '查' });
            }
        }

        // --- 禄神（以日干查） ---
        var luMap = {
            0: '寅', 1: '卯', 2: '巳', 3: '午',
            4: '巳', 5: '午', 6: '申', 7: '酉',
            8: '亥', 9: '子'
        };
        var luZhiName = luMap[dayGanIdx];
        if (luZhiName) {
            var allZhi3 = [p.year.zhi, p.month.zhi, p.day.zhi, p.hour.zhi];
            if (allZhi3.indexOf(luZhiName) !== -1) {
                list.push({ name: '禄神', value: luZhiName, source: '日干' + TG[dayGanIdx] + '查' });
            }
        }

        // --- 桃花（以年支查） ---
        var taoHuaGroups = {
            2: '卯', 6: '卯', 10: '卯',  // 寅午戌见卯
            5: '午', 9: '午', 1: '午',   // 巳酉丑见午
            8: '酉', 0: '酉', 4: '酉',   // 申子辰见酉
            11: '子', 3: '子', 7: '子'   // 亥卯未见子
        };
        var taoHuaZhi = taoHuaGroups[yearZhiIdx];
        if (taoHuaZhi) {
            var allZhi4 = [p.year.zhi, p.month.zhi, p.day.zhi, p.hour.zhi];
            if (allZhi4.indexOf(taoHuaZhi) !== -1) {
                list.push({ name: '桃花', value: taoHuaZhi, source: '年支' + DZ[yearZhiIdx] + '查' });
            }
        }

        // --- 驿马（以年支查） ---
        var yiMaGroups = {
            2: '申', 6: '申', 10: '申',  // 寅午戌见申
            5: '亥', 9: '亥', 1: '亥',   // 巳酉丑见亥
            8: '寅', 0: '寅', 4: '寅',   // 申子辰见寅
            11: '巳', 3: '巳', 7: '巳'   // 亥卯未见巳
        };
        var yiMaZhi = yiMaGroups[yearZhiIdx];
        if (yiMaZhi) {
            var allZhi5 = [p.year.zhi, p.month.zhi, p.day.zhi, p.hour.zhi];
            if (allZhi5.indexOf(yiMaZhi) !== -1) {
                list.push({ name: '驿马', value: yiMaZhi, source: '年支' + DZ[yearZhiIdx] + '查' });
            }
        }

        // --- 华盖（以年支查） ---
        var huaGaiGroups = {
            2: '戌', 6: '戌', 10: '戌',  // 寅午戌见戌
            5: '丑', 9: '丑', 1: '丑',   // 巳酉丑见丑
            8: '辰', 0: '辰', 4: '辰',   // 申子辰见辰
            11: '未', 3: '未', 7: '未'   // 亥卯未见未
        };
        var huaGaiZhi = huaGaiGroups[yearZhiIdx];
        if (huaGaiZhi) {
            var allZhi6 = [p.year.zhi, p.month.zhi, p.day.zhi, p.hour.zhi];
            if (allZhi6.indexOf(huaGaiZhi) !== -1) {
                list.push({ name: '华盖', value: huaGaiZhi, source: '年支' + DZ[yearZhiIdx] + '查' });
            }
        }

        // --- 将星（以年支查） ---
        var jiangXingGroups = {
            2: '午', 6: '午', 10: '午',  // 寅午戌见午
            5: '酉', 9: '酉', 1: '酉',   // 巳酉丑见酉
            8: '子', 0: '子', 4: '子',   // 申子辰见子
            11: '卯', 3: '卯', 7: '卯'   // 亥卯未见卯
        };
        var jiangXingZhi = jiangXingGroups[yearZhiIdx];
        if (jiangXingZhi) {
            var allZhi7 = [p.year.zhi, p.month.zhi, p.day.zhi, p.hour.zhi];
            if (allZhi7.indexOf(jiangXingZhi) !== -1) {
                list.push({ name: '将星', value: jiangXingZhi, source: '年支' + DZ[yearZhiIdx] + '查' });
            }
        }

        // --- 天德（以月支查） ---
        var tianDeMap = {
            2: '丁', 3: '申', 4: '壬', 5: '辛',
            6: '亥', 7: '甲', 8: '癸', 9: '寅',
            10: '丙', 11: '乙', 0: '巳', 1: '庚'
        };
        var tianDeGan = tianDeMap[monthZhiIdx];
        if (tianDeGan) {
            var allGan = [p.year.gan, p.month.gan, p.day.gan, p.hour.gan];
            if (allGan.indexOf(tianDeGan) !== -1) {
                list.push({ name: '天德', value: tianDeGan, source: '月支' + DZ[monthZhiIdx] + '查' });
            }
        }

        // --- 月德（以月支查） ---
        var yueDeMap = {
            2: '丙', 3: '甲', 4: '壬', 5: '庚',
            6: '丁', 7: '乙', 8: '丙', 9: '甲',
            10: '壬', 11: '丁', 0: '乙', 1: '庚'
        };
        var yueDeGan = yueDeMap[monthZhiIdx];
        if (yueDeGan) {
            var allGan2 = [p.year.gan, p.month.gan, p.day.gan, p.hour.gan];
            if (allGan2.indexOf(yueDeGan) !== -1) {
                list.push({ name: '月德', value: yueDeGan, source: '月支' + DZ[monthZhiIdx] + '查' });
            }
        }

        return { list: list };
    }

    // ==================== 5. 综合评述 generateSummary ====================

    /**
     * 生成综合评述
     * @param {object} geJu - analyzeGeJu 返回值
     * @param {object} strength - analyzeStrength 返回值
     * @param {object} tiaoHou - analyzeTiaoHou 返回值
     * @param {object} shenSha - queryShenSha 返回值
     * @param {object} bazi - 原始排盘结果
     * @returns {string} 综合评述文字
     */
    function generateSummary(geJu, strength, tiaoHou, shenSha, bazi) {
        if (!bazi || !bazi.pillars) return '排盘数据不完整，无法生成综合评述。';

        var p = bazi.pillars;
        var dayGan = p.day.gan;
        var dayWX = TG_WX[p.day.ganIndex];
        var monthZhi = p.month.zhi;
        var monthZhiIdx = p.month.zhiIndex;
        var monthName = MONTH_NAMES[monthZhiIdx] || monthZhi + '月';

        var lines = [];

        // 开篇总述
        lines.push('命主日干为' + dayGan + '（' + dayWX + '），生于' + monthName + '。');

        // 格局描述
        if (geJu && geJu.name) {
            lines.push('【格局判断】' + geJu.description);
        }

        // 强弱喜忌描述
        if (strength) {
            lines.push('【日主强弱与喜忌】' + strength.description);
        }

        // 调候描述
        if (tiaoHou && tiaoHou.description) {
            lines.push('【五行调候】' + tiaoHou.description);
        }

        // 神煞描述
        if (shenSha && shenSha.list && shenSha.list.length > 0) {
            var ssNames = shenSha.list.map(function(s) { return s.name + '(' + s.value + ')'; });
            lines.push('【神煞】命局见' + ssNames.join('、') + '。');
        } else {
            lines.push('【神煞】命局中未查到常见神煞。');
        }

        // 综合建议
        lines.push('【综合建议】');
        if (strength) {
            if (strength.level === '身弱') {
                lines.push('日主偏弱，宜多亲近印星（' + (strength.xiYong[0] || '') + '）和比劫（' + (strength.xiYong[1] || '') + '）五行相关的事物，如颜色、方位、行业等，以增强自身力量。');
            } else if (strength.level === '身强') {
                lines.push('日主偏强，宜多亲近食伤（' + (strength.xiYong[0] || '') + '）和财星（' + (strength.xiYong[1] || '') + '）五行相关的事物，以泄耗过旺之气，平衡命局。');
            } else {
                lines.push('日主中和，五行较为均衡，进退有度，可依格局需要灵活调整。');
            }
        }

        if (tiaoHou && tiaoHou.need && !tiaoHou.sufficient) {
            lines.push('命局调候略显不足，可在日常生活中适当增加' + tiaoHou.need + '属性的事物，有助于调和命局气候。');
        }

        // 免责声明
        lines.push('');
        lines.push('以上为传统命理文化推演，仅供了解参考，不构成任何人生决策依据。');

        return lines.join('\n');
    }

    // ==================== 6. 统一入口 analyze ====================

    /**
     * 统一分析入口
     * @param {object} bazi - Bazi.generate() 返回的排盘结果
     * @returns {object} { geJu, strength, tiaoHou, shenSha, summary, html }
     */
    function analyze(bazi) {
        var geJu = analyzeGeJu(bazi);
        var strength = analyzeStrength(bazi);
        var tiaoHou = analyzeTiaoHou(bazi);
        var shenSha = queryShenSha(bazi);
        var summary = generateSummary(geJu, strength, tiaoHou, shenSha, bazi);
        var html = renderAnalysisHTML(geJu, strength, tiaoHou, shenSha, summary);

        return {
            geJu: geJu,
            strength: strength,
            tiaoHou: tiaoHou,
            shenSha: shenSha,
            summary: summary,
            html: html
        };
    }

    // ==================== 7. HTML 渲染 ====================

    /**
     * 渲染命理分析结果为HTML
     */
    function renderAnalysisHTML(geJu, strength, tiaoHou, shenSha, summary) {
        var html = '';
        html += '<div class="result-card mingli-analysis-card" style="margin-top:12px;padding:16px;background:var(--bg-card,#FFFCF5);border:1px solid var(--border-color,#D4C5A0);border-radius:10px;">';
        html += '<div class="result-title" style="font-size:16px;font-weight:bold;color:var(--red-primary,#A81216);margin-bottom:12px;text-align:center;letter-spacing:2px;">命理专业评测</div>';

        // 格局判断
        html += '<div style="margin-bottom:14px;">';
        html += '<div style="font-size:14px;font-weight:bold;color:var(--text-primary,#3D2B1F);margin-bottom:6px;padding-bottom:4px;border-bottom:1px dashed var(--border-color,#D4C5A0);">【格局判断】</div>';
        html += '<div style="display:inline-block;background:linear-gradient(135deg,#A81216,#8B4513);color:#fff;padding:4px 14px;border-radius:20px;font-size:15px;font-weight:bold;margin-bottom:8px;">' + escapeHtml(geJu.name) + '</div>';
        html += '<div style="font-size:13px;color:var(--text-secondary,#6B5B4E);line-height:1.8;">' + escapeHtml(geJu.description) + '</div>';
        html += '</div>';

        // 日主强弱与喜忌
        html += '<div style="margin-bottom:14px;">';
        html += '<div style="font-size:14px;font-weight:bold;color:var(--text-primary,#3D2B1F);margin-bottom:6px;padding-bottom:4px;border-bottom:1px dashed var(--border-color,#D4C5A0);">【日主强弱与喜忌】</div>';
        // 强弱指示条
        var barColor = strength.level === '身强' ? '#4A7C59' : (strength.level === '身弱' ? '#A81216' : '#C8A84E');
        html += '<div style="display:flex;align-items:center;margin-bottom:8px;">';
        html += '<span style="font-size:13px;color:var(--text-secondary,#6B5B4E);min-width:50px;">' + escapeHtml(strength.level) + '</span>';
        html += '<div style="flex:1;height:8px;background:#e8e0d0;border-radius:4px;overflow:hidden;">';
        html += '<div style="width:' + strength.score + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width 0.3s;"></div>';
        html += '</div>';
        html += '<span style="font-size:12px;color:var(--text-light,#8C7B6B);min-width:36px;text-align:right;">' + strength.score + '分</span>';
        html += '</div>';
        // 喜用神/忌神标签
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">';
        strength.xiYong.forEach(function(wx) {
            html += '<span style="display:inline-block;padding:2px 10px;background:#E8F5E9;color:#4A7C59;border-radius:12px;font-size:12px;">喜 ' + escapeHtml(wx) + '</span>';
        });
        strength.jiShen.forEach(function(wx) {
            html += '<span style="display:inline-block;padding:2px 10px;background:#FFEBEE;color:#A81216;border-radius:12px;font-size:12px;">忌 ' + escapeHtml(wx) + '</span>';
        });
        html += '</div>';
        html += '<div style="font-size:13px;color:var(--text-secondary,#6B5B4E);line-height:1.8;">' + escapeHtml(strength.description) + '</div>';
        html += '</div>';

        // 五行调候
        html += '<div style="margin-bottom:14px;">';
        html += '<div style="font-size:14px;font-weight:bold;color:var(--text-primary,#3D2B1F);margin-bottom:6px;padding-bottom:4px;border-bottom:1px dashed var(--border-color,#D4C5A0);">【五行调候】</div>';
        if (tiaoHou.need) {
            var tiaoHouColor = tiaoHou.sufficient ? '#4A7C59' : '#C8A84E';
            html += '<div style="display:inline-block;padding:2px 10px;background:' + tiaoHouColor + '22;color:' + tiaoHouColor + ';border:1px solid ' + tiaoHouColor + ';border-radius:12px;font-size:12px;margin-bottom:6px;">调候需' + escapeHtml(tiaoHou.need) + (tiaoHou.sufficient ? '（已足）' : '（不足）') + '</div>';
        }
        html += '<div style="font-size:13px;color:var(--text-secondary,#6B5B4E);line-height:1.8;">' + escapeHtml(tiaoHou.description) + '</div>';
        html += '</div>';

        // 神煞
        html += '<div style="margin-bottom:14px;">';
        html += '<div style="font-size:14px;font-weight:bold;color:var(--text-primary,#3D2B1F);margin-bottom:6px;padding-bottom:4px;border-bottom:1px dashed var(--border-color,#D4C5A0);">【神煞】</div>';
        if (shenSha.list && shenSha.list.length > 0) {
            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">';
            shenSha.list.forEach(function(ss) {
                html += '<span style="display:inline-block;padding:3px 10px;background:linear-gradient(135deg,#FFF8EE,#F5F0E8);border:1px solid var(--border-color,#D4C5A0);border-radius:12px;font-size:12px;color:var(--text-primary,#3D2B1F);">' + escapeHtml(ss.name) + '：' + escapeHtml(ss.value) + '</span>';
            });
            html += '</div>';
            html += '<div style="font-size:12px;color:var(--text-light,#8C7B6B);">查得' + shenSha.list.length + '项神煞</div>';
        } else {
            html += '<div style="font-size:13px;color:var(--text-secondary,#6B5B4E);">命局中未查到常见神煞。</div>';
        }
        html += '</div>';

        // 综合评述
        html += '<div style="margin-bottom:8px;">';
        html += '<div style="font-size:14px;font-weight:bold;color:var(--text-primary,#3D2B1F);margin-bottom:6px;padding-bottom:4px;border-bottom:1px dashed var(--border-color,#D4C5A0);">【综合评述】</div>';
        var summaryLines = summary.split('\n');
        summaryLines.forEach(function(line) {
            if (line.indexOf('【') === 0) {
                html += '<div style="font-size:13px;font-weight:bold;color:var(--text-primary,#3D2B1F);margin-top:6px;">' + escapeHtml(line) + '</div>';
            } else if (line === '') {
                html += '<br>';
            } else {
                html += '<div style="font-size:13px;color:var(--text-secondary,#6B5B4E);line-height:1.8;">' + escapeHtml(line) + '</div>';
            }
        });
        html += '</div>';

        html += '</div>';
        return html;
    }

    // ==================== 工具函数 ====================

    function uniqueArray(arr) {
        var seen = {};
        var result = [];
        arr.forEach(function(item) {
            if (item && !seen[item]) {
                seen[item] = true;
                result.push(item);
            }
        });
        return result;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ==================== 导出 ====================
    return {
        analyze: analyze,
        analyzeGeJu: analyzeGeJu,
        analyzeStrength: analyzeStrength,
        analyzeTiaoHou: analyzeTiaoHou,
        queryShenSha: queryShenSha,
        generateSummary: generateSummary
    };

})();
