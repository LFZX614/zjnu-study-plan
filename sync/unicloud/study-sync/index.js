'use strict';
const crypto=require('crypto'),{promisify}=require('util');
const derive=promisify(crypto.pbkdf2);
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const ORIGIN='https://zjnu-study-plan.onrender.com';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const response=(statusCode,value)=>({mpserverlessComposedResponse:true,isBase64Encoded:false,statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin'},body:JSON.stringify(value)});
const first=async ref=>(await ref.get()).data[0];
async function insertOnce(collection,record){
 try{await collection.add(record)}catch(error){if(!await first(collection.doc(record._id)))throw error}
}
function config(){
 const username=process.env.STUDY_USERNAME,salt=process.env.STUDY_PASSWORD_SALT,hash=process.env.STUDY_PASSWORD_HASH;
 if(!username||!(/^[a-f0-9]{32}$/.test(salt||''))||!(/^[a-f0-9]{64}$/.test(hash||'')))throw fail(503,'同步账号尚未配置');
 return {username,salt,hash,uid:digest(username)};
}
exports.main=async(event)=>{
 try{
  const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
  if(headers.origin&&headers.origin!==ORIGIN)throw fail(403,'来源不允许');
  if(event.httpMethod==='OPTIONS')return response(204,null);
  if(event.httpMethod!=='POST')throw fail(405,'请使用 POST 请求');
  let body=event.body||'{}';if(event.isBase64Encoded)body=Buffer.from(body,'base64').toString('utf8');
  if(typeof body!=='string'||Buffer.byteLength(body)>950000)throw fail(413,'记录过大，请先导出备份');
  let input;try{input=JSON.parse(body)}catch{throw fail(400,'请求格式不正确')}
  if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'请求格式不正确');
  const cfg=config(),db=uniCloud.database(),sessions=db.collection('study_sync_sessions'),progress=db.collection('study_sync_progress');
  if(input.action==='login'){
   if(typeof input.username!=='string'||typeof input.password!=='string'||input.password.length>256)throw fail(401,'账号或密码不正确');
   // A persistent counter applies across function instances, before password work.
   const limits=db.collection('study_sync_login_limits'),bucket=String(Math.floor(Date.now()/900000));
   await insertOnce(limits,{_id:bucket,count:0,expires_at:Date.now()+900000});
   const gate=await limits.where({_id:bucket,count:db.command.lt(12)}).update({count:db.command.inc(1)});
   if(gate.updated!==1)throw fail(429,'登录尝试较多，请15分钟后再试');
   const actual=await derive(input.password,Buffer.from(cfg.salt,'hex'),600000,32,'sha256');
   if(input.username!==cfg.username||!crypto.timingSafeEqual(actual,Buffer.from(cfg.hash,'hex')))throw fail(401,'账号或密码不正确');
   const token=crypto.randomBytes(32).toString('hex'),expiresAt=Date.now()+30*86400000;
   await sessions.add({_id:digest(token),user_id:cfg.uid,credential:cfg.hash,expires_at:expiresAt});
   return response(200,{user:{id:cfg.uid,email:cfg.username},access_token:token,expires_at:Math.floor(expiresAt/1000)});
  }
  const token=(headers.authorization||'').replace(/^Bearer /,'')||input.token||'';
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw fail(401,'请重新登录');
  const auth=await first(sessions.doc(digest(token)));
  if(!auth||auth.user_id!==cfg.uid||auth.credential!==cfg.hash||auth.expires_at<=Date.now())throw fail(401,'登录已过期，请重新登录');
  if(input.action==='logout'){await sessions.doc(digest(token)).remove();return response(200,{ok:true})}
  if(input.action==='pull'){
   const row=await first(progress.doc(cfg.uid));
   return response(200,{data:row?.data||{},revision:row?.revision||0});
  }
  if(input.action==='sync'){
   if(!Number.isSafeInteger(input.expected_revision)||input.expected_revision<0||!input.progress||typeof input.progress!=='object'||Array.isArray(input.progress))throw fail(400,'学习记录格式不正确');
   await insertOnce(progress,{_id:cfg.uid,data:{},revision:0});
   // One conditional update is atomic; a stale device receives the current row.
   // command.set replaces the complete JSON, including intentional deletions.
   const changed=await progress.where({_id:cfg.uid,revision:input.expected_revision}).update({data:db.command.set(input.progress),revision:db.command.inc(1),updated_at:Date.now()});
   if(changed.updated===1)return response(200,{ok:true,data:input.progress,revision:input.expected_revision+1});
   const row=await first(progress.doc(cfg.uid));return response(200,{ok:false,data:row.data,revision:row.revision});
  }
  throw fail(404,'接口不存在');
 }catch(error){return response(error.status||500,{message:error.status?error.message:'云端暂时无法保存，记录仍保存在本机'})}
};
