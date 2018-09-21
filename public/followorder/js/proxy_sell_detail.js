/**
 * Created by haoran.shu on 2018/5/24 18:22.
 */

// 节点选择
function $(s, t) {
  t = t || 'id';
  switch (t) {
    case 'id':
      return document.getElementById(s);
    case 'c':
      return document.getElementsByClassName(s);
  }
}

function find(p, s) {
  return p.querySelectorAll(s);
}

// 为节点添加事件
function on(e, t, c) {
  if(e instanceof HTMLCollection || e instanceof NodeList) {
    for(var i = 0, l = e.length; i < l; i++) {
      e[i].addEventListener(t, c);
    }
  } else {
    e.addEventListener(t, c);
  }
}

var $dialog = $('dialog', 'c')[0]; // 对话框
var $mig = $('mig'); // 弹出框中, 所有列表项的容器
var $miTyl = $('mi-tpl'); // 更多列表项的模板

// 弹出 更多筛选条件 对话框
on($('more-btn'), 'click', function() {
  $mig.innerHTML = $miTyl.innerHTML;
  // 更多筛选条件对话框中，单选按钮选中事件
  on(find($mig, '.more-radio'), 'change', function() {
    type = this.value;
  });
  $dialog.style.display = 'flex';
});

// 点击对话框的背景区域, 隐藏 对话框
on($dialog, 'click', function() {
  $dialog.style.display = 'none';
});

// 点击对话框内容区域, 不隐藏
on($('dialog-main', 'c')[0], 'click', function(e) {
  e.stopPropagation(); // 阻止事件传播
});

// 点击对话框关闭按钮, 关闭对话框
on($('close-btn', 'c')[0], 'click', function() {
  $dialog.style.display = 'none';
});

// 对话框确定按钮点击事件
on($('bms'), 'click', function() {
  location.href = '/followorder/proxy/saleMx/' + type;
});
