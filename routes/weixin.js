/**
 * 跟微信打交道的接口
 * @author: haoran.shu
 * @datetime: 2018/3/20 9:49
 */
const router = new require('koa-router')();
const crypto = require('crypto');
const wxtool = require('../utils/wxtool');
const { parseString } = require('xml2js');
const logger = require('log4js').getLogger('weixin');
const util = require('util');
const dateFormat = require('../utils/dateformat');
const mongodb = require('../dbs/mongodb')
const token = 'mcweeu12u89724t9wufm'; // 微信配置上的token
const s=require("../utils/s");

// 验证成为微信开发者
router.get('/check', async (ctx) => {
  let signature = ctx.query.signature;
  let tmpArr = [token, ctx.query.timestamp, ctx.query.nonce];
  tmpArr.sort(); // 对数组进行排序
  let tmpStr = tmpArr.join(''); // 拼接成字符串
  let hash = crypto.createHash('sha1');
  // 进行sha1加密
  hash.update(tmpStr);
  tmpStr = hash.digest('hex');
  if (tmpStr.toUpperCase() === signature.toUpperCase()) // 验证成功
    ctx.body = ctx.query.echostr;
});

// 授权回调   策略大厅type为0  ，我的策略type：1
router.get('/finish', async (ctx) => {
  console.log("session:",ctx.session);
  if(ctx.session.hasOwnProperty("openid")==false) {
    logger.debug('微信授权成功：', ctx.query);
    let a = await wxtool.authUser(ctx.query.code);
    ctx.session = a;
  }
  if(ctx.query.state =='stagely_hall'){
    let order =[];
    let lastDate = '';
    console.log("ctx.session:",ctx.session.openid);
    let clname = await mongodb.find("subscriptions",{openid:ctx.session.openid});
    console.log("clname:",clname);
    let type = 0;
    if(clname.length ==0){
      type =0
    }
    else{type = 1}
    for(var f =0;f<clname.length;f++){
      let cname = await mongodb.findOne("accounts",{nameNum:clname[f].sendNumber,status:1});
      if(cname ==null){continue}
        let order1 = await mongodb.find("callList",{name:cname.name},{sort:{time:-1},limit:(500)});
      order =order.concat(order1);
    }
    function compare(property){
      return function(a,b){
        var value1 = a[property];
        var value2 = b[property];
        return value2 - value1;
      }
    }
    console.log(order.length);
    order.sort(compare('time'));
    //查询是否是会员0不是1是
    var vip = 0;
    let vip1 = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    console.log("vip:",new Date(vip1.valid_time).getTime());
    console.log("now:",Date.now());
    if(vip1.hasOwnProperty("valid_time")&&vip1.hasOwnProperty("senior_valid_time")){
      if(new Date(vip1.valid_time).getTime()< Date.now()&&new Date(vip1.senior_valid_time).getTime()< Date.now()){vip =0}
      else(vip =1)
    }
    else if(vip1.hasOwnProperty("valid_time")){if(new Date(vip1.valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else if(vip1.hasOwnProperty("senior_valid_time")){if(new Date(vip1.senior_valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else{vip=0}
    console.log("vip:",vip);
    //替换order 的名字
    for(var ord=0;ord<order.length;ord++){
      let nickname1 = await mongodb.findOne("accounts",{name:order[ord].name});
      order[ord].name=nickname1.nickname
    }
      ctx.render("strategy_call_order",{
      order:order,
        type:type,
        vip:vip,
        processDate: function(time) {
          let formatDate = dateFormat(new Date(time), 'yyyy-MM-dd HH:mm:ss');
          formatDate = formatDate.split(' ');
          let resData = {
            date: formatDate[0],
            time: formatDate[1],
            hidden: true
          };
          if(lastDate !== formatDate[0]) { // 两次日期不相等, 当前项要显示日期
            resData.hidden = false;
            lastDate = formatDate[0];
          }
          return resData;
        },
        four:function(data){
        if(data =="openbuy"){return "多单进场"}
        if(data =="opensell"){return "空单进场"}
        if(data =="closebuy"){return "多单平仓"}
        if(data =="closesell"){return "空单平仓"}
      },
      one:function(data){
        if(data =="openbuy"||data=="closebuy"){return "多"}
        if(data =="opensell"||data=="closesell"){return "空"}
      }}
    )
  }

   else if(ctx.query.state =="personal"){
      let person =await mongodb.findOne("wxusers",{openid:ctx.session.openid});
     if(person.hasOwnProperty("alltime_type")==false){
    await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$set:{alltime_type:1,"send_time" : [{
      "start" : {
        "hour" : 15,
        "minute" : 0
      },
      "end" : {
        "hour" : 23,
        "minute" : 59
      },
      "type" : 0
    }, {
      "start" : {
        "hour" : 21,
        "minute" : 0
      },
      "end" : {
        "hour" : 23,
        "minute" : 59
      },
      "type" : 0
    }, {
      "start" : {
        "hour" : 0,
        "minute" : 0
      },
      "end" : {
        "hour" : 5,
        "minute" : 0
      },
      "type" : 0
    }, {
      "start" : {
        "hour" : 7,
        "minute" : 0
      },
      "end" : {
        "hour" : 16,
        "minute" : 30
      },
      "type" : 0
    }]}});}
    if(person.hasOwnProperty("people_id")==false){
      var result=async()=>{
      var numb=function(){
        var Num="";
      for(var i=0;i<6;i++)
      {
        Num+=Math.floor(Math.random()*10);
      }
        return Num
      };
     let numbers= numb();
      console.log("numbers:",numbers);
      let cunzai =await mongodb.findOne("wxusers",{people_id:numbers});
        console.log("cunzai",cunzai);
        if(cunzai!=null){result()}
        else{  return numbers}
      };
      let fina = await result();
      console.log("fina:",fina);
      await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$set:{people_id:fina}});
    }
      let personDy =await mongodb.count("subscriptions",{openid:ctx.session.openid});
      //是否正在审核中
      let check = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
      console.log(check)
      var checktype =1;
      if(check ==null){checktype =1}
      else{
     if(check.hasOwnProperty("type")){checktype =check.type }
      else{checktype=1}}
      //查询是否是会员0不是1是
      var type = 0;
      let vip1 = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    if(vip1.hasOwnProperty("valid_time")&&vip1.hasOwnProperty("senior_valid_time")){
      if(new Date(vip1.valid_time).getTime()< Date.now()&&new Date(vip1.senior_valid_time).getTime()< Date.now()){vip =0}
      else(vip =1)
    }
    else if(vip1.hasOwnProperty("valid_time")){if(new Date(vip1.valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else if(vip1.hasOwnProperty("senior_valid_time")){if(new Date(vip1.senior_valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else{vip=0}
    //会员种类,时间
    let vipType =0;
    let vipTime ;
   if(vip1.hasOwnProperty("senior_valid_time")){
      if(new Date(vip1.senior_valid_time).getTime()> Date.now()){vipType =2;vipTime = person.senior_valid_time}
     else{if(vip1.hasOwnProperty("valid_time")){
        if(new Date(vip1.valid_time).getTime()> Date.now()){vipType =1;vipTime= person.valid_time}
        else{vipType =0}
    }
      else{vipType=0}}}
    else if(vip1.hasOwnProperty("valid_time")){
      if(new Date(vip1.valid_time).getTime()> Date.now()){vipType =1;vipTime= person.valid_time}
     else{vipType =0}
    }
    else{vipType =0}
    console.log("vipType:",vipType);
        ctx.render('personal',{type:type,vipType:vipType,checkType:checktype,nickname:person.nickname,headurl:person.headimgurl,time:vipTime,dyNumber:personDy,people_id:person.people_id,formatDate: function(time) {
          if(!time) { // 未开通
            return {
              type: 0,
              message:'未开通'
            };
          } else {
            time = new Date(time);
            if(time.getTime() < Date.now()) { // 已过期
              return {
                type: 1,
                message:'已过期'
              };
            }
            else{
              return {
              type: 2,
              message:dateFormat(time, 'yyyy-MM-dd')
            };
            }
          }
        }})
    }
 else if(ctx.query.state =="callList"){
    var subscribed=[];
    console.log("openid:",ctx.session.openid);
    let subscribed1 = await mongodb.find("subscriptions",{openid:ctx.session.openid},{projection:{sendNumber:1}});
    for(var w =0;w<subscribed1.length;w++){
      let nameN = await mongodb.findOne("accounts",{nameNum:subscribed1[w].sendNumber});
      console.log("openid:",nameN);
      if(nameN.status ==1){
      subscribed.push(subscribed1[w].sendNumber)}
    }
    console.log("ddddddddd:",subscribed1)
    let nameNumber = await mongodb.find("accounts",{status:1});
    var list=[];
    var pics=[];
    for (var n =0;n<nameNumber.length;n++) {
      var name = nameNumber[n].nickname;
      var nameNum = nameNumber[n].nameNum;
      let pic = await mongodb.find("lcgs", {nameNum: nameNumber[n].nameNum},{projection:{date:1,balance:1},limit:(30)});
      let ability = await mongodb.find("histories", {nameNum: nameNumber[n].nameNum,$or:[{"order_type" : "0"},{"order_type" : "1"}]});
      var profit = 0;
      //平均持仓时间
      var aveTime = 0;
      for (var b = 0; b < ability.length; b++) {
        profit += ability[b].order_profit;
        aveTime += ability[b].ctm_end - ability[b].ctm_start
      }
      var number = ability.length;
      //策略运行时间
      var yxtime = ability[number - 1].ctm_end - ability[0].ctm_start;
      //运行周
      var weekTime = parseInt(yxtime / 1000 / 60 / 60 / 24 / 7);
      //运行天
      var dayTime = yxtime / 1000 / 60 / 60 / 24;
      //策略综合能力
      var abilities = parseInt(profit / dayTime);
      var aveTimes = parseInt(aveTime / number / 1000 / 60 / 60);
      //订阅人数
      var dypeople = await mongodb.count("subscriptions", {sendNumber: nameNumber[n].nameNum});
      //近一周盈亏点数
      var point = 0;
      let hsy = await mongodb.find('histories', {
        nameNum: nameNumber[n].nameNum, ctm_start: {"$gte": new Date(Date.now() - 7 * 86400000)}
      });
      for (var t = 0; t < hsy.length; t++) {
        if (hsy[t].order_type == "0") {
          point += (hsy[t].order_closePrice - hsy[t].order_openPrice) * 10000
        }
        if (hsy[t].order_type == "1") {
          point += (hsy[t].order_openPrice - hsy[t].order_closePrice) * 10000
        }
      }
      //夏普率
      let account = await mongodb.find("accounts", {nameNum: nameNumber[n].nameNum,status:1}, {});
      var grow = profit / (account[0].balance - profit);
      let equity = await mongodb.find("lcgs", {nameNum: nameNumber[n].nameNum});
      var stddev =0;
      var sharpe=0;
      var arr = [];
      if(equity.length!=0){
        console.log("a:",Boolean(equity!=[]));
      for (var b = 0; b < equity.length; b++) {
        arr.push(equity[b].equity)
      }
      var sum = function (x, y) {
        return x + y;
      };　　//求和函数
      var square = function (x) {
        return x * x;
      };　　//数组中每个元素求它的平方
      var data = arr;
      var mean = data.reduce(sum) / data.length;
      var deviations = data.map(function (x) {
        return x - mean;
      });
      stddev = Math.sqrt(deviations.map(square).reduce(sum) / (data.length - 1));
      sharpe = Math.abs((grow / data.length * 22 * 12 - 0.0274) / stddev);}
      if(abilities==null){abilities =0}
      console.log("sharpe:",name);
      var list1 ={name,nameNum,abilities,sharpe,point,weekTime,aveTimes,dypeople};
      list.push(list1);
      pics.push(pic)
    }
    //查找是不是会员
    var time =0;
    let vip = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
  /*  if(vip.hasOwnProperty("senior_valid_time")){time =vip.senior_valid_time}
   else if(vip.hasOwnProperty("valid_time")){
    time = vip.valid_time;}
    else{time = 0}*/
    if(vip.hasOwnProperty("valid_time")||vip.hasOwnProperty("senior_valid_time")){
      if(new Date(vip.valid_time).getTime()< Date.now()&&new Date(vip.senior_valid_time).getTime()< Date.now()){time =0}
      else(time =1)
    }else{time=0}
    //console.log("time:",time);
    ctx.render("strategy_list",{list:list,pics:pics,time:time,subscribed:subscribed,type:0,
      parseInt: function(num) {
        return parseInt(num);
      },
      fixedNum: function(num) {
      var numStr = num.toString();
      var index = numStr.indexOf('.');
      if(index === -1 || (numStr.length - index) <= 5) {
        return num;
      } else {
        return num.toFixed(5)
      }
    },stringify: function(a) {
        return JSON.stringify(a);
      },isSubscribed: function(time,nameNum) {
        if(time ==0){return true}
       else{ return subscribed.indexOf(nameNum) !== -1;}
      },name: function(name) {
       /* let length = name.length;
        if(length  > 9) {
          return name.substring(0, 5) + '...' + name.substring(length - 4)
        }*/
        return name;
      },subscribeText: function(type, time, nameNum) {
        if(type === 0) {
          if(time != 0 && subscribed.indexOf(nameNum) !== -1) {
            return '已订阅';
          } else {
            return '+订阅';
          }
        } else if(type === 1) {
          return '取消订阅';
        }
      },
      get:function(nameNum, key) {
        return s('n' + nameNum, key);
      }})
    }
  else{
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",ctx.query.state);
    var typeAnd =ctx.query.state;
    var oid= typeAnd.split(";");
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",oid[0],oid[1]);
    console.log(ctx.session);
    var type = oid[1];
    var carType = oid[2];
    //卡状态
    let cars = await mongodb.findOne("sales",{carNumber:oid[2]});
    if(cars.type==-1){
      ctx.render("result",{title:"已经被激活",status:'error',btnText :"激活失败",url:"/followorder/proxy/returnPerson"});
      return}
    let addtime1 = await mongodb.findOne("cards",{_id:type});
    console.log(addtime1);
    console.log(addtime1.time_limit);
    let addtime = (addtime1.time_limit)*24*60*60*1000;
    //增加时间
    let time = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
   /* if(time.hasOwnProperty('senior_valid_time')){
      console.log(time.hasOwnProperty('senior_valid_time'));
      console.log(new Date(time.senior_valid_time).getTime()>new Date());
      if(new Date(time.senior_valid_time).getTime()>new Date()){
        ctx.render("result",{title:"已开通高级会员,不能再激活初级会员卡",status:'error',btnText :"激活失败",url:"/followorder/proxy/returnPerson"});
        return
      }
    }*/
    let nowTime;
    console.log("addtime00000000000000000000000000000000000000:" ,addtime1);
    console.log(addtime1.type);
    if(addtime1.type==0){
      if(time.hasOwnProperty('senior_valid_time')){
        console.log(time.hasOwnProperty('senior_valid_time'));
        console.log(new Date(time.senior_valid_time).getTime()>new Date());
        if(new Date(time.senior_valid_time).getTime()>new Date()){
          ctx.render("result",{title:"已开通高级会员,不能再激活初级会员卡",status:'error',btnText :"激活失败",url:"/followorder/proxy/returnPerson"});
          return
        }
      }
      console.log("初级会员111111111111111111111111111：",addtime1.type);
      if(time==null){nowTime = new Date()}else{
        if(time.hasOwnProperty('valid_time')){
          if(new Date(time.valid_time).getTime()<new Date()){
            nowTime =new Date()
          }else{
          console.log("走这里了吗:",time.hasOwnProperty("valid_time"));
          nowTime =time.valid_time}
        }
        else{ nowTime =new Date()}}
      await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$set:{valid_time:new Date((nowTime).getTime()+addtime)}});}
    if(addtime1.type==1){console.log("高级会员2222222222222222222222222222222222：",addtime1.type);
      if(time==null){nowTime = new Date()}else{
        if(time.hasOwnProperty('senior_valid_time')){
          if(new Date(time.senior_valid_time).getTime()<new Date()){
            nowTime =new Date()
          }
          else{
          console.log("走这里了吗:",time.hasOwnProperty("senior_valid_time"));
          nowTime =time.senior_valid_time}
        }
        else{ nowTime =new Date()}}
      await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$set:{senior_valid_time:new Date((nowTime).getTime()+addtime)}});}
    //扣除分享的卡
    let number=  await mongodb.findOne("wxusers",{openid:oid[0],"cards._id":oid[1]},{projection:{"cards.$.quantity":1}});
    await mongodb.updateOne("wxusers",{openid:oid[0],"cards._id":oid[1]},{$set:{"cards.$.quantity":Number(number.cards[0].quantity)-1}});
    //改变卡状态
    await mongodb.updateOne("sales",{carNumber:oid[2]},{$set:{type:-1}});
    ctx.render("result",{btnText :"激活成功",url:"/followorder/proxy/returnPerson"})}
});

// 组装微信授权地址
router.get('/authUrl', (ctx) => {
  ctx.body = wxtool.authUrl(ctx.query.state);
  console.log(ctx.body)
});

// 创建公众号自定义菜单
router.post('/createMenu', async (ctx) => {
  let param = ctx.request.body;
  logger.debug('create menu: ', param);
  let cres = await wxtool.createMenu(param);
  logger.debug(cres);
  ctx.body = 'success';
});

// 接收微信的推送消息
router.post('/check', async (ctx) => {
  let xmlObj = await util.promisify(parseString)(ctx.request.body, {
    explicitArray: false
  });
  xmlObj = xmlObj.xml;
  let event = xmlObj['Event'];
  if(xmlObj.hasOwnProperty('Ticket')) { // 用户扫描二维码
    let sceneId; // openId
    if(event === 'SCAN') { // 用户扫描二维码, 已关注公众号
      sceneId = xmlObj['EventKey'];
    } else { // 用户扫描二维码, 未关注公众号(subscribe)
      sceneId = xmlObj['EventKey'].substring('qrscene_'.length);
    }
  }
  ctx.body = 'success';
});
router.get("/addtesttime",async(ctx)=>{
  let user = await mongodb.find("wxusers");
  for(var aa=0;aa<user.length;aa++){
    await mongodb.updateOne("wxusers",{openid:user[aa].openid},{$set:{alltime_type:1,"send_time" : [{
      "start" : {
        "hour" : 15,
        "minute" : 0
      },
      "end" : {
        "hour" : 23,
        "minute" : 59
      },
      "type" : 0
    }, {
      "start" : {
        "hour" : 21,
        "minute" : 0
      },
      "end" : {
        "hour" : 23,
        "minute" : 59
      },
      "type" : 0
    }, {
      "start" : {
        "hour" : 0,
        "minute" : 0
      },
      "end" : {
        "hour" : 5,
        "minute" : 0
      },
      "type" : 0
    }, {
      "start" : {
        "hour" : 7,
        "minute" : 0
      },
      "end" : {
        "hour" : 16,
        "minute" : 30
      },
      "type" : 0
    }]}})
  }
  ctx.body=({code:1})
});
module.exports = router;
