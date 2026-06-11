import json

with open('reports/p6e/p6e_training_feature_schema_20260602.json') as f:
    schema = json.load(f)

train_cols = schema['feature_columns']

# Analyze column order by prefix
from collections import OrderedDict

blocks = []
current_prefix = None
current_start = 0

for i, c in enumerate(train_cols):
    # Determine prefix
    if c.startswith('T8'):
        # Extract more specific pattern
        parts = c.split('.')
        if len(parts) >= 4:
            # T8.G.X_T8.G.Y_LCN or T8.G.X_T8.G.Y_LCN.1
            prefix = f"T8_{parts[1]}_{parts[3]}"
            # Also check LC value
            if '_LC' in c:
                lc = c.split('_LC')[1].split('.')[0]
                prefix = f"T8_LC{lc}"
        else:
            prefix = 'T8'
    elif c.startswith('T5'):
        prefix = 'T5'
    elif c.startswith('T2'):
        prefix = 'T2'
    elif c.startswith('T7'):
        prefix = 'T7'
    elif c.startswith('3B'):
        prefix = '3B'
    elif c.startswith('Grantham'):
        prefix = 'Grantham'
    elif c.startswith('Schneider'):
        prefix = 'Schneider'
    else:
        prefix = 'OTHER'
    
    if current_prefix is None:
        current_prefix = prefix
        current_start = i
    elif prefix != current_prefix:
        blocks.append((current_prefix, current_start, i-1, i - current_start))
        current_prefix = prefix
        current_start = i

# Add last block
blocks.append((current_prefix, current_start, len(train_cols)-1, len(train_cols) - current_start))

print("Column blocks in training data:")
for prefix, start, end, count in blocks:
    print(f"  {prefix}: indices {start}-{end} (count={count})")
    print(f"    First: {train_cols[start]}")
    print(f"    Last: {train_cols[end]}")

# More detailed: identify feature types by column name patterns
print("\n\nDetailed feature type analysis:")

# Check for type8raac9glmd3 (LC3 with G.1-G.9)
type8_9 = [c for c in train_cols if c.startswith('T8') and '_LC3' in c and not c.endswith('.1')]
print(f"type8raac9glmd3lambda-correlation cols: {len(type8_9)}")
print(f"  Sample: {type8_9[:3]}")

# Check for type8raac7glmd3 (LC3 with G.1-G.7)
type8_7 = [c for c in train_cols if c.startswith('T8') and '_LC3' in c and c.endswith('.1')]
print(f"type8raac7glmd3lambda-correlation (.1) cols: {len(type8_7)}")
print(f"  Sample: {type8_7[:3]}")

# Check for type8raac14glmd1 (LC1 with G.1-G.14)
type8_14 = [c for c in train_cols if c.startswith('T8') and '_LC1' in c and not c.endswith('.1')]
print(f"type8raac14glmd1lambda-correlation cols: {len(type8_14)}")
print(f"  Sample: {type8_14[:3]}")

# Check T5
t5_15 = [c for c in train_cols if c.startswith('T5') and '_LC4' in c]
print(f"type5raac15glmd4lambda-correlation cols: {len(t5_15)}")

t5_8 = [c for c in train_cols if c.startswith('T5') and '_LC2' in c]
print(f"type5raac8glmd2lambda-correlation cols: {len(t5_8)}")

# Check T2
t2_15 = [c for c in train_cols if c.startswith('T2') and '_LC4' in c]
print(f"type2raac15glmd4lambda-correlation cols: {len(t2_15)}")

t2_8 = [c for c in train_cols if c.startswith('T2') and '_LC2' in c]
print(f"type2raac8glmd2lambda-correlation cols: {len(t2_8)}")

# Check T7
t7_10 = [c for c in train_cols if c.startswith('T7') and '_LC3' in c]
print(f"type7raac10glmd3lambda-correlation cols: {len(t7_10)}")

# Check 3B
b3_9 = [c for c in train_cols if c.startswith('3B') and '_LC3' in c]
print(f"type3Braac9glmd3lambda-correlation cols: {len(b3_9)}")
