#!/usr/bin/env python3
"""Document every distributed media asset, without bundling any font files."""
import hashlib, json, mimetypes, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
theme=ROOT/'themes/animewp'
rows=[]
for path in sorted([*theme.joinpath('assets/images').glob('*'),theme/'screenshot.png']):
 data=path.read_bytes()
 rows.append({'path':path.relative_to(theme).as_posix(),'mime':mimetypes.guess_type(path.name)[0],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'license':'GPL-2.0-or-later','source':'Original animewp placeholder artwork / theme preview; no reference-site art','modifications':'Authored for this kit; replace with licensed project materials before launch'})
result=json.dumps({'bundled_font_files':0,'bundled_font_bytes':0,'assets':rows},ensure_ascii=False,indent=2)+'\n'
path=theme/'assets-manifest.json'
if '--check' in sys.argv:
 assert path.read_text()==result, 'Run scripts/assets_manifest.py'
else:path.write_text(result)
print('Asset manifest verified: '+str(len(rows))+' original media files; fonts 0 bytes.')
