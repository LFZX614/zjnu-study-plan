const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),study=path.resolve(root,'../..'),dist=path.join(root,'dist');
const approved=path.join(__dirname,'clear-approved-plan.json');
if(!fs.existsSync(approved))fs.copyFileSync(path.join(study,'output/全量复习安排-无逐题时限/核查数据-无逐题时限.json'),approved);
const src=JSON.parse(fs.readFileSync(approved,'utf8'));
const baseFile=path.join(__dirname,'clear-base-plan.json'),appFile=path.join(__dirname,'clear-base-app.js');
if(!fs.existsSync(baseFile))fs.copyFileSync(path.join(dist,'plan.json'),baseFile);
if(!fs.existsSync(appFile))fs.writeFileSync(appFile,fs.readFileSync(path.join(dist,'app-v2.js'),'utf8').split('// Apply the new generic plan without changing personal completion, notes or sessions.')[0]);
const base=JSON.parse(fs.readFileSync(baseFile,'utf8')),plan=structuredClone(base);
const pro=new Set(['古代文学','现当代文学','外国文学','文学理论','现代汉语']);
const codes={'古代文学':'C','现当代文学':'O','外国文学':'F','文学理论':'T','现代汉语':'H'};
const examMap=require('./clear-exam-types.cjs')(src.items,codes);
const units=new Map(src.coverage.map(u=>[u.id,u]));
const older=[...base.days.flatMap(d=>d.tasks.map(t=>({...t,date:t.date||d.date}))),...(base.archivedTasks||[])];
plan.archivedTasks=[...new Map(older.filter(t=>pro.has(t.course)&&t.date>='2026-11-06').map(t=>[t.id,t])).values()];
for(const d of plan.days)d.tasks=d.tasks.filter(t=>!pro.has(t.course)||d.date<'2026-11-06');
function add(t){const day=plan.days.find(d=>d.date===t.date);assert(day,t.date);day.tasks.push(t);}
const refs=(ids,date,course)=>src.questions.filter(q=>(ids.includes(q.unit)&&q.rangeDate===units.get(q.unit).date)||(q.rangeDate===date&&q.rangeDate!==units.get(q.unit).date&&units.get(q.unit).course===course));
for(const it of src.items){const ids=[...it.ids,...it.old];const us=ids.map(id=>units.get(id));
 add({id:`clear-${it.date}-${codes[it.course]}`,date:it.date,course:it.course,title:it.main,type:'课本梳理',role:'明确任务卡',clearType:'lesson',scopeVersion:4,
 main:it.main,scope:it.scope,basics:it.basics,note:it.note,units:us,previousIds:it.old,
 questionRefs:refs(ids,it.date,it.course),detail:`重点作答：${it.main}\n教材基础：${it.scope}\n配套识记：${it.basics}${it.note?'\n提醒：'+it.note:''}`,
 study:{book:[...new Set(us.map(u=>u.book))].join('／')||'本学科已学教材',chapter:us.map(u=>u.chapter).join('；')||'补漏与全书核查',unit:`clear-${it.date}-${codes[it.course]}`,section:'重点作答＋教材基础＋配套识记'}});
}
for(const[date,s]of Object.entries(src.sundayChecks))if(s.ids?.length)add({id:`clear-check-${date}`,date,course:'古代文学',title:s.title,type:'课本梳理',role:'已学核查',clearType:'precheck',scopeVersion:4,main:'先核查已学基础；未学或未过项登记待补',units:s.ids.map(id=>units.get(id)),previousIds:s.ids,questionRefs:refs(s.ids,date,'古代文学'),detail:'不新增背诵。'+s.title+'。未学内容登记待补，不要求周日补完。'});
for(const[date,title]of Object.entries(src.final))add({id:'clear-final-'+date,date,course:date==='2026-12-14'||date==='2026-12-16'?'文学理论':'现当代文学',title,type:'练习',role:'跨科整卷与修复',clearType:'final',scopeVersion:4,main:title,units:[],detail:title+'\n整卷按实际考试要求计时；订正后合书重测。当天不叠加两科新背。'});
for(const d of plan.days)for(const t of d.tasks)if(t.clearType==='lesson'){
 t.examItems=examMap[t.id];t.type=t.examItems[0].type;
 t.title=t.examItems.map(q=>`【${q.type}】${q.title}`).join('；');
 t.examTypes=[...new Set([...t.examItems.map(q=>q.type),'课本梳理',...(t.basics?['填空与识记']:[])])];
}
plan.version='clear-full-review-20261106-v4-types1';plan.textbookOrderVersion=4;delete plan.reorder;delete plan.solid;
plan.clearPlan={revision:plan.version,start:'2026-11-06',end:'2026-12-18',units:src.coverage,questions:src.questions,final:src.final,sundays:src.sundayChecks,checks:src.checks,
 methods:{A:'重点深化：同题跨年出现，或近期主观题／反复出现专题中的主观题等。须结合题型和教材地位判断；并非每条均为高频题。',B:'曾考掌握：保留基本概念、作答提纲和例证；原题有争议时先核对，不能把B类理解为可以不学。'},
 sources:{A:'2004—2023汇编；缺2006，非完整二十年试卷',B:'2022年693',C:'2022年939',D:'2023年693',E:'2023年939',F:'2024年Word版',G:'文件名2025，用户确认2024年图片693另一版',H:'文件名2025，用户确认2024年图片825另一版'},
 sourceNote:'真题共389条原始记录，合并349组问法。2024不同版本不当作不同年份；现汉、文论、外文只有2022—2024资料。教材理解拓展与真题原题分开看。'};
