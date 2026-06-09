import sys
sys.path.insert(0, 'p6e_discriminator_export_work/AMP_discriminator_readonly_copy/Discriminator_model')

from features import geneFeature
from tqdm import tqdm
import pandas as pd
import numpy as np
import json

# Load 20 training sequences
train_df = pd.read_csv('/home/xh/kxc/ampgenkxc/AMPGen/data/Discriminator_training_data/top14Featured_all.csv')
seqs = train_df['Sequence'].tolist()[:20]

# Create temp input with correct format
temp_df = pd.DataFrame({'ID': [f'SEQ_{i:04d}' for i in range(len(seqs))], 'Sequence': seqs})
temp_path = '/tmp/test_full_fix_input.csv'
temp_df.to_csv(temp_path, index=False)

# Modified get_pre_features with QSOrder fix
def get_pre_features_fixed(path):
    test_df = pd.read_csv(path)
    seq_df = test_df.iloc[:,1:2]
    
    # PseKRAAC types (same as current)
    praac_types = ['type8raac9glmd3lambda-correlation', 'type8raac7glmd3lambda-correlation',
                   'type5raac15glmd4lambda-correlation', 'type7raac10glmd3lambda-correlation',
                   'type5raac8glmd2lambda-correlation', 'type3Braac9glmd3lambda-correlation',
                   'type2raac15glmd4lambda-correlation', 'type2raac8glmd2lambda-correlation',
                   'type8raac14glmd1lambda-correlation']
    
    features_list = []
    
    # Extract PseKRAAC features (with bug)
    for ft_whole_name in tqdm(praac_types, desc='PseKRAAC'):
        test_feature_df = geneFeature(test_df, ft_whole_name)
        test_feature_df = test_feature_df.iloc[:,1:]
        features_list.append(test_feature_df)
    
    # Extract QSOrder features (all nlag=4, with bug, renamed)
    qsorder_suffixes = ['', '.1', '.2', '.3', '.4']
    for suffix in tqdm(qsorder_suffixes, desc='QSOrder'):
        test_feature_df = geneFeature(test_df, 'QSOrder_lmd4')
        test_feature_df = test_feature_df.iloc[:,1:]
        # Rename columns to add suffix
        if suffix:
            test_feature_df.columns = [f"{c}{suffix}" for c in test_feature_df.columns]
        features_list.append(test_feature_df)
    
    df = pd.concat(features_list, axis=1)
    df_all = pd.concat([seq_df, df], axis=1)
    return df_all

# Extract features
fresh_df = get_pre_features_fixed(temp_path)
print(f"Fresh shape: {fresh_df.shape}")

# Load training schema
with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
    schema = json.load(f)
train_cols = schema['feature_columns']

# Compare
fresh_features = [c for c in fresh_df.columns if c not in ['ID', 'Sequence']]
print(f"Fresh feature columns: {len(fresh_features)}")
print(f"Training feature columns: {len(train_cols)}")

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

# Check order
order_match = list(train_cols) == fresh_features
print(f"Order match: {order_match}")

# Check NaN/inf
print(f"NaN count: {fresh_df[fresh_features].isnull().sum().sum()}")
print(f"Inf count: {np.isinf(fresh_df[fresh_features].values).sum()}")
