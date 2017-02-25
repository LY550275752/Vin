;(function(){

// observe.js
//遍历属性，劫持
function observe(data){
	//终止条件
	if(typeof data !== "object"){
		return;
	}
	Object.keys(data).forEach(function(key){
		defineReactive(data,key,data[key]);
	});
}

//劫持属性setter,getter
function defineReactive(data,key,val){
	var dep = new Dep();
	//递归遍历
	observe(val);
	Object.defineProperty(data,key,{
		enumerable:false,
		configurable:false,
		get:function(){
			//在这里收集订阅者Watcher,闭包添加,全局属性Dep.target暂存着Watcher,存完删除
			Dep.target && dep.addSub(Dep.target);
			return val;
		},
		set:function(newVal){
			if(val == newVal) return;
			val = newVal;
			observe(newVal);       //新值是Object的话继续劫持
			dep.notify();
		}
	});
}
//依赖列表
function Dep(){
	this.subs = [];
}
Dep.prototype = {
	addSub:function(sub){
		this.subs.push(sub);
	},
	notify:function(){
		console.log(this.subs);
		this.subs.forEach(function(sub){
			console.log(sub);
			sub.update();
		})
	}
}

// *********Watcher.js******
function Watcher(vm,exp,cb){
	this.cb = cb;
	this.vm = vm;
	this.exp = exp;
	console.log(exp);
	//为了把自己添加到Observe里，强行get;
	this.value = this.get();
}
Watcher.prototype = {
	update:function(){
		//收到Observe的通知
		this.run();
	},
	run:function(){
		var value = this.get(); //
		var oldVal = this.value;
		if(value !== oldVal){
			this.value = value;
			this.cb.call(this.vm,value,oldVal); // 执行绑定的cb,传value,oldVal
		}
	},
	get:function(){
		Dep.target = this;  //暂存
		var value = this.vm[this.exp];
		Dep.target = null;	//移除
		return value;
	}
}


// ********Compile.js********
function Compile(el,vm){
	this.$vm = vm;
	this.$el = this.isElementNode(el) ? el : document.querySelector(el);
	if(this.$el){
		this.$fragment = this.node2Fragment(this.$el);
		this.init(); // 编译一遍，再塞回去
		console.log(this.$el);
		this.$el.appendChild(this.$fragment);
	}

}
Compile.prototype = {
	init:function(){
		this.compileElement(this.$fragment);
	},
	node2Fragment:function(el){
		var fragment = document.createDocumentFragment(),child;
		while(child = el.firstChild){
			//把el的子元素加进文档碎片
			//取第一个加到最后，就会一个个往后跳。
			fragment.appendChild(child);
		}
		return fragment;
	},
	compileElement:function(el){
		var childNodes = el.childNodes,
			me = this;
		[].slice.call(childNodes).forEach(function(node){
			var text = node.textContent;
			var reg = /\{\{(.*)\}\}/; //正则匹配式，字面量
			//判断节点类型
			if(me.isElementNode(node)){
				//元素节点,compile
				me.compile(node);
			}else if(me.isTextNode(node) && reg.test(text)){
				//RegExp.$1 第一个子匹配字符串，即{{}}里的字符串
				me.compileText(node,RegExp.$1);
			};
			//遍历编译子节点
			if(node.childNodes && node.childNodes.length){
				me.compileElement(node);
			}
		})
	},
	compile:function(node){
		var nodeAttrs = node.attributes,
			me = this;
		[].slice.call(nodeAttrs).forEach(function(attr){
			var attrName = attr.name;
			//判断属于Vin指令
			if(me.isDirective(attrName)){
				var exp = attr.value;
				var dir = attrName.substring(2);

				//事件指令，还是绑定指令
				if(me.isEventDirective(dir)){
					//事件
					compileUtil.eventHandler(node,me.$vm)
				}else{
					//文本
					compileUtil[dir] && compileUtil[dir](node,me.$vm,exp);
				}
				node.removeAttribute(attrName)
			}
		});
	},
	compileText:function(node,exp){
		compileUtil.text(node,this.$vm,exp);
	},
	isElementNode:function(node){
		return node.nodeType == 1;
	},
	isTextNode:function(node){
		return node.nodeType == 3;
	},
	isDirective:function(attr){
		//太巧妙了
		return attr.indexOf('v-') == 0;
	},
	isEventDirective:function(dir){
		return dir.indexOf('on') == 0;
	}
}

//指令处理
var compileUtil = {
	text:function(node,vm,exp){
		console.log(exp);
		this.bind(node,vm,exp,'text');
	},
	bind:function(node,vm,exp,dir){
		var updaterFn = updater[dir+ 'Updater'];
		//初始化
		updaterFn && updaterFn(node,vm[exp]);
		//实例化个订阅者
		new Watcher(vm,exp,function(value,oldValue){
			updaterFn && updaterFn(node,value,oldValue);
		});
	}
};

//更新方法集合
var updater = {
	textUpdater:function(node,value){
		node.textContent = typeof value == 'undefined' ? "" : value;
	}
}


// ************MVVM.js*********
function MVVM(options){
	this.$options = options;
	var data = this._data = this.$options.data;
	var me = this;
	Object.keys(data).forEach(function(key){
		me._proxy(key);
	})
	observe(data);
	this.$compile = new Compile(options.el || document.body,this); // this存做后面的vm;
}
//MVVM属性代理，取vm的属性等于取vm._data的属性
MVVM.prototype = {
	_proxy:function(key){
		var me = this;
		Object.defineProperty(me,key,{
			configurable:false,
			enumerable:false,
			get:function proxyGetter(){
				return me._data[key];
			},
			set:function proxySetter(newVal){
				me._data[key] = newVal;
			}
		});
	}
}

window.Vin = MVVM;

})();
