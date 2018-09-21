/**
 * Created by Administrator on 2018/5/31.
 */
const router = new require('koa-router')();
const mongodb = require('../dbs/mongodb');
var ObjectID = require("mongodb").ObjectID;
const fs= require("fs")
const store = require('../dbs/store');
//生成策略
router.get("/buyVip",async(ctx)=>{
    let mesg = await mongodb.find("norms",{},{projection:{_id:0,type:1}});
    let allArr =[];
    for(var i=0;i<mesg.length;i++){
        var flag = true;
        for(var j=0;j<allArr.length+1;j++){
            if(mesg[i].id == allArr[j].id){
                flag = false;
            }
        }
        if(flag){
            allArr.push(mesg[i]);
        }
    }
    ctx.body =(allArr)
});

//产品选择
router.get("/chooseProduct",async(ctx)=>{
   let product = await mongodb.find("product");
    let user = await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    if(user.hasOwnProperty("senior_strategy_mesg")){
        ctx.render("senior_strategy_info",user.senior_strategy_mesg)
    }
    else if(user.hasOwnProperty("senior_strategy")){ctx.render("strategy_loading")}
    else{
    ctx.render("choose_product",{product:product})}
});
//跳转测量指标页面
router.get("/return_measuring_products",async(ctx)=>{
    let mesg = await mongodb.find("norms",{},{projection:{_id:0,type:1}});
    console.log("mesg:",mesg);
    let allArr =[];
    for(var i=0;i<mesg.length;i++){
        var flag = true;
        for(var j=0;j<allArr.length;j++){
            if(mesg[i].type == allArr[j].type){
                flag = false;
            }
        }
        if(flag){
            allArr.push(mesg[i]);
        }
        console.log("allArr:",allArr)
    }
    console.log("allArr:",allArr);
   ctx.render("measuring_products",{mesg:allArr})
});
//跳转到指标列表
router.get("/return_technical_indicators",async(ctx)=>{
    let mesg = await mongodb.find("norms",{type:ctx.query.type},{projection:{name:1}});
    ctx.render("technical_indicators",{mesg:mesg})
});
//跳转到指标详情
router.get("/return_target_details",async(ctx)=>{
    console.log(ctx.query._id);
    console.log(typeof ctx.query._id);
    let mesg =await mongodb.findOne("norms",{_id:ObjectID(ctx.query._id)});
    console.log(mesg);
   ctx.render("target_details",{data: [mesg],
       right: function(pars) {
           let d = {};
           let rightData = [], lines = [];
           for(let key in pars) {
               if(pars[key] === true) {

                   rightData.push(key);
               } else {
                   lines.push({
                       key: key,
                       value: pars[key]
                   });
               }
           }
           d.rightData = rightData.join(',');
           d.lines = lines;
           return d;
       }})
});
//查询指标详情
router.get("/find_target_details",async(ctx)=>{
    let mesg =await mongodb.findOne("norms",{_id:ObjectID(ctx.query._id)});
    ctx.body=({mesg:mesg})
});
/*//选择完成一个跳转到测量指标页面
router.post("/return_finish_products",async(ctx)=>{
    console.log(ctx.request.body);
    ctx.render("measuring_products",ctx.request.body.messages)
});*/
//跳转到完成页面
router.get("/return_choose_finish",async(ctx)=>{
    ctx.render("choose_finish")
});
//跳转到策略生成
router.post("/return_strategy_loading",async(ctx)=>{
   console.log(ctx.request.body.message);
    await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$set:{senior_strategy:JSON.parse(ctx.request.body.message)}});
   //是否有已经生成好的数据
    let old= await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    if(old.hasOwnProperty("senior_strategy_mesg")){
        await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$unset:{senior_strategy_mesg:""}});
    }
    ctx.body=({code:1})
});
//跳转到页面
router.get("/return_loading",async(ctx)=>{
    ctx.render("strategy_loading")
});
//取消训练
router.get("/cancel_training",async(ctx)=>{
    await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$unset:{senior_strategy:""}});
    let product = await mongodb.find("product");
    ctx.render("choose_product",{product:product})
});
//修改策略
router.get("/change_training",async(ctx)=>{
    //原有的参数
   let old= await mongodb.findOne("wxusers",{openid:ctx.session.openid});
    let strategy = old.senior_strategy;
    let product = await mongodb.find("product");
    ctx.render("choose_product",{product:product,strategy:strategy})
});
//接收生成的策略信息
router.post("/received_training",async(ctx)=>{
    console.log("req:",ctx.request.body);
   await mongodb.updateOne("wxusers",{openid:ctx.request.body.openid},{$set:{senior_strategy_mesg:JSON.parse(ctx.request.body.senior_strategy_mesg)}});
    ctx.body=({code:1})
});
//所有配置
router.get("/received_config",async(ctx)=>{
   let allConfig= await mongodb.find("wxusers",{},{projection:{openid:1,senior_strategy:1,senior_strategy_mesg:1}});
    ctx.body=(allConfig)
});
function strToJson(str){
    var json = (new Function("return " + str))();
    return json;
}
//设置自定义推送时间
router.post("/set_time",async(ctx)=>{
    console.log("req:",ctx.request.body.send_time);
    await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$push:{send_time:ctx.request.body.send_time}});
    ctx.body=({code:1})
});
//查询
router.get("/find_time",async(ctx)=>{
   let time = await mongodb.findOne("wxusers",{openid:ctx.session.openid},{projection:{send_time:1,alltime_type:1}});
    console.log(time);
    ctx.body=(time)
});
//修改开关状态
router.post("/change_timetype",async(ctx)=>{
    console.log(ctx.request.body.number,ctx.request.body.type);
    var number =ctx.request.body.number;
    let setParam = {};
    if(number ==-1){
        setParam.alltime_type =  Number(ctx.request.body.type)
    }
    else{
    let key = 'send_time.' + number + '.type';
    if(number ==-1){}
    setParam[key] = Number(ctx.request.body.type);}
    await mongodb.updateOne("wxusers",{openid:ctx.session.openid},{$set:setParam});
    ctx.body=({code:1})
});
module.exports = router;