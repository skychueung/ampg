import sys
sys.path.insert(0, 'p6e_discriminator_export_work/AMP_discriminator_readonly_copy/Discriminator_model')

from features import geneFeatures
import pandas as pd
import numpy as np

# Test with a single sequence
fastas = [('SEQ_0000', 'ACDEFGHIKLMNPQRSTVWY')]

whole_name = ['type8raac9glmd3lambda-correlation', 'type5raac8glmd2g-gap',
              'type2raac12glmd1g-gap', 'type8raac7glmd3lambda-correlation',
              'type8raac14glmd1lambda-correlation', 'type7raac10glmd3g-gap',
              'type5raac8glmd3lambda-correlation', 'type2raac12glmd2lambda-correlation',
              'type5raac8glmd3g-gap', 'type8raac7glmd2g-gap',
              'type2raac12glmd3g-gap', 'type8raac14glmd2g-gap',
              'type8raac7glmd1lambda-correlation', 'type7raac10glmd3lambda-correlation']

print("Testing geneFeatures column counts...")
df = geneFeatures(fastas, whole_name)
print(f"Total columns from geneFeatures: {len(df.columns)}")
print(f"Shape: {df.shape}")
print(f"Duplicate columns: {df.columns.duplicated().sum()}")

# Check if there are any Grantham/Schneider columns
grantham = [c for c in df.columns if 'Grantham' in c]
schneider = [c for c in df.columns if 'Schneider' in c]
print(f"Grantham columns: {len(grantham)}")
print(f"Schneider columns: {len(schneider)}")
if grantham:
    print(f"Sample Grantham: {grantham[:5]}")
if schneider:
    print(f"Sample Schneider: {schneider[:5]}")

# List all column prefixes
prefixes = {}
for c in df.columns:
    if '.' in c:
        prefix = c.split('.')[0]
    else:
        prefix = c.split('_')[0] if '_' in c else c[:3]
    prefixes[prefix] = prefixes.get(prefix, 0) + 1

print(f"All prefixes: {sorted(prefixes.items(), key=lambda x: -x[1])}")
