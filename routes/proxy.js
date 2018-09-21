/**
 * Created by Administrator on 2018/5/2.
 */
const router = new require('koa-router')();
const mongodb = require('../dbs/mongodb');
const dateFormat = require('../utils/dateformat');
const wxtool = require('../utils/wxtool');
const crypto=require("crypto");
const parseString = require('xml2js').parseString
const config = require('../config');
var sign = require('../utils/sign');
const store =require('../dbs/store');
router.post('/application', async (ctx) => {
  /* ctx.session ={ openid: 'orVSzs-DcVjdi_wZ-8nw-bUHrf18',
       nickname: '咦～',
       sex: 1,
       language: 'zh_CN',
       city: '成都',
       province: '四川',
       country: '中国',
       headimgurl: 'http://thirdwx.qlogo.cn/mmopen/vi_32/hib5Y8bByEn8ma4xr4icY7s8YgYvwdnXsWviamyRrjFeuaunDHfJsuzEAiabzA4poNlHr18f8GGjlHJX3fWDhpOBlg/132',
       privilege: [],
       unionid: 'ox42FwSZfwtEKjhRH-2gHceMiai0' };*/
  console.log(ctx.session);
  await mongodb.updateOne("wxusers", {openid: ctx.session.openid},{$set:{
      name: ctx.request.body.name,
      phone: ctx.request.body.phone,
      apply_time: new Date(),
      type: 0
  }
  });
  let data = {
    head: ctx.session.headimgurl,
    name: ctx.session.nickname
  };
    let person =await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    let personDy =await mongodb.count("subscriptions",{openid:ctx.session.openid});
    //是否正在审核中
    let check = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    //查询是否是会员0不是1是
    var type = 0;
    let vip1 = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    console.log("vip:",new Date(vip1.valid_time).getTime());
    console.log("now:",Date.now());
    if(vip1.hasOwnProperty("valid_time")&&vip1.hasOwnProperty("senior_valid_time")){
        if(new Date(vip1.valid_time).getTime()< Date.now()&&new Date(vip1.senior_valid_time).getTime()< Date.now()){type =0}
        else(type =1)
    }
    else if(vip1.hasOwnProperty("valid_time")){if(new Date(vip1.valid_time).getTime()< Date.now()){type=0}else{type=1}}
    else if(vip1.hasOwnProperty("senior_valid_time")){if(new Date(vip1.senior_valid_time).getTime()< Date.now()){type=0}else{type=1}}
    else{type=0}
    ctx.redirect("/followorder/proxy/returnPerson");
/*    ctx.render('personal',{type:type,checkType:check.type,nickname:person.nickname,headurl:person.headimgurl,time:person.valid_time,dyNumber:personDy,formatDate: function(time) {
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
    }})*/
});
//代理中心
router.get("/proxyCenter", async (ctx) => {
  /*ctx.session ={ openid: 'orVSzs-DcVjdi_wZ-8nw-bUHrf18',
      nickname: '咦～',
      sex: 1,
      language: 'zh_CN',
      city: '成都',
      province: '四川',
      country: '中国',
      headimgurl: 'http://thirdwx.qlogo.cn/mmopen/vi_32/hib5Y8bByEn8ma4xr4icY7s8YgYvwdnXsWviamyRrjFeuaunDHfJsuzEAiabzA4poNlHr18f8GGjlHJX3fWDhpOBlg/132',
      privilege: [],
      unionid: 'ox42FwSZfwtEKjhRH-2gHceMiai0' };*/
  let a = await mongodb.findOne("wxusers", {openid: ctx.session.openid});
  let buy = await mongodb.count("orders", {openid: ctx.session.openid,type:1});
  let sale = await mongodb.count("sales", {openid: ctx.session.openid,carType:1});
    let sales = await mongodb.count("sales", {openid: ctx.session.openid,type:-1,carType:1});
    console.log("sale,buy:",buy,";",sale);
  let data = {
    head: ctx.session.headimgurl,
    name: ctx.session.nickname,
    sale: sales,
    reserve: a.reserve,
    buyMx: buy,
    saleMx: sale,
    reserveMx: a.reserve
  };
  console.log(data);
  ctx.body = (data)
});
//采购前查询
router.get("/findBuy",async(ctx)=>{
    let findBuy = await mongodb.find("cards",{type:0});
    let findBuy1 = await mongodb.find("cards",{type:1});
    //最小采购页面
    let smallMoney =await mongodb.findOne("carSet");
    ctx.render("proxy_buy",{list:[ {text: '初级会员',cards: findBuy}, { text: '高级会员', cards: findBuy1 } ],smallMoney:smallMoney.smallMoney})
});
//采购
router.post("/buy", async (ctx) => {
    console.log(ctx.request.body);
    console.log(typeof ctx.request.body);
    var paydata1= {
        appid: config.wx.appid,
        mch_id: config.wx.mch_id,
        nonce_str: Math.random().toString(36).substr(2),
        body: '采购',
        out_trade_no: Math.random().toString(36).substr(2),
        total_fee: Number(ctx.request.body.money)*100,
        spbill_create_ip:'192.168.1.1',
        notify_url: config.wx.server+'/followorder/proxy/paycallback',
        trade_type: 'JSAPI',
        openid: ctx.session.openid
    };
    paydata1.paySign = await router.calsign(paydata1);
    let xmlObj = {
        appid: config.wx.appid,
        mch_id: config.wx.mch_id,
        nonce_str: paydata1.nonce_str,
        sign: paydata1.paySign,
        body: '采购',
        out_trade_no: paydata1.out_trade_no,
        total_fee: Number(ctx.request.body.money)*100,
        spbill_create_ip:'192.168.1.1',
        notify_url: config.wx.server+'/followorder/proxy/paycallback',
        trade_type: 'JSAPI',
        openid:ctx.session.openid
    };
    let prepay =await wxtool.sendPay(xmlObj);
    var prep = "";
    parseString(prepay, function (err, result) {
        prep =JSON.parse(JSON.stringify(result)).xml.prepay_id
    });
    var paydata={
        "appId" :config.wx.appid,
        "timeStamp" : Math.round(new Date().getTime()/1000).toString(),
        "nonceStr": Math.random().toString(36).substr(2),
        "package": "prepay_id="+prep,
        "signType":"MD5"
    };
    paydata.paySign = await router.calsign(paydata);
    //购买人信息
    let mesg = await mongodb.findOne("wxusers",{openid:ctx.session.openid},{projection:{_id:0,nickname:1,name:1,phone:1,openid:1}});
    console.log("mesgmesgmesgmesg------------------:",mesg);
    //存入内存
    store.buy[paydata1.nonce_str] ={cards:ctx.request.body.cards,allMoney:ctx.request.body.money,openid:mesg};
    ctx.body=({code:1,paydata})

});
router.calsign=async(data) =>{
    var keyarray=[];
    for(var k in data){
        keyarray.push(k)
    }
    keyarray=keyarray.sort();
    var checkstr="";
    keyarray.forEach(function (key) {
        var value=data[key];
        if(value === undefined || value === null || value=="")
            return;
        checkstr+=`${key}=${data[key]}&`
    });

    let stringSignTemp=checkstr+"key=dc95adBCC9510BE65F5148a9f804a5ff";
    let sign1=crypto.createHash("MD5").update(stringSignTemp).digest('hex').toUpperCase();
    return sign1
};
//支付回调
router.post("/paycallback",async(ctx)=>{
    console.log("store:",store);
    var res="" ;
    parseString(ctx.request.body, function (err, result) {
        console.dir(JSON.stringify(result));
       res = JSON.stringify(result);
        res = JSON.parse(res);
    });
//明细
    var openid = store.buy[res.xml.nonce_str.toString()].openid;
    console.log("openidopenidopenid-------------:",openid);
    var cardss =store.buy[res.xml.nonce_str.toString()].cards;
    await mongodb.insertOne("orders",{
        create_time:new Date(),
        cards:cardss,
        money:store.buy[res.xml.nonce_str.toString()].allMoney,
        type:1,
        user:openid
    });
    for(var u= 0;u<cardss.length;u++){
        let olds = await mongodb.findOne("cards",{_id:cardss[u]._id});
        await mongodb.updateOne("cards",{_id:cardss[u]._id},{$set:{sold_quantity:olds.sold_quantity+cardss[u].quantity}});}
    let oldss = await mongodb.findOne("wxusers",{openid:openid.openid});
    if(oldss.hasOwnProperty("cards")==false){
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~:",cardss)
        await mongodb.updateOne("wxusers",{openid:openid.openid},{$set:{cards:cardss}})
    }
  else{  for(var x= 0;x<cardss.length;x++){
        let old = await mongodb.findOne("wxusers",{openid:openid.openid,"cards._id":cardss[x]._id},{projection:{"cards.$.quantity":1}});
        console.log("oldoldoldold:",old);
        if(old!=null){
            await mongodb.updateOne("wxusers",{openid:openid.openid,"cards._id":cardss[x]._id},{$set:{"cards.$.quantity":Number(old.cards[0].quantity)+Number(cardss[x].quantity)}})
        }
else {
            await mongodb.updateOne("wxusers", {
                openid: openid.openid
            }, {$push: {cards: cardss[x]}})
        } }}
/*    var onem =Number(store.buy[res.xml.nonce_str.toString()].oneMonth);
    var threem =Number(store.buy[res.xml.nonce_str.toString()].threeMonth);
    var sixm=Number(store.buy[res.xml.nonce_str.toString()].sixMonth);
    console.log(onem);
    console.log(typeof onem);
    let old = await mongodb.findOne("agent_users",{openid:openid});
    console.log("old:",old);
    var oldOneMonth=0;
    var oldThreeMonth=0;
    var oldSixMonth=0;
    var oldreserve=0;
    var oldpurchase=0;
    if(old.hasOwnProperty("oneMonth")==true){
        oldOneMonth = old.oneMonth
    }
    if(old.hasOwnProperty("threeMonth")==true){
        oldThreeMonth = old.threeMonth
    }
    if(old.hasOwnProperty("sixMonth")==true){
        oldSixMonth = old.sixMonth
    }
    if(old.hasOwnProperty("oneMonth")==true){
        oldreserve = old.reserve
    }
    if(old.hasOwnProperty("oneMonth")==true){
        oldpurchase = old.purchase
    }
    var oldone =old.oneMonth;
    console.log(oldone);
    console.log(typeof oldone);
    await mongodb.updateOne("agent_users",{openid:openid},{$set:{
        oneMonth:oldOneMonth+onem,
       threeMonth:oldThreeMonth+threem,
        sixMonth:oldSixMonth+sixm,
        reserve:oldreserve+onem+threem+sixm,
        purchase:oldpurchase+onem+threem+sixm
    }});*/
    //增加已售数量
 /*   let oneNum = await mongodb.findOne("monthCar",{type:"oneMonth"});
    let threeNum = await mongodb.findOne("monthCar",{type:"threeMonth"});
    let sixNum = await mongodb.findOne("monthCar",{type:"sixMonth"});
    let onen = oneNum.number;
    let threen = threeNum.number;
    let sixn = sixNum.number;
    await mongodb.updateOne("monthCar",{type:"oneMonth"},{$set:{number:onen+onem}});
    await mongodb.updateOne("monthCar",{type:"threeMonth"},{$set:{number:threen+threem}});
    await mongodb.updateOne("monthCar",{type:"sixMonth"},{$set:{number:sixn+sixm}});*/
ctx.body=('success')
});
//分享跳转type:是否激活  cartype:是否分享成功
router.get("/returnCarddetail",async(ctx)=>{
    let card = await mongodb.findOne("cards",{_id:ctx.query._id});
    let name = card.name;
    let a = await mongodb.findOne("wxusers", {openid: ctx.session.openid,"cards._id":ctx.query._id},{projection:{"cards.$.quantity":1}});
    console.log("aaaa:",a);
    var allMonth=a.cards[0].quantity;
    console.log(ctx.query);
    let wxConfig={
        appId:config.wx.appid, // 必填，公众号的唯一标识
        timestamp:new Date().getTime() , // 必填，生成签名的时间戳
        nonceStr: Math.random().toString(36).substr(2), // 必填，生成签名的随机串
        signature: ''// 必填，签名
    };
    var jsapi_ticket =await wxtool.getTicket();
    console.log("jsapi_ticket:",JSON.parse(jsapi_ticket).ticket);
    console.log("jsapi_ticket:",typeof JSON.parse(jsapi_ticket));
    var wxconfig = sign(JSON.parse(jsapi_ticket).ticket, config.wx.server+`/followorder/proxy/returnCarddetail?_id=${ctx.query._id}`);
        console.log(wxconfig);
    wxconfig.appId=config.wx.appid;
    //创建card
    let car =await mongodb.insertOne("sales",{carNumber:wxConfig.nonceStr,openid:ctx.session.openid,time:new Date(),timed:new Date(),type:0,carType:0,card_id:ctx.query._id,name:name});
    var link = config.wx.server+`/followorder/proxy/sure?o_id=${ctx.session.openid};${ctx.query._id};${wxConfig.nonceStr}`;
    ctx.render("proxy_card_detail",{wxconfig:wxconfig,name:name,stock:allMonth,link:link,_id:wxConfig.nonceStr})
});
//确认分享成功
router.post("/shareSuccess",async(ctx)=>{
    console.log("zouzhelimeiyou",ctx.request.body);
   if(ctx.request.body.type=="1"){
       await mongodb.updateOne("sales",{carNumber:ctx.request.body._id},{$set:{carType:1}})
   }
    ctx.body=("success")
});
//我的库存
router.get("/ourReserve", async (ctx) => {
  /*  ctx.session ={ openid: 'orVSzs-DcVjdi_wZ-8nw-bUHrf18',
        nickname: '咦～',
        sex: 1,
        language: 'zh_CN',
        city: '成都',
        province: '四川',
        country: '中国',
        headimgurl: 'http://thirdwx.qlogo.cn/mmopen/vi_32/hib5Y8bByEn8ma4xr4icY7s8YgYvwdnXsWviamyRrjFeuaunDHfJsuzEAiabzA4poNlHr18f8GGjlHJX3fWDhpOBlg/132',
        privilege: [],
        unionid: 'ox42FwSZfwtEKjhRH-2gHceMiai0' };*/
  let a = await mongodb.findOne("wxusers", {openid: ctx.session.openid});
    var allMonth=0;
    if(a.hasOwnProperty("cards")){
    for(var e = 0;e<a.cards.length;e++ ){
        allMonth+=a.cards[e].quantity
    }
    console.log("allMonth:",allMonth);
        let cards1=[];
        let cards2=[];
        for(var i =0;i<a.cards.length;i++){
            let b = await mongodb.findOne("cards", {_id: a.cards[i]._id});
            if(b.type==0){cards1.push(a.cards[i])}
            if(b.type==1){cards2.push(a.cards[i])}
        }
        console.log("cards1:",cards1);
        console.log("cards2:",cards2);
  let ourReserve = {
        list:[ {text: '初级会员',cards: cards1}, { text: '高级会员', cards: cards2 } ],
      allMonth:allMonth
  };
  ctx.render ("proxy_stock",ourReserve)}
    else{ctx.render("proxy_stock")}
});
//销售明细-1已完成
router.get("/saleMx/:type", async (ctx) => {
  console.log(ctx.params);
    let mx = await mongodb.find("orders",{
        "user.openid":ctx.session.openid
    });
    var allSale = 0;
    for(var i =0;i<mx.length;i++){
        allSale+=Number(mx[i].money)
    }
  let type = ctx.params.type;
  let params = {
    openid: ctx.session.openid,
      carType:1
  };
  if(type == "-1") {
    params.type = Number(type);
  }
    if(type!="0"&&type !="-1"){
        params.card_id=ctx.params.type
    }
    console.log("params:",params)
  let sale = await mongodb.find("sales", params);
  let cards = await mongodb.find("cards");
    cards.unshift({
        _id:"0",
        name:'所有'
    });

    cards.push({
        _id:"-1",
        name:'已完成'
    });
    if(type=="-1"){type=-1}
   else if(type=="0"){type=0}
    else{type=ctx.params.type}
    console.log(cards, sale, type);
  ctx.render("proxy_sell_detail", {
    cards: cards,
      sale:sale,
    allSale: allSale,
    type: type,
    formatDate: function(ds) {
      return dateFormat(new Date(ds), 'yyyy-MM-dd HH:mm')
    }
  });
});
router.get("/test1",async(ctx)=>{
      ctx.session ={ openid: 'orVSzs-DcVjdi_wZ-8nw-bUHrf18',
     nickname: '咦～',
     sex: 1,
     language: 'zh_CN',
     city: '成都',
     province: '四川',
     country: '中国',
     headimgurl: 'http://thirdwx.qlogo.cn/mmopen/vi_32/hib5Y8bByEn8ma4xr4icY7s8YgYvwdnXsWviamyRrjFeuaunDHfJsuzEAiabzA4poNlHr18f8GGjlHJX3fWDhpOBlg/132',
     privilege: [],
     unionid: 'ox42FwSZfwtEKjhRH-2gHceMiai0' };

    var subscribed=[]
    let subscribed1 = await mongodb.find("subscriptions",{openid:ctx.session.openid},{projection:{sendNumber:1}});
    for(var w =0;w<subscribed1.length;w++){
        subscribed.push(subscribed1[w].sendNumber)
    }
    console.log("ddddddddd:",subscribed1)
    let nameNumber = await mongodb.find("accounts",{status:1});
    var list=[];
    var pics=[];
    for (var n =0;n<nameNumber.length;n++) {
        var name = nameNumber[n].name;
        var nameNum = nameNumber[n].nameNum;
        let pic = await mongodb.find("lcgs", {nameNum: nameNumber[n].nameNum},{projection:{date:1,balance:1},limit:(30)});
        let ability = await mongodb.find("histories", {nameNum: nameNumber[n].nameNum});
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
        let account = await mongodb.find("accounts", {nameNum: nameNumber[n].nameNum,status:1}, {})
        var grow = profit / (account[0].balance - profit);
        let equity = await mongodb.find("lcgs", {nameNum: nameNumber[n].nameNum});
        console.log("eeeeeeeeeeeeeeeeeeeeee:",equity);
        console.log("eeeeeeeeeeeeeeeeeeeeee:",equity.length);
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
        var list1 ={name,nameNum,abilities,sharpe,point,weekTime,aveTimes,dypeople};
        list.push(list1);
        pics.push(pic)
    }
    ctx.render("strategy_list",{list:list,pics:pics,subscribed:subscribed,type:0,
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
        },isSubscribed:function(time,nameNum) {
            if(time ==0){return true}
            if(new Date(time).getTime()< Date.now()){return true}
            else{ return subscribed.indexOf(nameNum) !== -1;}
        }})
});
router.get("/returnCenter",async(ctx)=>{
        let pro = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
        let buy = await mongodb.count("orders", {"user.openid": ctx.session.openid,type:1});
        let sale = await mongodb.count("sales", {openid: ctx.session.openid,carType:1});
        let sales = await mongodb.count("sales", {openid: ctx.session.openid,type:-1});
        console.log("ddddddddddddddddddddddddd");
        let reserve = 0;
        if(pro.hasOwnProperty("cards")){
            var cards = pro.cards;

            for(var y=0;y<cards.length;y++){
                reserve+=cards[y].quantity
            }}
        let data ={
            head :ctx.session.headimgurl,
            name:ctx.session.nickname,
            sale:sales,
            reserve:reserve,
            buyMx:buy,
            saleMx:sale,
            reserveMx:reserve
        };
        console.log(data);
        ctx.render('proxy_center',data)
});
//采购明细
router.get("/buyMx",async(ctx)=>{
let mx = await mongodb.find("orders",{
    "user.openid":ctx.session.openid
});
    var allMoney = 0;
    for(var i =0;i<mx.length;i++){
        allMoney+=Number(mx[i].money)
    }
    ctx.render("proxy_buy_detail",{
        data: mx,
        allSale:allMoney,
        formatDate: function(ds) {
            return dateFormat(new Date(ds), 'yyyy-MM-dd HH:mm')
        },
        cardInfo: function(item) {
            let s = ',';
       for(var p=0;p<item.length;p++){
           s += (","+item[p].name + ':' + item[p].quantity + '张');}

            return s.substring(1);
        }
    })
});
router.get("/sure",async(ctx)=>{
    let prepay =await wxtool.getSecond(ctx.query.o_id);
    ctx.redirect(prepay)
})
//确认激活
router.get("/sure1",async(ctx)=>{
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",ctx.query.o_id);
    var typeAnd =ctx.query.o_id;
   var oid= typeAnd.split(";");
    console.log("store:",store);
    console.log(ctx.session);
    var type = oid[1];
    var carType = oid[2];
    //卡状态
    let cars = await mongodb.findOne("sales",{carNumber:oid[2]});
    console.log("1111111111111111111111")
    if(cars.type==-1){
        ctx.render("result",{title:"已经被激活",status:'error',btnText :"激活失败",url:"/followorder/proxy/returnPerson"});
    return}
    console.log("1111111111111111111111")
   let addtime1 = await mongodb.findOne("cards",{_id:type});
    let addtime = addtime1.time_limit*24*60*60*1000;
    //增加时间
    let time = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    console.log("1111111111111111111111")
    console.log(time.hasOwnProperty('senior_valid_time'))
    console.log(new Date(time.senior_valid_time).getTime()>new Date())
    if(time.hasOwnProperty('senior_valid_time')){
        console.log(time.hasOwnProperty('senior_valid_time'))
        console.log(new Date(time.senior_valid_time).getTime()>new Date())
        if(new Date(time.senior_valid_time).getTime()>new Date()){
            ctx.render("result",{title:"已开通高级会员,不能再激活初级会员卡",status:'error',btnText :"激活失败",url:"/followorder/proxy/returnPerson"});
            return
        }
    }
    let nowTime;
    console.log("addtime00000000000000000000000000000000000000:" ,addtime1);
    console.log(addtime1.type);
    if(addtime1.type==0){
        console.log("初级会员111111111111111111111111111：",addtime1.type);
    if(time==null){nowTime = new Date()}else{
    if(time.hasOwnProperty('valid_time')){
        console.log("走这里了吗:",time.hasOwnProperty("valid_time"));
        nowTime =time.valid_time
    }
    else{ nowTime =new Date()}}
    await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$set:{valid_time:new Date((nowTime).getTime()+addtime)}});}
    if(addtime1.type==1){console.log("高级会员2222222222222222222222222222222222：",addtime1.type);
        if(time==null){nowTime = new Date()}else{
            if(time.hasOwnProperty('senior_valid_time')){
                console.log("走这里了吗:",time.hasOwnProperty("senior_valid_time"));
                nowTime =time.senior_valid_time
            }
            else{ nowTime =new Date()}}
        await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$set:{senior_valid_time:new Date((nowTime).getTime()+addtime)}});}
    //扣除分享的卡
    let number=  await mongodb.findOne("wxusers",{openid:oid[0]});
    console.log("种类数量：",number[oid[1]]);
    var a = {};
    a[oid[1]] = number[oid[1]]-1;
    console.log("aaaaaaaaaaaa:",a);
    await mongodb.updateOne("wxusers",{openid:oid[0]},{$set:a});
    //改变卡状态
    await mongodb.updateOne("sales",{carNumber:oid[2]},{$set:{type:-1}});
    ctx.render("result",{btnText :"激活成功",url:"/followorder/proxy/returnPerson"})
});
//跳转到个人中心
router.get("/returnPerson",async(ctx)=>{
    let person =await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    let personDy =await mongodb.count("subscriptions",{openid:ctx.session.openid});
    //是否正在审核中
    let check = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    console.log(check);
    var checktype =1;
    if(check ==null){checktype =1}
    else{
        if(check.hasOwnProperty("type")){checktype =check.type }
        else{checktype=1}}
    //查询是否是会员0不是1是
    var type = 0;
    let vip1 = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    if(vip1.hasOwnProperty("valid_time")&&vip1.hasOwnProperty("senior_valid_time")){
        if(new Date(vip1.valid_time).getTime()< Date.now()&&new Date(vip1.senior_valid_time).getTime()< Date.now()){type =0}
        else(type =1)
    }
    else if(vip1.hasOwnProperty("valid_time")){if(new Date(vip1.valid_time).getTime()< Date.now()){type=0}else{type=1}}
    else if(vip1.hasOwnProperty("senior_valid_time")){if(new Date(vip1.senior_valid_time).getTime()< Date.now()){type=0}else{type=1}}
    else{type=0}
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
});
module.exports = router;