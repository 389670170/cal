/**
 * 修改公众号菜单
 * @author: haoran.shu
 * @datetime: 2018/3/20 15:34
 */
const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const config =require('./config')

/**
 * nodejs HTTP 请求封装
 * 关于 option 的配置参考：http://nodejs.cn/api/http.html#http_http_request_options_callback
 * @param url: 请求的 url 地址, 可以不填, 然后在 option 参数中进行相关配置
 * @param option: 请求的配置参数, 带有原始的 nodejs htt.request option 参数
 *   -- 新增一个 body 参数为请求的内容, 如果
 */
let fetch = function(urlstr, option) {
  return new Promise((resolve, reject) => {
    const httpOption = {method: 'GET'};
    Object.assign(httpOption, url.parse(encodeURI(urlstr)), option); // 合并配置
    let postData = httpOption.body; // 获取请求内容
    delete httpOption.body;
    const req = http.request(httpOption, (res) => {
      let resData = '', statusCode = res.statusCode;
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        resData += chunk;
      });
      res.on('end', () => {
        if(statusCode === 302) { // 响应重定向
          resolve('请求成功，' + resData);
        } else if(statusCode === 200) { // 请求成功
          let ct = res.headers['content-type'];
          if(ct && ct.indexOf('text/html') !== -1) { // 渲染响应, render
            resolve('请求成功, render html');
          } else {
            resolve(resData);
          }
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    // 写入数据到请求主体
    if(postData) {
      let reqContentType = '';
      if(httpOption.method.toUpperCase() === 'POST') {
        if(option.headers) {
          reqContentType = option.headers['Content-Type'];
        }
      }
      if(reqContentType.indexOf('application/json') !== -1) {
        req.write(JSON.stringify(postData));
      } else if(reqContentType.indexOf('urlencoded') !== -1) {
        req.write(querystring.stringify(postData));
      } else {
        req.write(postData.toString());
      }
    }
    req.end();
  });
};

const BASESERVER = config.wx.server;
// const BASESERVER = 'http://192.168.31.59:3000';

async function menuButton() {
  let menu = {
    "button":[{
      type: 'view',
      name: '策略大厅',
      url: await fetch(BASESERVER + '/followorder/weixin/authUrl?state=callList')
    },{
      type: 'view',
      name: '喊单',
      url: await fetch(BASESERVER + '/followorder/weixin/authUrl?state=stagely_hall')
    }, {
      type: 'view',
      name: '个人中心',
      url: await fetch(BASESERVER + '/followorder/weixin/authUrl?state=personal')
    }]
  };
  return menu;
}

menuButton().then(async (m) => {
  console.log(m);
  let cm = await fetch(BASESERVER + '/followorder/weixin/createMenu', {
    method: 'POST',
    body: JSON.stringify(m),
    headers: {
      'Content-Type': 'text/plain;encode=utf-8'
    }
  });
  console.log('\nchange menu: ' + cm);
});
