/**
 * Created by haoran.shu on 2018/5/8 20:07.
 */
function $(selector, t) {
  t = t || 'id';
  if(t === 'id') {
    return document.getElementById(selector);
  } else {
    return document.getElementsByClassName(selector);
  }
}

pics.forEach(function(item, index) {
  var d = pics[index];
  if(d && d.length > 0) {
    echarts.init($('chart' + index)).setOption({
      grid: {
        show: false,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      xAxis: {
        show: false,
        type: 'category'
      },
      yAxis: {
        show: false,
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
        dimensions: ['date', 'balance'],
        source: d
      }
    });
  }
});
var $btns = $('btn', 'class');
for(var i = 0, l = $btns.length; i < l; i++) {
  $btns[i].addEventListener('click', function(e) {
    var d = this.getAttribute('data-d').split('_');
    var _this = this;
    if(d[0] === '0') { // 策略大厅 -- 订阅
      axreq.get('/followorder/strategy/subscription?sendNumber=' + d[1], null, function(res) {
        _this.outerHTML = '<button class="btn scrib-btn-disabled" disabled>已订阅</button>'
      });
    } else { // 我的订阅 -- 取消订阅
      location.href = '/followorder/strategy/cancel?sendNumber=' + d[1];
    }
    e.stopPropagation(); // 阻止事件传播
  });
}
