/**
 * Created by haoran.shu on 2018/7/6 19:23.
 */

function rInt(n, m) {
  return parseInt((Math.random() * (m - n) + n));
}

function rDouble(n, m) {
  return Math.random() * (m - n) + n;
}

class D {

  constructor() {
    this.z = rInt(70, 91); // 策略综合能力
    this.x = rDouble(1.2, 2); // 夏普比率
    this.yk = rInt(1000, 2001); // 近一周盈亏点数
    this.syl = rDouble(0.8, 1.5); // 收益率
    this.zsy = rDouble(6000, 8000); // 总收益
    this.ksjy = rInt(500, 700); // 亏损交易
    this.ksjyl = rDouble(0.3, 0.4); // 亏损交易率
    this.zdyl = rInt(800, 1000); // 做多盈利
    this.zkyl = rInt(2000, 2200); // 最空盈利
    this.zdyll = this.zdyl / (this.zdyl + this.zkyl); // 最多盈利率
    this.zkyll = 1 - this.zdyll; // 做空盈利率
    this.zdylds = rDouble(2000, 3000); // 最大盈利点数
    this.zdksds = rDouble(0, 1000); // 最大亏损点数
    this.pjylds = rDouble(1000, 2000); // 平均盈利点数
    this.pjksds = rDouble(500, 1000); // 平均亏损点数
    this.ykds = rDouble(25000, 35000); // 盈亏点数
    this.week = rDouble(14, 20); // 盈亏点数
  }

  get(key) {
    return this[key];
  }
}

let s = {
  'n6025304': new D(),
  'n6025308': new D(),
  'n6025305': new D(),
  'n6025306': new D(),
  'n6025307': new D()
};

let get = function(nameNum, key) {
  return s[nameNum].get(key);
};

console.log(s);

console.log(get('n6025304', 'zkyl'));

module.exports = get;
