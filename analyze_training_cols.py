import json

with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
    schema = json.load(f)

cols = schema['feature_columns']

# Count Grantham and Schneider columns
grantham = [c for c in cols if c.startswith('Grantham')]
schneider = [c for c in cols if c.startswith('Schneider')]

print(f'Grantham total: {len(grantham)}')
print(f'Schneider total: {len(schneider)}')

# Analyze patterns
grantham_patterns = {}
for c in grantham:
    parts = c.split('.')
    if len(parts) >= 2:
        key = parts[1]
        grantham_patterns[key] = grantham_patterns.get(key, 0) + 1

schneider_patterns = {}
for c in schneider:
    parts = c.split('.')
    if len(parts) >= 2:
        key = parts[1]
        schneider_patterns[key] = schneider_patterns.get(key, 0) + 1

print(f'Grantham patterns: {grantham_patterns}')
print(f'Schneider patterns: {schneider_patterns}')

# Count unique base names (e.g., Grantham.Xd.1 has 4 variants: .1, .2, .3, .4)
grantham_xd = [c for c in grantham if '.Xd.' in c]
grantham_xr = [c for c in grantham if '.Xr.' in c]
print(f'Grantham Xd: {len(grantham_xd)}, Xr: {len(grantham_xr)}')

schneider_xd = [c for c in schneider if '.Xd.' in c]
schneider_xr = [c for c in schneider if '.Xr.' in c]
print(f'Schneider Xd: {len(schneider_xd)}, Xr: {len(schneider_xr)}')

# Check how many unique base names for Xd
grantham_xd_bases = set()
for c in grantham_xd:
    base = '.'.join(c.split('.')[:3])
    grantham_xd_bases.add(base)
print(f'Grantham Xd unique bases: {len(grantham_xd_bases)}, sample: {list(grantham_xd_bases)[:5]}')

schneider_xd_bases = set()
for c in schneider_xd:
    base = '.'.join(c.split('.')[:3])
    schneider_xd_bases.add(base)
print(f'Schneider Xd unique bases: {len(schneider_xd_bases)}, sample: {list(schneider_xd_bases)[:5]}')

# Show some sample column names
print('Sample Grantham cols:')
for c in grantham[:10]:
    print(f'  {c}')
print('Sample Schneider cols:')
for c in schneider[:10]:
    print(f'  {c}')
