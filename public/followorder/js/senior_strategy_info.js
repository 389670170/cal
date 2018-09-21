/**
 * 节点获取
 * @param selector  选择器
 */
function $(selector, t) {
    t = t || 'id';
    if(t === 'id') {
        return document.getElementById(selector);
    } else {
        return document.getElementsByClassName(selector);
    }
}
// 统计图
var formater = new DateFormater('', 'MM-dd');
echarts.init($('chart'), null, {renderer: 'svg'}).setOption({
    grid: {
        show: false,
        top: '7%',
        right: '8%',
        bottom: '13%',
        left: '15%'
    },
    xAxis: {
        type: 'time',
        boundaryGap: false,
        silent: true,
        axisLabel: {
            formatter: function(value) {
                // echarts.name.parseDate(value)
                return formater.format(new Date(value));
            }
        }
    },
    yAxis: {
        type: 'value'
    },
    backgroundColor: '#F8FBFF',
    color: ['#4998F6'],
    series: [{
        type: 'line',
        symbol: 'none',
        lineStyle: {
            width: 1
        }
    }],
    dataset: {
        // 这里指定了维度名的顺序，从而可以利用默认的维度到坐标轴的映射。
        // 如果不指定 dimensions，也可以通过指定 series.encode 完成映射，参见后文。
        dimensions: ['date', 'balance'],
        source: datas
    }
});