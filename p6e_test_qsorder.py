import sys
sys.path.insert(0, 'p6e_discriminator_export_work/AMP_discriminator_readonly_copy/Discriminator_model')

from iFeature.codes import QSOrder, SOCNumber

# Use a longer test sequence with only standard amino acids (35 AA)
fastas = [('test1', 'ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYA')]

# Test QSOrder
try:
    res1 = QSOrder.QSOrder(fastas)
    print('QSOrder result:')
    print(f'  Type: {type(res1)}')
    print(f'  Length: {len(res1)}')
    print(f'  First item: {res1[0]}')
    if hasattr(res1[0], 'keys'):
        print(f'  Keys: {list(res1[0].keys())[:5]}')
except Exception as e:
    print(f'QSOrder error: {e}')
    import traceback
    traceback.print_exc()

print()

# Test SOCNumber
try:
    res2 = SOCNumber.SOCNumber(fastas)
    print('SOCNumber result:')
    print(f'  Type: {type(res2)}')
    print(f'  Length: {len(res2)}')
    print(f'  First item: {res2[0]}')
    if hasattr(res2[0], 'keys'):
        print(f'  Keys: {list(res2[0].keys())[:5]}')
except Exception as e:
    print(f'SOCNumber error: {e}')
    import traceback
    traceback.print_exc()
