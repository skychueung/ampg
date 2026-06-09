"""
Fixed feature extraction that exactly matches the training data schema.
"""
import sys
sys.path.insert(0, 'p6e_discriminator_export_work/AMP_discriminator_readonly_copy/Discriminator_model')

from features import geneFeature
from tqdm import tqdm
import pandas as pd
import json

def get_pre_features_fixed(path):
    """
    Extract features exactly matching the top14Featured_all.csv training schema.
    
    Key fixes:
    1. Reset indices before concat to avoid row duplication
    2. T8: type8raac7glmd3 renamed with .1 suffix (no base)
    3. QSOrder: all 5 variants use nlag=4, renamed with .1-.4 suffixes
    4. Apply iloc[:,1:] bug consistently
    """
    test_df = pd.read_csv(path)
    seq_df = test_df[['Sequence']].reset_index(drop=True)
    
    features_list = []
    
    # PseKRAAC features (with bug)
    praac_configs = [
        ('type8raac9glmd3lambda-correlation', ''),
        ('type8raac14glmd1lambda-correlation', ''),
        ('type5raac15glmd4lambda-correlation', ''),
        ('type7raac10glmd3lambda-correlation', ''),
        ('type5raac8glmd2lambda-correlation', ''),
        ('type3Braac9glmd3lambda-correlation', ''),
        ('type2raac15glmd4lambda-correlation', ''),
        ('type2raac8glmd2lambda-correlation', ''),
        ('type8raac7glmd3lambda-correlation', '.1'),  # Renamed with .1 suffix
    ]
    
    for ft_name, suffix in tqdm(praac_configs, desc='PseKRAAC'):
        ft_df = geneFeature(test_df, ft_name)
        ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
        if suffix:
            ft_df.columns = [f"{c}{suffix}" for c in ft_df.columns]
        features_list.append(ft_df)
    
    # QSOrder features (all nlag=4, with bug, renamed)
    qsorder_suffixes = ['', '.1', '.2', '.3', '.4']
    for suffix in tqdm(qsorder_suffixes, desc='QSOrder'):
        ft_df = geneFeature(test_df, 'QSOrder_lmd4')
        ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
        if suffix:
            ft_df.columns = [f"{c}{suffix}" for c in ft_df.columns]
        features_list.append(ft_df)
    
    df = pd.concat(features_list, axis=1)
    df_all = pd.concat([seq_df, df], axis=1)
    return df_all


# Test
train_df = pd.read_csv('/home/xh/kxc/ampgenkxc/AMPGen/data/Discriminator_training_data/top14Featured_all.csv')
seqs = train_df['Sequence'].tolist()[:20]

temp_df = pd.DataFrame({'ID': [f'SEQ_{i:04d}' for i in range(len(seqs))], 'Sequence': seqs})
temp_path = '/tmp/test_fixed_features.csv'
temp_df.to_csv(temp_path, index=False)

fresh_df = get_pre_features_fixed(temp_path)
print(f"Fresh shape: {fresh_df.shape}")

# Load training schema
with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
    schema = json.load(f)
train_cols = schema['feature_columns']

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

order_match = list(train_cols) == fresh_features
print(f"Order match: {order_match}")

if not order_match:
    # Find first mismatch
    for i, (tc, fc) in enumerate(zip(train_cols, fresh_features)):
        if tc != fc:
            print(f"First mismatch at index {i}: train='{tc}' fresh='{fc}'")
            break

import numpy as np
print(f"NaN count: {fresh_df[fresh_features].isnull().sum().sum()}")
# Check for non-numeric values
print(f"Non-numeric columns: {fresh_df[fresh_features].select_dtypes(exclude=['int64', 'float64']).columns.tolist()}")
