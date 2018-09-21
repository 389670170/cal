/**
 * Created by Administrator on 2018/5/7.
 */
const router = new require('koa-router')();
const mongodb = require('../dbs/mongodb');
const dateFormat = require('../utils/dateformat');
const wxtool = require('../utils/wxtool');
const crypto=require("crypto");
const parseString = require('xml2js').parseString;
const config = require('../config');
const store = require("../dbs/store");
const objectId = require('mongodb').ObjectID;
const wxServer = 'https://open.weixin.qq.com';

//跳转到代理
router.get("/returnApplication",async(ctx)=>{
    let proxy = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    console.log(proxy);
    if(proxy.hasOwnProperty("type")==false){
        console.log(ctx.session.nickname);
        ctx.render('proxy_apply',{nickname:ctx.session.nickname,
            formatDate: function(ds) {
                return dateFormat(new Date(ds), 'yyyy-MM-dd')
            }})}
    if(proxy.hasOwnProperty("type")==true){
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
        ctx.render('proxy_center',data)}
});

//跳转到我的会员
router.get("/returnVip",async(ctx)=>{
   let month =await mongodb.find("cards");
    let vipType =0;
    let vip =await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    if(vip.hasOwnProperty("senior_valid_time")){
        if(new Date(vip.senior_valid_time).getTime()> Date.now()){vipType =2}
    }
    ctx.render("my_leaguer",{cards:month,vipType})
});
//购买我的会员
router.post("/buyVip1",async(ctx)=>{
    console.log(ctx.request.body.allMoney);
    console.log(ctx.request.body._id);
    console.log(typeof ctx.request.body.allMoney)
    var paydata1= {
        appid: config.wx.appid,
        mch_id: config.wx.mch_id,
        nonce_str: Math.random().toString(36).substr(2),
        body: '采购',
        out_trade_no: Math.random().toString(36).substr(2),
        total_fee: Number(ctx.request.body.allMoney)*100,
        spbill_create_ip:'192.168.1.1',
        notify_url: config.wx.server+'/followorder/person/payCallBack',
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
        total_fee: Number(ctx.request.body.allMoney)*100,
        spbill_create_ip:'192.168.1.1',
        notify_url: config.wx.server+'/followorder/person/payCallBack',
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
    //存入内存
    store.buy[paydata1.nonce_str] ={vip:ctx.request.body._id,allMoney:ctx.request.body.allMoney,openid:ctx.session.openid};
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
    console.log(sign1)
    return sign1
};
//支付回调
router.post("/payCallBack",async(ctx)=>{
    console.log("store:",store);
    console.log(ctx.request.body);
    var res="" ;
    ctx.body = "success";
    //parseString(ctx.request.body, function (err, result) {
    //    console.log("请求了几次");
    //    res = JSON.stringify(result);
    //    res = JSON.parse(res);
    //    ctx.body = ("success")
    //});
    var openid = store.buy[res.xml.nonce_str.toString()].openid;
    //增加时间
    let time = await mongodb.findOne("wxusers",{openid:openid});
    console.log("addtime:" ,store.buy[res.xml.nonce_str.toString()].vip);
    let viptime = await mongodb.findOne("cards",{_id:store.buy[res.xml.nonce_str.toString()].vip});
   // await mongodb.updateOne("cards",{_id:store.buy[res.xml.nonce_str.toString()].vip},{$set:{sold_quantity:viptime.sold_quantity+1}})
    var addtime = Number(viptime.time_limit)*1000*60*60*24;
    console.log(addtime);

    if(viptime.type==0){
        if(Boolean(time.hasOwnProperty("valid_time"))==false){
            time.valid_time =new Date()
        }
        if(new Date(time.valid_time).getTime()<new Date()){
            time.valid_time =new Date()
        }
    await mongodb.updateOne("wxusers",{openid:openid},{$set:{valid_time:new Date((time.valid_time).getTime()+addtime)}});}
    if(viptime.type==1){
        if(Boolean(time.hasOwnProperty("senior_valid_time"))==false){
            time.senior_valid_time =new Date()
        }
        if(new Date(time.senior_valid_time).getTime()<new Date()){
            time.senior_valid_time =new Date()
        }
        await mongodb.updateOne("wxusers",{openid:openid},{$set:{senior_valid_time:new Date((time.senior_valid_time).getTime()+addtime)}});}
    let user =await mongodb.findOne("wxusers",{openid:openid},{projection:{_id:0,nickname:1,name:1,phone:1,openid:1}});
    let card =await mongodb.findOne("cards",{_id:store.buy[res.xml.nonce_str.toString()].vip},{projection:{name:1,price:1}});
    card.quantity =1;
    await mongodb.insertOne("orders",{money:Number(store.buy[res.xml.nonce_str.toString()].allMoney),
        create_time:new Date(),
        type:0,
        user:user,
        cards:[card]
    })
});
//跳转到策略
router.get("/returnStrategy",async(ctx)=>{
    let nameNumber = await mongodb.find("accounts",{status:1});
    var list=[];
    var pics=[];
    for (var n =0;n<nameNumber.length;n++) {
        let pic = await mongodb.find("lcgs", {nameNum: nameNumber[n].nameNum},{projection:{nameNum:1,date:1,balance:1},limit:(30)});
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
        var weekTime = yxtime / 1000 / 60 / 60 / 24 / 7;
        //运行天
        var dayTime = yxtime / 1000 / 60 / 60 / 24;
        //策略综合能力
        var abilities = parseInt(profit / dayTime);
        var aveTimes = parseInt(aveTime / number / 1000 / 60 / 60);
        //订阅人数
        var dypeople = await mongodb.count("subscriptions", {openid: ctx.session.openid});
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
        var stddev =0;
        var sharpe=0;
        var arr = [];
        if(equity.length!=0){
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
        var list1 ={abilities,sharpe,point,weekTime,aveTimes,dypeople};
        list.push(list1);
        pics.push(pic)
    }
    ctx.render("strategy_list",{list:list,pics:pics})
});





















//本地存数据
router.post("/storeMesg",async(ctx)=>{
    console.log(ctx.request.body)
    console.log(ctx.request.body.allMoney)
    store.buy[ctx.session.openid] ={vip:ctx.request.body._id,allMoney:ctx.request.body.allMoney};
    ctx.body=({code:1})
})

//tiaozhuang到支付页面
router.get("/returnPay",async(ctx)=>{
    //存入内存
  //  store.buy[ctx.session.openid] ={vip:ctx.query._id,allMoney:ctx.query.allMoney};
    console.log('进行静默授权……');
    console.log('进行静默授权……',ctx.query);
    console.log('进行静默授权……',store.buy[ctx.session.openid]);
    // let adress=await wxtool.getCodeNew(ctx.query.allMesg)
    ctx.session.redirect_url=ctx.query.redirect_url;
    ctx.session.allMoney = ctx.query.allMoney;
    ctx.session._id =ctx.query._id;
    ctx.session.type =ctx.query.type;
    let url = wxServer + `/connect/oauth2/authorize?appid=${config.wx.appid}&redirect_uri=${config.wx.server}/followorder/person/finishBase&response_type=code&scope=snsapi_base#wechat_redirect`;
    ctx.redirect(url);
});


router.get("/finishBase",async(ctx)=>{
   console.log('微信授权成功：', ctx.query);
    let a = await wxtool.authUserBase(ctx.query.code);
    ctx.session.openid = a;
    console.log(ctx.session);
    ctx.render("pay", {redirect_url:ctx.session.redirect_url,allMoney:ctx.session.allMoney,type:ctx.session.type})
});
//购买我的会员
router.post("/buyVip",async(ctx)=>{
    let callbackUrl = "";
    if(Number(ctx.session.type)==1){
        callbackUrl ='http://riskmonitor.capitalai.cn/followorder/person/payCallBack1'
    }
    if(Number(ctx.session.type)==2){
        callbackUrl ='http://riskmonitor.capitalai.cn/followorder/person/payCallBack1'
    }
    var paydata1= {
        appid: config.wx.appid,
        mch_id: config.wx.mch_id,
        nonce_str: Math.random().toString(36).substr(2),
        body: '采购',
        out_trade_no: Math.random().toString(36).substr(2),
        total_fee: ctx.session.allMoney*100,
        spbill_create_ip:'192.168.1.1',
        notify_url: callbackUrl,
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
        total_fee: ctx.session.allMoney*100,
        spbill_create_ip:'192.168.1.1',
        notify_url:callbackUrl ,
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
    //存入内存
   // store.buy[paydata1.nonce_str] ={vip:ctx.request.body._id,allMoney:ctx.request.body.allMoney,openid:ctx.session.openid};
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
    console.log(sign1)
    return sign1
};
//支付回调
router.post("/payCallBack1",async(ctx)=>{
    let res="";
    parseString(ctx.request.body, function (err, result) {
        console.log("请求了几次");
        res = JSON.stringify(result);
        res = JSON.parse(res);
        ctx.body = ("success")
    });

});
   // var openid = store.buy[res.xml.nonce_str.toString()].openid;

router.get("/peopleCallback",async(ctx)=>{
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log(ctx.session);
    console.log(store.buy[ctx.session.openid]);
    let openid =ctx.session.openid;
    if(ctx.query.type=="1"){

        console.log("ctx.query.type:",ctx.query.type);
    //增加时间
    let time = await mongodb.findOne("wxusers",{openid:openid});
    console.log("addtime:" ,store.buy[ctx.session.openid].vip);
    let viptime = await mongodb.findOne("cards",{_id:store.buy[ctx.session.openid].vip});
    // await mongodb.updateOne("cards",{_id:store.buy[res.xml.nonce_str.toString()].vip},{$set:{sold_quantity:viptime.sold_quantity+1}})
    var addtime = Number(viptime.time_limit)*1000*60*60*24;
    console.log(addtime);

    if(viptime.type==0){
        if(Boolean(time.hasOwnProperty("valid_time"))==false){
            time.valid_time =new Date()
        }
        if(new Date(time.valid_time).getTime()<new Date()){
            time.valid_time =new Date()
        }
        await mongodb.updateOne("wxusers",{openid:openid},{$set:{valid_time:new Date((time.valid_time).getTime()+addtime)}});}
    if(viptime.type==1){
        if(Boolean(time.hasOwnProperty("senior_valid_time"))==false){
            time.senior_valid_time =new Date()
        }
        if(new Date(time.senior_valid_time).getTime()<new Date()){
            time.senior_valid_time =new Date()
        }
        await mongodb.updateOne("wxusers",{openid:openid},{$set:{senior_valid_time:new Date((time.senior_valid_time).getTime()+addtime)}});}
    let user =await mongodb.findOne("wxusers",{openid:openid},{projection:{_id:0,nickname:1,name:1,phone:1,openid:1}});
    let card =await mongodb.findOne("cards",{_id:store.buy[ctx.session.openid].vip},{projection:{name:1,price:1,type:1}});
    card.quantity =1;
    await mongodb.insertOne("orders",{money:Number(store.buy[ctx.session.openid].allMoney),
        create_time:new Date(),
        type:0,
        user:user,
        cards:[card]
    });
    ctx.redirect("/followorder/proxy/returnPerson")}
    else{
        console.log("ctx.query.type2:",ctx.query.type);
         openid = ctx.session.openid;
        let user =await mongodb.findOne("wxusers",{openid:openid},{projection:{_id:0,nickname:1,name:1,phone:1,openid:1}});
        var cardss =store.buy[ctx.session.openid].vip;
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~:",cardss)
        await mongodb.insertOne("orders",{
            create_time:new Date(),
            cards:cardss,
            money:store.buy[ctx.session.openid].allMoney,
            type:1,
            user:user
        });
        for(var u= 0;u<cardss.length;u++){
            let olds = await mongodb.findOne("cards",{_id:cardss[u]._id});
            console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~:",olds)
            await mongodb.updateOne("cards",{_id:cardss[u]._id},{$set:{sold_quantity:olds.sold_quantity+cardss[u].quantity}});}
        let oldss = await mongodb.findOne("wxusers",{openid:openid});
        if(oldss.hasOwnProperty("cards")==false){
            console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~:",cardss)
            await mongodb.updateOne("wxusers",{openid:openid},{$set:{cards:cardss}})
        }
        else{  for(var x= 0;x<cardss.length;x++){
            let old = await mongodb.findOne("wxusers",{openid:openid,"cards._id":cardss[x]._id},{projection:{"cards.$.quantity":1}});
            console.log("oldoldoldold:",old);
            if(old!=null){
                await mongodb.updateOne("wxusers",{openid:openid,"cards._id":cardss[x]._id},{$set:{"cards.$.quantity":Number(old.cards[0].quantity)+Number(cardss[x].quantity)}})
            }
            else {
                await mongodb.updateOne("wxusers", {
                    openid: openid
                }, {$push: {cards: cardss[x]}})
            } }}
        ctx.redirect("/followorder/proxy/returnCenter")
    }
});
//股票列表
router.get("/stock_list",async(ctx)=>{
  /*  console.log(store.stock)
    let mesg = await mongodb.find("gube",{});
    for(var i =0;i<mesg.length;i++){
        mesg[i].name = store.stock[mesg[i]._id]
    }
    console.log(mesg);
    let follow = await mongodb.find("follow_stock",{openid:ctx.session.openid},{projection:{_id:0,follow_stock:1}});
    console.log(follow);
    for(var a = 0;a<follow.length;a++){
        mesg =mesg.filter(item =>
            item._id !== follow[a].follow_stock._id
        )
    }*/

    ctx.render('stock_recommend'
        /*,{
        data: mesg,follow:follow,type:type,
        right: function(res) {
            var max = Math.abs(res[0]);
            for(var i=1;i<res.length;i++){
                if(max<Math.abs(res[i]))max=Math.abs(res[i]);
            }
            return max;
        }
    }*/);
});
function calcRecomm(d) {
    // var q = Math.abs(d[0]);
    var q = d[0];
    d.forEach(function(currD) {
        // currD = Math.abs(currD);
        var currData = Math.abs(currD);
        if(currData > Math.abs(q)) {
            q = currD;
        }
    });
    return q;
}
//股票列表
router.get("/my_stock_list",async(ctx)=>{
    let mesg = await mongodb.find("gube",{});
    for(var i =0;i<mesg.length;i++){
        mesg[i].name = store.stock[mesg[i]._id];
        mesg[i].max = calcRecomm(mesg[i].res)
    }
    let follow = await mongodb.find("follow_stock",{openid:ctx.session.openid},{projection:{_id:0,follow_stock:1}});
    for(var a = 0;a<follow.length;a++){
        mesg =mesg.filter(item =>
            item._id !== follow[a].follow_stock._id
        );
    }
    mesg=mesg.sort(function(a,b){
        return b.max - a.max;
    });
    ctx.body=({data:mesg})
});
//我关注的
router.get("/my_follow_stock",async(ctx)=>{
   // let mesg = await mongodb.find("gube",{});
    let follow = await mongodb.find("follow_stock",{openid:ctx.session.openid},{projection:{_id:0,follow_stock:1}});
/*    for(var a = 0;a<follow.length;a++){
        mesg =mesg.filter(item =>
            item._id !== follow[a].follow_stock._id
        )
    }*/
    ctx.body=({data:follow})
});
//关注股票
router.post("/follow_stock",async(ctx)=>{
    console.log(ctx.request.body);
    await mongodb.insertOne("follow_stock",{openid:ctx.session.openid,follow_stock:ctx.request.body.follow_stock});
    ctx.body=({code:1})
});
//搜索股票
router.post("/find_stock_list",async(ctx)=>{
    console.log(typeof ctx.request.body._id);
    let findMesg = await mongodb.findOne("gube",{_id:ctx.request.body._id});
    if(findMesg ==null){
        console.log("走着");
        ctx.body=({code:-1});
    return;}
    console.log(findMesg);
    let findFollow = await mongodb.findOne("follow_stock",{openid:ctx.session.openid,"follow_stock._id":ctx.request.body._id});
    console.log(findFollow);
    if(findFollow ==null){ findMesg.type = 1}
    else{findMesg.type =0}
    findMesg.name  = store.stock[findMesg._id];
    console.log(findMesg);
    ctx.body=({code:1,findMesg:findMesg
    });
});
router.get("/buquanid",async(ctx)=>{
   let people=await mongodb.find("wxusers",{});
    for(var i=0;i<people.length;i++){
        if(people[i].hasOwnProperty("people_id")==false){
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
            await mongodb.updateOne("wxusers",{openid:people[i].openid},{$set:{people_id:fina}});
        }
    }
    ctx.body=({code:1})
});
module.exports = router;