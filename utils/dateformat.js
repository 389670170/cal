/**
 * 日期格式化工具类
 * Created by haoran.shu on 2017/11/30.
 */

/**
 * 不足位数, 前位补 0
 * @param s 日期数字
 * @param l 截取位数
 * @returns {string}  补0后的日期数字
 */
function p(s, ...l) {
  /*
   * 由于年份最多为4为，所以前面先添3个0
   * slice() 从后开始提前字符串
   */
  return ("000" + s).slice(l | 2 * -1);
}

/**
 * 格式化输出日期为指定格式的字符串
 * @param date Date
 * @param pattern 输出格式
 *   yyyy  --  年份
 *   MM    --  月份
 *   dd    --  日期
 *   HH    --  小时(24小时制)
 *   mm    --  分钟
 *   ss    --  秒
 */
module.exports = function(date, pattern) {
  /*
   * yy?y?y? 可以匹配 y|yy|yyy|yyyy
   */
  return pattern ? pattern.replace(/(yy?y?y?|MM|dd|HH|mm|ss)/g, function (m) {
    switch (m) {
      case 'yyyy':
        return date.getFullYear();
      case 'MM':
        return p(date.getMonth() + 1);
      case 'dd':
        return p(date.getDate());
      case 'HH':
        return p(date.getHours());
      case 'mm':
        return p(date.getMinutes());
      case 'ss':
        return p(date.getSeconds());
      default :
        return m;
    }
  }) : date.toLocaleString();
};
