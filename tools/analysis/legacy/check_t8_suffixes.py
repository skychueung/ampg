import json

with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
    schema = json.load(f)

t8_cols = [c for c in schema['feature_columns'] if c.startswith('T8')]

# Count columns ending with .1, .2, .3, .4
suffixes = {'.1': 0, '.2': 0, '.3': 0, '.4': 0}
base_cols = []

for c in t8_cols:
    if c.endswith('.1'):
        suffixes['.1'] += 1
    elif c.endswith('.2'):
        suffixes['.2'] += 1
    elif c.endswith('.3'):
        suffixes['.3'] += 1
    elif c.endswith('.4'):
        suffixes['.4'] += 1
    else:
        base_cols.append(c)

print(f"T8 columns ending with .1: {suffixes['.1']}")
print(f"T8 columns ending with .2: {suffixes['.2']}")
print(f"T8 columns ending with .3: {suffixes['.3']}")
print(f"T8 columns ending with .4: {suffixes['.4']}")
print(f"T8 base columns (no suffix): {len(base_cols)}")
print(f"Total T8: {len(t8_cols)}")

# Check base + .1 + .2 + .3 + .4 pattern
bases_with_suffixes = {}
for c in t8_cols:
    if c.endswith('.1'):
        base = c[:-2]
        bases_with_suffixes[base] = bases_with_suffixes.get(base, 0) + 1
    elif c.endswith('.2'):
        base = c[:-2]
        bases_with_suffixes[base] = bases_with_suffixes.get(base, 0) + 1
    elif c.endswith('.3'):
        base = c[:-2]
        bases_with_suffixes[base] = bases_with_suffixes.get(base, 0) + 1
    elif c.endswith('.4'):
        base = c[:-2]
        bases_with_suffixes[base] = bases_with_suffixes.get(base, 0) + 1
    else:
        bases_with_suffixes[c] = bases_with_suffixes.get(c, 0) + 1

print(f"\nUnique base names: {len(bases_with_suffixes)}")
print(f"Bases with 1 variant: {sum(1 for v in bases_with_suffixes.values() if v == 1)}")
print(f"Bases with 2 variants: {sum(1 for v in bases_with_suffixes.values() if v == 2)}")
print(f"Bases with 5 variants: {sum(1 for v in bases_with_suffixes.values() if v == 5)}")
print(f"Other variant counts: {set(bases_with_suffixes.values())}")

# Show some examples
print("\nExamples of bases with multiple variants:")
for base, count in list(bases_with_suffixes.items())[:10]:
    if count > 1:
        print(f"  {base}: {count} variants")
