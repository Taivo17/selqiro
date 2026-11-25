'use strict';
// Deterministic hook scheduler runs the actual controller. This is behavior
// proof with synthetic Auth/RPC/photo state, not a browser or SQL substitute.
const Module=require('node:module'), React=require('react');
const base=require('../helpers/jobs-public-loader.cjs');
function loadWithExternals(overrides={},externals={}) {
  const source=base.loader(overrides);
  return name=>{
    const original=Module._load;
    Module._load=function(request,parent,isMain) {
      return Object.hasOwn(externals,request)?externals[request]:original.call(this,request,parent,isMain);
    };
    try{return source(name);}finally{Module._load=original;}
  };
}
function hookScheduler() {
  let slots=[],cursor=0,dirty=true,render=null,output=null,pending=[];
  const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const hooks={...React,
    useState(initial) {const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};
      return [slots[i].value,next=>{const value=typeof next==='function'?next(slots[i].value):next;
        if(!Object.is(value,slots[i].value)){slots[i].value=value;dirty=true;}}];},
    useRef(initial){const i=cursor++;return (slots[i]??={current:initial});},
    useEffect(effect,deps){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps)){
      const previous=slots[i];slots[i]={deps,cleanup:previous?.cleanup};pending.push(()=>{previous?.cleanup?.();slots[i].cleanup=effect();});}},
  };
  hooks.useLayoutEffect=hooks.useEffect;
  return {hooks,start(fn){render=fn;dirty=true;},invalidate(){dirty=true;},get state(){return output;},
    async flush(){for(let turn=0;turn<40;turn++){
      if(dirty){dirty=false;cursor=0;output=render();const effects=pending;pending=[];for(const effect of effects)effect();}
      await Promise.resolve();await Promise.resolve();
      if(!dirty&&!pending.length){await Promise.resolve();if(!dirty)return output;}
    }throw new Error('hook_did_not_settle');},
    close(){for(const slot of slots)slot?.cleanup?.();slots=[];},
  };
}
function browserLocation(path,onChange=()=>{}) {
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
  let url=new URL(path,'https://selqiro.test'),changes=[];
  const window={get location(){return {href:url.href,pathname:url.pathname,search:url.search,hash:url.hash};},
    history:{replaceState(_state,_title,next){url=new URL(next,url);changes.push(url.href);onChange(url);}}};
  Object.defineProperty(globalThis,'window',{configurable:true,value:window});
  return {get url(){return url;},changes,navigate(path){url=new URL(path,url);onChange(url);},close(){
    if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;
  }};
}
module.exports={...base,loadWithExternals,hookScheduler,browserLocation};
