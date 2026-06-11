import sys
sys.path.insert(0, 'p6e_discriminator_export_work/AMP_discriminator_readonly_copy/Discriminator_model')

from features import geneFeature
import pandas as pd

temp_df = pd.DataFrame({'ID': ['SEQ_0001'], 'Sequence': ['ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWY']})

# Test type8raac7glmd3lambda-correlation
df = geneFeature(temp_df, 'type8raac7glmd3lambda-correlation')
print(f"type8raac7glmd3 shape: {df.shape}")
print(f"Sample cols: {df.columns.tolist()[:10]}")
print(f"Cols with '.1': {[c for c in df.columns if '.1' in str(c)]}")

# Also check type8raac9glmd3
df2 = geneFeature(temp_df, 'type8raac9glmd3lambda-correlation')
print(f"\ntype8raac9glmd3 shape: {df2.shape}")
print(f"Sample cols: {df2.columns.tolist()[:10]}")

# Check training T8 names with .1
import json
with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
    schema = json.load(f)
t8_train = [c for c in schema['feature_columns'] if c.startswith('T8') and '.1' in c]
print(f"\nTraining T8 cols with '.1': {len(t8_train)}")
print(f"Sample: {t8_train[:10]}")
