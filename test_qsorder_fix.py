import sys
sys.path.insert(0, 'p6e_discriminator_export_work/AMP_discriminator_readonly_copy/Discriminator_model')

from features import geneFeature
import pandas as pd
import json

# Load training data schema
with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
    schema = json.load(f)
train_cols = schema['feature_columns']

# Create test input
temp_df = pd.DataFrame({'ID': ['SEQ_0001'], 'Sequence': ['ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWY']})

# Test QSOrder_lmd4 with bug
df = geneFeature(temp_df, 'QSOrder_lmd4')
print(f"QSOrder_lmd4 shape: {df.shape}")
print(f"QSOrder_lmd4 columns: {df.columns.tolist()}")

# Apply bug
df_bug = df.iloc[:,1:]
print(f"After iloc[:,1:] bug: {df_bug.shape}")
print(f"After bug columns: {df_bug.columns.tolist()}")

# Now rename to add suffixes
suffixes = ['', '.1', '.2', '.3', '.4']
all_renamed = []
for i, suffix in enumerate(suffixes):
    renamed = df_bug.copy()
    renamed.columns = [f"{c}{suffix}" if suffix else c for c in renamed.columns]
    all_renamed.append(renamed)
    print(f"Variant {i} ({suffix}): {renamed.shape[1]} cols")
    print(f"  Sample cols: {renamed.columns.tolist()[:5]}")

combined = pd.concat(all_renamed, axis=1)
print(f"Combined QSOrder features: {combined.shape[1]}")

# Check against training
qs_train = [c for c in train_cols if c.startswith('Grantham') or c.startswith('Schneider')]
qs_fresh = combined.columns.tolist()

common = set(qs_train) & set(qs_fresh)
missing = set(qs_train) - set(qs_fresh)
extra = set(qs_fresh) - set(qs_train)

print(f"Training QS cols: {len(qs_train)}")
print(f"Fresh QS cols: {len(qs_fresh)}")
print(f"Common: {len(common)}")
print(f"Missing: {len(missing)}")
print(f"Extra: {len(extra)}")

if missing:
    print(f"Missing: {sorted(list(missing))[:20]}")
if extra:
    print(f"Extra: {sorted(list(extra))[:20]}")
