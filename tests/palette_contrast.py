"""Verify designed text/surface pairs, not user-authored color combinations."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def luminance(color):
    values = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
    values = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in values]
    return sum(a*b for a,b in zip(values, (.2126,.7152,.0722)))

results = []
for item in [dict(slug='monochrome', **json.loads((ROOT/'themes/animewp/inc/design-tokens.json').read_text()))]:
    c = item['colors']
    pairs = [('contrast','base'),('contrast','surface'),('muted','base'),('muted','surface'),('accent','base'),('on-accent','accent'),('on-contrast','contrast')]
    pairs += [('badge-'+name+'-text','badge-'+name) for name in ('info','media','event','music')]
    for fg,bg in pairs:
        a,b = sorted((luminance(c[fg]),luminance(c[bg])))
        ratio = (b+.05)/(a+.05)
        assert ratio >= 4.5, (item['slug'],fg,bg,ratio)
        results.append({'palette':item['slug'],'foreground':fg,'background':bg,'ratio':round(ratio,3)})
print(json.dumps({'pairs':len(results),'minimum':min(x['ratio'] for x in results),'results':results},ensure_ascii=False,indent=2))
