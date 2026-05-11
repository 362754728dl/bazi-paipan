/**
 * 天干地支关系分析器
 * 统一分析天干和地支的各种关系
 * 所有页面共用此分析器，确保逻辑一致
 */

const RelationAnalyzer = (function() {
    'use strict';

    // ==================== 天干数据 ====================
    const tianGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const tianGanWuXing = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];

    // 天干四冲
    const tianGanSiChong = [
        ['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸']
    ];

    // 天干五合
    const tianGanWuHe = [
        { pair: ['甲', '己'], result: '土', name: '甲己合土' },
        { pair: ['乙', '庚'], result: '金', name: '乙庚合金' },
        { pair: ['丙', '辛'], result: '水', name: '丙辛合水' },
        { pair: ['丁', '壬'], result: '木', name: '丁壬合木' },
        { pair: ['戊', '癸'], result: '火', name: '戊癸合火' }
    ];

    // ==================== 地支数据 ====================
    const diZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const diZhiWuXing = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

    // 地支三会（严格要求三个字全齐）
    const diZhiSanHui = [
        { name: '寅卯辰三会东方木', zhi: ['寅', '卯', '辰'], wx: '木' },
        { name: '巳午未三会南方火', zhi: ['巳', '午', '未'], wx: '火' },
        { name: '申酉戌三会西方金', zhi: ['申', '酉', '戌'], wx: '金' },
        { name: '亥子丑三会北方水', zhi: ['亥', '子', '丑'], wx: '水' }
    ];

    // 地支三合（含完整三合 + 半合定义）
    // 每组：zhi[0]=长生, zhi[1]=帝旺, zhi[2]=墓库
    const diZhiSanHe = [
        { name: '申子辰三合水局', zhi: ['申', '子', '辰'], wx: '水', shengDi: ['申', '子'], muKu: ['子', '辰'] },
        { name: '寅午戌三合火局', zhi: ['寅', '午', '戌'], wx: '火', shengDi: ['寅', '午'], muKu: ['午', '戌'] },
        { name: '巳酉丑三合金局', zhi: ['巳', '酉', '丑'], wx: '金', shengDi: ['巳', '酉'], muKu: ['酉', '丑'] },
        { name: '亥卯未三合木局', zhi: ['亥', '卯', '未'], wx: '木', shengDi: ['亥', '卯'], muKu: ['卯', '未'] }
    ];

    // 地支六合
    const diZhiLiuHe = [
        { name: '子丑合土', pair: ['子', '丑'], wx: '土' },
        { name: '寅亥合木', pair: ['寅', '亥'], wx: '木' },
        { name: '卯戌合火', pair: ['卯', '戌'], wx: '火' },
        { name: '辰酉合金', pair: ['辰', '酉'], wx: '金' },
        { name: '巳申合水', pair: ['巳', '申'], wx: '水' },
        { name: '午未合土', pair: ['午', '未'], wx: '土' }
    ];

    // 地支六冲
    const diZhiLiuChong = [
        { name: '子午冲', pair: ['子', '午'] },
        { name: '丑未冲', pair: ['丑', '未'] },
        { name: '寅申冲', pair: ['寅', '申'] },
        { name: '卯酉冲', pair: ['卯', '酉'] },
        { name: '辰戌冲', pair: ['辰', '戌'] },
        { name: '巳亥冲', pair: ['巳', '亥'] }
    ];

    // 地支六害
    const diZhiLiuHai = [
        { name: '子未害', pair: ['子', '未'] },
        { name: '丑午害', pair: ['丑', '午'] },
        { name: '寅巳害', pair: ['寅', '巳'] },
        { name: '卯辰害', pair: ['卯', '辰'] },
        { name: '申亥害', pair: ['申', '亥'] },
        { name: '酉戌害', pair: ['酉', '戌'] }
    ];

    // 地支六破
    const diZhiLiuPo = [
        { name: '子酉破', pair: ['子', '酉'] },
        { name: '丑辰破', pair: ['丑', '辰'] },
        { name: '寅亥破', pair: ['寅', '亥'] },
        { name: '卯午破', pair: ['卯', '午'] },
        { name: '巳申破', pair: ['巳', '申'] },
        { name: '未戌破', pair: ['未', '戌'] }
    ];

    // 地支三刑
    const diZhiSanXing = [
        { name: '寅巳申三刑', zhi: ['寅', '巳', '申'], type: '无恩之刑' },
        { name: '丑戌未三刑', zhi: ['丑', '戌', '未'], type: '恃势之刑' },
        { name: '子卯刑', zhi: ['子', '卯'], type: '无礼之刑' }
    ];

    // ==================== 核心分析函数 ====================

    /**
     * 分析八字中的天干关系
     * 天干四冲/五合：双方都必须实际存在于天干列表中
     * 重复天干只算一个（用集合去重）
     */
    function analyzeTianGanRelations(ganList) {
        const results = [];
        const positions = ['年', '月', '日', '时'];

        // 用集合去重：重复天干只算一个
        const ganSet = [...new Set(ganList)];

        // 检查所有天干两两关系
        for (let i = 0; i < ganSet.length; i++) {
            for (let j = i + 1; j < ganSet.length; j++) {
                const gan1 = ganSet[i];
                const gan2 = ganSet[j];

                // 检查相冲
                const chong = checkTianGanChong(gan1, gan2);
                if (chong) {
                    // 找到在原始列表中的位置
                    const pos1 = positions[ganList.indexOf(gan1)];
                    const pos2 = positions[ganList.indexOf(gan2)];
                    results.push({
                        ...chong,
                        gan1: gan1,
                        gan2: gan2,
                        pos1: pos1,
                        pos2: pos2,
                        category: '冲'
                    });
                }

                // 检查相合
                const he = checkTianGanHe(gan1, gan2);
                if (he) {
                    const pos1 = positions[ganList.indexOf(gan1)];
                    const pos2 = positions[ganList.indexOf(gan2)];
                    results.push({
                        ...he,
                        gan1: gan1,
                        gan2: gan2,
                        pos1: pos1,
                        pos2: pos2,
                        category: '合'
                    });
                }
            }
        }

        return results;
    }

    /**
     * 分析八字中的地支关系
     * 三合：完整三合(3字全齐) / 生地半合(缺墓库) / 墓库半合(缺长生)
     * 三会：严格要求3字全齐，无半会
     * 其他：双方都必须存在于地支集合中
     */
    function analyzeDiZhiRelations(zhiList) {
        const results = [];
        const positions = ['年', '月', '日', '时'];

        // 用集合去重：重复地支只算一个（用于三合三会等组合判断）
        const zhiSet = [...new Set(zhiList)];

        // 0. 检查自刑（同一地支出现2次及以上）
        const zhiCount = {};
        zhiList.forEach(function(z) { zhiCount[z] = (zhiCount[z] || 0) + 1; });
        const selfXingZhi = ['辰', '酉', '午', '亥']; // 四个自刑地支
        selfXingZhi.forEach(function(z) {
            if (zhiCount[z] >= 2) {
                const posArr = [];
                zhiList.forEach(function(zz, idx) { if (zz === z) posArr.push(positions[idx]); });
                results.push({
                    type: 'zixing',
                    name: z + z + '自刑',
                    display: '[自刑] ' + z + z + '自刑',
                    zhi: [z],
                    positions: posArr,
                    category: '自刑',
                    strength: 8
                });
            }
        });

        // 1. 检查三刑（力量最大）
        // 无恩之刑(寅巳申)和恃势之刑(丑戌未)：必须三字全齐
        // 无礼之刑(子卯)：两字同时存在即可
        for (let xing of diZhiSanXing) {
            const matched = xing.zhi.filter(z => zhiSet.includes(z));
            const requireAll = xing.zhi.length === 3; // 三字刑需要全齐
            if (requireAll && matched.length === 3) {
                const matchedPositions = matched.map(z => positions[zhiList.indexOf(z)]);
                results.push({
                    type: 'xing',
                    name: xing.name,
                    display: '[刑] ' + xing.name + '（' + xing.type + '）',
                    zhi: matched,
                    positions: matchedPositions,
                    category: '刑',
                    strength: 7
                });
            } else if (!requireAll && matched.length === 2) {
                // 无礼之刑(子卯)：两字即可
                const matchedPositions = matched.map(z => positions[zhiList.indexOf(z)]);
                results.push({
                    type: 'xing',
                    name: xing.name,
                    display: '[刑] ' + xing.name + '（' + xing.type + '）',
                    zhi: matched,
                    positions: matchedPositions,
                    category: '刑',
                    strength: 7
                });
            }
        }

        // 2. 检查六冲
        for (let chong of diZhiLiuChong) {
            if (zhiSet.includes(chong.pair[0]) && zhiSet.includes(chong.pair[1])) {
                const idx1 = zhiList.indexOf(chong.pair[0]);
                const idx2 = zhiList.indexOf(chong.pair[1]);
                results.push({
                    type: 'chong',
                    name: chong.name,
                    display: '[冲] ' + chong.name,
                    zhi: [chong.pair[0], chong.pair[1]],
                    positions: [positions[idx1], positions[idx2]],
                    category: '冲',
                    strength: 6
                });
            }
        }

        // 3. 检查六害
        for (let hai of diZhiLiuHai) {
            if (zhiSet.includes(hai.pair[0]) && zhiSet.includes(hai.pair[1])) {
                const idx1 = zhiList.indexOf(hai.pair[0]);
                const idx2 = zhiList.indexOf(hai.pair[1]);
                results.push({
                    type: 'hai',
                    name: hai.name,
                    display: '[害] ' + hai.name,
                    zhi: [hai.pair[0], hai.pair[1]],
                    positions: [positions[idx1], positions[idx2]],
                    category: '害',
                    strength: 5
                });
            }
        }

        // 4. 检查六破
        for (let po of diZhiLiuPo) {
            if (zhiSet.includes(po.pair[0]) && zhiSet.includes(po.pair[1])) {
                const idx1 = zhiList.indexOf(po.pair[0]);
                const idx2 = zhiList.indexOf(po.pair[1]);
                results.push({
                    type: 'po',
                    name: po.name,
                    display: '[破] ' + po.name,
                    zhi: [po.pair[0], po.pair[1]],
                    positions: [positions[idx1], positions[idx2]],
                    category: '破',
                    strength: 4
                });
            }
        }

        // 5. 检查三会（严格要求3字全齐）
        for (let hui of diZhiSanHui) {
            const matched = hui.zhi.filter(z => zhiSet.includes(z));
            if (matched.length === 3) {
                const matchedPositions = matched.map(z => positions[zhiList.indexOf(z)]);
                results.push({
                    type: 'sanhui',
                    name: hui.name,
                    display: '[会] ' + hui.name,
                    zhi: matched,
                    positions: matchedPositions,
                    category: '会',
                    strength: 3.5
                });
            }
            // matched.length < 3：不显示任何三会提示（无半会概念）
        }

        // 6. 检查三合（完整三合 + 半合）
        for (let he of diZhiSanHe) {
            const matched = he.zhi.filter(z => zhiSet.includes(z));

            if (matched.length === 3) {
                // 完整三合
                const matchedPositions = matched.map(z => positions[zhiList.indexOf(z)]);
                results.push({
                    type: 'sanhe',
                    name: he.name,
                    display: '[全合] ' + he.name,
                    zhi: matched,
                    positions: matchedPositions,
                    category: '合',
                    strength: 3
                });
            } else if (matched.length === 2) {
                // 判断是生地半合还是墓库半合
                const hasShengDi = he.shengDi.every(z => zhiSet.includes(z));
                const hasMuKu = he.muKu.every(z => zhiSet.includes(z));

                let halfType = '';
                if (hasShengDi) {
                    halfType = '生地';
                } else if (hasMuKu) {
                    halfType = '墓库';
                }

                if (halfType) {
                    const matchedPositions = matched.map(z => positions[zhiList.indexOf(z)]);
                    // 半合名称：取两个命中的地支 + 局名
                    const halfName = matched[0] + matched[1] + '半合' + he.wx + '局';
                    results.push({
                        type: 'banhe',
                        name: halfName,
                        display: '[半合] ' + halfName + '（' + halfType + '）',
                        zhi: matched,
                        positions: matchedPositions,
                        category: '半合',
                        strength: 2.5
                    });
                }
                // matched.length === 2 但既不是生地半合也不是墓库半合：不显示
                // matched.length === 1：不显示任何三合提示
            }
            // matched.length < 2：不显示
        }

        // 7. 检查六合
        for (let he of diZhiLiuHe) {
            if (zhiSet.includes(he.pair[0]) && zhiSet.includes(he.pair[1])) {
                const idx1 = zhiList.indexOf(he.pair[0]);
                const idx2 = zhiList.indexOf(he.pair[1]);
                results.push({
                    type: 'liuhe',
                    name: he.name,
                    display: '[合] ' + he.name,
                    zhi: [he.pair[0], he.pair[1]],
                    positions: [positions[idx1], positions[idx2]],
                    category: '合',
                    strength: 2
                });
            }
        }

        // 按力量排序（从大到小）
        results.sort((a, b) => b.strength - a.strength);

        return results;
    }

    // ==================== 辅助函数 ====================

    function checkTianGanChong(gan1, gan2) {
        for (let chong of tianGanSiChong) {
            if ((chong[0] === gan1 && chong[1] === gan2) ||
                (chong[0] === gan2 && chong[1] === gan1)) {
                return {
                    name: gan1 + gan2 + '冲',
                    display: '[冲] ' + gan1 + gan2 + '冲',
                    strength: 4
                };
            }
        }
        return null;
    }

    function checkTianGanHe(gan1, gan2) {
        for (let he of tianGanWuHe) {
            if ((he.pair[0] === gan1 && he.pair[1] === gan2) ||
                (he.pair[0] === gan2 && he.pair[1] === gan1)) {
                return {
                    name: he.name,
                    display: '[合] ' + he.name,
                    strength: 3
                };
            }
        }
        return null;
    }

    // ==================== 主入口函数 ====================

    /**
     * 分析八字的天干地支关系
     * @param {Object} bazi - 八字对象 {year: {gan, zhi}, month: {gan, zhi}, day: {gan, zhi}, hour: {gan, zhi}}
     * @returns {Object} 分析结果 {tianGanRelations, diZhiRelations}
     */
    function analyzeRelations(bazi) {
        const ganList = [bazi.year.gan, bazi.month.gan, bazi.day.gan, bazi.hour.gan];
        const zhiList = [bazi.year.zhi, bazi.month.zhi, bazi.day.zhi, bazi.hour.zhi];

        const tianGanRelations = analyzeTianGanRelations(ganList);
        const diZhiRelations = analyzeDiZhiRelations(zhiList);

        return {
            tianGanRelations: tianGanRelations,
            diZhiRelations: diZhiRelations,
            ganList: ganList,
            zhiList: zhiList
        };
    }

    /**
     * 分析双方八字的合配关系
     * @param {Object} baziA - 甲方八字
     * @param {Object} baziB - 乙方八字
     * @returns {Object} 合配分析结果
     */
    function analyzeHepeiRelations(baziA, baziB) {
        const results = {
            yearZhiRelations: [],
            monthZhiRelations: [],
            dayZhiRelations: [],
            hourZhiRelations: []
        };

        const positions = ['year', 'month', 'day', 'hour'];

        for (let pos of positions) {
            const zhiA = baziA[pos].zhi;
            const zhiB = baziB[pos].zhi;

            for (let chong of diZhiLiuChong) {
                if ((chong.pair[0] === zhiA && chong.pair[1] === zhiB) ||
                    (chong.pair[0] === zhiB && chong.pair[1] === zhiA)) {
                    results[pos + 'ZhiRelations'].push({
                        type: 'chong',
                        name: chong.name,
                        strength: 6
                    });
                }
            }

            for (let he of diZhiLiuHe) {
                if ((he.pair[0] === zhiA && he.pair[1] === zhiB) ||
                    (he.pair[0] === zhiB && he.pair[1] === zhiA)) {
                    results[pos + 'ZhiRelations'].push({
                        type: 'liuhe',
                        name: he.name,
                        strength: 3
                    });
                }
            }
        }

        return results;
    }

    // ==================== 导出接口 ====================
    return {
        analyzeRelations: analyzeRelations,
        analyzeHepeiRelations: analyzeHepeiRelations,
        tianGanWuHe: tianGanWuHe,
        diZhiLiuHe: diZhiLiuHe,
        diZhiLiuChong: diZhiLiuChong,
        diZhiLiuHai: diZhiLiuHai,
        diZhiLiuPo: diZhiLiuPo,
        diZhiSanHe: diZhiSanHe,
        diZhiSanHui: diZhiSanHui,
        diZhiSanXing: diZhiSanXing
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RelationAnalyzer;
}
