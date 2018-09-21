"use strict";
const app = new (require('koa'))();
const Router = require('koa-router');
const serve = require('koa-static-cache');
const path = require('path');
const render = require('koa-art-template');
const session = require('koa-session');

// 中间件
// session
app.keys = ['^startxthj-followorderend$'];
app.use(session(app));
// 模板引擎
render(app, {
  root: path.join(__dirname, 'views'),
  extname: '.html',
  debug: true
});
app.use(require('./packages/log')()); // 日志记录
app.use(serve('./public',{gzip:true})); // 静态资源
app.use(require('./packages/bodyParser')()); // post 请求参数

// 路由
const appRouter = new Router();
appRouter.use('/followorder', require('./routes/index').routes());
appRouter.use('/followorder/proxy', require('./routes/proxy').routes());
appRouter.use('/followorder/weixin', require('./routes/weixin').routes());
appRouter.use('/followorder/person', require('./routes/person').routes());
appRouter.use('/followorder/strategy', require('./routes/strategy').routes());
appRouter.use('/followorder/seniormember', require('./routes/seniormember').routes());
app.use(appRouter.routes()).use(appRouter.allowedMethods());

module.exports = app;