const current=plan.days.flatMap(d=>d.tasks),retained=new Set([...current,...plan.archivedTasks].map(t=>t.id));
for(const t of older)assert(retained.has(t.id),'Lost old task '+t.id);
const cards=current.filter(t=>t.clearType);for(const u of src.coverage)assert(cards.some(t=>t.units.some(x=>x.id===u.id)),'Unassigned '+u.id);
assert.equal(src.questions.flatMap(q=>q.evidence).length,389);assert.equal(new Set(src.questions.flatMap(q=>q.evidence.map(e=>e.id))).size,389);
for(const t of current.filter(t=>t.clearType==='lesson'))assert(base.days.find(d=>d.date===t.date).subjects.includes(t.course));
for(const t of cards)assert(!('minutes'in t));
fs.writeFileSync(path.join(dist,'plan.json'),JSON.stringify(plan));
const baseApp=fs.readFileSync(appFile,'utf8').replace("['moves','memory','sessions']","['moves','memory','sessions','clearLearning','clearCoverage','clearChecks','clearMeta']").replace("fetch('plan.json?v=8'","fetch('plan.json?v=clear4'");
fs.writeFileSync(path.join(dist,'app-v2.js'),baseApp+'\n'+fs.readFileSync(path.join(__dirname,'clear-runtime.js'),'utf8'));
const index=fs.readFileSync(path.join(dist,'index.html'),'utf8').replace(/app-v2\.js\?v=[^"']+/,'app-v2.js?v=clear4-types1').replace(/style\.css\?v=[^"']+/,'style.css?v=clear4-types1');fs.writeFileSync(path.join(dist,'index.html'),index);
let css=fs.readFileSync(path.join(dist,'style.css'),'utf8').split('/* CLEAR TASK CARDS */')[0];
css+='\n/* CLEAR TASK CARDS */\n.clear-card{border:1px solid var(--line);border-radius:14px;padding:16px;margin:12px 0;overflow-wrap:anywhere}.clear-card h3{font-size:16px;margin:0 0 10px}.clear-card h4{font-size:14px;margin:16px 0 8px}.clear-card p{line-height:1.7}.clear-card ul{padding-left:22px;line-height:1.8}.clear-status{font-size:12px;color:var(--muted)}.clear-unit{padding:9px 0;border-bottom:1px solid var(--line)}.clear-unit label{display:flex;align-items:flex-start;gap:9px}.clear-unit input{width:auto;flex:none;margin-top:5px}.clear-unit small{display:block;color:var(--muted);line-height:1.7}.clear-evidence{max-height:420px;overflow:auto}.clear-banner{border:1px solid var(--line);padding:16px;border-radius:14px;margin:16px 0}.clear-banner p{line-height:1.7}.clear-tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.clear-card .task{margin:0}.clear-alert{color:#d69c79}.clear-card button,.clear-banner button{max-width:100%;white-space:normal}.clear-assess label{margin:12px 0}.clear-source{margin:12px 0;line-height:1.7}.clear-table-wrap{overflow:auto}.clear-search{width:100%;max-width:680px;margin:12px 0}.clear-empty{padding:12px;color:var(--muted)}\n';
fs.writeFileSync(path.join(dist,'style.css'),css);
const docFolder=path.join(study,'output/全量复习安排-无逐题时限');for(const [from,to]of [['每天照着做-明确任务卡.md','clear-daily-plan.md'],['教材与真题覆盖清单-无逐题时限.md','clear-coverage.md'],['复习与模拟安排-无逐题时限.md','clear-reviews.md']])fs.copyFileSync(path.join(docFolder,from),path.join(dist,to));
console.log(JSON.stringify({version:plan.version,cards:cards.length,units:src.coverage.length,records:389,oldTasksPreserved:older.length}));
