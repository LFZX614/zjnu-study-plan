from pathlib import Path
import hashlib,zipfile,json,shutil
ROOT=Path(__file__).resolve().parent
archive=ROOT/'site.zip'
EXPECTED="a5ba05ad9cb5030da3885299fc4bc2c6e1b9d1b611895d65c4049ebcc8eb5905"
if hashlib.sha256(archive.read_bytes()).hexdigest()!=EXPECTED:
 raise SystemExit('Site archive checksum mismatch')
out=ROOT/'dist'
out.mkdir(exist_ok=True)
with zipfile.ZipFile(archive) as z:
 for name in z.namelist():
  if not (out/name).resolve().is_relative_to(out.resolve()):
   raise SystemExit('Invalid archive path')
 z.extractall(out)
plan=json.loads((out/'plan.json').read_text(encoding='utf-8'))
assert plan['textbookOrderVersion']==4
assert plan['version']=='clear-full-review-20261106-v4-types1'
assert len(plan['clearPlan']['units'])==206
assert len(plan['clearPlan']['questions'])==349
assert len({e['id'] for q in plan['clearPlan']['questions'] for e in q['evidence']})==389
assert len(plan['days'])>40
for name in ['index.html','app-v2.js','materials/index.html','materials/theory-activity.html','materials/foreign-ancient.html','materials/theory-activity.pdf','materials/foreign-ancient.pdf','legacy/index.html']:
 assert (out/name).is_file(),name
print('study: explicit daily tasks, complete textbook map, evidence and recall ready')
for name in ['config.js','merge.js','cloud.js']:
 shutil.copyfile(ROOT/'sync'/name,out/('cloud-'+name))
index=out/'index.html'
page=index.read_text(encoding='utf-8')
if 'src="cloud-cloud.js' not in page:
 page=page.replace('</body>','<script src="cloud-config.js?v=1"></script><script src="cloud-merge.js?v=1"></script><script src="cloud-cloud.js?v=1"></script></body>')
index.write_text(page,encoding='utf-8')
