"""Publish the reviewed catalog with explicit per-subject question combinations."""
import json, datetime as dt, collections
from pathlib import Path
P=Path(__file__).resolve().parent
old=json.loads((P/'data.json').read_text(encoding='utf-8'))
reviewed=json.loads((P/'reviewed-catalog.json').read_text(encoding='utf-8'))
catalog=reviewed['catalog']
REV='approved-20261118-v2'
start=dt.date(2026,11,18);end=dt.date(2026,12,18)
rotation={0:['古代文学','现当代文学'],1:['现当代文学','文学理论'],2:['古代文学','现代汉语'],3:['外国文学','文学理论'],4:['现当代文学','现代汉语'],5:['古代文学','外国文学'],6:[]}
courses=['古代文学','现当代文学','外国文学','文学理论','现代汉语']
allOld={t['id']:t for t in old.get('legacyTasks',[])+old['approved']['tasks']}
activeOld={t['id']:t for t in old['approved']['tasks']}
byTitle={}
for t in allOld.values():
    if t.get('phase')!='writing' and not t.get('reviewProposal'):byTitle[(t['course'],t['title'],t['type'])]=t
prepared=[]
for i,r in enumerate(catalog):
    prior=activeOld.get(r['id']) or byTitle.get((r['course'],r['title'],r['type'])) or {}
    sid=prior.get('sourceId','catalog:'+r['id'])
    t={**prior,**r,'id':prior.get('id','v5:'+r['id']),'sourceId':sid,'type':r['type'],'displayType':r['type'],
       'reviewQuestionType':(prior.get('originalType') or r['originalType']) if r['type']=='复习' else None,
       'phase':'confirmed-review' if r['type']=='复习' else 'first','knownReview':r['type']=='复习',
       'reviewProposal':False,'revision':REV,'order':i,'scopeVersion':prior.get('scopeVersion',1),
       'book':r['source'],'chapter':r['section'],'detail':r['scope'],'hideEstimate':True,
       'unit':prior.get('unit',sid),'requiredTaskIds':[],'reviewRefs':[]}
    for k in ['candidate','history','practiceLane','choiceSlot','dailyHabit']:t.pop(k,None)
    t['evidence']=[e if isinstance(e,dict) else {'id':e} for e in r.get('evidence',[])]
    prepared.append(t)

# Keep southern/northern folk songs as a distinct basic outline, not an extra essay.
for t in prepared:
    if t['title']=='宫体诗、庾信与南北朝民歌':
        t['title']='宫体诗与庾信';t['scope']=t['detail']='按底本掌握宫体诗的特点、庾信创作变化及代表作，不新增长篇论述。'
folk=next(t for t in prepared if t['title']=='宫体诗与庾信')
prepared.append({**folk,'id':'v5:ancient-folk-outline','sourceId':'ancient-folk-outline','unit':'ancient-folk-outline','title':'南北朝民歌','rank':3.76,'scope':'次重点基础梳理：南北差异、形成原因和代表作品。依据用户确认，不另加长篇论述精背；底本“考过三次”不能认定为浙师大频次。','detail':'掌握南北差异、形成原因和代表作品，不另加长篇论述精背。','order':folk['order']+.1})

# Each block respects 2–3 short answers, one long + one short, or two long.
# Analysis exercises count as substantive tasks; outlines and basics are capped too.
def major(t):return 'L' if t['type']=='论述题' else 'S' if t['type'] in ['简答题','分析题','评论题'] else None
def can_add(block,t):
    kinds=[major(x) for x in block];L=kinds.count('L');S=kinds.count('S');k=major(t)
    if k=='L':return (L==0 and S<=1) or (L==1 and S==0)
    if k=='S':return (L==0 and S<3) or (L==1 and S==0)
    if t['type']=='课本梳理':return sum(x['type']=='课本梳理' for x in block)<2 and len([x for x in block if not major(x)])<4
    return len([x for x in block if not major(x)])<4

blocksByCourse={};tasks=[];courseBlocks={}
for c in courses:
    new=sorted((t for t in prepared if t['course']==c and t['type']!='复习'),key=lambda t:(t['rank'],t['order']))
    # Preserve the reviewed present-day start; Ding Ling is the next makeup block.
    firstNames={'古代文学':['正始、太康至元嘉：诗歌发展线索','陶渊明诗歌的艺术特色'],
      '现当代文学':['30年代小说的左翼、京派与海派','社会剖析小说','吴荪甫出自的作品','《子夜》的艺术成就'],
      '文学理论':['文学的审美意识形态属性','话语蕴藉','话语的五个要素'],
      '现代汉语':['音位与音位变体','象形、指事及其区别','汉字字体演变与会意、形声']}.get(c,[])
    front=[t for title in firstNames for t in new if t['title']==title]
    # Earlier ancient gaps are accompanying items, not a restart from pre-Qin.
    side=[t for t in new if c=='古代文学' and t['rank']<3]
    queue=[t for t in new if t not in front and t not in side]
    blocks=[];block=front[:]
    for t in queue:
        if block and not can_add(block,t):blocks.append(block);block=[]
        block.append(t)
    if block:blocks.append(block)
    for t in side:
        eligible=[b for b in blocks[1:] if can_add(b,t)]
        target=eligible[0] if eligible else None
        if target is None:blocks.append([t])
        else:target.append(t)
    courseBlocks[c]=blocks

