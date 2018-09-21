/**
 * Created by haoran.shu on 2018/5/3 17:40.
 */

// 会员卡单价
var pers = {};

var $cardPrice = document.getElementsByClassName('card-price');
// 获取单价
for(var i = 0, len = $cardPrice.length; i < len; i++) {
    var $cpi = $cardPrice[i];
    pers[$cpi.id] = Number($cpi.textContent);
}

// 订单数量编辑框
var $countInput = document.getElementsByClassName('count-input'),
    cardsLen = $countInput.length;

// 计算总价
function calcAllPrice() {
    var sum = 0;
    for(var i = 0; i < cardsLen; i++) {
        var $i = $countInput[i];
        sum += (Number($i.value) * pers[$i.id + 'Per']);
    }
    return sum.toFixed(2);
}

// +, - 点击事件
$('.oper-btn').on('click', (function() {
    var ots = $(this).attr('data-operate').split('-');
    var $i = $('#' + ots[0]);
    if(ots[1] === '1') { // +
        $i.val(Number($i.val()) + 1)
        $($i).css({color:'#e3b157'})
    } else { // -
        var _iv = Number($i.val());
        if($i.val() > 0){
            var cc = --_iv;
            if(cc === 0){
                $i.val(cc)
                $($i).css({color:'black'})
            }else {
                $i.val(cc)
            }
        }else {
            $i.val(0)
            $($i).css({color:'black'})
        }
    }
    // 更新总价
    $('#all-price').text(calcAllPrice());
}));

// 输入框失去焦点事件
$('.count-input').on('blur', function() {
    var v = Number(this.value);
    var _this =this;
    if(v <= 0) {
        this.value = 0; // 重置为0
        _this.style.color = 'black'
    }else{
        _this.style.color = '#e3b157'
    }
  // 更新总价
  $('#all-price').text(calcAllPrice());
});
// 立即支付
$('.pay-btn').on('click', function(e) {
    var sum = 0, cards = [];
    for(var i = 0; i < cardsLen; i++) {
        var $i = $countInput[i], quantity = Number($i.value);
        sum += (quantity * pers[$i.id + 'Per']); // 总价格
        if(quantity > 0) {
            cards.push({
                _id: $i.getAttribute('data-id'),
                name: $i.getAttribute('data-name'),
                price: pers[$i.id + 'Per'],
                quantity: quantity,
				type: 0
            });
        }
    }
    if(sum < smallMoney) {
        alert('最低采购金额为：' + smallMoney);
    } else {
        har.ajax({
            url: '/followorder/person/storeMesg',
            method: 'post',
            contentType: 'application/json;charset=utf-8',
            data: JSON.stringify({
              _id: cards,
              allMoney: sum
            }),
            dataType: 'json',
            success: function(res) {
                var redirect_url = location.protocol + '//' + location.host + '/followorder/person/peopleCallback';
                location.href = "https://followorder.capitalai.cn/followorder/person/returnPay?_id="+cards+"&allMoney="+sum+"&type=2"+"&redirect_url="+ redirect_url;
            }
        });
    }

});