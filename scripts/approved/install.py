from pathlib import Path
import json,shutil,re
ROOT=Path(__file__).resolve().parents[2]
DIST=ROOT/'dist'
SOURCE=Path(__file__).resolve().parent
plan=json.loads((DIST/'plan.json').read_text(encoding='utf8'))
approved=json.loads((SOURCE/'data.json').read_text(encoding='utf8'))
plan['rebalanced']=approved
plan['taskRevision']=approved['revision']
plan['publicPracticeRevision']='public-20261118-three-writing-sessions'
(DIST/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,separators=(',',':')),encoding='utf8')
shutil.copyfile(SOURCE/'engine.js',DIST/'approved-engine.js')
shutil.copyfile(SOURCE/'runtime.js',DIST/'approved-runtime.js')
engine=(DIST/'progress-engine.js').read_text(encoding='utf8')
engine=engine.replace('function build(data,state,today){','function build(data,state,today){\n  if(data.approvedRevision)return (root.ApprovedStudy||(typeof require!=="undefined"?require("./approved-engine.js"):null)).build(data,state,today);',1)
(DIST/'progress-engine.js').write_text(engine,encoding='utf8')
html=(DIST/'index.html').read_text(encoding='utf8')
if 'approved-engine.js' not in html:
    html=html.replace('<script src="progress-engine.js','<script src="approved-engine.js?v=20261118-v1"></script><script src="progress-engine.js')
if 'approved-runtime.js' not in html:
    html=html.replace('<script src="cloud-config.js','<script src="approved-runtime.js?v=20261118-v1"></script><script src="cloud-config.js')
html=re.sub(r'((?:app-v2|progress-engine|progress-ui|task-revision)\.js)\?v=[^"\s]+',r'\1?v=approved-20261118-v1',html)
(DIST/'index.html').write_text(html,encoding='utf8')
tasks=[t for day in approved['days'] for t in day['tasks']]
assert len({t['id'] for t in tasks})==len(tasks)
assert approved['summary']['writing'].startswith('每周3次')
assert len(approved['approved']['questionIndex'])==349
assert approved['choiceQueue'][0]['title'].startswith('第五章')
print('Approved five-course and public-course tasks installed; original user state and source archive untouched.')
