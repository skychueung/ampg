import json

with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
    schema = json.load(f)

t8_cols = [c for c in schema['feature_columns'] if c.startswith('T8')]

# Count columns ending with .1, .2, .3, .4 (suffixes)
suffix_counts = {'.1': 0, '.2': 0, '.3': 0, '.4': 0}
base_cols = []

for c in t8_cols:
    found_suffix = False
    for suffix in ['.1', '.2', '.3', '.4']:
        if c.endswith(suffix):
            suffix_counts[suffix] += 1
            found_suffix = True
            break
    if not found_suffix:
        base_cols.append(c)

print(f"T8 columns ending with .1: {suffix_counts['.1']}")
print(f"T8 columns ending with .2: {suffix_counts['.2']}")
print(f"T8 columns ending with .3: {suffix_counts['.3']}")
print(f"T8 columns ending with .4: {suffix_counts['.4']}")
print(f"T8 base columns (no suffix): {len(base_cols)}")
print(f"Total T8: {len(t8_cols)}")

# Check base + .1 + .2 + .3 + .4 pattern
bases_with_suffixes = {}
for c in t8_cols:
    found_suffix = False
    for suffix in ['.1', '.2', '.3', '.4']:
        if c.endswith(suffix):
            base = c[:-2]
            bases_with_suffixes[base] = bases_with_suffixes.get(base, 0) + 1
            found_suffix = True
            break
    if not found_suffix:
        bases_with_suffixes[c] = bases_with_suffixes.get(c, 0) + 1

print(f"\nUnique base names: {len(bases_with_suffixes)}")
from collections import Counter
counts = Counter(bases_with_suffixes.values())
print(f"Variant count distribution: {dict(counts)}")

# Show examples of bases with suffixes
print("\nExamples of bases with .1 suffix:")
for base, count in list(bases_with_suffixes.items())[:20]:
    if count == 2:
        print(f"  {base}")
