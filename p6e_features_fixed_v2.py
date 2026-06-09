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
    
    Exact order from training data:
    1. type8raac9glmd3lambda-correlation (80 cols)
    2. type8raac7glmd3lambda-correlation with .1 suffix (48 cols)
    3. QSOrder_lmd4 base (47 cols)
    4. QSOrder_lmd4 .1 (47 cols)
    5. QSOrder_lmd4 .2 (47 cols)
    6. QSOrder_lmd4 .3 (47 cols)
    7. QSOrder_lmd4 .4 (47 cols)
    8. type5raac15glmd4lambda-correlation (224 cols)
    9. type7raac10glmd3lambda-correlation (99 cols)
    10. type5raac8glmd2lambda-correlation (63 cols)
    11. type3Braac9glmd3lambda-correlation (80 cols)
    12. type2raac15glmd4lambda-correlation (224 cols)
    13. type2raac8glmd2lambda-correlation (63 cols)
    14. type8raac14glmd1lambda-correlation (195 cols)
    """
    test_df = pd.read_csv(path)
    seq_df = test_df[['Sequence']].reset_index(drop=True)
    
    features_list = []
    
    # 1. type8raac9glmd3lambda-correlation (80 cols)
    ft_df = geneFeature(test_df, 'type8raac9glmd3lambda-correlation')
    ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
    features_list.append(ft_df)
    
    # 2. type8raac7glmd3lambda-correlation with .1 suffix (48 cols)
    ft_df = geneFeature(test_df, 'type8raac7glmd3lambda-correlation')
    ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
    ft_df.columns = [f"{c}.1" for c in ft_df.columns]
    features_list.append(ft_df)
    
    # 3-7. QSOrder_lmd4 with suffixes (47 cols each)
    qsorder_suffixes = ['', '.1', '.2', '.3', '.4']
    for suffix in qsorder_suffixes:
        ft_df = geneFeature(test_df, 'QSOrder_lmd4')
        ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
        if suffix:
            ft_df.columns = [f"{c}{suffix}" for c in ft_df.columns]
        features_list.append(ft_df)
    
    # 8. type5raac15glmd4lambda-correlation (224 cols)
    ft_df = geneFeature(test_df, 'type5raac15glmd4lambda-correlation')
    ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
    features_list.append(ft_df)
    
    # 9. type7raac10glmd3lambda-correlation (99 cols)
    ft_df = geneFeature(test_df, 'type7raac10glmd3lambda-correlation')
    ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
    features_list.append(ft_df)
    
    # 10. type5raac8glmd2lambda-correlation (63 cols)
    ft_df = geneFeature(test_df, 'type5raac8glmd2lambda-correlation')
    ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
    features_list.append(ft_df)
    
    # 11. type3Braac9glmd3lambda-correlation (80 cols)
    ft_df = geneFeature(test_df, 'type3Braac9glmd3lambda-correlation')
    ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
    features_list.append(ft_df)
    
    # 12. type2raac15glmd4lambda-correlation (224 cols)
    ft_df = geneFeature(test_df, 'type2raac15glmd4lambda-correlation')
    ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
    features_list.append(ft_df)
    
    # 13. type2raac8glmd2lambda-correlation (63 cols)
    ft_df = geneFeature(test_df, 'type2raac8glmd2lambda-correlation')
    ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
    features_list.append(ft_df)
    
    # 14. type8raac14glmd1lambda-correlation (195 cols)
    ft_df = geneFeature(test_df, 'type8raac14glmd1lambda-correlation')
    ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
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
    for i, (tc, fc) in enumerate(zip(train_cols, fresh_features)):
        if tc != fc:
            print(f"First mismatch at index {i}: train='{tc}' fresh='{fc}'")
            break

import numpy as np
print(f"NaN count: {fresh_df[fresh_features].isnull().sum().sum()}")
