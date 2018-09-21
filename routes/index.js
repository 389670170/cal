/**
 * Created by haoran.shu on 2017/12/15.
 */
const router = new require('koa-router')();
const dateFormat = require('../utils/dateformat');
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const store = require('../dbs/store');
const mongodb = require('../dbs/mongodb');
const wxtool = require('../utils/wxtool');
const ObjectId = require('mongodb').ObjectID;
const fs= require("fs")

const wxconfig = require('../config');

fs.readFile('./utils/name.txt','utf-8',function(err,data){
  if(err){
    console.log(err);
  }
  else{
    let s = {};
    let a = data.split('\n')   ;
    a.forEach((i) => {        let is = i.split(',');  s[is[0]] = is[1]            });
    store.stock=s;
  }});

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});
server.on('message', async(msg, rinfo) => {
  console.log("推送");
 //msg = "GOLD_1M,0,0,1,0,1306.24";

  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  var time =new Date();
  var msg1 = msg.toString();
  var gotted = msg1.split(",");
  var symbol = gotted[0].split("_");
   var key = gotted[0];
  var direction="";
  if(gotted[1]!=0||gotted[2]!=0||gotted[3]!=0||gotted[4]!=0){
    if(gotted[1]==1){direction="openbuy"}
   else if(gotted[2]==1){direction="opensell"}
   else if(gotted[3]==1){direction="closebuy"}
   else if(gotted[4]==1){direction="closesell"}
      console.log("direction1:",direction);
    if(store.insert.hasOwnProperty(key)){
      if(store.insert[key][0]== gotted[1]&&store.insert[key][1]==gotted[2]&&store.insert[key][2]== gotted[3]&&store.insert[key][3]== gotted[4]){
       /* console.log(store.insert[key][0],"+",gotted[1])
        console.log(store.insert[key][1],"+",gotted[2])
        console.log(store.insert[key][2],"+",gotted[3])
        console.log(store.insert[key][3],"+",gotted[4])*/
        if(new Date(store.insert[key][4]).getTime()+900000>new Date().getTime()){
          console.log(new Date(store.insert[key][4]).getTime()+900000);
          console.log(new Date().getTime());
          return}
          else{
            if(gotted[3]==1||gotted[4]==1){return}
        }

      }
        else{//1000
          if(store.insert[key][0]==1&& gotted[1]==1&&store.insert[key][3]==0){console.log("direction2:",store.insert[key][0],gotted[1],store.insert[key][3]);direction="closesell"}
          if(store.insert[key][0]==1&&  gotted[1]==1&&store.insert[key][3]==1){console.log("direction3:",store.insert[key][0],gotted[1],store.insert[key][3]);direction="openbuy"}
          if(store.insert[key][1]==1&&  gotted[2]==1&&store.insert[key][2]==0){console.log("direction4:",store.insert[key][1],gotted[2],store.insert[key][2]);direction="closebuy"}
          if(store.insert[key][1]==1&&  gotted[2]==1&&store.insert[key][2]==1){console.log("direction5:",store.insert[key][1],gotted[2],store.insert[key][2]);direction="opensell"}
          if(store.insert[key][2]==1&&  gotted[3]==1&&store.insert[key][1]==0){console.log("direction6:",store.insert[key][2],gotted[3],store.insert[key][1]);direction="opensell"}
          if(store.insert[key][2]==1&&  gotted[3]==1&&store.insert[key][1]==1){console.log("direction7:",store.insert[key][2],gotted[3],store.insert[key][1]);direction="closebuy"}
          if(store.insert[key][3]==1&&  gotted[4]==1&&store.insert[key][0]==0){console.log("direction8:",store.insert[key][3],gotted[4],store.insert[key][0]);direction="openbuy"}
          if(store.insert[key][3]==1&&  gotted[4]==1&&store.insert[key][0]==1){console.log("direction9:",store.insert[key][4],gotted[4],store.insert[key][0]);direction="closesell"}
      }
    }
   /* console.log("插入数据：",store.insert[key]);
    console.log("插入数据：",msg);*/
    await mongodb.insertOne("callList",{name:gotted[0],symbol:key,direction:direction,money:gotted[5],time:new Date()});
    store.insert[key] = [gotted[1],gotted[2],gotted[3],gotted[4],new Date()]
  }
  //推送
  //查询受众
  //如果是高级会员
  let people;
  let peop =[]
  if(gotted[0].length>28){peop =[symbol[1]]}
  else{
let nameNum = await mongodb.findOne("accounts",{name:gotted[0]});
  people=await mongodb.find("subscriptions",{sendNumber:nameNum.nameNum});
  for(var a=0;a<people.length;a++){peop.push(people[a].openid)}}
  if(gotted[1]!=0||gotted[2]!=0||gotted[3]!=0||gotted[4]!=0){
  var type="";
    let color="";
    let color1="";
      console.log("direction:",direction);
  if(direction=="openbuy"){type="进场";color="#f44949"}
 else if(direction=="opensell"){type="进场";color="#f44949"}
 else if(direction=="closebuy"){type="平仓";color="#68b88e"}
 else if(direction=="closesell"){type="平仓";color="#68b88e"}
  var type1="";
  if(direction=="openbuy"){type1="做多";color1="#f48949"}
 else if(direction=="opensell"){type1="做空";color1="#f48949"}
 else if(direction=="closebuy"){type1="平多";color1="#3bd7fe"}
 else if(direction=="closesell"){type1="平空";color1="#3bd7fe"}
    let users="";
  var time1 =dateFormat(new Date(), 'yyyy-MM-dd HH:mm');
   /* if(store.message.hasOwnProperty(key)){
    if(store.message[key][0]== gotted[1]&&store.message[key][1]==gotted[2]&&store.message[key][2]== gotted[3]&&store.message[key][3]== gotted[4]){
if(new Date(store.message[key][4]).getTime()+300000>new Date().getTime()){
  return}
    }}*/
      var nowDate=new Date();
      var nowHour =nowDate.getHours();
      var nowMinute = nowDate.getMinutes();
      var nowtime = {hour:nowHour,minute:nowMinute};
      console.log(peop.length);
    for(var d=0;d<peop.length;d++){
        var tell=[];
        console.log("用户：",peop[d],"+dddd+",d);
      let vip1 = await mongodb.findOne("wxusers",{openid:peop[d]});
        if(vip1.hasOwnProperty("alltime_type")){
            console.log("有alltime_type");
            if(vip1.alltime_type ==0){
                if(vip1.hasOwnProperty("send_time")==true){
                    console.log("有send_time");
                for(var p=0;p<vip1.send_time.length;p++){
                    if(vip1.send_time[p].type==1){
                        var startresult = endAfterStart(vip1.send_time[p].start,nowtime);
                        console.log(startresult);
                        var endresult =endAfterStart(nowtime,vip1.send_time[p].end);
                        console.log(endresult);
                        if(startresult==false||endresult==false){tell[p]=0}
                        else{tell[p]=1}
                        console.log(tell);
                    }
                }
                    console.log("tell是?_?：",tell);
                    console.log("tell是?_?：",tell.indexOf(1));
               if( tell.indexOf(1)==-1){
                   console.log("走这没有");
                   continue}
            }
                else{continue}
            }
        }
        function endAfterStart(start, end) {
            if(end.hour < start.hour) {
                return false;
            } else if(end.hour === start.hour) {
                return end.minute > start.minute;
            } else {
                return true;
            }
        }
     /* console.log("vip1:",vip1)
      console.log("vip1:",peop)
      console.log("vip1:",peop[d])*/
        if(vip1.hasOwnProperty("valid_time")&&vip1.hasOwnProperty("senior_valid_time")){
          if(new Date(vip1.valid_time).getTime()< Date.now()&&new Date(vip1.senior_valid_time).getTime()< Date.now()){users =""}
        else {
          users = peop[d];
          store.message[key] = [gotted[1],gotted[2],gotted[3],gotted[4],new Date()]
        }
      }
        else if(vip1.hasOwnProperty("valid_time")){if(new Date(vip1.valid_time).getTime()< Date.now()){users=0}else{users = peop[d];
          store.message[key] = [gotted[1],gotted[2],gotted[3],gotted[4],new Date()]}}
        else if(vip1.hasOwnProperty("senior_valid_time")){if(new Date(vip1.senior_valid_time).getTime()< Date.now()){users=0}else{users = peop[d];
          store.message[key] = [gotted[1],gotted[2],gotted[3],gotted[4],new Date()]}}
        else{users=""}
     let nickname = await mongodb.findOne("accounts",{name:gotted[0]});
      console.log("nickname:",nickname.nickname);
  var mesg= {
    "touser": users,
    //线上
    "template_id": wxconfig.wx.template_id,
    //测试
    //"template_id": "4M5k2wb1-dUizf8jJXCkxD9o8n2LCYEqa2q2kqB-iGk",
    "data": {
      "first": {
        "value": "尊敬的会员，您的本次交易信息如下：",
        "color": "#173177"
      },
      "keyword1": {
        "value": symbol[0],
        "color": "#173177"
      },
      "keyword2": {
        "value":type,
        "color":color
      },
      "keyword3": {
        "value":gotted[5],
        "color":"#173177"
      },
      "keyword4": {
        "value":type1,
        "color":color1
      },
      "keyword5": {
        "value":time1,
        "color":"#173177"
      },
      "remark":{
        "value":nickname.nickname,
        "color":"#173177"
      }
    }
  };
      //console.log('接收到推送消息：' + JSON.stringify(mesg));
/*console.log(wxconfig.wx);


       let b  = await wxtool.send(JSON.stringify(body1));*/
      //var mesg={
      //  "touser":users,
      //  "msgtype":"text",
      //  "text":{
      //    "content":"尊敬的会员，您的本次交易信息如下：\n"+"交易品种："+symbol[0]+"\n"+"交易方向："+type+type1+"\n"+"交易时间："+time1+"\n"+"来自于："+nickname.nickname
      //  }
      //};
      let b  = await wxtool.send(JSON.stringify(mesg));
      //let b  = await wxtool.sendC(JSON.stringify(mesg));
 }}
//  store.single[gotted[0]] =[gotted[1],gotted[2],gotted[3],gotted[4],time]
 // console.log(store)
});
server.on('listening', () => {
  var address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});
