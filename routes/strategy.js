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
const s=require("../utils/s");

router.get("/test",async(ctx)=>{
    let nameNumber = await mongodb.find("accounts",{status:1});
    let subscribed = await mongodb.find("subscriptions",{openid:ctx.session.openid},{projection:{sendNumber:1}});
    var list=[];
    var pics=[]
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
        var arr = [];
        var stddev =0;
        var sharpe=0;
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
    ctx.body=({list:list,pics:pics,subscribed:subscribed})
});
//订阅
router.get("/subscription",async(ctx)=>{
    console.log(ctx.session.openid);
    console.log(ctx.query.sendNumber);
    console.log(Number(ctx.query.sendNumber));
    let aa=await mongodb.findOne("subscriptions",{openid:ctx.session.openid,sendNumber:Number(ctx.query.sendNumber)});
    console.log("aa:",aa);
    if(aa==null&&ctx.session.openid){
        let strategyName = await mongodb.findOne("accounts",{nameNum:Number(ctx.query.sendNumber)});
   await mongodb.insertOne("subscriptions",{openid:ctx.session.openid,name:strategyName.name,sendNumber:Number(ctx.query.sendNumber),validity:new Date()});}
    let subscribed = await mongodb.find("subscriptions",{openid:ctx.session.openid},{projection:{sendNumber:1}});
    var list = [];
    var pics = [];
    for(var p = 0;p<subscribed.length;p++) {
        let nameNumber = await mongodb.findOne("accounts", {nameNum:subscribed[p].sendNumber,status:1});

            var name = nameNumber.nickname;
            var nameNum = nameNumber.nameNum;
            let pic = await mongodb.find("lcgs", {nameNum: nameNumber.nameNum}, {
                projection: {date: 1, balance: 1},
                limit: (30)
            });
            let ability = await mongodb.find("histories", {nameNum: nameNumber.nameNum});
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
            var dypeople = await mongodb.count("subscriptions", {sendNumber: nameNumber.nameNum});
            //近一周盈亏点数
            var point = 0;
            let hsy = await mongodb.find('histories', {
                nameNum: nameNumber.nameNum, ctm_start: {"$gte": new Date(Date.now() - 7 * 86400000)}
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
            let account = await mongodb.find("accounts", {nameNum: nameNumber.nameNum,status:1}, {})
            var grow = profit / (account[0].balance - profit);
            let equity = await mongodb.find("lcgs", {nameNum: nameNumber.nameNum});
            var arr = [];
        var stddev =0;
        var sharpe=0;
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
            var list1 = {name, nameNum, abilities, sharpe, point, weekTime, aveTimes, dypeople};
            list.push(list1);
            pics.push(pic)
        }
    ctx.body=({code:1
        /*,list:list,pics:pics,subscribed:subscribed,type:1*/
    });
  /*  ctx.render("strategy_list",{list:list,pics:pics,subscribed:subscribed,type:1,
        parseInt:function(point){
        console.log("point:",point);
        return parseInt(point)
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
        },isSubscribed: function(nameNum) {
            return false;
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
        },name: function(name) {
        let length = name.length;
        if(length  > 9) {
            return name.substring(0, 5) + '...' + name.substring(length - 4)
        }
        return name;
    }});*/
});

router.get("/cancel",async(ctx)=>{
    console.log(ctx.query.sendNumber);
    await mongodb.deleteOne("subscriptions",{openid:ctx.session.openid,sendNumber:Number(ctx.query.sendNumber)});
    let subscribed = await mongodb.find("subscriptions",{openid:ctx.session.openid},{projection:{sendNumber:1}});
    var list = [];
    var pics = [];
    for(var p = 0;p<subscribed.length;p++) {
        let nameNumber = await mongodb.findOne("accounts", {nameNum:subscribed[p].sendNumber,status:1});

            var name = nameNumber.nickname;
            var nameNum = nameNumber.nameNum;
            let pic = await mongodb.find("lcgs", {nameNum: nameNumber.nameNum}, {
                projection: {date: 1, balance: 1},
                limit: (30)
            });
            let ability = await mongodb.find("histories", {nameNum: nameNumber.nameNum});
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
            var dypeople = await mongodb.count("subscriptions", {sendNumber: nameNumber.nameNum});
            //近一周盈亏点数
            var point = 0;
            let hsy = await mongodb.find('histories', {
                nameNum: nameNumber.nameNum, ctm_start: {"$gte": new Date(Date.now() - 7 * 86400000)}
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
            let account = await mongodb.find("accounts", {nameNum: nameNumber.nameNum,status:1}, {});
            var grow = profit / (account[0].balance - profit);
            let equity = await mongodb.find("lcgs", {nameNum: nameNumber.nameNum});
            var arr = [];
        var stddev =0;
        var sharpe=0;
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
            var list1 = {name, nameNum, abilities, sharpe, point, weekTime, aveTimes, dypeople};
            list.push(list1);
            pics.push(pic)
        };

    ctx.render("strategy_list",{list:list,pics:pics,subscribed:subscribed,type:1,
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
        },isSubscribed: function(nameNum) {
            return false;
        },name: function(name) {
        console.log("qqqqqqqqqqqqqqqqqqqqqq:",name)

        return name;
    }, get:function(nameNum, key) {
            return s('n' + nameNum, key);
        },parseInt:function(point){
        console.log("point:",point);
        return parseInt(point)
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
        }});
});
//订阅者
router.get("/subscriber",async(ctx)=>{
    console.log(ctx.query.sendNumber)
    var data = [];
   let subscriber = await mongodb.find("subscriptions",{sendNumber:Number(ctx.query.sendNumber)});
    console.log(subscriber);
    var title1 =await mongodb.findOne("accounts",{nameNum:Number(ctx.query.sendNumber),status:1});
    var title = title1.nickname;
    for (var a = 0;a<subscriber.length;a++){
        var people =await mongodb.findOne("wxusers",{openid:subscriber[a].openid});
        var time = subscriber[a].validity;
        var name =people.nickname;
        var head = people.headimgurl;
        var data1 = {time,name,head};
        data.push(data1);
    }
    console.log(data);
    var vip = 0;
    let vip1 = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    if(vip1.hasOwnProperty("valid_time")&&vip1.hasOwnProperty("senior_valid_time")){
        if(new Date(vip1.valid_time).getTime()< Date.now()&&new Date(vip1.senior_valid_time).getTime()< Date.now()){vip =0}
        else(vip =1)
    }
    else if(vip1.hasOwnProperty("valid_time")){if(new Date(vip1.valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else if(vip1.hasOwnProperty("senior_valid_time")){if(new Date(vip1.senior_valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else{vip=0}
    ctx.render("strategy_subscriber",{data:data,vip:vip,nameNum:ctx.query.sendNumber,title:title,formatDate: function(ds) {
        return dateFormat(new Date(ds), 'yyyy-MM-dd HH:mm')
    }})
});
//订阅
router.get("/returnDy",async(ctx)=>{
    let subscribed = await mongodb.find("subscriptions",{openid:ctx.session.openid},{projection:{sendNumber:1}});
    var list = [];
    var pics = [];
    for(var p = 0;p<subscribed.length;p++) {
        let nameNumber = await mongodb.findOne("accounts", {nameNum:subscribed[p].sendNumber,status:1});
console.log("zzzzzzzzzzzzzzzzzzzzzzzzz:",nameNumber);
        if(nameNumber==null){continue}
        var name = nameNumber.nickname;
        var nameNum = nameNumber.nameNum;
        let pic = await mongodb.find("lcgs", {nameNum: nameNumber.nameNum}, {
            projection: {date: 1, balance: 1},
            limit: (30)
        });
        let ability = await mongodb.find("histories", {nameNum: nameNumber.nameNum});
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
        var dypeople = await mongodb.count("subscriptions", {sendNumber: nameNumber.nameNum});
        //近一周盈亏点数
        var point = 0;
        let hsy = await mongodb.find('histories', {
            nameNum: nameNumber.nameNum, ctm_start: {"$gte": new Date(Date.now() - 7 * 86400000)}
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
        let account = await mongodb.find("accounts", {nameNum: nameNumber.nameNum,status:1}, {})
        var grow = profit / (account[0].balance - profit);
        let equity = await mongodb.find("lcgs", {nameNum: nameNumber.nameNum});
        var arr = [];
        var stddev =0;
        var sharpe=0;
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
        var list1 = {name, nameNum, abilities, sharpe, point, weekTime, aveTimes, dypeople};
        list.push(list1);
        pics.push(pic)
    };
    ctx.render("strategy_list",{list:list,pics:pics,subscribed:subscribed,type:1,
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
        },isSubscribed: function(nameNum) {
            return false;
        },
        get:function(nameNum, key) {
            return s('n' + nameNum, key);
        },name: function(name) {
            return name;
        },parseInt:function(point){
            console.log("point:",point);
            return parseInt(point)
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
        }});
});
//跳转到持仓喊单
router.get("/returnNowOrder",async(ctx)=>{
    //查询是否是会员或者过没过期
    let name= await mongodb.findOne("accounts",{nameNum:Number(ctx.query.nameNum),status:1});
    console.log("name:",name);
    let order = await mongodb.find("callList",{name:name.name,time:{"$gte": new Date(Date.now() -  86400000)}},{sort:{time:-1}});
    var vip = 0;
    let vip1 = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    if(vip1.hasOwnProperty("valid_time")&&vip1.hasOwnProperty("senior_valid_time")){
        if(new Date(vip1.valid_time).getTime()< Date.now()&&new Date(vip1.senior_valid_time).getTime()< Date.now()){vip =0}
        else(vip =1)
    }
    else if(vip1.hasOwnProperty("valid_time")){if(new Date(vip1.valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else if(vip1.hasOwnProperty("senior_valid_time")){if(new Date(vip1.senior_valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else{vip=0}
    ctx.render("strategy_order",{order:order,name:name.nickname,nameNum:ctx.query.nameNum,type:1,vip:vip,
        formatDate: function(ds) {
            var formatStr = dateFormat(new Date(ds), 'yyyy-MM-dd HH:mm:ss');
            formatStr = formatStr.replace(' ', '<br>');
            return formatStr}})
});
//跳转到历史喊单
router.get("/returnHistoryOrder",async(ctx)=>{
   let name =await mongodb.findOne("accounts",{nameNum:Number(ctx.query.nameNum),status:1});
    console.log(name)
    let order = await mongodb.find("callList",{name:name.nickname,time:{"$lte":new Date(Date.now() -  86400000)}},{sort:{time:-1}});
    console.log(order)
    var vip = 0;
    let vip1 = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    if(vip1.hasOwnProperty("valid_time")&&vip1.hasOwnProperty("senior_valid_time")){
        if(new Date(vip1.valid_time).getTime()< Date.now()&&new Date(vip1.senior_valid_time).getTime()< Date.now()){vip =0}
        else(vip =1)
    }
    else if(vip1.hasOwnProperty("valid_time")){if(new Date(vip1.valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else if(vip1.hasOwnProperty("senior_valid_time")){if(new Date(vip1.senior_valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else{vip=0}
    ctx.render("strategy_order",{order:order,name:name.nickname,nameNum:ctx.query.nameNum,type:2,vip:vip,
        formatDate: function(ds) {
        var formatStr = dateFormat(new Date(ds), 'yyyy-MM-dd HH:mm:ss');
        formatStr = formatStr.replace(' ', '<br>');
        return formatStr}})
});

//跳转到策略详情
//净利润因子profitFactor
//收益率grow
//利润profit
//亏损交易loss，比例lossPer
//做空盈利sellProfit,比例 sellProfitPer
//做多盈利buyProfit，比例 buyProfitPer
//平均盈利  averageProfit
//平均损失 averageLoss
//最大盈利点数 best
//最小盈利点数 worst
//平均盈利点数 aveProfitPoint
//平均亏损点数 aveLossPoint
//盈亏点数 point
//平均持仓时间 aveTime
//夏普率 sharpe
router.get("/returnDetail",async(ctx)=>{
    var nameNum = ctx.query.nameNum;
    var grossProfit =0;
    var GrossProfitLoss = 0;
    var loss =0;
    var buyProfit =0;
    var sellProfit =0;
    var profitable = 0;
    var all = [];
    let total = await mongodb.find("histories",{nameNum:Number(ctx.query.nameNum),$or:[{"order_type" : "0"},{"order_type" : "1"}]},{});
    let account = await mongodb.find("accounts",{nameNum:Number(ctx.query.nameNum),status:1},{});
    let profitPoint =0;
    let lossPoint =0;
    var point = 0;
    var allTime=0;
    let pic = await mongodb.find("lcgs", {nameNum: Number(ctx.query.nameNum)},{projection:{date:1,balance:1},limit:(30)});
    for (var i = 0;i<total.length;i++){
        if(total[i].order_type=="0") {all.push((total[i].order_closePrice-total[i].order_openPrice)*10000);point+=(total[i].order_closePrice-total[i].order_openPrice)*10000}
        if(total[i].order_type=="1") {all.push((total[i].order_openPrice-total[i].order_closePrice)*10000);point+=(total[i].order_openPrice-total[i].order_closePrice)*10000}
        if(total[i].order_profit>0){
            grossProfit+=total[i].order_profit;
            profitable+=1;
            if(total[i].order_type=="0"){buyProfit+=1;profitPoint+=(total[i].order_closePrice-total[i].order_openPrice)*10000}
            if(total[i].order_type=="1"){sellProfit+=1;profitPoint+=(total[i].order_openPrice-total[i].order_closePrice)*10000}
        }
        if(total[i].order_profit<0){GrossProfitLoss+=total[i].order_profit;loss= loss+1;
            if(total[i].order_type=="0"){buyProfit+=1;lossPoint+=(total[i].order_closePrice-total[i].order_openPrice)*10000}
            if(total[i].order_type=="1"){sellProfit+=1;lossPoint+=(total[i].order_openPrice-total[i].order_closePrice)*10000}
        }

        var time = (total[i].ctm_end-total[i].ctm_start)/(3600*1000)
        allTime = allTime+time
    }
   var aveProfitPoint =(profitPoint/profitable).toFixed(2);
    var aveLossPoint =(lossPoint/loss).toFixed(2);
    var profit= grossProfit+GrossProfitLoss;
    var grow = profit/(account[0].balance-profit);
    var profitFactor = grossProfit/(-GrossProfitLoss);
    var lossPer = (loss/total.length).toFixed(2);
    var sellProfitPer=(sellProfit/(sellProfit+buyProfit)).toFixed(2);
    var buyProfitPer=(buyProfit/(buyProfit+sellProfit)).toFixed(2);
    var averageProfit = (grossProfit/profitable).toFixed(2);
    var averageLoss= (GrossProfitLoss/loss).toFixed(2);
    var best = Math.max.apply(Math,all);
    var worst = Math.min.apply(Math,all);
    var aveTime =allTime/total.length;
    //夏普率
    let equity = await mongodb.find("lcgs", {nameNum: Number(ctx.query.nameNum)});
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
    var vip = 0;
    let vip1 = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    if(vip1.hasOwnProperty("valid_time")&&vip1.hasOwnProperty("senior_valid_time")){
        if(new Date(vip1.valid_time).getTime()< Date.now()&&new Date(vip1.senior_valid_time).getTime()< Date.now()){vip =0}
        else(vip =1)
    }
    else if(vip1.hasOwnProperty("valid_time")){if(new Date(vip1.valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else if(vip1.hasOwnProperty("senior_valid_time")){if(new Date(vip1.senior_valid_time).getTime()< Date.now()){vip=0}else{vip=1}}
    else{vip=0}
    console.log("sharpe:",grow,"++++",data.length,"++++++",stddev);
    console.log("sharpe:",sharpe);
    //订阅状态
    let dy =await mongodb.findOne("subscriptions",{sendNumber:Number(ctx.query.nameNum),openid:ctx.session.openid});
    console.log("是否订阅",dy);
    let dytype = 0;
    if(dy==null){dytype=0}
    else{dytype=1}
   ctx.render("strategy_info",{dytype:dytype,vip:vip,name:account[0].nickname,nameNum:nameNum,profitFactor:profitFactor,grow:grow,profit:profit,loss:loss,lossPer:lossPer,sellProfit:sellProfit,sellProfitPer:sellProfitPer,buyProfit:buyProfit,buyProfitPer:buyProfitPer,
       averageProfit:Number(averageProfit),averageLoss:Number(averageLoss),best:best,worst:worst,aveProfitPoint:aveProfitPoint,aveLossPoint:aveLossPoint,point:point,aveTime:aveTime,sharpe:sharpe,pics:pic,
       stringify: function(a) {
           return JSON.stringify(a);
       },
        get:function(nameNum, key) {
        return s('n' + nameNum, key);
    }});
});


//添加假数据
router.get("/tj",async(ctx)=>{
    var number=4547;
    for(var a=0;a<30;a++){
        number +=75-(Math.random()*110);
        await mongodb.insertOne("lcgs",{
            "name" : "USDJPY_1M-S",
            "nameNum" : 6025305,
            "date" : new Date(new Date().getTime()-30*24*60*60*1000+a*24*60*60*1000),
            "balance" :number,
            "equity" : number
        })
    }
    var number1=4000;
    for(var b=0;b<30;b++){
        number1 +=85-(Math.random()*120);
        await mongodb.insertOne("lcgs",{
            "name" : "USDJPY_5M",
            "nameNum" : 6025308,
            "date" : new Date(new Date().getTime()-30*24*60*60*1000+b*24*60*60*1000),
            "balance" :number1,
            "equity" : number1
        })
    }
    var number2=3500;
    for(var c=0;c<30;c++){
        number2 +=95-(Math.random()*130);
        await mongodb.insertOne("lcgs",{
            "name" : "USDJPY_1M-N",
            "nameNum" : 6025304,
            "date" : new Date(new Date().getTime()-30*24*60*60*1000+c*24*60*60*1000),
            "balance" :number2,
            "equity" : number2
        })
    }
    var number3=5000;
    for(var d=0;d<120;d++){
        number3 +=65-(Math.random()*100);
        await mongodb.insertOne("lcgs",{
            "name" : "EURUSD_5M",
            "nameNum" : 6025306,
            "date" : new Date(new Date().getTime()-120*24*60*60*1000+d*24*60*60*1000),
            "balance" :number3,
            "equity" : number3
        })
    }
    var number4=5547;
    for(var e=0;e<30;e++){
        number4 +=55-(Math.random()*90);
        await mongodb.insertOne("lcgs",{
            "name" : "GOLD_1M",
            "nameNum" : 6025307,
            "date" : new Date(new Date().getTime()-30*24*60*60*1000+e*24*60*60*1000),
            "balance" :number4,
            "equity" : number4
        })
    }
    ctx.body=({code:1})
});
router.get("/tl",async(ctx)=>{
    var a={
        "touser":"oguXwwy5j8nLPjSbsVGDKbvIut-g",
        "msgtype":"text",
        "text":{
            "content":"尊敬的会员，您的本次交易信息如下：\n"+"交易品种：\n"+"qwer"+""
        }
    };
    let b  = await wxtool.sendC(JSON.stringify(a));
    ctx.body=({code:1})
});
module.exports = router;