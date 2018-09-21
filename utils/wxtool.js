/**
 * 微信工具类, 封装跟微信打交道的接口
 * @author: haoran.shu
 * @datetime: 2018/3/20 11:12
 */
const request = require('request');
const config = require('../config').wx;
const mongo = require('../dbs/mongodb');
const logger = require('log4js').getLogger('wxtool');
const qs = require('querystring');
const xml = require('xml2js');
const crypto = require('crypto');
const wxconfig = require('../config');

const wxServer = 'https://api.weixin.qq.com';

let appData = {
  'access_token': null, // access_token
  'access_expires': 0 // 有效时间
};

let fetch = function (opts) {
  return new Promise((resolve, reject) => {
    request(opts, function (error, res, body) {
      if (error) {
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
};

// 跟微信支付打交道的 HTTP 请求
let payFetch = function (opts) {
  let headers = opts.headers || {};
  headers['Content-Type'] = 'text/xml';
  opts.headers = headers;
  opts.method = 'POST';
  let body = opts.body;
  if (typeof body === 'object') {
    let builder = new xml.Builder({
      rootName: 'xml',
      cdata: true
    });
    body = builder.buildObject(body);
    opts.body = body;
  }
  console.log(opts.body)
  return fetch(opts);
};

module.exports = {
  /**
   * 微信授权获取用户基本数据
   * @param code  微信授权成功后的code
   */
  async authUser(code) {
    console.log("config:",config.appid);
    let url = wxServer + '/sns/oauth2/access_token?appid=' +
      config.appid + '&secret=' + config.appsecret + '&code=' + code +
      '&grant_type=authorization_code';
    logger.info(url);
    let wxResult = await fetch(url); // 获取授权 access_token
    wxResult = JSON.parse(wxResult);
    logger.info('auth_access_token: ', wxResult);
    url = wxServer + '/sns/userinfo?access_token=' +
      wxResult.access_token + '&openid=' + wxResult.openid + '&lang=zh_CN';
    wxResult = JSON.parse(await fetch(url)); // 获取用户基本信息
    logger.info('授权 userinfo: ', wxResult);
	if(!wxResult.hasOwnProperty('errcode')) { // 获取微信数据发生正确
	  mongo.updateOne("wxusers",{openid:wxResult.openid},{$set:wxResult},{upsert:true})
		.then(r => {
		  if(r.upsertedCount === 1) { // 代表为新增, 则重新插入用户数据
		    // 如果为新增则添加加入时间
			mongo.updateOne("wxusers",{openid:wxResult.openid},{$set:{join_time:new Date()}})
		  }
		});
	  return wxResult;
	}
    return null; // 获取微信数据发生错误
  },
  async authUserBase(code) {
    logger.debug('静默授权authUserBase');
    let url = wxServer + '/sns/oauth2/access_token?appid=' +
        config.appid + '&secret=' + config.appsecret + '&code=' + code +
        '&grant_type=authorization_code';
    logger.info(url);
    let wxResult = await fetch(url); // 获取授权 access_token
    logger.debug('静默授权result: ' + wxResult);
    wxResult = JSON.parse(wxResult);
    return wxResult.openid
  },
  // 执行静默授权
  async baseAuth() {
    let url = wxServer + `/connect/oauth2/authorize?appid=${config.appid}&redirect_uri=${config.wx.server}/followorder/person/finishBase&response_type=code&scope=snsapi_base#wechat_redirect`;

  },

  async weixinUrl(url) {
    let access_token = await this.access_token();
    return wxServer + url + `?access_token=${access_token}`;
  },
  /**
   * 组装微信授权 url
   * @param state   STATE
   * @return {String}
   */
  authUrl(state) {
    let redirectUri = qs.escape(config.server+'/followorder/weixin/finish');
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.appid}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
  },
  /**
   * 获取跟微信通信的 access_token
   * @returns {String}
   */
  async access_token() {
    logger.debug('access_token');
    // 没有 access_token 或者 access_token 已经过期
    if (!appData.access_token || Math.floor(new Date() / 1000) >= appData.access_expires) {
      let url = wxServer + `/cgi-bin/token?grant_type=client_credential&appid=${config.appid}&secret=${config.appsecret}`;
      logger.debug('url', url);
      let res = await fetch(url);
      logger.debug('res', res);
      res = JSON.parse(res);
      appData.access_token = res.access_token;
      appData.access_expires = Math.floor(new Date() / 1000) + res.expires_in - 60 * 10;
      return appData.access_token;
    }
    return appData.access_token;
  },
  async createMenu(menu) {
    let access_token = await this.access_token();
    let url = wxServer + `/cgi-bin/menu/create?access_token=${access_token}`;
    logger.debug(url);
    let res = await fetch({
      url: url,
      method: 'POST',
      body: menu
    });
    return res;
  },

  async send(tplBody) {
    let url = await this.weixinUrl('/cgi-bin/message/template/send');
    console.log(url);
    let res = await fetch({
      url: url,
      method: 'POST',
      body: tplBody
    });
    console.log(res)
  },
  async sendC(tplBody) {
    let url = await this.weixinUrl('/cgi-bin/message/custom/send');
    console.log(url);
    let res = await fetch({
      url: url,
      method: 'POST',
      body: tplBody
    });
    console.log(res)
  },
  async sendQr(tplBody) {
    let access_token = await this.access_token();
    let url = wxServer + `/cgi-bin/qrcode/create?access_token=${access_token}`;
    console.log(url);
    let res = await fetch({
      url: url,
      method: 'POST',
      body: tplBody
    });
    console.log(res)
    return res;
  },
  async sendPay(tplBody) {
    let url = "https://api.mch.weixin.qq.com/pay/unifiedorder";
    let res = await payFetch({
      url: url,
      method: 'POST',
      body: tplBody
    });
    console.log(res)
    return res;
  },
  async getTicket(){
    let access_token = await this.access_token();
    let url =`https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${access_token}&type=jsapi`
    let res = await fetch({
      url: url,
      method: 'GET'
    });
    console.log(res);
    return res
  },
  async getSecond(o_id){
    let redirectUri = qs.escape(config.server+'/followorder/weixin/finish');
    let url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.appid}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${o_id}#wechat_redirect`;
    console.log("urlurlurlurlurlurlurl:",url)
  /*  let res = await fetch({
      url:url,
      method:'GET'
    });
    console.log(res);*/

    return url
  },
  async getCodeNew(ccode){
    let redirectUri = qs.escape(config.server+'/followorder/person/finish');
    let url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.appid}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${ccode}#wechat_redirect`;
    return url
  },
  /**
   * 进行微信签名(排序, string, sha1)
   * @param signParam 参与签名的参数, 可以是 Array 类型, 也可以是 JSON Object 类型
   */
  sign (signParam) {
    let signStr = '';
    if(Array.isArray(signParam)) { // Array
      signParam.sort(); // 排序
      signStr = signParam.join(''); // 拼接成字符串
    } else if(typeof signParam === 'object') {
      let keys = Object.keys(signParam);
      keys.sort(); // 排序
      /* 拼接成字符串 */
      keys.forEach(function(key) {
        signStr += ('&' + key + '=' + signParam[key]);
      });
      signStr = signStr.substring(1);
    }
    // SHA-1
    let hash = crypto.createHash('sha1');
    // 进行sha1加密
    hash.update(signStr);
    signStr = hash.digest('hex');
    return signStr;
  }
};