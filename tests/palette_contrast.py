"""Verify designed text/surface pairs for the default palette and every color scheme."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / 'themes/animewp'


def luminance(color):
    values = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
    values = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in values]
    return sum(a*b for a, b in zip(values, (.2126, .7152, .0722)))


def colors(palette):
    return {item['slug']: item['color'] for item in palette}


palettes = {'monochrome': colors(json.loads((THEME / 'inc/design-tokens.json').read_text())['palette'])}
for path in sorted((THEME / 'styles/colors').glob('*.json')):
    palettes[path.stem] = colors(json.loads(path.read_text())['settings']['color']['palette'])
legacy = json.loads((THEME / 'inc/design-tokens.json').read_text())['legacyColors']
PAIRS = [('contrast', 'base'), ('contrast', 'surface'), ('muted', 'base'), ('muted', 'surface'), ('accent', 'base'), ('on-accent', 'accent'), ('on-contrast', 'contrast')]
results = []
for slug, c in palettes.items():
    assert set(c) == set(palettes['monochrome']), (slug, 'must define every color role')
    pairs = [(c, fg, bg) for fg, bg in PAIRS]
    if slug == 'monochrome':
        pairs += [(legacy, 'badge-' + name + '-text', 'badge-' + name) for name in ('info', 'media', 'event', 'music')]
    for source, fg, bg in pairs:
        a, b = sorted((luminance(source[fg]), luminance(source[bg])))
        ratio = (b + .05) / (a + .05)
        assert ratio >= 4.5, (slug, fg, bg, round(ratio, 2))
        results.append({'palette': slug, 'foreground': fg, 'background': bg, 'ratio': round(ratio, 3)})
print(json.dumps({'palettes': list(palettes), 'pairs': len(results), 'minimum': min(x['ratio'] for x in results)}, ensure_ascii=False))
