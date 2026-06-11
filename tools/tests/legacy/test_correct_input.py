import sys
sys.path.insert(0, 'p6e_discriminator_export_work/AMP_discriminator_readonly_copy/Discriminator_model')

from features import get_pre_features
import pandas as pd
import json

# Load 20 training sequences
train_df = pd.read_csv('/home/xh/kxc/ampgenkxc/AMPGen/data/Discriminator_training_data/top14Featured_all.csv')
seqs = train_df['Sequence'].tolist()[:20]

# Create correct input with ID and Sequence
temp_df = pd.DataFrame({'ID': [f'SEQ_{i:04d}' for i in range(len(seqs))], 'Sequence': seqs})
temp_path = '/tmp/test_correct_input.csv'
temp_df.to_csv(temp_path, index=False)

# Extract features using get_pre_features
fresh_df = get_pre_features(temp_path)
print(f"Fresh shape: {fresh_df.shape}")
print(f"Fresh columns: {len(fresh_df.columns)}")

# Load training schema
with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
    schema = json.load(f)
train_cols = schema['feature_columns']

# Compare
fresh_features = [c for c in fresh_df.columns if c not in ['ID', 'Sequence']]
print(f"Fresh feature columns: {len(fresh_features)}")

common = set(train_cols) & set(fresh_features)
missing = set(train_cols) - set(fresh_features)
extra = set(fresh_features) - set(train_cols)

print(f"Common: {len(common)}")
print(f"Missing: {len(missing)}")
print(f"Extra: {len(extra)}")

if missing:
    print(f"First 20 missing: {sorted(list(missing))[:20]}")
if extra:
    print(f"First 20 extra: {sorted(list(extra))[:20]}")

# Check prefixes
prefixes = {}
for c in fresh_features:
    prefix = c.split('.')[0] if '.' in c else c.split('_')[0]
    prefixes[prefix] = prefixes.get(prefix, 0) + 1
print(f"Fresh prefixes: {sorted(prefixes.items(), key=lambda x: -x[1])}")
