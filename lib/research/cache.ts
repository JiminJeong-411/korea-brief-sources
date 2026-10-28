// Process-local bounded cache, shared by concurrent requests in the same runtime.
// Serverless instances can be recycled; correctness never depends on a warm cache.
export class TimedCache<T>{
 private values=new Map<string,{value:T;at:number}>();private pending=new Map<string,Promise<T>>();
 constructor(private ttl:number,private max=24){}
 peek(key:string){return this.values.get(key);}
 fresh(key:string,now=Date.now()){const hit=this.values.get(key);return hit&&now-hit.at<this.ttl?hit.value:undefined;}
 put(key:string,value:T){this.values.delete(key);this.values.set(key,{value,at:Date.now()});while(this.values.size>this.max)this.values.delete(this.values.keys().next().value!);}
 clear(){this.values.clear();}
 async get(key:string,load:()=>Promise<T>,force=false):Promise<T>{
  if(!force){const value=this.fresh(key);if(value!==undefined)return value;}
  const running=this.pending.get(key);if(running)return running;
  const task=Promise.resolve().then(load).then(value=>{this.put(key,value);return value;}).finally(()=>{this.pending.delete(key);});this.pending.set(key,task);return task;
 }
}
