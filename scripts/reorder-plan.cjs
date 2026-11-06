const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const p=JSON.parse(fs.readFileSync(path.join(__dirname,'plan-before-reorder.json'),'utf8'));
const catalogue=JSON.parse(fs.readFileSync(path.join(__dirname,'textbook-catalogue.json'),'utf8'));
const units=new Map(catalogue.calendar.flatMap(d=>d.coverage).map(u=>[u.id,u]));
const professional=new Set(['古代文学','现当代文学','外国文学','文学理论','现代汉语']);
const original=p.days.flatMap(d=>d.tasks.map(t=>({...t,date:d.date})));
const shift=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const id=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const bid=n=>'B'+String(n).padStart(3,'0');
function locate(t,n,section='章内对应考点',sub=0){const u=units.get(bid(n));assert(u,`Unknown unit ${n}`);t.study={unit:u.id,book:u.book,chapter:u.chapter,section,sectionOrder:sub,subsectionOrder:0,order:n,crossChapter:false};}
function match(t,r,n,section,sub){if(r.test(t.title)){locate(t,n,section,sub);return true}return false}
// Assign each individual question, not its entire author/genre module.
for(const t of original.filter(t=>professional.has(t.course)&&t.type!=='复习回顾')){
 if(!t.topicId)continue;
 const s=t.title;
 if(t.course==='古代文学'){
  const rules=[
   [/诗界革命|黄遵宪/,87],[/清季四大|常州词派/,85],[/阳羡|浙西|神韵说|清代骈文/,76],[/桐城|义法说|格调说|性灵说|肌理说/,82],
   [/桃花扇/,77],[/清代小说创作/,83],[/聊斋志异.*之后/,83],[/聊斋/,79],[/儒林/,80],[/红楼梦/,81],
   [/三国演义|七实三虚|章回小说/,63],[/西游记/,70],[/金瓶梅|世情小说/,71],[/三言|二拍|拟话本/,72],
   [/牡丹亭|临川四梦/,69],[/明清传奇/,68],[/前七子|后七子|唐宋派/,66],[/刘基|明初散文/,65],[/公安派|晚明小品|竟陵派/,73],
   [/诗与词|^诗$|^词$|^曲$|^诗言志$/,999],
   [/沧浪诗话|兴趣说|妙悟说/,51],[/^文以载道$/,42],
   [/诸宫调|宋话本|宋元话本|^话本$/,53],[/唐传奇/,35],[/赵氏孤儿|曲状元/,57],[/^散曲$/,60],[/元曲四大|元杂剧/,54],[/南戏/,59],
   [/问世间情为何物/,51],[/花间|南唐|眼界始大/,38],[/李清照|易安体/,46],[/辛弃疾|稼轩|辛派/,48],[/骚雅|二窗|格律词派/,49],
   [/周邦彦/,45],[/柳永|婉约词/,41],[/豪放词派|苏轼散文/,43],[/江西诗派/,44],[/西昆|^理趣$/,40],[/诚斋体/,47],[/唐诗与宋诗/,51],
   [/欧阳修|唐宋古文运动/,42],[/唐代古文|韩愈|韩柳|文以明道|以文为诗/,34],
   [/韦庄/,36],[/元白|新乐府|新题乐府/,33],[/韩孟/,32],[/杜甫|杜诗/,30],[/李白/,29],[/盛唐|王维|边塞|山水田园诗派/,28],[/初唐|沈宋|唐诗兴盛/,27],
   [/志人|志怪/,25],[/永明|宫体|谢朓/,22],[/谢家春|山水诗/,21],[/骈文|北山移文/,24],[/太康|玄言|潘鬓/,18],[/田园诗|归去来兮|桃花源记/,19],
   [/三曹|建安|七子|曹操|曹丕|正始|壮心惜暮年/,17],[/魏晋南北朝的文学贡献/,25],
   [/古诗十九首|文人五言/,15],[/汉书|东汉论说/,14],[/汉乐府|乐府民歌|乐府的叙事/,12],[/班固.*赋|抒情小赋/,13],[/汉赋|骚体赋|七发|洞箫赋|司马相如/,10]
  ];
  for(const[r,n]of rules)if(r.test(s)){if(n===999)t.study={...t.study,unit:'cross:ancient',order:999,chapter:'跨章综合与比较',section:'相关章节完成后串联',crossChapter:true};else locate(t,n);break}
 }
 if(t.course==='现当代文学'){
  // Keep author-topic identity for notes; the following locations describe the work.
  if(/左翼作家与新月/.test(s))locate(t,91,'30年代左翼文艺论争',1);
  else if(/七月诗派|评述七月诗派|九叶|中国新诗派|十四行集|艾青/.test(s))locate(t,92,'40年代诗歌：艾青、七月诗派与九叶诗人分别掌握',1);
  else if(/雨巷|现代派诗歌/.test(s))locate(t,91,'30年代诗歌：戴望舒与现代派',6);
  else if(/新月|再别康桥|三美/.test(s))locate(t,90,'新月诗派、闻一多与徐志摩',6);
  else if(t.topicId==='m-caa02c4eb41035cb')locate(t,90,'早期新诗及诗歌流派背景',5);
  else if(/茶馆/.test(s))locate(t,93,'十七年戏剧：老舍《茶馆》',3);
  else if(/四世同堂|寒夜|呼兰河传|萧红|小团圆媳妇|张爱玲|金锁记|苍凉|^《传奇》$|围城|财主|七月派/.test(s))locate(t,92,'40年代小说与作家创作转变',2);
  else if(/孤岛|文协|延安|解放区|评书体|两个口号|民族形式|赵树理与孙犁/.test(s))locate(t,92,'抗战、解放区文艺及相关背景',0);
  else if(/东北作家群|生死场/.test(s))locate(t,91,'30年代小说与东北作家群',5);
  else if(/论语派|梁实秋|絮语体|闲适散文|言志散文/.test(s))locate(t,91,'30年代散文',7);
  else if(/样板戏|三突出/.test(s))locate(t,94,'文革文学',0);
  else if(/地下诗歌/.test(s))locate(t,94,'文革时期地下诗歌',1);
  else if(/后朦胧|第三代|大雁塔/.test(s))locate(t,96,'80年代诗歌',5);
  else if(/知识分子写作|民间写作|西斯|镜中/.test(s))locate(t,97,'90年代诗歌',5);
  else if(/朦胧诗|归来者/.test(s))locate(t,95,'新时期诗歌：归来者与朦胧诗',3);
  else if(/白鹿原|尘埃落定|长恨歌|王琦瑶|心灵史|文化苦旅|我与地坛|文化散文|学者散文/.test(s))locate(t,97,'90年代小说与散文',2);
  else if(/文城|贾平凹获第七届/.test(s))locate(t,98,'新世纪作家作品识记',1);
  else if(/活着|许三观/.test(s))locate(t,97,'余华90年代创作',1);
  else if(/干校六记|杨绛/.test(s))locate(t,96,'80年代散文',6);
  else if(t.study?.order===91){const part=/左翼|左联/.test(s)?1:/茅盾|子夜|剖析|吴荪甫|蚀/.test(s)?2:/新感觉|海派|京海|京派|沈从文|边城|湘西|希腊小庙|从文自传|丈夫|老舍|骆驼|老张/.test(s)?3:/巴金|激流|^《家》$|曹禺|雷雨|日出|原野|爱美剧|夏衍/.test(s)?4:3;t.study.sectionOrder=part;t.study.section='30年代文学：按作家、文类分段';}
 }
 if(t.course==='外国文学'){
  if(/自然主义|唯美主义|玩偶之家|社会问题剧|安娜/.test(s))locate(t,108);
  else if(/自然派|多余人|新人形象|小人物|复调|惠特曼/.test(s))locate(t,107);
  else if(/象征主义/.test(s))locate(t,108,'19世纪后期象征主义及其后续影响');
 }
 if(t.course==='文学理论'){
  if(/文学意蕴|文学文本|文学言语层|文学形象层|有意味的形式/.test(s))locate(t,120);
  else if(/艺术发现|艺术概括|材料储备|创作个性|物化过程|文学构思|直觉|灵感|艺术想象|创作动机/.test(s))locate(t,117);
  else if(/话语五要素|^抒情$/.test(s))locate(t,122);
  else if(/剧本|戏剧性/.test(s))locate(t,119,'文学体裁：戏剧');
 }
 if(t.course==='现代汉语'&&t.study?.order===128){
  const n=/音位/.test(s)?7:/轻声|变调|儿化/.test(s)?6:/音节/.test(s)?5:/调类|调值|声调/.test(s)?4:/韵母|元音|四呼/.test(s)?3:/声母|辅音|舌尖/.test(s)?2:1;
  t.study.sectionOrder=n;t.study.section=['','语音概说','辅音与声母','元音与韵母、四呼','声调','音节','音变','音位'][n];
 }
}
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const ancientSlots=[['11-07',[10]],['11-09',[12,13,14,15]],['11-11',range(16,18)],['11-14',range(19,25)],['11-16',range(26,30)],['11-18',range(31,37)],['11-21',range(38,45)],['11-23',range(46,51)],['11-25',range(52,61)],['11-28',range(62,69)],['11-30',range(70,74)],['12-02',range(75,80)],['12-05',range(81,83)],['12-07',range(84,88)],['12-09',[999]]];
const foreignSlots=[['11-07',[102]],['11-12',[103]],['11-14',[104]],['11-19',[105]],['11-21',[106]],['11-26',[107]],['11-28',[108]],['12-03',[109]],['12-05',[110]]];
const theorySlots=[['11-10',[113]],['11-12',[114,115]],['11-17',[116]],['11-19',[117,118]],['11-24',[119,120]],['11-26',[121,122]],['12-01',[123,124]],['12-03',[125,126]],['12-08',[999]]];
function slot(slots,n){return '2026-'+assertSlot(slots,n)}
function assertSlot(slots,n){const s=slots.find(x=>x[1].includes(n));assert(s,`No slot for ${n}`);return s[0]}
function newDate(t){const n=t.study?.order;
 if(t.course==='古代文学')return n<10||n===11?'2026-11-07':slot(ancientSlots,n);
 if(t.course==='外国文学')return n<=101?'2026-11-07':slot(foreignSlots,n);
 if(t.course==='文学理论')return n<=112?'2026-11-10':slot(theorySlots,n);
 if(t.course==='现代汉语')return n<=127?'2026-11-06':n===128?(t.study.sectionOrder<=3?'2026-11-06':t.study.sectionOrder<=5?'2026-11-11':'2026-11-13'):n===129?'2026-11-18':n===130?'2026-11-20':n===132?'2026-12-04':/复句|句群|紧缩句/.test(t.title)?'2026-12-02':/短语/.test(t.title)&&!/作宾语/.test(t.title)?'2026-11-27':/词类|实词|虚词|兼类|量词/.test(t.title)?'2026-11-25':'2026-12-02';
 if(t.course==='现当代文学'){
  if(n<=89)return '2026-11-06';
  if(n===90)return /新月|再别康桥|三美|尝试集|小诗|象征主义|蛇/.test(t.title)?'2026-11-06':'2026-11-09';
  if(n===91)return t.study.sectionOrder<=2?'2026-11-10':t.study.sectionOrder===3?'2026-11-13':t.study.sectionOrder===4?'2026-11-16':'2026-11-17';
  if(n===92)return /四世同堂|寒夜|张爱玲|金锁记|苍凉|^《传奇》$|围城/.test(t.title)?'2026-11-23':'2026-11-20';
  if(n===93||n===94)return '2026-11-24';
  if(n===95)return '2026-11-27';
  if(n===96)return '2026-11-30';
  if(n===97)return '2026-12-01';
  if(n===98)return '2026-12-04';
  if(n===99)return '2026-12-07';
  return '2026-12-08';
 }
}
// No confirmed completion is manufactured. Earlier learning remains as recorded.
const future=original.filter(t=>professional.has(t.course)&&t.date>='2026-11-06'&&t.type!=='复习回顾');
for(const t of future){
 t.previousDate=t.date;t.date=newDate(t);
 if(t.topicId==='m-0287cd441784c6cf'){t.role='已背验收';t.date='2026-11-09';continue}
 if(['已背验收','同题复用'].includes(t.role)&&t.title!=='新月诗派'){t.date=t.previousDate;continue}
 if(t.role==='必做'&&t.type==='课本梳理'&&t.topicId)t.role='关联查漏';
 if(t.role==='教材通览与自检'||t.role==='已学范围查漏'||t.role==='已完成课本梳理'){
  t.role='关联查漏';t.detail+='\n章节框架定位：先扫目录与小结，不逐页精背；未确认的前置章节仅自检，不自动计为完成。';
 }
 if(t.title==='新月诗派'){t.role='必做';t.memoryKey='q:'+id('reorder:新月诗派');t.detail='本轮新学。掌握时期、代表诗人、新格律诗主张。';}
 if(t.title==='三美主张'){t.role='必做';t.type='简答题';t.detail='解释音乐美、绘画美、建筑美，并结合诗作举例。';}
 if(t.title==='新月派诗歌理论')t.role='关联查漏';
 if(t.title==='韵母'){t.role='必做';t.detail='接着当前韵母图续学：分类、四呼，用具体音节举例；不把整个语音章标为完成。';}
 if(/音素与音位、调类/.test(t.title)){t.role='必做';t.date='2026-11-13';t.study.sectionOrder=7;t.detail+='\n完成声调、音节及音位基础后再辨析。';}
 t.detail=(t.detail||'')+'\n教材位置以本题标注为准；所属旧专题仅保留用于查找与原记录兼容。';
}
// Important basic terms remain brief recognition work; choose representative answers
// instead of separately memorising all near-duplicate questions.
const mustWords=new Set(['新月诗派','三美主张','韵母','七月诗派','九叶诗人','现代派诗歌','左联','新感觉派','社会剖析小说','《茶馆》','审美意识形态','话语蕴藉','文学典型','文学意境','审美意象','文学风格','文学消费','期待视野','文学批评','汉乐府','《古诗十九首》','建安风骨','永明体','江西诗派','元杂剧','南戏','伤痕文学','反思文学','改革文学','朦胧诗','寻根文学','先锋小说','新写实小说','骑士文学','人文主义','古典主义','三一律','启蒙文学','浪漫主义','批判现实主义','自然主义','多余人形象','意识流小说','荒诞派戏剧','语素','实词','虚词','复句']);
for(const t of future)if(mustWords.has(t.title)&&t.topicId)t.role='必做';
const knownIds=new Set(p.progressConfirmation?.completedTaskIds||[]);
for(const t of future)if(knownIds.has(t.id))t.role='已背验收';
// Source task IDs, memory keys and question wording are retained even when optional.
const dailyGroups=new Map();
for(const t of future){const key=t.date+'|'+t.course;if(!dailyGroups.has(key))dailyGroups.set(key,[]);dailyGroups.get(key).push(t)}
const chosen=[];
const frameworks={
 '现代汉语':{'11-11':'声调与音节：调值、调类及具体音节分析','11-13':'音变与音位：轻声、变调、儿化、音位辨析','11-18':'文字：汉字结构、六书与造字法辨析','11-20':'词汇：语素、词、构词法、词义关系','11-25':'词类：划分标准、实词虚词、兼类与活用','11-27':'短语：结构类型、层次分析与歧义','12-02':'句法：句子成分、特殊句式、复句及病句','12-04':'修辞：常用辞格辨析及表达效果'},
 '现当代文学':{'11-09':'五四散文：周作人、语丝社与朱自清','11-10':'30年代文学：左联、文艺论争、茅盾与社会剖析小说','11-13':'30年代小说：新感觉派、沈从文、老舍《骆驼祥子》','11-16':'30年代小说与戏剧：巴金《家》、曹禺《雷雨》《日出》','11-17':'30年代诗歌与散文：戴望舒、现代派、论语派及东北作家群','11-20':'抗战与40年代文学：延安文艺、艾青、七月诗派、九叶及路翎、萧红','11-23':'40年代小说：老舍《四世同堂》、巴金《寒夜》、张爱玲、钱锺书','11-24':'十七年与文革文学分段：政策、农村与历史小说、《茶馆》、样板戏','11-27':'新时期文学：伤痕、反思、改革、归来者与朦胧诗、探索戏剧','11-30':'80年代文学：寻根、先锋、新写实、汪曾祺、后朦胧诗','12-01':'90年代文学：小说转型、女性写作、诗歌及文化散文','12-04':'新世纪文学：底层、贾平凹《秦腔》、余华《文城》及后期作品识记','12-07':'儿童文学：按教材各阶段识记代表作家作品','12-08':'文学史综合：各时期主线与已学作品比较'},
 '外国文学':{'11-07':'中世纪文学与但丁：《神曲》、骑士文学、文学类型','11-12':'文艺复兴：人文主义、塞万提斯与莎士比亚','11-14':'17世纪文学：古典主义、三一律与弥尔顿','11-19':'18世纪文学：启蒙文学、感伤主义、狂飙突进','11-21':'19世纪初期：浪漫主义、拜伦、雨果及美丑对照','11-26':'19世纪中期：现实主义、法英及俄国作家分国别梳理','11-28':'19世纪后期：自然主义、唯美主义、象征主义、易卜生与托尔斯泰','12-03':'20世纪前期：现实主义、现代主义、苏联文学分别梳理','12-05':'20世纪后期：存在主义、荒诞派、黑色幽默及拉美文学'},
 '文学理论':{'11-10':'续学第三章：活动、四要素、文学发生与发展','11-12':'第四、五章：审美意识形态、话语蕴藉、社会主义时期文学活动','11-17':'第六章：文学创造作为精神生产及主客体关系','11-19':'第七、八章：准备、构思、物化及求真、善、美','11-24':'第九、十章：类型体裁、文本层次、典型、意境与意象','11-26':'第十一、十二章：叙事与抒情的基本概念','12-01':'第十三、十四章：文学风格、文学消费与接受性质','12-03':'第十五、十六章：接受过程、效果及批评标准与方法','12-08':'综合论述：语言、文学、审美的关系，只列一份提纲'}
};
for(const[key,ts]of dailyGroups){
 const candidates=ts.filter(t=>t.role==='必做');
 const priority=t=>t.title==='新月诗派'?100:t.title==='三美主张'?99:t.title==='韵母'?100:/再别康桥/.test(t.title)?98:t.type==='论述题'?60:t.type==='简答题'?55:mustWords.has(t.title)?50:40;
 candidates.sort((a,b)=>priority(b)-priority(a));
 const selected=[];const represented=new Set();
 const first=ts[0],date=first.date,course=first.course;
 let framework=frameworks[course]?.[date.slice(5)];
 if(course==='古代文学')framework=ancientSlots.find(x=>'2026-'+x[0]===date)?.[1].map(n=>n===999?'诗词文体及古代文学主线比较':units.get(bid(n)).chapter.replace(/^.*?第\d+章\s*/,'' )).join('、');
 const limit=framework?2:3;
 const contentKey=t=>t.study.unit+'|'+t.topicId;
 // Cover distinct subtopics first; duplicate question forms are optional.
 for(const t of candidates)if(!represented.has(contentKey(t))&&selected.length<limit){selected.push(t);represented.add(contentKey(t))}
 for(const t of candidates)if(selected.length<limit&&!selected.includes(t))selected.push(t);
 for(const t of candidates)if(!selected.includes(t)){t.role='关联查漏';t.detail+='\n选做扩展：先完成当天必做题；同考点问法合用一份提纲，不另背长答案。';}
 chosen.push(...selected);
 if(framework){const st=[...ts].sort((a,b)=>(a.study.order??999)-(b.study.order??999))[0].study;const f={id:'reorder-framework-'+id(key),course,title:'主线梳理：'+framework,type:'课本梳理',role:'必做',date,detail:'先按顺序看相应目录和小结，整理各章或各时期的核心概念、代表作家作品与文学史位置。每个要点留关键词和一个例证，不逐页精背；再完成当天列出的代表题。只勾选实际完成部分，未掌握则留待续学。',memoryKey:'scope:'+id(key),study:{...st,unit:'scope:'+id(key),chapter:'本次主线（依次完成下列范围）',section:framework,crossChapter:true,sectionOrder:0}};future.push(f);chosen.push(f);}
}
// Supply explicit core coverage for major subjects absent from the old priority set.
// Existing optional questions stay available; this does not add new factual material.
const kept=original.filter(t=>!professional.has(t.course)||t.date<'2026-11-06');
const retired=original.filter(t=>professional.has(t.course)&&t.date>='2026-11-06'&&t.type==='复习回顾');
p.retiredTaskIds=[...new Set([...(p.retiredTaskIds||[]),...retired.map(t=>t.id)])];
p.archivedTasks=retired;
const sourceGroups=new Map();
for(const t of chosen){if(!t.memoryKey)t.memoryKey='q:'+id('reorder:'+t.id);const k=t.date+'|'+t.course;if(!sourceGroups.has(k))sourceGroups.set(k,[]);sourceGroups.get(k).push(t)}
const workdays=p.days.filter(d=>!d.rest&&d.date>='2026-11-07');const reviewLoad=new Map();const reviews=[];
const requests=[];
for(const[k,ts]of sourceGroups)for(const interval of[1,3,7,14])requests.push({ts,interval,target:shift(ts[0].date,interval)});
requests.sort((a,b)=>(a.interval===1?0:1)-(b.interval===1?0:1)||a.target.localeCompare(b.target)||a.interval-b.interval);
for(const {ts,interval,target}of requests){
 const day=workdays.find(d=>d.date>=target&&(reviewLoad.get(d.date)||0)<4);
 if(!day)continue;
 reviewLoad.set(day.date,(reviewLoad.get(day.date)||0)+1);
 reviews.push({id:'reorder-review-'+id(ts[0].date+'|'+ts[0].course+'|'+interval),date:day.date,course:ts[0].course,title:ts.map(t=>t.title).join('；'),type:'复习回顾',role:`第${interval}天回顾 · 预计`,interval,staticReview:true,plannedBase:ts[0].date,sourceTaskIds:ts.map(t=>t.id),reviewItems:ts.map(t=>({key:t.memoryKey,title:t.title,type:t.type})),reviewMinutes:5,detail:'只复述已完成题目的提纲，最多5分钟。当前为预计日期；未学内容不算复习，完成后按实际完成日重算。',study:ts[0].study});
}
const next=kept.concat(future,reviews);
for(const d of p.days)d.tasks=next.filter(t=>t.date===d.date);
p.version='textbook-reorder-20261106-v1';p.textbookOrderVersion=2;
p.reorder={revision:p.version,asOf:'2026-11-06',firstPassTarget:'2026-12-09',newTaskLimitPerCourse:3,reviewMinutes:20,notes:'按章节顺序分段；每天每科最多3项必做，其余为查漏。复习以实际完成为准，四个节点按容量安排。12月10日起以复习及补漏为主。',sourceTaskIds:future.map(t=>t.id),retiredReviews:retired.map(t=>({id:t.id,date:t.date,title:t.title}))};
assert.equal(new Set(next.map(t=>t.id)).size,next.length,'Duplicate task IDs');
for(const t of original.filter(t=>t.type!=='复习回顾'))assert(next.some(x=>x.id===t.id),`Lost source ${t.id}`);
for(const t of future){const d=p.days.find(d=>d.date===t.date);assert(d&&!d.rest,`Rest day ${t.title}`);assert(d.subjects.includes(t.course),`Wrong rotation ${t.title}`)}
for(const d of p.days)for(const c of professional)assert(d.tasks.filter(t=>t.course===c&&t.role==='必做').length<=(d.date==='2026-11-05'?20:3),d.date+'|'+c);
for(const ts of sourceGroups.values())assert(reviews.some(r=>r.interval===1&&r.sourceTaskIds.includes(ts[0].id)),'Missing first recall');
fs.writeFileSync(path.join(root,'dist','plan.json'),JSON.stringify(p));
const summary=['# 五科任务重排（11月6日起）','','新学按教材章节推进；每科每天最多3项必做，关联查漏选做。周日休息。预计12月9日前完成本次核心清单，12月10—18日回顾与补漏；按实际进度调整，不能据此认定已学。',''];
for(const d of p.days.filter(d=>d.date>='2026-11-06')){
 summary.push('## '+d.date+'｜'+(d.rest?'休息':d.subjects.join('＋')),'');
 for(const t of d.tasks.filter(t=>professional.has(t.course)&&t.role==='必做'))summary.push('- [ ] '+t.course+'｜'+t.title+'｜'+t.study.chapter);
 const rs=d.tasks.filter(t=>t.id.startsWith('reorder-review-'));if(rs.length)summary.push('- 预计短时回顾：'+rs.map(r=>r.course+'（'+r.reviewItems.length+'题）').join('、')+'；合计最多'+rs.length*5+'分钟。未完成的新学不作回顾。');
 summary.push('');
}
fs.writeFileSync(path.join(root,'dist','reordered-plan.md'),summary.join('\n'));
fs.writeFileSync(path.join(__dirname,'reorder-summary.json'),JSON.stringify({sourceTasks:future.length,required:chosen.length,reviewBundles:reviews.length,retiredReviews:retired.length,latestNewDate:chosen.map(t=>t.date).sort().at(-1),days:p.days.map(d=>({date:d.date,core:d.tasks.filter(t=>professional.has(t.course)&&t.role==='必做').map(t=>({course:t.course,title:t.title,unit:t.study.unit})),reviews:d.tasks.filter(t=>t.id.startsWith('reorder-review-')).length}))},null,2));
console.log(JSON.stringify({required:chosen.length,reviewBundles:reviews.length,lastNew:chosen.map(t=>t.date).sort().at(-1),taskIdsPreserved:true}));
