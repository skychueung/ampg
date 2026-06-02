"""
P6E Exact Feature Extraction Module
Matches the exact training schema from top14Featured_all.csv
"""
import sys
import os

# Add the AMP_discriminator model path
_DEFAULT_DISCRIMINATOR_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    'AMP_discriminator_readonly_copy', 'Discriminator_model'
)

# Allow override via environment variable
_DISCRIMINATOR_PATH = os.environ.get('AMP_DISCRIMINATOR_PATH', _DEFAULT_DISCRIMINATOR_PATH)
if _DISCRIMINATOR_PATH not in sys.path:
    sys.path.insert(0, _DISCRIMINATOR_PATH)

from features import geneFeature
from tqdm import tqdm
import pandas as pd
import numpy as np


def get_pre_features_exact(path):
    """
    Extract features exactly matching the top14Featured_all.csv training schema.

    Exact column order (1311 features total):
    1. type8raac9glmd3lambda-correlation      (80 cols)
    2. type8raac7glmd3lambda-correlation .1   (48 cols)
    3. QSOrder_lmd4 base                      (47 cols)
    4. QSOrder_lmd4 .1                        (47 cols)
    5. QSOrder_lmd4 .2                        (47 cols)
    6. QSOrder_lmd4 .3                        (47 cols)
    7. QSOrder_lmd4 .4                        (47 cols)
    8. type5raac15glmd4lambda-correlation     (224 cols)
    9. type7raac10glmd3lambda-correlation     (99 cols)
    10. type5raac8glmd2lambda-correlation     (63 cols)
    11. type3Braac9glmd3lambda-correlation    (80 cols)
    12. type2raac15glmd4lambda-correlation    (224 cols)
    13. type2raac8glmd2lambda-correlation     (63 cols)
    14. type8raac14glmd1lambda-correlation    (195 cols)

    Parameters:
        path: Path to CSV with 'ID' and 'Sequence' columns.

    Returns:
        DataFrame with 'Sequence' + 1311 feature columns, 20 rows.
    """
    test_df = pd.read_csv(path)
    seq_df = test_df[['Sequence']].reset_index(drop=True)

    features_list = []

    # Helper to extract and apply the iloc[:,1:] "bug" consistently
    def extract(ft_name, suffix=''):
        ft_df = geneFeature(test_df, ft_name)
        ft_df = ft_df.iloc[:, 1:].reset_index(drop=True)
        if suffix:
            ft_df.columns = [f"{c}{suffix}" for c in ft_df.columns]
        return ft_df

    # 1. type8raac9glmd3lambda-correlation (80 cols)
    features_list.append(extract('type8raac9glmd3lambda-correlation'))

    # 2. type8raac7glmd3lambda-correlation with .1 suffix (48 cols)
    features_list.append(extract('type8raac7glmd3lambda-correlation', suffix='.1'))

    # 3-7. QSOrder_lmd4 with suffixes (47 cols each)
    for suffix in ['', '.1', '.2', '.3', '.4']:
        features_list.append(extract('QSOrder_lmd4', suffix=suffix))

    # 8. type5raac15glmd4lambda-correlation (224 cols)
    features_list.append(extract('type5raac15glmd4lambda-correlation'))

    # 9. type7raac10glmd3lambda-correlation (99 cols)
    features_list.append(extract('type7raac10glmd3lambda-correlation'))

    # 10. type5raac8glmd2lambda-correlation (63 cols)
    features_list.append(extract('type5raac8glmd2lambda-correlation'))

    # 11. type3Braac9glmd3lambda-correlation (80 cols)
    features_list.append(extract('type3Braac9glmd3lambda-correlation'))

    # 12. type2raac15glmd4lambda-correlation (224 cols)
    features_list.append(extract('type2raac15glmd4lambda-correlation'))

    # 13. type2raac8glmd2lambda-correlation (63 cols)
    features_list.append(extract('type2raac8glmd2lambda-correlation'))

    # 14. type8raac14glmd1lambda-correlation (195 cols)
    features_list.append(extract('type8raac14glmd1lambda-correlation'))

    df = pd.concat(features_list, axis=1)
    df_all = pd.concat([seq_df, df], axis=1)
    return df_all


if __name__ == '__main__':
    import json

    # Self-test against training schema
    train_df = pd.read_csv('/home/xh/kxc/ampgenkxc/AMPGen/data/Discriminator_training_data/top14Featured_all.csv')
    seqs = train_df['Sequence'].tolist()[:20]

    temp_df = pd.DataFrame({'ID': [f'SEQ_{i:04d}' for i in range(len(seqs))], 'Sequence': seqs})
    temp_path = '/tmp/test_exact_features.csv'
    temp_df.to_csv(temp_path, index=False)

    fresh_df = get_pre_features_exact(temp_path)
    fresh_features = [c for c in fresh_df.columns if c not in ['ID', 'Sequence']]

    with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
        schema = json.load(f)
    train_cols = schema['feature_columns']

    assert len(fresh_features) == 1311, f"Expected 1311 features, got {len(fresh_features)}"
    assert list(train_cols) == fresh_features, "Column order mismatch!"
    assert fresh_df[fresh_features].isnull().sum().sum() == 0, "NaN values found!"
    print("✅ Exact feature extraction validated: 1311 columns, order match, no NaN")
