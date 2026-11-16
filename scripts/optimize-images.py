"""Optimize from an untouched source: python3 scripts/optimize-images.py SOURCE DESTINATION REPORT.json.
Requires Pillow. Existing originals/backups and uploads are excluded.
"""
from pathlib import Path
from PIL import Image, ImageOps
import sys, json, io
source, destination, report = map(Path, sys.argv[1:])
rows=[]
for path in sorted((source/'public/assets').rglob('*')):
    if path.suffix.lower() not in ('.webp','.png','.jpg','.jpeg') or 'backup' in path.parts:
        continue
    relative=path.relative_to(source)
    target=destination/relative
    with Image.open(path) as original:
        image=ImageOps.exif_transpose(original)
        old_size=image.size
        is_map='maps' in relative.parts and (path.name.startswith('plano-') or path.name.startswith('torres-piso-'))
        maximum=4500 if is_map else 1920
        if max(image.size)>maximum:
            image.thumbnail((maximum,maximum),Image.Resampling.LANCZOS)
        buffer=io.BytesIO()
        if path.suffix.lower()=='.webp':
            image.save(buffer,format='WEBP',quality=92 if is_map else 85,method=6,exact=True)
        elif path.suffix.lower() in ('.jpg','.jpeg'):
            image.convert('RGB').save(buffer,format='JPEG',quality=85,optimize=True,progressive=True)
        else:
            image.save(buffer,format='PNG',optimize=True)
        result=buffer.getvalue()
        changed=len(result)<path.stat().st_size
        if changed:
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(result)
        with Image.open(target) as checked:
            checked.load()
            assert checked.size == (image.size if changed else old_size)
            if original.mode=='RGBA':
                assert checked.mode=='RGBA',relative
                assert checked.getchannel('A').tobytes()==(image if changed else original).getchannel('A').tobytes(), relative
        rows.append(dict(file=str(relative),before=path.stat().st_size,after=target.stat().st_size,original_dimensions=old_size,dimensions=checked.size,changed=changed))
report.write_text(json.dumps(rows,indent=2))
print(json.dumps(dict(images=len(rows),changed=sum(r['changed'] for r in rows),before=sum(r['before'] for r in rows),after=sum(r['after'] for r in rows))))
