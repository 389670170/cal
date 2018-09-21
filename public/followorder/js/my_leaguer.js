/**
 * Created by haoran.shu on 2018/5/7 19:53.
 */
for(var i= 0; i< $('.card-item input').length;i++){
    if($('.card-item input')[i].checked){
        $($('.card-item input')[i]).css({opacity:1})
    }
}
$('.card-item input').on('change',function () {
    $('.card-item input').css({opacity:.2})
    $(this).css({opacity:1})
})

var $amountTxt = document.getElementById('amount-txt');
var $radios = document.getElementsByName('vip');
var id = $radios[0].value, allMoney = $amountTxt.textContent;
for (var i = 0, len = $radios.length; i < len; i++) {
  $radios[i].addEventListener('change', function () {
    document.getElementById('submit-btn').setAttribute('class','btn btn-normal');
    document.getElementById('submit-btn').removeAttribute('disabled')
    id = this.value;
    allMoney = this.getAttribute('data-money');
    $amountTxt.textContent = allMoney;
  });
}


var $submitBtn = document.getElementById('submit-btn');
$submitBtn.addEventListener('click', function(e) {
    $.post("/followorder/person/storeMesg",{_id:id,allMoney:allMoney},function (res) {
      var redirect_url = location.protocol + '//' + location.host + '/followorder/person/peopleCallback';
      location.href = "https://followorder.capitalai.cn/followorder/person/returnPay?_id="+id+"&allMoney="+allMoney+"&type=1"+"&redirect_url="+ redirect_url;
    })
});


