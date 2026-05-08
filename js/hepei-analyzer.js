/**
 * 八字合配专业分析模块
 * 纯前端计算，不调用任何外部API
 * 依赖：relation-analyzer.js（RelationAnalyzer）
 */
const HepeiAnalyzer = (function() {
    'use strict';

    // ==================== 60甲子纳音表 ====================
    var nayinTable = [
        { gan: '甲', zhi: '子', nayin: '海中金', wx: '金' },
        { gan: '乙', zhi: '丑', nayin: '海中金', wx: '金' },
        { gan: '丙', zhi: '寅', nayin: '炉中火', wx: '火' },
        { gan: '丁', zhi: '卯', nayin: '炉中火', wx: '火' },
        { gan: '戊', zhi: '辰', nayin: '大林木', wx: '木' },
        { gan: '己', zhi: '巳', nayin: '大林木', wx: '木' },
        { gan: '庚', zhi: '午', nayin: '路旁土', wx: '土' },
        { gan: '辛', zhi: '未', nayin: '路旁土', wx: '土' },
        { gan: '壬', zhi: '申', nayin: '剑锋金', wx: '金' },
        { gan: '癸', zhi: '酉', nayin: '剑锋金', wx: '金' },
        { gan: '甲', zhi: '戌', nayin: '山头火', wx: '火' },
        { gan: '乙', zhi: '亥', nayin: '山头火', wx: '火' },
        { gan: '丙', zhi: '子', nayin: '涧下水', wx: '水' },
        { gan: '丁', zhi: '丑', nayin: '涧下水', wx: '水' },
        { gan: '戊', zhi: '寅', nayin: '城头土', wx: '土' },
        { gan: '己', zhi: '卯', nayin: '城头土', wx: '土' },
        { gan: '庚', zhi: '辰', nayin: '白蜡金', wx: '金' },
        { gan: '辛', zhi: '巳', nayin: '白蜡金', wx: '金' },
        { gan: '壬', zhi: '午', nayin: '杨柳木', wx: '木' },
        { gan: '癸', zhi: '未', nayin: '杨柳木', wx: '木' },
        { gan: '甲', zhi: '申', nayin: '泉中水', wx: '水' },
        { gan: '乙', zhi: '酉', nayin: '泉中水', wx: '水' },
        { gan: '丙', zhi: '戌', nayin: '屋上土', wx: '土' },
        { gan: '丁', zhi: '亥', nayin: '屋上土', wx: '土' },
        { gan: '戊', zhi: '子', nayin: '霹雳火', wx: '火' },
        { gan: '己', zhi: '丑', nayin: '霹雳火', wx: '火' },
        { gan: '庚', zhi: '寅', nayin: '松柏木', wx: '木' },
        { gan: '辛', zhi: '卯', nayin: '松柏木', wx: '木' },
        { gan: '壬', zhi: '辰', nayin: '长流水', wx: '水' },
        { gan: '癸', zhi: '巳', nayin: '长流水', wx: '水' },
        { gan: '甲', zhi: '午', nayin: '沙中金', wx: '金' },
        { gan: '乙', zhi: '未', nayin: '沙中金', wx: '金' },
        { gan: '丙', zhi: '申', nayin: '山下火', wx: '火' },
        { gan: '丁', zhi: '酉', nayin: '山下火', wx: '火' },
        { gan: '戊', zhi: '戌', nayin: '平地木', wx: '木' },
        { gan: '己', zhi: '亥', nayin: '平地木', wx: '木' },
        { gan: '庚', zhi: '子', nayin: '壁上土', wx: '土' },
        { gan: '辛', zhi: '丑', nayin: '壁上土', wx: '土' },
        { gan: '壬', zhi: '寅', nayin: '金箔金', wx: '金' },
        { gan: '癸', zhi: '卯', nayin: '金箔金', wx: '金' },
        { gan: '甲', zhi: '辰', nayin: '覆灯火', wx: '火' },
        { gan: '乙', zhi: '巳', nayin: '覆灯火', wx: '火' },
        { gan: '丙', zhi: '午', nayin: '天河水', wx: '水' },
        { gan: '丁', zhi: '未', nayin: '天河水', wx: '水' },
        { gan: '戊', zhi: '申', nayin: '大驿土', wx: '土' },
        { gan: '己', zhi: '酉', nayin: '大驿土', wx: '土' },
        { gan: '庚', zhi: '戌', nayin: '钗钏金', wx: '金' },
        { gan: '辛', zhi: '亥', nayin: '钗钏金', wx: '金' },
        { gan: '壬', zhi: '子', nayin: '桑柘木', wx: '木' },
        { gan: '癸', zhi: '丑', nayin: '桑柘木', wx: '木' },
        { gan: '甲', zhi: '寅', nayin: '大溪水', wx: '水' },
        { gan: '乙', zhi: '卯', nayin: '大溪水', wx: '水' },
        { gan: '丙', zhi: '辰', nayin: '沙中土', wx: '土' },
        { gan: '丁', zhi: '巳', nayin: '沙中土', wx: '土' },
        { gan: '戊', zhi: '午', nayin: '天上火', wx: '火' },
        { gan: '己', zhi: '未', nayin: '天上火', wx: '火' },
        { gan: '庚', zhi: '申', nayin: '石榴木', wx: '木' },
        { gan: '辛', zhi: '酉', nayin: '石榴木', wx: '木' },
        { gan: '壬', zhi: '戌', nayin: '大海水', wx: '水' },
        { gan: '癸', zhi: '亥', nayin: '大海水', wx: '水' }
    ];

    // ==================== 五行相生相克 ====================
    var wuxingSheng = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    var wuxingKe = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
    var wuxingColors = { '金': '#DAA520', '木': '#2E8B57', '水': '#4169E1', '火': '#DC143C', '土': '#8B4513' };

    // ==================== 地支六合表 ====================
    var liuHeMap = {
        '子': '丑', '丑': '子',
        '寅': '亥', '亥': '寅',
        '卯': '戌', '戌': '卯',
        '辰': '酉', '酉': '辰',
        '巳': '申', '申': '巳',
        '午': '未', '未': '午'
    };

    // ==================== 工具函数 ====================

    /**
     * 根据天干地支查纳音
     */
    function getNayin(gan, zhi) {
        for (var i = 0; i < nayinTable.length; i++) {
            if (nayinTable[i].gan === gan && nayinTable[i].zhi === zhi) {
                return nayinTable[i];
            }
        }
        return null;
    }

    /**
     * 获取五行关系描述
     */
    function getWuxingRelation(wx1, wx2) {
        if (wx1 === wx2) return { type: '比和', desc: wx1 + '与' + wx2 + '比和，同类相助' };
        if (wuxingSheng[wx1] === wx2) return { type: '我生', desc: wx1 + '生' + wx2 + '，甲方生乙方' };
        if (wuxingSheng[wx2] === wx1) return { type: '生我', desc: wx2 + '生' + wx1 + '，乙方生甲方' };
        if (wuxingKe[wx1] === wx2) return { type: '我克', desc: wx1 + '克' + wx2 + '，甲方克乙方' };
        if (wuxingKe[wx2] === wx1) return { type: '克我', desc: wx2 + '克' + wx1 + '，乙方克甲方' };
        return { type: '未知', desc: '' };
    }

    /**
     * 获取日主五行的喜用神（简化版）
     */
    function getXiYongShen(riZhuWx, wuXingCount) {
        var sameCount = wuXingCount[riZhuWx] || 0;
        var strength = '中和';
        if (sameCount >= 4) strength = '身强';
        else if (sameCount <= 1) strength = '身弱';

        // 喜用五行
        var xiWx = [];
        if (strength === '身弱') {
            // 身弱喜印比：生扶日主的五行
            // 印 = 生日主的五行，比 = 同类五行
            var yinWx = null;
            for (var k in wuxingSheng) {
                if (wuxingSheng[k] === riZhuWx) { yinWx = k; break; }
            }
            xiWx.push(riZhuWx); // 比（同类）
            if (yinWx) xiWx.push(yinWx); // 印（生我）
        } else if (strength === '身强') {
            // 身强喜食伤财：泄耗日主的五行
            // 食伤 = 日主生的五行，财 = 日主克的五行
            var shiShangWx = wuxingSheng[riZhuWx];
            var caiWx = wuxingKe[riZhuWx];
            xiWx.push(shiShangWx);
            xiWx.push(caiWx);
        } else {
            // 中和，取所缺的五行
            var wuxingList = ['金', '木', '水', '火', '土'];
            for (var i = 0; i < wuxingList.length; i++) {
                if ((wuXingCount[wuxingList[i]] || 0) === 0) {
                    xiWx.push(wuxingList[i]);
                }
            }
            if (xiWx.length === 0) {
                xiWx.push(wuxingSheng[riZhuWx]);
            }
        }

        return {
            strength: strength,
            xiWx: xiWx,
            desc: '日主' + riZhuWx + '，命局中' + riZhuWx + '共' + sameCount + '个，判定为' + strength
        };
    }

    /**
     * 获取流年地支
     */
    function getLiuNianZhi(year) {
        var zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
        return zhiList[(year - 4) % 12];
    }

    // ==================== 七大分析维度 ====================

    /**
     * 维度1：年柱纳音对比
     */
    function analyzeNayin(pillarsA, pillarsB, nameA, nameB) {
        var yearA = pillarsA.year;
        var yearB = pillarsB.year;
        var nayinA = getNayin(yearA.gan, yearA.zhi);
        var nayinB = getNayin(yearB.gan, yearB.zhi);

        if (!nayinA || !nayinB) return '<p>纳音信息不全，无法分析。</p>';

        var relation = getWuxingRelation(nayinA.wx, nayinB.wx);
        var relationDesc = '';
        if (relation.type === '比和') {
            relationDesc = '双方年柱纳音同属' + nayinA.wx + '，比和相助，有共鸣基础。';
        } else if (relation.type === '我生' || relation.type === '生我') {
            relationDesc = '纳音五行' + relation.desc + '，有相生之象，主彼此滋养。';
        } else {
            relationDesc = '纳音五行' + relation.desc + '，需注意彼此磨合。';
        }

        var html = '';
        html += '<div style="display:flex;justify-content:space-around;margin-bottom:8px;">';
        html += '<div style="text-align:center;">';
        html += '<div style="font-size:12px;color:var(--text-light);">' + nameA + '年柱</div>';
        html += '<div style="font-size:18px;font-weight:700;color:' + wuxingColors[nayinA.wx] + ';">' + yearA.ganZhi + '</div>';
        html += '<div style="font-size:13px;color:var(--gold);">' + nayinA.nayin + '</div>';
        html += '</div>';
        html += '<div style="display:flex;align-items:center;font-size:20px;color:var(--text-light);">VS</div>';
        html += '<div style="text-align:center;">';
        html += '<div style="font-size:12px;color:var(--text-light);">' + nameB + '年柱</div>';
        html += '<div style="font-size:18px;font-weight:700;color:' + wuxingColors[nayinB.wx] + ';">' + yearB.ganZhi + '</div>';
        html += '<div style="font-size:13px;color:var(--gold);">' + nayinB.nayin + '</div>';
        html += '</div>';
        html += '</div>';
        html += '<p style="font-size:13px;color:var(--text-secondary);line-height:1.7;">' + relationDesc + '</p>';

        return html;
    }

    /**
     * 维度2：日主五行关系
     */
    function analyzeRiZhuRelation(pillarsA, pillarsB, nameA, nameB) {
        var dayGanA = pillarsA.day.gan;
        var dayGanB = pillarsB.day.gan;
        var wxA = null;
        var wxB = null;

        // 获取日主五行
        if (typeof Lunar !== 'undefined' && Lunar.wuXingGan) {
            wxA = Lunar.wuXingGan[pillarsA.day.ganIndex];
            wxB = Lunar.wuXingGan[pillarsB.day.ganIndex];
        }
        if (!wxA || !wxB) return '<p>日主五行信息不全，无法分析。</p>';

        var relation = getWuxingRelation(wxA, wxB);
        var detailDesc = '';
        switch (relation.type) {
            case '比和':
                detailDesc = '双方日主同属' + wxA + '，性格有相似之处，容易产生共鸣，但也可能因过于相似而产生摩擦。';
                break;
            case '我生':
                detailDesc = nameA + '日主' + wxA + '生' + nameB + '日主' + wxB + '，' + nameA + '在关系中倾向付出和照顾对方。';
                break;
            case '生我':
                detailDesc = nameB + '日主' + wxB + '生' + nameA + '日主' + wxA + '，' + nameB + '在关系中倾向付出和照顾对方。';
                break;
            case '我克':
                detailDesc = nameA + '日主' + wxA + '克' + nameB + '日主' + wxB + '，' + nameA + '在关系中可能处于主导地位，需注意沟通方式。';
                break;
            case '克我':
                detailDesc = nameB + '日主' + wxB + '克' + nameA + '日主' + wxA + '，' + nameB + '在关系中可能处于主导地位，需注意沟通方式。';
                break;
        }

        var html = '';
        html += '<div style="display:flex;justify-content:space-around;margin-bottom:8px;">';
        html += '<div style="text-align:center;">';
        html += '<div style="font-size:12px;color:var(--text-light);">' + nameA + '日主</div>';
        html += '<div style="font-size:22px;font-weight:700;color:' + wuxingColors[wxA] + ';">' + dayGanA + '</div>';
        html += '<div style="font-size:13px;color:var(--text-secondary);">' + wxA + '</div>';
        html += '</div>';
        html += '<div style="display:flex;align-items:center;font-size:14px;color:var(--text-light);font-weight:600;">' + relation.type + '</div>';
        html += '<div style="text-align:center;">';
        html += '<div style="font-size:12px;color:var(--text-light);">' + nameB + '日主</div>';
        html += '<div style="font-size:22px;font-weight:700;color:' + wuxingColors[wxB] + ';">' + dayGanB + '</div>';
        html += '<div style="font-size:13px;color:var(--text-secondary);">' + wxB + '</div>';
        html += '</div>';
        html += '</div>';
        html += '<p style="font-size:13px;color:var(--text-secondary);line-height:1.7;">' + detailDesc + '</p>';

        return html;
    }

    /**
     * 维度3：地支关系
     */
    function analyzeDiZhiRelation(pillarsA, pillarsB, nameA, nameB) {
        var baziA = { year: pillarsA.year, month: pillarsA.month, day: pillarsA.day, hour: pillarsA.hour };
        var baziB = { year: pillarsB.year, month: pillarsB.month, day: pillarsB.day, hour: pillarsB.hour };

        var hepeiResult = null;
        if (typeof RelationAnalyzer !== 'undefined' && RelationAnalyzer.analyzeHepeiRelations) {
            hepeiResult = RelationAnalyzer.analyzeHepeiRelations(baziA, baziB);
        }

        if (!hepeiResult) return '<p>地支关系分析暂不可用。</p>';

        var posNames = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' };
        var html = '';

        var positions = ['year', 'month', 'day', 'hour'];
        var hasRelation = false;

        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            var rels = hepeiResult[pos + 'ZhiRelations'];
            if (rels && rels.length > 0) {
                hasRelation = true;
                for (var j = 0; j < rels.length; j++) {
                    var rel = rels[j];
                    var relColor = rel.type === 'chong' ? 'var(--red-primary)' : 'var(--green)';
                    var relLabel = rel.type === 'chong' ? '冲' : '合';
                    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-color);">';
                    html += '<span style="font-size:13px;">' + posNames[pos] + '：' + pillarsA[pos].zhi + ' — ' + pillarsB[pos].zhi + '</span>';
                    html += '<span style="font-size:13px;font-weight:600;color:' + relColor + ';">' + rel.name + '（' + relLabel + '）</span>';
                    html += '</div>';
                }
            } else {
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-color);">';
                html += '<span style="font-size:13px;">' + posNames[pos] + '：' + pillarsA[pos].zhi + ' — ' + pillarsB[pos].zhi + '</span>';
                html += '<span style="font-size:12px;color:var(--text-light);">无明显关系</span>';
                html += '</div>';
            }
        }

        if (!hasRelation) {
            html += '<p style="font-size:13px;color:var(--text-secondary);margin-top:8px;">双方四柱地支未形成六合或六冲关系，属平和之象。</p>';
        } else {
            html += '<p style="font-size:13px;color:var(--text-secondary);margin-top:8px;">六合主和谐融洽，六冲主分歧摩擦，需综合看待。</p>';
        }

        return html;
    }

    /**
     * 维度4：五行互补度
     */
    function analyzeWuxingComplement(wxA, wxB, nameA, nameB) {
        var wuxingList = ['金', '木', '水', '火', '土'];
        var complementItems = [];

        for (var i = 0; i < wuxingList.length; i++) {
            var wx = wuxingList[i];
            var countA = wxA[wx] || 0;
            var countB = wxB[wx] || 0;
            if (countA === 0 && countB >= 2) {
                complementItems.push({ wx: wx, desc: nameA + '缺' + wx + '，' + nameB + '命局' + wx + '充盈（' + countB + '个），可互补' });
            }
            if (countB === 0 && countA >= 2) {
                complementItems.push({ wx: wx, desc: nameB + '缺' + wx + '，' + nameA + '命局' + wx + '充盈（' + countA + '个），可互补' });
            }
        }

        var level = '低';
        var levelColor = 'var(--text-light)';
        if (complementItems.length >= 3) { level = '高'; levelColor = 'var(--green)'; }
        else if (complementItems.length >= 1) { level = '中'; levelColor = 'var(--gold)'; }

        var html = '';

        // 双方五行对比
        html += '<div style="display:flex;justify-content:space-around;margin-bottom:10px;">';
        html += '<div style="text-align:center;">';
        html += '<div style="font-size:12px;color:var(--text-light);margin-bottom:4px;">' + nameA + '</div>';
        html += '<div style="display:flex;gap:6px;justify-content:center;">';
        for (var i = 0; i < wuxingList.length; i++) {
            var c = wxA[wuxingList[i]] || 0;
            var opacity = c === 0 ? '0.3' : '1';
            html += '<div style="text-align:center;opacity:' + opacity + ';">';
            html += '<div style="font-size:14px;font-weight:700;color:' + wuxingColors[wuxingList[i]] + ';">' + wuxingList[i] + '</div>';
            html += '<div style="font-size:11px;color:var(--text-light);">' + c + '</div>';
            html += '</div>';
        }
        html += '</div></div>';

        html += '<div style="text-align:center;">';
        html += '<div style="font-size:12px;color:var(--text-light);margin-bottom:4px;">' + nameB + '</div>';
        html += '<div style="display:flex;gap:6px;justify-content:center;">';
        for (var i = 0; i < wuxingList.length; i++) {
            var c = wxB[wuxingList[i]] || 0;
            var opacity = c === 0 ? '0.3' : '1';
            html += '<div style="text-align:center;opacity:' + opacity + ';">';
            html += '<div style="font-size:14px;font-weight:700;color:' + wuxingColors[wuxingList[i]] + ';">' + wuxingList[i] + '</div>';
            html += '<div style="font-size:11px;color:var(--text-light);">' + c + '</div>';
            html += '</div>';
        }
        html += '</div></div>';
        html += '</div>';

        // 互补度评级
        html += '<div style="text-align:center;margin-bottom:8px;">';
        html += '<span style="font-size:13px;color:var(--text-light);">互补度：</span>';
        html += '<span style="font-size:16px;font-weight:700;color:' + levelColor + ';">' + level + '</span>';
        html += '</div>';

        // 互补详情
        if (complementItems.length > 0) {
            for (var i = 0; i < complementItems.length; i++) {
                html += '<div style="padding:4px 0;font-size:13px;color:var(--text-secondary);">';
                html += '<span style="color:' + wuxingColors[complementItems[i].wx] + ';font-weight:600;">' + complementItems[i].wx + '</span>：' + complementItems[i].desc;
                html += '</div>';
            }
        } else {
            html += '<p style="font-size:13px;color:var(--text-secondary);">双方五行分布相近，无明显互补或缺失。</p>';
        }

        return html;
    }

    /**
     * 维度5：喜用神互补
     */
    function analyzeXiYongComplement(pillarsA, pillarsB, wxA, wxB, nameA, nameB) {
        var riZhuWxA = null;
        var riZhuWxB = null;
        if (typeof Lunar !== 'undefined' && Lunar.wuXingGan) {
            riZhuWxA = Lunar.wuXingGan[pillarsA.day.ganIndex];
            riZhuWxB = Lunar.wuXingGan[pillarsB.day.ganIndex];
        }
        if (!riZhuWxA || !riZhuWxB) return '<p>喜用神分析信息不全。</p>';

        var xysA = getXiYongShen(riZhuWxA, wxA);
        var xysB = getXiYongShen(riZhuWxB, wxB);

        var html = '';

        // 甲方喜用
        html += '<div style="padding:8px 0;border-bottom:1px solid var(--border-color);">';
        html += '<div style="font-size:13px;font-weight:600;margin-bottom:4px;">' + nameA + '（日主' + riZhuWxA + '，' + xysA.strength + '）</div>';
        html += '<div style="font-size:12px;color:var(--text-light);margin-bottom:4px;">' + xysA.desc + '</div>';
        html += '<div style="font-size:13px;">喜用五行：';
        for (var i = 0; i < xysA.xiWx.length; i++) {
            html += '<span style="color:' + wuxingColors[xysA.xiWx[i]] + ';font-weight:600;">' + xysA.xiWx[i] + '</span>';
            if (i < xysA.xiWx.length - 1) html += '、';
        }
        html += '</div>';

        // 检查乙方是否提供甲方喜用
        var aMatchCount = 0;
        for (var i = 0; i < xysA.xiWx.length; i++) {
            var wx = xysA.xiWx[i];
            var bCount = wxB[wx] || 0;
            if (bCount >= 1) aMatchCount++;
        }
        if (aMatchCount > 0) {
            html += '<div style="font-size:12px;color:var(--green);margin-top:4px;">' + nameB + '命局中可提供' + aMatchCount + '项' + nameA + '所需五行</div>';
        } else {
            html += '<div style="font-size:12px;color:var(--text-light);margin-top:4px;">' + nameB + '命局中暂缺' + nameA + '所需五行</div>';
        }
        html += '</div>';

        // 乙方喜用
        html += '<div style="padding:8px 0;">';
        html += '<div style="font-size:13px;font-weight:600;margin-bottom:4px;">' + nameB + '（日主' + riZhuWxB + '，' + xysB.strength + '）</div>';
        html += '<div style="font-size:12px;color:var(--text-light);margin-bottom:4px;">' + xysB.desc + '</div>';
        html += '<div style="font-size:13px;">喜用五行：';
        for (var i = 0; i < xysB.xiWx.length; i++) {
            html += '<span style="color:' + wuxingColors[xysB.xiWx[i]] + ';font-weight:600;">' + xysB.xiWx[i] + '</span>';
            if (i < xysB.xiWx.length - 1) html += '、';
        }
        html += '</div>';

        // 检查甲方是否提供乙方喜用
        var bMatchCount = 0;
        for (var i = 0; i < xysB.xiWx.length; i++) {
            var wx = xysB.xiWx[i];
            var aCount = wxA[wx] || 0;
            if (aCount >= 1) bMatchCount++;
        }
        if (bMatchCount > 0) {
            html += '<div style="font-size:12px;color:var(--green);margin-top:4px;">' + nameA + '命局中可提供' + bMatchCount + '项' + nameB + '所需五行</div>';
        } else {
            html += '<div style="font-size:12px;color:var(--text-light);margin-top:4px;">' + nameA + '命局中暂缺' + nameB + '所需五行</div>';
        }
        html += '</div>';

        // 综合评价
        var totalMatch = aMatchCount + bMatchCount;
        if (totalMatch >= 3) {
            html += '<p style="font-size:13px;color:var(--green);margin-top:4px;">双方喜用神互补程度较高，彼此能为对方提供所需五行能量。</p>';
        } else if (totalMatch >= 1) {
            html += '<p style="font-size:13px;color:var(--gold);margin-top:4px;">双方喜用神有一定互补，可在生活中相互补益。</p>';
        } else {
            html += '<p style="font-size:13px;color:var(--text-secondary);margin-top:4px;">双方喜用神互补程度有限，可通过后天环境调整。</p>';
        }

        return html;
    }

    /**
     * 维度6：大运流年婚运参考
     */
    function analyzeLiuNian(pillarsA, pillarsB, nameA, nameB) {
        var currentYear = new Date().getFullYear();
        var years = [currentYear, currentYear + 1, currentYear + 2];
        var zhiA = pillarsA.day.zhi;
        var zhiB = pillarsB.day.zhi;

        // 红鸾星相关地支（简化：卯酉子午）
        var redPhoenix = ['卯', '酉', '子', '午'];

        var html = '';
        html += '<div style="font-size:12px;color:var(--text-light);margin-bottom:8px;">以下为近三年流年与双方日支的关系参考：</div>';

        for (var i = 0; i < years.length; i++) {
            var year = years[i];
            var liuNianZhi = getLiuNianZhi(year);
            var matchA = liuHeMap[zhiA] === liuNianZhi;
            var matchB = liuHeMap[zhiB] === liuNianZhi;
            var isRedPhoenix = redPhoenix.indexOf(liuNianZhi) !== -1;

            html += '<div style="padding:8px;margin-bottom:6px;background:var(--bg-secondary);border-radius:8px;">';
            html += '<div style="font-size:14px;font-weight:600;margin-bottom:4px;">' + year + '年（' + liuNianZhi + '）</div>';

            if (matchA) {
                html += '<div style="font-size:12px;color:var(--green);">' + nameA + '日支' + zhiA + '与流年' + liuNianZhi + '六合</div>';
            }
            if (matchB) {
                html += '<div style="font-size:12px;color:var(--green);">' + nameB + '日支' + zhiB + '与流年' + liuNianZhi + '六合</div>';
            }
            if (isRedPhoenix) {
                html += '<div style="font-size:12px;color:var(--red-primary);">流年' + liuNianZhi + '为传统红鸾星位</div>';
            }
            if (!matchA && !matchB && !isRedPhoenix) {
                html += '<div style="font-size:12px;color:var(--text-light);">与双方日支暂无特殊关系</div>';
            }
            html += '</div>';
        }

        // 免责声明
        html += '<div style="font-size:11px;color:var(--text-light);margin-top:8px;padding:8px;background:var(--bg-secondary);border-radius:6px;line-height:1.6;">';
        html += '以上为传统命理文化推演，仅供了解参考，不构成任何人生决策依据。流年分析为简化推算，实际需结合大运走势综合判断。';
        html += '</div>';

        return html;
    }

    /**
     * 维度7：综合评述
     */
    function generateSummary(pillarsA, pillarsB, wxA, wxB, nameA, nameB) {
        var riZhuWxA = null;
        var riZhuWxB = null;
        if (typeof Lunar !== 'undefined' && Lunar.wuXingGan) {
            riZhuWxA = Lunar.wuXingGan[pillarsA.day.ganIndex];
            riZhuWxB = Lunar.wuXingGan[pillarsB.day.ganIndex];
        }

        var nayinA = getNayin(pillarsA.year.gan, pillarsA.year.zhi);
        var nayinB = getNayin(pillarsB.year.gan, pillarsB.year.zhi);
        var nayinRel = (nayinA && nayinB) ? getWuxingRelation(nayinA.wx, nayinB.wx) : null;
        var riZhuRel = (riZhuWxA && riZhuWxB) ? getWuxingRelation(riZhuWxA, riZhuWxB) : null;

        // 五行互补计算
        var wuxingList = ['金', '木', '水', '火', '土'];
        var complementCount = 0;
        for (var i = 0; i < wuxingList.length; i++) {
            var wx = wuxingList[i];
            var cA = wxA[wx] || 0;
            var cB = wxB[wx] || 0;
            if ((cA === 0 && cB >= 2) || (cB === 0 && cA >= 2)) complementCount++;
        }

        // 地支合冲统计
        var baziA = { year: pillarsA.year, month: pillarsA.month, day: pillarsA.day, hour: pillarsA.hour };
        var baziB = { year: pillarsB.year, month: pillarsB.month, day: pillarsB.day, hour: pillarsB.hour };
        var heCount = 0;
        var chongCount = 0;
        if (typeof RelationAnalyzer !== 'undefined' && RelationAnalyzer.analyzeHepeiRelations) {
            var hepeiResult = RelationAnalyzer.analyzeHepeiRelations(baziA, baziB);
            var positions = ['year', 'month', 'day', 'hour'];
            for (var i = 0; i < positions.length; i++) {
                var rels = hepeiResult[positions[i] + 'ZhiRelations'];
                if (rels) {
                    for (var j = 0; j < rels.length; j++) {
                        if (rels[j].type === 'liuhe') heCount++;
                        if (rels[j].type === 'chong') chongCount++;
                    }
                }
            }
        }

        // 拼装综合评述
        var lines = [];
        lines.push('综合以上各维度分析，' + nameA + '与' + nameB + '的合配情况如下：');

        // 纳音
        if (nayinRel) {
            if (nayinRel.type === '比和') {
                lines.push('双方年柱纳音同属' + nayinA.wx + '，有天然的共鸣基础。');
            } else if (nayinRel.type === '我生' || nayinRel.type === '生我') {
                lines.push('年柱纳音五行相生，双方有彼此滋养的倾向。');
            } else {
                lines.push('年柱纳音五行存在相克关系，建议在相处中多一些包容。');
            }
        }

        // 日主
        if (riZhuRel) {
            if (riZhuRel.type === '比和') {
                lines.push('日主同属' + riZhuWxA + '，双方性格有相似之处，容易理解彼此。');
            } else if (riZhuRel.type === '我生' || riZhuRel.type === '生我') {
                lines.push('日主五行相生，关系中存在自然的关怀与付出。');
            } else {
                lines.push('日主五行存在相克关系，双方在决策方式上可能有所不同，需要多沟通。');
            }
        }

        // 地支
        if (heCount > 0) {
            lines.push('双方地支形成' + heCount + '组六合关系，属和谐之象。');
        }
        if (chongCount > 0) {
            lines.push('双方地支存在' + chongCount + '组六冲关系，在某些方面可能存在分歧，需注意调和。');
        }
        if (heCount === 0 && chongCount === 0) {
            lines.push('双方四柱地支无特殊合冲关系，属平稳之象。');
        }

        // 五行互补
        if (complementCount >= 3) {
            lines.push('五行互补度高，双方命局能互相补益。');
        } else if (complementCount >= 1) {
            lines.push('五行有一定互补，可在生活中相互支持。');
        } else {
            lines.push('五行互补度有限，可通过后天环境与生活方式进行调节。');
        }

        // 总结
        lines.push('命理合配仅为传统文化的一种参考视角，关系的经营最终取决于双方的共同努力与理解。');

        var html = '';
        for (var i = 0; i < lines.length; i++) {
            html += '<p style="font-size:13px;color:var(--text-secondary);line-height:1.8;margin-bottom:4px;">' + lines[i] + '</p>';
        }

        // 免责声明
        html += '<div style="font-size:11px;color:var(--text-light);margin-top:12px;padding:8px;background:var(--bg-secondary);border-radius:6px;line-height:1.6;">';
        html += '以上为传统命理文化推演，仅供了解参考，不构成任何人生决策依据。';
        html += '</div>';

        return html;
    }

    // ==================== 主入口：渲染全部分析 ====================

    /**
     * 渲染完整的合配专业分析
     * @param {Object} resultA - 甲方排盘结果
     * @param {Object} resultB - 乙方排盘结果
     * @param {string} nameA - 甲方姓名
     * @param {string} nameB - 乙方姓名
     * @returns {string} HTML字符串
     */
    function renderFullAnalysis(resultA, resultB, nameA, nameB) {
        var pA = resultA.pillars;
        var pB = resultB.pillars;
        var wxA = resultA.wuXing || {};
        var wxB = resultB.wuXing || {};

        var disclaimer = '<div style="font-size:11px;color:var(--text-light);margin-top:10px;padding:6px 8px;background:var(--bg-secondary);border-radius:6px;line-height:1.5;text-align:center;">以上为传统命理文化推演，仅供了解参考，不构成任何人生决策依据。</div>';

        var sections = [
            { title: '年柱纳音', content: analyzeNayin(pA, pB, nameA, nameB) },
            { title: '日主关系', content: analyzeRiZhuRelation(pA, pB, nameA, nameB) },
            { title: '地支关系', content: analyzeDiZhiRelation(pA, pB, nameA, nameB) },
            { title: '五行互补度', content: analyzeWuxingComplement(wxA, wxB, nameA, nameB) },
            { title: '喜用神互补', content: analyzeXiYongComplement(pA, pB, wxA, wxB, nameA, nameB) },
            { title: '流年婚运参考', content: analyzeLiuNian(pA, pB, nameA, nameB) },
            { title: '综合评述', content: generateSummary(pA, pB, wxA, wxB, nameA, nameB) }
        ];

        var html = '';
        html += '<div class="ai-analysis-card" style="border:2px solid var(--gold);">';
        html += '<div class="ai-analysis-title" style="color:var(--red-primary);">合配专业分析</div>';

        for (var i = 0; i < sections.length; i++) {
            html += '<div style="margin-bottom:' + (i < sections.length - 1 ? '16px' : '0') + ';">';
            html += '<div style="font-size:15px;font-weight:600;color:var(--red-primary);margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed var(--border-color);">【' + sections[i].title + '】</div>';
            html += sections[i].content;
            if (i < sections.length - 1) {
                html += disclaimer;
            }
            html += '</div>';
            if (i < sections.length - 1) {
                html += '<div style="height:1px;background:linear-gradient(to right, transparent, var(--border-color), transparent);margin:4px 0 16px;"></div>';
            }
        }

        html += '</div>';
        return html;
    }

    // ==================== 导出接口 ====================
    return {
        renderFullAnalysis: renderFullAnalysis
    };

})();
