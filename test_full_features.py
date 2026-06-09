import sys
sys.path.insert(0, 'p6e_discriminator_export_work/AMP_discriminator_readonly_copy/Discriminator_model')

import pandas as pd
import numpy as np
from features import geneFeature

# Load training data sequences
train_df = pd.read_csv('/home/xh/kxc/ampgenkxc/AMPGen/data/Discriminator_training_data/top14Featured_all.csv')
seqs = train_df['Sequence'].tolist()[:20]  # Use first 20 sequences

# Check minimum length
min_len = min(len(s) for s in seqs)
print(f"Min sequence length: {min_len}")

# Create temp input
temp_df = pd.DataFrame({'ID': [f'SEQ_{i:04d}' for i in range(len(seqs))], 'Sequence': seqs})
temp_df.to_csv('/tmp/test_input.csv', index=False)

# Now test get_pre_features without the iloc[:,1:] bug
whole_name = ['type8raac9glmd3lambda-correlation', 'type8raac7glmd3lambda-correlation', 'QSOrder_lmd4', 'QSOrder_lmd3', 'QSOrder_lmd2',
'QSOrder_lmd1', 'QSOrder_lmd0', 'type5raac15glmd4lambda-correlation', 'type7raac10glmd3lambda-correlation',
'type5raac8glmd2lambda-correlation', 'type3Braac9glmd3lambda-correlation', 'type2raac15glmd4lambda-correlation',
'type2raac8glmd2lambda-correlation', 'type8raac14glmd1lambda-correlation']

features_list = []
for ft_whole_name in whole_name:
    try:
        test_feature_df = geneFeature(temp_df, ft_whole_name)
        print(f"{ft_whole_name}: shape={test_feature_df.shape}, cols={test_feature_df.shape[1]}")
        # Do NOT drop first column
        features_list.append(test_feature_df)
    except Exception as e:
        print(f"{ft_whole_name}: ERROR - {e}")

# But wait, geneFeature returns DataFrame with index=seq_id, columns=feature_names
# We need to drop the seq_id column if it exists as a regular column
all_features = []
for ft_df in features_list:
    # The seq_id is the index, not a column
    # But geneFeature returns a DataFrame where the first column might be the index
    # Actually, looking at GeneIfeature:
    # df.index = df.iloc[:, 0]  -- sets index to first column
    # df.columns = df.iloc[0]   -- sets columns to first row
    # df.drop(["#"], axis=1, inplace=True)  -- drops '#' column
    # df.drop(["#"], axis=0, inplace=True)  -- drops '#' row
    # So the returned df has NO '#' column and index is seq IDs
    all_features.append(ft_df)

df = pd.concat(all_features, axis=1)
print(f"\nTotal features (no drop): {df.shape[1]}")

# Now test WITH the iloc[:,1:] bug
features_list_bug = []
for ft_whole_name in whole_name:
    try:
        test_feature_df = geneFeature(temp_df, ft_whole_name)
        test_feature_df = test_feature_df.iloc[:,1:]  # BUG: drops first feature column
        features_list_bug.append(test_feature_df)
    except Exception as e:
        print(f"{ft_whole_name}: ERROR - {e}")

df_bug = pd.concat(features_list_bug, axis=1)
print(f"Total features (with bug): {df_bug.shape[1]}")

# Check prefixes
prefixes = {}
for c in df.columns:
    prefix = c.split('.')[0] if '.' in c else c.split('_')[0]
    prefixes[prefix] = prefixes.get(prefix, 0) + 1
print(f"Prefixes (no drop): {sorted(prefixes.items(), key=lambda x: -x[1])}")
