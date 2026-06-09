import pandas as pd
df = pd.read_csv('/home/xh/kxc/ampgenkxc/AMPGen/data/Discriminator_training_data/top14Featured_all.csv')
df.head(100)[['Sequence']].to_csv('/tmp/test_100_seqs.csv', index=False)
print('Saved 100 sequences')
