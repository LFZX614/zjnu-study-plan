from pathlib import Path
import hashlib,zipfile,json
ROOT=Path(__file__).resolve().parent
archive=ROOT/'site.zip'
EXPECTED="209871b29f6f9199263edfb9c2820be8194f026595663263f54263f6be0266dc"
if hashlib.sha256(archive.read_bytes()).hexdigest()!=EXPECTED:
 raise SystemExit('Site archive checksum mismatch')
out=ROOT/'dist'
out.mkdir(exist_ok=True)
with zipfile.ZipFile(archive) as z:
 for name in z.namelist():
  if not (out/name).resolve().is_relative_to(out.resolve()):
   raise SystemExit('Invalid archive path')
 z.extractall(out)
data=json.loads((out/'data.json').read_text(encoding='utf-8-sig'))
assert data['revision']=='checkin-v7-doc51' and len(data['days'])==51 and len(data['tasks'])==981
# Apply the maintained interaction updates after extracting the unchanged content archive.
for name in ('engine.js', 'app.js', 'index.html'):
 (out/name).write_bytes((ROOT/'updates'/name).read_bytes())
print('Built 51-day check-in site:',len(data['tasks']),'tasks')
