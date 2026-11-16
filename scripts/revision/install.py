from pathlib import Path
import json, shutil, re

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / 'dist'
SOURCE = Path(__file__).resolve().parent
plan = json.loads((DIST / 'plan.json').read_text(encoding='utf8'))
approved = json.loads((SOURCE / 'approved-data.json').read_text(encoding='utf8'))
old = plan['rebalanced']
courses = {'古代文学', '现当代文学', '外国文学', '文学理论', '现代汉语'}
public_before = [t for d in old['days'] for t in d['tasks'] if t['course'] in {'政治', '英语'}]
legacy = [{**t, 'plannedDate': d['date']} for d in old['days'] for t in d['tasks'] if t['course'] in courses]
days = {d['date']: {**d, 'tasks': [t for t in d['tasks'] if t['course'] not in courses]} for d in old['days']}
for task in approved['tasks']:
    date = task['date']
    days.setdefault(date, {'date': date, 'tasks': [], 'mainSubjects': [], 'limit': 450})['tasks'].append(task)
for date, day in days.items():
    current = list(dict.fromkeys(t['course'] for t in day['tasks'] if t['course'] in courses))
    day['mainSubjects'] = current
    day['approvedCourses'] = current
    day['sunday'] = __import__('datetime').date.fromisoformat(date).weekday() == 6
plan['rebalanced'] = {**old, 'revision': approved['revision'], 'days': [days[k] for k in sorted(days)], 'legacyTasks': legacy, 'approved': approved, 'end': approved['end']}
plan['taskRevision'] = approved['revision']
(DIST / 'plan.json').write_text(json.dumps(plan, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
shutil.copyfile(SOURCE / 'engine.js', DIST / 'progress-engine.js')
shutil.copyfile(SOURCE / 'runtime.js', DIST / 'task-revision.js')
shutil.copyfile(SOURCE / 'style.css', DIST / 'task-revision.css')
app = (DIST / 'app-v2.js').read_text(encoding='utf8')
app = app.replace("'clearMeta','deletedTasks'", "'clearMeta','deletedTasks','taskEdits','chapterChecks'")
app = app.replace("fetch('plan.json?v=clear4',{cache:'no-store'})", "(document.readyState==='loading'?new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true})):Promise.resolve()).then(()=>fetch('plan.json?v=textbook-20261116-v1',{cache:'no-store'}))")
(DIST / 'app-v2.js').write_text(app, encoding='utf8')
ui = (DIST / 'progress-ui.js').read_text(encoding='utf8')
ui = ui.replace("${t.estimate?", "${t.estimate&&!t.hideEstimate?")
ui = ui.replace("...(day?.mainSubjects||[]),'古代文学'", "...(day?.mainSubjects||[]),...ts.map(t=>t.course),'古代文学'")
ui = ui.replace('新学首遍预排至12月15日', '新学首遍建议窗口至12月12日，13—18日回测；重负担日期仍须按实际完成校准')
(DIST / 'progress-ui.js').write_text(ui, encoding='utf8')
html = (DIST / 'index.html').read_text(encoding='utf8')
html = re.sub(r'(app-v2\.js|progress-engine\.js|progress-ui\.js)\?v=[^"\s]+', r'\1?v=textbook-20261116-v1', html)
if 'task-revision.js' not in html:
    html = html.replace('<script src="cloud-config.js', '<script src="task-revision.js?v=textbook-20261116-v1"></script><script src="cloud-config.js')
if 'task-revision.css' not in html:
    html = html.replace('</head>', '<link rel="stylesheet" href="task-revision.css?v=textbook-20261116-v1"></head>')
(DIST / 'index.html').write_text(html, encoding='utf8')
assert len(approved['chapters']) == 160
assert len({q['id'] for q in approved['questionIndex']}) == 349
assert len({t['id'] for d in days.values() for t in d['tasks']}) == sum(len(d['tasks']) for d in days.values())
assert public_before == [t for k in sorted(days) for t in days[k]['tasks'] if t['course'] in {'政治', '英语'}]
print('Approved textbook tasks installed; legacy records, public courses and question index retained.')
