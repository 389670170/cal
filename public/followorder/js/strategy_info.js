/**
 * Created by haoran.shu on 2018/5/9 19:55.
 */
/**
 * 节点获取
 * @param selector  选择器
 * @param t         id(default) || class
 * @returns {*}
 */
function $(selector, t) {
  t = t || 'id';
  if(t === 'id') {
    return document.getElementById(selector);
  } else {
    return document.getElementsByClassName(selector);
  }
}

// 订阅事件
$('subscribBtn').addEventListener('click', function() {
  var _this = this;
  axreq.get('/followorder/strategy/subscription?sendNumber=' + nameNum, null, function(res) {
    _this.outerHTML = '<button class="btn subscrib-btn btn-disabled" disabled>已订阅</button>'
  });
});

// 轮滑
var $slide = $('slide'), // 响应事件的节点(滑动容器)
  $dots = $('dot', 'class'); // 定位小圆点

function updateDot(curr, next) {
  $dots[curr].className = 'dot';
  $dots[next].className = 'dot active';
}

// 滑动每一项的距离
var step = $('info-col-item', 'class')[0].offsetWidth;
/*
  最小移动距离,如果移动的距离, 超过最小距离，跳转到下一页, 否则回到本页
 */
var minMove = 10; // 最小移动距离
var index = 0;

var m = new Motion({
  elem: $slide,
  property: 'translateX',
  touchEnd(ext, pi) {
    // 判断移动的距离
    if(Math.abs(pi.end - pi.start) >= minMove) { // 跳转到下一页
      if(pi.end < pi.start) { // 下一页
        if(index === 2) {
          m.to(pi.current); // 回到初始
        } else { // 下一页
          m.to(pi.current - step);
          updateDot(index, ++index);
          // index++;
        }
      } else { // 上一页
        if(index === 0) {
          m.to(pi.current); // 回到初始
        } else {
          m.to(pi.current + step); // 上一页
          updateDot(index, --index);
        }
      }
    } else { // 回到初始
      m.to(pi.current);
    }
  }
});

// 统计图
var formater = new DateFormater('', 'MM-dd');
echarts.init($('chart'), null, {renderer: 'svg'}).setOption({
  grid: {
    containLabel: true,
    show: false,
    top: '7%',
    right: '5%',
    bottom: '13%',
    left: '10%'
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
    source: chartData
  }
});