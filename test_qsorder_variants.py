import sys
sys.path.insert(0, 'p6e_discriminator_export_work/AMP_discriminator_readonly_copy/Discriminator_model')

from iFeature.codes import QSOrder

fastas = [('test1', 'ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWY')]

for nlag in range(5):
    res = QSOrder.QSOrder(fastas, nlag=nlag)
    if res == 0:
        print(f'nlag={nlag}: ERROR (returned 0)')
        continue
    # res is a list: [headers, values]
    headers = res[0]
    # headers[0] is '#', rest are feature names
    feature_names = headers[1:]
    grantham = [h for h in feature_names if 'Grantham' in h]
    schneider = [h for h in feature_names if 'Schneider' in h]
    print(f'nlag={nlag}: total={len(feature_names)}, Grantham={len(grantham)}, Schneider={len(schneider)}')
    print(f'  Sample: {feature_names[:5]}')
