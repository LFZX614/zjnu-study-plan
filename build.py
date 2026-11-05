from pathlib import Path
import hashlib,zipfile,json
ROOT=Path(__file__).resolve().parent
archive=ROOT/'site.zip'
EXPECTED="2011cb0e5bb688dc3e909ad0d068d413f5cfced078babe31ebe49db5fed01e23"
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
assert plan['textbookOrderVersion']==1
assert len(plan['days'])>40
for name in ['index.html','app-v2.js','materials/index.html','materials/theory-activity.html','materials/foreign-ancient.html','materials/theory-activity.pdf','materials/foreign-ancient.pdf','legacy/index.html']:
 assert (out/name).is_file(),name
print('study: daily plan, two PDFs and interactive quizzes ready')
