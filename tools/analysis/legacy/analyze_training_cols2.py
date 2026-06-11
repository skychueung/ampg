import json

with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
    schema = json.load(f)

cols = schema['feature_columns']

grantham = [c for c in cols if c.startswith('Grantham')]
schneider = [c for c in cols if c.startswith('Schneider')]

print('All Grantham Xr cols (first 30):')
for c in [x for x in grantham if '.Xr.' in x][:30]:
    print(f'  {c}')

print()
print('All Grantham Xd cols:')
for c in [x for x in grantham if '.Xd.' in x]:
    print(f'  {c}')

print()
print('All Schneider Xr cols (first 30):')
for c in [x for x in schneider if '.Xr.' in x][:30]:
    print(f'  {c}')

print()
print('All Schneider Xd cols:')
for c in [x for x in schneider if '.Xd.' in x]:
    print(f'  {c}')

# Check if there are suffixes like .1, .2, etc.
import re
grantham_xr_suffixes = set()
for c in [x for x in grantham if '.Xr.' in x]:
    m = re.match(r'Grantham\.Xr\.\w+\.(\d+)', c)
    if m:
        grantham_xr_suffixes.add(m.group(1))
    else:
        grantham_xr_suffixes.add('NO_SUFFIX')

print(f'Grantham Xr suffixes: {sorted(grantham_xr_suffixes)}')

schneider_xr_suffixes = set()
for c in [x for x in schneider if '.Xr.' in x]:
    m = re.match(r'Schneider\.Xr\.\w+\.(\d+)', c)
    if m:
        schneider_xr_suffixes.add(m.group(1))
    else:
        schneider_xr_suffixes.add('NO_SUFFIX')

print(f'Schneider Xr suffixes: {sorted(schneider_xr_suffixes)}')
