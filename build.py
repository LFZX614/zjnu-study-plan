from pathlib import Path
import hashlib, zipfile
root = Path(__file__).resolve().parent
archive = root / "site.zip"
expected = "86a7312aff2ce6df7e339b73951789446db4bf387da4b107025e50765fb52b38"
if hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
    raise RuntimeError("Site archive checksum mismatch")
output = root / "dist"
output.mkdir(exist_ok=True)
with zipfile.ZipFile(archive) as bundle:
    for entry in bundle.infolist():
        target = (output / entry.filename).resolve()
        if not target.is_relative_to(output.resolve()):
            raise RuntimeError("Invalid archive path")
    bundle.extractall(output)
for required in ["index.html", "app.js", "engine.js", "data.json", "points.json", "styles.css"]:
    if not (output / required).is_file():
        raise RuntimeError("Missing required file: " + required)
print("Study planner six-am-v6 ready: 52 days, static assets verified")
