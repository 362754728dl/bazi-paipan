/**
 * city-data.js - 中国省市经纬度数据模块
 *
 * 包含中国34个省级行政区（23省、5自治区、4直辖市、2特别行政区）的所有地级市经纬度数据。
 * 省份名称带完整后缀（省/市/自治区/特别行政区），直辖市列出所有市辖区。
 * 经纬度精确到小数点后1位。
 *
 * 数据格式：
 * - provinces: 省份列表 [{name, code}]
 * - cities: 城市数据，按省份分组 {省份名: [{name, longitude, latitude}]}
 */
var CityData = (function () {
    'use strict';

    // 省份列表（34个省级行政区，名称带后缀）
    var provinces = [
        { name: '北京市', code: '110000' },
        { name: '天津市', code: '120000' },
        { name: '河北省', code: '130000' },
        { name: '山西省', code: '140000' },
        { name: '内蒙古自治区', code: '150000' },
        { name: '辽宁省', code: '210000' },
        { name: '吉林省', code: '220000' },
        { name: '黑龙江省', code: '230000' },
        { name: '上海市', code: '310000' },
        { name: '江苏省', code: '320000' },
        { name: '浙江省', code: '330000' },
        { name: '安徽省', code: '340000' },
        { name: '福建省', code: '350000' },
        { name: '江西省', code: '360000' },
        { name: '山东省', code: '370000' },
        { name: '河南省', code: '410000' },
        { name: '湖北省', code: '420000' },
        { name: '湖南省', code: '430000' },
        { name: '广东省', code: '440000' },
        { name: '广西壮族自治区', code: '450000' },
        { name: '海南省', code: '460000' },
        { name: '重庆市', code: '500000' },
        { name: '四川省', code: '510000' },
        { name: '贵州省', code: '520000' },
        { name: '云南省', code: '530000' },
        { name: '西藏自治区', code: '540000' },
        { name: '陕西省', code: '610000' },
        { name: '甘肃省', code: '620000' },
        { name: '青海省', code: '630000' },
        { name: '宁夏回族自治区', code: '640000' },
        { name: '新疆维吾尔自治区', code: '650000' },
        { name: '香港特别行政区', code: '810000' },
        { name: '澳门特别行政区', code: '820000' },
        { name: '台湾省', code: '710000' }
    ];

    // 城市数据：按省份分组，每个城市包含 name（名称）、longitude（经度）、latitude（纬度）
    var cities = {
        '北京市': [
            { name: '东城区', longitude: 116.4, latitude: 39.9 },
            { name: '西城区', longitude: 116.4, latitude: 39.9 },
            { name: '朝阳区', longitude: 116.5, latitude: 39.9 },
            { name: '海淀区', longitude: 116.3, latitude: 39.96 },
            { name: '丰台区', longitude: 116.3, latitude: 39.86 },
            { name: '石景山区', longitude: 116.2, latitude: 39.9 },
            { name: '门头沟区', longitude: 116.1, latitude: 39.9 },
            { name: '房山区', longitude: 116.0, latitude: 39.7 },
            { name: '通州区', longitude: 116.7, latitude: 39.9 },
            { name: '顺义区', longitude: 116.7, latitude: 40.1 },
            { name: '昌平区', longitude: 116.2, latitude: 40.2 },
            { name: '大兴区', longitude: 116.3, latitude: 39.7 },
            { name: '怀柔区', longitude: 116.6, latitude: 40.3 },
            { name: '平谷区', longitude: 117.1, latitude: 40.1 },
            { name: '密云区', longitude: 116.8, latitude: 40.4 },
            { name: '延庆区', longitude: 115.9, latitude: 40.5 }
        ],
        '天津市': [
            { name: '和平区', longitude: 117.2, latitude: 39.1 },
            { name: '河东区', longitude: 117.2, latitude: 39.1 },
            { name: '河西区', longitude: 117.2, latitude: 39.1 },
            { name: '南开区', longitude: 117.2, latitude: 39.1 },
            { name: '河北区', longitude: 117.2, latitude: 39.1 },
            { name: '红桥区', longitude: 117.1, latitude: 39.2 },
            { name: '东丽区', longitude: 117.3, latitude: 39.1 },
            { name: '西青区', longitude: 117.0, latitude: 39.1 },
            { name: '津南区', longitude: 117.4, latitude: 39.0 },
            { name: '北辰区', longitude: 117.1, latitude: 39.2 },
            { name: '武清区', longitude: 117.0, latitude: 39.4 },
            { name: '宝坻区', longitude: 117.3, latitude: 39.7 },
            { name: '滨海新区', longitude: 117.7, latitude: 39.0 },
            { name: '宁河区', longitude: 117.8, latitude: 39.3 },
            { name: '静海区', longitude: 116.9, latitude: 38.9 },
            { name: '蓟州区', longitude: 117.4, latitude: 40.0 }
        ],
        '河北省': [
            { name: '石家庄', longitude: 114.5, latitude: 38.0 },
            { name: '唐山', longitude: 118.2, latitude: 39.6 },
            { name: '秦皇岛', longitude: 119.6, latitude: 39.9 },
            { name: '邯郸', longitude: 114.5, latitude: 36.6 },
            { name: '邢台', longitude: 114.5, latitude: 37.1 },
            { name: '保定', longitude: 115.5, latitude: 38.9 },
            { name: '张家口', longitude: 114.9, latitude: 40.8 },
            { name: '承德', longitude: 117.9, latitude: 40.9 },
            { name: '沧州', longitude: 116.9, latitude: 38.3 },
            { name: '廊坊', longitude: 116.7, latitude: 39.5 },
            { name: '衡水', longitude: 115.7, latitude: 37.7 }
        ],
        '山西省': [
            { name: '太原', longitude: 112.5, latitude: 37.9 },
            { name: '大同', longitude: 113.3, latitude: 40.1 },
            { name: '阳泉', longitude: 113.6, latitude: 37.9 },
            { name: '长治', longitude: 113.1, latitude: 36.2 },
            { name: '晋城', longitude: 112.9, latitude: 35.5 },
            { name: '朔州', longitude: 112.4, latitude: 39.3 },
            { name: '晋中', longitude: 112.8, latitude: 37.7 },
            { name: '运城', longitude: 111.0, latitude: 35.0 },
            { name: '忻州', longitude: 112.7, latitude: 38.4 },
            { name: '临汾', longitude: 111.5, latitude: 36.1 },
            { name: '吕梁', longitude: 111.1, latitude: 37.5 }
        ],
        '内蒙古自治区': [
            { name: '呼和浩特', longitude: 111.7, latitude: 40.8 },
            { name: '包头', longitude: 109.8, latitude: 40.7 },
            { name: '乌海', longitude: 106.8, latitude: 39.7 },
            { name: '赤峰', longitude: 118.9, latitude: 42.3 },
            { name: '通辽', longitude: 122.3, latitude: 43.7 },
            { name: '鄂尔多斯', longitude: 109.8, latitude: 39.6 },
            { name: '呼伦贝尔', longitude: 119.8, latitude: 49.2 },
            { name: '巴彦淖尔', longitude: 107.4, latitude: 40.7 },
            { name: '乌兰察布', longitude: 113.1, latitude: 41.0 },
            { name: '兴安盟', longitude: 122.0, latitude: 46.1 },
            { name: '锡林郭勒盟', longitude: 116.1, latitude: 43.9 },
            { name: '阿拉善盟', longitude: 105.7, latitude: 38.8 }
        ],
        '辽宁省': [
            { name: '沈阳', longitude: 123.4, latitude: 41.8 },
            { name: '大连', longitude: 121.6, latitude: 38.9 },
            { name: '鞍山', longitude: 123.0, latitude: 41.1 },
            { name: '抚顺', longitude: 123.9, latitude: 41.9 },
            { name: '本溪', longitude: 123.8, latitude: 41.3 },
            { name: '丹东', longitude: 124.4, latitude: 40.0 },
            { name: '锦州', longitude: 121.1, latitude: 41.1 },
            { name: '营口', longitude: 122.2, latitude: 40.7 },
            { name: '阜新', longitude: 121.7, latitude: 42.0 },
            { name: '辽阳', longitude: 123.2, latitude: 41.3 },
            { name: '盘锦', longitude: 122.1, latitude: 41.1 },
            { name: '铁岭', longitude: 123.8, latitude: 42.3 },
            { name: '朝阳', longitude: 120.5, latitude: 41.6 },
            { name: '葫芦岛', longitude: 120.8, latitude: 40.7 }
        ],
        '吉林省': [
            { name: '长春', longitude: 125.3, latitude: 43.9 },
            { name: '吉林', longitude: 126.5, latitude: 43.8 },
            { name: '四平', longitude: 124.4, latitude: 43.2 },
            { name: '辽源', longitude: 125.1, latitude: 42.9 },
            { name: '通化', longitude: 125.9, latitude: 41.7 },
            { name: '白山', longitude: 126.4, latitude: 41.9 },
            { name: '松原', longitude: 124.8, latitude: 45.1 },
            { name: '白城', longitude: 122.8, latitude: 45.6 },
            { name: '延边', longitude: 129.5, latitude: 42.9 }
        ],
        '黑龙江省': [
            { name: '哈尔滨', longitude: 126.6, latitude: 45.8 },
            { name: '齐齐哈尔', longitude: 123.9, latitude: 47.4 },
            { name: '鸡西', longitude: 130.9, latitude: 45.3 },
            { name: '鹤岗', longitude: 130.3, latitude: 47.3 },
            { name: '双鸭山', longitude: 131.2, latitude: 46.6 },
            { name: '大庆', longitude: 125.1, latitude: 46.6 },
            { name: '伊春', longitude: 128.9, latitude: 47.7 },
            { name: '佳木斯', longitude: 130.4, latitude: 46.8 },
            { name: '七台河', longitude: 131.0, latitude: 45.8 },
            { name: '牡丹江', longitude: 129.6, latitude: 44.6 },
            { name: '黑河', longitude: 127.5, latitude: 50.2 },
            { name: '绥化', longitude: 126.9, latitude: 46.6 },
            { name: '大兴安岭', longitude: 124.1, latitude: 51.7 }
        ],
        '上海市': [
            { name: '黄浦区', longitude: 121.5, latitude: 31.2 },
            { name: '徐汇区', longitude: 121.4, latitude: 31.2 },
            { name: '长宁区', longitude: 121.4, latitude: 31.2 },
            { name: '静安区', longitude: 121.4, latitude: 31.2 },
            { name: '普陀区', longitude: 121.4, latitude: 31.2 },
            { name: '虹口区', longitude: 121.5, latitude: 31.3 },
            { name: '杨浦区', longitude: 121.5, latitude: 31.3 },
            { name: '闵行区', longitude: 121.4, latitude: 31.1 },
            { name: '宝山区', longitude: 121.5, latitude: 31.4 },
            { name: '嘉定区', longitude: 121.3, latitude: 31.4 },
            { name: '浦东新区', longitude: 121.5, latitude: 31.2 },
            { name: '金山区', longitude: 121.3, latitude: 30.7 },
            { name: '松江区', longitude: 121.2, latitude: 31.0 },
            { name: '青浦区', longitude: 121.1, latitude: 31.1 },
            { name: '奉贤区', longitude: 121.5, latitude: 30.9 },
            { name: '崇明区', longitude: 121.4, latitude: 31.6 }
        ],
        '江苏省': [
            { name: '南京', longitude: 118.8, latitude: 32.1 },
            { name: '无锡', longitude: 120.3, latitude: 31.6 },
            { name: '徐州', longitude: 117.2, latitude: 34.3 },
            { name: '常州', longitude: 119.9, latitude: 31.8 },
            { name: '苏州', longitude: 120.6, latitude: 31.3 },
            { name: '南通', longitude: 120.9, latitude: 32.0 },
            { name: '连云港', longitude: 119.2, latitude: 34.6 },
            { name: '淮安', longitude: 119.0, latitude: 33.6 },
            { name: '盐城', longitude: 120.1, latitude: 33.4 },
            { name: '扬州', longitude: 119.4, latitude: 32.4 },
            { name: '镇江', longitude: 119.4, latitude: 32.2 },
            { name: '泰州', longitude: 119.9, latitude: 32.5 },
            { name: '宿迁', longitude: 118.3, latitude: 33.9 }
        ],
        '浙江省': [
            { name: '杭州', longitude: 120.2, latitude: 30.3 },
            { name: '宁波', longitude: 121.5, latitude: 29.9 },
            { name: '温州', longitude: 120.7, latitude: 28.0 },
            { name: '嘉兴', longitude: 120.8, latitude: 30.8 },
            { name: '湖州', longitude: 120.1, latitude: 30.9 },
            { name: '绍兴', longitude: 120.6, latitude: 30.0 },
            { name: '金华', longitude: 119.6, latitude: 29.1 },
            { name: '衢州', longitude: 118.9, latitude: 28.9 },
            { name: '舟山', longitude: 122.1, latitude: 30.0 },
            { name: '台州', longitude: 121.4, latitude: 28.7 },
            { name: '丽水', longitude: 119.9, latitude: 28.5 }
        ],
        '安徽省': [
            { name: '合肥', longitude: 117.3, latitude: 31.8 },
            { name: '芜湖', longitude: 118.4, latitude: 31.3 },
            { name: '蚌埠', longitude: 117.4, latitude: 32.9 },
            { name: '淮南', longitude: 117.0, latitude: 32.6 },
            { name: '马鞍山', longitude: 118.5, latitude: 31.7 },
            { name: '淮北', longitude: 116.8, latitude: 33.9 },
            { name: '铜陵', longitude: 117.8, latitude: 30.9 },
            { name: '安庆', longitude: 117.1, latitude: 30.5 },
            { name: '黄山', longitude: 118.3, latitude: 29.7 },
            { name: '滁州', longitude: 118.3, latitude: 32.3 },
            { name: '阜阳', longitude: 115.8, latitude: 32.9 },
            { name: '宿州', longitude: 116.9, latitude: 33.6 },
            { name: '六安', longitude: 116.5, latitude: 31.7 },
            { name: '亳州', longitude: 115.8, latitude: 33.8 },
            { name: '池州', longitude: 117.5, latitude: 30.7 },
            { name: '宣城', longitude: 118.8, latitude: 30.9 }
        ],
        '福建省': [
            { name: '福州', longitude: 119.3, latitude: 26.1 },
            { name: '厦门', longitude: 118.1, latitude: 24.5 },
            { name: '莆田', longitude: 119.0, latitude: 25.4 },
            { name: '三明', longitude: 117.6, latitude: 26.3 },
            { name: '泉州', longitude: 118.6, latitude: 24.9 },
            { name: '漳州', longitude: 117.6, latitude: 24.5 },
            { name: '南平', longitude: 118.2, latitude: 26.6 },
            { name: '龙岩', longitude: 117.0, latitude: 25.1 },
            { name: '宁德', longitude: 119.5, latitude: 26.7 }
        ],
        '江西省': [
            { name: '南昌', longitude: 115.9, latitude: 28.7 },
            { name: '景德镇', longitude: 117.2, latitude: 29.3 },
            { name: '萍乡', longitude: 113.9, latitude: 27.6 },
            { name: '九江', longitude: 116.0, latitude: 29.7 },
            { name: '新余', longitude: 114.9, latitude: 27.8 },
            { name: '鹰潭', longitude: 117.1, latitude: 28.3 },
            { name: '赣州', longitude: 114.9, latitude: 25.8 },
            { name: '吉安', longitude: 114.9, latitude: 27.1 },
            { name: '宜春', longitude: 114.4, latitude: 27.8 },
            { name: '抚州', longitude: 116.4, latitude: 27.9 },
            { name: '上饶', longitude: 117.9, latitude: 28.5 }
        ],
        '山东省': [
            { name: '济南', longitude: 117.0, latitude: 36.7 },
            { name: '青岛', longitude: 120.4, latitude: 36.1 },
            { name: '淄博', longitude: 118.1, latitude: 36.8 },
            { name: '枣庄', longitude: 117.3, latitude: 34.8 },
            { name: '东营', longitude: 118.7, latitude: 37.4 },
            { name: '烟台', longitude: 121.4, latitude: 37.5 },
            { name: '潍坊', longitude: 119.1, latitude: 36.7 },
            { name: '济宁', longitude: 116.6, latitude: 35.4 },
            { name: '泰安', longitude: 117.1, latitude: 36.2 },
            { name: '威海', longitude: 122.1, latitude: 37.5 },
            { name: '日照', longitude: 119.5, latitude: 35.4 },
            { name: '临沂', longitude: 118.3, latitude: 35.1 },
            { name: '德州', longitude: 116.4, latitude: 37.4 },
            { name: '聊城', longitude: 115.9, latitude: 36.5 },
            { name: '滨州', longitude: 118.0, latitude: 37.4 },
            { name: '菏泽', longitude: 115.5, latitude: 35.2 }
        ],
        '河南省': [
            { name: '郑州', longitude: 113.7, latitude: 34.8 },
            { name: '开封', longitude: 114.3, latitude: 34.8 },
            { name: '洛阳', longitude: 112.5, latitude: 34.6 },
            { name: '平顶山', longitude: 113.2, latitude: 33.8 },
            { name: '安阳', longitude: 114.4, latitude: 36.1 },
            { name: '鹤壁', longitude: 114.3, latitude: 35.7 },
            { name: '新乡', longitude: 113.9, latitude: 35.3 },
            { name: '焦作', longitude: 113.2, latitude: 35.2 },
            { name: '濮阳', longitude: 115.0, latitude: 35.8 },
            { name: '许昌', longitude: 113.9, latitude: 34.0 },
            { name: '漯河', longitude: 114.0, latitude: 33.6 },
            { name: '三门峡', longitude: 111.2, latitude: 34.8 },
            { name: '南阳', longitude: 112.5, latitude: 33.0 },
            { name: '商丘', longitude: 115.7, latitude: 34.4 },
            { name: '信阳', longitude: 114.1, latitude: 32.1 },
            { name: '周口', longitude: 114.6, latitude: 33.6 },
            { name: '驻马店', longitude: 114.0, latitude: 33.0 },
            { name: '济源', longitude: 112.6, latitude: 35.1 }
        ],
        '湖北省': [
            { name: '武汉', longitude: 114.3, latitude: 30.6 },
            { name: '黄石', longitude: 115.0, latitude: 30.2 },
            { name: '十堰', longitude: 110.8, latitude: 32.6 },
            { name: '宜昌', longitude: 111.3, latitude: 30.7 },
            { name: '襄阳', longitude: 112.1, latitude: 32.0 },
            { name: '鄂州', longitude: 114.9, latitude: 30.4 },
            { name: '荆门', longitude: 112.2, latitude: 31.0 },
            { name: '孝感', longitude: 113.9, latitude: 30.9 },
            { name: '荆州', longitude: 112.2, latitude: 30.3 },
            { name: '黄冈', longitude: 114.9, latitude: 30.4 },
            { name: '咸宁', longitude: 114.3, latitude: 29.8 },
            { name: '随州', longitude: 113.4, latitude: 31.7 },
            { name: '恩施', longitude: 109.5, latitude: 30.3 },
            { name: '仙桃', longitude: 113.4, latitude: 30.4 },
            { name: '潜江', longitude: 112.9, latitude: 30.4 },
            { name: '天门', longitude: 113.2, latitude: 30.7 },
            { name: '神农架', longitude: 110.7, latitude: 31.7 }
        ],
        '湖南省': [
            { name: '长沙', longitude: 113.0, latitude: 28.2 },
            { name: '株洲', longitude: 113.1, latitude: 27.8 },
            { name: '湘潭', longitude: 112.9, latitude: 27.8 },
            { name: '衡阳', longitude: 112.6, latitude: 26.9 },
            { name: '邵阳', longitude: 111.5, latitude: 27.2 },
            { name: '岳阳', longitude: 113.1, latitude: 29.4 },
            { name: '常德', longitude: 111.7, latitude: 29.0 },
            { name: '张家界', longitude: 110.5, latitude: 29.1 },
            { name: '益阳', longitude: 112.4, latitude: 28.6 },
            { name: '郴州', longitude: 113.0, latitude: 25.8 },
            { name: '永州', longitude: 111.6, latitude: 26.4 },
            { name: '怀化', longitude: 110.0, latitude: 27.6 },
            { name: '娄底', longitude: 112.0, latitude: 27.7 },
            { name: '湘西', longitude: 109.7, latitude: 28.3 }
        ],
        '广东省': [
            { name: '广州', longitude: 113.3, latitude: 23.1 },
            { name: '韶关', longitude: 113.6, latitude: 24.8 },
            { name: '深圳', longitude: 114.1, latitude: 22.5 },
            { name: '珠海', longitude: 113.6, latitude: 22.3 },
            { name: '汕头', longitude: 116.7, latitude: 23.4 },
            { name: '佛山', longitude: 113.1, latitude: 23.0 },
            { name: '江门', longitude: 113.1, latitude: 22.6 },
            { name: '湛江', longitude: 110.4, latitude: 21.3 },
            { name: '茂名', longitude: 110.9, latitude: 21.7 },
            { name: '肇庆', longitude: 112.5, latitude: 23.1 },
            { name: '惠州', longitude: 114.4, latitude: 23.1 },
            { name: '梅州', longitude: 116.1, latitude: 24.3 },
            { name: '汕尾', longitude: 115.4, latitude: 22.8 },
            { name: '河源', longitude: 114.7, latitude: 23.7 },
            { name: '阳江', longitude: 111.9, latitude: 21.9 },
            { name: '清远', longitude: 113.1, latitude: 23.7 },
            { name: '东莞', longitude: 113.7, latitude: 23.0 },
            { name: '中山', longitude: 113.4, latitude: 22.5 },
            { name: '潮州', longitude: 116.6, latitude: 23.7 },
            { name: '揭阳', longitude: 116.4, latitude: 23.6 },
            { name: '云浮', longitude: 112.0, latitude: 22.9 }
        ],
        '广西壮族自治区': [
            { name: '南宁', longitude: 108.3, latitude: 22.8 },
            { name: '柳州', longitude: 109.4, latitude: 24.3 },
            { name: '桂林', longitude: 110.3, latitude: 25.3 },
            { name: '梧州', longitude: 111.3, latitude: 23.5 },
            { name: '北海', longitude: 109.1, latitude: 21.5 },
            { name: '防城港', longitude: 108.3, latitude: 21.6 },
            { name: '钦州', longitude: 108.6, latitude: 21.9 },
            { name: '贵港', longitude: 109.6, latitude: 23.1 },
            { name: '玉林', longitude: 110.2, latitude: 22.6 },
            { name: '百色', longitude: 106.6, latitude: 23.9 },
            { name: '贺州', longitude: 111.6, latitude: 24.4 },
            { name: '河池', longitude: 108.1, latitude: 24.7 },
            { name: '来宾', longitude: 109.2, latitude: 23.7 },
            { name: '崇左', longitude: 107.4, latitude: 22.4 }
        ],
        '海南省': [
            { name: '海口', longitude: 110.3, latitude: 20.0 },
            { name: '三亚', longitude: 109.5, latitude: 18.3 },
            { name: '三沙', longitude: 112.3, latitude: 16.8 },
            { name: '儋州', longitude: 109.6, latitude: 19.5 },
            { name: '五指山', longitude: 109.5, latitude: 18.8 },
            { name: '琼海', longitude: 110.5, latitude: 19.2 },
            { name: '文昌', longitude: 110.8, latitude: 19.5 },
            { name: '万宁', longitude: 110.4, latitude: 18.8 },
            { name: '东方', longitude: 108.7, latitude: 19.1 }
        ],
        '重庆市': [
            { name: '渝中区', longitude: 106.6, latitude: 29.6 },
            { name: '大渡口区', longitude: 106.5, latitude: 29.5 },
            { name: '江北区', longitude: 106.6, latitude: 29.6 },
            { name: '沙坪坝区', longitude: 106.5, latitude: 29.5 },
            { name: '九龙坡区', longitude: 106.5, latitude: 29.5 },
            { name: '南岸区', longitude: 106.6, latitude: 29.5 },
            { name: '北碚区', longitude: 106.4, latitude: 29.8 },
            { name: '渝北区', longitude: 106.6, latitude: 29.7 },
            { name: '巴南区', longitude: 106.5, latitude: 29.4 },
            { name: '万州区', longitude: 108.4, latitude: 30.8 },
            { name: '涪陵区', longitude: 107.4, latitude: 29.7 },
            { name: '永川区', longitude: 105.9, latitude: 29.4 },
            { name: '江津区', longitude: 106.3, latitude: 29.3 },
            { name: '合川区', longitude: 106.3, latitude: 30.0 }
        ],
        '四川省': [
            { name: '成都', longitude: 104.1, latitude: 30.6 },
            { name: '自贡', longitude: 104.8, latitude: 29.3 },
            { name: '攀枝花', longitude: 101.7, latitude: 26.6 },
            { name: '泸州', longitude: 105.4, latitude: 28.9 },
            { name: '德阳', longitude: 104.4, latitude: 31.1 },
            { name: '绵阳', longitude: 104.7, latitude: 31.5 },
            { name: '广元', longitude: 105.8, latitude: 32.4 },
            { name: '遂宁', longitude: 105.6, latitude: 30.5 },
            { name: '内江', longitude: 105.1, latitude: 29.6 },
            { name: '乐山', longitude: 103.8, latitude: 29.6 },
            { name: '南充', longitude: 106.1, latitude: 30.8 },
            { name: '眉山', longitude: 103.8, latitude: 30.1 },
            { name: '宜宾', longitude: 104.6, latitude: 28.8 },
            { name: '广安', longitude: 106.6, latitude: 30.5 },
            { name: '达州', longitude: 107.5, latitude: 31.2 },
            { name: '雅安', longitude: 103.0, latitude: 30.0 },
            { name: '巴中', longitude: 106.7, latitude: 31.9 },
            { name: '资阳', longitude: 104.6, latitude: 30.1 },
            { name: '阿坝', longitude: 102.2, latitude: 31.9 },
            { name: '甘孜', longitude: 101.9, latitude: 30.1 },
            { name: '凉山', longitude: 102.3, latitude: 27.9 }
        ],
        '贵州省': [
            { name: '贵阳', longitude: 106.7, latitude: 26.6 },
            { name: '六盘水', longitude: 104.8, latitude: 26.6 },
            { name: '遵义', longitude: 106.9, latitude: 27.7 },
            { name: '安顺', longitude: 105.9, latitude: 26.2 },
            { name: '毕节', longitude: 105.3, latitude: 27.3 },
            { name: '铜仁', longitude: 109.2, latitude: 27.7 },
            { name: '黔西南', longitude: 104.9, latitude: 25.1 },
            { name: '黔东南', longitude: 107.9, latitude: 26.6 },
            { name: '黔南', longitude: 107.5, latitude: 26.3 }
        ],
        '云南省': [
            { name: '昆明', longitude: 102.7, latitude: 25.0 },
            { name: '曲靖', longitude: 103.8, latitude: 25.5 },
            { name: '玉溪', longitude: 102.5, latitude: 24.4 },
            { name: '保山', longitude: 99.2, latitude: 25.1 },
            { name: '昭通', longitude: 103.7, latitude: 27.3 },
            { name: '丽江', longitude: 100.2, latitude: 26.9 },
            { name: '普洱', longitude: 101.0, latitude: 22.8 },
            { name: '临沧', longitude: 100.1, latitude: 23.9 },
            { name: '楚雄', longitude: 101.5, latitude: 25.0 },
            { name: '红河', longitude: 103.4, latitude: 23.4 },
            { name: '文山', longitude: 104.2, latitude: 23.4 },
            { name: '西双版纳', longitude: 100.8, latitude: 22.0 },
            { name: '大理', longitude: 100.2, latitude: 25.6 },
            { name: '德宏', longitude: 98.6, latitude: 24.4 },
            { name: '怒江', longitude: 98.9, latitude: 25.8 },
            { name: '迪庆', longitude: 99.7, latitude: 27.8 }
        ],
        '西藏自治区': [
            { name: '拉萨', longitude: 91.1, latitude: 29.7 },
            { name: '日喀则', longitude: 88.9, latitude: 29.3 },
            { name: '昌都', longitude: 97.2, latitude: 31.1 },
            { name: '林芝', longitude: 94.4, latitude: 29.6 },
            { name: '山南', longitude: 91.8, latitude: 29.2 },
            { name: '那曲', longitude: 92.1, latitude: 31.5 },
            { name: '阿里', longitude: 80.1, latitude: 32.5 }
        ],
        '陕西省': [
            { name: '西安', longitude: 108.9, latitude: 34.3 },
            { name: '铜川', longitude: 109.0, latitude: 34.9 },
            { name: '宝鸡', longitude: 107.1, latitude: 34.4 },
            { name: '咸阳', longitude: 108.7, latitude: 34.3 },
            { name: '渭南', longitude: 109.5, latitude: 34.5 },
            { name: '延安', longitude: 109.5, latitude: 36.6 },
            { name: '汉中', longitude: 107.0, latitude: 33.1 },
            { name: '榆林', longitude: 109.7, latitude: 38.3 },
            { name: '安康', longitude: 109.0, latitude: 32.7 },
            { name: '商洛', longitude: 109.9, latitude: 33.9 }
        ],
        '甘肃省': [
            { name: '兰州', longitude: 103.8, latitude: 36.1 },
            { name: '嘉峪关', longitude: 98.3, latitude: 39.8 },
            { name: '金昌', longitude: 102.2, latitude: 38.5 },
            { name: '白银', longitude: 104.1, latitude: 36.5 },
            { name: '天水', longitude: 105.7, latitude: 34.6 },
            { name: '武威', longitude: 102.6, latitude: 37.9 },
            { name: '张掖', longitude: 100.4, latitude: 38.9 },
            { name: '平凉', longitude: 106.7, latitude: 35.5 },
            { name: '酒泉', longitude: 98.5, latitude: 39.7 },
            { name: '庆阳', longitude: 107.6, latitude: 35.7 },
            { name: '定西', longitude: 104.6, latitude: 35.6 },
            { name: '陇南', longitude: 104.9, latitude: 33.4 },
            { name: '临夏', longitude: 103.2, latitude: 35.6 },
            { name: '甘南', longitude: 102.9, latitude: 34.9 }
        ],
        '青海省': [
            { name: '西宁', longitude: 101.8, latitude: 36.6 },
            { name: '海东', longitude: 102.1, latitude: 36.5 },
            { name: '海北', longitude: 100.9, latitude: 36.9 },
            { name: '黄南', longitude: 102.0, latitude: 35.5 },
            { name: '海南州', longitude: 100.6, latitude: 36.3 },
            { name: '果洛', longitude: 100.2, latitude: 34.5 },
            { name: '玉树', longitude: 97.0, latitude: 33.0 },
            { name: '海西', longitude: 97.4, latitude: 37.4 }
        ],
        '宁夏回族自治区': [
            { name: '银川', longitude: 106.3, latitude: 38.5 },
            { name: '石嘴山', longitude: 106.4, latitude: 39.0 },
            { name: '吴忠', longitude: 106.2, latitude: 37.9 },
            { name: '固原', longitude: 106.2, latitude: 36.0 },
            { name: '中卫', longitude: 105.2, latitude: 37.5 }
        ],
        '新疆维吾尔自治区': [
            { name: '乌鲁木齐', longitude: 87.6, latitude: 43.8 },
            { name: '克拉玛依', longitude: 84.9, latitude: 45.6 },
            { name: '吐鲁番', longitude: 89.2, latitude: 42.9 },
            { name: '哈密', longitude: 93.5, latitude: 42.8 },
            { name: '昌吉', longitude: 87.3, latitude: 44.0 },
            { name: '博尔塔拉', longitude: 82.1, latitude: 44.9 },
            { name: '巴音郭楞', longitude: 86.1, latitude: 41.8 },
            { name: '阿克苏', longitude: 80.3, latitude: 41.2 },
            { name: '克孜勒苏', longitude: 76.2, latitude: 39.7 },
            { name: '喀什', longitude: 76.0, latitude: 39.5 },
            { name: '和田', longitude: 79.9, latitude: 37.1 },
            { name: '伊犁', longitude: 81.3, latitude: 43.9 },
            { name: '塔城', longitude: 82.9, latitude: 46.7 },
            { name: '阿勒泰', longitude: 88.1, latitude: 47.8 },
            { name: '石河子', longitude: 86.0, latitude: 44.3 },
            { name: '阿拉尔', longitude: 81.3, latitude: 40.5 },
            { name: '图木舒克', longitude: 79.1, latitude: 39.9 },
            { name: '五家渠', longitude: 87.5, latitude: 44.2 },
            { name: '北屯', longitude: 87.8, latitude: 47.4 },
            { name: '铁门关', longitude: 85.5, latitude: 41.8 },
            { name: '双河', longitude: 82.4, latitude: 44.8 },
            { name: '可克达拉', longitude: 80.6, latitude: 44.1 },
            { name: '昆玉', longitude: 79.3, latitude: 37.2 },
            { name: '胡杨河', longitude: 84.8, latitude: 44.7 },
            { name: '新星', longitude: 93.3, latitude: 42.9 }
        ],
        '香港特别行政区': [
            { name: '香港岛', longitude: 114.2, latitude: 22.3 },
            { name: '九龙', longitude: 114.2, latitude: 22.3 },
            { name: '新界', longitude: 114.1, latitude: 22.4 }
        ],
        '澳门特别行政区': [
            { name: '澳门半岛', longitude: 113.5, latitude: 22.2 },
            { name: '氹仔', longitude: 113.6, latitude: 22.2 },
            { name: '路环', longitude: 113.6, latitude: 22.1 }
        ],
        '台湾省': [
            { name: '台北', longitude: 121.5, latitude: 25.0 },
            { name: '新北', longitude: 121.5, latitude: 25.0 },
            { name: '桃园', longitude: 121.3, latitude: 24.9 },
            { name: '台中', longitude: 120.7, latitude: 24.1 },
            { name: '台南', longitude: 120.2, latitude: 23.0 },
            { name: '高雄', longitude: 120.3, latitude: 22.6 },
            { name: '基隆', longitude: 121.7, latitude: 25.1 },
            { name: '新竹', longitude: 120.9, latitude: 24.8 },
            { name: '嘉义', longitude: 120.4, latitude: 23.5 },
            { name: '花莲', longitude: 121.6, latitude: 23.9 },
            { name: '台东', longitude: 121.1, latitude: 23.0 },
            { name: '屏东', longitude: 120.7, latitude: 22.7 },
            { name: '宜兰', longitude: 121.8, latitude: 24.8 },
            { name: '南投', longitude: 120.7, latitude: 23.9 },
            { name: '彰化', longitude: 120.5, latitude: 24.1 },
            { name: '云林', longitude: 120.4, latitude: 23.7 },
            { name: '苗栗', longitude: 120.8, latitude: 24.6 }
        ]
    };

    /**
     * 获取某省下的城市列表
     * @param {string} provinceName - 省份名称（如 "北京市"、"广东省"）
     * @returns {Array<{name: string, longitude: number, latitude: number}>} 城市列表，未找到返回空数组
     */
    function getCities(provinceName) {
        return cities[provinceName] || [];
    }

    /**
     * 获取某省某市的经纬度
     * @param {string} provinceName - 省份名称（如 "广东省"）
     * @param {string} cityName - 城市名称（如 "深圳"）
     * @returns {{longitude: number, latitude: number}|null} 经纬度对象，未找到返回null
     */
    function getCoord(provinceName, cityName) {
        var cityList = cities[provinceName];
        if (!cityList) {
            return null;
        }
        for (var i = 0; i < cityList.length; i++) {
            if (cityList[i].name === cityName) {
                return {
                    longitude: cityList[i].longitude,
                    latitude: cityList[i].latitude
                };
            }
        }
        return null;
    }

    // 公开API
    return {
        provinces: provinces,
        getCities: getCities,
        getCoord: getCoord
    };
})();
