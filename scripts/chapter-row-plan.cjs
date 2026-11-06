module.exports=function(plan){
 const lessons=plan.days.flatMap(d=>d.tasks).filter(t=>t.clearType==='lesson'),units=new Map(plan.clearPlan.units.map(u=>[u.id,u]));
 const today=lessons.find(t=>t.id==='clear-2026-11-06-O'),xu=lessons.find(t=>t.id==='clear-2026-11-09-O');
 const legacyLessons=structuredClone(lessons);plan.clearPlan.legacyLessons=legacyLessons;
 const location={
 '11-06-H':'B128.3','11-11-C':'B017','11-13-H':'B128.7','11-16-C':'B029','11-18-C':'B030','11-18-H':'B129.3','11-21-C':'B034','11-23-C':'B041','11-25-C':'B043','11-28-C':'B048','12-02-C':'B063','12-05-C':'B079',
 '11-10-O':'Z07','11-13-O':'Z07','11-16-O':'Z10','11-20-O':'Z15','11-23-O':'Z19','11-27-O':'Z21','11-30-O':'Z26','12-01-O':'Z29','12-04-O':'Z34',
 '11-14-F':'B103','12-03-F':'B108','12-05-F':'B109','12-10-F':'B110','11-26-T':'B120','11-27-H':'B131.2','12-02-H':'B131.7','12-09-H':'B132.4','12-07-C':'B081'
 };
 today.examItems.push({type:'简答题',title:'徐志摩诗歌创作特色',origin:'真题相关设问',rowId:today.id+':xu-style'},{type:'简答题',title:'徐志摩《再别康桥》的意境美和音韵美',origin:'真题相关设问',rowId:xu.id});
 xu.examItems=[];
 const xuRefs=plan.clearPlan.questions.filter(q=>/徐志摩/.test(q.title));for(const q of xuRefs)q.rangeDate=today.date;
 today.questionRefs=[...today.questionRefs,...xuRefs];xu.questionRefs=xu.questionRefs.filter(q=>!/徐志摩/.test(q.title));
 plan.clearPlan.rowMigration={revision:'chapter-rows-20261106-v1',aliases:[]};
 const rows=[];
 const add=(parent,fields)=>{const t={...parent,...fields,clearType:'lesson',rowKind:fields.rowKind,lessonId:parent.id,examTypes:[fields.type],examItems:fields.examItems||[],units:fields.units||[],previousIds:fields.previousIds||[],scopeVersion:4};rows.push(t);return t;};
 for(const lesson of lessons){const fresh=lesson.units.filter(u=>!lesson.previousIds.includes(u.id)),mapped=location[lesson.id.slice(11)];let defaultUnit=(mapped&&units.get(mapped))||fresh[0]||lesson.units[0]||{id:'whole-'+lesson.course,book:lesson.course+'教材',chapter:'全书框架与薄弱点'};
  if(lesson.id==='clear-2026-11-30-C')defaultUnit={id:'yuan-drama',book:units.get('B054').book,chapter:'元代杂剧、南戏相关章节（按所选题）'};
  lesson.examItems.forEach((q,i)=>{const id=q.rowId||(i===0?lesson.id:lesson.id+':exam-'+(i+1)),displayUnit=lesson.id===today.id?units.get('Z04'):defaultUnit;
   const t=add(lesson,{id,date:lesson.date,type:q.type,title:q.title,main:q.title,basics:'',scope:lesson.scope,role:'新学题目',rowKind:'question',displayUnit,examItems:[q],detail:q.title+'\n'+lesson.scope,questionRefs:lesson.questionRefs});
   if(i>0&&!q.rowId)plan.clearPlan.rowMigration.aliases.push({from:lesson.id,to:t.id});
  });
  for(const u of lesson.units)add(lesson,{id:lesson.id+':chapter-'+u.id,type:lesson.previousIds.includes(u.id)?'复习回顾':'课本梳理',role:lesson.previousIds.includes(u.id)?'已学核查':'课本梳理',rowKind:lesson.previousIds.includes(u.id)?'prior':'chapter',title:u.chapter,main:u.focus,displayUnit:u,units:[u],previousIds:lesson.previousIds.includes(u.id)?[u.id]:[],basics:'',detail:u.book+'\n'+u.chapter+'\n'+u.focus});
  if(lesson.basics)add(lesson,{id:lesson.id+':facts',type:'填空与识记',role:'配套基础',rowKind:'facts',title:lesson.basics,main:lesson.basics,displayUnit:defaultUnit,basics:'',detail:lesson.basics+'\n遮住资料核对作者作品、概念或例句；错项留待复测。'});
 }
 for(const d of plan.days){const extra=[];for(const t of d.tasks.filter(t=>t.clearType==='precheck'))t.units.forEach((u,i)=>extra.push({...t,id:i?t.id+':'+u.id:t.id,clearType:'lesson',rowKind:'prior',title:u.chapter,main:u.focus,units:[u],displayUnit:u,previousIds:[u.id],examTypes:['复习回顾'],type:'复习回顾',detail:u.book+'\n'+u.chapter+'\n'+u.focus}));d.tasks=d.tasks.filter(t=>!['lesson','precheck'].includes(t.clearType)).concat(rows.filter(t=>t.date===d.date),extra);}
 // The November 9 source ID is deliberately retained on the moved poem question.
 const active=new Set(plan.days.flatMap(d=>d.tasks).map(t=>t.id));
 for(const t of legacyLessons)if(!active.has(t.id)&&!plan.archivedTasks.some(a=>a.id===t.id))plan.archivedTasks.push(t);
 plan.version='chapter-rows-20261106-v1';plan.clearPlan.revision=plan.version;plan.clearPlan.rowCount=rows.length;
 return plan;
};
