from pathlib import Path
import hashlib, re, zipfile

root = Path(__file__).resolve().parent.parent
with zipfile.ZipFile(root / 'site.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as out:
    for source in sorted((root / 'dist').rglob('*')):
        if source.is_file():
            out.write(source, source.relative_to(root / 'dist').as_posix())
checksum = hashlib.sha256((root / 'site.zip').read_bytes()).hexdigest()
build = root / 'build.py'
text = build.read_text('utf-8')
text, count = re.subn(r'EXPECTED="[0-9a-f]{64}"', f'EXPECTED="{checksum}"', text)
assert count == 1
build.write_text(text, 'utf-8')
print('Packaged textbook reorder; checksum recorded.')
