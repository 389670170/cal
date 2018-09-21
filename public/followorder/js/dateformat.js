/**
 * 简单的日期格式化
 * Created by haoran.shu on 2017/3/1.
 */
(function () {
  /**
   * 不足位数, 前位补 0
   * @param s 日期数字
   * @param l 截取位数
   * @returns {string}  补0后的日期数字
   */
  function p(s, l) {
    /*
     * 由于年份最多为4为，所以前面先添3个0
     * slice() 从后开始提前字符串
     */
    return ("000" + s).slice(l | 2 * -1);
  }
  /**
   * 格式化输出日期为指定格式的字符串
   * @param pattern 输出格式
   *   yyyy  --  年份
   *   MM    --  月份
   *   dd    --  日期
   *   HH    --  小时(24小时制)
   *   mm    --  分钟
   *   ss    --  秒
   */
  Date.prototype.formatString = function (pattern) {
    var x = this;
    /*
       yy?y?y? 可以匹配 y|yy|yyy|yyyy
     */
    return pattern ? pattern.replace(/(yy?y?y?|MM|dd|HH|mm|ss)/g, function (m) {
      switch (m) {
        case 'yyyy':
          return x.getFullYear();
        case 'MM':
          return p(x.getMonth() + 1);
        case 'dd':
          return p(x.getDate());
        case 'HH':
          return p(x.getHours());
        case 'mm':
          return p(x.getMinutes());
        case 'ss':
          return p(x.getSeconds());
        default :
          return m;
      }
    }) : x.toLocaleString();
  };

  /**
   * 日期格式化
   * @param d  日期
   * @param p  格式化规则
   * @constructor
   */
  var DateFormater = function(d, p) {
	  if(d instanceof Date) {
	    this.date = d;
    } else {
	    this.date = new Date(d);
    }
    this.pattern = p || 'yyyy-MM-dd HH:mm:ss';
  };

  /**
   * 格式化日期字符串(所有参数均为可选)
   * @param d 需要格式化的日期
   * @param p 格式化规则
   * @returns {*}
   */
  DateFormater.prototype.format = function(d, p) {
    if(!d) { // 没有传 date
      return this.date.formatString(p || this.pattern);
    } else {
      if(d instanceof Date) {
        return d.formatString(p || this.pattern);
      } else {
        return new Date(d).formatString(p || this.pattern);
      }
    }
  };

  window.DateFormater = DateFormater;
})();
