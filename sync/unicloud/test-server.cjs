const assert=require('assert/strict'),crypto=require('crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),tables={};
const command={inc:n=>({op:'inc',n}),set:value=>({op:'set',value}),lt:n=>({op:'lt',n})};
function collection(name){
 const rows=tables[name]||=new Map();
 const ref=predicate=>({get:async()=>({data:[...rows.values()].filter(predicate).map(copy)}),remove:async()=>{for(const[k,v]of rows)if(predicate(v))rows.delete(k)},update:async patch=>{let updated=0;for(const row of rows.values())if(predicate(row)){updated++;for(const[k,v]of Object.entries(patch))row[k]=v?.op==='inc'?(row[k]||0)+v.n:v?.op==='set'?copy(v.value):copy(v)}return{updated}}});
 return {doc:id=>ref(row=>row._id===id),where:query=>ref(row=>Object.entries(query).every(([k,v])=>v?.op==='lt'?row[k]<v.n:row[k]===v)),add:async row=>{if(rows.has(row._id))throw Error('duplicate');rows.set(row._id,copy(row));return{id:row._id}}};
}
global.uniCloud={database:()=>({command,collection})};
process.env.STUDY_USERNAME='test-student';process.env.STUDY_PASSWORD_SALT='12'.repeat(16);process.env.STUDY_PASSWORD_HASH=crypto.pbkdf2Sync('Test-password-Only8',Buffer.from(process.env.STUDY_PASSWORD_SALT,'hex'),600000,32,'sha256').toString('hex');
const {main}=require('./study-sync');
const call=async(input,token,extra={})=>{const r=await main({httpMethod:'POST',headers:{origin:'https://zjnu-study-plan.onrender.com',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(input),...extra});return {status:r.statusCode,value:JSON.parse(r.body)}};
(async()=>{
 assert.equal((await call({action:'pull'})).status,401);
 assert.equal((await call({action:'login',username:'test-student',password:'wrong'})).status,401);
 const a=(await call({action:'login',username:'test-student',password:'Test-password-Only8'})).value;
 const b=(await call({action:'login',username:'test-student',password:'Test-password-Only8'})).value;
 assert(a.access_token);assert.notEqual(a.access_token,b.access_token);
 assert.equal((await call({action:'pull'},a.access_token)).value.revision,0);
 let result=await call({action:'sync',expected_revision:0,progress:{notes:{x:'first'},moves:{a:{date:'2026-11-07'}}}},a.access_token);assert.equal(result.value.ok,true);
 result=await call({action:'sync',expected_revision:0,progress:{notes:{x:'stale'}}},b.access_token);assert.equal(result.value.ok,false);assert.equal(result.value.data.notes.x,'first');
 result=await call({action:'sync',expected_revision:1,progress:{notes:{x:''},moves:{}}},b.access_token);assert.equal(result.value.ok,true);
 result=await call({action:'pull'},a.access_token);assert.deepEqual(result.value.data,{notes:{x:''},moves:{}});
 assert.equal((await call({action:'pull'},a.access_token,{headers:{origin:'https://evil.test'}})).status,403);
 assert.equal((await call({action:'sync',expected_revision:2,progress:[]},a.access_token)).status,400);
 assert.equal((await call({action:'logout'},a.access_token)).status,200);assert.equal((await call({action:'pull'},a.access_token)).status,401);
 assert.equal((await call({action:'pull'},b.access_token)).status,200);
 assert.equal((await call({action:'pull',token:b.access_token})).status,200);
 process.env.STUDY_PASSWORD_HASH='ab'.repeat(32);assert.equal((await call({action:'pull'},b.access_token)).status,401);
 console.log('Domestic server checks passed with simulated database: separate device sessions, rejected password/anonymous access, stale revision, cleared/deleted data, origin restriction, logout revocation and credential rotation.');
})().catch(e=>{console.error(e);process.exitCode=1});