//测试
//server.bind(41234);
//线上
server.bind(wxconfig.wx.bind);

router.get('/index', async (ctx) => {
  ctx.body = 'router -- Hello World!!!';
});


router.get('/tpl', async (ctx) => {

  let data = [{  "_id" : "601888",  "res" : [-2, -1, 0, 0, 0],name:"万科"},{  "_id" : "601888",  "res" : [-2, -3, 0, 0, 0],name:"万科"},{  "_id" : "601888",  "res" : [0, -1, 0, 0, 0],name:"万科"},{  "_id" : "601888",  "res" : [-2, -1, 0, -5, 0],name:"万科"},{  "_id" : "601888",  "res" : [-2, -1, -4, 0, 0],name:"万科"}];
  let follow=[]
  ctx.render('stock_recommend',{
    data: data,
      right: function(res) {
          var max = Math.abs(res[0]);
          for(var i=1;i<res.length;i++){
              if(max<Math.abs(res[i]))max=Math.abs(res[i]);
          }
          return max;
      }
  });
   // ctx.render('target_details',{"render":1,  "_id" : ObjectId("5b14e112c11ee50c5c5aae1e"),  "name" : "鳄鱼线 Alligator",  "norm" : [[{        "key" : "squatCycle",        "name" : "下颚周期",        "value" : 13      }, {        "key" : "panning",        "name" : "平移",        "value" : 8      }], [{        "key" : "toothCycle",        "name" : "牙齿周期",        "value" : "8"      }, {        "key" : "panning",        "name" : "平移",        "value" : 5      }], [{        "key" : "mouthCycle",        "name" : "嘴唇周期",        "value" : 0      }, {        "key" : "panning",        "name" : "平移",        "value" : 3      }], [{        "key" : "manner",        "name" : "方式",        "value" : "smoothed"      }, {        "key" : "apply",        "name" : "应用于",        "value" : "Median Price(HL/2)"      }]],  "type" : 2});
});

module.exports = router;
