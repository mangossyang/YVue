//依赖收集器
class Dep {
  constructor() {
    //依赖收集容器
    this.subs = [];
  }
  //添加订阅者
  addSub(sub) {
    this.subs.push(sub);
  }
  //通知订阅者更新
  notify() {
    this.subs.forEach((sub) => {
      sub.update();
    });
  }
}
//target为订阅者实例
Dep.target = null;

//订阅者  负责具体节点更新 
class Watcher {
  constructor(vm, exp, cb) {
    this.vm = vm;
    this.exp = exp;
    this.cb = cb;
    this.val = this.get();
  }
  //Dep将来会调用
  update() {
    this.run();
  }
  run() {
    let value = this.vm[this.exp];
    let oldVal = this.val;
    if (value != this.val) {
      this.val = value;
      this.cb.call(this.vm, value, oldVal);
    }
  }
  get() {
    Dep.target = this;
    let value = this.vm[this.exp];
    Dep.target = null;
    return value;
  }
}
function defineReactive(obj, key, val) {
  //遍历
  observer(val);

  let dep = new Dep();

  //属性拦截
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: true,
    get() {
        //依赖收集建立
      Dep.target && dep.addSub(Dep.target);
      return val;
    },
    set(newVal) {
      if (val === newVal) return;

      observer(newVal)

      val = newVal;

      dep.notify();
    }
  });
}

function observer(obj) {
  if (!obj || typeof obj !== "object" || typeof obj == null) return;
  Object.keys(obj).forEach((key) => {
    defineReactive(obj, key, obj[key]);
  });

  return obj;
}


function set(obj,key,val){
    defineReactive(obj, key, val);
}

function proxy(vm){
    Object.keys(vm.$data).forEach(key=>{
        Object.defineProperty(vm,key,{
            get(){
                return vm.$data[key]
            },
            set(newVal){
                vm.$data[key] = newVal
            }
        })
    })
}

//遍历模板树 解析其中动态部分
class Compile{
    constructor(el,vm){
        this.$vm = vm
        const dom = document.querySelector(el)
        
        //编译
        this.compile(dom)
    }

    compile(el){
        //遍历el
        const childNodes = el.childNodes

        childNodes.forEach(node=>{
            if(this.isEle(node)){
                //元素:解析动态的指令、属性绑定、事件
                const attrs = node.attributes
                Array.from(attrs).forEach(attr=>{
                    //判断是否是一个动态属性
                    const attrName = attr.name
                    const exp = attr.value

                    if(this.isDir(attrName)){
                        const dir = attrName.slice(2)
                        this[dir] && this[dir](node,exp)
                    }
                })
                //递归
                node.childNodes.length && this.compile(node)
            }else if(this.isInner(node)){
                //插值表达式
                this.compileText(node)
            }
            
        })
    }

    isEle(node){
        return node.nodeType === 1
    }
    isInner(node){
        return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)
    }
    isDir(attrName){
        return attrName.startsWith('y-')
    }

    //处理所有动态绑定
    update(node, exp, dir){
        //初始化
        const fn = this[dir + 'Updater']
        fn && fn(node, this.$vm[exp])
        //创建watcher实例
        new Watcher(this.$vm,exp,function(val){
            fn && fn(node, val)
        })
    }
    //y-text
    text(node,exp){
        this.update(node, exp, 'text')
    }
    textUpdater(node,val){
        node.textContent = val
    }
    //y-html
    html(node,exp){
        this.update(node, exp, 'html')
    }
    htmlUpdater(node,val){
        node.innerHTML = val
    }
//解析{{}}
    compileText(node){
        this.update(node, RegExp.$1, 'text')
    }
}

class YVue {
    constructor(options){
        this.$options = options
        this.$data = options.data

        // 1.响应式
        observer(this.$data)

        //代理
        proxy(this)

        // 2.编译模板
        new Compile(options.el,this)
    }
}