# Two main subjects per day, with frequency proportional to remaining work.
# This avoids assigning three small curricula empty slots while modern literature
# continues into January. No Sunday new-learning block is added.
total=sum(len(v) for v in courseBlocks.values());used=collections.Counter();last={c:-7 for c in courses};rotationByDate={}
date=start;studyDay=0
while any(used[c]<len(courseBlocks[c]) for c in courses):
    day=date.isoformat()
    if date.weekday()==6:rotationByDate[day]=[];date+=dt.timedelta(days=1);continue
    available=[c for c in courses if used[c]<len(courseBlocks[c])]
    fixed={0:['古代文学','现代汉语'],1:['外国文学','文学理论'],2:['现当代文学','现代汉语']}.get(studyDay)
    chosen=fixed if fixed else sorted(available,key=lambda c:((studyDay+1)*2*len(courseBlocks[c])/total-used[c]+max(0,studyDay-last[c]-4)*2),reverse=True)[:2]
    rotationByDate[day]=chosen
    for c in chosen:
        block=courseBlocks[c][used[c]];used[c]+=1;last[c]=studyDay
        for t in block:t.update(date=day,plannedDate=day,blockId=c+':'+day);tasks.append(t)
        blocksByCourse.setdefault(c,[]).append({'date':day,'types':dict(collections.Counter(t['type'] for t in block)),'ids':[t['id'] for t in block]})
    studyDay+=1;date+=dt.timedelta(days=1)

# Explicit prerequisite links for synthesis, including Ding Ling's corrected status.
def require(title,prereqs):
    target=next((t for t in tasks if t['title']==title),None)
    if target:target['requiredTaskIds']=[t['id'] for name in prereqs for t in tasks if t['title']==name]
ding=['《莎菲女士的日记》的女性形象与心理书写','《水》等作品与丁玲走向革命的创作阶段','《太阳照在桑干河上》的农村书写']
for title in ['丁玲的创作阶段与转变','丁玲小说贯穿各阶段的艺术特点']:require(title,ding)
require('巴金前后期创作的变化',['《家》的思想内容、人物与艺术特点','《寒夜》的悲剧意蕴与艺术特色'])
require('《雷雨》与《日出》的结构比较',['《雷雨》的戏剧冲突、人物与结构','《日出》的社会批判与结构特点'])
require('余华的创作转变',['以一部小说说明余华小说的先锋特质','福贵形象与《活着》的生命哲学'])
require('《红楼梦》对《金瓶梅》小说艺术的继承与发展',['《金瓶梅》的世情描写与小说艺术','《红楼梦》人物塑造与艺术创新'])
require('文学典型、意境与审美意象的区别',['文学典型','意境','审美意象'])

# Known recall is visible and capped by the runtime, with a second pass after a week.
known=sorted((t for t in prepared if t['type']=='复习'),key=lambda t:(t['rank'],t['order']))
for i,t in enumerate(known):
    date=start+dt.timedelta(days=i//4)
    if t['title'] in ['建安七子','建安风骨','三曹的贡献']:date=start
    t.update(date=date.isoformat(),plannedDate=date.isoformat(),blockId=t['course']+':known')
    tasks.append(t)
    second=(date+dt.timedelta(days=7)).isoformat()
    tasks.append({**t,'id':t['id']+':recall-second','date':second,'plannedDate':second,'order':t['order']+.01})

# Public-course IDs and real-progress lanes are unchanged.
public=[dict(t) for t in old['approved']['tasks'] if t['course'] in ['政治','英语']]
for t in public:
    t['revision']=REV
    if t['type']=='复习':t['reviewQuestionType']='单词识记' if t['course']=='英语' else '背诵'
tasks+=public
tasks=list({t['id']:t for t in tasks}.values())
dates=set(t['plannedDate'] for t in tasks)
date=start
while date<=end:dates.add(date.isoformat());date+=dt.timedelta(days=1)
days=[]
for date in sorted(dates):
    d=dt.date.fromisoformat(date)
    days.append({'date':date,'weekday':(d.weekday()+1)%7,'sunday':d.weekday()==6,'mainSubjects':rotationByDate.get(date,rotation[d.weekday()]),
      'tasks':sorted([t for t in tasks if t['plannedDate']==date],key=lambda t:(t['type']!='复习',t['order']))})
chapters=[{'id':t['unit'],'course':t['course'],'title':t['title'],'book':t.get('book',''),'chapter':t.get('chapter',''),'date':t['date'],'questions':[]} for t in tasks if t['type']!='复习']
old['legacyTasks']=list(allOld.values())
old['revision']=REV;old['approvedRevision']='20261118-v2';old['start']=start.isoformat();old['end']=end.isoformat();old['days']=days
old['approved'].update(revision=REV,tasks=tasks,chapters=chapters)
old['questionCombinations']=blocksByCourse
old['rotationByDate']=rotationByDate
old['reviewIntervals']=[1,7]
old['summary']['progress']=reviewed['progress']
old['summary']['combinationRule']='每门主科2—3道简答，或1道论述＋1道简答，或2道论述；梳理与基础题另设上限，复习优先。'
old['summary']['afterDeadline']=[{'course':c,'blocks':sum(b['date']>end.isoformat() for b in bs),'lastDate':bs[-1]['date']} for c,bs in blocksByCourse.items()]
activeTitles={(t['course'],t['title']) for t in tasks}
old['candidates']=[t for t in old['candidates'] if (t['course'],t['title']) not in activeTitles]
old['coverage']=[{'id':t['sourceId'],'course':t['course'],'type':t['type'],'title':t['title'],'book':t.get('book',''),'chapter':t.get('chapter',''),'evidence':t.get('evidence',[]),'first':t['plannedDate'] if t['phase']=='first' else None,'depth':t['scope']} for t in tasks]
(P/'data.json').write_text(json.dumps(old,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'tasks':len(tasks),'deadline':old['summary']['afterDeadline']},ensure_ascii=False,indent=2))
