/**
 * 黄历分析模块 - huangli.js
 * 依赖：lunar.js（万年历核心）
 * 功能：当日宜忌、大黄道（十二值星）、小黄道（建除十二神）
 */

var HuangliAnalyzer = (function() {
    'use strict';

    // ==================== 建除十二神 ====================
    var jianChuNames = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];

    // ==================== 建除宜忌规则 ====================
    var jianChuRules = {
        0:  { name: '建日', yi: ['出行', '上任', '开市', '动土'],                          ji: [] },
        1:  { name: '除日', yi: ['治病', '祭祀', '解除'],                                  ji: [] },
        2:  { name: '满日', yi: ['纳畜', '栽种', '纳财'],                                  ji: [] },
        3:  { name: '平日', yi: ['涂泥', '修造', '合帐'],                                  ji: [] },
        4:  { name: '定日', yi: ['冠带', '嫁娶', '开市'],                                  ji: [] },
        5:  { name: '执日', yi: ['建造', '祭祀', '捕捉'],                                  ji: [] },
        6:  { name: '破日', yi: [],                                                        ji: ['动土', '嫁娶', '移徙'] },
        7:  { name: '危日', yi: ['安床', '祭祀'],                                          ji: [] },
        8:  { name: '成日', yi: ['开业', '嫁娶', '纳采'],                                  ji: [] },
        9:  { name: '收日', yi: ['纳财', '入库', '收获'],                                  ji: [] },
        10: { name: '开日', yi: ['开市', '交易', '出行'],                                  ji: [] },
        11: { name: '闭日', yi: ['筑墓', '安葬'],                                          ji: [] }
    };

    // ==================== 大黄道十二值星 ====================
    var daHuangDaoStars = [
        { name: '青龙', type: '吉', desc: '明喜之事，利求财、开业' },
        { name: '明堂', type: '吉', desc: '利见贵人、嫁娶、修造' },
        { name: '金匮', type: '吉', desc: '利纳财、嫁娶、开市' },
        { name: '天德', type: '吉', desc: '利修造、动土、嫁娶' },
        { name: '玉堂', type: '吉', desc: '利见贵人、上书、求事' },
        { name: '司命', type: '吉', desc: '利祭祀、祈福、嫁娶' },
        { name: '天刑', type: '凶', desc: '忌赴任、诉讼、出行' },
        { name: '朱雀', type: '凶', desc: '忌争吵、口舌、文书' },
        { name: '白虎', type: '凶', desc: '忌出行、入宅、安葬' },
        { name: '天牢', type: '凶', desc: '忌祭祀、祈福、赴任' },
        { name: '玄武', type: '凶', desc: '忌嫁娶、移徙、开市' },
        { name: '勾陈', type: '凶', desc: '忌动土、修造、诉讼' }
    ];

    /**
     * 计算小黄道（建除十二神）值
     * 月建地支索引 = 月支在地支中的位置
     * 日建地支索引 = 日支在地支中的位置
     * 建除值 = (日建索引 - 月建索引 + 12) % 12
     */
    function calcJianChu(monthZhiIndex, dayZhiIndex) {
        var idx = ((dayZhiIndex - monthZhiIndex) % 12 + 12) % 12;
        return idx;
    }

    /**
     * 计算大黄道十二值星索引
     * 基于农历月份和日数推算
     * 使用月建偏移查表法
     */
    function calcDaHuangDao(monthZhiIndex, dayZhiIndex) {
        // 大黄道值星根据月建和日支推算
        // 简化算法：以月建地支为基准，日支偏移查表
        var offset = ((dayZhiIndex - monthZhiIndex) % 12 + 12) % 12;
        // 大黄道与建除的映射偏移不同，使用独立偏移表
        // 传统口诀：子午青龙起，丑未明堂游...
        var monthBase = [0, 2, 4, 6, 8, 10, 1, 3, 5, 7, 9, 11]; // 各月建对应的大黄道起始偏移
        var starIdx = (monthBase[monthZhiIndex] + offset) % 12;
        return starIdx;
    }

    /**
     * 分析黄历
     * @param {object} result - Bazi.generate() 返回的排盘结果
     * @returns {object} 黄历分析结果
     */
    function analyze(result) {
        if (!result || !result.pillars) return null;

        var monthZhiIndex = result.pillars.month.zhiIndex;
        var dayZhiIndex = result.pillars.day.zhiIndex;

        // 1. 小黄道（建除十二神）
        var jcIdx = calcJianChu(monthZhiIndex, dayZhiIndex);
        var jcRule = jianChuRules[jcIdx];

        // 2. 大黄道（十二值星）
        var dhdIdx = calcDaHuangDao(monthZhiIndex, dayZhiIndex);
        var dhdStar = daHuangDaoStars[dhdIdx];

        // 3. 当日宜忌（基于建除值）
        var yiList = jcRule.yi.slice();
        var jiList = jcRule.ji.slice();

        // 如果大黄道为凶星，额外增加忌项
        if (dhdStar.type === '凶') {
            var dhdJi = dhdStar.desc.replace('忌', '').split('、');
            dhdJi.forEach(function(item) {
                if (item && jiList.indexOf(item) === -1) {
                    jiList.push(item);
                }
            });
        }

        return {
            // 当日宜忌
            yi: yiList,
            ji: jiList,
            // 小黄道
            jianChu: {
                index: jcIdx,
                name: jcRule.name,
                label: jianChuNames[jcIdx] + '日',
                yi: jcRule.yi,
                ji: jcRule.ji
            },
            // 大黄道
            daHuangDao: {
                index: dhdIdx,
                name: dhdStar.name,
                type: dhdStar.type,
                desc: dhdStar.desc
            }
        };
    }

    /**
     * 渲染黄历 HTML
     * @param {object} result - Bazi.generate() 返回的排盘结果
     * @returns {string} HTML 字符串
     */
    function render(result) {
        var data = analyze(result);
        if (!data) return '';

        var html = '';

        // 黄历总标题
        html += '<div class="result-card huangli-card">';
        html += '<div class="result-title">今日黄历</div>';

        // === 宜忌模块 ===
        html += '<div class="huangli-section">';
        html += '<div class="huangli-section-title">宜忌</div>';
        html += '<div class="huangli-box">';

        if (data.yi.length > 0) {
            html += '<div class="huangli-yi-row">';
            html += '<span class="huangli-label huangli-label-yi">宜</span>';
            html += '<span class="huangli-content">' + data.yi.join('、') + '</span>';
            html += '</div>';
        }
        if (data.ji.length > 0) {
            html += '<div class="huangli-ji-row">';
            html += '<span class="huangli-label huangli-label-ji">忌</span>';
            html += '<span class="huangli-content">' + data.ji.join('、') + '</span>';
            html += '</div>';
        }
        if (data.yi.length === 0 && data.ji.length === 0) {
            html += '<div class="huangli-content" style="color:#999;">诸事皆宜</div>';
        }

        html += '</div></div>';

        // === 大黄道模块 ===
        var dhd = data.daHuangDao;
        var dhdTypeColor = dhd.type === '吉' ? '#2E8B57' : '#DC143C';
        var dhdTypeBg = dhd.type === '吉' ? 'rgba(46,139,87,0.08)' : 'rgba(220,20,60,0.08)';
        html += '<div class="huangli-section">';
        html += '<div class="huangli-section-title">大黄道</div>';
        html += '<div class="huangli-box">';
        html += '<div class="huangli-star-row">';
        html += '<span class="huangli-label">值星</span>';
        html += '<span class="huangli-content">';
        html += '<span class="huangli-star-name" style="color:' + dhdTypeColor + ';background:' + dhdTypeBg + ';padding:2px 8px;border-radius:4px;font-weight:600;">' + dhd.name + '</span>';
        html += '<span class="huangli-star-type" style="color:' + dhdTypeColor + ';font-weight:600;margin-left:6px;">（' + dhd.type + '）</span>';
        html += '</span>';
        html += '</div>';
        html += '<div class="huangli-desc-row">';
        html += '<span class="huangli-label">释义</span>';
        html += '<span class="huangli-content" style="color:#6B5B4E;">' + dhd.desc + '</span>';
        html += '</div>';
        html += '</div></div>';

        // === 小黄道模块 ===
        var jc = data.jianChu;
        html += '<div class="huangli-section">';
        html += '<div class="huangli-section-title">小黄道</div>';
        html += '<div class="huangli-box">';
        html += '<div class="huangli-star-row">';
        html += '<span class="huangli-label">建除</span>';
        html += '<span class="huangli-content">';
        html += '<span class="huangli-star-name" style="color:var(--red-primary);font-weight:600;">' + jc.label + '</span>';
        html += '</span>';
        html += '</div>';

        if (jc.yi.length > 0) {
            html += '<div class="huangli-yi-row">';
            html += '<span class="huangli-label huangli-label-yi">宜</span>';
            html += '<span class="huangli-content">' + jc.yi.join('、') + '</span>';
            html += '</div>';
        }
        if (jc.ji.length > 0) {
            html += '<div class="huangli-ji-row">';
            html += '<span class="huangli-label huangli-label-ji">忌</span>';
            html += '<span class="huangli-content">' + jc.ji.join('、') + '</span>';
            html += '</div>';
        }
        if (jc.yi.length === 0 && jc.ji.length === 0) {
            html += '<div class="huangli-content" style="color:#999;">诸事皆宜</div>';
        }

        html += '</div></div>';

        // 免责声明
        html += '<div class="huangli-disclaimer">以上为传统命理文化推演，仅供了解参考，不构成任何人生决策依据。</div>';

        html += '</div>';

        return html;
    }

    // ==================== 导出 ====================
    return {
        analyze: analyze,
        render: render
    };

})();
